import asyncio
from app.core.config import get_settings
from supabase import create_client

settings = get_settings()
supabase = create_client(settings.supabase_url, settings.supabase_anon_key)

try:
    print("Logging in...")
    res = supabase.auth.sign_in_with_password({"email": "vedantchauhan002@gmail.com", "password": "Vedant@15060"})
    token = res.session.access_token
    print(f"Token: {token[:20]}...")
    
    # Create a fresh client just like FastAPI does
    print("Creating fresh client...")
    fresh_client = create_client(settings.supabase_url, settings.supabase_anon_key)
    
    print("Calling get_user...")
    user_res = fresh_client.auth.get_user(token)
    print("Success! User ID:", user_res.user.id)
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")
