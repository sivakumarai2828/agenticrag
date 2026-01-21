print("Script started")
import os
import requests
from dotenv import load_dotenv
from pathlib import Path

print("Imports done")
env_path = Path('/Users/sivakumarkondapalle/Downloads/Projects/agentic_rag_client/agenticrag/.env')
print(f"Checking {env_path}")
if env_path.exists():
    print("File exists, loading...")
    load_dotenv(dotenv_path=env_path)
else:
    print("File DOES NOT exist")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
print(f"Key found: {RESEND_API_KEY is not None}")

TO_EMAIL = "sivakumarai2828@gmail.com"

payload = {
    "from": "onboarding@resend.dev",
    "to": [TO_EMAIL],
    "subject": "Test from Agent",
    "html": "<h1>Test Successful</h1>"
}

print("Sending request...")
try:
    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json"
        },
        json=payload,
        timeout=10
    )
    print(f"Status color: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
