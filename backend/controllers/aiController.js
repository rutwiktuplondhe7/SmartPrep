const { GoogleGenAI } =  require("@google/genai");
const { questionAnswerPrompt, conceptExplainPrompt} = require("../utils/prompts");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY});


//@desc Generate interview questions and answers using Gemini
//@route POST /api/ai/geenrate-questions
//@access Private
const generateInterviewQuestions = async(req, res) => {
    try{
        const {role, experience, topicsToFocus, numbersOfQuestions } = req.body;
        
        if(!role || !experience || !topicsToFocus || !numbersOfQuestions ){
            return res.status(400).json({ message: "Missing required fields"});

        }
        const prompt = questionAnswerPrompt(role, experience, topicsToFocus, numbersOfQuestions );
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: prompt,
        });

        const rawText = response.response.text();
        // Clean it : Remove ```json and ``` from beginning and end
        const cleannedText = rawText
        .replace(/^```json\s*/, "") //remove starting ```json
        .replace(/```$/, "") // remove ending ```
        .trim(); // remove extra spaces 

        //Now safe to parse 
        const data = JSON.parse(cleannedText);
        return res.status(200).json(data);
        
    }catch (error) {
  console.error("AI ERROR FULL:", {
    message: error.message,
    status: error.status,
    code: error.code,
    details: error.details,
    stack: error.stack,
    raw: error
  });

  return res.status(500).json({
    message: "Failed to generate questions!",
    error: error.message,
    status: error.status,
  });
}
};


//@desc Generate explanation for an interview question
//@route POST /api/ai/generate-explanation
//2access Private
const generateConceptExplanation = async(req, res) => {
    try{
        const {question} = req.body;
        if( !question ){
            return res.send(400).json({ message : "Missing required fields "});
        }

        const prompt =  conceptExplainPrompt(question);

        const response =  await ai.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: prompt,
        });

        const rawText = response.response.text();

        // Clean it : Remove ```json and ``` from beginning and end
        const cleannedText = rawText
        .replace(/^```json\s*/, "") //remove starting ```json
        .replace(/```$/, "") // remove ending ```
        .trim(); // remove extra spaces 

        //Now safe to parse 
        const data = JSON.parse(cleannedText);
        return res.status(200).json(data);
        
        

    }catch(error){
        return res.status(500).json({ message: "Failed to generate explantion!"
            ,error: error.message
        });
    }
};

module.exports = {generateInterviewQuestions,  generateConceptExplanation };