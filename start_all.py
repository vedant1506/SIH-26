"""
PRISM Platform Launcher — SIH26103
==================================
Launches both the FastAPI Backend (Port 8000) and Next.js Frontend (Port 3000)
with integrated ML Engine (ml/SIH26103_ML_FINAL/) in a single script.

Usage:
    python start_all.py
"""

import os
import sys
import time
import subprocess
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

NODE_DIR = r"C:\Program Files\nodejs"
if NODE_DIR not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{NODE_DIR};{os.environ.get('PATH', '')}"


def main():
    print("=" * 70)
    print("  PRISM Infrastructure Risk Intelligence Platform — SIH26103")
    print("=" * 70)

    # 1. Seed Database if needed
    print("\n[0/2] Initializing database tables and default seed data...")
    try:
        sys.path.insert(0, BACKEND_DIR)
        from app.seed import seed_real_mospi_dataset
        seed_real_mospi_dataset(force=False)
    except Exception as se:
        print(f"Database seed note: {se}")

    # 2. Start Backend Server
    print("\n[1/2] Starting FastAPI Backend Server (Port 8000)...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8000", "--reload"]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=BACKEND_DIR,
        env=os.environ.copy()
    )


    time.sleep(2)

    # 2. Start Frontend Server
    print("[2/2] Starting Next.js Frontend Dev Server (Port 3000)...")
    npm_cmd = os.path.join(NODE_DIR, "npm.cmd") if os.path.exists(os.path.join(NODE_DIR, "npm.cmd")) else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        cwd=FRONTEND_DIR,
        env=os.environ.copy()
    )

    print("\n" + "=" * 70)
    print("  SUCCESS! Both services are now running:")
    print("  - Frontend UI:  http://localhost:3000")
    print("  - Backend API:  http://127.0.0.1:8000")
    print("  - API Docs:     http://127.0.0.1:8000/docs")
    print("=" * 70)
    print("\nPress Ctrl+C to terminate both servers.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down PRISM platform servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)


if __name__ == "__main__":
    main()
