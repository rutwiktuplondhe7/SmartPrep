# SmartPrep : AI-Powered Interview Preparation Platform

SmartPrep is a full-stack **MERN-based interview preparation platform** that helps users prepare for interviews across **any role or domain** using AI-generated questions, answers, and on-demand concept explanations.

Users can create interview preparation sessions by specifying a role, experience level, focus topics, and goals. Based on this input, the system generates structured Q&A and allows users to explore deeper explanations through AI-powered “Learn More” insights — all within a clean, focused interface.

The platform is designed to support **both technical and non-technical roles**, depending entirely on user input, without enforcing any predefined domain constraints.

## 🚀 Features

### 🔐 User Authentication
- Secure user registration and login using JWT-based authentication
- Protected routes for sessions, questions, and AI operations
- Persistent login using token-based auto-authentication

---

### 📁 Interview Preparation Sessions
- Create preparation sessions by specifying:
  - Role (any domain)
  - Experience level
  - Topics to focus on
  - Optional session description or goal
- Each session acts as an isolated preparation workspace
- Sessions are stored in MongoDB and can be revisited anytime

---

### 🤖 AI-Powered Question & Answer Generation
- Generate interview questions dynamically based on:
  - User-defined role
  - Experience level
  - Selected topics
  - Session description
- Each question includes a structured AI-generated answer
- AI responses are enforced to follow strict JSON formats for reliability

---

### ✨ On-Demand Concept Explanations (Learn More)
- Generate deeper explanations for any question using AI
- Focuses on:
  - Core concept understanding
  - Practical clarity
  - Interview-ready explanation style
- Rendered in a side drawer without disrupting the study flow

---

### 📌 Question Management
- Pin or unpin important questions
- Pinned questions automatically appear at the top of the session
- Add notes to individual questions for personal reference

---

### ➕ Load More Questions
- Generate and append additional AI-generated questions to an existing session
- Newly generated questions are stored and treated the same as original ones



---

### 🎤 Mock Interview (voice + video analysis)
- Answer interview questions out loud, recording with your microphone and camera
- Speech is transcribed with Whisper
- A trained audio model scores your **confidence** and **clarity**
- Face tracking (MediaPipe) measures eye contact, smile and head movement on the video; audio and video scores are combined (60% audio, 40% video)
- A summary page shows the results for the whole session
- Needs the ML service (see below). The rest of the app works without it.

---

## 🧱 Architecture

| Part | Folder | Tech | Port |
|---|---|---|---|
| Frontend | `frontend/smartPrep` | React + Vite | 5173 |
| Backend API | `backend` | Node.js, Express, MongoDB (Mongoose) | 8000 |
| ML service | `ml-service` | Python, FastAPI, PyTorch, Whisper, MediaPipe | 8001 |

