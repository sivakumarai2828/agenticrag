import os
import requests
from dotenv import load_dotenv
from pathlib import Path

env_path = Path('/Users/sivakumarkondapalle/Downloads/Projects/agentic_rag_client/agenticrag/.env')
load_dotenv(dotenv_path=env_path)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
TO_EMAIL = "sivakumarai2828@gmail.com"

print(f"Testing with NEW API Key: {RESEND_API_KEY[:10]}...")

payload = {
    "from": "onboarding@resend.dev",
    "to": [TO_EMAIL],
    "subject": "New Key Verification",
    "html": "<h1>Ready to Send!</h1><p>This verification email was sent using your new API key.</p>"
}

response = requests.post(
    "https://api.resend.com/emails",
    headers={
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    },
    json=payload
)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
