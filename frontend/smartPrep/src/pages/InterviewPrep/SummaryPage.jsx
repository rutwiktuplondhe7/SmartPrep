import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";

const CircularProgress = ({ value, label, gradientId }) => {
  const numericValue = Number(value) || 0;
  const safeValue = Math.max(0, Math.min(100, numericValue));
  const radius = 90;
  const stroke = 14;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF5A3C" />
            <stop offset="100%" stopColor="#FF8A5B" />
          </linearGradient>
        </defs>
        <circle
          stroke="#ffe4e6"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={`url(#${gradientId})`}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold text-black">{safeValue}%</span>
        <span className="text-sm text-gray-500 font-semibold mt-2">{label}</span>
      </div>
    </div>
  );
};

const Summary = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      const res = await axiosInstance.get(`/api/interview/${sessionId}/summary`);
      setData(res.data);
    };
    fetchSummary();
  }, [sessionId]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF7F2] text-black font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-rose-100 border-t-[#FF5A3C] rounded-full animate-spin" />
          <p>Loading AI Analysis...</p>
        </div>
      </div>
    );
  }

  const {
    totalQuestions,
    totalAnswered,
    averageConfidence,
    averageClarity,
    answers,
  } = data;

  const confidencePercent =
    averageConfidence != null
      ? Math.round((averageConfidence / 5) * 100)
      : 0;

  const clarityPercent =
    averageClarity != null
      ? Math.round((averageClarity / 5) * 100)
      : 0;

  const avgPauseRatio =
    answers.length > 0
      ? (answers.reduce((sum, a) => sum + (a.pauseRatio || 0), 0) / answers.length).toFixed(2)
      : "0.00";

  const avgSpeakingRate =
    answers.length > 0
      ? Math.round(answers.reduce((sum, a) => sum + (a.speakingRate || 0), 0) / answers.length)
      : 0;

  const avgEnergyVariance =
    answers.length > 0
      ? (answers.reduce((sum, a) => sum + (a.rmsVariance || 0), 0) / answers.length).toFixed(3)
      : "0.000";

  const avgFillerCount =
    answers.length > 0
      ? Math.round(answers.reduce((sum, a) => sum + (a.fillerCount || 0), 0) / answers.length)
      : 0;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FFF7F2] text-black px-6 py-16">
      {/* Background blur decorative element */}
      <div className="w-[600px] h-[600px] bg-rose-200/20 blur-[80px] absolute top-0 left-0 pointer-events-none z-0" />

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-[#FF5A3C] to-[#FF8A5B] bg-clip-text text-transparent">
            AI Interview Performance Report
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-[#FF5A3C] to-[#FF8A5B] mt-4 rounded-full" />
          <p className="text-gray-700 mt-6 text-lg max-w-2xl">
            Comprehensive behavioral intelligence and communication analytics powered by SmartPrep.
          </p>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">

          {/* Completion */}
          <div className="bg-[#FFFBF8] border border-rose-100 p-10 rounded-3xl shadow-md shadow-rose-100/50 text-center flex flex-col items-center justify-center hover:shadow-lg transition">
            <p className="text-gray-500 mb-4 font-semibold">Completion Rate</p>
            <p className="text-5xl font-extrabold text-black">
              {totalAnswered}
              <span className="text-gray-500 text-2xl font-medium"> / {totalQuestions}</span>
            </p>
          </div>

          {/* Confidence — fused audio + video */}
          <div className="bg-[#FFFBF8] border border-rose-100 p-10 rounded-3xl shadow-md shadow-rose-100/50 flex items-center justify-center hover:shadow-lg transition">
            <CircularProgress
              value={confidencePercent}
              label="Confidence"
              gradientId="confidenceGradient"
            />
          </div>

          {/* Clarity — audio only, hover shows breakdown */}
          <div className="relative group bg-[#FFFBF8] border border-rose-100 p-10 rounded-3xl shadow-md shadow-rose-100/50 flex items-center justify-center overflow-hidden hover:shadow-lg transition">
            <div className="group-hover:hidden">
              <CircularProgress
                value={clarityPercent}
                label="Clarity"
                gradientId="clarityGradient"
              />
            </div>
            <div className="hidden group-hover:flex absolute inset-0 p-8 flex-col justify-center items-center text-center bg-[#FFFBF8] border border-rose-100 transition-all duration-300 rounded-3xl shadow-inner">
              <h3 className="text-xl font-bold text-[#FF5A3C] mb-4">Clarity Analytics</h3>
              <p className="text-sm text-gray-600 font-medium">
                Avg Pause Ratio:{" "}
                <span className="text-black font-semibold">{avgPauseRatio}</span>
              </p>
              <p className="text-sm text-gray-600 mt-2 font-medium">
                Avg Speaking Rate:{" "}
                <span className="text-black font-semibold">{avgSpeakingRate} WPM</span>
              </p>
              <p className="text-sm text-gray-600 mt-2 font-medium">
                Energy Stability:{" "}
                <span className="text-black font-semibold">{avgEnergyVariance}</span>
              </p>
              <p className="text-sm text-gray-600 mt-2 font-medium">
                Avg Fillers Used:{" "}
                <span className="text-black font-semibold">{avgFillerCount}</span>
              </p>
            </div>
          </div>

        </div>

        {/* Detailed Breakdown */}
        <div className="bg-[#FFFBF8] border border-rose-100 p-12 rounded-3xl shadow-md shadow-rose-100/50">
          <h2 className="text-3xl font-bold text-black mb-12">Detailed Breakdown</h2>

          {answers.map((ans, index) => (
            <div key={index} className="mb-12 pb-10 border-b border-rose-100">
              <h3 className="text-xl font-semibold text-[#FF5A3C] mb-4">
                Question {index + 1}
              </h3>

              <p className="mb-6 text-gray-800 leading-relaxed font-medium">
                {ans.question?.question}
              </p>

              <div className="bg-white border border-rose-100 p-6 rounded-2xl mb-5 shadow-xs">
                <p className="text-sm text-gray-500 mb-2 font-medium">Your Response</p>
                <p className="text-gray-800">{ans.transcript}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-600 text-sm font-medium">
                <span>
                  Confidence:{" "}
                  <span className="text-emerald-600 font-bold">
                    {Math.round(((ans.confidenceScore || 0) / 5) * 100)}%
                  </span>
                </span>
                <span>
                  Clarity:{" "}
                  <span className="text-rose-600 font-bold">
                    {Math.round(((ans.clarityScore || 0) / 5) * 100)}%
                  </span>
                </span>
                <span>
                  Pause Ratio:{" "}
                  <span className="text-black font-bold">
                    {(ans.pauseRatio || 0).toFixed(2)}
                  </span>
                </span>
                <span>
                  Speaking Rate:{" "}
                  <span className="text-black font-bold">
                    {Math.round(ans.speakingRate || 0)} WPM
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-20 flex justify-center items-center gap-4 flex-wrap">
          <button
            onClick={() => navigate(`/interview-prep/${sessionId}`)}
            className="px-12 py-4 rounded-full bg-[#FFFBF8] text-rose-700 font-semibold shadow-md border border-rose-200 hover:bg-rose-50 transition-all hover:scale-102 cursor-pointer"
          >
            ← Back to Prep
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-12 py-4 rounded-full bg-black text-white font-semibold shadow-md border border-transparent hover:bg-rose-50 hover:text-black hover:border-rose-200 transition-all hover:scale-102 cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

export default Summary;