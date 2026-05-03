require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("../backend/config/db");

const app = express();

app.set("trust proxy", 1);

// ---------------- ROUTES IMPORT ----------------
const authRoutes = require("./routes/authRoutes");
const interviewRoutes = require("./routes/interviewRoute");
const sessionRoutes = require("./routes/sessionRoutes");
const questionRoutes = require("./routes/questionRoutes");
const audioRoutes = require("./routes/audioRoutes");
const videoRoutes = require("./routes/videoRoutes");

const { protect } = require("./middlewares/authMiddleware");

const {
  generateInterviewQuestions,
  generateConceptExplanation,
} = require("./controllers/aiController");

// ---------------- CORS ----------------
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ---------------- DB ----------------
connectDB();

// ---------------- ROUTES ----------------

// 🔥 IMPORTANT: audio route BEFORE body parser
app.use("/api/audio", audioRoutes);

// 🔥 Video route (chunk-based processing)
app.use("/api/video", videoRoutes);

// JSON middleware AFTER audio/video
app.use(express.json());

// Main routes
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/interview", interviewRoutes);

// AI routes
app.use("/api/ai/generate-questions", protect, generateInterviewQuestions);
app.use("/api/ai/generate-explanation", protect, generateConceptExplanation);

// ---------------- STATIC ----------------
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {})
);

// ---------------- SERVER ----------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on PORT : ${PORT}`);
});