import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";

const MockInterview = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [endOfInterview, setEndOfInterview] = useState(false);
  const [scores, setScores] = useState(null);

  // 🔹 Start Interview + Load First Question
  useEffect(() => {
    const startInterview = async () => {
      try {
        await axiosInstance.post("/api/interview/start", {
          sessionId,
        });

        await loadCurrentQuestion();
      } catch (error) {
        console.error("Start error:", error);
      }
    };

    startInterview();
  }, []);

  const loadCurrentQuestion = async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get(
        `/api/interview/${sessionId}/current`
      );

      if (res.data.endOfInterview) {
        setEndOfInterview(true);
      } else {
        setQuestion(res.data);
      }
    } catch (error) {
      console.error("Load question error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Submit Answer
  const handleNext = async () => {
    if (!answer.trim()) return alert("Please enter your answer");

    try {
      setIsSubmitting(true);

      const res = await axiosInstance.post("/api/interview/submit", {
        sessionId,
        transcript: answer,
      });

      setScores({
        confidence: res.data.confidenceScore,
        clarity: res.data.clarityScore,
      });

      setAnswer("");

      if (res.data.endOfInterview) {
        setEndOfInterview(true);
        setQuestion(null);
      } else {
        setQuestion(res.data.nextQuestion);
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔹 Finish Interview
  const handleFinish = async () => {
    try {
      await axiosInstance.post("/api/interview/finish", {
        sessionId,
      });

      navigate(`/summary/${sessionId}`); // We will build later
    } catch (error) {
      console.error("Finish error:", error);
    }
  };

  // 🔹 Load More Questions (temporary placeholder)
  const handleLoadMore = async () => {
  try {
    setLoading(true);

    await axiosInstance.post("/api/interview/load-more", {
      sessionId,
      count: 5, // you can change later
    });

    // After loading more, reset end flag
    setEndOfInterview(false);

    // Load next question automatically
    await loadCurrentQuestion();

  } catch (error) {
    console.error("Load more error:", error);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      {/* 🔹 Loading */}
      {loading && (
        <div className="text-center text-lg font-medium">
          Loading Interview...
        </div>
      )}

      {/* 🔹 Question View */}
      {!loading && question && !endOfInterview && (
        <div className="bg-white shadow-md rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            {question.questionText}
          </h2>

          <textarea
            className="w-full border rounded-lg p-3 mb-4"
            rows="5"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />

          {scores && (
            <div className="mb-4 text-sm text-gray-600">
              Last Score → Confidence: {scores.confidence} | Clarity:{" "}
              {scores.clarity}
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="bg-black text-white px-6 py-2 rounded-lg w-full"
          >
            {isSubmitting ? "Submitting..." : "Next"}
          </button>
        </div>
      )}

      {/* 🔹 End Of Questions Screen */}
      {!loading && endOfInterview && (
        <div className="bg-white shadow-md rounded-xl p-6 text-center">
          <h2 className="text-xl font-bold mb-6">
            You've completed current questions 🎉
          </h2>

          <button
            onClick={handleLoadMore}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg w-full mb-4"
          >
            Load More Questions
          </button>

          <button
            onClick={handleFinish}
            className="bg-green-600 text-white px-6 py-2 rounded-lg w-full"
          >
            Finish Interview
          </button>
        </div>
      )}
    </div>
  );
};

export default MockInterview;
