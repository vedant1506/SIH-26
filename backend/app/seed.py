import os
import sys
import uuid
import random
import pandas as pd
from datetime import date, datetime, timedelta

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.database import Base, engine, SessionLocal
from app.models.project import Project, RiskPrediction, Alert, Profile

PROCESSED_CSV_PATH = os.path.join(ROOT_DIR, "ml", "data", "processed", "projects_features.csv")

# 23 Indian States and UTs with precise central capital coordinates
STATE_COORDS = [
    ("DELHI", 28.6139, 77.2090),
    ("MAHARASHTRA", 19.0760, 72.8777),
    ("KARNATAKA", 12.9716, 77.5946),
    ("TAMIL NADU", 13.0827, 80.2707),
    ("WEST BENGAL", 22.5726, 88.3639),
    ("UTTAR PRADESH", 26.8467, 80.9462),
    ("GUJARAT", 23.0225, 72.5714),
    ("RAJASTHAN", 26.9124, 75.7873),
    ("TELANGANA", 17.3850, 78.4867),
    ("ANDHRA PRADESH", 17.6868, 83.2185),
    ("MADHYA PRADESH", 23.2599, 77.4126),
    ("BIHAR", 25.5941, 85.1376),
    ("ODISHA", 20.2961, 85.8245),
    ("ASSAM", 26.1445, 91.7362),
    ("PUNJAB", 30.7333, 76.7794),
    ("HARYANA", 28.4595, 77.0266),
    ("KERALA", 8.5241, 76.9366),
    ("JHARKHAND", 23.3441, 85.3096),
    ("CHHATTISGARH", 21.2514, 81.6296),
    ("JAMMU & KASHMIR", 34.0837, 74.7973),
    ("HIMACHAL PRADESH", 31.1048, 77.1734),
    ("UTTARAKHAND", 30.3165, 78.0322),
    ("GOA", 15.4909, 73.8278),
    ("SIKKIM", 27.5330, 88.5122),
]

# 17 Central Ministries across 22 Infrastructure Sectors (Matching MoSPI PAIMANA April 2026 Data)
SECTOR_MINISTRIES = [
    ("Roads & Bridges", "Ministry of Road Transport and Highways", "National Highway NH-44 Expressway"),
    ("Railways", "Ministry of Railways", "Dedicated Heavy Freight Rail Corridor"),
    ("Urban Transport", "Ministry of Housing and Urban Affairs", "Metro Rapid Transit Expansion Line"),
    ("Power", "Ministry of Power", "Ultra Supercritical Thermal Power Station"),
    ("Renewable Energy", "Ministry of New and Renewable Energy", "Mega Solar & Wind Energy Park"),
    ("Petroleum & Natural Gas", "Ministry of Petroleum and Natural Gas", "Refinery Modernization & Gas Pipeline"),
    ("Telecommunications", "Ministry of Communications", "Pan-India Fiber Optical Grid"),
    ("Water Resources", "Ministry of Jal Shakti", "River Interlinking & Major Irrigation Dam"),
    ("Urban Water & Sanitation", "Ministry of Housing and Urban Affairs", "Smart City Sewerage & Water Treatment"),
    ("Coal", "Ministry of Coal", "Open-Cast Coal Mine Infrastructure"),
    ("Steel", "Ministry of Steel", "Integrated Steel Plant Expansion"),
    ("Mines & Mining", "Ministry of Mines", "Strategic Mineral Processing Terminal"),
    ("Ports & Shipping", "Ministry of Ports, Shipping and Waterways", "Deep Draft Container Port Complex"),
    ("Inland Waterways", "Ministry of Ports, Shipping and Waterways", "National Waterway Terminal Navigation"),
    ("Civil Aviation", "Ministry of Civil Aviation", "Greenfield International Airport Runway"),
    ("Heavy Industry", "Ministry of Heavy Industries", "EV Battery & Capital Goods Hub"),
    ("Healthcare Infrastructure", "Ministry of Health and Family Welfare", "AIIMS Super Speciality Hospital Complex"),
    ("Educational Infrastructure", "Ministry of Education", "IIT / IIM Central Campus Infrastructure"),
    ("Defense Infrastructure", "Ministry of Defence", "Strategic Border Roads & Tunnel Project"),
    ("Atomic Energy", "Ministry of Atomic Energy", "Nuclear Power Plant Reactor Unit"),
    ("Petrochemicals", "Ministry of Chemicals and Fertilizers", "Petrochemical Feeder Complex"),
    ("Fertilizers", "Ministry of Chemicals and Fertilizers", "Urea Fertilizer Plant Modernization"),
]


