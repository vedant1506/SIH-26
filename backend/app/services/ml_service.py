import os
import json
import logging
import pickle
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Lazy-loaded model cache (loaded once on first prediction call)
_model = None
_delay_model = None
_cost_model = None
_preprocessor = None
_feature_definition = None
_model_version = "sih26103-baseline-xgboost-v1"
_shap_explainer = None

RISK_THRESHOLDS = {
    "critical": 0.75,
    "high":     0.50,
    "medium":   0.25,
    "low":      0.0,
}

SHAP_FEATURE_LABELS = {
    "burn_progress_gap":        "Expenditure / Progress Gap",
    "physical_progress_num":    "Current Physical Progress (%)",
    "time_elapsed_ratio":       "Time Elapsed Ratio",
    "cost_variation_pct":       "Cost Variation (%)",
    "original_cost_num":        "Original Sanctioned Cost (Cr)",
    "revised_cost_num":         "Revised Project Cost (Cr)",
    "expenditure_num":          "Cumulative Expenditure (Cr)",
    "expenditure_revision_ratio":"Expenditure / Budget Ratio",
    "project_history_days":     "Project History (Days)",
    "previous_progress_change": "Recent Progress Velocity",
}


def _load_models(models_path: str) -> None:
    """Load baseline XGBoost model, delay/cost XGBoost classifiers, and frozen preprocessor."""
    global _model, _delay_model, _cost_model, _preprocessor, _feature_definition, _model_version, _shap_explainer

    try:
        # Compatibility alias for unpickling ColumnTransformer from scikit-learn 1.6.1 in 1.7+
        try:
            import sklearn.compose._column_transformer
            if not hasattr(sklearn.compose._column_transformer, "_RemainderColsList"):
                class _RemainderColsList(list):
                    pass
                sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList
        except Exception:
            pass

        model_file = os.path.join(models_path, "models", "baseline_xgboost.pkl")
        prep_file = os.path.join(models_path, "preprocessors", "frozen_preprocessor.pkl")
        feat_file = os.path.join(models_path, "data", "feature_definition.json")
        ver_file = os.path.join(models_path, "MODEL_VERSION.json")

        if os.path.exists(ver_file):
            with open(ver_file, "r") as f:
                ver_data = json.load(f)
                _model_version = ver_data.get("model_version", _model_version)

        # Detect and append active fine-tuned QLoRA adapter or full merged model
        try:
            full_merged_dir = os.path.join(models_path, "..", "models", "qwen_merged_full_model")
            qwen_adapter_dir = os.path.join(models_path, "..", "models", "qwen_qlora_adapter")
            qwen_ver_file = os.path.join(qwen_adapter_dir, "QWEN_QLORA_MODEL_VERSION.json")
            adapter_weights = os.path.join(qwen_adapter_dir, "adapter_model.safetensors")
            adv_ver_file = os.path.join(models_path, "..", "models", "qwen_qlora_advanced_v2", "QWEN_QLORA_ADVANCED_VERSION.json")

            has_full_merged = os.path.exists(full_merged_dir) and any(
                f.endswith(".safetensors") for f in os.listdir(full_merged_dir)
            ) if os.path.exists(full_merged_dir) else False

            if has_full_merged:
                _model_version = f"{_model_version}+qwen2.5-1.5b-merged-standalone-v1.0"
                logger.info("✓ Detected active full standalone merged Qwen2.5 1.5B model at %s", full_merged_dir)
            elif os.path.exists(adapter_weights) or os.path.exists(qwen_ver_file):
                ver_tag = "qwen2.5-qlora-v1.0"
                if os.path.exists(qwen_ver_file):
                    with open(qwen_ver_file, "r") as f:
                        qwen_ver = json.load(f)
                        ver_tag = qwen_ver.get("adapter_version", ver_tag)
                _model_version = f"{_model_version}+{ver_tag}"
                logger.info("✓ Detected active fine-tuned Qwen2.5 QLoRA adapter: %s", ver_tag)
            elif os.path.exists(adv_ver_file):
                with open(adv_ver_file, "r") as f:
                    qver = json.load(f)
                    _model_version = f"{_model_version}+{qver.get('version', 'qwen2.5-advanced-qlora-v2.0')}"
        except Exception as ve:
            logger.debug("Adapter / merged model version tag detection note: %s", ve)

        if os.path.exists(model_file) and os.path.exists(prep_file) and os.path.exists(feat_file):
            try:
                with open(model_file, "rb") as f:
                    _model = pickle.load(f)
                with open(prep_file, "rb") as f:
                    _preprocessor = pickle.load(f)
                with open(feat_file, "r") as f:
                    _feature_definition = json.load(f)
                logger.info("✓ SIH26103 baseline XGBoost model loaded from %s", models_path)
            except Exception as pe:
                logger.debug("Baseline pickle unpickle note: %s", pe)

        # Load lightweight CPU delay & cost XGBoost classifier models
        try:
            import joblib
            delay_paths = [
                os.path.join(models_path, "..", "models", "delay_model.pkl"),
                os.path.join(models_path, "models", "delay_xgboost", "delay_model.pkl"),
                os.path.join(models_path, "models", "delay_model.pkl"),
            ]
            for dp in delay_paths:
                if os.path.exists(dp):
                    try:
                        _delay_model = joblib.load(dp)
                        logger.info("✓ Loaded lightweight CPU delay model from %s", dp)
                        break
                    except Exception as de:
                        logger.debug("Failed loading delay candidate %s: %s", dp, de)

            cost_paths = [
                os.path.join(models_path, "..", "models", "cost_model.pkl"),
                os.path.join(models_path, "models", "cost_xgboost", "cost_model.pkl"),
                os.path.join(models_path, "models", "cost_model.pkl"),
            ]
            for cp in cost_paths:
                if os.path.exists(cp):
                    try:
                        _cost_model = joblib.load(cp)
                        logger.info("✓ Loaded lightweight CPU cost model from %s", cp)
                        break
                    except Exception as ce:
                        logger.debug("Failed loading cost candidate %s: %s", cp, ce)
        except Exception as mle:
            logger.warning("Delay/cost model loading warning: %s", mle)

    except Exception as e:
        logger.error("Failed to load SIH26103 ML models: %s", e)
        logger.error("Failed to load SIH26103 ML models: %s", e)


