import React, { useEffect, useRef, useState } from "react";
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
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // 🎤 Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

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
        setQuestion(null);
      } else {
        setQuestion(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const startRecording = async () => {
    if (isRecording || isTranscribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearInterval(timerRef.current);
        setIsRecording(false);

        try {
          setIsTranscribing(true);

          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          if (!audioBlob.size) return;

          const formData = new FormData();
          formData.append("audio", audioBlob);

          const res = await axiosInstance.post(
            "/api/audio/transcribe",
            formData
          );

          if (res.data?.transcript) {
            setAnswer(res.data.transcript);
          }
        } catch (err) {
          console.error("Transcription failed:", err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(200);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Microphone access denied:", error);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
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
      <div className="w-full max-w-3xl mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            Question {progress.current} of {progress.total}
          </span>
          <span>{Math.round(progressPercent)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full">
          <div
            className="bg-black h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-3xl bg-white shadow-md rounded-xl p-8">

        {loading && (
          <div className="text-center font-medium">
            Loading...
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
              placeholder="Type your answer here or use mic..."
            />

            <div className="text-xs text-gray-500 mt-1">
              {answer.length} characters
            </div>

            {/* 🎤 Mic Section */}
            <div className="mt-6 flex flex-col items-center">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className={`px-6 py-3 rounded-full text-white font-semibold transition ${
                    isTranscribing
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-black hover:opacity-90"
                  }`}
                >
                  🎤 Start Recording
                </button>
              ) : (
                <div className="flex flex-col items-center">
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 rounded-full bg-red-600 text-white font-semibold animate-pulse"
                  >
                    ⏹ Stop Recording
                  </button>
                  <span className="mt-2 text-red-600 font-medium">
                    Recording... {formatTime(recordingTime)}
                  </span>
                </div>
              )}

              {isTranscribing && (
                <span className="mt-3 text-sm text-gray-500">
                  Transcribing audio...
                </span>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={isSubmitting || isTranscribing}
              className="mt-6 w-full bg-black text-white py-3 rounded-lg font-medium hover:opacity-90 transition"
            >
              {isSubmitting ? "Submitting..." : "Next Question"}
            </button>
          </>
        )}

        {!loading && endOfInterview && (
          <div className="text-center mt-6">
            <h2 className="text-xl font-bold mb-6">
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
