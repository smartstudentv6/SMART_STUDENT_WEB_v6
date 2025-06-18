
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

// Extended schema for dynamic evaluation with PDF content
const GenerateDynamicEvaluationInputSchema = z.object({
  topic: z.string().describe('The specific topic for the evaluation.'),
  bookTitle: z.string().describe('The title of the book to base the evaluation on.'),
  language: z.enum(['es', 'en']).describe('The language for the evaluation content (e.g., "es" for Spanish, "en" for English).'),
  pdfContent: z.string().describe('The actual content extracted from the PDF book.'),
  timestamp: z.number().describe('Timestamp to ensure uniqueness.'),
  randomSeed: z.number().describe('Random seed to ensure variability in questions.'),
});
type GenerateDynamicEvaluationInput = z.infer<typeof GenerateDynamicEvaluationInputSchema>;

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

const MultipleSelectionQuestionSchema = z.object({
  id: z.string().describe('Unique ID for the question.'),
  type: z.enum(['MULTIPLE_SELECTION']).describe('Question type.'),
  questionText: z.string().describe('The text of the multiple-selection question.'),
  options: z.array(z.string()).length(4).describe('An array of exactly 4 string options (A, B, C, D).'),
  correctAnswerIndices: z.array(z.number()).min(2).max(3).describe('An array of 2-3 indices indicating the correct options (multiple correct answers).'),
  explanation: z.string().describe('A brief explanation for why those specific answers are correct.'),
});

const EvaluationQuestionSchema = z.union([TrueFalseQuestionSchema, MultipleChoiceQuestionSchema, MultipleSelectionQuestionSchema]);
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

