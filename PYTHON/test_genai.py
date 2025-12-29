import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

print(f"Testing API Key: {GOOGLE_API_KEY[:5]}...{GOOGLE_API_KEY[-5:]}")

# Try the model we set in main.py
model_name = 'gemini-flash-latest' 
print(f"Testing model: {model_name}")

try:
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Hello, can you hear me?")
    print("Success! Response:")
    print(response.text)
except Exception as e:
    print(f"Error testing {model_name}: {e}")

# If that fails, try a fallback
if 'Error' in locals().get('response', ''): # This check is loose, better to rely on try-except flow
    pass # Already printed error

print("\nTrying list_models again to be sure:")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")
