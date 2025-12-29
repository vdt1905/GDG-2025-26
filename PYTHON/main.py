from predict_d import predict_d
from predict_c import predict_c
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
from io import BytesIO
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Optional

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

import google.generativeai as genai

load_dotenv()

# Firebase Initialization
cred_path = os.path.join("..", "backend", "serviceAccountKey.json")
try:
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin Initialized")
except Exception as e:
    print(f"Error initializing Firebase: {e}")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

# Aggressive retry implementation for API calls
import time
import random

# List of models to try in order of preference (Fastest/Cost-effective -> Most Powerful -> Generic Fallbacks)
FALLBACK_MODELS = [
    # "gemini-2.0-flash-lite-preview-02-05", 
    # "gemini-2.0-flash",                     
    # "gemini-2.0-flash-lite",
    # "gemini-2.0-flash-exp",
    # "gemini-2.5-flash",         
    "gemini-2.5-flash-lite",    
    # "gemini-3-flash-preview",   
    # "gemini-flash-latest",
    # "gemini-pro-latest"
]

def generate_with_retry(prompt, generation_config, safety_settings, retries=3, delay=5):
    """
    Attempts to generate content using a list of fallback models.
    If a model fails with a quota error (429) or not found (404), it moves to the next model.
    """
    last_exception = None
    
    for model_name in FALLBACK_MODELS:
        print(f"Trying model: {model_name}...")
        try:
            # Instantiate model
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            # Attempt generation with internal retries for transient errors on the SAME model
            for attempt in range(retries):
                try:
                    return model.generate_content(prompt)
                except Exception as e:
                    error_str = str(e)
                    # If it's a hard error like 404 (Not Found) or 429 (Quota), break inner loop to switch model
                    if "404" in error_str or "429" in error_str or "Quota exceeded" in error_str or "ResourceExhausted" in error_str:
                         print(f"Model {model_name} failed with Quota/Found error: {e}")
                         raise e # Re-raise to trigger model switch
                    
                    # For other errors (500, etc), wait and retry same model
                    if attempt < retries - 1:
                        wait_time = delay * (2 ** attempt) + random.uniform(0, 5)
                        print(f"Transient Error ({e}) on {model_name}. Retrying in {wait_time:.1f}s...")
                        time.sleep(wait_time)
                    else:
                        raise e # Failed all retries for this model
            
        except Exception as e:
            last_exception = e
            print(f"Switching from {model_name} due to error...")
            continue # Try next model in list
            
    # If we exhaust all models
    print(f"All models failed. Last error: {last_exception}")
    raise last_exception

class Id(BaseModel):
    obj_id: str
    imageUrl: Optional[str] = None

class Query(BaseModel):
    query: str
    deep_search: bool = False

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the ShrushrutAI"}

