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
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
  });

  useEffect(() => {
    const startInterview = async () => {
      try {
        const startRes = await axiosInstance.post(
          "/api/interview/start",
          { sessionId }
        );

        setProgress({
          current: startRes.data.currentQuestionIndex + 1,
          total: startRes.data.totalQuestions,
        });

        await loadCurrentQuestion();
      } catch (err) {
        console.error(err);
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!answer.trim()) return;

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

        setProgress((prev) => ({
          ...prev,
          current: prev.current + 1,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    await axiosInstance.post("/api/interview/finish", { sessionId });
    navigate(`/summary/${sessionId}`);
  };

  const handleLoadMore = async () => {
    try {
      setLoading(true);

      await axiosInstance.post("/api/interview/load-more", {
        sessionId,
        count: 5,
      });

      setEndOfInterview(false);
      await loadCurrentQuestion();

      setProgress((prev) => ({
        ...prev,
        total: prev.total + 5,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent =
    progress.total > 0
      ? (progress.current / progress.total) * 100
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-3xl mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          SmartPrep Interview Simulator
        </h1>

        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>
              Question {progress.current} of {progress.total}
            </span>
            <span>
              {Math.round(progressPercent)}% Complete
            </span>
          </div>

          <div className="w-full bg-gray-200 h-2 rounded-full">
            <div
              className="bg-black h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl bg-white shadow-md rounded-xl p-8">
        {loading && (
          <div className="text-center text-lg font-medium">
            Preparing next question...
          </div>
        )}

        {!loading && question && !endOfInterview && (
          <>
            <h2 className="text-xl font-semibold mb-6 text-gray-800">
              {question.questionText}
            </h2>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-black transition"
              placeholder="Type your answer here..."
            />

            <div className="text-xs text-gray-500 mt-1">
              {answer.length} characters
            </div>

            {scores && (
              <div className="mt-4 text-sm text-gray-600">
                Last Response → Confidence: {scores.confidence} |
                Clarity: {scores.clarity}
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="mt-6 w-full bg-black text-white py-3 rounded-lg font-medium hover:opacity-90 transition"
            >
              {isSubmitting ? "Submitting..." : "Next Question"}
            </button>
          </>
        )}

        {!loading && endOfInterview && (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-6 text-gray-800">
              You've completed the current set of questions
            </h2>

            <button
              onClick={handleLoadMore}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium mb-4 hover:opacity-90 transition"
            >
              Load More Questions
            </button>

            <button
              onClick={handleFinish}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:opacity-90 transition"
            >
              Finish Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MockInterview;
