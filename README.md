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


## 🛠 Setup & Environment Configuration

Follow the steps below to run the project locally.

---

###  1️⃣ Clone the Repository
```bash
git clone https://github.com/aryandumale04/SmartPrep.git
cd smartprep
```

### 2️⃣ Backend Setup
```bash
cd backend
npm install
```

Create a .env file inside the backend directory:

```bash
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENROUTER_API_KEY=your_openrouter_api_key
```

Start the backend server: 
```bash
npm start
```

### 3️⃣ Frontend Setup
```bash
cd ..
cd frontend
cd smartPrep
npm install
npm run dev
```

### 4️⃣ Access the App


Frontend: http://localhost:5173

Backend API: http://localhost:8000


Make sure the backend is running before using the app.