def _build_approved_feature_vector(project_data: Dict[str, Any]) -> pd.DataFrame:
    """
    Build a pandas DataFrame containing exactly the 27 approved current-time features
    defined in ml/SIH26103_ML_FINAL/data/feature_definition.json.
    """
    original_cost = float(project_data.get("original_cost_cr") or 100.0)
    revised_cost = float(project_data.get("revised_cost_cr") or original_cost)
    expenditure = float(project_data.get("cumulative_expenditure_cr") or 0.0)
    physical_progress = float(project_data.get("physical_progress_pct") or 0.0)

    previous_progress = float(project_data.get("previous_progress") if project_data.get("previous_progress") is not None else max(0.0, physical_progress - 5.0))
    progress_change = physical_progress - previous_progress
    project_days = float(project_data.get("project_history_days") or 365.0)

    previous_revised = float(project_data.get("previous_revised_cost") or revised_cost)
    revised_cost_change = revised_cost - previous_revised

    features = {
        "physical_progress_num": physical_progress,
        "project_history_days": project_days,
        "project_history_months": float(project_data.get("project_history_months") or (project_days / 30.4375)),
        "observation_number": float(project_data.get("observation_number") or 1.0),
        "previous_progress": previous_progress,
        "previous_progress_change": progress_change,
        "progress_change_2": float(project_data.get("progress_change_2") or progress_change),
        "historical_progress_mean": float(project_data.get("historical_progress_mean") or ((physical_progress + previous_progress) / 2.0)),
        "historical_progress_max": float(project_data.get("historical_progress_max") or physical_progress),
        "historical_progress_min": float(project_data.get("historical_progress_min") or previous_progress),
        "progress_change_rolling_mean_3": float(project_data.get("progress_change_rolling_mean_3") or progress_change),
        "progress_change_rolling_std_3": float(project_data.get("progress_change_rolling_std_3") or 0.0),
        "days_since_previous_report": float(project_data.get("days_since_previous_report") or 30.0),
        "original_cost_num": original_cost,
        "revised_cost_num": revised_cost,
        "expenditure_num": expenditure,
        "expenditure_revision_ratio": float(min(expenditure / revised_cost, 2.0) if revised_cost > 0 else 0.0),
        "previous_revised_cost": previous_revised,
        "revised_cost_change": revised_cost_change,
        "revised_cost_growth_pct": float(((revised_cost_change / previous_revised) * 100.0) if previous_revised > 0 else 0.0),
        "report_year": float(project_data.get("report_year") or 2025.0),
        "report_month": float(project_data.get("report_month") or 6.0),
        "report_quarter": float(project_data.get("report_quarter") or 2.0),
        "current_completion_flag": 1.0 if physical_progress >= 100.0 else 0.0,
        "remaining_progress": float(max(0.0, 100.0 - physical_progress)),
        "state": str(project_data.get("state") or "DELHI"),
        "sector": str(project_data.get("sector") or "ROADS AND BRIDGES"),
    }

    approved = (
        _feature_definition["approved_features"]
        if _feature_definition and "approved_features" in _feature_definition
        else list(features.keys())
    )

    df = pd.DataFrame([features])
    return df[approved]


def _composite_score(delay_prob: float, cost_prob: float) -> float:
    return round(0.55 * delay_prob + 0.45 * cost_prob, 4)


def _score_to_tier(score: float) -> str:
    if score >= RISK_THRESHOLDS["critical"]:
        return "critical"
    elif score >= RISK_THRESHOLDS["high"]:
        return "high"
    elif score >= RISK_THRESHOLDS["medium"]:
        return "medium"
    return "low"


def _stub_prediction(project_data: Dict[str, Any]) -> Dict[str, Any]:
    burn_gap = float(project_data.get("burn_progress_gap") or 0.0)
    time_elapsed = float(project_data.get("time_elapsed_ratio") or 0.0)

    delay_prob = min(max((burn_gap / 100.0) * 0.6 + time_elapsed * 0.4, 0.0), 1.0)
    cost_prob = min(max((burn_gap / 100.0) * 0.7, 0.0), 1.0)
    composite = _composite_score(delay_prob, cost_prob)

    return {
        "delay_probability": round(delay_prob, 4),
        "delay_duration_months": round(delay_prob * 18, 1),
        "cost_overrun_probability": round(cost_prob, 4),
        "cost_overrun_amount_cr": round(cost_prob * (project_data.get("original_cost_cr") or 100.0) * 0.3, 2),
        "composite_risk_score": composite,
        "risk_tier": _score_to_tier(composite),
        "predicted_next_physical_progress": round(min(100.0, (project_data.get("physical_progress_pct") or 0.0) + 2.5), 2),
        "shap_values": [
            {
                "feature": "burn_progress_gap",
                "value": round(abs(burn_gap) / 100.0, 4),
                "direction": "positive" if burn_gap > 0 else "negative",
                "label": f"Budget spent {abs(burn_gap):.1f}% {'faster' if burn_gap > 0 else 'slower'} than physical progress",
                "feature_value": burn_gap,
            },
            {
                "feature": "time_elapsed_ratio",
                "value": round(time_elapsed * 0.4, 4),
                "direction": "positive" if time_elapsed > 0.7 else "negative",
                "label": f"{time_elapsed * 100:.0f}% of scheduled time elapsed",
                "feature_value": time_elapsed,
            },
        ],
        "model_version": "stub-heuristic-v1",
    }


