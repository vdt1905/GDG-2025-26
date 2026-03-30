from predict_d import predict_d
from predict_c import predict_c
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
from io import BytesIO
from pydantic import BaseModel
import torch
import gc
# Limit PyTorch to 1 thread to avoid background RAM explosion
torch.set_num_threads(1)
gc.collect()

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
import json

try:
    if "FIREBASE_SERVICE_ACCOUNT_JSON" in os.environ:
        json_str = os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"].strip()
        # Handle cases where the string might be wrapped in quotes by some environments
        if json_str.startswith('"') and json_str.endswith('"'):
            json_str = json_str[1:-1].replace('\\"', '"')
        cred_dict = json.loads(json_str)
        cred = credentials.Certificate(cred_dict)
    else:
        cred_path = os.path.join("..", "backend", "serviceAccountKey.json")
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
        # Load image
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(image_url, headers=headers, timeout=10)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content)).convert("RGB")

        # Save image temporarily
        temp_path = f"temp_{obj_id}.png"
        image.save(temp_path)

        # Run CPU-bound PyTorch models in a separate thread to avoid blocking FastAPI
        import asyncio
        loop = asyncio.get_event_loop()
        
        # Parallel execution of model predictions
        res_c, res_d = await asyncio.gather(
            loop.run_in_executor(None, predict_c, image),
            loop.run_in_executor(None, predict_d, image)
        )

        result_pred = res_c if res_c["confidence"] > res_d["confidence"] else res_d
        minor_result = res_d if res_c["confidence"] > res_d["confidence"] else res_c

        # Create session service for agents
        session_service = InMemorySessionService()
        user_id = "default_user"
        session_id = f"session_{obj_id}"
        await session_service.create_session(app_name="shrushrutai_app", user_id=user_id, session_id=session_id)

        # Optimization: Use gemini-1.5-flash (more stable) or gemini-2.0-flash-exp
        # gemini-2.5-flash DOES NOT EXIST and will cause 502 errors.
        MODEL_NAME = "gemini-1.5-flash" 

        # Agent 1: Verify Medical Agent
        verify_med_agent = Agent(
            name="Medical_Imaging_Expert",
            model=MODEL_NAME,
            instruction="Analyze skin image. Determine if healthy/unhealthy. Format: <classification>,<confidence>,<skin type>,<remarks>",
        )

        verify_content = await get_agent_response(
            verify_med_agent,
            f"Please analyze this medical image at path: {temp_path}",
            session_service, user_id, session_id
        )

        # Agent 2: Unhealthy Skin Agent (Depends on verify_content)
        unhealthy_skin_agent = Agent(
            name="Medical_Imaging_Analysis_Expert",
            model=MODEL_NAME,
            instruction=f"Diagnose based on model output: {result_pred}. Context: {verify_content}. assess likelihood of skin cancer if applicable. Format: <disease>,<confidence>,<remarks>",
        )

        pred_content = await get_agent_response(
            unhealthy_skin_agent,
            f"Please analyze this medical image at path: {temp_path}",
            session_service, user_id, session_id
        )

        # Agent 3 & 4 can run in PARALLEL to save time and prevent 502 timeouts
        report_agent = Agent(
            name="Report_Generator",
            model=MODEL_NAME,
            instruction=f"Generate detailed markdown report. Primary: {result_pred['class']}, Secondary: {minor_result['class']}. Include lifestyle advice.",
            tools=[google_search]
        )

        jarvis_agent = Agent(
            name="Jarvis_Assistant",
            model=MODEL_NAME,
            instruction=f"Provide clinical guidance for {result_pred['class']}. Guidance should be for doctors. Summarize in 4-5 points.",
            tools=[google_search]
        )

        # RUN SEARCH AGENTS IN PARALLEL
        report_task = get_agent_response(report_agent, f"Generate report for image: {temp_path}", session_service, user_id, session_id)
        jarvis_task = get_agent_response(jarvis_agent, "Give instructions to doctor based on diagnostics", session_service, user_id, session_id)
        
        report_content, jarvis_content = await asyncio.gather(report_task, jarvis_task)

        # Clean up
        if os.path.exists(temp_path): os.remove(temp_path)

        # Save to Firestore
        final_report_data = {
            "patientId": obj_id,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "imageUrl": image_url,
            "verify": verify_content,
            "prediction": pred_content,
            "report": report_content,
            "jarvis": jarvis_content
        }
        db.collection("patients").document(obj_id).collection("reports").add(final_report_data)

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
    except Exception as e:
        print(f"Firestore context error: {e}")
        mongo_pred = ""

    try:
        agent_name = "Skin_Disease_Research_Deep" if q.deep_search else "Skin_Disease_Research_Web"

        agent = Agent(
            name=agent_name,
            model="gemini-1.5-flash",
            instruction=f"Analyze the given question based on: {mongo_pred}. Concise and professional answer.",
            description="Expert dermatology assistant",
            tools=[google_search]
        )

        # Create session service
        session_service = InMemorySessionService()
        user_id = "default_user"
        session_id = "ans_session"
        
        await session_service.create_session(app_name="shrushrutai_app", user_id=user_id, session_id=session_id)

        response_text = await get_agent_response(agent, q.query, session_service, user_id, session_id)
        return {"response": response_text}
    except Exception as e:
        print(f"Chatbot Agent Error: {e}")
        # Return 500 with details so frontend can see what happened
        raise HTTPException(status_code=500, detail=f"AI Agent Error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 6700))
    uvicorn.run('main2:app', host="0.0.0.0", port=port, reload=True)