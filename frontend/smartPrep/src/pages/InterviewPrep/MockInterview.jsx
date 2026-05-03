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

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [audioMeta, setAudioMeta] = useState(null);
  const [videoConfidence, setVideoConfidence] = useState(null);

  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const hasSpokenRef = useRef(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null); // 🔥 keep stream reference

  // ---------------- CAMERA ON MOUNT ----------------
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
        }
      })
      .catch((err) => console.error("Camera error:", err));

    return () => {
      // Clean up stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ---------------- START INTERVIEW ----------------
  useEffect(() => {
    const startInterview = async () => {
      try {
        const startRes = await axiosInstance.post("/api/interview/start", { sessionId });
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

  // ---------------- LOAD VOICES ----------------
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred =
          voices.find(
            (v) =>
              v.lang.toLowerCase().includes("en") &&
              v.name.toLowerCase().includes("female")
          ) || voices.find((v) => v.lang.toLowerCase().includes("en"));
        setSelectedVoice(preferred || voices[0]);
        setVoicesLoaded(true);
        const warmUp = new SpeechSynthesisUtterance(" ");
        warmUp.volume = 0;
        window.speechSynthesis.speak(warmUp);
        window.speechSynthesis.cancel();
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // ---------------- TEXT TO SPEECH ----------------
  useEffect(() => {
    if (!voicesLoaded || !selectedVoice || !question?.questionText) return;
    if (hasSpokenRef.current) return;
    window.speechSynthesis.cancel();
    hasSpokenRef.current = true;
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(question.questionText);
    utterance.voice = selectedVoice;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [question, voicesLoaded, selectedVoice]);

  // ---------------- LOAD QUESTION ----------------
  const loadCurrentQuestion = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/interview/${sessionId}/current`);
      if (res.data.endOfInterview) {
        setEndOfInterview(true);
        setQuestion(null);
      } else {
        hasSpokenRef.current = false;
        setEndOfInterview(false);
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

  // ---------------- RECORDING ----------------
  const startRecording = async () => {
    if (isRecording || isTranscribing) return;

    try {
      // Reuse the already-running stream from mount
      const stream = streamRef.current;
      if (!stream) return;

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setRecordingTime(0);
      setVideoConfidence(null);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearInterval(timerRef.current);
        setIsRecording(false);

        const fullBlob = new Blob(audioChunksRef.current, { type: "video/webm" });
        if (!fullBlob.size) return;

        try {
          setIsTranscribing(true);

          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioForm = new FormData();
          audioForm.append("audio", audioBlob);

          const videoForm = new FormData();
          videoForm.append("video", fullBlob, "session.webm");

          const [audioRes, videoRes] = await Promise.all([
            axiosInstance.post("/api/audio/transcribe", audioForm),
            axiosInstance.post("/api/video/analyze-chunk", videoForm),
          ]);

          if (audioRes.data?.transcript) {
            setAnswer(audioRes.data.transcript);
            setAudioMeta({
              sampleId: audioRes.data.sampleId,
              features: audioRes.data.features,
              confidenceScore: audioRes.data.confidenceScore,
              clarityScore: audioRes.data.clarityScore,
            });
          }

          if (videoRes.data?.video_confidence !== undefined) {
            setVideoConfidence(videoRes.data.video_confidence);
          }
        } catch (err) {
          console.error("Processing failed:", err);
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
      console.error("Recording failed:", error);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
  };

  // ---------------- SUBMIT ----------------
  const handleNext = async () => {
    if (!answer.trim() || isTranscribing) return;
    try {
      setIsSubmitting(true);
      await axiosInstance.post("/api/interview/submit", {
        sessionId,
        transcript: answer,
        sampleId: audioMeta?.sampleId,
        features: audioMeta?.features,
        confidenceScore: audioMeta?.confidenceScore,
        clarityScore: audioMeta?.clarityScore,
        videoConfidence: videoConfidence ?? null,
      });
      setAnswer("");
      setAudioMeta(null);
      setVideoConfidence(null);
      await loadCurrentQuestion();
      setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
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
      await axiosInstance.post("/api/interview/load-more", { sessionId, count: 5 });
      setEndOfInterview(false);
      await loadCurrentQuestion();
      setProgress((prev) => ({ ...prev, total: prev.total + 5 }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent =
    progress.total > 0 ? ((progress.current - 1) / progress.total) * 100 : 0;

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">

      {/* PROGRESS BAR */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {progress.current} of {progress.total}</span>
          <span>{Math.round(progressPercent)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 h-1.5 rounded-full">
          <div
            className="bg-black h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="max-w-6xl mx-auto flex gap-6 items-start">

        {/* LEFT — Question + Answer */}
        <div className="flex-1 bg-white shadow-md rounded-xl p-8">

          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
            </div>
          )}

          {!loading && question && !endOfInterview && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-5">
                {question.questionText}
              </h2>

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-lg p-4 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Type your answer here or use the mic..."
              />

              <div className="mt-5 flex flex-col items-center gap-3">
                {!isRecording && !isTranscribing && (
                  <button
                    onClick={startRecording}
                    className="px-8 py-3 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition"
                  >
                    🎤 Start Recording
                  </button>
                )}

                {isRecording && (
                  <button
                    onClick={stopRecording}
                    className="px-8 py-3 rounded-full bg-red-600 text-white text-sm font-medium animate-pulse"
                  >
                    ⏹ Stop Recording ({formatTime(recordingTime)})
                  </button>
                )}

                {isTranscribing && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-7 h-7 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Analyzing your response...</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={isSubmitting || isTranscribing || !answer.trim()}
                className="mt-6 w-full bg-black text-white py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Next Question →"}
              </button>
            </>
          )}

          {!loading && endOfInterview && (
            <div className="text-center py-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                🎉 Interview Complete!
              </h2>
              <p className="text-gray-500 text-sm mb-8">
                Great job. You can load more questions or view your results.
              </p>
              <button
                onClick={handleLoadMore}
                className="w-full bg-blue-600 text-white py-3 rounded-lg mb-3 text-sm font-medium hover:bg-blue-700 transition"
              >
                Load More Questions
              </button>
              <button
                onClick={handleFinish}
                className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-700 transition"
              >
                Finish & See Results
              </button>
            </div>
          )}
        </div>

        {/* RIGHT — Video Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">

          {/* Camera box */}
          <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Placeholder until camera is ready */}
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 z-10">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-xs text-center px-4">Starting camera...</p>
              </div>
            )}

            {/* Recording badge */}
            {isRecording && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black bg-opacity-60 px-2.5 py-1 rounded-full z-10">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-white text-xs font-medium">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>

          {/* Video confidence card */}
          {videoConfidence !== null && !isRecording && (
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                Video Confidence
              </p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-semibold text-gray-800">
                  {Math.round(videoConfidence * 100)}
                </span>
                <span className="text-gray-400 text-sm mb-0.5">/ 100</span>
              </div>
              <div className="mt-2 w-full bg-gray-100 h-1.5 rounded-full">
                <div
                  className="h-1.5 rounded-full bg-black transition-all duration-700"
                  style={{ width: `${Math.round(videoConfidence * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Tips card */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Tips</p>
            <ul className="text-xs text-gray-500 space-y-1.5">
              <li>👁 Look directly at the camera</li>
              <li>🙂 Keep a natural expression</li>
              <li>🪑 Sit still and upright</li>
              <li>💡 Speak clearly and at pace</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MockInterview;