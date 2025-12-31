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
import time

# Google ADK imports
from google.adk.agents import Agent
from google.adk.tools import google_search
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

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
# Set environment variables for ADK
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "FALSE"


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


# Helper function to get agent response using Runner
async def get_agent_response(agent: Agent, prompt: str, session_service: InMemorySessionService, user_id: str, session_id: str) -> str:
    """Execute agent using Runner and collect full response text"""
    runner = Runner(
        agent=agent,
        app_name="shrushrutai_app", 
        session_service=session_service
    )
    
    # Create message content
    content = types.Content(role='user', parts=[types.Part(text=prompt)])
    
    full_response = ""
    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=content):
        if event.is_final_response():
            if event.content and event.content.parts:
                full_response = event.content.parts[0].text
            break
    
    return full_response


@app.get("/")
def read_root():
    return {"message": "Welcome to the ShrushrutAI (ADK Version)"}


@app.post("/predict")
async def classify_image(req: Id):
    obj_id = req.obj_id

    # Priority 1: Use specific image URL
    if req.imageUrl and req.imageUrl.strip():
        image_url = req.imageUrl
        print(f"Using provided image URL: {image_url}")
    else:
        # Priority 2: Fallback to latest
        try:
            doc_ref = db.collection("patients").document(obj_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                skin_images = data.get("skinImages", [])
                
                if skin_images and len(skin_images) > 0:
                    image_url = skin_images[-1]
                    print(f"Found image URL: {image_url}")
                else:
                    raise HTTPException(status_code=404, detail="No images found in patient record")
            else:
                raise HTTPException(status_code=404, detail="Patient document not found")
        except Exception as e:
            print(f"Error fetching from Firestore: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    if not image_url:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        # Enhanced image fetching with headers and retry
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        max_retries = 3
        response = None
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

        # Create session service for agents
        session_service = InMemorySessionService()
        user_id = "default_user"
        session_id = f"session_{obj_id}"
        
        # Create session
        await session_service.create_session(
            app_name="shrushrutai_app",
            user_id=user_id,
            session_id=session_id
        )

        # Agent 1: Verify Medical Agent
        verify_med_agent = Agent(
            name="Medical_Imaging_Expert",
            model="gemini-2.5-flash-lite",
            instruction="""Analyze the given skin image as a very good and expert dermatologist to determine if the skin is healthy or unhealthy.
- Provide a realistic confidence percentage based on visual clarity and distinct presentation of symptoms. Do NOT force it to be 100%.
- If healthy, classify it as 'Healthy' and provide the confidence level in percentage.
- If unhealthy, classify it as 'Unhealthy' and provide the confidence level in percentage.
- Additionally, determine the skin type as one of the following: 'Dry', 'Oily', or 'Normal'.
- give answer in strictly <classification>,<confidence score in percent>,<skin type>,<remarks : give some remarks that is in one to two lines> format only.""",
            description="Expert dermatologist for skin analysis",
            # tools=[google_search] # Removed search for verify agent as it's image based
        )

        verify_content = await get_agent_response(
            verify_med_agent,
            f"Please analyze this medical image at path: {temp_path}",
            session_service,
            user_id,
            session_id
        )

        # Agent 2: Unhealthy Skin Agent
        unhealthy_skin_agent = Agent(
            name="Medical_Imaging_Analysis_Expert",
            model="gemini-2.5-flash",
            instruction=f"""Analyze the given skin image as an expert dermatologist. If the skin appears healthy, classify the prediction as 'Healthy' and provide the confidence level. If unhealthy, use the model output to determine the disease. The prediction by deep learning model is {result_pred}. If classified as one of the following: 'Actinic Keratosis', 'Atopic Dermatitis', 'Benign Keratosis', 'Dermatofibroma', 'Melanocytic Nevus', 'Melanoma', 'Squamous Cell Carcinoma', 'Tinea Ringworm Candidiasis', or 'Vascular Lesion', assess the likelihood of skin cancer otherwise its a disease. Provide the disease name, confidence level, and remarks. Additionally, include possible symptoms that might be present for further diagnostic evaluation.

Context from previous analysis: {verify_content}

- give answer in strictly <disease>,<confidence score in percent>,<remarks in two to three lines> format only.
- If the skin appears healthy, classify it as 'Healthy' and provide the confidence level in percentage.""",
            description="Diagnoses skin diseases from images",
            # tools=[google_search]
        )

        pred_content = await get_agent_response(
            unhealthy_skin_agent,
            f"Please analyze this medical image at path: {temp_path}",
            session_service,
            user_id,
            session_id
        )

        # Agent 3: Report Agent
        report_agent = Agent(
            name="Medical_Imaging_Analysis_and_report_generator_Expert",
            model="gemini-2.5-flash",
            instruction=f"""
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
        """,
            description="Generates comprehensive medical reports",
            tools=[google_search]
        )

        report_content = await get_agent_response(
            report_agent,
            f"Please analyze this skin image output context and generate a proper report for Dermatologist to understand. Image path: {temp_path}",
            session_service,
            user_id,
            session_id
        )

        # Agent 4: Jarvis Agent
        jarvis_agent = Agent(
            name="Medical_Imaging_Expert",
            model="gemini-2.5-flash",
            instruction=f"""You are an AI-powered Dermatology Voice Assistant, designed to provide expert-level support to dermatologists. Your role is to analyze report {report_content} recommend evidence-based treatments, and guide doctors on the next steps using the latest research and drug discoveries.

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
- give answer in proper markdown format.""",
            description="Provides clinical guidance to dermatologists",
            tools=[google_search]
        )

        jarvis_content = await get_agent_response(
            jarvis_agent,
            "Please analyze this skin based diagnostics report and give instructions to doctor",
            session_service,
            user_id,
            session_id
        )

        # Clean up temp file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

        # Save to Firestore
        try:
            timestamp = firestore.SERVER_TIMESTAMP
            final_report_data = {
                "patientId": obj_id,
                "timestamp": timestamp,
                "imageUrl": image_url,
                "verify": verify_content,
                "prediction": pred_content,
                "report": report_content,
                "jarvis": jarvis_content
            }
            
            # Save to subcollection
            db.collection("patients").document(obj_id).collection("reports").add(final_report_data)
            
            # Update latest context (for chatbot)
            # We can save simpler version or full version
            db.collection("diagnoses").document("latest").set({
                "pred": pred_content,
                "report": report_content,
                "jarvis": jarvis_content
            }, merge=True)

        except Exception as e:
            print(f"Error saving final report to Firestore: {e}")

        # Return format ensuring compatibility with patientController.js
        return {
            "imageUrl": image_url,
            "verify": verify_content,
            "prediction": pred_content,
            "report": report_content,
            "jarvis": jarvis_content
        }

    except requests.exceptions.RequestException as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=400, detail=f"Error fetching image: {str(e)}")
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/ans")
async def get_ans(q: Query):
    try:
        # Fetch detailed context from Firestore
        doc_ref = db.collection("diagnoses").document("latest")
        doc = doc_ref.get()
        mongo_pred = ""
        if doc.exists:
            data = doc.to_dict()
            mongo_pred = (
                f"Diagnosis: {data.get('pred', '')}\n\n"
                f"Detailed Report: {data.get('report', '')}\n\n"
                f"Expert Recommendations (Jarvis): {data.get('jarvis', '')}"
            )
    except Exception:
        mongo_pred = ""

    agent_name = "Skin_Disease_Research_Deep" if q.deep_search else "Skin_Disease_Research_Web"

    agent = Agent(
        name=agent_name,
        model="gemini-2.5-flash",
        instruction=f"""Analyze the given question as an expert dermatologist.
Diagnosis context: {mongo_pred if mongo_pred else 'No context available'}.
- Provide concise answer.
- Include references.""",
        description="Expert dermatology assistant",
        tools=[google_search]
    )

    # Create session service
    session_service = InMemorySessionService()
    user_id = "default_user"
    session_id = "ans_session"
    
    await session_service.create_session(
        app_name="shrushrutai_app",
        user_id=user_id,
        session_id=session_id
    )

    response_text = await get_agent_response(agent, q.query, session_service, user_id, session_id)
    return {"response": response_text}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run('main2:app', host="127.0.0.1", port=6700, reload=True)