// New dynamic prompt that uses PDF content
const generateDynamicEvaluationPrompt = ai.definePrompt({
  name: 'generateDynamicEvaluationPrompt',
  input: {schema: GenerateDynamicEvaluationInputSchema.extend({ topic_uppercase: z.string(), title_prefix: z.string() })},
  output: {schema: GenerateEvaluationOutputSchema},
  config: { 
    temperature: 0.9, // Higher temperature for more varied output
  },
  prompt: `You are an expert educator creating a dynamic evaluation based on actual PDF content.
Based on the book titled "{{bookTitle}}" and the following PDF CONTENT, generate a completely unique evaluation for the topic "{{topic}}".

PDF CONTENT:
{{pdfContent}}

GENERATION PARAMETERS (to ensure uniqueness):
- Timestamp: {{timestamp}}
- Random Seed: {{randomSeed}}

CRITICAL INSTRUCTIONS:
1. Use the actual PDF content above to create questions that are SPECIFIC to what is written in this book
2. Each time you generate questions, they must be COMPLETELY DIFFERENT from any previous generation
3. Use the timestamp {{timestamp}} and random seed {{randomSeed}} to ensure variability
4. Focus on different aspects, chapters, examples, or details from the PDF content each time
5. The language for all content (title, questions, options, explanations) MUST be {{{language}}}

The evaluation must adhere to the following structure:
1.  **Evaluation Title**: The title must be "{{title_prefix}} - {{topic_uppercase}}".
2.  **Total Questions**: Generate exactly 3 unique questions based on the PDF content above.
3.  **Question Types** (EXACTLY 1 OF EACH):
    *   Generate exactly 1 True/False question (type: "TRUE_FALSE")
    *   Generate exactly 1 Multiple Choice question (type: "MULTIPLE_CHOICE") - single correct answer
    *   Generate exactly 1 Multiple Selection question (type: "MULTIPLE_SELECTION") - multiple correct answers
4.  **For each question, ensure you provide**:
    *   \`id\`: A unique string identifier including the timestamp (e.g., "q1_{{timestamp}}", "q2_{{timestamp}}", "q3_{{timestamp}}").
    *   \`type\`: Set to "TRUE_FALSE", "MULTIPLE_CHOICE", or "MULTIPLE_SELECTION".
    *   \`questionText\`: The clear and concise text of the question, referencing specific content from the PDF.
    *   \`explanation\`: A brief explanation referencing the specific part of the PDF content where this information can be found.
5.  **Specifics for True/False Questions**:
    *   \`correctAnswer\`: A boolean value (\`true\` or \`false\`).
6.  **Specifics for Multiple Choice Questions (single answer)**:
    *   \`options\`: An array of exactly 4 distinct string options based on the PDF content.
    *   \`correctAnswerIndex\`: A number from 0 to 3 indicating the index of the correct option.
7.  **Specifics for Multiple Selection Questions (multiple answers)**:
    *   \`options\`: An array of exactly 4 distinct string options based on the PDF content.
    *   \`correctAnswerIndices\`: An array of 2-3 numbers (0-3) indicating the indices of the correct options.

Example of a Multiple Selection question structure (if language is "es"):
{
  "id": "q3_{{timestamp}}",
  "type": "MULTIPLE_SELECTION",
  "questionText": "¿Cuáles de las siguientes son características del sistema respiratorio? (Selecciona todas las correctas)",
  "options": ["Intercambia gases", "Produce insulina", "Filtra la sangre", "Transporta oxígeno"],
  "correctAnswerIndices": [0, 3],
  "explanation": "El sistema respiratorio intercambia gases y transporta oxígeno, pero no produce insulina ni filtra la sangre."
}

ENSURE UNIQUENESS: Use different sections, examples, concepts, or details from the PDF content each time. Never repeat the same question structure or content. The random seed {{randomSeed}} should influence which parts of the PDF content you focus on.

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

// New dynamic flow that uses PDF content
const generateDynamicEvaluationFlow = ai.defineFlow(
  {
    name: 'generateDynamicEvaluationFlow',
    inputSchema: GenerateDynamicEvaluationInputSchema,
    outputSchema: GenerateEvaluationOutputSchema,
  },
  async (input: GenerateDynamicEvaluationInput): Promise<GenerateEvaluationOutput> => {
    const titlePrefix = input.language === 'es' ? 'EVALUACIÓN' : 'EVALUATION';
    const promptInput = {
      ...input,
      topic_uppercase: input.topic.toUpperCase(),
      title_prefix: titlePrefix,
    };
    const {output} = await generateDynamicEvaluationPrompt(promptInput);

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

// Export both functions
export { type EvaluationQuestion };

// New export for dynamic evaluation
export async function generateDynamicEvaluationContent(input: GenerateDynamicEvaluationInput): Promise<GenerateEvaluationOutput> {
  try {
    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'your_google_api_key_here') {
      // Return mock data with uniqueness for development
      const timestamp = input.timestamp || Date.now();
      const randomSeed = input.randomSeed || Math.floor(Math.random() * 1000);
      
      return {
        evaluationTitle: `${input.language === 'es' ? 'EVALUACIÓN' : 'EVALUATION'} - ${input.topic.toUpperCase()}`,
        questions: [
          {
            id: `q1_${timestamp}_${randomSeed}`,
            type: 'TRUE_FALSE',
            questionText: input.language === 'es' 
              ? `¿El tema "${input.topic}" está relacionado con "${input.bookTitle}"? (Pregunta única #${randomSeed})`
              : `Is the topic "${input.topic}" related to "${input.bookTitle}"? (Unique question #${randomSeed})`,
            correctAnswer: true,
            explanation: input.language === 'es'
              ? `Esta es una pregunta dinámica generada basada en el contenido del PDF. ID: ${timestamp}`
              : `This is a dynamic question generated based on PDF content. ID: ${timestamp}`
          },
          {
            id: `q2_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_CHOICE',
            questionText: input.language === 'es'
              ? `¿Cuál es un concepto clave de "${input.topic}" según el PDF? (Versión ${randomSeed})`
              : `What is a key concept of "${input.topic}" according to the PDF? (Version ${randomSeed})`,
            options: input.language === 'es'
              ? [`Concepto A-${randomSeed}`, `Concepto B-${randomSeed}`, `Concepto C-${randomSeed}`, `Concepto D-${randomSeed}`]
              : [`Concept A-${randomSeed}`, `Concept B-${randomSeed}`, `Concept C-${randomSeed}`, `Concept D-${randomSeed}`],
            correctAnswerIndex: randomSeed % 4,
            explanation: input.language === 'es'
              ? `Pregunta generada dinámicamente basada en el contenido específico del PDF. Timestamp: ${timestamp}`
              : `Dynamically generated question based on specific PDF content. Timestamp: ${timestamp}`
          },
          {
            id: `q3_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_SELECTION',
            questionText: input.language === 'es'
              ? `¿Cuáles de las siguientes características pertenecen a "${input.topic}"? (Selecciona todas las correctas - Variación ${randomSeed})`
              : `Which of the following characteristics belong to "${input.topic}"? (Select all correct - Variation ${randomSeed})`,
            options: input.language === 'es'
              ? [`Característica A-${randomSeed}`, `Característica B-${randomSeed}`, `Característica C-${randomSeed}`, `Característica D-${randomSeed}`]
              : [`Feature A-${randomSeed}`, `Feature B-${randomSeed}`, `Feature C-${randomSeed}`, `Feature D-${randomSeed}`],
            correctAnswerIndices: [0, 2], // First and third options are correct
            explanation: input.language === 'es'
              ? `Esta pregunta de selección múltiple se basa en características extraídas del PDF. Seed: ${randomSeed}`
              : `This multiple selection question is based on features extracted from the PDF. Seed: ${randomSeed}`
          }
        ]
      };
    }
    
    return await generateDynamicEvaluationFlow(input);
  } catch (error) {
    console.error('Error generating dynamic evaluation content:', error);
    // Return fallback data with uniqueness
    const timestamp = input.timestamp || Date.now();
    const randomSeed = input.randomSeed || Math.floor(Math.random() * 1000);
    
    return {
      evaluationTitle: `${input.language === 'es' ? 'EVALUACIÓN' : 'EVALUATION'} - ${input.topic.toUpperCase()}`,
      questions: [
        {
          id: `fallback_tf_${timestamp}_${randomSeed}`,
          type: 'TRUE_FALSE',
          questionText: input.language === 'es'
            ? `Pregunta de respaldo V/F para "${input.topic}". ¿Esta pregunta es única? (ID: ${randomSeed})`
            : `Fallback T/F question for "${input.topic}". Is this question unique? (ID: ${randomSeed})`,
          correctAnswer: true,
          explanation: input.language === 'es'
            ? `Pregunta V/F generada como respaldo debido a un error en la API. Timestamp: ${timestamp}`
            : `T/F fallback question generated due to API error. Timestamp: ${timestamp}`
        },
        {
          id: `fallback_mc_${timestamp}_${randomSeed}`,
          type: 'MULTIPLE_CHOICE',
          questionText: input.language === 'es'
            ? `Pregunta de respaldo de alternativas para "${input.topic}". ¿Cuál es correcta? (ID: ${randomSeed})`
            : `Fallback multiple choice question for "${input.topic}". Which is correct? (ID: ${randomSeed})`,
          options: input.language === 'es'
            ? [`Opción A-${randomSeed}`, `Opción B-${randomSeed}`, `Opción C-${randomSeed}`, `Opción D-${randomSeed}`]
            : [`Option A-${randomSeed}`, `Option B-${randomSeed}`, `Option C-${randomSeed}`, `Option D-${randomSeed}`],
          correctAnswerIndex: randomSeed % 4,
          explanation: input.language === 'es'
            ? `Pregunta de alternativas generada como respaldo. Timestamp: ${timestamp}`
            : `Multiple choice fallback question generated. Timestamp: ${timestamp}`
        },
        {
          id: `fallback_ms_${timestamp}_${randomSeed}`,
          type: 'MULTIPLE_SELECTION',
          questionText: input.language === 'es'
            ? `Pregunta de respaldo de selección múltiple para "${input.topic}". ¿Cuáles son correctas? (ID: ${randomSeed})`
            : `Fallback multiple selection question for "${input.topic}". Which are correct? (ID: ${randomSeed})`,
          options: input.language === 'es'
            ? [`Elemento A-${randomSeed}`, `Elemento B-${randomSeed}`, `Elemento C-${randomSeed}`, `Elemento D-${randomSeed}`]
            : [`Element A-${randomSeed}`, `Element B-${randomSeed}`, `Element C-${randomSeed}`, `Element D-${randomSeed}`],
          correctAnswerIndices: [0, 2],
          explanation: input.language === 'es'
            ? `Pregunta de selección múltiple generada como respaldo. Timestamp: ${timestamp}`
            : `Multiple selection fallback question generated. Timestamp: ${timestamp}`
        }
      ]
    };
  }
}
