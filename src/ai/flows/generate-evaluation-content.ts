
'use server';

/**
 * @fileOverview Generates evaluation content with mixed question types.
 *
 * - generateEvaluationContent - A function that handles the evaluation content generation process.
 * - GenerateEvaluationInput - The input type for the generateEvaluationContent function.
 * - GenerateEvaluationOutput - The return type for the generateEvaluationContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEvaluationInputSchema = z.object({
  topic: z.string().describe('The specific topic for the evaluation.'),
  bookTitle: z.string().describe('The title of the book to base the evaluation on.'),
  // courseName: z.string().optional().describe('The name of the course for context.'), // Optional for now
});
export type GenerateEvaluationInput = z.infer<typeof GenerateEvaluationInputSchema>;

const TrueFalseQuestionSchema = z.object({
  id: z.string().describe('Unique ID for the question.'),
  type: z.enum(['TRUE_FALSE']).describe('Question type.'),
  questionText: z.string().describe('The text of the true/false question.'),
  correctAnswer: z.boolean().describe('The correct answer (true or false).'),
  explanation: z.string().describe('A brief explanation for the correct answer.'),
});

const MultipleChoiceQuestionSchema = z.object({
  id: z.string().describe('Unique ID for the question.'),
  type: z.enum(['MULTIPLE_CHOICE']).describe('Question type.'),
  questionText: z.string().describe('The text of the multiple-choice question.'),
  options: z.array(z.string()).length(4).describe('An array of exactly 4 string options (A, B, C, D).'),
  correctAnswerIndex: z.number().min(0).max(3).describe('The 0-based index of the correct option in the options array.'),
  explanation: z.string().describe('A brief explanation for the correct answer.'),
});

const EvaluationQuestionSchema = z.union([TrueFalseQuestionSchema, MultipleChoiceQuestionSchema]);
export type EvaluationQuestion = z.infer<typeof EvaluationQuestionSchema>;

const GenerateEvaluationOutputSchema = z.object({
  evaluationTitle: z.string().describe('The title of the evaluation, formatted as "EVALUACIÓN - [TOPIC_NAME_IN_UPPERCASE]".'),
  questions: z.array(EvaluationQuestionSchema).describe('An array of evaluation questions, with a mix of types. The prompt requests 3 questions total (1 True/False, 2 Multiple Choice).'),
});
export type GenerateEvaluationOutput = z.infer<typeof GenerateEvaluationOutputSchema>;


export async function generateEvaluationContent(input: GenerateEvaluationInput): Promise<GenerateEvaluationOutput> {
  return generateEvaluationFlow(input);
}

const generateEvaluationPrompt = ai.definePrompt({
  name: 'generateEvaluationPrompt',
  input: {schema: GenerateEvaluationInputSchema.extend({ topic_uppercase: z.string() })},
  output: {schema: GenerateEvaluationOutputSchema},
  prompt: `You are an expert educator creating an evaluation.
Based on the book titled "{{bookTitle}}", generate an evaluation for the topic "{{topic}}".
The language for all content MUST be Spanish.

The evaluation must adhere to the following structure:
1.  **Evaluation Title**: The title must be "EVALUACIÓN - {{topic_uppercase}}".
2.  **Total Questions**: Generate exactly 3 unique questions.
3.  **Question Types**:
    *   Generate exactly 1 True/False question.
    *   Generate exactly 2 Multiple Choice questions.
4.  **For each question, ensure you provide**:
    *   \`id\`: A unique string identifier for the question (e.g., "q1", "q2", "q3").
    *   \`type\`: Set to "TRUE_FALSE" for true/false questions, or "MULTIPLE_CHOICE" for multiple-choice questions.
    *   \`questionText\`: The clear and concise text of the question.
    *   \`explanation\`: A brief and clear explanation for why the correct answer is correct, referencing concepts from the book "{{bookTitle}}" if possible.
5.  **Specifics for True/False Questions**:
    *   \`correctAnswer\`: A boolean value (\`true\` or \`false\`).
6.  **Specifics for Multiple Choice Questions**:
    *   \`options\`: An array of exactly 4 distinct string options. Label them implicitly as A, B, C, D for the user, but just provide the string array.
    *   \`correctAnswerIndex\`: A number from 0 to 3 indicating the index of the correct option in the 'options' array.

Example of a True/False question structure:
{
  "id": "q1",
  "type": "TRUE_FALSE",
  "questionText": "El sol gira alrededor de la tierra.",
  "correctAnswer": false,
  "explanation": "La tierra gira alrededor del sol, según el modelo heliocéntrico."
}

Example of a Multiple Choice question structure:
{
  "id": "q2",
  "type": "MULTIPLE_CHOICE",
  "questionText": "¿Cuál es la capital de Francia?",
  "options": ["Londres", "París", "Berlín", "Madrid"],
  "correctAnswerIndex": 1,
  "explanation": "París es la capital y ciudad más poblada de Francia."
}

Ensure all questions are relevant to the topic "{{topic}}" as covered in the book "{{bookTitle}}".
The output must be a valid JSON object matching the specified output schema.
`,
});

const generateEvaluationFlow = ai.defineFlow(
  {
    name: 'generateEvaluationFlow',
    inputSchema: GenerateEvaluationInputSchema,
    outputSchema: GenerateEvaluationOutputSchema,
  },
  async (input: GenerateEvaluationInput): Promise<GenerateEvaluationOutput> => {
    const promptInput = {
      ...input,
      topic_uppercase: input.topic.toUpperCase(),
    };
    const {output} = await generateEvaluationPrompt(promptInput);

    if (!output || !output.questions || output.questions.length !== 3) {
      console.error('AI response:', JSON.stringify(output, null, 2));
      throw new Error('AI failed to generate the required 3 evaluation questions or the format is incorrect.');
    }
    // Ensure IDs are unique if AI doesn't do it reliably, though prompt asks for it.
    // For now, trust the prompt's instruction for unique IDs.
    return output;
  }
);

