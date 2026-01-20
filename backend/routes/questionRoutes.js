const express = require("express");
const {
  togglePinQuestion,
  updateQuestionNote,
  addQuestionsToSession,
  incrementLearnMoreCount,
} = require("../controllers/questionController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/add", protect, addQuestionsToSession);
router.post("/:id/pin", protect, togglePinQuestion);
router.post("/:id/note", protect, updateQuestionNote);

// increment learnMoreCount only after Learn More succeeds
router.post("/:id/learn-more", protect, incrementLearnMoreCount);

module.exports = router;
