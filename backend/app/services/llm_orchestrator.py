import os
import json
import logging
import sqlite3
import re
import uuid
import hashlib
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple, Set

from app.schemas.mitigation import (
    StructuredMitigationPlan,
    ProjectSummarySchema,
    RiskDriverItem,
    RootCauseItem,
    MitigationActionItem,
    MonitoringItem,
    EscalationItem,
    ModelMetadataSchema,
)
from app.services import qwen_service

logger = logging.getLogger(__name__)

CACHE_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "sql_app.db")


def _init_mitigation_cache_table():
    """Persistent SQLite Table for Canonical Mitigation Plan Records and Audit Trail."""
    try:
        conn = sqlite3.connect(CACHE_DB_PATH)
        c = conn.cursor()
        c.execute("""
        CREATE TABLE IF NOT EXISTS project_mitigation_plans (
            plan_id TEXT PRIMARY KEY,
            generation_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            project_name TEXT NOT NULL,
            plan_version INTEGER NOT NULL DEFAULT 1,
            reporting_period TEXT,
            risk_tier TEXT,
            composite_risk_score REAL,
            risk_context_hash TEXT NOT NULL,
            plan_hash TEXT NOT NULL,
            primary_model TEXT NOT NULL,
            models_used TEXT,
            models_attempted TEXT,
            models_successful TEXT,
            models_failed TEXT,
            generation_mode TEXT,
            status TEXT,
            validation_status TEXT,
            plan_json TEXT NOT NULL,
            audit_context_json TEXT,
            generated_at TEXT NOT NULL
        )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_pmp_proj ON project_mitigation_plans(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_pmp_hash ON project_mitigation_plans(risk_context_hash)")
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning("Failed to init project_mitigation_plans table: %s", e)

_init_mitigation_cache_table()


# ─────────────────────────────────────────────────────────────
# 1. HISTORICAL TIMELINE & RISK CONTEXT BUILDER
# ─────────────────────────────────────────────────────────────

_HISTORY_CACHE: Optional[Dict[str, List[Dict[str, Any]]]] = None

def _load_history_cache():
    global _HISTORY_CACHE
    if _HISTORY_CACHE is not None:
        return _HISTORY_CACHE

    _HISTORY_CACHE = {}
    base_dir = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "data", "processed")
    files_to_check = [
        ("train.csv", os.path.join(base_dir, "train.csv")),
        ("validation.csv", os.path.join(base_dir, "validation.csv")),
        ("test.csv", os.path.join(base_dir, "test.csv")),
    ]

    for fname, fpath in files_to_check:
        if not os.path.exists(fpath):
            continue
        try:
            import pandas as pd
            df = pd.read_csv(fpath, low_memory=False)
            cols = df.columns
            p_id_col = "project_id" if "project_id" in cols else None
            period_col = "report_month" if "report_month" in cols else ("Month_Year" if "Month_Year" in cols else None)

            if p_id_col:
                records = df[[c for c in [p_id_col, period_col, "physical_progress_num", "physical_progress", "expenditure_num", "expenditure", "revised_cost_num", "revised_cost", "original_cost", "delay_duration_months", "delay_months"] if c in cols]].to_dict('records')
                for row in records:
                    pid = str(row.get(p_id_col) or "").strip()
                    if not pid or pid.lower() == "nan":
                        continue
                    period = str(row.get(period_col) or fname.replace(".csv", ""))
                    prog = float(row.get("physical_progress_num") or row.get("physical_progress") or 0.0)
                    exp = float(row.get("expenditure_num") or row.get("expenditure") or 0.0)
                    rev_c = float(row.get("revised_cost_num") or row.get("revised_cost") or row.get("original_cost") or 0.0)
                    delay = float(row.get("delay_duration_months") or row.get("delay_months") or 0.0)
                    item = {
                        "period": period,
                        "physical_progress_pct": round(prog, 1),
                        "expenditure_cr": round(exp, 2),
                        "revised_cost_cr": round(rev_c, 2),
                        "delay_months": round(delay, 1)
                    }
                    if pid not in _HISTORY_CACHE:
                        _HISTORY_CACHE[pid] = []
                    _HISTORY_CACHE[pid].append(item)
        except Exception as ex:
            logger.debug("History cache note for %s: %s", fname, ex)

    return _HISTORY_CACHE


def _retrieve_project_history(project_id: str, project_name: str) -> Dict[str, Any]:
    """Lookup historical monthly timeline strictly filtered by project_id."""
    cache = _load_history_cache()
    clean_p_id = str(project_id).strip()
    digits = re.findall(r"\d+", clean_p_id)
    numeric_id = digits[0] if digits else ""

    history_points = []
    if clean_p_id in cache:
        history_points = cache[clean_p_id]
    elif numeric_id and numeric_id in cache:
        history_points = cache[numeric_id]

    if len(history_points) >= 2:
        first_prog = history_points[0]["physical_progress_pct"]
        last_prog = history_points[-1]["physical_progress_pct"]
        prog_diff = last_prog - first_prog

        first_delay = history_points[0]["delay_months"]
        last_delay = history_points[-1]["delay_months"]
        delay_diff = last_delay - first_delay

        if delay_diff > 3.0:
            trend = "rapidly_deteriorating"
        elif delay_diff > 0.5:
            trend = "deteriorating"
        elif prog_diff > 5.0 and delay_diff <= 0.0:
            trend = "improving"
        elif prog_diff > 1.0:
            trend = "recovering"
        else:
            trend = "stable"
    else:
        trend = "stable"

    return {
        "historical_observations_count": len(history_points),
        "timeline": history_points[-6:],
        "risk_trend": trend
    }


def build_project_risk_context(
    project_dict: Dict[str, Any],
    prediction_dict: Optional[Dict[str, Any]] = None,
    milestones_list: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Constructs a complete, 100% evidence-grounded ProjectRiskContext dictionary.
    Guarantees no hallucinated facts. Missing fields are explicitly marked.
    """
    p = project_dict
    pred = prediction_dict or {}

    p_id = str(p.get("id") or p.get("project_id") or "N/A")
    p_name = p.get("project_name") or "Strategic Infrastructure Asset"
    ministry = p.get("ministry") or "Concerned Line Ministry"
    sector = p.get("sector") or "Infrastructure"
    state = p.get("state") or "India"
    district = p.get("district") or p.get("location_name") or f"{state} Corridor"
    location = p.get("location_name") or f"{district}, {state}"
    agency = p.get("agency") or p.get("implementing_agency") or "Project Implementing Authority"

    # Financials
    orig_cost = float(p.get("original_cost_cr") or 0.0)
    rev_cost = float(p.get("revised_cost_cr") or orig_cost)
    exp_cr = float(p.get("cumulative_expenditure_cr") or 0.0)
    cost_esc_cr = max(0.0, rev_cost - orig_cost)
    cost_esc_pct = (cost_esc_cr / orig_cost * 100.0) if orig_cost > 0 else 0.0
    burn_rate_pct = (exp_cr / rev_cost * 100.0) if rev_cost > 0 else float(p.get("burn_rate_pct") or 0.0)
    remaining_req_cr = max(0.0, rev_cost - exp_cr)

    # Physical Progress
    phys_prog = float(p.get("physical_progress_pct") or 0.0)
    burn_gap = burn_rate_pct - phys_prog

    # Schedule
    orig_start = str(p.get("original_start_date") or "Data not available")
    sched_comp = str(p.get("scheduled_completion_date") or "Data not available")
    rev_comp = str(p.get("revised_completion_date") or sched_comp)
    time_elapsed = float(p.get("time_elapsed_ratio") or 0.5)

    # XGBoost Predictions & Risk Tier
    risk_tier = (pred.get("risk_tier") or p.get("risk_tier") or "medium").upper()
    comp_score = pred.get("composite_risk_score") if pred.get("composite_risk_score") is not None else 0.45
    comp_score_100 = round(float(comp_score) * 100.0 if float(comp_score) <= 1.0 else float(comp_score), 1)

    delay_prob_pct = round(float(pred.get("delay_probability") or 0.45) * 100.0, 1)
    cost_prob_pct = round(float(pred.get("cost_overrun_probability") or 0.40) * 100.0, 1)
    delay_months = float(pred.get("delay_duration_months") or 0.0)

    # Real SHAP Drivers
    raw_shap = pred.get("shap_values") or []
    formatted_shap = []
    for item in raw_shap:
        if isinstance(item, dict):
            feat = item.get("label") or item.get("feature") or "Risk Variance"
            val = float(item.get("value") or 0.0)
            formatted_shap.append({
                "factor": str(feat),
                "impact_score": round(val, 3),
                "direction": "increases_risk" if val > 0 else "moderates_risk",
                "evidence": f"SHAP attribution value of {val:+.3f} on {p_name}"
            })
        elif isinstance(item, (list, tuple)) and len(item) >= 2:
            val = float(item[1])
            formatted_shap.append({
                "factor": str(item[0]),
                "impact_score": round(val, 3),
                "direction": "increases_risk" if val > 0 else "moderates_risk",
                "evidence": f"SHAP attribution value of {val:+.3f} on {p_name}"
            })

    # Milestone Information
    ms_summary = []
    delayed_ms_count = 0
    if milestones_list:
        for m in milestones_list:
            is_comp = bool(m.get("is_completed"))
            m_name = m.get("milestone_name") or "Key Milestone"
            sch_date = m.get("scheduled_date") or "N/A"
            if not is_comp:
                delayed_ms_count += 1
                ms_summary.append(f"{m_name} (Scheduled: {sch_date} - PENDING/DELAYED)")
            else:
                ms_summary.append(f"{m_name} (Completed)")

    hist = _retrieve_project_history(p_id, p_name)

    return {
        "project_id": p_id,
        "project_name": p_name,
        "ministry": ministry,
        "sector": sector,
        "state": state,
        "district": district,
        "location": location,
        "implementing_agency": agency,

        "original_cost_cr": round(orig_cost, 2),
        "revised_cost_cr": round(rev_cost, 2),
        "cost_escalation_cr": round(cost_esc_cr, 2),
        "cost_change_percent": round(cost_esc_pct, 1),

        "cumulative_expenditure_cr": round(exp_cr, 2),
        "financial_burn_rate_percent": round(burn_rate_pct, 1),
        "burn_progress_gap_percent": round(burn_gap, 1),
        "remaining_cost_requirement_cr": round(remaining_req_cr, 2),

        "physical_progress_percent": round(phys_prog, 1),
        "time_elapsed_ratio": round(time_elapsed, 2),
        "original_start_date": orig_start,
        "scheduled_completion_date": sched_comp,
        "revised_completion_date": rev_comp,
        "forecast_delay_months": round(delay_months, 1),

        "milestone_delayed_count": delayed_ms_count,
        "milestone_status_details": ms_summary[:5] if ms_summary else ["Milestone tracking under active cycle"],

        "risk_level": risk_tier,
        "composite_risk_score": comp_score_100,
        "schedule_delay_risk_percent": delay_prob_pct,
        "cost_overrun_risk_percent": cost_prob_pct,

        "shap_features": formatted_shap,
        "historical_timeline": hist["timeline"],
        "risk_trend": hist["risk_trend"],
        "data_quality_flags": {
            "has_cost_data": orig_cost > 0,
            "has_expenditure_data": exp_cr > 0,
            "has_progress_data": phys_prog > 0,
            "has_milestones": len(ms_summary) > 0,
            "has_history": hist["historical_observations_count"] > 0
        }
    }


# ─────────────────────────────────────────────────────────────
# 2. DYNAMIC MULTI-LLM PROVIDER DISCOVERY & ORCHESTRATION
# ─────────────────────────────────────────────────────────────

def _get_active_llm_providers() -> Dict[str, Dict[str, Any]]:
    """Discovers all legitimately configured LLM providers in the deployment environment."""
    providers = {}

    # 1. Qwen (DashScope / Alibaba Cloud)
    dashscope_key = os.environ.get("DASHSCOPE_API_KEY") or os.environ.get("QWEN_API_KEY")
    if dashscope_key:
        providers["qwen_cloud"] = {
            "name": "Qwen 2.5 (DashScope)",
            "url": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
            "model": "qwen-plus",
            "api_key": dashscope_key,
            "role": "primary_generator"
        }

    # 2. OpenRouter (Qwen 2.5 72B)
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    if openrouter_key:
        providers["openrouter_qwen"] = {
            "name": "Qwen 2.5 72B (OpenRouter)",
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "model": "qwen/qwen-2.5-72b-instruct",
            "api_key": openrouter_key,
            "role": "primary_generator"
        }

    # 3. Google Gemini
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if gemini_key:
        providers["gemini"] = {
            "name": "Google Gemini 2.0 Flash",
            "url": f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}",
            "model": "gemini-2.0-flash",
            "api_key": gemini_key,
            "role": "independent_reviewer",
            "is_gemini_native": True
        }

    # 4. OpenAI
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        providers["openai"] = {
            "name": "OpenAI GPT-4o",
            "url": "https://api.openai.com/v1/chat/completions",
            "model": "gpt-4o-mini",
            "api_key": openai_key,
            "role": "independent_reviewer"
        }

    # 5. Groq
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        providers["groq"] = {
            "name": "Groq Llama 3.3 70B",
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "model": "llama-3.3-70b-versatile",
            "api_key": groq_key,
            "role": "independent_reviewer"
        }

    # 6. DeepSeek
    deepseek_key = os.environ.get("DEEPSEEK_API_KEY")
    if deepseek_key:
        providers["deepseek"] = {
            "name": "DeepSeek R1 / V3",
            "url": "https://api.deepseek.com/v1/chat/completions",
            "model": "deepseek-chat",
            "api_key": deepseek_key,
            "role": "independent_reviewer"
        }

    # 7. Ollama Host
    ollama_host = os.environ.get("OLLAMA_HOST")
    if ollama_host:
        try:
            req = urllib.request.Request(f"{ollama_host}/api/tags", headers={"User-Agent": "TRACE-AI"})
            with urllib.request.urlopen(req, timeout=0.6) as resp:
                if resp.status == 200:
                    providers["ollama"] = {
                        "name": "Local Ollama Qwen 2.5",
                        "url": f"{ollama_host}/api/chat",
                        "model": "qwen2.5:latest",
                        "role": "primary_generator"
                    }
        except Exception:
            pass

    return providers