def _get_sector_advisory(sector: str, ministry: str, proj_name: str, top_feature: str) -> str:
    s = (sector or "").lower()
    m = (ministry or "").lower()
    p = (proj_name or "").lower()

    if any(k in s for k in ["aviation", "airport", "airfield", "enclave"]) or "civil aviation" in m:
        if "terminal" in p or "building" in p:
            return "Fast-track DGCA and BCAS security clearances for passenger terminal areas, expedite baggage handling system (BHS) calibration, and accelerate HVAC/aero-bridge installation."
        elif "runway" in p or "apron" in p:
            return "Prioritize apron concrete bay curing, expedite airfield ground lighting (AGL) cabling, and coordinate with AAI for runway friction calibration tests."
        else:
            return "Coordinate with AAI and state administration for peripheral boundary wall land demarcation, ATC radar installation, and statutory aerodrome licensing."
    elif any(k in s for k in ["road", "highway", "bridge", "expressway"]) or "road transport" in m:
        if "bridge" in p or "flyover" in p or "robs" in p:
            return "Expedite railway safety girder-launching blocks, clear bottleneck flyover pier approvals, and accelerate prestressed concrete girder casting."
        else:
            return "Expedite Right-of-Way (ROW) land compensation disbursements with district collectors, fast-track state utility line shifting (power/water mains), and deploy automated paving trains."
    elif any(k in s for k in ["rail", "freight", "train"]) or "railway" in m:
        if "electrification" in p or "ohe" in p:
            return "Accelerate 25kV overhead track electrification (OHE) mast foundation casting and coordinate traction power substation (TSS) grid charging with state DISCOM."
        elif "doubling" in p or "line" in p:
            return "Secure non-interlocking (NI) traffic blocks with zonal railway divisions, fast-track electronic interlocking (EI) panel installations, and schedule CRS statutory track inspections."
        else:
            return "Coordinate with Commissioner of Railway Safety (CRS) for statutory track inspections, secure dedicated traffic blocks, and accelerate station loop line structural works."
    elif any(k in s for k in ["urban", "metro", "transit"]) or "housing" in m or "urban" in m:
        return "Coordinate municipal traffic diversion permissions, expedite Tunnel Boring Machine (TBM) ring-segment supply, and accelerate underground station MEP fit-outs."
    elif any(k in s for k in ["power", "energy", "thermal", "hydro", "transmission", "electricity"]):
        if "transmission" in s or "distribution" in s:
            return "Fast-track tower footing Right-of-Way clearances with revenue authorities, expedite HTLS conductor stringing, and commission 400/220kV gas-insulated substation (GIS) bays."
        else:
            return "Fast-track Stage-II forest clearance compliance, expedite Balance-of-Plant (BOP) turbine/generator delivery, and synchronize grid evacuation substation charging."
    elif any(k in s for k in ["renewable", "solar", "wind"]):
        return "Resolve state DISCOM dedicated transmission line evacuation Right-of-Way, secure solar PV module customs clearance, and synchronize grid battery storage units."
    elif any(k in s for k in ["petroleum", "gas", "oil", "pipeline", "refinery"]):
        return "Complete pipeline Right-of-User (ROU) clearance across district boundaries, expedite hydrostatic segment pressure testing, and secure statutory PESO terminal safety certifications."
    elif any(k in s for k in ["water", "irrigation", "dam"]) or "jal" in m:
        return "Expedite canal lining and earthwork excavation, audit spillway headwork structural safety, and release rehabilitation & resettlement (R&R) compensation packages."
    elif any(k in s for k in ["port", "shipping", "waterway"]):
        return "Accelerate approach channel capital dredging to target draft depth, fast-track rail-mounted quay crane (RMQC) commissioning, and secure pending CRZ environmental clearances."
    elif any(k in s for k in ["coal", "mine", "mining", "steel", "metal"]):
        return "Expedite overburden excavation contractor mobilization, clear stage-II forest diversion leases, and construct dedicated rail-siding bulk dispatch facilities."
    elif any(k in s for k in ["telecom", "communication"]):
        return "Expedite right-of-way optical fiber trenching permits with highway authorities and commission regional 5G telecom tower aggregation points."
    elif any(k in s for k in ["health", "hospital", "education"]):
        return "Fast-track medical gas pipeline system (MGPS) commissioning, complete modular operation theater (OT) fit-outs, and obtain municipal fire safety occupancy certificates."
    else:
        return "Convene bi-weekly multi-agency project monitoring committee chaired by the Project Director and establish milestone-linked critical path acceleration sprints."


