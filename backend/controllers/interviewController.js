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



// 3️⃣ Submit Answer + Auto Advance (Final Safe Version)
exports.submitAnswer = async (req, res) => {
  try {
    const { sessionId, transcript } = req.body;

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

    // 🔥 Temporary Dummy Scores (ML will replace later)
    const confidenceScore = Math.floor(Math.random() * 41) + 60;
    const clarityScore = Math.floor(Math.random() * 41) + 60;

    // Save Answer
    session.answers.push({
      question: currentQuestionId,
      transcript: transcript.trim(),
      confidenceScore,
      clarityScore,
    });

    // Move pointer
    session.currentQuestionIndex += 1;

    let hasNextQuestion =
      session.currentQuestionIndex < session.questions.length;

    let nextQuestion = null;

    if (hasNextQuestion) {
      const nextQuestionId =
        session.questions[session.currentQuestionIndex];

      const questionDoc = await Question.findById(nextQuestionId);

      if (!questionDoc) {
        return res.status(500).json({
          message: "Next question not found",
        });
      }

      nextQuestion = {
        questionId: questionDoc._id,
        questionText: questionDoc.question,
      };
    }

    await session.save();

    // 🔥 Important: Do NOT mark interview completed here

    return res.json({
      confidenceScore,
      clarityScore,
      hasNextQuestion,
      nextQuestion,
      endOfInterview: !hasNextQuestion,  // 🔥 Very important
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
      .populate("answers.question"); // 🔥 Important improvement

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

    const totalConfidence = answers.reduce(
      (sum, ans) => sum + ans.confidenceScore,
      0
    );

    const totalClarity = answers.reduce(
      (sum, ans) => sum + ans.clarityScore,
      0
    );

    const averageConfidence = Math.round(totalConfidence / totalAnswered);
    const averageClarity = Math.round(totalClarity / totalAnswered);

    return res.json({
      totalQuestions,
      totalAnswered,
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
