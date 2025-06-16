// src/ai/flows/generate-quiz.ts
'use server';

/**
 * @fileOverview Generates a quiz on a specific topic from a selected book.
 * The quiz will have 15 questions, multiple-choice answers, indication of the correct answer, and an explanation.
 *
 * - generateQuiz - A function that handles the quiz generation process.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function (formatted HTML string).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  topic: z.string().describe('The topic for the quiz.'),
  bookTitle: z.string().describe('The title of the book.'),
  courseName: z.string().describe('The name of the course (used for context if needed).'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

// Schema for the structured output expected from the AI prompt
const QuestionSchema = z.object({
  questionText: z.string().describe('The text of the question.'),
  options: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }).describe('The multiple choice options (A, B, C, D).'),
  correctOption: z.enum(['A', 'B', 'C', 'D']).describe('The letter of the correct option.'),
  explanation: z.string().describe('A brief explanation of why the correct answer is correct, based on the book content.'),
});

const AiPromptOutputSchema = z.object({
  quizTitle: z.string().describe('The title of the quiz, formatted as "CUESTIONARIO - [TOPIC_NAME_IN_UPPERCASE]".'),
  questions: z.array(QuestionSchema).length(15).describe('An array of exactly 15 quiz questions.'),
});

// Schema for the final output of the flow (formatted HTML string)
const GenerateQuizOutputSchema = z.object({
  quiz: z.string().describe('The generated quiz as a formatted HTML string.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;


export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema.extend({ topic_uppercase: z.string() })}, // Add topic_uppercase for the prompt
  output: {schema: AiPromptOutputSchema},
  prompt: `You are an expert educator and curriculum designer. Your task is to generate a comprehensive quiz based on your knowledge of the book titled "{{bookTitle}}", focusing on the specific topic "{{topic}}".

The quiz MUST adhere to the following structure:
1.  **Quiz Title**: The title must be exactly "CUESTIONARIO - {{topic_uppercase}}".
2.  **Number of Questions**: Generate exactly 15 unique multiple-choice questions.
3.  **For each question, provide**:
    *   \`questionText\`: The clear and concise text of the question.
    *   \`options\`: An object with four distinct options labeled A, B, C, and D.
    *   \`correctOption\`: The letter (A, B, C, or D) corresponding to the correct answer.
    *   \`explanation\`: A brief but informative explanation of why the correct answer is correct, referencing concepts from the book "{{bookTitle}}" where possible. Ensure the explanation helps in understanding the topic.

All content (questions, options, explanations) should be directly relevant to the topic "{{topic}}" as covered in the book "{{bookTitle}}". Ensure the options are plausible distractors. Ensure the language of the quiz is Spanish.
  `,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema, // Flow returns the HTML string
  },
  async (input: GenerateQuizInput) => {
    const promptInput = {
      ...input,
      topic_uppercase: input.topic.toUpperCase(),
    };
    const {output} = await generateQuizPrompt(promptInput);

    if (!output || !output.questions || output.questions.length === 0) {
      throw new Error('AI failed to generate quiz questions.');
    }

    let formattedQuizHtml = `<h2>${output.quizTitle}</h2><br />`;
    output.questions.forEach((q, index) => {
      formattedQuizHtml += `<p><strong>${index + 1}. ${q.questionText}</strong></p>`;
      formattedQuizHtml += `<ul style="list-style-type: none; padding-left: 0;">`;
      formattedQuizHtml += `<li>A) ${q.options.A}</li>`;
      formattedQuizHtml += `<li>B) ${q.options.B}</li>`;
      formattedQuizHtml += `<li>C) ${q.options.C}</li>`;
      formattedQuizHtml += `<li>D) ${q.options.D}</li>`;
      formattedQuizHtml += `</ul>`;
      formattedQuizHtml += `<p style="margin-top: 0.5em;"><strong>Respuesta Correcta:</strong> ${q.correctOption}</p>`;
      formattedQuizHtml += `<p style="margin-top: 0.25em;"><em>Explicación:</em> ${q.explanation}</p>`;
      if (index < output.questions.length - 1) {
        formattedQuizHtml += '<hr style="margin-top: 1rem; margin-bottom: 1rem; border-top: 1px solid #e5e7eb;" /><br />';
      }
    });

    return { quiz: formattedQuizHtml };
  }
);
