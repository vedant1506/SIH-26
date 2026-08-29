import urllib.request
import json

url = "http://127.0.0.1:8000/api/v1/parse-document"
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"

def test_pdf(filename, text):
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
        f"{text}\r\n"
        f"\r\n--{boundary}--\r\n"
    ).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        res = urllib.request.urlopen(req)
        resp_data = res.read().decode("utf-8")
        data = json.loads(resp_data)
        print(f"=== DYNAMIC AI INTELLIGENCE FOR: {filename} ===")
        print("Project Title:", data.get("project_name"))
        print("Ministry / Domain:", data.get("ministry"))
        print("Sector:", data.get("sector"))
        print("Risk Tier:", data.get("risk_tier"))
        briefing = data.get("ai_risk_narrative", "").encode("ascii", "ignore").decode("ascii")
        print("Dynamic AI Briefing Output:\n", briefing)
        print("=" * 60 + "\n")
    except Exception as e:
        print("Error:", e)

# Test 1: Cisco Networking Academic PDF
test_pdf(
    "Cisco_Networking_Basics.pdf",
    "Report on Cisco Networking Academy - Networking Basics (PBL-1)\r\nPrepared By: Pathan Shahad (241370107053)\r\nGujarat Technological University\r\nThe aim of this report is to analyze computer network protocols and Ethernet frame communication using Cisco Packet Tracer simulations."
)

# Test 2: Renewable Solar Energy Project PDF
test_pdf(
    "Gujarat_Solar_Park_Report_2026.pdf",
    "Gujarat 500MW Ultra Mega Solar Power Park Expansion\r\nPrepared by: Ministry of New and Renewable Energy\r\nOriginal cost: 2500 Crore. Revised cost: 2950 Crore. Expenditure: 1800 Crore. Physical progress: 40%.\r\nThe objective is to deploy 500MW solar grid capacity across Kutch district by Q4 2026."
)

# Test 3: Financial Revenue & Taxation Audit PDF
test_pdf(
    "GST_Revenue_Audit_Q2_2026.pdf",
    "Quarterly GST Revenue Audit Report Q2 2026\r\nPrepared by: Central Board of Indirect Taxes and Customs\r\nThe study analyzes quarterly revenue collections, tax compliance velocity, and audit reconciliation across national portfolios."
)
