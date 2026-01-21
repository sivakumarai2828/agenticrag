import os
import requests
from dotenv import load_dotenv
from pathlib import Path

env_path = Path('/Users/sivakumarkondapalle/Downloads/Projects/agentic_rag_client/agenticrag/.env')
load_dotenv(dotenv_path=env_path)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
TO_EMAIL = "sivakumar.kk@gmail.com"

payload = {
    "from": "onboarding@resend.dev",
    "to": [TO_EMAIL],
    "subject": "Test for Owner",
    "html": "<h1>Test for Owner Successful</h1>"
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
