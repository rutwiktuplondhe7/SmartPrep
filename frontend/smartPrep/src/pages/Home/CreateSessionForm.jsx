import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/Inputs/Input";
import SpinnerLoader from "../../components/Loader/SpinnerLoader";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";

const CreateSessionForm = () => {
  const [formData, setFormData] = useState({
    role: "",
    experience: "",
    topicsToFocus: "",
    description: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const FREE_AI_PREVIEW_MESSAGE =
    "SmartPrep is running on limited free AI capacity. You’ve reached the free preview limit for this feature.";

  const getGracefulAIError = (err, fallback) => {
    const code = err?.response?.data?.code;
    const message = err?.response?.data?.message;

    if (code === "AI_PREVIEW_LIMIT_REACHED") {
      return message || FREE_AI_PREVIEW_MESSAGE;
    }

    return message || fallback;
  };

  const handleChange = (key, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [key]: value,
    }));
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();

    const { role, experience, topicsToFocus } = formData;

    if (!role || !experience || !topicsToFocus) {
      setError("Please fill all the required fields!");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
     const topicsArray = topicsToFocus.split(",").map(t => t.trim()).filter(Boolean);
     
     const aiResponse = await axiosInstance.post(API_PATHS.AI.GENERATE_QUESTIONS, {
                role,
                experience,
                topicsToFocus: topicsArray,
                description: formData.description,
                numbersOfQuestions: 5,
                purpose: "createSession",
      }

    
    
    );

      const generateQuestions = aiResponse.data;

      const response = await axiosInstance.post(API_PATHS.SESSION.CREATE, {
        ...formData,
        questions: generateQuestions,
      });

      if (response.data?.session?._id) {
        navigate(`/interview-prep/${response.data?.session._id}`);
      }
    } catch (err) {
      setError(
        getGracefulAIError(err, "Something went wrong. Please try again.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[92vw] md:w-[36vw] p-7 flex flex-col justify-center">
      <h3 className="text-xl font-bold text-black">
        Start a New Interview Journey
      </h3>

      <p className="text-[13px] font-medium text-slate-700 mt-2 mb-6">
        Fill out a few quick details and unlock your personalized set of interview questions.
      </p>

      <form onSubmit={handleCreateSession} className="flex flex-col gap-3">
        <Input
          value={formData.role}
          onChange={({ target }) => handleChange("role", target.value)}
          label="Target Role"
          placeholder="(e.g. Frontend Developer, UI/UX Designer, etc)"
          type="text"
        />

        <Input
          value={formData.experience}
          onChange={({ target }) => handleChange("experience", target.value)}
          label="Years of Experience"
          placeholder="(e.g. 1, 2, etc)"
          type="number"
        />

        <Input
          value={formData.topicsToFocus}
          onChange={({ target }) => handleChange("topicsToFocus", target.value)}
          label="Topics to Focus On"
          placeholder="(Comma-separated, e.g. React, Node.js, MongoDB)"
          type="text"
        />

        <Input
          value={formData.description}
          onChange={({ target }) => handleChange("description", target.value)}
          label="Description (optional)"
          placeholder="(Any specific goals or notes for this session)"
          type="text"
        />

        {error && (
          <p className="text-rose-600 text-[13px] font-medium pt-1">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full mt-3"
          disabled={isLoading}
        >
          <div className="flex items-center justify-center gap-3">
            {isLoading && <SpinnerLoader />}
            <span>{isLoading ? "Creating..." : "Create Session"}</span>
          </div>
        </button>
      </form>
    </div>
  );
};

export default CreateSessionForm;