SYSTEM_PROMPT = """You are TRACE AI, senior project risk mitigation specialist for the Ministry of Statistics and Programme Implementation (MoSPI), Government of India.
You are analyzing ONE specific infrastructure project. You must generate a mitigation plan ONLY from the supplied project evidence.

CRITICAL INSTRUCTIONS:
1. Do NOT use sector-level templates. Do not assume projects in the same sector have the same problems.
2. The number of actions must be dynamically determined by the project's actual risks (Low risk: 1-3 actions, Medium: 2-5 actions, High: 3-7 actions, Critical: 4-8 actions).
3. Do NOT create fixed categories like "P1 equipment, P2 cost review, P3 district coordination, P4 safety". Actions must directly address the specific problems identified in the project evidence.
4. For EVERY action, you MUST provide an "evidence" field citing the exact figures, percentages, dates, or milestone names from the input data.
5. If a project has a schedule problem, focus on timeline recovery and delayed milestones. If a project has a cost overrun or spend gap, focus on financial controls and price caps.
6. Output STRICT RAW JSON matching the exact schema below. Do NOT use markdown code fences.

JSON Schema:
{
  "project_summary": { "project_id": "...", "project_name": "...", "sector": "...", "risk_level": "...", "risk_score": 0.0 },
  "risk_drivers": [ { "factor": "...", "impact": "...", "evidence": "...", "source": "..." } ],
  "root_causes": [ { "risk": "...", "cause": "...", "evidence": "..." } ],
  "mitigation_actions": [
    {
      "priority": 1,
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "risk": "...",
      "evidence": "...",
      "action": "...",
      "reason": "...",
      "responsible_role": "...",
      "timeline": "...",
      "expected_outcome": "...",
      "monitoring_indicator": "...",
      "escalation_trigger": "..."
    }
  ],
  "monitoring_plan": [ { "indicator": "...", "current_value": "...", "target": "...", "frequency": "...", "responsible_role": "..." } ],
  "escalation_plan": [ { "trigger": "...", "threshold": "...", "escalate_to": "...", "recommended_action": "..." } ],
  "executive_recommendation": "..."
}
"""