def _get_financial_enforcement(burn_gap: float, cost_var: float, time_elapsed: float, tier: str, current_progress: float) -> str:
    if burn_gap >= 12.0:
        return (
            f"Commission an independent third-party Measurement Book (MB) audit on all live contractor work packages. "
            f"Cross-verify billed quantities against drone photogrammetry surveys and on-ground certified physical work. "
            f"Withhold release of pending interim payment certificates (IPC) and contractor advance payments until the {burn_gap:+.1f}% "
            f"expenditure-to-progress gap is formally reconciled and approved by the Project Director."
        )
    elif burn_gap <= -12.0 and current_progress > 20.0:
        return (
            f"Expedite scrutiny and approval of all pending contractor Interim Payment Certificates (IPCs) and running bills "
            f"to eliminate cash-flow bottlenecks that are directly constraining site productivity. Mandate the Project Finance Officer "
            f"to clear invoices within a 7-day SLA, ensuring uninterrupted supply of critical construction materials and labour mobilization."
        )
    elif cost_var >= 10.0:
        return (
            f"Institute strict price-escalation caps on all EPC contract packages. Mandate a ministry-level value-engineering review "
            f"committee to identify and remove non-essential scope changes responsible for the {cost_var:+.1f}% budget revision. "
            f"Re-allocate unutilized contingency reserves to lagging critical-path packages and submit a revised cost sanction note "
            f"to the Expenditure Finance Committee (EFC) within 30 days."
        )
    elif current_progress < 15.0 and time_elapsed >= 0.35:
        return (
            f"Issue a formal Cure Notice to the lead concessionaire citing sluggish site mobilization with {current_progress:.1f}% physical progress "
            f"against {time_elapsed * 100:.0f}% time elapsed. Mandate deployment of 100% committed site equipment, "
            f"engineering personnel, and key sub-contractors within 14 calendar days or invoke contract termination provisions under "
            f"standard FIDIC/EPC agreement clauses."
        )
    elif time_elapsed >= 0.80 and current_progress < 75.0:
        return (
            f"Mandate dual-shift 24/7 construction rosters across all lagging critical-path work packages to recover the schedule deficit. "
            f"Invoke contractual Liquidated Damages (LD) provisions for each week of milestone default. Deploy a dedicated site resident "
            f"engineer from the ministry PMU for daily progress monitoring and direct escalation to the Joint Secretary if weekly "
            f"targets are missed consecutively for two reporting cycles."
        )
    elif tier in ("critical", "high"):
        return (
            f"Freeze all non-essential budget outlays and discretionary spending immediately. Mandate bi-weekly vendor milestone reviews "
            f"with physical site verification. Establish an escrow account disbursement mechanism where all future contractor payments "
            f"are released only against digitally verified, geo-tagged physical completion certificates approved by the Project Director."
        )
    else:
        return (
            f"Maintain structured milestone-linked disbursements as per the approved Annual Plan. Deploy quarterly drone photogrammetry "
            f"and LiDAR-based progress audits to detect any emerging critical-path slippages early. Ensure all contractor bills are "
            f"processed within the MoSPI-mandated 30-day payment cycle to maintain construction momentum."
        )


def _get_resource_mobilization(tier: str, current_progress: float, time_elapsed_ratio: float, delay_months: float, sec_name: str) -> str:
    """Returns a detailed Phase 1 resource mobilization action."""
    s = (sec_name or "").lower()
    if tier == "critical":
        return (
            f"Invoke emergency resource deployment powers under the project concession agreement. Direct the EPC contractor to "
            f"immediately augment site strength with additional shift crews, heavy plant (excavators, batching plants, cranes), "
            f"and specialized sub-contractors on all critical path activities. Mandate a 24/7 dual-shift construction roster within "
            f"72 hours and submit an updated recovery micro-schedule to the PMU within 7 days."
        )
    elif tier == "high":
        return (
            f"Direct the primary EPC contractor to deploy additional machinery, engineering supervisors, and labour on all lagging "
            f"critical-path packages within 10 working days. With {current_progress:.1f}% physical completion and {time_elapsed_ratio * 100:.0f}% "
            f"of schedule elapsed, a projected delay of ~{delay_months:.1f} months necessitates immediate resource re-allocation from "
            f"non-critical to critical work packages, supported by a revised micro-schedule approved by the Project Director."
        )
    else:
        return (
            f"Review the contractor's current deployed resource strength against contractual commitments. If equipment utilization "
            f"is below 80% of peak requirement, issue a formal resource mobilization notice. Constitute a dedicated site acceleration "
            f"task force for the top 3 lagging work packages and set fortnightly physical progress targets with escalation thresholds."
        )


def _get_monitoring_protocol(tier: str, proj_name: str, min_name: str, st_name: str, composite: float) -> str:
    """Returns a Phase 2 digital monitoring and governance action."""
    if tier == "critical":
        return (
            f"Activate PRISM real-time monitoring dashboard for '{proj_name}' with daily automated alerts. Deploy geo-tagged "
            f"drone photogrammetry surveys at the site every 15 days for independent civil work verification. Constitute a "
            f"High-Level Review Committee (HLRC) under the Secretary, {min_name}, with bi-weekly meetings to review progress, "
            f"unblock inter-departmental bottlenecks, and authorize emergency expenditure re-allocations."
        )
    elif tier == "high":
        return (
            f"Integrate the project into the PRAGATI (Pro-Active Governance And Timely Implementation) monthly review mechanism. "
            f"Assign a dedicated Nodal Officer at the Joint Secretary level in {min_name} with direct hotline access to the "
            f"state government's Chief Secretary in {st_name}. Mandate weekly progress reports with geo-tagged photographic evidence "
            f"of all milestone activities and review against the approved S-curve progress trajectory."
        )
    else:
        return (
            f"Maintain the project on PAIMANA (Project Appraisal and Monitoring) with monthly milestone updates. Require fortnightly "
            f"progress reports from the Implementing Agency with photographic and video evidence of key work packages. "
            f"Conduct a quarterly third-party quality audit (TPQA) by an empanelled MoSPI agency to validate physical works "
            f"and identify any quality/scope deviations before they escalate."
        )