@app.post("/predict")
async def classify_image(req: Id):
    obj_id = req.obj_id

    # Priority 1: Use specific image URL
    if req.imageUrl and req.imageUrl.strip():
        image_url = req.imageUrl
        print(f"Using provided image URL: {image_url}")
    else:
        # Priority 2: Fallback to latest
        def get_latest_skin_image(obj_id: str):
            try:
                # Fetch patient document from Firestore
                doc_ref = db.collection("patients").document(obj_id)
                doc = doc_ref.get()
                
                if doc.exists:
                    data = doc.to_dict()
                    skin_images = data.get("skinImages", [])
                    
                    if skin_images and len(skin_images) > 0:
                        image_url = skin_images[-1] # Get the last added image
                        print(f"Found image URL: {image_url}")
                        return image_url
                    else:
                        print("No images found in patient record")
                        return None
                else:
                    print("Patient document not found")
                    return None
            except Exception as e:
                print(f"Error fetching from Firestore: {e}")
                return None

        image_url = get_latest_skin_image(obj_id)
    
    if not image_url:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        # Enhanced image fetching with headers and retry
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.get(image_url, headers=headers, timeout=10)
                response.raise_for_status()
                break # Success
            except Exception as e:
                if attempt == max_retries - 1:
                    print(f"Failed to fetch image after {max_retries} attempts: {e}")
                    raise HTTPException(status_code=400, detail=f"Error fetching image: {str(e)}")
                print(f"Image fetch failed (attempt {attempt+1}/{max_retries}). Retrying...")
                time.sleep(1)

        image = Image.open(BytesIO(response.content)).convert("RGB")

        # Save image temporarily
        temp_path = "temp_image.png"
        image.save(temp_path)

        # Get predictions from models
        result_c = predict_c(image)
        result_d = predict_d(image)

        if result_c["confidence"] > result_d["confidence"]:
            result_pred = result_c
            minor_result = result_d
        elif result_d["confidence"] > result_c["confidence"]:
            result_pred = result_d
            minor_result = result_c
        else:
            result_pred = result_c
            minor_result = result_d

        generation_config = {
            "temperature": 0.4,
            "top_p": 1,
            "top_k": 32,
            "max_output_tokens": 1024,
        }

        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"
            },
        ]

     
        # Agent 1: Verify Medical Agent
        verify_prompt = """Analyze the given skin image as a very good and expert dermatologist to determine if the skin is healthy or unhealthy.
- Provide a realistic confidence percentage based on visual clarity and distinct presentation of symptoms. Do NOT force it to be 100%.
- If healthy, classify it as 'Healthy' and provide the confidence level in percentage.
- If unhealthy, classify it as 'Unhealthy' and provide the confidence level in percentage.
- Additionally, determine the skin type as one of the following: 'Dry', 'Oily', or 'Normal'.
- give answer in strictly <classification>,<confidence score in percent>,<skin type>,<remarks : give some remarks that is in one to two lines> format only."""
        
        # Open image again for Gemini
        img = Image.open(temp_path)
        
        verify_response = generate_with_retry(
            prompt=[verify_prompt, img],
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        verify_content = verify_response.text

        # Agent 2: Unhealthy Skin Agent
        unhealthy_prompt = f"""Analyze the given skin image as an expert dermatologist. If the skin appears healthy, classify the prediction as 'Healthy' and provide the confidence level. If unhealthy, use the model output to determine the disease. The prediction by deep learning model is {result_pred}. If classified as one of the following: 'Actinic Keratosis', 'Atopic Dermatitis', 'Benign Keratosis', 'Dermatofibroma', 'Melanocytic Nevus', 'Melanoma', 'Squamous Cell Carcinoma', 'Tinea Ringworm Candidiasis', or 'Vascular Lesion', assess the likelihood of skin cancer otherwise its a disease. Provide the disease name, confidence level, and remarks. Additionally, include possible symptoms that might be present for further diagnostic evaluation.

Context from previous analysis: {verify_content}

- give answer in strictly <disease>,<confidence score in percent>,<remarks in two to three lines> format only.
- If the skin appears healthy, classify it as 'Healthy' and provide the confidence level in percentage."""

        pred_response = generate_with_retry(
            prompt=[unhealthy_prompt, img],
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        pred_content = pred_response.text

        # Intermediate save removed to prevent duplicates - we save everything at the end now.


        # Extract filename from URL for report
        image_name = image_url.split('/')[-1] if image_url else "Unknown"

        # Agent 3: Report Agent

        report_prompt = f"""
        Act as a senior consultant dermatologist. Generate a highly detailed and comprehensive medical report for the following case.
        
        **Patient Analysis Context:**
        - Suspected Condition: {result_pred['class']} (Confidence: {result_pred['confidence']:.2f})
        - Secondary Possibility: {minor_result['class']} (Confidence: {minor_result['confidence']:.2f})
        - Initial Assessment: {verify_content}
        
        **Required Report Structure (Use Markdown):**

        ### 1. Detailed Clinical Observations
        - Describe lesion morphology (size, color, texture, borders).
        - Note anatomical location and distribution patterns.
        - Mention any visible signs of inflammation, scaling, or ulceration.

        ### 2. Differential Diagnosis & Reasoning
        - **Primary Diagnosis**: Explain why {result_pred['class']} is the most likely diagnosis based on visual evidence.
        - **Differentials**: List 2-3 other conditions that share similar features but are less likely, and explain why.

        ### 3. Pathophysiology (Brief)
        - Explain the underlying biological mechanism of the primary condition.

        ### 4. Comprehensive Management Plan
        - **Pharmacological**: Suggest specific generic classes of topical/oral medications (e.g., "Topical corticosteroids", "Antifungals").
        - **Lifestyle & Hygiene**: Specific advice on skincare, diet, and triggers.
        - **Home Care**: Actionable steps for the patient.

        ### 5. Prognosis & Follow-up
        - Expected course of the condition.
        - Warning signs that require immediate medical attention.

        **Tone:** Professional, clinical, and empathetic.
        **Format:** strictly markdown, no preamble.
        """

        report_response = generate_with_retry(
            prompt=[report_prompt, img],
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        report_content = report_response.text

        # Agent 4: Jarvis Agent
        jarvis_prompt = f"""You are an AI-powered Dermatology Voice Assistant, designed to provide expert-level support to dermatologists. Your role is to analyze report {report_content} recommend evidence-based treatments, and guide doctors on the next steps using the latest research and drug discoveries.

The most likely condition the patient could have is **{result_pred['class']}** with a confidence of {result_pred['confidence']:.2f}.
Additionally, there is a minor possibility of **{minor_result['class']}** with a confidence of {minor_result['confidence']:.2f}.

**Remarks:**
- **{result_pred['class']}** (Confidence: {result_pred['confidence']:.2f}) is the primary concern and should be prioritized for diagnosis and treatment.
- **{minor_result['class']}** (Confidence: {minor_result['confidence']:.2f}) may be a secondary condition or share similar symptoms. Further medical evaluation is recommended to rule it out.

### 1️⃣ Understand & Analyze the Case
- Listen to the doctor's query about a patient's condition.
- Identify the disease or condition being discussed.
- Analyze symptoms, affected areas, and disease progression based on the given context or medical report.

### 2️⃣ Provide the Latest Treatment Recommendations
- Fetch current treatment guidelines, FDA-approved drugs, and clinical trials using web sources.
- Explain the best available treatment options, including topical, oral, biologic, and advanced therapies.
- Compare traditional treatments with newly discovered therapies (e.g., AI-assisted skin diagnostics, gene therapy, biologics).

### 3️⃣ Generate a Complete Prescription Plan
- Suggest medications, dosages, frequency, and possible side effects.
- Recommend adjunct therapies, such as lifestyle modifications and skincare routines.
- Warn about contraindications or potential drug interactions.

### 4️⃣ Guide the Doctor on the Next Steps
- Recommend further diagnostic tests (e.g., biopsy, dermoscopy, blood tests, genetic markers).
- Suggest patient follow-up intervals and monitoring plans.
- Provide guidelines for managing severe or resistant cases.

### 5️⃣ Provide Reliable Medical Sources & Links
- Fetch research-backed insights from trusted sources such as PubMed, JAMA Dermatology, The Lancet, FDA, and WHO.
- Offer links to the latest studies, treatment guidelines, and clinical trials for validation.

Context: {pred_content}

Instructions should be understandable by Dermatologists not for layman audience and make it like a professional advice to doctor like doctor is giving advice to the other doctor and make complete instruction summarize and in 4 to 5 lines pointwise.
- give answer in proper markdown format."""

        jarvis_response = generate_with_retry(
            prompt=jarvis_prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        jarvis_content = jarvis_response.text

        # Clean up temp file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

        # Update the report with final generated content
        try:
            # Find the latest report we just added (using a query since we didn't save the ref ID, 
            # or better yet, we should have saved the ref. But for now, let's just add a new one or update latest)
            # Actually, let's just do a fire-and-forget update to the latest document we *should* have tracked.
            # To be safe and simple: let's just write EVERYTHING at the end instead of the middle.
            
            final_report_data = {
                "patientId": obj_id,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "imageUrl": image_url,
                "verify": verify_content,
                "prediction": pred_content,
                "report": report_content,
                "jarvis": jarvis_content
            }
            
            # Save to subcollection
            db.collection("patients").document(obj_id).collection("reports").add(final_report_data)
            
            # Update latest context
            db.collection("diagnoses").document("latest").set(final_report_data)

        except Exception as e:
            print(f"Error saving final report to Firestore: {e}")

        return {
            "imageUrl": image_url,
            "verify": verify_content,
            "prediction": pred_content,
            "report": report_content,
            "jarvis": jarvis_content
        }

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Error fetching image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/ans")
async def get_ans(q: Query):
    try:
        # Fetch latest diagnosis context from Firestore
        doc_ref = db.collection("diagnoses").document("latest")
        doc = doc_ref.get()
        if doc.exists:
            mongo_pred = doc.to_dict().get("pred", "")
        else:
            mongo_pred = ""
    except Exception:
        mongo_pred = ""

    generation_config = {
        "temperature": 0.4,
        "top_p": 1,
        "top_k": 32,
        "max_output_tokens": 1024,
    }

    safety_settings = [
        {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_NONE"
        },
        {
            "category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_NONE"
        },
        {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_NONE"
        },
        {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_NONE"
        },
    ]

    ans_prompt = f"""Analyze the given question as an expert dermatologist.
Diagnosis context: {mongo_pred if mongo_pred else 'No context available'}.
Question: {q.query}
- Provide concise answer.
- Include references."""

    # Use global retry function with fallback support
    response = generate_with_retry(
        prompt=ans_prompt,
        generation_config=generation_config,
        safety_settings=safety_settings
    )
    return {"response": response.text}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run('main:app', host="127.0.0.1", port=6700, reload=True)