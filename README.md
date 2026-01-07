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

### 📖 Expandable Q&A Learning Interface
- Questions are displayed in an accordion-style UI
- Users can expand/collapse answers for focused study
- Clean layout to avoid information overload

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

### 💾 Persistent Storage
- Sessions and questions are stored in MongoDB
- All data is tied to the authenticated user
- Supports long-term preparation and revision

---

### 🎨 Modern, Responsive UI
- Built with Tailwind CSS
- Responsive across devices
- Minimal, distraction-free interface focused on learning

## 🧩 System Overview (How It Works)

SmartPrep is designed as a clean, modular full-stack application where each part has a clearly defined responsibility.  
This section explains **how the system works at runtime**, not how files are organized.

---

### 1️⃣ Frontend Flow

- The frontend is built with React and manages UI state using React Context.
- A centralized Axios instance is used for **all API communication**.
- When a user logs in or signs up:
  - A JWT token is received from the backend.
  - The token is stored in `localStorage`.
  - Axios automatically attaches this token to every protected request using an interceptor.
- User authentication state is restored automatically on page refresh by validating the token with the backend.

---

### 2️⃣ Backend Flow

- The backend is built using Express and exposes REST APIs for:
  - Authentication
  - Session management
  - Question management
  - AI-powered generation
- Protected routes verify the JWT token before allowing access.
- MongoDB is used to persist:
  - Users
  - Sessions
  - Questions
- Sessions act as the parent entity, and questions are linked to sessions for structured storage and retrieval.

---

### 3️⃣ AI Integration Flow

- AI requests are handled through dedicated backend endpoints.
- The backend:
  - Builds a prompt based on user input (role, experience, topics, description).
  - Sends the prompt to the AI provider (via OpenRouter).
  - Enforces **strict JSON-only responses**.
  - Parses and validates the response before sending it to the frontend.
- This ensures:
  - Predictable responses
  - Safe rendering
  - No malformed or unexpected AI output

---

### 4️⃣ AI Explanation (Learn More) Flow

- When a user clicks **Learn More** on any question:
  - The frontend sends the original question and answer to the backend.
  - The backend asks the AI to **expand and deepen the existing answer**, not replace it.
  - The AI response is returned as structured JSON.
  - The frontend renders the explanation inside a dedicated drawer using Markdown rendering.
- This allows users to fully understand a topic in one place without navigating away.

---

### 5️⃣ Session & Question Lifecycle

- Users can:
  - Create sessions based on their goals
  - Generate questions using AI
  - Add more questions later
  - Pin important questions
  - Add personal notes
- All changes are persisted in MongoDB and reflected instantly in the UI.

---

### 6️⃣ Error Handling & Reliability

- Frontend:
  - Displays user-friendly error messages.
  - Prevents rendering invalid AI responses.
- Backend:
  - Validates all inputs.
  - Gracefully handles AI failures.
  - Returns consistent error responses.
- AI usage is guarded with limits and retries to prevent unexpected failures during development.

---

This architecture keeps the system **predictable**, **scalable**, and **easy to extend**, especially for upcoming features like audio and speech analysis.

## 🛠 Setup & Environment Configuration

Follow the steps below to run the project locally.

---

###  1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/smartprep.git
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
