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
      type: Number,
    },

    clarityScore: {
      type: Number,
    },

    audioSampleId: {
      type: String,
    },

    duration: {
      type: Number,
    },

    speakingRate: {
      type: Number,
    },

    pauseRatio: {
      type: Number,
    },

    rmsMean: {
      type: Number,
    },

    rmsVariance: {
      type: Number,
    },

    fillerCount: {
      type: Number,
    },

    pitchMean: {
      type: Number,
    },

    pitchVariance: {
      type: Number,
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
