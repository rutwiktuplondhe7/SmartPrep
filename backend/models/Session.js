const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
    },
    transcript: {
      type: String,
    },
    confidenceScore: {
      type: Number, // 0-100 (dummy for now)
    },
    clarityScore: {
      type: Number, // 0-100 (dummy for now)
    },
  },
  { timestamps: true }
);

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    role: { type: String, required: true },

    experience: { type: String, required: true },

    topicsToFocus: { type: String, required: true },

    description: String,

    questions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    ],

    currentQuestionIndex: {
      type: Number,
      default: 0,
    },

    answers: [answerSchema],

    isInterviewCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
