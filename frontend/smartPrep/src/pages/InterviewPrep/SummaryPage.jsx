import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";

/* 🔵 Circular Chart */
const CircularProgress = ({ value, label, gradientId }) => {
  const radius = 90;
  const stroke = 14;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // 1–5 scale → percentage
  const numericValue = Number(value) || 0;
  const percent = (numericValue / 5) * 100;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>

        <circle
          stroke="#1f2937"
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
        <span className="text-4xl font-bold text-white leading-none">
          {Number(value).toFixed(2)}
        </span>
        <span className="text-sm text-gray-400 mt-2">
          {label}
        </span>
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
      const res = await axiosInstance.get(
        `/api/interview/${sessionId}/summary`
      );
      setData(res.data);
    };
    fetchSummary();
  }, [sessionId]);

  if (!data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading AI Analysis...
      </div>
    );

  const {
    totalQuestions,
    totalAnswered,
    averageConfidence,
    averageClarity,
    answers,
  } = data;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0f172a] text-white px-6 py-16">
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-r from-indigo-600/20 via-cyan-500/20 to-purple-600/20 blur-3xl"></div>

      <div className="relative max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            AI Interview Performance Report
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-indigo-400 to-cyan-400 mt-4 rounded-full"></div>
          <p className="text-gray-400 mt-6 text-lg max-w-2xl">
            Comprehensive behavioral intelligence and communication analytics powered by SmartPrep.
          </p>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">

          {/* Completion */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-xl text-center">
            <p className="text-gray-400 mb-4">Completion Rate</p>
            <p className="text-5xl font-bold">
              {totalAnswered}
              <span className="text-gray-400 text-2xl font-medium">
                {" "}/ {totalQuestions}
              </span>
            </p>
          </div>

          {/* Confidence */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl flex items-center justify-center">
            <CircularProgress
              value={averageConfidence}
              label="Confidence"
              gradientId="confidenceGradient"
            />
          </div>

          {/* Clarity */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl flex items-center justify-center">
            <CircularProgress
              value={averageClarity}
              label="Clarity"
              gradientId="clarityGradient"
            />
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-3xl shadow-xl">
          <h2 className="text-3xl font-semibold mb-12">
            Detailed Breakdown
          </h2>

          {answers.map((ans, index) => (
            <div
              key={index}
              className="mb-12 pb-10 border-b border-white/10"
            >
              <h3 className="text-xl font-semibold text-cyan-400 mb-4">
                Question {index + 1}
              </h3>

              <p className="mb-6 text-gray-300 leading-relaxed">
                {ans.question?.question}
              </p>

              {/* User Answer */}
              <div className="bg-black/30 border border-white/10 p-6 rounded-2xl mb-5">
                <p className="text-sm text-gray-400 mb-2">
                  Your Response
                </p>
                <p className="text-gray-200">
                  {ans.transcript}
                </p>
              </div>

              {/* Expected Answer */}
              <div className="bg-indigo-900/30 border border-indigo-500/20 p-6 rounded-2xl mb-5">
                <p className="text-sm text-indigo-300 mb-2">
                  Expected Answer
                </p>
                <p className="text-gray-200">
                  {ans.question?.answer || "No reference answer available."}
                </p>
              </div>

              <div className="flex gap-6 text-gray-400 text-sm">
                <span>
                  Confidence:{" "}
                  <span className="text-green-400 font-semibold">
                    {ans.confidenceScore?.toFixed(2)}
                  </span>
                </span>
                <span>
                  Clarity:{" "}
                  <span className="text-blue-400 font-semibold">
                    {ans.clarityScore?.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-20">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-12 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-black font-semibold shadow-xl hover:scale-105 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Summary;