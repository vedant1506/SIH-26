import urllib.request
import json

url = "http://127.0.0.1:8000/api/v1/parse-document"
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body_bytes = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="Gujarat_Solar_Power.pdf"\r\n'
    f"Content-Type: application/pdf\r\n\r\n"
    f"Gujarat 500MW Ultra Mega Solar Power Park Expansion Report\r\n"
    f"Prepared by: Ministry of New and Renewable Energy\r\n"
    f"Original cost: 2500 Crore. Revised cost: 2950 Crore. Expenditure: 1800 Crore. Physical progress: 40%.\r\n"
    f"--{boundary}--\r\n"
).encode("utf-8")

req = urllib.request.Request(url, data=body_bytes, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})

try:
    resp = urllib.request.urlopen(req)
    content = resp.read().decode("utf-8")
    print("SUCCESSFUL RESPONSE:")
    print(content)
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.reason)
    print(e.read().decode("utf-8"))
except Exception as ex:
    print("OTHER ERROR:", ex)