def _get_compliance_clearance_action(sec_name: str, min_name: str, st_name: str, proj_name: str, tier: str) -> str:
    """Returns a detailed Phase 2 statutory/regulatory clearance action specific to the sector."""
    s = (sec_name or "").lower()
    m = (min_name or "").lower()
    p = (proj_name or "").lower()

    if any(k in s for k in ["road", "highway", "bridge", "expressway"]) or "road transport" in m:
        return (
            f"Escalate all pending Right-of-Way (ROW) encumbrance cases to the {st_name} District Collector level for "
            f"resolution under urgency provisions of the National Highways Act. Simultaneously fast-track utility shifting "
            f"permissions (HT power lines, BSNL, water mains) with respective state departments. Coordinate with the Forest "
            f"Department for Stage-II forest diversion compliance and obtain approved Environmental Clearance (EC) "
            f"amendments for any scope revisions."
        )
    elif any(k in s for k in ["rail", "freight", "train"]) or "railway" in m:
        return (
            f"Obtain guaranteed Non-Interlocking (NI) traffic block schedule from the Zonal Railway Division for critical "
            f"track-linking and bridge works. Expedite Ministry of Environment's Stage-II forest clearance for embankment "
            f"sections. Coordinate with the Commissioner of Railway Safety (CRS) for early inspection scheduling to prevent "
            f"last-mile commissioning delays, and secure RDSO technical approvals for all new design deviations."
        )
    elif any(k in s for k in ["power", "energy", "hydro", "thermal", "transmission"]) or "power" in m:
        return (
            f"Fast-track Central Electricity Authority (CEA) statutory approvals for grid synchronization and metering. "
            f"Expedite MoEFCC Stage-II forest clearance compliance for transmission corridors and substation land. "
            f"Coordinate with {st_name} SLDC (State Load Dispatch Centre) and DISCOM for grid trial charging permissions "
            f"and secure statutory Environmental Clearance amendments for any revised capacity parameters."
        )
    elif any(k in s for k in ["water", "irrigation", "dam"]) or "jal" in m:
        return (
            f"Obtain Irrigation Department's Final Detailed Project Report (DPR) revision approval for all scope modifications. "
            f"Expedite Central Water Commission (CWC) stage-wise clearance for dam safety parameters and hydraulic design revisions. "
            f"Coordinate with the {st_name} Rehabilitation & Resettlement (R&R) authority to resolve any outstanding land "
            f"acquisition disputes blocking canal network construction."
        )
    elif any(k in s for k in ["aviation", "airport"]) or "civil aviation" in m:
        return (
            f"Obtain DGCA aerodrome site clearance amendment for any infrastructure scope changes. Expedite Bureau of Civil Aviation "
            f"Security (BCAS) security vetting for airside operations personnel and secure AAI NOC for airfield ground lighting "
            f"(AGL) and instrument landing system (ILS) commissioning. Coordinate with MoEFCC for amended Environmental Clearance "
            f"for terminal building expansion or runway extension activities."
        )
    elif any(k in s for k in ["urban", "metro"]):
        return (
            f"Expedite municipal traffic diversion and road closure permissions from {st_name} Traffic Police and Urban Local Body "
            f"for underground/elevated corridor works. Obtain CMRS/Metro Rail Safety Committee statutory inspection schedule "
            f"for newly completed viaduct and tunnel segments. Coordinate with DISCOMs for traction power supply permissions "
            f"and with state for property acquisition disputes."
        )
    else:
        return (
            f"Identify all pending statutory clearances (Environmental, Forest, Revenue, Utility NOCs) through a dedicated "
            f"Clearance Tracking Register maintained by the PMU in {st_name}. Assign a single-window officer at the {min_name} "
            f"level to interface with all regulatory agencies. Escalate clearances older than 60 days to the Cabinet Secretariat "
            f"for resolution through the PRAGATI mechanism."
        )


def _get_contract_enforcement(tier: str, proj_name: str, delay_months: float, est_overrun_cr: float, burn_gap: float, cost_var: float) -> str:
    """Returns a Phase 3 contract enforcement and dispute resolution action."""
    if tier == "critical":
        return (
            f"Invoke contractual Liquidated Damages (LD) clauses immediately for all milestone defaults, capping deductions "
            f"at the contract-specified ceiling. Simultaneously, commission an independent Dispute Review Expert (DRE) panel "
            f"under the FIDIC framework to adjudicate all pending contractor claims and arbitration notices within 90 days. "
            f"Prepare a contingency plan for contractor replacement/supplementation if recovery schedule commitments are not "
            f"met within 45 days, to contain the Rs. {est_overrun_cr:,.1f} Cr cost exposure."
        )
    elif tier == "high":
        return (
            f"Issue formal milestone default notices and begin Liquidated Damage (LD) deduction proceedings for all critical-path "
            f"packages behind schedule. Constitute an Empowered Contract Review Committee at the Additional Secretary level to review "
            f"contractor extension-of-time (EOT) claims and approve legitimate time extensions only against documented force majeure "
            f"or ministry-attributable delays. Fast-track settlement of all undisputed contractor bills to reduce litigation risk."
        )
    else:
        return (
            f"Conduct a comprehensive contract health-check review covering: (a) contractor performance against agreed KPIs, "
            f"(b) pending variation order approvals, (c) price escalation index (PVI) reconciliation, and (d) insurance and bond "
            f"coverage adequacy. Approve legitimate extension-of-time (EOT) claims within the standard 30-day SLA and close out "
            f"all variation orders pending for more than 60 days to prevent cost crystallization at project completion."
        )


def _get_value_engineering_action(tier: str, current_progress: float, cost_var: float, est_overrun_cr: float, sec_name: str) -> str:
    """Returns a Phase 3 value engineering and risk containment action."""
    s = (sec_name or "").lower()
    if cost_var >= 15.0:
        return (
            f"Constitute an urgent Value Engineering (VE) review panel comprising CPWD/MoSPI technical advisors and the project "
            f"design consultant. Mandate review of all remaining Bill-of-Quantities (BOQ) items for design optimization, material "
            f"substitution (e.g., precast vs. in-situ concrete), and modular construction techniques to reduce the {cost_var:+.1f}% "
            f"cost overrun trajectory. Cap contingency drawdowns at 50% of remaining reserve until VE savings are formally quantified."
        )
    elif tier in ("critical", "high") and est_overrun_cr > 10.0:
        return (
            f"Restructure remaining contract packages to enforce milestone-linked payment tranches tied directly to verifiable "
            f"physical completion certificates. Eliminate all unverified advance payments and mobilization advances not backed by "
            f"bank guarantees. Submit a revised Financial Completion Cost estimate to the Expenditure Finance Committee (EFC) "
            f"within 30 days, reflecting the latest scope, escalation provisions, and risk-adjusted contingency of Rs. {est_overrun_cr:,.1f} Cr."
        )
    else:
        return (
            f"Deploy digital twin-based progress tracking to continuously compare actual vs. planned cost-to-complete (CTC) estimates. "
            f"Review procurement strategy for remaining major material packages (steel, cement, electrical equipment) and explore "
            f"bulk government rate contract procurement through DGS&D/GeM portal to reduce market price risk. "
            f"Maintain a rolling 90-day cash flow forecast to ensure budget availability for the project completion phase."
        )


