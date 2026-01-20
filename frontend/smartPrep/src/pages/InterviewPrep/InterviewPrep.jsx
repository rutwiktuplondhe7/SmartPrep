import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from "framer-motion";
import { LuCircleAlert, LuListCollapse } from 'react-icons/lu';
import SpinnerLoader from '../../components/Loader/SpinnerLoader';
import { toast } from "react-hot-toast";
import DashboardLayout from '../../components/layouts/DashboardLayout';
import RoleInfoHeader from './components/RoleInfoHeader';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import QuestionCard from "../../components/Cards/QuestionCard";
import AIResponsePreview from './components/AIResponsePreview';
import Drawer from '../../components/Drawer';
import SkeletonLoader from '../../components/Loader/SkeletonLoader';

const InterviewPrep = () => {
  const { sessionId } = useParams();

  const [sessionData, setSessionData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [openLeanMoreDrawer, setOpenLeanMoreDrawer] = useState(false);
  const [explanation, setExplanation] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdateLoader, setIsUpdateLoader] = useState(false);

  const FREE_AI_PREVIEW_MESSAGE =
    "SmartPrep is running on limited free AI capacity. You’ve reached the free preview limit for this feature.";

  const getGracefulAIError = (error, fallback) => {
    const code = error?.response?.data?.code;
    const message = error?.response?.data?.message;

    if (code === "AI_PREVIEW_LIMIT_REACHED") {
      return message || FREE_AI_PREVIEW_MESSAGE;
    }

    return message || error?.message || fallback;
  };

  const isPreviewLimitError = (error) => {
    return error?.response?.data?.code === "AI_PREVIEW_LIMIT_REACHED";
  };

  // Fetch Session data by session id
  const fetchSessionDetailsById = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.SESSION.GET_ONE(sessionId)
      );
      if (response.data && response.data.session) {
        setSessionData(response.data.session);
      }
    } catch (error) {
      console.error("Error: ", error);
    }
  };

  // Generate Concept Explanation
  const generateConceptExplanation = async (questionId, question, answer) => {
    try {
      setErrorMsg("");
      setExplanation(null);
      setIsLoading(true);
      setOpenLeanMoreDrawer(true);

      const response = await axiosInstance.post(
        API_PATHS.AI.GENERATE_EXPLANATION,
        { question, answer }
      );

      if (response.data) {
        setExplanation(response.data);

        if (questionId) {
          try {
            await axiosInstance.post(API_PATHS.QUESTION.LEARN_MORE(questionId));
            fetchSessionDetailsById();
          } catch (err) {
            console.error("Failed to increment learnMoreCount:", err);
          }
        }
      }
    } catch (error) {
      const msg = getGracefulAIError(error, "Failed to generate explanation.");

      if (isPreviewLimitError(error)) {
        setOpenLeanMoreDrawer(false);
        setIsLoading(false);
        toast.error(msg);
        return;
      }

      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Pin Question
  const toggleQuestionPinStatus = async (questionId) => {
    try {
      const response = await axiosInstance.post(
        API_PATHS.QUESTION.PIN(questionId)
      );

      if (response.data && response.data.question) {
        fetchSessionDetailsById();
      }
    } catch (error) {
      console.error("Error: ", error);
    }
  };

  // Add more questions to a session
  const uploadMoreQuestions = async () => {
    try {
      setErrorMsg("");
      setIsUpdateLoader(true);

      const aiResponse = await axiosInstance.post(
        API_PATHS.AI.GENERATE_QUESTIONS,
        {
          role: sessionData?.role,
          experience: sessionData?.experience,
          topicsToFocus: Array.isArray(sessionData?.topicToFocus)
            ? sessionData.topicToFocus
            : [sessionData.topicToFocus],
          description: sessionData?.description,
          numbersOfQuestions: 5,
          purpose: "loadMoreQuestions",
        }
      );

      const generatedQuestions = Array.isArray(aiResponse.data)
        ? aiResponse.data.filter(
          (q) =>
            q &&
            typeof q.question === "string" &&
            typeof q.answer === "string"
        )
        : [];

      if (!generatedQuestions.length) {
        throw new Error("AI returned invalid questions");
      }

      const response = await axiosInstance.post(
        API_PATHS.QUESTION.ADD_TO_SESSION,
        {
          sessionId,
          questions: generatedQuestions,
        }
      );

      if (response.data) {
        toast.success("Added More Q&A!!");
        fetchSessionDetailsById();
      }
    } catch (error) {
      const msg = getGracefulAIError(error, "Something went wrong. Please try again.");
      toast.error(msg);
    } finally {
      setIsUpdateLoader(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetailsById();
    }
    return () => { };
  }, []);

  return (
    <DashboardLayout>
      <RoleInfoHeader
        isDrawerOpen={openLeanMoreDrawer}
        role={sessionData?.role || ""}
        topicToFocus={sessionData?.topicToFocus || ""}
        experience={sessionData?.experience || "-"}
        questions={sessionData?.questions?.length || "-"}
        description={sessionData?.description || ""}
        lastUpdated={
          sessionData?.updatedAt
            ? moment(sessionData.updatedAt).format("Do MMM YYYY")
            : ""
        }
      />

      <div className='container mx-auto pt-4 pb-4 px-4'>
        <div className='grid grid-cols-12 gap-4 mt-5 mb-10'>
          <div
            className={`
              col-span-12
              ${openLeanMoreDrawer
                ? "md:col-span-6 md:col-start-2"
                : "md:col-span-10 md:col-start-2"
              }
            `}
          >
            <h2 className='text-lg font-semibold text-black mb-4'>
              Interview Q & A
            </h2>

            <AnimatePresence>
              {sessionData?.questions?.map((data, index) => {
                return (
                  <motion.div
                    key={data._id || index}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.4,
                      type: "spring",
                      stiffness: 100,
                      delay: index * 0.1,
                      damping: 15,
                    }}
                    layout
                    layoutId={`question-${data._id || index}`}
                  >
                    <>
                      <QuestionCard
                        question={data?.question}
                        answer={data?.answer}
                        onLearnMore={() =>
                          generateConceptExplanation(data._id, data.question, data.answer)
                        }
                        isPinned={data?.isPinned}
                        onTogglePin={() => toggleQuestionPinStatus(data._id)}
                      />

                      {!isLoading &&
                        sessionData?.questions?.length === index + 1 && (
                          <div className='flex items-center justify-center mt-5'>
                            <button
                              className='flex items-center gap-3 text-sm text-white font-medium bg-black px-5 py-2 mr-2 rounded text-nowrap cursor-pointer'
                              disabled={isLoading || isUpdateLoader}
                              onClick={uploadMoreQuestions}
                            >
                              {isUpdateLoader ? (
                                <SpinnerLoader />
                              ) : (
                                <LuListCollapse className='text-lg' />
                              )}{" "}
                              Load More
                            </button>
                          </div>
                        )}
                    </>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <Drawer
          isOpen={openLeanMoreDrawer}
          onClose={() => setOpenLeanMoreDrawer(false)}
          title={!isLoading && explanation?.title}
        >
          {errorMsg && (
            <p className='flex gap-2 text-sm text-rose-600 font-medium'>
              <LuCircleAlert className='mt-1' />
              {errorMsg}
            </p>
          )}

          {isLoading && <SkeletonLoader />}

          {!isLoading && explanation && (
            <AIResponsePreview content={explanation?.explanation} />
          )}
        </Drawer>
      </div>
    </DashboardLayout>
  );
};

export default InterviewPrep;
