
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
  language: z.enum(['es', 'en']).describe('The language for the evaluation content (e.g., "es" for Spanish, "en" for English).'),
});
type GenerateEvaluationInput = z.infer<typeof GenerateEvaluationInputSchema>;

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
type EvaluationQuestion = z.infer<typeof EvaluationQuestionSchema>;

const GenerateEvaluationOutputSchema = z.object({
  evaluationTitle: z.string().describe('The title of the evaluation, formatted as "EVALUACIÓN - [TOPIC_NAME_IN_UPPERCASE]" if language is "es", or "EVALUATION - [TOPIC_NAME_IN_UPPERCASE]" if language is "en".'),
  questions: z.array(EvaluationQuestionSchema).describe('An array of evaluation questions, with a mix of types. The prompt requests 3 questions total (1 True/False, 2 Multiple Choice).'),
});
type GenerateEvaluationOutput = z.infer<typeof GenerateEvaluationOutputSchema>;


export async function generateEvaluationContent(input: GenerateEvaluationInput): Promise<GenerateEvaluationOutput> {
  try {
    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'your_google_api_key_here') {
      // Return mock data for development
      return {
        title: `Evaluación - ${input.topic.toUpperCase()}`,
        questions: [
          {
            id: 1,
            type: 'true_false',
            question: `¿El tema "${input.topic}" está relacionado con "${input.bookTitle}"?`,
            options: [],
            correct_answer: true,
            explanation: 'Esta es una pregunta de ejemplo mientras se configura la API.'
          },
          {
            id: 2,
            type: 'multiple_choice',
            question: `¿Cuál es el concepto principal de "${input.topic}"?`,
            options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
            correct_answer: 0,
            explanation: 'Esta es una pregunta de ejemplo mientras se configura la API.'
          },
          {
            id: 3,
            type: 'multiple_choice',
            question: `¿Qué aplicación práctica tiene "${input.topic}"?`,
            options: ['Aplicación 1', 'Aplicación 2', 'Aplicación 3', 'Aplicación 4'],
            correct_answer: 1,
            explanation: 'Esta es una pregunta de ejemplo mientras se configura la API.'
          }
        ]
      };
    }
    
    return await generateEvaluationFlow(input);
  } catch (error) {
    console.error('Error generating evaluation content:', error);
    // Return fallback data
    return {
      title: `Evaluación - ${input.topic.toUpperCase()}`,
      questions: [
        {
          id: 1,
          type: 'true_false',
          question: `¿El tema "${input.topic}" está relacionado con "${input.bookTitle}"?`,
          options: [],
          correct_answer: true,
          explanation: 'Pregunta generada como respaldo debido a un error en la API.'
        }
      ]
    };
  }
}

const generateEvaluationPrompt = ai.definePrompt({
  name: 'generateEvaluationPrompt',
  input: {schema: GenerateEvaluationInputSchema.extend({ topic_uppercase: z.string(), title_prefix: z.string() })},
  output: {schema: GenerateEvaluationOutputSchema},
  config: { 
    temperature: 0.7, // Increased temperature for more varied output
  },
  prompt: `You are an expert educator creating an evaluation.
Based on the book titled "{{bookTitle}}", generate an evaluation for the topic "{{topic}}".
The language for all content (title, questions, options, explanations) MUST be {{{language}}}.

The evaluation must adhere to the following structure:
1.  **Evaluation Title**: The title must be "{{title_prefix}} - {{topic_uppercase}}".
2.  **Total Questions**: Generate exactly 3 unique questions. It is CRITICAL that you generate a COMPLETELY NEW and UNIQUE set of questions for this topic from this book, different from any set you might have generated previously for the same inputs. Do not repeat questions or question structures you may have used before for this specific topic and book. Avoid repetition.
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

Example of a True/False question structure (if language is "es"):
{
  "id": "q1",
  "type": "TRUE_FALSE",
  "questionText": "El sol gira alrededor de la tierra.",
  "correctAnswer": false,
  "explanation": "La tierra gira alrededor del sol, según el modelo heliocéntrico."
}

Example of a Multiple Choice question structure (if language is "es"):
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
    const titlePrefix = input.language === 'es' ? 'EVALUACIÓN' : 'EVALUATION';
    const promptInput = {
      ...input,
      topic_uppercase: input.topic.toUpperCase(),
      title_prefix: titlePrefix,
    };
    const {output} = await generateEvaluationPrompt(promptInput);

    if (!output || !output.questions || output.questions.length !== 3) {
      console.error('AI response:', JSON.stringify(output, null, 2));
      if (output && output.questions) {
        console.error(`Expected 3 questions, but received ${output.questions.length}.`);
      }
      throw new Error(
        `AI failed to generate the required 3 evaluation questions or the format is incorrect. Expected 3, got ${output?.questions?.length || 0}.`
      );
    }
    return output;
  }
);
