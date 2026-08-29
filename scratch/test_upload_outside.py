import sys, urllib.request, json
sys.path.append('backend')
from app.core.security import create_access_token

token = create_access_token({'sub': 'demo-user', 'email': 'demo@prism.gov.in', 'role': 'admin'})
headers = {'Authorization': 'Bearer ' + token}

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="Outside_Custom_Project_Report_2026.csv"\r\n' +
    'Content-Type: text/csv\r\n\r\n' +
    'Project_Name,Original_Cost,Revised_Cost,Expenditure,Physical_Progress\r\n' +
    'Outside Highway Stretch #99,950,1350,890,40\r\n' +
    '--' + boundary + '--\r\n'
).encode('utf-8')

headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/parse-document', data=body, headers=headers)
res = urllib.request.urlopen(req)
out = json.loads(res.read().decode())

sys.stdout.reconfigure(encoding='utf-8')
print('OUTSIDE CUSTOM FILE PARSING & QWEN QLORA INFERENCE SUCCESS:')
print('File:', out['file_name'])
print('Project:', out['project_name'])
print('Risk Tier:', out['risk_tier'].upper(), '| Composite Score:', out['composite_risk_score'])
print('Burn Progress Gap:', out['burn_progress_gap'], '%')
print('Qwen Executive Briefing:\n', out['ai_risk_narrative'])