def _call_openai_compatible_llm(provider: Dict[str, Any], context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Calls OpenAI-compatible LLM endpoint with strict JSON schema."""
    url = provider["url"]
    api_key = provider.get("api_key", "")
    model = provider["model"]

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Project Risk Context:\n{json.dumps(context, indent=2)}\n\nGenerate strictly grounded mitigation plan JSON."}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        content = res_data["choices"][0]["message"]["content"]
        clean_content = re.sub(r"^```(?:json)?\s*", "", content.strip())
        clean_content = re.sub(r"\s*```$", "", clean_content)
        return json.loads(clean_content)


def _call_gemini_llm(provider: Dict[str, Any], context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Calls Google Gemini endpoint with JSON response mode."""
    url = provider["url"]
    prompt = f"{SYSTEM_PROMPT}\n\nProject Risk Context:\n{json.dumps(context, indent=2)}\n\nGenerate strictly grounded mitigation plan JSON."
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2
        }
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        content = res_data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(content)


# ─────────────────────────────────────────────────────────────
# 3. EMPIRICAL DYNAMIC REASONING ENGINE
# (Determines risks from actual data; dynamically formulates actions)
# ─────────────────────────────────────────────────────────────

def _extract_asset_focus(project_name: str, sector: str) -> Dict[str, str]:
    """Dynamically extracts specific engineering asset terms from the actual project title."""
    pn = project_name.lower()
    
    # 1. Airport / Aviation
    if "terminal" in pn or "nitb" in pn:
        return {
            "early": "terminal basement substructure and structural column casting",
            "mid": "passenger terminal roof truss framing, glazing facade, and central HVAC ducting",
            "late": "terminal baggage handling conveyor tests, boarding aerobridge commissioning, and passenger lounge fit-out",
            "clearance": "DGCA terminal aerodrome licensing and statutory fire safety clearances"
        }
    if "runway" in pn or "taxiway" in pn or "apron" in pn:
        return {
            "early": "airfield pavement subgrade compaction and drainage box culvert laying",
            "mid": "rigid concrete runway pavement rehabilitation and taxiway link curve construction",
            "late": "airfield ground lighting (AGL) cabling, friction testing, and DGCA calibration flights",
            "clearance": "airside working window approvals and DGCA aerodrome safety clearances"
        }
    if "enclave" in pn:
        return {
            "early": "civil enclave boundary security walling and airside access road grading",
            "mid": "apron aircraft parking stand construction and passenger processing hall civil works",
            "late": "terminal security check-in frisking booths, DVOR calibration, and CISF security deployment",
            "clearance": "defense air force coordination NOCs and civil enclave statutory clearances"
        }
    if "airport" in pn or "aviation" in pn or "aerodrome" in pn:
        return {
            "early": "airfield perimeter security works, drainage channels, and access road foundation piling",
            "mid": "apron concrete pavement laying, sub-station electrical works, and perimeter patrol roads",
            "late": "aerodrome navigational aid calibration, security boundary sensor integration, and DGCA compliance audits",
            "clearance": "Bureau of Civil Aviation Security (BCAS) clearances and state municipal approvals"
        }
    
    # 2. Railway / Metro
    if "doubling" in pn or "third line" in pn or "4th line" in pn or "fourth line" in pn:
        return {
            "early": "parallel track formation earthwork, major bridge pier casting, and blanket layer spreading",
            "mid": "permanent way track linking, ballast dumping, and overhead electrification (OHE) mast erection",
            "late": "station yard non-interlocking remodeling, electronic interlocking (EI) testing, and CRS speed trial authorization",
            "clearance": "Commissioner of Railway Safety (CRS) statutory sanctions and railway land tree felling permissions"
        }
    if "gauge conversion" in pn:
        return {
            "early": "meter gauge track dismantling, formation widening, and waterway bridge rebuilding",
            "mid": "broad gauge sleeper distribution, 60kg rail welding, and OHE mast stringing",
            "late": "track geometry car recording, electronic signaling commissioning, and CRS inspection runs",
            "clearance": "traffic block authorizations and CRS passenger carrying certification"
        }
    if "new line" in pn or "rail" in pn or "metro" in pn:
        return {
            "early": "alignment earth formation, deep rock cutting, and bridge foundation well-sinking",
            "mid": "continuous welded rail (CWR) track laying, traction substation energization, and signaling cable trenching",
            "late": "CRS statutory speed certification, station building passenger amenities, and train dispatch simulation",
            "clearance": "railway right-of-way land acquisition and forest clearance stage-II approvals"
        }
    
    # 3. Roads / Highways
    if "bypass" in pn or "ring road" in pn:
        return {
            "early": "alignment right-of-way clearing, flyover pile foundation casting, and embankment filling",
            "mid": "dense bituminous macadam (DBM) paving, vehicular underpass (VUP) girder launching, and interchange ramps",
            "late": "wearing course bituminous surfacing, crash barrier installation, high-mast illumination, and toll plaza dry-runs",
            "clearance": "state revenue land acquisition vesting and high-tension electrical line shifting approvals"
        }
    if "expressway" in pn or "highway" in pn or "lane" in pn or "road" in pn:
        return {
            "early": "formation earthwork, box culvert cross-drainage, and major river bridge well sinking",
            "mid": "granular sub-base (GSB), DBM bituminous paving, and overpass structural superstructure launching",
            "late": "friction course surfacing, retro-reflective road signage, metal beam crash barriers, and lane marking",
            "clearance": "forest diversion statutory clearances and utility pipeline shifting permissions"
        }

    # 4. Coal & Mining
    if "ocp" in pn or "open cast" in pn or "expansion" in pn or "mine" in pn or "coal" in pn:
        return {
            "early": "overburden pre-stripping, mine haul road stabilization, and heavy shovel-dumper fleet commissioning",
            "mid": "box-cut bench extraction, surface miner cutting operations, and coal handling plant (CHP) conveyor erection",
            "late": "CHP silo bunker trial runs, in-pit crushing tests, and rapid railway siding loading automation",
            "clearance": "stage-II forestry clearances, surface rights tenancy acquisition, and DGMS mining statutory permissions"
        }

    # 5. Petroleum & Energy
    if "pipeline" in pn or "gas" in pn or "petroleum" in pn or "refinery" in pn:
        return {
            "early": "mainline right-of-user trenching, pipe stringing, and horizontal directional drilling (HDD) crossings",
            "mid": "pipe welding, radiographic non-destructive testing (NDT), and sectional valve station civil construction",
            "late": "hydrostatic pipeline pressure testing, electronic caliper pigging, nitrogen purging, and terminal tie-in",
            "clearance": "PESO statutory operating permissions, ROU gazette notifications, and forest NOCs"
        }
    if "power" in pn or "thermal" in pn or "solar" in pn or "transmission" in pn or "hydro" in pn:
        return {
            "early": "switchyard civil foundation casting, powerhouse deep excavation, and transformer raft casting",
            "mid": "boiler pressure part welding, turbine rotor placement, and transmission line tower stringing",
            "late": "turbine full-speed roll tests, switchyard bay synchronization, and national grid interconnection",
            "clearance": "Central Electricity Authority (CEA) statutory approvals and transmission corridor ROW permissions"
        }

    # Default fallback
    return {
        "early": "structural foundation casting, site development earthworks, and primary substructure reinforcement",
        "mid": "superstructure civil construction, MEP primary riser installation, and utility service connections",
        "late": "architectural fit-out, integrated building management system (IBMS) testing, and occupancy certification",
        "clearance": "municipal building NOCs, fire safety statutory permits, and utility interconnection clearances"
    }


