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
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // 🎤 Recording
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // 🔊 Speaking animation
  const [isSpeaking, setIsSpeaking] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // =============================
  // 🚀 START INTERVIEW
  // =============================
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

  // =============================
  // 🔊 SMART INTERVIEWER VOICE
  // =============================
  useEffect(() => {
    if (!question?.questionText) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(
      question.questionText
    );

    const voices = window.speechSynthesis.getVoices();

    // Prefer English female or neural-sounding voice
    const preferredVoice =
      voices.find(v =>
        v.lang.toLowerCase().includes("en") &&
        v.name.toLowerCase().includes("female")
      ) ||
      voices.find(v => v.lang.toLowerCase().includes("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 400);

  }, [question]);

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

  // =============================
  // 🎤 RECORDING
  // =============================
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
        setRecordingTime(prev => prev + 1);
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

      setAnswer("");

      if (res.data.endOfInterview) {
        setEndOfInterview(true);
        setQuestion(null);
      } else {
        setQuestion(res.data.nextQuestion);
        setProgress(prev => ({
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

      setProgress(prev => ({
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
      
      {/* Progress Bar */}
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

        {!loading && question && !endOfInterview && (
          <>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {question.questionText}
            </h2>

            {/* 🔊 Waveform Animation */}
            {isSpeaking && (
              <div className="flex justify-center mb-6">
                <div className="flex gap-1 items-end h-6">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-indigo-600 animate-pulse"
                      style={{
                        height: `${10 + Math.random() * 20}px`,
                        animationDelay: `${i * 0.2}s`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-4"
              placeholder="Type your answer here or use mic..."
            />

            <div className="mt-6 flex flex-col items-center">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="px-6 py-3 rounded-full bg-black text-white"
                >
                  🎤 Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 rounded-full bg-red-600 text-white animate-pulse"
                >
                  ⏹ Stop Recording ({formatTime(recordingTime)})
                </button>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={isSubmitting || isTranscribing}
              className="mt-6 w-full bg-black text-white py-3 rounded-lg"
            >
              Next Question
            </button>
          </>
        )}

        {!loading && endOfInterview && (
          <div className="text-center mt-6">
            <button
              onClick={handleLoadMore}
              className="w-full bg-blue-600 text-white py-3 rounded-lg mb-4"
            >
              Load More Questions
            </button>
            <button
              onClick={handleFinish}
              className="w-full bg-green-600 text-white py-3 rounded-lg"
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