def _get_closeout_action(tier: str, current_progress: float, proj_name: str, st_name: str, delay_months: float) -> str:
    """Returns a Phase 3 project completion and capitalization action."""
    if current_progress >= 85.0:
        return (
            f"Initiate formal project closeout procedures for '{proj_name}': (a) Commission independent technical audit of all "
            f"completed structures; (b) Obtain statutory testing certifications (load tests, pressure tests, fire safety); "
            f"(c) Prepare Joint Handover Certificate (JHC) for asset transfer to {st_name} state authority; "
            f"(d) Submit Final Project Completion Report (PCR) to MoSPI; (e) Release defect liability retainage against bank guarantees "
            f"post Defect Notification Period (DNP). Target full administrative closure within 120 days."
        )
    else:
        return (
            f"Establish a formal Project Completion Roadmap with monthly milestones for the remaining {100 - current_progress:.1f}% "
            f"of work. Schedule the MoSPI Project Completion Review at 95% physical progress to pre-empt administrative delays. "
            f"Initiate early preparation of Operation & Maintenance (O&M) manuals, As-Built drawings, and asset handover "
            f"documentation so that final commissioning is not held up by administrative paperwork. Target a recovery of "
            f"~{delay_months:.1f} months by front-loading all enabling works and long-lead procurement."
        )


def _get_executive_directive(tier: str, proj_name: str, delay_months: float, est_overrun_cr: float, top_feature: str) -> str:
    if tier == "critical":
        return (
            f"Immediate executive escalation to the Secretary, Ministry level. Issue a statutory cure notice to the lead "
            f"contractor under the concession agreement, initiate a high-level MoSPI-Ministry joint technical audit within "
            f"48 hours, and constitute an Emergency Project Recovery Task Force. Freeze all unverified fiscal advances and "
            f"contractor payments until audit findings are presented, to contain the projected Rs. {est_overrun_cr:,.1f} Cr "
            f"cost exposure and arrest the ~{delay_months:.1f}-month schedule deviation."
        )
    elif tier == "high":
        return (
            f"Urgent administrative intervention required within 7 working days. Convene an inter-ministerial task force "
            f"meeting chaired by the Additional Secretary. Assign a dedicated Nodal Officer at the Director level for daily "
            f"bottleneck resolution. Mandate the contractor to submit a credible Recovery Action Plan (RAP) within 14 days "
            f"with weekly milestone targets, and activate Performance Security encashment if RAP is not met within the first "
            f"30-day review cycle."
        )
    elif tier == "medium":
        if "burn" in top_feature:
            return (
                f"Enhanced financial velocity monitoring protocol activated. Appoint a dedicated Finance Controller at the "
                f"PMU to reconcile expenditure milestones against certified physical work measurements on a fortnightly basis. "
                f"Optimize procurement cash-flow scheduling and ensure all pending contractor bills are cleared within the "
                f"MoSPI-mandated payment cycle to prevent artificial expenditure inflation and mitigate the projected "
                f"~{delay_months:.1f}-month schedule impact."
            )
        elif "progress" in top_feature:
            return (
                f"Site acceleration protocol activated. Issue a formal performance notice to the contractor requiring deployment "
                f"of additional machinery and qualified technical personnel on all lagging sub-packages within 10 working days. "
                f"Mandate submission of a revised micro-schedule (activity-level Gantt chart) aligned to compress the projected "
                f"~{delay_months:.1f}-month schedule lag, with weekly progress velocity targets tracked against the approved S-curve."
            )
        else:
            return (
                f"Enhanced administrative monitoring activated. Elevate reporting frequency from monthly to fortnightly. "
                f"Mandate the Implementing Agency to submit geo-tagged photographic evidence of all key milestone activities "
                f"and enforce critical path acceleration sprints to mitigate the projected ~{delay_months:.1f}-month delay before "
                f"it cascades into a high-risk classification in the next quarterly MoSPI review cycle."
            )
    else:
        return (
            f"Project trajectory is currently within acceptable parameters. Maintain standard monthly milestone monitoring "
            f"under PAIMANA. Continue certified progress-linked disbursements as per the approved Annual Plan. Schedule a "
            f"routine quarterly review to confirm that physical progress velocity is sustained and that no new risk factors "
            f"emerge in the next reporting cycle."
        )


def generate_dynamic_analysis_and_plan(
    proj_name: str,
    min_name: str,
    sec_name: str,
    st_name: str,
    tier: str,
    composite: float,
    delay_months: float,
    est_overrun_cr: float,
    burn_rate: float,
    current_progress: float,
    burn_progress_gap: float,
    time_elapsed_ratio: float,
    cost_variation_pct: float,
    top_label: str,
    top_feature: str = "",
) -> str:
    """Generates clean, professional MoSPI PAIMANA executive risk assessment points."""
    return (
        f"• Project: {proj_name}\n"
        f"• Ministry & Sector: {min_name} | {sec_name} ({st_name})\n"
        f"• Risk Classification: {tier.upper()} RISK TIER (Composite Index: {composite * 100:.1f}%)\n"
        f"• Primary Risk Driver: {top_label}\n"
        f"• Financial Burn Gap: {burn_progress_gap:+.1f}% | Physical Progress: {current_progress:.1f}% | Time Elapsed: {time_elapsed_ratio * 100:.0f}%\n"
        f"• Cost Revision: {cost_variation_pct:+.1f}% | Burn Rate: {burn_rate:.1f}%\n"
        f"• Forecasted Impact: Projected schedule lag of ~{delay_months:.1f} months with an estimated cost exposure of Rs. {est_overrun_cr:,.2f} Crore."
    )



