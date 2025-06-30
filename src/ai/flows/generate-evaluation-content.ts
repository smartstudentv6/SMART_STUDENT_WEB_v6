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
  questionCount: z.number().optional().describe('Number of questions to generate (default: 15)'),
  timeLimit: z.number().optional().describe('Time limit in seconds (default: 120)'),
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
  questionCount: z.number().optional().describe('Number of questions to generate (default: 15)'),
  timeLimit: z.number().optional().describe('Time limit in seconds (default: 120)'),
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
  questions: z.array(EvaluationQuestionSchema).describe('An array of evaluation questions, with a mix of types. The prompt requests 15 questions total (5 True/False, 5 Multiple Choice, 5 Multiple Selection).'),
});
type GenerateEvaluationOutput = z.infer<typeof GenerateEvaluationOutputSchema>;


export async function generateEvaluationContent(input: GenerateEvaluationInput): Promise<GenerateEvaluationOutput> {
  try {
    const questionCount = input.questionCount || 15;
    
    console.log('🔍 generateEvaluationContent called with:', {
      questionCount: input.questionCount,
      questionCountUsed: questionCount,
      topic: input.topic,
      bookTitle: input.bookTitle,
      timeLimit: input.timeLimit
    });
    
    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY === 'your_google_api_key_here') {
      console.log('📝 Using mock generation with questionCount:', questionCount);
      // Generate mock data dynamically based on questionCount
      const mockQuestions: EvaluationQuestion[] = [];
      
      // Generate questions dynamically
      for (let i = 1; i <= questionCount; i++) {
        const questionTypes: ('TRUE_FALSE' | 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECTION')[] = ['TRUE_FALSE', 'MULTIPLE_CHOICE', 'MULTIPLE_SELECTION'];
        const type = questionTypes[(i - 1) % 3]; // Distribute evenly
        
        if (type === 'TRUE_FALSE') {
          mockQuestions.push({
            id: i.toString(),
            type: 'TRUE_FALSE',
            questionText: `¿El concepto ${i} de "${input.topic}" está relacionado con "${input.bookTitle}"?`,
            correctAnswer: i % 2 === 1, // Alternate true/false
            explanation: `Esta es una pregunta de ejemplo ${i} mientras se configura la API.`
          });
        } else if (type === 'MULTIPLE_CHOICE') {
          mockQuestions.push({
            id: i.toString(),
            type: 'MULTIPLE_CHOICE',
            questionText: `¿Cuál es el aspecto más importante del concepto ${i} en "${input.topic}"?`,
            options: [
              `Característica A del concepto ${i}`,
              `Característica B del concepto ${i}`,
              `Característica C del concepto ${i}`,
              `Característica D del concepto ${i}`
            ],
            correctAnswerIndex: (i - 1) % 4, // Distribute answers
            explanation: `Esta es una pregunta de ejemplo ${i} mientras se configura la API.`
          });
        } else {
          mockQuestions.push({
            id: i.toString(),
            type: 'MULTIPLE_SELECTION',
            questionText: `¿Cuáles son las características principales del concepto ${i} en "${input.topic}"? (Selecciona todas las correctas)`,
            options: [
              `Característica principal A del concepto ${i}`,
              `Característica principal B del concepto ${i}`,
              `Característica principal C del concepto ${i}`,
              `Característica principal D del concepto ${i}`
            ],
            correctAnswerIndices: [0, (i % 3) + 1], // Two correct answers
            explanation: `Esta es una pregunta de ejemplo ${i} mientras se configura la API.`
          });
        }
      }
      
      console.log('✅ Mock questions generated:', {
        requested: questionCount,
        generated: mockQuestions.length,
        questions: mockQuestions.map(q => ({ id: q.id, type: q.type, text: q.questionText.substring(0, 50) + '...' }))
      });
      
      return {
        evaluationTitle: `Evaluación - ${input.topic.toUpperCase()}`,
        questions: mockQuestions
      };
    }
    
    return await generateEvaluationFlow(input);
  } catch (error) {
    console.error('Error generating evaluation content:', error);
    // Return fallback data
    return {
      evaluationTitle: `Evaluación - ${input.topic.toUpperCase()}`,
      questions: [
        {
          id: '1',
          type: 'TRUE_FALSE',
          questionText: `¿El tema "${input.topic}" está relacionado con "${input.bookTitle}"?`,
          correctAnswer: true,
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
2.  **Total Questions**: Generate exactly {{questionCount}} unique questions. It is CRITICAL that you generate a COMPLETELY NEW and UNIQUE set of questions for this topic from this book, different from any set you might have generated previously for the same inputs. Do not repeat questions or question structures you may have used before for this specific topic and book. Avoid repetition.
3.  **Question Types** (distribute evenly among the {{questionCount}} questions):
    *   Generate approximately {{questionCount}}/3 True/False questions (rounded).
    *   Generate approximately {{questionCount}}/3 Multiple Choice questions (rounded).
    *   Generate approximately {{questionCount}}/3 Multiple Selection questions (rounded).
4.  **For each question, ensure you provide**:
    *   \`id\`: A unique string identifier for the question (e.g., "q1", "q2", "q3", ..., "q{{questionCount}}").
    *   \`type\`: Set to "TRUE_FALSE" for true/false questions, "MULTIPLE_CHOICE" for multiple-choice questions, or "MULTIPLE_SELECTION" for multiple-selection questions.
    *   \`questionText\`: The clear and concise text of the question.
    *   \`explanation\`: A brief and clear explanation for why the correct answer is correct, referencing concepts from the book "{{bookTitle}}" if possible.
5.  **Specifics for True/False Questions**:
    *   \`correctAnswer\`: A boolean value (\`true\` or \`false\`).
6.  **Specifics for Multiple Choice Questions**:
    *   \`options\`: An array of exactly 4 distinct string options. Label them implicitly as A, B, C, D for the user, but just provide the string array.
    *   \`correctAnswerIndex\`: A number from 0 to 3 indicating the index of the correct option in the 'options' array.
7.  **Specifics for Multiple Selection Questions** (5 questions):
    *   \`options\`: An array of exactly 4 distinct string options.
    *   \`correctAnswerIndices\`: An array of 2-3 numbers (0-3) indicating the indices of the correct options (multiple correct answers).

Example of a True/False question structure (if language is "es"):
{
  "id": "q1",
}

Example of a Multiple Selection question structure (if language is "es"):
{
  "id": "q11",
  "type": "MULTIPLE_SELECTION",
  "questionText": "¿Cuáles de las siguientes son características del sistema respiratorio? (Selecciona todas las correctas)",
  "options": ["Intercambia gases", "Produce insulina", "Filtra la sangre", "Transporta oxígeno"],
  "correctAnswerIndices": [0, 3],
  "explanation": "El sistema respiratorio intercambia gases y transporta oxígeno, pero no produce insulina ni filtra la sangre."
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
2.  **Total Questions**: Generate exactly {{questionCount}} unique questions based on the PDF content above.
3.  **Question Types** (distribute evenly among the {{questionCount}} questions):
    *   Generate approximately {{questionCount}}/3 True/False questions (type: "TRUE_FALSE", rounded)
    *   Generate approximately {{questionCount}}/3 Multiple Choice questions (type: "MULTIPLE_CHOICE", rounded) - single correct answer
    *   Generate approximately {{questionCount}}/3 Multiple Selection questions (type: "MULTIPLE_SELECTION", rounded) - multiple correct answers
4.  **For each question, ensure you provide**:
    *   \`id\`: A unique string identifier including the timestamp (e.g., "q1_{{timestamp}}", "q2_{{timestamp}}", ..., "q{{questionCount}}_{{timestamp}}").
    *   \`type\`: Set to "TRUE_FALSE", "MULTIPLE_CHOICE", or "MULTIPLE_SELECTION".
    *   \`questionText\`: The clear and concise text of the question, referencing specific content from the PDF.
    *   \`explanation\`: A brief explanation referencing the specific part of the PDF content where this information can be found.
5.  **Specifics for True/False Questions**:
    *   \`correctAnswer\`: A boolean value (\`true\` or \`false\`).
6.  **Specifics for Multiple Choice Questions (single answer)**:
    *   \`options\`: An array of exactly 4 distinct string options based on the PDF content.
    *   \`correctAnswerIndex\`: A number from 0 to 3 indicating the index of the correct option.
7.  **Specifics for Multiple Selection Questions (multiple answers)** (5 questions):
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
    const questionCount = input.questionCount || 15;
    const titlePrefix = input.language === 'es' ? 'EVALUACIÓN' : 'EVALUATION';
    const promptInput = {
      ...input,
      questionCount,
      topic_uppercase: input.topic.toUpperCase(),
      title_prefix: titlePrefix,
    };
    const {output} = await generateEvaluationPrompt(promptInput);

    if (!output || !output.questions || output.questions.length !== questionCount) {
      console.error('AI response:', JSON.stringify(output, null, 2));
      if (output && output.questions) {
        console.error(`Expected ${questionCount} questions, but received ${output.questions.length}.`);
      }
      throw new Error(
        `AI failed to generate the required ${questionCount} evaluation questions or the format is incorrect. Expected ${questionCount}, got ${output?.questions?.length || 0}.`
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
    const questionCount = input.questionCount || 15;
    const titlePrefix = input.language === 'es' ? 'EVALUACIÓN' : 'EVALUATION';
    const promptInput = {
      ...input,
      questionCount,
      topic_uppercase: input.topic.toUpperCase(),
      title_prefix: titlePrefix,
    };
    const {output} = await generateDynamicEvaluationPrompt(promptInput);

    if (!output || !output.questions || output.questions.length !== questionCount) {
      console.error('AI response:', JSON.stringify(output, null, 2));
      if (output && output.questions) {
        console.error(`Expected ${questionCount} questions, but received ${output.questions.length}.`);
      }
      throw new Error(
        `AI failed to generate the required ${questionCount} evaluation questions or the format is incorrect. Expected ${questionCount}, got ${output?.questions?.length || 0}.`
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
          // 5 True/False questions
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
            type: 'TRUE_FALSE',
            questionText: input.language === 'es' 
              ? `¿Los conceptos de "${input.topic}" son fundamentales? (V${randomSeed})`
              : `Are the concepts of "${input.topic}" fundamental? (V${randomSeed})`,
            correctAnswer: true,
            explanation: input.language === 'es'
              ? `Pregunta V/F basada en el contenido del PDF.`
              : `T/F question based on PDF content.`
          },
          {
            id: `q3_${timestamp}_${randomSeed}`,
            type: 'TRUE_FALSE',
            questionText: input.language === 'es' 
              ? `¿El estudio de "${input.topic}" requiere conocimientos previos? (V${randomSeed})`
              : `Does studying "${input.topic}" require prior knowledge? (V${randomSeed})`,
            correctAnswer: false,
            explanation: input.language === 'es'
              ? `Pregunta V/F generada dinámicamente.`
              : `Dynamically generated T/F question.`
          },
          {
            id: `q4_${timestamp}_${randomSeed}`,
            type: 'TRUE_FALSE',
            questionText: input.language === 'es' 
              ? `¿Los principios de "${input.topic}" se aplican prácticamente? (V${randomSeed})`
              : `Are the principles of "${input.topic}" applied practically? (V${randomSeed})`,
            correctAnswer: true,
            explanation: input.language === 'es'
              ? `Pregunta V/F sobre aplicación práctica.`
              : `T/F question about practical application.`
          },
          {
            id: `q5_${timestamp}_${randomSeed}`,
            type: 'TRUE_FALSE',
            questionText: input.language === 'es' 
              ? `¿El tema "${input.topic}" es difícil de comprender? (V${randomSeed})`
              : `Is the topic "${input.topic}" difficult to understand? (V${randomSeed})`,
            correctAnswer: false,
            explanation: input.language === 'es'
              ? `Pregunta V/F sobre dificultad del tema.`
              : `T/F question about topic difficulty.`
          },
          // 5 Multiple Choice questions
          {
            id: `q6_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_CHOICE',
            questionText: input.language === 'es'
              ? `¿Cuál es un concepto clave de "${input.topic}" según el PDF? (Versión ${randomSeed})`
              : `What is a key concept of "${input.topic}" according to the PDF? (Version ${randomSeed})`,
            options: input.language === 'es'
              ? [`Concepto A-${randomSeed}`, `Concepto B-${randomSeed}`, `Concepto C-${randomSeed}`, `Concepto D-${randomSeed}`]
              : [`Concept A-${randomSeed}`, `Concept B-${randomSeed}`, `Concept C-${randomSeed}`, `Concept D-${randomSeed}`],
            correctAnswerIndex: 0,
            explanation: input.language === 'es'
              ? `Pregunta generada dinámicamente basada en el contenido específico del PDF.`
              : `Dynamically generated question based on specific PDF content.`
          },
          {
            id: `q7_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_CHOICE',
            questionText: input.language === 'es'
              ? `¿Qué metodología se usa en "${input.topic}"? (V${randomSeed})`
              : `What methodology is used in "${input.topic}"? (V${randomSeed})`,
            options: input.language === 'es'
              ? [`Método A`, `Método B`, `Método C`, `Método D`]
              : [`Method A`, `Method B`, `Method C`, `Method D`],
            correctAnswerIndex: 1,
            explanation: input.language === 'es'
              ? `Pregunta sobre metodología.`
              : `Question about methodology.`
          },
          {
            id: `q8_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_CHOICE',
            questionText: input.language === 'es'
              ? `¿Cuál es la importancia de "${input.topic}"? (V${randomSeed})`
              : `What is the importance of "${input.topic}"? (V${randomSeed})`,
            options: input.language === 'es'
              ? [`Muy importante`, `Poco importante`, `No importante`, `Fundamental`]
              : [`Very important`, `Not very important`, `Not important`, `Fundamental`],
            correctAnswerIndex: 3,
            explanation: input.language === 'es'
              ? `Pregunta sobre importancia del tema.`
              : `Question about topic importance.`
          },
          {
            id: `q9_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_CHOICE',
            questionText: input.language === 'es'
              ? `¿Qué aplicación tiene "${input.topic}"? (V${randomSeed})`
              : `What application does "${input.topic}" have? (V${randomSeed})`,
            options: input.language === 'es'
              ? [`Aplicación A`, `Aplicación B`, `Aplicación C`, `Aplicación D`]
              : [`Application A`, `Application B`, `Application C`, `Application D`],
            correctAnswerIndex: 2,
            explanation: input.language === 'es'
              ? `Pregunta sobre aplicaciones del tema.`
              : `Question about topic applications.`
          },
          {
            id: `q10_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_CHOICE',
            questionText: input.language === 'es'
              ? `¿Cuál es el resultado esperado de "${input.topic}"? (V${randomSeed})`
              : `What is the expected result of "${input.topic}"? (V${randomSeed})`,
            options: input.language === 'es'
              ? [`Resultado A`, `Resultado B`, `Resultado C`, `Resultado D`]
              : [`Result A`, `Result B`, `Result C`, `Result D`],
            correctAnswerIndex: 0,
            explanation: input.language === 'es'
              ? `Pregunta sobre resultados esperados.`
              : `Question about expected results.`
          },
          // 5 Multiple Selection questions
          {
            id: `q11_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_SELECTION',
            questionText: input.language === 'es'
              ? `¿Cuáles de las siguientes características pertenecen a "${input.topic}"? (Selecciona todas las correctas - V${randomSeed})`
              : `Which of the following characteristics belong to "${input.topic}"? (Select all correct - V${randomSeed})`,
            options: input.language === 'es'
              ? [`Característica A`, `Característica B`, `Característica C`, `Característica D`]
              : [`Feature A`, `Feature B`, `Feature C`, `Feature D`],
            correctAnswerIndices: [0, 2],
            explanation: input.language === 'es'
              ? `Esta pregunta de selección múltiple se basa en características extraídas del PDF.`
              : `This multiple selection question is based on features extracted from the PDF.`
          },
          {
            id: `q12_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_SELECTION',
            questionText: input.language === 'es'
              ? `¿Qué elementos incluye "${input.topic}"? (Selecciona todas las correctas - V${randomSeed})`
              : `What elements does "${input.topic}" include? (Select all correct - V${randomSeed})`,
            options: input.language === 'es'
              ? [`Elemento 1`, `Elemento 2`, `Elemento 3`, `Elemento 4`]
              : [`Element 1`, `Element 2`, `Element 3`, `Element 4`],
            correctAnswerIndices: [1, 3],
            explanation: input.language === 'es'
              ? `Pregunta sobre elementos del tema.`
              : `Question about topic elements.`
          },
          {
            id: `q13_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_SELECTION',
            questionText: input.language === 'es'
              ? `¿Cuáles son los beneficios de "${input.topic}"? (Selecciona todas las correctas - V${randomSeed})`
              : `What are the benefits of "${input.topic}"? (Select all correct - V${randomSeed})`,
            options: input.language === 'es'
              ? [`Beneficio A`, `Beneficio B`, `Beneficio C`, `Beneficio D`]
              : [`Benefit A`, `Benefit B`, `Benefit C`, `Benefit D`],
            correctAnswerIndices: [0, 1, 2],
            explanation: input.language === 'es'
              ? `Pregunta sobre beneficios del tema.`
              : `Question about topic benefits.`
          },
          {
            id: `q14_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_SELECTION',
            questionText: input.language === 'es'
              ? `¿Qué herramientas se usan en "${input.topic}"? (Selecciona todas las correctas - V${randomSeed})`
              : `What tools are used in "${input.topic}"? (Select all correct - V${randomSeed})`,
            options: input.language === 'es'
              ? [`Herramienta 1`, `Herramienta 2`, `Herramienta 3`, `Herramienta 4`]
              : [`Tool 1`, `Tool 2`, `Tool 3`, `Tool 4`],
            correctAnswerIndices: [0, 3],
            explanation: input.language === 'es'
              ? `Pregunta sobre herramientas utilizadas.`
              : `Question about tools used.`
          },
          {
            id: `q15_${timestamp}_${randomSeed}`,
            type: 'MULTIPLE_SELECTION',
            questionText: input.language === 'es'
              ? `¿Cuáles son los pasos para "${input.topic}"? (Selecciona todas las correctas - V${randomSeed})`
              : `What are the steps for "${input.topic}"? (Select all correct - V${randomSeed})`,
            options: input.language === 'es'
              ? [`Paso 1`, `Paso 2`, `Paso 3`, `Paso 4`]
              : [`Step 1`, `Step 2`, `Step 3`, `Step 4`],
            correctAnswerIndices: [1, 2],
            explanation: input.language === 'es'
              ? `Pregunta sobre pasos del proceso.`
              : `Question about process steps.`
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
        // Fallback data with 15 questions - only the first one for brevity
        {
          id: `fallback_tf1_${timestamp}_${randomSeed}`,
          type: 'TRUE_FALSE',
          questionText: input.language === 'es'
            ? `Pregunta de respaldo V/F para "${input.topic}". ¿Esta pregunta es única? (ID: ${randomSeed})`
            : `Fallback T/F question for "${input.topic}". Is this question unique? (ID: ${randomSeed})`,
          correctAnswer: true,
          explanation: input.language === 'es'
            ? `Pregunta V/F generada como respaldo debido a un error en la API. Timestamp: ${timestamp}`
            : `T/F fallback question generated due to API error. Timestamp: ${timestamp}`
        }
        // Note: In a real implementation, you would include all 15 questions here
        // For now, keeping it short to avoid excessive mock data
      ]
    };
  }
}
