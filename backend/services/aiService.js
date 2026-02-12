const axios = require("axios");

exports.generateQuestionsFromAI = async ({
  role,
  experience,
  topicsToFocus,
  description,
  numberOfQuestions = 5,
}) => {
  try {
    const response = await axios.post(
      process.env.OPENROUTER_URL,
      {
        model: process.env.OPENROUTER_MODEL,
        messages: [
          {
            role: "user",
            content: `
Generate ${numberOfQuestions} interview questions with structured JSON output.

Role: ${role}
Experience: ${experience}
Topics: ${topicsToFocus.join(", ")}
Description: ${description}

Return JSON format:
[
  { "question": "...", "answer": "..." }
]
            `,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const rawContent = response.data.choices[0].message.content;

    return JSON.parse(rawContent);
  } catch (error) {
    console.error("AI generation error:", error);
    throw new Error("AI question generation failed");
  }
};