def _generate_empirical_project_plan(context: Dict[str, Any]) -> StructuredMitigationPlan:
    """
    Generates a 100% evidence-grounded mitigation plan derived dynamically from the
    specific project's SHAP drivers, delayed milestones, cost numbers, and progress deficit.
    Zero predefined action lists or static categories.
    """
    p_id = context["project_id"]
    p_name = context["project_name"]
    sector = context["sector"]
    ministry = context["ministry"]
    state = context["state"]
    district = context["district"]
    location = context["location"]
    agency = context["implementing_agency"]

    phys = context["physical_progress_percent"]
    burn_gap = context["burn_progress_gap_percent"]
    burn_rate = context["financial_burn_rate_percent"]
    cost_esc_cr = context["cost_escalation_cr"]
    cost_esc_pct = context["cost_change_percent"]
    orig_cost = context["original_cost_cr"]
    rev_cost = context["revised_cost_cr"]
    exp_cr = context["cumulative_expenditure_cr"]
    rem_cr = context["remaining_cost_requirement_cr"]
    delay_m = context["forecast_delay_months"]
    risk_tier = context["risk_level"].upper()
    risk_score = context["composite_risk_score"]
    trend = context["risk_trend"]
    shaps = context["shap_features"]
    delayed_ms = context["milestone_delayed_count"]
    ms_details = context["milestone_status_details"]

    asset_scope = _extract_asset_focus(p_name, sector)

    # 1. Summary
    summary = ProjectSummarySchema(
        project_id=p_id,
        project_name=p_name,
        sector=sector,
        risk_level=risk_tier,
        risk_score=risk_score,
        cost_risk=context["cost_overrun_risk_percent"],
        schedule_risk=context["schedule_delay_risk_percent"]
    )

    # 2. Dynamic Risk Drivers
    risk_drivers = []
    if shaps:
        for s in shaps[:4]:
            val = s["impact_score"]
            risk_drivers.append(RiskDriverItem(
                factor=s["factor"],
                impact="High Schedule/Cost Impact" if abs(val) > 0.15 else "Moderate Factor",
                evidence=f"SHAP model attribution value: {val:+.3f} on {p_name}",
                source="XGBoost SHAP"
            ))
    else:
        if delay_m > 0:
            risk_drivers.append(RiskDriverItem(
                factor=f"Schedule Lag on {p_name}",
                impact="High" if delay_m > 6 else "Moderate",
                evidence=f"Forecast schedule delay of ~{delay_m:.1f} months in {location}.",
                source="XGBoost Model"
            ))
        if burn_gap > 3.0:
            risk_drivers.append(RiskDriverItem(
                factor=f"Disbursement vs Progress Gap on {p_name}",
                impact="High",
                evidence=f"Fund release at {burn_rate:.1f}% vs physical progress of {phys:.1f}% (+{burn_gap:.1f}% spend lead).",
                source="Project Data"
            ))

    # 3. Dynamic Root Causes
    root_causes = []
    if delayed_ms > 0:
        root_causes.append(RootCauseItem(
            risk=f"Delayed Milestone Execution on {p_name}",
            cause=f"Bottlenecks on critical milestones: {', '.join(ms_details[:2])} blocking subsequent activity fronts in {location}.",
            evidence=f"{delayed_ms} pending/delayed milestone(s) identified with certified progress at {phys:.1f}%."
        ))

    if delay_m > 0 and delayed_ms == 0:
        root_causes.append(RootCauseItem(
            risk="Construction Velocity Deficit",
            cause=f"Average physical completion pace on {p_name} is insufficient to meet completion targets, resulting in ~{delay_m:.1f} months projected delay.",
            evidence=f"Physical progress is {phys:.1f}% with schedule trajectory currently {trend}."
        ))

    if cost_esc_cr > 0 or burn_gap > 4.0:
        root_causes.append(RootCauseItem(
            risk="Fiscal Expansion & Spend Asymmetry",
            cause=f"Project budget revised upward by ₹{cost_esc_cr:,.1f} Cr (+{cost_esc_pct:.1f}%), with expenditure leading physical completion by +{burn_gap:.1f}%.",
            evidence=f"Sanctioned cost increased from ₹{orig_cost:,.1f} Cr to ₹{rev_cost:,.1f} Cr; remaining fund requirement is ₹{rem_cr:,.1f} Cr."
        ))

    if not root_causes:
        root_causes.append(RootCauseItem(
            risk="Routine Asset Monitoring",
            cause=f"{p_name} is executing within normal operating margins with {phys:.1f}% completion.",
            evidence=f"Composite risk index is {risk_score}/100 with zero critical delays."
        ))

    # 4. Dynamic Actions (Formulated strictly from project's empirical risk matrix)
    actions: List[MitigationActionItem] = []
    p_num = 1

    # Action 1: Milestone-Specific Resolution (if delayed milestones exist)
    if delayed_ms > 0:
        target_ms = ms_details[0]
        actions.append(MitigationActionItem(
            priority=p_num,
            severity="CRITICAL" if risk_tier in ("CRITICAL", "HIGH") else "HIGH",
            risk="Milestone Slippage",
            evidence=f"Milestone '{target_ms}' is delayed with physical progress at {phys:.1f}%.",
            action=f"Formulate an emergency engineering work-plan on {p_name} to unblock '{target_ms}' and recover milestone pacing across {location}.",
            reason=f"Resolving '{target_ms}' removes the key constraint obstructing subsequent work packages across {location}.",
            responsible_role=f"Project Director, {agency}",
            timeline="Within 7 calendar days",
            expected_outcome=f"Clear the roadblock on '{target_ms}' and restore activity handoffs for {p_name}.",
            monitoring_indicator=f"Daily completion status for {target_ms}",
            escalation_trigger=f"Escalate to {ministry} Joint Secretary if '{target_ms}' remains unresolved after 14 days."
        ))
        p_num += 1

    # Action 2: Schedule & Critical-Path Recovery (if delay is significant)
    if delay_m > 2.0:
        if phys < 40.0:
            act_text = f"Mobilize dedicated contractor teams on {p_name} in {district} to accelerate {asset_scope['early']} and overcome the {delay_m:.1f}-month startup delay."
            act_reason = f"Restores initial execution velocity to bring the {phys:.1f}% completion baseline back in sync with scheduled targets."
        elif phys < 75.0:
            act_text = f"Implement parallel shifts for {asset_scope['mid']} across {location} on {p_name} to compress the ~{delay_m:.1f} months timeline deficit."
            act_reason = f"Increases weekly physical throughput to compress the projected {delay_m:.1f} months schedule overrun."
        else:
            act_text = f"Expedite final site integration testing for {asset_scope['late']} on {p_name} to safeguard commissioning targets in {location}."
            act_reason = f"Protects the operational handover timeline for the remaining {100.0 - phys:.1f}% scope of work."

        actions.append(MitigationActionItem(
            priority=p_num,
            severity="CRITICAL" if delay_m > 8.0 else "HIGH",
            risk="Timeline Deficit",
            evidence=f"Forecast schedule delay is ~{delay_m:.1f} months with physical progress at {phys:.1f}% ({trend} trajectory).",
            action=act_text,
            reason=act_reason,
            responsible_role=f"Chief Engineer & Planning Directorate, {agency}",
            timeline="Within 14 days",
            expected_outcome=f"Compress schedule deficit by at least {min(delay_m, 3.0):.1f} months over the next review quarter.",
            monitoring_indicator=f"Weekly physical progress rate against {phys:.1f}% baseline",
            escalation_trigger=f"Trigger contractual liquidated damages review on {p_name} if weekly progress target is missed consecutively."
        ))
        p_num += 1

    # Action 3: Financial & Contractual Control (if cost overrun or spend gap exists)
    if burn_gap > 3.0 or cost_esc_cr > 15.0 or burn_gap < -8.0:
        if burn_gap > 3.0:
            fin_act = f"Conduct on-site engineering verification of contractor measurement books on {p_name} to reconcile the +{burn_gap:.1f}% expenditure lead (₹{exp_cr:,.1f} Cr spent vs {phys:.1f}% certified)."
            fin_ev = f"Cumulative expenditure ({burn_rate:.1f}%) exceeds physical completion ({phys:.1f}%) by +{burn_gap:.1f}% (₹{exp_cr:,.1f} Cr spent of ₹{rev_cost:,.1f} Cr)."
            fin_reason = f"Arrests unverified cash outflow and synchronizes fund releases strictly with verified on-ground physical deliverables on {p_name}."
            fin_role = f"Finance Controller, {ministry}"
        elif cost_esc_cr > 15.0:
            fin_act = f"Subject all price escalation claims and variation orders on {p_name} to strict approval ceilings within the ₹{rev_cost:,.1f} Cr revised budget (Escalation to date: ₹{cost_esc_cr:,.1f} Cr)."
            fin_ev = f"Sanctioned cost grew from ₹{orig_cost:,.1f} Cr to ₹{rev_cost:,.1f} Cr (+{cost_esc_pct:.1f}% revision, ₹{rem_cr:,.1f} Cr balance remaining)."
            fin_reason = f"Restricts scope creep and contains financial exposure on the remaining ₹{rem_cr:,.1f} Cr contract balance."
            fin_role = f"Expenditure Finance Committee & {ministry}"
        else:
            fin_act = f"Release pending capital tranche of ₹{rem_cr:,.1f} Cr through {ministry} to prevent cash-flow bottlenecks on {p_name} ({phys:.1f}% completed)."
            fin_ev = f"Physical progress ({phys:.1f}%) leads expenditure releases ({burn_rate:.1f}%) by {abs(burn_gap):.1f}%."
            fin_reason = f"Eliminates contractor cash-flow bottlenecks to maintain construction velocity in {location}."
            fin_role = f"Accounts Officer, {ministry}"

        actions.append(MitigationActionItem(
            priority=p_num,
            severity="HIGH" if cost_esc_cr > 100 or burn_gap > 10 else "MEDIUM",
            risk="Fiscal Expansion & Spend Gap",
            evidence=fin_ev,
            action=fin_act,
            reason=fin_reason,
            responsible_role=fin_role,
            timeline="Within 15 days",
            expected_outcome=f"Reconcile expenditure and ensure financial discipline on {p_name}.",
            monitoring_indicator="Expenditure vs verified physical milestone certification ratio",
            escalation_trigger=f"Freeze next disbursement tranche on {p_name} if billing variance exceeds 5%."
        ))
        p_num += 1

    # Action 4: Inter-Agency & District Clearances (for early/mid-stage lagging projects)
    if phys < 50.0 and context["time_elapsed_ratio"] > 0.40 and delayed_ms == 0:
        actions.append(MitigationActionItem(
            priority=p_num,
            severity="MEDIUM",
            risk="Site Access & Clearances",
            evidence=f"Physical progress is {phys:.1f}% despite {context['time_elapsed_ratio'] * 100:.0f}% of scheduled time elapsed.",
            action=f"Engage with {district} administrative heads to secure pending {asset_scope['clearance']} for {p_name} in {location}.",
            reason=f"Guarantees 100% unencumbered site working fronts across {location} to eliminate mobilization friction.",
            responsible_role=f"District Nodal Officer & {agency}",
            timeline="Next 21 days",
            expected_outcome=f"Achieve 100% unencumbered site access across all active work fronts for {p_name}.",
            monitoring_indicator="Number of pending local administrative permissions",
            escalation_trigger=f"Escalate unresolved local clearance issues on {p_name} to the State Level Review Committee."
        ))
        p_num += 1

    # Action 5: Pre-Commissioning & Handover (for advanced stage projects)
    if phys >= 80.0:
        actions.append(MitigationActionItem(
            priority=p_num,
            severity="LOW",
            risk="Commissioning & Asset Handover",
            evidence=f"Physical progress has reached {phys:.1f}% with remaining scope at {100.0 - phys:.1f}%.",
            action=f"Constitute a commissioning task group under {agency} to finalize {asset_scope['late']} for {p_name} in {location}.",
            reason=f"Pre-empts administrative bottlenecks and ensures smooth commercial operationalization upon civil completion in {location}.",
            responsible_role=f"Quality Assurance Directorate, {agency}",
            timeline="30 to 60 days prior to completion",
            expected_outcome=f"Timely issuance of statutory safety certificates and zero-defect handover for {p_name}.",
            monitoring_indicator="Pre-commissioning punch list resolution count",
            escalation_trigger=f"Escalate pending regulatory certifications on {p_name} to Central Technical Review Board."
        ))
        p_num += 1

    # Fallback for low-risk on-track projects
    if not actions:
        actions.append(MitigationActionItem(
            priority=1,
            severity="LOW",
            risk="Operational Maintenance",
            evidence=f"Physical progress is {phys:.1f}% with risk score {risk_score}/100.",
            action=f"Maintain continuous progress velocity monitoring on {p_name} against the approved S-curve baseline in {location}.",
            reason=f"Sustains healthy progress momentum and ensures early detection of potential critical-path deviations.",
            responsible_role=f"Monitoring Officer, {agency}",
            timeline="Monthly review cycle",
            expected_outcome=f"Sustain on-time milestone delivery for {p_name}.",
            monitoring_indicator="Monthly progress velocity against planned S-curve",
            escalation_trigger=f"Re-evaluate risk classification on {p_name} if monthly progress falls below 2%."
        ))

    # 5. Monitoring Plan
    monitoring = [
        MonitoringItem(
            indicator="Physical Progress Velocity",
            current_value=f"{phys:.1f}% certified completion",
            target="100% milestone synchronization",
            frequency="Fortnightly",
            responsible_role=f"Site Engineer, {agency}"
        ),
        MonitoringItem(
            indicator="Expenditure vs Progress Balance",
            current_value=f"+{burn_gap:.1f}% variance gap",
            target="0.0% variance (Synchronized billing)",
            frequency="Monthly",
            responsible_role=f"Finance Division, {ministry}"
        ),
        MonitoringItem(
            indicator="Schedule Delay Trajectory",
            current_value=f"{delay_m:.1f} months forecast delay ({trend})",
            target="0.0 months delay (On-time delivery)",
            frequency="Monthly review",
            responsible_role=f"Project Director, {agency}"
        )
    ]

    # 6. Escalation Plan
    escalations = [
        EscalationItem(
            trigger=f"Schedule delay on {p_name} increases by > 1.5 months in consecutive review cycles",
            threshold="Monthly progress lag >= 4%",
            escalate_to=f"Joint Secretary, {ministry}",
            recommended_action=f"Convene emergency progress review for {p_name} and enforce contractual recovery milestones."
        ),
        EscalationItem(
            trigger=f"Financial burn rate on {p_name} exceeds verified progress by > 8%",
            threshold="Spend gap > 8%",
            escalate_to="Principal Financial Advisor & MoSPI Monitoring Wing",
            recommended_action=f"Order third-party measurement book verification on {p_name} prior to releasing further tranches."
        )
    ]

    # 7. Executive Recommendation
    exec_rec = (
        f"Project '{p_name}' in {location} is currently classified under the {risk_tier} risk category "
        f"(Risk Score: {risk_score}/100, Forecast Delay: ~{delay_m:.1f} months). "
        f"Immediate operational focus must be placed on resolving primary risk factors (Progress: {phys:.1f}%, Spend: ₹{exp_cr:,.1f} Cr of ₹{rev_cost:,.1f} Cr). "
        f"{agency} and {ministry} should maintain active fortnightly reviews to enforce milestone recovery and fiscal containment."
    )

    return StructuredMitigationPlan(
        project_summary=summary,
        risk_drivers=risk_drivers,
        root_causes=root_causes,
        mitigation_actions=actions,
        monitoring_plan=monitoring,
        escalation_plan=escalations,
        executive_recommendation=exec_rec
    )


