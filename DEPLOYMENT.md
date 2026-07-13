# ShushrutAI — Deployment Guide

Three services, deployed independently:

| Service   | Folder              | Platform | Type              |
| --------- | ------------------- | -------- | ----------------- |
| Frontend  | `GDG-2025-26/frontend` | Vercel   | Static (Vite)     |
| Backend   | `GDG-2025-26/backend`  | Vercel   | Serverless (Node) |
| AI server | `GDG-2025-26/PYTHON`   | Render   | Web service (FastAPI) |

> Deploy order: **Render (Python) → Vercel Backend → Vercel Frontend**, because
> the frontend needs the other two URLs, and the backend's CORS needs the
> frontend URL. You'll do one CORS update at the end.

---

## Prerequisites (collect these once)

1. **Firebase service account JSON** — Firebase Console → Project Settings →
   Service Accounts → *Generate new private key*. Minify it to a single line
   (e.g. `python -c "import json;print(json.dumps(json.load(open('key.json'))))"`).
   Used by both the backend (`FIREBASE_SERVICE_ACCOUNT`) and Python
   (`FIREBASE_SERVICE_ACCOUNT_JSON`).
2. **Firebase Web config** — Project Settings → Your apps → Web app. The six
   `apiKey / authDomain / projectId / storageBucket / messagingSenderId / appId`
   values → become the frontend `VITE_FIREBASE_*` vars.
3. **Cloudinary** — cloud name, API key, API secret from the Cloudinary console.
4. **Google Gemini API key** — https://aistudio.google.com/apikey

---

## 1. Render — Python AI server (`GDG-2025-26/PYTHON`)

Runs `main.py` (FastAPI). Two PyTorch models load at startup.

**Option A — Blueprint (uses `render.yaml`):** New → Blueprint → pick the repo.
Render reads `GDG-2025-26/PYTHON/render.yaml`. Then fill the secret env vars.

**Option B — Manual:** New → Web Service → connect repo, then:

- **Root Directory:** `GDG-2025-26/PYTHON`  ← *required* (relative model paths)
- **Runtime:** Python 3.11
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/`

**Environment variables:**

| Key                             | Value                                      |
| ------------------------------- | ------------------------------------------ |
| `GOOGLE_API_KEY`                | your Gemini key                            |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | the minified service-account JSON (1 line) |
| `PYTHON_VERSION`                | `3.11.9`                                    |

⚠️ **Memory:** the free 512 MB instance often OOMs with DenseNet121 + the custom
CNN loaded together. If the service crashes on boot or mid-`/predict`, upgrade to
the **Starter** plan (`render.yaml` already requests `starter`).

⚠️ **Cold starts:** free/idle Render services sleep; the first `/predict` after
idle can take 30–60 s to wake. The frontend already calls Render directly to
avoid Vercel's timeout, so this only shows as a slow first request.

✅ **Verify:** open `https://<app>.onrender.com/` → `{"message":"Welcome to the ShrushrutAI"}`.
Copy this URL — it's your `VITE_PYTHON_URL`.

---

## 2. Vercel — Backend (`GDG-2025-26/backend`)

Uses the existing `backend/vercel.json` (routes everything to `server.js`).

- New Project → import repo → **Root Directory:** `GDG-2025-26/backend`
- Framework preset: **Other** (the `vercel.json` handles the build)

**Environment variables:**

| Key                        | Value                                             |
| -------------------------- | ------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT` | minified service-account JSON (1 line)            |
| `CLOUDINARY_CLOUD_NAME`    | your cloud name                                   |
| `CLOUDINARY_API_KEY`       | your key                                          |
| `CLOUDINARY_API_SECRET`    | your secret                                       |
| `CORS_ORIGIN`              | *(set after step 3)* your frontend URL(s)         |
| `PYTHON_URL`               | *(optional)* the Render URL                       |

✅ **Verify:** open `https://<backend>.vercel.app/` → `Shushrut API is running 🚀`.
Your `VITE_BACKEND_URL` is this URL **+ `/api`**.

---

## 3. Vercel — Frontend (`GDG-2025-26/frontend`)

- New Project → import repo → **Root Directory:** `GDG-2025-26/frontend`
- Framework preset: **Vite** (Build `npm run build`, Output `dist`)

**Environment variables** (see `frontend/.env.example`):

| Key                                | Value                                    |
| ---------------------------------- | ---------------------------------------- |
| `VITE_BACKEND_URL`                 | `https://<backend>.vercel.app/api`       |
| `VITE_PYTHON_URL`                  | `https://<app>.onrender.com`             |
| `VITE_FIREBASE_API_KEY`            | Firebase web apiKey                      |
| `VITE_FIREBASE_AUTH_DOMAIN`        | `your-project.firebaseapp.com`           |
| `VITE_FIREBASE_PROJECT_ID`         | project id                               |
| `VITE_FIREBASE_STORAGE_BUCKET`     | `your-project.appspot.com`               |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| sender id                                |
| `VITE_FIREBASE_APP_ID`             | app id                                   |

Deploy and note the resulting domain, e.g. `https://shushrutai.vercel.app`.

---

## 4. Wire CORS + Firebase Auth (final step)

1. **Backend CORS:** set `CORS_ORIGIN` on the Vercel **backend** project to the
   exact frontend domain from step 3 (comma-separate multiple, no trailing slash),
   then redeploy the backend. Mismatch here = every API call fails in the browser.
2. **Firebase Auth domains:** Firebase Console → Authentication → Settings →
   Authorized domains → add your Vercel frontend domain (needed for Google login).

---

## Smoke test checklist

- [ ] `GET /` on Render returns the welcome JSON.
- [ ] `GET /` on the backend returns "Shushrut API is running 🚀".
- [ ] Frontend loads, sign-up / Google login works (Firebase domain authorized).
- [ ] Register a patient with a photo → appears in the list (backend + Cloudinary + Firestore OK).
- [ ] Open a patient → **Analyze** an image → report renders (Render `/predict` OK).
- [ ] Chatbot replies (Render `/ans` OK).

## Common failure modes

| Symptom | Likely cause |
| --- | --- |
| Browser CORS error on `/api/*` | `CORS_ORIGIN` doesn't match the frontend domain exactly |
| Backend 500 on boot | `FIREBASE_SERVICE_ACCOUNT` missing/not valid single-line JSON |
| Backend `Invalid PEM formatted message` | private_key newlines mangled — handled now (auto `\n` repair), but paste the JSON as ONE line |
| Vercel build error: `functions` cannot be used with `builds` | fixed in `backend/vercel.json` (removed the `functions` block) |
| Google login popup fails | Frontend domain not in Firebase *Authorized domains* |
| Render build fails on torch | keep the `--extra-index-url .../whl/cpu` line in `requirements.txt` |
| Render crashes during `/predict` | out of memory → upgrade to Starter plan |
| Analyze works locally, 404 image on Render | Cloudinary URL unreachable / image not uploaded yet |