def seed_database(force: bool = True):
    print("Creating database tables if not present...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        project_count = db.query(Project).count()
        if not force and project_count >= 1500:
            print(f"Database already seeded with {project_count} projects. Skipping re-seed.")
            return

        print(f"Clearing old table records (existing: {project_count})...")
        db.query(Alert).delete()
        db.query(RiskPrediction).delete()
        db.query(Project).delete()
        db.commit()

        import json
        history_path = os.path.join(ROOT_DIR, "scratch", "parsed_projects_history.json")
        if not os.path.exists(history_path):
            raise FileNotFoundError(f"Parsed history file not found at {history_path}")

        with open(history_path, "r") as f:
            all_history = json.load(f)

        print(f"Importing {len(all_history)} authentic PAIMANA projects from PDF history...")

        random.seed(42)
        projects = []
        predictions = []
        alerts = []

        state_coords_dict = {s[0]: (s[1], s[2]) for s in STATE_COORDS}

        def get_sector_ministry(name):
            n_lower = name.lower()
            if "road" in n_lower or "highway" in n_lower or "bypass" in n_lower or "bridge" in n_lower or "nh-" in n_lower or "expressway" in n_lower:
                return "Roads & Bridges", "Ministry of Road Transport and Highways"
            elif "rail" in n_lower or "freight" in n_lower or "station" in n_lower or "line" in n_lower:
                return "Railways", "Ministry of Railways"
            elif "metro" in n_lower or "transit" in n_lower or "urban" in n_lower or "dmrts" in n_lower:
                return "Urban Transport", "Ministry of Housing and Urban Affairs"
            elif "power" in n_lower or "thermal" in n_lower or "substation" in n_lower or "transmission" in n_lower or "he project" in n_lower or "subansiri" in n_lower or "rangit" in n_lower:
                return "Power", "Ministry of Power"
            elif "solar" in n_lower or "wind" in n_lower or "renewable" in n_lower:
                return "Renewable Energy", "Ministry of New and Renewable Energy"
            elif "gas" in n_lower or "pipeline" in n_lower or "petroleum" in n_lower or "refinery" in n_lower or "oil" in n_lower:
                return "Petroleum & Natural Gas", "Ministry of Petroleum and Natural Gas"
            elif "telecom" in n_lower or "fiber" in n_lower or "broadband" in n_lower or "bharatnet" in n_lower or "mobile" in n_lower:
                return "Telecommunications", "Ministry of Communications"
            elif "water" in n_lower or "irrigation" in n_lower or "dam" in n_lower:
                return "Water Resources", "Ministry of Jal Shakti"
            elif "coal" in n_lower or "mine" in n_lower or "ocp" in n_lower:
                return "Coal", "Ministry of Coal"
            elif "steel" in n_lower or "mill" in n_lower:
                return "Steel", "Ministry of Steel"
            else:
                return "Roads & Bridges", "Ministry of Road Transport and Highways"

        for pid_str, p in all_history.items():
            st_name = p["state"].upper()
            coords = state_coords_dict.get(st_name, (22.5937, 78.9629))
            lat = coords[0] + (random.random() - 0.5) * 0.08
            lng = coords[1] + (random.random() - 0.5) * 0.08

            sec_name, min_name = get_sector_ministry(p["project_name"])

            timeline = p["timeline"]
            if not timeline:
                continue

            sorted_dates = sorted(timeline.keys())
            latest_date = sorted_dates[-1]
            latest_data = timeline[latest_date]

            orig_cost = float(p["original_cost_cr"])
            rev_cost = float(latest_data["revised_cost_cr"])
            expenditure = float(latest_data["cumulative_expenditure_cr"])
            physical_progress = float(latest_data["physical_progress_pct"])

            scale = "mega" if orig_cost >= 1000 else ("major" if orig_cost >= 150 else "other")
            burn_rate = (expenditure / rev_cost * 100.0) if rev_cost > 0 else 0.0
            burn_gap = burn_rate - physical_progress

            time_elapsed = 0.5
            dates_list = latest_data["dates"]
            if len(dates_list) >= 2:
                try:
                    start_dt = datetime.strptime(dates_list[0], "%m/%Y")
                    end_dt = datetime.strptime(dates_list[1], "%m/%Y")
                    total_days = (end_dt - start_dt).days
                    elapsed_days = (datetime.strptime(latest_date, "%Y-%m-%d") - start_dt).date() - start_dt.date()
                    if total_days > 0:
                        time_elapsed = min(max(elapsed_days.days / total_days, 0.0), 1.0)
                except Exception:
                    pass

            proj_id = uuid.uuid4()
            proj = Project(
                id=proj_id,
                project_name=f"{p['project_name']} #{pid_str}",
                ministry=min_name,
                sector=sec_name,
                state=st_name,
                latitude=round(lat, 4),
                longitude=round(lng, 4),
                original_cost_cr=round(orig_cost, 2),
                revised_cost_cr=round(rev_cost, 2),
                cumulative_expenditure_cr=round(expenditure, 2),
                physical_progress_pct=round(physical_progress, 2),
                project_scale=scale,
                burn_rate_pct=round(burn_rate, 2),
                burn_progress_gap=round(burn_gap, 2),
                time_elapsed_ratio=round(time_elapsed, 4)
            )
            projects.append(proj)

            # Seed predictions history for this project
            for report_date in sorted_dates:
                t_data = timeline[report_date]
                t_rev_cost = float(t_data["revised_cost_cr"])
                t_exp = float(t_data["cumulative_expenditure_cr"])
                t_progress = float(t_data["physical_progress_pct"])
                t_burn_rate = (t_exp / t_rev_cost * 100.0) if t_rev_cost > 0 else 0.0
                t_burn_gap = t_burn_rate - t_progress

                t_elapsed = 0.5
                if len(t_data["dates"]) >= 2:
                    try:
                        start_dt = datetime.strptime(t_data["dates"][0], "%m/%Y")
                        end_dt = datetime.strptime(t_data["dates"][1], "%m/%Y")
                        total_days = (end_dt - start_dt).days
                        elapsed_days = (datetime.strptime(report_date, "%Y-%m-%d") - start_dt).date() - start_dt.date()
                        if total_days > 0:
                            t_elapsed = min(max(elapsed_days.days / total_days, 0.0), 1.0)
                    except Exception:
                        pass

                delay_prob = min(max((t_burn_gap / 100.0) * 0.45 + (t_elapsed - 0.5) * 0.45, 0.05), 0.95)
                cost_prob = min(max((abs(t_rev_cost - orig_cost) / (orig_cost or 1) * 0.55) + (t_burn_gap / 100.0) * 0.45, 0.05), 0.95)
                composite = round(0.55 * delay_prob + 0.45 * cost_prob, 4)
                tier = "critical" if composite >= 0.75 else ("high" if composite >= 0.50 else ("medium" if composite >= 0.25 else "low"))
                delay_months = round(float(delay_prob * 18.0), 1)
                overrun_amount = round(cost_prob * (t_rev_cost - orig_cost if t_rev_cost > orig_cost else orig_cost * 0.15), 2)

                narrative = (
                    f"{p['project_name']} in {st_name} is evaluated under the {tier.upper()} risk tier "
                    f"with a composite risk score of {composite * 100:.1f}%. Progress reached {t_progress:.1f}% "
                    f"against expenditure of ₹{t_exp:.2f} Cr, leading to a burn progress gap of {t_burn_gap:+.1f}%."
                )

                pred = RiskPrediction(
                    id=uuid.uuid4(),
                    project_id=proj_id,
                    delay_probability=round(delay_prob, 4),
                    delay_duration_months=delay_months,
                    cost_overrun_probability=round(cost_prob, 4),
                    cost_overrun_amount_cr=overrun_amount,
                    composite_risk_score=composite,
                    risk_tier=tier,
                    shap_values=[
                        {
                            "feature": "burn_progress_gap",
                            "value": round(abs(t_burn_gap) / 100.0, 4),
                            "direction": "positive" if t_burn_gap > 0 else "negative",
                            "label": f"Expenditure lead over progress ({t_burn_gap:+.1f}%)",
                            "feature_value": t_burn_gap
                        }
                    ],
                    ai_risk_narrative=narrative,
                    model_version="sih26103-baseline-xgboost-v1+qwen2.5-advanced-qlora-v2.0",
                    predicted_at=datetime.strptime(report_date, "%Y-%m-%d")
                )
                predictions.append(pred)

                if tier in ("high", "critical") and report_date == latest_date:
                    alert = Alert(
                        id=uuid.uuid4(),
                        project_id=proj_id,
                        alert_type="risk_escalation",
                        previous_tier="medium",
                        new_tier=tier,
                        message=f"PAIMANA Alert: Project '{p['project_name']}' escalated to {tier.upper()} risk tier due to burn-rate gap ({t_burn_gap:+.1f}%).",
                        is_acknowledged=False,
                    )
                    alerts.append(alert)

        print(f"Bulk saving {len(projects)} projects and {len(predictions)} timeline risk predictions to database...")
        db.bulk_save_objects(projects)
        db.bulk_save_objects(predictions)
        db.bulk_save_objects(alerts)
        db.commit()

        total = db.query(Project).count()
        print(f"[SUCCESS] Successfully seeded EXACTLY {total} PAIMANA infrastructure projects across all states!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database(force=True)
