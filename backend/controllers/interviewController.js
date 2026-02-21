const Session = require("../models/Session");
const Question = require("../models/Question");
const { generateQuestionsCore } = require("./aiController");


// 1️⃣ Start Interview
exports.startInterview = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (!session.questions || session.questions.length === 0) {
      return res
        .status(400)
        .json({ message: "No questions available for this session" });
    }

    // Reset interview state
    session.currentQuestionIndex = 0;
    session.answers = [];
    session.isInterviewCompleted = false;

    await session.save();

    return res.json({
      message: "Interview started",
      currentQuestionIndex: 0,
      totalQuestions: session.questions.length,
    });
  } catch (error) {
    console.error("Start interview error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// 2️⃣ Get Current Question
exports.getCurrentQuestion = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId).populate("questions");

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const index = session.currentQuestionIndex;

    if (index >= session.questions.length) {
      return res.json({
        endOfInterview: true,
        options: {
          canLoadMore: true,
          canFinish: true,
        },
      });
    }

    const question = session.questions[index];

    return res.json({
      questionId: question._id,
      questionText: question.question,
    });
  } catch (error) {
    console.error("Get current question error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



exports.submitAnswer = async (req, res) => {
  try {
    const {
      sessionId,
      transcript,
      sampleId,
      features,
      confidenceScore,
      clarityScore,
    } = req.body;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.isInterviewCompleted) {
      return res.status(400).json({
        message: "Interview already completed",
      });
    }

    if (!transcript || transcript.trim() === "") {
      return res.status(400).json({
        message: "Answer transcript is required",
      });
    }

    const index = session.currentQuestionIndex;

    if (index >= session.questions.length) {
      return res.status(400).json({
        message: "No more questions available",
      });
    }

    const currentQuestionId = session.questions[index];

    // 🔥 SAFE SCORE HANDLING
    const safeConfidence =
      typeof confidenceScore === "number" ? confidenceScore : null;

    const safeClarity =
      typeof clarityScore === "number" ? clarityScore : null;

    session.answers.push({
      question: currentQuestionId,
      transcript: transcript.trim(),
      confidenceScore: safeConfidence,
      clarityScore: safeClarity,

      audioSampleId: sampleId || null,
      duration: features?.duration || null,
      speakingRate: features?.speaking_rate || null,
      rmsEnergy: features?.rms_energy || null,
    });

    session.currentQuestionIndex += 1;

    const hasNextQuestion =
      session.currentQuestionIndex < session.questions.length;

    let nextQuestion = null;

    if (hasNextQuestion) {
      const nextQuestionId =
        session.questions[session.currentQuestionIndex];

      const questionDoc = await Question.findById(nextQuestionId);

      nextQuestion = {
        questionId: questionDoc._id,
        questionText: questionDoc.question,
      };
    }

    await session.save();

    return res.json({
      confidenceScore: safeConfidence,
      clarityScore: safeClarity,
      hasNextQuestion,
      nextQuestion,
      endOfInterview: !hasNextQuestion,
    });

  } catch (error) {
    console.error("Submit error:", error);
    res.status(500).json({ message: "Server error" });
  }
};




// 4️⃣ Finish Interview
exports.finishInterview = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    session.isInterviewCompleted = true;
    await session.save();

    return res.json({
      message: "Interview marked as completed",
    });
  } catch (error) {
    console.error("Finish interview error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// 5️⃣ Interview Summary (Improved with answer population)
exports.getInterviewSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId)
      .populate("questions")
      .populate("answers.question");

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const answers = session.answers;
    const totalAnswered = answers.length;
    const totalQuestions = session.questions.length;

    if (totalAnswered === 0) {
      return res.json({
        totalQuestions,
        totalAnswered: 0,
        averageConfidence: 0,
        averageClarity: 0,
        answers: [],
      });
    }

    // 🔥 Only include answers that have AI scores
    const scoredAnswers = answers.filter(
      (ans) =>
        typeof ans.confidenceScore === "number" &&
        typeof ans.clarityScore === "number"
    );

    let averageConfidence = 0;
    let averageClarity = 0;

    if (scoredAnswers.length > 0) {
      const totalConfidence = scoredAnswers.reduce(
        (sum, ans) => sum + ans.confidenceScore,
        0
      );

      const totalClarity = scoredAnswers.reduce(
        (sum, ans) => sum + ans.clarityScore,
        0
      );

      averageConfidence = (
        totalConfidence / scoredAnswers.length
      ).toFixed(2);

      averageClarity = (
        totalClarity / scoredAnswers.length
      ).toFixed(2);
    }

    return res.json({
      totalQuestions,
      totalAnswered,
      evaluatedAnswers: scoredAnswers.length,
      averageConfidence,
      averageClarity,
      answers,
    });

  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 6️⃣ Load More Questions
exports.loadMoreQuestions = async (req, res) => {
  try {
    const { sessionId, count = 5 } = req.body;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.isInterviewCompleted) {
      return res.status(400).json({
        message: "Cannot load more. Interview already completed.",
      });
    }

    const generatedQuestions = await generateQuestionsCore({
      role: session.role,
      experience: session.experience,
      topicsToFocus: session.topicsToFocus
        .split(",")
        .map((t) => t.trim()),
      description: session.description || "",
      numbersOfQuestions: count,
      userId: req.user?.id,
      action: "loadMoreQuestions",
    });

    const newQuestionDocs = generatedQuestions.map((q) => ({
      session: session._id,
      question: q.question,
      answer: q.answer,
    }));

    const createdQuestions = await Question.insertMany(newQuestionDocs);

    createdQuestions.forEach((q) => {
      session.questions.push(q._id);
    });

    await session.save();

    return res.json({
      message: "New AI questions added",
      totalQuestions: session.questions.length,
    });
  } catch (error) {
    const status = error.statusCode || 500;

    if (status === 429) {
      return res.status(429).json({
        code: error.code || "AI_PREVIEW_LIMIT_REACHED",
        message:
          "SmartPrep is running on limited free AI capacity. You’ve reached the free preview limit.",
      });
    }

    console.error("Load more error:", error.message);
    res.status(500).json({ message: "AI service temporarily unavailable." });
  }
};
