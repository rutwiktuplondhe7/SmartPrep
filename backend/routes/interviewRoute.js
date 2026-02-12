const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

const {
  startInterview,
  getCurrentQuestion,
  submitAnswer,
  finishInterview,
  getInterviewSummary,
  loadMoreQuestions,
} = require("../controllers/interviewController");



router.post("/start", protect, startInterview);
router.get("/:sessionId/current", protect, getCurrentQuestion);
router.post("/submit", protect, submitAnswer);
router.post("/finish", protect, finishInterview);
router.get("/:sessionId/summary", protect, getInterviewSummary);
router.post("/load-more", protect, loadMoreQuestions);



module.exports = router;
