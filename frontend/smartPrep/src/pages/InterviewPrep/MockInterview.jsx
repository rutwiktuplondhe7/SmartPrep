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

  const [audioMeta, setAudioMeta] = useState(null);

  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const hasSpokenRef = useRef(false);

  // ---------------- START INTERVIEW ----------------
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // Pre-warm engine to avoid first-question delay
        const warmUp = new SpeechSynthesisUtterance(" ");
        warmUp.volume = 0;
        window.speechSynthesis.speak(warmUp);
        window.speechSynthesis.cancel();
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ---------------- TEXT TO SPEECH ----------------
  useEffect(() => {
    if (!voicesLoaded || !selectedVoice || !question?.questionText) return;
    if (hasSpokenRef.current) return;

    window.speechSynthesis.cancel();
    hasSpokenRef.current = true;

    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(
      question.questionText
    );

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

      const res = await axiosInstance.get(
        `/api/interview/${sessionId}/current`
      );

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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

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

            setAudioMeta({
              sampleId: res.data.sampleId,
              features: res.data.features,
              confidenceScore: res.data.confidenceScore,
              clarityScore: res.data.clarityScore,
            });
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

  // ---------------- SUBMIT ANSWER ----------------
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
      });

      setAnswer("");
      setAudioMeta(null);

      await loadCurrentQuestion();

      setProgress((prev) => ({
        ...prev,
        current: prev.current + 1,
      }));
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
      ? ((progress.current - 1) / progress.total) * 100
      : 0;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FFF7F2] flex flex-col items-center py-10 px-4">

      <div className="pointer-events-none absolute top-0 left-0 w-[420px] h-[420px] rounded-full bg-rose-200/25 blur-[90px] -translate-x-1/2 -translate-y-1/3" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-orange-200/25 blur-[90px] translate-x-1/3 translate-y-1/3" />

      <div className="relative w-full max-w-3xl mb-6 z-10">
        <div className="flex justify-between text-sm text-slate-700 mb-2 font-medium">
          <span>
            Question {progress.current} of {progress.total}
          </span>
          <span>{Math.round(progressPercent)}% Complete</span>
        </div>
        <div className="w-full bg-rose-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-linear-to-r from-primary to-[#FF8A5B] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-3xl bg-[#FFFBF8] shadow-xl rounded-3xl border border-rose-100 p-8 md:p-10">

        {/* ACTIVE QUESTION */}
        {!loading && question && !endOfInterview && (
          <>
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h2 className="text-xl font-semibold text-black">
                {question.questionText}
              </h2>

              {isSpeaking && (
                <span className="text-[12px] font-semibold text-rose-700 bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-full">
                  Speaking question
                </span>
              )}
            </div>

            <p className="text-sm text-slate-700 mb-4">
              Type your response or use the microphone to transcribe.
            </p>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
              className="w-full border border-rose-100 rounded-2xl p-4 bg-white/90 text-black outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-colors"
              placeholder="Type your answer here or use mic..."
            />

            <div className="mt-6 flex flex-col items-center">

              {!isRecording && !isTranscribing && (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 rounded-full bg-black text-white font-semibold shadow-lg shadow-rose-600/10 hover:bg-primary transition-colors"
                >
                  🎤 Start Recording
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 rounded-full bg-primary text-white font-semibold shadow-lg shadow-rose-600/10 animate-pulse"
                >
                  ⏹ Stop Recording ({formatTime(recordingTime)})
                </button>
              )}

              {isTranscribing && (
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-rose-200 border-t-primary rounded-full animate-spin mb-3"></div>
                  <p className="text-slate-600">
                    Transcribing your response...
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={isSubmitting || isTranscribing}
              className="mt-6 w-full bg-linear-to-r from-primary to-[#FF8A5B] text-white py-3 rounded-2xl font-semibold shadow-lg shadow-rose-600/10 hover:opacity-95 disabled:opacity-60 transition-all"
            >
              Next Question
            </button>
          </>
        )}

        {/* END OF INTERVIEW SCREEN */}
        {!loading && endOfInterview && (
          <div className="text-center mt-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 border border-rose-200 mb-5">
              <span className="text-2xl">🎉</span>
            </div>

            <h2 className="text-xl font-semibold mb-3 text-black">
              You have completed the interview!
            </h2>

            <p className="text-sm text-slate-700 mb-6 max-w-md mx-auto">
              Review your progress, load more questions, or finish the session to view the summary.
            </p>

            <button
              onClick={handleLoadMore}
              className="w-full bg-linear-to-r from-primary to-[#FF8A5B] text-white py-3 rounded-2xl mb-4 font-semibold shadow-lg shadow-rose-600/10 hover:opacity-95 transition-all"
            >
              Load More Questions
            </button>

            <button
              onClick={handleFinish}
              className="w-full bg-black text-white py-3 rounded-2xl font-semibold shadow-lg shadow-rose-600/10 hover:bg-primary transition-colors"
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