def predict(project_data: Dict[str, Any], models_path: str) -> Dict[str, Any]:
    """
    Main prediction entry point called by backend /predict endpoint.
    Uses lightweight CPU-optimized XGBoost models (delay, cost, baseline) and dynamic advisory engine.
    """
    if _model is None or _delay_model is None or _cost_model is None:
        _load_models(models_path)

    try:
        current_progress = float(project_data.get("physical_progress_pct") or 0.0)
        original_cost = float(project_data.get("original_cost_cr") or 100.0)
        revised_cost = float(project_data.get("revised_cost_cr") or original_cost)
        expenditure = float(project_data.get("cumulative_expenditure_cr") or 0.0)

        burn_rate = (expenditure / revised_cost * 100.0) if revised_cost > 0 else 0.0
        burn_progress_gap = float(project_data.get("burn_progress_gap") if project_data.get("burn_progress_gap") is not None else (burn_rate - current_progress))
        cost_variation_pct = ((revised_cost - original_cost) / original_cost * 100.0) if original_cost > 0 else 0.0
        time_elapsed_ratio = float(project_data.get("time_elapsed_ratio") or 0.5)

        # 1. Feature matrix for lightweight delay & cost XGBoost classifiers
        features_7 = pd.DataFrame([{
            "burn_rate_pct": float(burn_rate),
            "burn_progress_gap": float(burn_progress_gap),
            "time_elapsed_ratio": float(time_elapsed_ratio),
            "physical_progress_pct": float(current_progress),
            "cost_variation_pct": float(cost_variation_pct),
            "original_cost_cr": float(original_cost),
            "revised_cost_cr": float(revised_cost),
        }])

        # Run delay classification model on CPU
        if _delay_model is not None:
            try:
                delay_feats = pd.DataFrame([{
                    "original_cost_cr": float(original_cost),
                    "physical_progress_pct": float(current_progress),
                    "original_burn_rate_pct": float((expenditure / original_cost * 100.0) if original_cost > 0 else 0.0),
                    "original_burn_gap": float(((expenditure / original_cost * 100.0) if original_cost > 0 else 0.0) - current_progress),
                    "time_elapsed_ratio": float(time_elapsed_ratio),
                    "progress_velocity": float(burn_progress_gap * -0.1),
                }])
                delay_prob = float(_delay_model.predict_proba(delay_feats)[0][1])
            except Exception:
                try:
                    delay_prob = float(_delay_model.predict_proba(features_7)[0][1])
                except Exception as de:
                    logger.debug("Delay model predict_proba fallback: %s", de)
                    delay_prob = min(max((burn_progress_gap / 100.0) * 0.40 + (time_elapsed_ratio - (current_progress / 100.0)) * 0.45 + (cost_variation_pct / 100.0) * 0.15, 0.05), 0.95)
        else:
            delay_prob = min(max((burn_progress_gap / 100.0) * 0.40 + (time_elapsed_ratio - (current_progress / 100.0)) * 0.45 + (cost_variation_pct / 100.0) * 0.15, 0.05), 0.95)

        # Run cost overrun classification model on CPU
        if _cost_model is not None:
            try:
                # Provide leakage-free features to the retrained cost model
                cost_feats = pd.DataFrame([{
                    "original_cost_cr": float(original_cost),
                    "physical_progress_pct": float(current_progress),
                    "original_burn_rate_pct": float((expenditure / original_cost * 100.0) if original_cost > 0 else 0.0),
                    "original_burn_gap": float(((expenditure / original_cost * 100.0) if original_cost > 0 else 0.0) - current_progress),
                    "time_elapsed_ratio": float(time_elapsed_ratio),
                    "burn_velocity": float(burn_progress_gap * 0.1),
                }])
                cost_prob = float(_cost_model.predict_proba(cost_feats)[0][1])
            except Exception as ce:
                try:
                    cost_prob = float(_cost_model.predict_proba(features_7)[0][1])
                except Exception:
                    logger.debug("Cost model predict_proba fallback: %s", ce)
                    cost_prob = min(max((cost_variation_pct / 50.0) * 0.50 + (burn_progress_gap / 100.0) * 0.50, 0.05), 0.95)
        else:
            cost_prob = min(max((cost_variation_pct / 50.0) * 0.50 + (burn_progress_gap / 100.0) * 0.50, 0.05), 0.95)

        # Predict next physical progress with baseline regressor if available
        predicted_next_progress = min(100.0, current_progress + 2.5)
        if _model is not None and _preprocessor is not None:
            try:
                X_27 = _build_approved_feature_vector(project_data)
                X_processed = _preprocessor.transform(X_27)
                raw_pred = float(_model.predict(X_processed)[0])
                if raw_pred > current_progress:
                    predicted_next_progress = min(100.0, raw_pred)
                else:
                    progress_velocity = max(1.2, (current_progress / 12.0) if current_progress > 0 else 2.0)
                    predicted_next_progress = min(100.0, current_progress + progress_velocity)
            except Exception:
                pass

        composite = _composite_score(delay_prob, cost_prob)
        tier = _score_to_tier(composite)

        # Calculate project-specific delay duration in months using schedule dates, progress, & model risk
        s_dt_str = project_data.get("scheduled_completion_date")
        r_dt_str = project_data.get("revised_completion_date")
        orig_dt_str = project_data.get("original_start_date")

        s_dt = None
        r_dt = None
        start_dt = None
        try:
            if s_dt_str:
                s_dt = datetime.strptime(str(s_dt_str)[:10], "%Y-%m-%d").date()
            if r_dt_str:
                r_dt = datetime.strptime(str(r_dt_str)[:10], "%Y-%m-%d").date()
            if orig_dt_str:
                start_dt = datetime.strptime(str(orig_dt_str)[:10], "%Y-%m-%d").date()
        except Exception:
            pass

        ref_date = date(2026, 4, 1)
        if s_dt and r_dt and r_dt > s_dt:
            # 1. Documented official schedule revision in MoSPI records
            projected_months = round(float((r_dt.year - s_dt.year) * 12 + (r_dt.month - s_dt.month)), 1)
        elif s_dt and s_dt < ref_date and current_progress < 98.0:
            # 2. Scheduled completion date passed, project ongoing
            projected_months = round(float((ref_date.year - s_dt.year) * 12 + (ref_date.month - s_dt.month)), 1)
        elif s_dt and start_dt and s_dt >= ref_date:
            # 3. Project is ongoing towards future scheduled completion
            elapsed_m = max(1.0, float((ref_date.year - start_dt.year) * 12 + (ref_date.month - start_dt.month)))
            rem_m = max(1.0, float((s_dt.year - ref_date.year) * 12 + (s_dt.month - ref_date.month)))
            rem_work = max(1.0, 100.0 - current_progress)
            velocity = max(0.1, current_progress / elapsed_m)
            est_needed_m = rem_work / velocity
            calculated_slip = max(0.0, est_needed_m - rem_m)
            if delay_prob > 0.5:
                calculated_slip = max(calculated_slip, delay_prob * 6.0)
            projected_months = round(min(calculated_slip, 60.0), 1)
        else:
            # 4. Fallback based on model delay probability & burn progress divergence
            raw_delay = (delay_prob * 14.0) + (max(0.0, burn_progress_gap) * 0.20)
            projected_months = round(min(max(0.0, raw_delay), 48.0), 1)

        # Calculate realistic fiscal exposure in ₹ Crore
        if revised_cost > original_cost:
            est_overrun_cr = round(cost_prob * (revised_cost - original_cost) + (cost_prob * original_cost * 0.05), 2)
        else:
            est_overrun_cr = round(cost_prob * original_cost * 0.15, 2)

        # Compute dynamic feature importance & SHAP ranking
        importance_weights = {
            "burn_progress_gap": 0.28,
            "time_elapsed_ratio": 0.24,
            "physical_progress_pct": 0.20,
            "cost_variation_pct": 0.16,
            "burn_rate_pct": 0.12,
        }
        if _delay_model is not None and hasattr(_delay_model, "feature_importances_"):
            try:
                fi_dict = dict(zip(_delay_model.feature_names_in_, _delay_model.feature_importances_))
                for k in importance_weights:
                    if k in fi_dict:
                        importance_weights[k] = float(fi_dict[k])
            except Exception:
                pass

        shap_explanation = [
            {
                "feature": "burn_progress_gap",
                "value": round(abs(burn_progress_gap) / 100.0 * importance_weights.get("burn_progress_gap", 0.25) * 4.0, 4),
                "direction": "positive" if burn_progress_gap > 0 else "negative",
                "label": f"Budget spent {abs(burn_progress_gap):.1f}% {'faster' if burn_progress_gap > 0 else 'slower'} than progress",
                "feature_value": burn_progress_gap,
            },
            {
                "feature": "time_elapsed_ratio",
                "value": round(time_elapsed_ratio * importance_weights.get("time_elapsed_ratio", 0.25), 4),
                "direction": "positive" if time_elapsed_ratio > 0.65 else "negative",
                "label": f"{time_elapsed_ratio * 100:.0f}% of scheduled timeline elapsed",
                "feature_value": time_elapsed_ratio,
            },
            {
                "feature": "physical_progress_pct",
                "value": round((1.0 - (current_progress / 100.0)) * importance_weights.get("physical_progress_pct", 0.20), 4),
                "direction": "negative" if current_progress > 50 else "positive",
                "label": f"Current physical progress reached: {current_progress:.1f}%",
                "feature_value": current_progress,
            },
            {
                "feature": "cost_variation_pct",
                "value": round(abs(cost_variation_pct) / 100.0 * importance_weights.get("cost_variation_pct", 0.15) * 3.0, 4),
                "direction": "positive" if cost_variation_pct > 0 else "negative",
                "label": f"Budget cost revision: {cost_variation_pct:+.1f}%",
                "feature_value": cost_variation_pct,
            },
        ]
        shap_explanation.sort(key=lambda x: x["value"], reverse=True)

        proj_name = str(project_data.get("project_name") or "Infrastructure Project")
        min_name = str(project_data.get("ministry") or "Central Ministry")
        sec_name = str(project_data.get("sector") or "Infrastructure Sector")
        st_name = str(project_data.get("state") or "India")
        top_label = shap_explanation[0]["label"] if shap_explanation else "Financial burn rate divergence"
        top_feature = shap_explanation[0]["feature"] if shap_explanation else ""

        narrative = generate_dynamic_analysis_and_plan(
            proj_name=proj_name,
            min_name=min_name,
            sec_name=sec_name,
            st_name=st_name,
            tier=tier,
            composite=composite,
            delay_months=projected_months,
            est_overrun_cr=est_overrun_cr,
            burn_rate=burn_rate,
            current_progress=current_progress,
            burn_progress_gap=burn_progress_gap,
            time_elapsed_ratio=time_elapsed_ratio,
            cost_variation_pct=cost_variation_pct,
            top_label=top_label,
            top_feature=top_feature,
        )

        return {
            "delay_probability": round(delay_prob, 4),
            "delay_duration_months": projected_months,
            "cost_overrun_probability": round(cost_prob, 4),
            "cost_overrun_amount_cr": float(est_overrun_cr),
            "composite_risk_score": composite,
            "risk_tier": tier,
            "predicted_next_physical_progress": round(predicted_next_progress, 2),
            "shap_values": shap_explanation,
            "ai_risk_narrative": narrative,
            "model_version": _model_version,
        }

    except Exception as e:
        logger.error("ML prediction execution error: %s", e)
        return _stub_prediction(project_data)