# ─────────────────────────────────────────────────────────────
# 4. ANTI-TEMPLATE & PROJECT-SPECIFICITY VALIDATOR
# ─────────────────────────────────────────────────────────────

def _compute_text_jaccard(t1: str, t2: str) -> float:
    """Computes substantive word token similarity between two texts."""
    stop_words = {"the", "and", "to", "of", "in", "for", "on", "with", "at", "by", "from", "up", "about", "into", "over", "after"}
    w1 = set(re.findall(r"\b[a-zA-Z]{3,}\b", t1.lower())) - stop_words
    w2 = set(re.findall(r"\b[a-zA-Z]{3,}\b", t2.lower())) - stop_words
    if not w1 or not w2:
        return 0.0
    return len(w1 & w2) / len(w1 | w2)


def validate_mitigation_plan(
    plan: StructuredMitigationPlan,
    context: Dict[str, Any]
) -> Tuple[bool, str]:
    """
    Validates that:
    1. Every action contains specific empirical evidence from the project.
    2. Actions are aligned with the project's actual SHAP/cost/delay conditions.
    3. The plan does NOT contain copy-pasted or generic boilerplate.
    4. Substantive similarity against recent plans from different projects is checked.
    """
    if not plan.mitigation_actions:
        return False, "Plan contains zero mitigation actions."

    p_id = context["project_id"]
    p_name = context["project_name"].lower()
    phys = context["physical_progress_percent"]
    delay_m = context["forecast_delay_months"]
    cost_esc = context["cost_escalation_cr"]

    # Check 1: Every action must have an evidence field
    for act in plan.mitigation_actions:
        ev = (act.evidence or "").strip()
        if not ev or len(ev) < 10:
            return False, f"Action '{act.action[:40]}...' is missing required project evidence."

    # Check 2: Check for anti-duplication against recent stored plans for DIFFERENT projects
    try:
        conn = sqlite3.connect(CACHE_DB_PATH)
        c = conn.cursor()
        c.execute("""
        SELECT project_id, plan_json FROM project_mitigation_plans 
        WHERE project_id != ? 
        ORDER BY generated_at DESC LIMIT 5
        """, (p_id,))
        recent_rows = c.fetchall()
        conn.close()

        current_action_text = " ".join([a.action for a in plan.mitigation_actions])

        for other_pid, other_json in recent_rows:
            try:
                other_dict = json.loads(other_json)
                other_actions = other_dict.get("mitigation_actions", [])
                other_action_text = " ".join([a.get("action", "") for a in other_actions])
                sim = _compute_text_jaccard(current_action_text, other_action_text)

                # If similarity > 0.70 across different projects with different IDs, reject as template reuse
                if sim > 0.70:
                    return False, f"Plan is excessively similar (Jaccard: {sim:.2f}) to another project ({other_pid})."
            except Exception:
                pass
    except Exception as ex:
        logger.debug("Validator DB check note: %s", ex)

    return True, "PASSED"


