import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key or api_key == "your_google_gemini_api_key_here":
    print("No valid API Key found in .env")
else:
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    response = requests.get(url)
    if response.status_code == 200:
        models = response.json().get("models", [])
        print("--- Available Models for GenerateContent ---")
        for m in models:
            if "generateContent" in m.get("supportedGenerationMethods", []):
                print(m.get('name'))
    else:
        print(f"Error: {response.status_code}, {response.text}")
