<div align="center">
  <img src="assets/banner.png" alt="Shushrut AI Banner" width="100%" />

  # Shushrut AI
  <h3>Advanced Dermatological Intelligence</h3>

  <p>
    <a href="https://github.com/vdt1905/GDG-2025-26/stargazers"><img src="https://img.shields.io/github/stars/vdt1905/GDG-2025-26?style=for-the-badge&color=blue" alt="Stars"></a>
    <a href="https://github.com/vdt1905/GDG-2025-26/issues"><img src="https://img.shields.io/github/issues/vdt1905/GDG-2025-26?style=for-the-badge&color=orange" alt="Issues"></a>
    <a href="https://github.com/vdt1905/GDG-2025-26/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License"></a>
    <img src="https://img.shields.io/badge/Built_With-React_|_Node_|_Python-purple?style=for-the-badge" alt="Stack">
  </p>

  <p>
    <b>Revolutionizing Dermatology with Multi-Agent AI</b><br>
    <i>Detect. Diagnose. Treat. Voice-Assisted.</i>
  </p>
</div>

---

## 🚀 About The Project

**Shushrut AI** is a state-of-the-art dermatological platform designed to empower doctors and patients with instant, AI-driven skin analysis. Named after *Sushruta*, the father of plastic surgery, this tool blends ancient wisdom with cutting-edge **Generative AI**.

It goes beyond simple classification. Shushrut AI employs a **Multi-Agent System** where specialized AI agents collaborate to verify symptoms, cross-reference diseases, generate comprehensive medical reports, and even provide voice-guided consultation via "Jarvis".

### 🌟 Key Features

*   **🔍 Precision Diagnostics:** Hybrid analysis using Deep Learning (CNNs/ViTs) and Gemini 1.5 Pro/Flash.
*   **🤖 Multi-Agent Architecture:**
    *   **Verify Agent:** Filters non-skin images and assesses general health.
    *   **Pathology Agent:** Detailed analysis of unhealthy skin conditions.
    *   **Report Agent:** Generates professional-grade medical reports (Markdown/PDF).
    *   **Jarvis Agent:** Voice-interactive assistant for doctors to discuss cases.
*   **🗣️ Voice Assistant:** "Jarvis" provides real-time, evidence-based answers to medical queries.
*   **📄 PDF Report Generation:** Automatic, downloadable PDF reports for patient records.
*   **👥 Team Dashboard:** Collaborative environment for medical teams.

---

## 🛠️ Tech Stack

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) ![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white) ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black) ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)

### AI & Data Science
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) ![Gemini AI](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white) ![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)

---

## 🧠 The Multi-Agent Workflow

1.  **Input:** Patient uploads a skin image.
2.  **Visual Sentry (Models):** Custom trained CNN/ViT models provide initial classification confidence.
3.  **Agent 1 (Verify):** Confirms image validity and assesses general skin health.
4.  **Agent 2 (Diagnosis):** Deep dives into potential pathologies if unhealthy.
5.  **Agent 3 (Report):** Synthesizes all data into a structured clinical report.
6.  **Agent 4 (Jarvis):** Reads the report and stands by for voice Q&A.

---

## ⚡ Getting Started

Follow these steps to set up the project locally.

### Prerequisites
*   Node.js (v16+)
*   Python (v3.9+)
*   Firebase Project (Service Account Key)
*   Google Gemini API Key

### Installation

#### 1. Clone the Repository
```sh
git clone https://github.com/vdt1905/GDG-2025-26.git
cd GDG-2025-26
```

#### 2. Backend Setup
```sh
cd backend
npm install
# Add your serviceAccountKey.json in the backend root
# Create .env file with Cloudinary & Firebase credentials
npm run dev
```

#### 3. Frontend Setup
```sh
cd frontend
npm install
# Create .env with VITE_API_BASE_URL=http://localhost:5000
npm run dev
```

#### 4. AI Service Setup
```sh
cd PYTHON
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Create .env with GOOGLE_API_KEY
python main.py
```

---

## 👥 Contributors

**Team DOMinators**

*   Nisarg
*   Vansh
*   Krish
*   Heli
*   Rahul


---

<div align="center">
  <small>Made with ❤️ by Team DOMinators</small>
</div>
