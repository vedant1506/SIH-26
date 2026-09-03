import time
import sys
sys.stdout.reconfigure(encoding='utf-8')

print("Testing qwen loading...")
t0 = time.time()
from app.services import qwen_service
loaded = qwen_service._load_qwen()
t1 = time.time()
print(f"Loaded: {loaded} in {t1-t0:.2f}s")

if loaded:
    t2 = time.time()
    out = qwen_service.generate_json_from_qwen("Provide JSON with keys 'message' and 'status'", max_new_tokens=100)
    t3 = time.time()
    print(f"Generated output in {t3-t2:.2f}s: {out}")
