"""
seed_milestones.py — Programmatically seeds milestones for all 1,981 projects.
Milestones are generated deterministically from project timeline and progress data.

Milestone types (in order):
1. Site Survey & Clearance
2. Land Acquisition
3. Design Approval & DPR Finalization
4. Foundation Work
5. Civil Work — Phase I
6. Civil Work — Phase II
7. Electrical / MEP Work
8. Testing & Commissioning
9. Final Handover

Logic:
- Milestone scheduled_date = interpolated across project timeline
- is_completed = True if project physical_progress_pct exceeds that milestone's threshold
- actual_date = scheduled_date - random offset if completed ahead, or scheduled + delay if late
"""
import sys, os, random
from datetime import date, timedelta

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

from app.core.database import engine, SessionLocal
from app.models.project import Project, Milestone

# Milestone templates: (name, progress_threshold_to_complete, relative_position_in_timeline)
MILESTONE_TEMPLATES = [
    ("Site Survey & Clearance",            5,   0.05),
    ("Land Acquisition",                   10,  0.12),
    ("Design Approval & DPR Finalization", 15,  0.20),
    ("Foundation Work",                    25,  0.30),
    ("Civil Work — Phase I",               45,  0.48),
    ("Civil Work — Phase II",              65,  0.65),
    ("Electrical & MEP Installation",      78,  0.78),
    ("Testing & Commissioning",            90,  0.90),
    ("Final Handover & Completion",        100, 1.00),
]


def seed_milestones():
    db = SessionLocal()
    try:
        # Check if milestones already exist
        existing = db.query(Milestone).count()
        if existing > 0:
            print(f"Milestones already exist: {existing} rows. Skipping seed.")
            return

        projects = db.query(Project).all()
        print(f"Seeding milestones for {len(projects)} projects...")

        total_created = 0
        rng = random.Random(42)  # Deterministic seed

        for project in projects:
            prog = float(project.physical_progress_pct or 0)
            start = project.original_start_date or date(2018, 4, 1)
            end = project.revised_completion_date or project.scheduled_completion_date or date(2027, 3, 31)
            total_days = max((end - start).days, 365)

            for name, completion_threshold, timeline_position in MILESTONE_TEMPLATES:
                # Calculate scheduled date
                milestone_day_offset = int(total_days * timeline_position)
                scheduled = start + timedelta(days=milestone_day_offset)

                # Determine if completed
                is_completed = prog >= completion_threshold

                # Calculate actual date if completed
                actual = None
                if is_completed:
                    # Add small random variation: -15 to +30 days from scheduled
                    variation = rng.randint(-15, 30)
                    # High risk projects tend to be late
                    time_elapsed = float(project.time_elapsed_ratio or 0.5)
                    if time_elapsed > 0.8 and prog < 60:
                        variation = abs(variation) + rng.randint(0, 45)  # Likely delayed
                    actual = scheduled + timedelta(days=variation)
                    if actual > date.today():
                        actual = date.today() - timedelta(days=rng.randint(1, 30))

                milestone = Milestone(
                    project_id=project.id,
                    milestone_name=name,
                    scheduled_date=scheduled,
                    actual_date=actual,
                    is_completed=is_completed,
                )
                db.add(milestone)
                total_created += 1

            # Commit in batches of 500 projects
            if total_created % (500 * len(MILESTONE_TEMPLATES)) == 0:
                db.commit()
                print(f"  Progress: {total_created:,} milestones created...")

        db.commit()
        final_count = db.query(Milestone).count()
        print(f"[OK] Milestone seeding complete. Total milestones: {final_count:,}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Milestone seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_milestones()
