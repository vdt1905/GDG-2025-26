import os
import requests
from io import BytesIO
from PIL import Image
import torch
import google.generativeai as genai
from dotenv import load_dotenv

# Import the local modules
# Assuming predict_c and predict_d are in the same folder
from predict_c import predict_c
from predict_d import predict_d

# Load env for API key
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

def debug_pipeline():
    print("Starting debug pipeline...")
    
    # 1. Image Retrieval (Mocked)
    image_url = "https://res.cloudinary.com/dqi7b98xx/image/upload/v1766831511/shushrut_patients_gallery/e0fjesusfhqko1wr3hns.png"
    print(f"Fetching image from: {image_url}")
    
    try:
        response = requests.get(image_url)
        img = Image.open(BytesIO(response.content)).convert("RGB") # Added .convert("RGB")
        print("Image loaded successfully (Converted to RGB).")
    except Exception as e:
        print(f"FAILED to load image: {e}")
        return

    # 2. Predict C
    print("\nRunning predict_c...")
    try:
        result_c = predict_c(img)
        print(f"predict_c result: {result_c}")
    except Exception as e:
        print(f"FAILED predict_c: {e}")
        import traceback
        traceback.print_exc()
        return

    # 3. Predict D
    print("\nRunning predict_d...")
    try:
        result_d = predict_d(img)
        print(f"predict_d result: {result_d}")
    except Exception as e:
        print(f"FAILED predict_d: {e}")
        import traceback
        traceback.print_exc()
        return

    # 4. Gemini Verification
    print("\nRunning Gemini Verification...")
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Mocking the variables from main.py logic
        result_pred = result_c
        minor_result = result_d
        
        verify_prompt = f"""Analyze the given skin image as a very good and expert dermatologist to determine if the skin is healthy or unhealthy.
        Image content is provided.
        Model predictions: {result_pred}, {minor_result}
        Return only 'Healthy' or 'Unhealthy'."""
        
        # Note: In main.py we pass [verify_prompt, img]
        # We need to make sure 'img' is compatible (PIL Image is supported by genai)
        response = model.generate_content([verify_prompt, img])
        print(f"Verification response object: {response}")
        print(f"Verification response text: {response.text}")
        
    except Exception as e:
        print(f"FAILED Gemini Verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_pipeline()
