const questionAnswerPrompt = (
  role,
  experience,
  topicsToFocus,
  description,
  numberOfQuestions
) => `
You are an AI interview preparation system.

CONTEXT:
- Target Role: ${role}
- Years of Experience: ${experience}
- Focus Topics: ${topicsToFocus.join(", ")}
- Session Description / Goals: ${description || "General interview preparation"}

TASK:
- Generate EXACTLY ${numberOfQuestions} interview questions.
- Each question MUST be clearly related to at least one focus topic.
- Difficulty and depth MUST be appropriate for someone with ${experience} of real-world development experience.
- At most ONE question may be a basic definition.
- Prefer questions that test usage, reasoning, debugging, or integration of concepts.

OUTPUT RULES (MANDATORY):
- Output ONLY valid JSON.
- No text before or after the JSON.

REQUIRED FORMAT:
[
  {
    "question": "Question text",
    "answer": "Answer text"
  }
]
`;

const conceptExplainPrompt = (question, answer) => `
You are an AI interview mentor.

CONTEXT:
- Interview Question:
"${question}"

- Candidate was already given this answer:
"${answer}"

TASK:
- Explain the CORE CONCEPT behind the answer.
- Do NOT rephrase the question.
- Do NOT introduce unrelated theory.
- Focus on *why the answer works*, *when to use it*, and *how to explain it in an interview*.
- Use examples or code ONLY if they directly clarify the concept.

OUTPUT RULES (MANDATORY):
- Output ONLY valid JSON.
- No text before or after the JSON.

REQUIRED FORMAT:
{
  "title": "Short concept-focused title",
  "explanation": "Clear, focused explanation expanding on the answer"
}
`;

module.exports = {
  questionAnswerPrompt,
  conceptExplainPrompt
};
