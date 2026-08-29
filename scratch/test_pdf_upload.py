import urllib.request
import json
import sys

url = "http://127.0.0.1:8000/api/v1/parse-document"
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"

# Create a sample PDF text payload matching Cisco Networking Academy report
pdf_text = """
Report on Cisco Networking Academy – Networking Basics (PBL-1)
Computer Networks (BE04000171) Semester-5
Bachelors of Engineering (Computer Engineering)
Prepared By: Pathan Shahad (241370107053)
Gujarat Technological University School of Engineering and Technology
1. Introduction
A computer network is a group of interconnected devices...
"""

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="Report_on_Cisco_Networking_Academy_Networking_Basics.pdf"\r\n'
    f"Content-Type: application/pdf\r\n\r\n"
    f"{pdf_text}\r\n"
    f"\r\n--{boundary}--\r\n"
).encode("utf-8")

req = urllib.request.Request(url, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode("utf-8"))
        print("PDF UPLOAD TEST SUCCESS:")
        print("File:", data.get("file_name"))
        print("Project Name:", data.get("project_name"))
        print("Ministry:", data.get("ministry"))
        print("Risk Tier:", data.get("risk_tier"))
        briefing = data.get("ai_risk_narrative", "").encode("ascii", "ignore").decode("ascii")
        print("Executive Briefing:\n", briefing)
except Exception as e:
    print("Error:", e)