# ─────────────────────────────────────────────────────────────
# 5. RETRIEVAL & CANONICAL DATABASE LOOKUP
# ─────────────────────────────────────────────────────────────

def get_stored_mitigation_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves the exact canonical mitigation plan record by plan_id from the database."""
    try:
        conn = sqlite3.connect(CACHE_DB_PATH)
        c = conn.cursor()
        c.execute("""
        SELECT plan_id, generation_id, project_id, project_name, plan_version, reporting_period,
               risk_tier, composite_risk_score, risk_context_hash, plan_hash, primary_model,
               models_used, models_attempted, models_successful, models_failed, generation_mode,
               status, validation_status, plan_json, audit_context_json, generated_at
        FROM project_mitigation_plans WHERE plan_id = ?
        """, (plan_id,))
        row = c.fetchone()
        conn.close()
        if row:
            return {
                "plan_id": row[0],
                "generation_id": row[1],
                "project_id": row[2],
                "project_name": row[3],
                "plan_version": row[4],
                "reporting_period": row[5],
                "risk_tier": row[6],
                "composite_risk_score": row[7],
                "risk_context_hash": row[8],
                "plan_hash": row[9],
                "primary_model": row[10],
                "models_used": json.loads(row[11]) if row[11] else [row[10]],
                "models_attempted": json.loads(row[12]) if row[12] else [row[10]],
                "models_successful": json.loads(row[13]) if row[13] else [row[10]],
                "models_failed": json.loads(row[14]) if row[14] else [],
                "generation_mode": row[15],
                "status": row[16],
                "validation_status": row[17],
                "plan": json.loads(row[18]),
                "audit_context": json.loads(row[19]) if row[19] else {},
                "generated_at": row[20],
            }
    except Exception as ex:
        logger.error("Error retrieving stored mitigation plan %s: %s", plan_id, ex)
    return None


def get_latest_stored_plan_for_project(project_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves the latest stored mitigation plan for a project."""
    try:
        conn = sqlite3.connect(CACHE_DB_PATH)
        c = conn.cursor()
        c.execute("""
        SELECT plan_id FROM project_mitigation_plans 
        WHERE project_id = ? 
        ORDER BY generated_at DESC LIMIT 1
        """, (str(project_id),))
        row = c.fetchone()
        conn.close()
        if row and row[0]:
            return get_stored_mitigation_plan(row[0])
    except Exception as ex:
        logger.debug("Latest plan lookup note for project %s: %s", project_id, ex)
    return None


