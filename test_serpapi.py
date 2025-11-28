#!/usr/bin/env python3
"""Test SerpApi integration directly"""

import os
from dotenv import load_dotenv
from pathlib import Path
from serpapi import GoogleSearch
import json

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

SERPAPI_KEY = os.environ.get("SERPAPI_API_KEY")

print(f"API Key loaded: {SERPAPI_KEY[:10]}..." if SERPAPI_KEY else "No API key found")

# Build query parameters
params = {
    "engine": "google",
    "q": "Python tutorials",
    "api_key": SERPAPI_KEY,
    "num": 3
}

print(f"\nSearching for: {params['q']}")
print(f"Number of results requested: {params['num']}\n")

try:
    search = GoogleSearch(params)
    results = search.get_dict()
    
    print("Full SerpApi Response:")
    print(json.dumps(results, indent=2))
    
    print("\n" + "="*50)
    print("Organic Results:")
    print("="*50)
    
    organic_results = results.get("organic_results", [])
    print(f"Found {len(organic_results)} organic results\n")
    
    for i, r in enumerate(organic_results[:3], 1):
        print(f"{i}. {r.get('title')}")
        print(f"   URL: {r.get('link')}")
        print(f"   Snippet: {r.get('snippet')}")
        print(f"   Position: {r.get('position')}")
        print()
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
