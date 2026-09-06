import urllib.request
import json

def test_api():
    # 1. Login
    data = json.dumps({'email': 'admin@prism.gov.in', 'password': 'PRISM2026Demo'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/auth/login', data=data, headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req)
    token_data = json.loads(resp.read().decode('utf-8'))
    token = token_data['access_token']
    print('[+] Login successful. Role:', token_data.get('role'))

    # 2. Get Summary
    req_summary = urllib.request.Request('http://127.0.0.1:8000/api/v1/actions/summary', headers={'Authorization': f'Bearer {token}'})
    resp_summary = urllib.request.urlopen(req_summary)
    summary = json.loads(resp_summary.read().decode('utf-8'))
    print('[+] Summary endpoint output:', summary)

    # 3. List Actions
    req_actions = urllib.request.Request('http://127.0.0.1:8000/api/v1/actions?limit=5', headers={'Authorization': f'Bearer {token}'})
    resp_actions = urllib.request.urlopen(req_actions)
    actions = json.loads(resp_actions.read().decode('utf-8'))
    print(f'[+] List actions returned {len(actions)} items. First item number: {actions[0].get("action_number")}, deadline_status: {actions[0].get("deadline_status")}')

    # 4. List Officers
    req_officers = urllib.request.Request('http://127.0.0.1:8000/api/v1/actions/officers', headers={'Authorization': f'Bearer {token}'})
    resp_officers = urllib.request.urlopen(req_officers)
    officers = json.loads(resp_officers.read().decode('utf-8'))
    print(f'[+] Officers endpoint returned {len(officers)} officers. First: {officers[0]["full_name"]} ({officers[0]["designation"]})')

if __name__ == '__main__':
    test_api()
