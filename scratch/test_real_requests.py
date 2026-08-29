import urllib.request
import json

url = "http://127.0.0.1:8000/api/v1/parse-document"

def test_file(filename, text_content):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body_data = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
        f"{text_content}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body_data,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    try:
        with urllib.request.urlopen(req) as res:
            res_body = res.read().decode("utf-8")
            data = json.loads(res_body)
            print(f"=== TEST RESULT FOR: {filename} ===")
            print("Detected Title:", data.get("project_name"))
            print("Ministry / Org:", data.get("ministry"))
            print("Sector Domain:", data.get("sector"))
            print("Risk Tier:", data.get("risk_tier"))
            narrative = (data.get("ai_risk_narrative") or "").encode("ascii", "ignore").decode("ascii")
            print("Dynamic AI Briefing Output:\n" + narrative)
            print("=" * 65 + "\n")
    except Exception as e:
        print(f"Error testing {filename}:", e)

# Test 1: Cisco Networking Academic PDF
test_file(
    "Cisco_Networking_Basics.pdf",
    "Report on Cisco Networking Academy - Networking Basics (PBL-1)\nPrepared By: Pathan Shahad (241370107053)\nGujarat Technological University\nThe objective of this study is to examine computer network protocols and Ethernet frame communication using Cisco Packet Tracer simulations."
)

# Test 2: Ultra Mega Solar Energy Project PDF
test_file(
    "Gujarat_Solar_Park_Report_2026.pdf",
    "Gujarat 500MW Ultra Mega Solar Power Park Expansion Report\nPrepared by: Ministry of New and Renewable Energy\nOriginal cost: 2500 Crore. Revised cost: 2950 Crore. Expenditure: 1800 Crore. Physical progress: 40%.\nThe objective is to deploy 500MW solar grid capacity across Kutch district by Q4 2026."
)

# Test 3: Financial Revenue & Taxation Audit PDF
test_file(
    "GST_Revenue_Audit_Q2_2026.pdf",
    "Quarterly GST Revenue Audit Report Q2 2026\nPrepared by: Central Board of Indirect Taxes and Customs\nThe study analyzes quarterly revenue collections, tax compliance velocity, and audit reconciliation across national portfolios."
)