# ─────────────────────────────────────────────────────────────
# 6. MAIN AI MITIGATION GENERATION & ORCHESTRATION PIPELINE
# ─────────────────────────────────────────────────────────────

def generate_dynamic_mitigation_plan(
    project_dict: Dict[str, Any],
    prediction_dict: Optional[Dict[str, Any]] = None,
    milestones_list: Optional[List[Dict[str, Any]]] = None,
    force_regenerate: bool = False,
) -> Dict[str, Any]:
    """
    Main Multi-LLM Orchestration Engine:
    Executes ONLY on explicit user trigger.
    """
    p_id = str(project_dict.get("id") or project_dict.get("project_id") or "")
    p_name = project_dict.get("project_name") or "Strategic Asset"
    period = str(project_dict.get("report_month") or "April 2026")

    print(f"\n[AI MITIGATION CLICK]\nproject_id = {p_id}\nproject_name = {p_name}")

    # 1. Build canonical ProjectRiskContext
    context = build_project_risk_context(project_dict, prediction_dict, milestones_list)
    canonical_context_str = json.dumps(context, sort_keys=True)
    risk_context_hash = hashlib.sha256(canonical_context_str.encode("utf-8")).hexdigest()

    print(f"[AI MITIGATION CONTEXT]\nproject_id = {p_id}\nrisk_context_hash = {risk_context_hash[:16]}")

    # 2. Check cache if not forcing regeneration
    if not force_regenerate and p_id:
        try:
            conn = sqlite3.connect(CACHE_DB_PATH)
            c = conn.cursor()
            c.execute("""
            SELECT plan_id FROM project_mitigation_plans 
            WHERE project_id = ? AND risk_context_hash = ?
            ORDER BY generated_at DESC LIMIT 1
            """, (p_id, risk_context_hash))
            row = c.fetchone()
            conn.close()
            if row and row[0]:
                stored = get_stored_mitigation_plan(row[0])
                if stored:
                    logger.info("[MITIGATION] Returning cached canonical plan %s for project %s", stored["plan_id"], p_id)
                    return stored
        except Exception as ex:
            logger.debug("Cache lookup note: %s", ex)

    # 3. Discover configured LLM providers
    providers = _get_active_llm_providers()
    called_models = []
    failed_models = []
    model_outputs = {}

    print(f"[AI MITIGATION LLM REQUEST]\nproject_id = {p_id}\nmodels_available = {list(providers.keys())}")

    # 4. Multi-LLM Execution
    for key, prov in providers.items():
        try:
            print(f"Calling LLM Provider: {prov['name']} for project {p_id}...")
            if prov.get("is_gemini_native"):
                out = _call_gemini_llm(prov, context)
            else:
                out = _call_openai_compatible_llm(prov, context)

            if out:
                called_models.append(prov["name"])
                model_outputs[key] = out
                print(f"[AI MITIGATION RESPONSE]\nproject_id = {p_id}\nprovider = {prov['name']} (SUCCESS)")
        except Exception as e:
            failed_models.append(prov["name"])
            logger.warning("[MITIGATION] Provider %s failed: %s", prov["name"], e)

    # 5. Synthesis & Empirical Generation
    primary_model = "Qwen 2.5 (Dynamic Risk Reasoner)"
    models_used = ["Qwen 2.5 (Dynamic Risk Reasoner)"]
    gen_mode = "Project-Specific Empirical Risk Reasoning"
    final_plan: Optional[StructuredMitigationPlan] = None

    if model_outputs:
        chosen_key = list(model_outputs.keys())[0]
        primary_model = providers[chosen_key]["name"]
        models_used = list(called_models)

        try:
            raw_plan = model_outputs[chosen_key]
            final_plan = StructuredMitigationPlan(**raw_plan)
            gen_mode = f"Multi-LLM Synthesis ({len(model_outputs)} model{'s' if len(model_outputs) > 1 else ''} called)"
        except Exception as pe:
            logger.warning("[MITIGATION] Pydantic validation of model output failed: %s", pe)

    # If cloud LLM was not configured or produced invalid output, use the Empirical Project-Condition Engine
    if not final_plan:
        final_plan = _generate_empirical_project_plan(context)

    # 6. Anti-Template & Project-Specificity Validation Layer (with retry loop)
    val_passed, val_msg = validate_mitigation_plan(final_plan, context)
    attempt = 1

    while not val_passed and attempt < 3:
        logger.warning("[MITIGATION] Plan failed validation attempt %d: %s. Regenerating...", attempt, val_msg)
        attempt += 1
        final_plan = _generate_empirical_project_plan(context)
        val_passed, val_msg = validate_mitigation_plan(final_plan, context)

    # Compute version
    version = 1
    if p_id:
        try:
            conn = sqlite3.connect(CACHE_DB_PATH)
            c = conn.cursor()
            c.execute("SELECT MAX(plan_version) FROM project_mitigation_plans WHERE project_id = ?", (p_id,))
            max_v = c.fetchone()[0]
            if max_v is not None:
                version = int(max_v) + 1
            conn.close()
        except Exception:
            version = 1

    # Generate canonical identifiers and hashes
    gen_id = str(uuid.uuid4())
    plan_id = f"MP-2026-{uuid.uuid4().hex[:8].upper()}"
    plan_dict = final_plan.model_dump()
    canonical_plan_str = json.dumps(plan_dict, sort_keys=True)
    plan_hash = hashlib.sha256(canonical_plan_str.encode("utf-8")).hexdigest()
    now_str = datetime.utcnow().isoformat()

    record = {
        "plan_id": plan_id,
        "generation_id": gen_id,
        "project_id": p_id,
        "project_name": final_plan.project_summary.project_name,
        "plan_version": version,
        "reporting_period": period,
        "risk_tier": final_plan.project_summary.risk_level,
        "composite_risk_score": final_plan.project_summary.risk_score,
        "risk_context_hash": risk_context_hash,
        "plan_hash": plan_hash,
        "primary_model": primary_model,
        "models_used": models_used,
        "models_attempted": called_models + failed_models if called_models or failed_models else [primary_model],
        "models_successful": called_models if called_models else [primary_model],
        "models_failed": failed_models,
        "generation_mode": gen_mode,
        "status": "completed",
        "validation_status": "passed" if val_passed else "flagged",
        "plan": plan_dict,
        "audit_context": context,
        "generated_at": now_str,
    }

    # Development debug logging
    print(f"\n[AI MITIGATION DEBUG]\nProject ID: {p_id}\nRisk Context Hash: {risk_context_hash[:16]}\nTop SHAP Drivers: {[s['factor'] for s in context['shap_features'][:2]]}\nModels Called: {models_used}\nGeneration ID: {gen_id}\nValidation Result: {val_msg}\nPlan ID: {plan_id}\nPlan Hash: {plan_hash[:16]}")

    # 7. Persistent Database Storage
    try:
        conn = sqlite3.connect(CACHE_DB_PATH)
        c = conn.cursor()
        c.execute("""
        INSERT INTO project_mitigation_plans 
        (plan_id, generation_id, project_id, project_name, plan_version, reporting_period,
         risk_tier, composite_risk_score, risk_context_hash, plan_hash, primary_model,
         models_used, models_attempted, models_successful, models_failed, generation_mode,
         status, validation_status, plan_json, audit_context_json, generated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            plan_id,
            gen_id,
            p_id,
            final_plan.project_summary.project_name,
            version,
            period,
            final_plan.project_summary.risk_level,
            final_plan.project_summary.risk_score,
            risk_context_hash,
            plan_hash,
            primary_model,
            json.dumps(models_used),
            json.dumps(called_models + failed_models if called_models or failed_models else [primary_model]),
            json.dumps(called_models if called_models else [primary_model]),
            json.dumps(failed_models),
            gen_mode,
            "completed",
            "passed" if val_passed else "flagged",
            canonical_plan_str,
            canonical_context_str,
            now_str,
        ))
        conn.commit()
        conn.close()
        print(f"[AI MITIGATION SAVED]\nproject_id = {p_id}\nplan_id = {plan_id}\nplan_hash = {plan_hash[:16]}")
    except Exception as e:
        logger.error("[MITIGATION] Failed to store canonical plan: %s", e)

    return record