The frontend talks to the backend, and the backend talks to the ML service and to
[OpenRouter](https://openrouter.ai) (for AI-generated questions and explanations).

---

## 🛠 Run it locally (fresh clone)

Follow the steps in order. Everything below was written for a brand-new machine.

### 1. Install the prerequisites

| Tool | Version | Used for |
|---|---|---|
| [Git](https://git-scm.com/downloads) | any | cloning |
| [Node.js](https://nodejs.org) | 18 or newer (developed on 22) | backend + frontend |
| [Python](https://www.python.org/downloads/) | **3.10** (the tested version) | ML service |
| [ffmpeg](https://ffmpeg.org/download.html) | any recent | converts recorded audio in the ML service |
| MongoDB | local install **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster | database |
| [OpenRouter](https://openrouter.ai/keys) API key | free account | AI questions and explanations |

Install ffmpeg:

```bash
winget install Gyan.FFmpeg      # Windows (then open a NEW terminal)
brew install ffmpeg             # macOS
sudo apt install ffmpeg         # Ubuntu / Debian
```

Check the tools are available (each should print a version):

```bash
git --version
node --version
python --version        # on macOS/Linux use python3
ffmpeg -version
```

### 2. Clone the repository

```bash
git clone https://github.com/rutwiktuplondhe7/SmartPrep.git
cd SmartPrep
```

The clone includes the trained model files (about 110 MB), so nothing else has to be downloaded for the ML models.

### 3. Backend (port 8000)

```bash
cd backend
npm install
```

Create the environment file by copying the template:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env
# macOS / Linux
cp .env.example .env
```

Open `backend/.env` and fill in the values:

| Variable | Required | What to put |
|---|---|---|
| `PORT` | yes | `8000`. The frontend calls port 8000 by default, so keep this value. |
| `MONGO_URI` | yes | Atlas: the connection string from "Connect → Drivers". Local MongoDB: `mongodb://127.0.0.1:27017/smartprep` |
| `JWT_SECRET` | yes | Any long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `OPENROUTER_API_KEY` | yes | Your key from https://openrouter.ai/keys |
| `CLIENT_URL` | no | Only needed if the frontend runs somewhere other than `http://localhost:5173` or `http://localhost:3000` |

Start the backend:

```bash
npm start
```

You should see `Server running on PORT : 8000` and a MongoDB connected message. If MongoDB fails to connect, re-check `MONGO_URI` (for Atlas, also add your IP address under Network Access).

Leave this terminal running and open a new one for the next step.

### 4. ML service (port 8001)

Run these from the repository root in a new terminal:

```bash
cd ml-service
python -m venv venv
```

Activate the virtual environment:

```bash
# Windows (PowerShell)
venv\Scripts\Activate.ps1
# Windows (cmd)
venv\Scripts\activate.bat
# macOS / Linux
source venv/bin/activate
```

> PowerShell may block the activation script. If so, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once and try again.

Install the dependencies and start the service:

```bash
pip install -r requirements.txt
uvicorn app:app --port 8001
```

Notes:
- `pip install` downloads several large packages (PyTorch, MediaPipe, OpenCV); expect a few minutes.
- **The first start downloads the Whisper "small" speech model (about 460 MB)** from the internet. This happens once; it is cached afterwards, so the first start is slow.
- The service is ready when you see `Application startup complete`. You can also open http://127.0.0.1:8001/docs to confirm.
- Run `uvicorn` from inside the `ml-service` folder, with the virtual environment active.
- If `pip` cannot find `torch==2.10.0`, install the CPU build first: `pip install torch --index-url https://download.pytorch.org/whl/cpu`, then run `pip install -r requirements.txt` again.

Leave this terminal running and open a new one for the next step.

### 5. Frontend (port 5173)

Run these from the repository root in a new terminal:

```bash
cd frontend/smartPrep
npm install
npm run dev
```

No `.env` is needed for local use. The frontend assumes the backend is at `http://localhost:8000`. To point it somewhere else, copy `.env.example` to `.env` and change `VITE_BACKEND_URL`.

### 6. Open the app

Go to **http://localhost:5173**, sign up for an account, and create a session.

For the mock interview, allow microphone and camera access when the browser asks.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| ML service | http://127.0.0.1:8001 (API docs at `/docs`) |

**Starting again later:** you do not need to reinstall anything. Start MongoDB (if local), then run `uvicorn app:app --port 8001` in `ml-service` (with the venv active), `npm start` in `backend`, and `npm run dev` in `frontend/smartPrep`.

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| Frontend shows network or CORS errors | Make sure the backend is running on port 8000 and the frontend on 5173 (or set `CLIENT_URL`). |
| Backend crashes on start or cannot connect to the database | Check `MONGO_URI` in `backend/.env`; for Atlas, whitelist your IP. |
| AI questions fail to generate | Check `OPENROUTER_API_KEY` in `backend/.env` and that your OpenRouter account has credit or a free model available. |
| Mock interview analysis fails | The ML service must be running on port 8001 and `ffmpeg` must be on your PATH (`ffmpeg -version`). |
| `FileNotFoundError ... smartprep_regression_final.pt` | The model files are missing. Make sure you cloned the full repo (`ml-service/models/` should contain `.pt` files). |
| ML service is very slow to start the first time | It is downloading the Whisper model once. |
| `ModuleNotFoundError` in the ML service | The virtual environment is not active, or `pip install -r requirements.txt` did not finish. |
| Port already in use | Stop the other program using that port, or change the port (and update `PORT` / the frontend URL to match). |

---

## 📁 Project structure

```
SmartPrep/
├── backend/            Express API (auth, sessions, questions, AI calls)
│   └── .env.example    Template for backend/.env
├── frontend/smartPrep/ React + Vite app
├── ml-service/         FastAPI service for audio/video analysis
│   ├── app.py          API entry point (run with uvicorn)
│   ├── models/         Trained audio model weights (tracked in git)
│   ├── video_service/  Video analysis (MediaPipe face tracking)
│   └── training/       Scripts used to train the audio model (optional)
└── README.md
```

## 🙈 What is not in the repository

These are kept out of git on purpose. You do **not** need them to run the app:

- `node_modules/`, `ml-service/venv/`: recreated by the install steps above.
- `.env` files: secrets, created from `.env.example`.
- `backend/uploads/`: user-uploaded profile photos (created automatically).
- Training datasets (LibriSpeech, RAVDESS, CREMA-D, and the project's own recorded dataset): only needed to retrain the models.

## 🔐 Security

Never commit a real `.env` file or API keys. Only the `.env.example` templates belong in git.
