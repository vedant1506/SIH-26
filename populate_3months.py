import sys, os, sqlite3, uuid, json
from datetime import datetime

sys.path.insert(0, 'backend')
from app.services import ml_service

conn = sqlite3.connect('sql_app.db')
cur = conn.cursor()

# Clear existing predictions
cur.execute('DELETE FROM risk_predictions')
conn.commit()

# Fetch all projects
cur.execute('''
    SELECT id, project_name, ministry, sector, state, original_cost_cr, revised_cost_cr, 
           cumulative_expenditure_cr, physical_progress_pct, burn_rate_pct, burn_progress_gap, 
           time_elapsed_ratio 
    FROM projects
''')
projects = cur.fetchall()
print(f'Populating Feb 2026, Mar 2026, Apr 2026 trend data for {len(projects)} projects...')

models_path = os.path.abspath('ml/SIH26103_ML_FINAL')

# Explicit 3 months: Feb 2026, Mar 2026, Apr 2026
dates = [
    datetime(2026, 2, 28, 12, 0, 0),
    datetime(2026, 3, 31, 12, 0, 0),
    datetime(2026, 4, 30, 12, 0, 0),
]

insert_records = []

for p in projects:
    pid, name, min_name, sec, st, orig_c, rev_c, exp_c, prog, burn_r, burn_g, time_e = p
    orig_c = float(orig_c or 100.0)
    rev_c = float(rev_c or orig_c)
    exp_c = float(exp_c or 0.0)
    prog = float(prog or 0.0)
    time_e = float(time_e or 0.5)

    # Monthly progress velocity calculation
    vel = max(0.5, prog / 12.0) if prog > 0 else 0.5
    
    # Month 1: Feb 2026
    prog_feb = max(0.0, round(prog - 2 * vel, 2))
    exp_feb = max(0.0, round(exp_c * 0.85, 2))
    time_feb = max(0.05, round(time_e - 0.10, 4))

    # Month 2: Mar 2026
    prog_mar = max(0.0, round(prog - 1 * vel, 2))
    exp_mar = max(0.0, round(exp_c * 0.92, 2))
    time_mar = max(0.05, round(time_e - 0.05, 4))

    # Month 3: Apr 2026
    prog_apr = prog
    exp_apr = exp_c
    time_apr = time_e

    months_data = [
        (prog_feb, exp_feb, time_feb, dates[0]),
        (prog_mar, exp_mar, time_mar, dates[1]),
        (prog_apr, exp_apr, time_apr, dates[2]),
    ]

    for m_prog, m_exp, m_time, dt in months_data:
        m_burn_r = (m_exp / rev_c * 100.0) if rev_c > 0 else 0.0
        m_burn_g = m_burn_r - m_prog
        
        p_dict = {
            'project_id': pid,
            'project_name': name,
            'ministry': min_name,
            'sector': sec,
            'state': st,
            'original_cost_cr': orig_c,
            'revised_cost_cr': rev_c,
            'cumulative_expenditure_cr': m_exp,
            'physical_progress_pct': m_prog,
            'burn_rate_pct': m_burn_r,
            'burn_progress_gap': m_burn_g,
            'time_elapsed_ratio': m_time,
        }
        res = ml_service.predict(p_dict, models_path)

        insert_records.append((
            str(uuid.uuid4()),
            pid,
            res['delay_probability'],
            res['delay_duration_months'],
            res['cost_overrun_probability'],
            res['cost_overrun_amount_cr'],
            res['composite_risk_score'],
            res['risk_tier'],
            json.dumps(res['shap_values']),
            res.get('ai_risk_narrative', ''),
            res['model_version'],
            dt.strftime('%Y-%m-%d %H:%M:%S')
        ))

cur.executemany('''
    INSERT INTO risk_predictions 
    (id, project_id, delay_probability, delay_duration_months, cost_overrun_probability, 
     cost_overrun_amount_cr, composite_risk_score, risk_tier, shap_values, ai_risk_narrative, 
     model_version, predicted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', insert_records)

conn.commit()
print(f'Successfully populated Feb 26, Mar 26, and Apr 26 risk history ({len(insert_records)} total records).')
conn.close()
