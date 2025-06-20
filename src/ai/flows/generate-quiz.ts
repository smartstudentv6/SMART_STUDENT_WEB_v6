
// src/ai/flows/generate-quiz.ts
'use server';

/**
 * @fileOverview Generates a quiz on a specific topic from a selected book.
 * The quiz will have 15 open-ended questions, each with its expected answer/explanation.
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
  language: z.enum(['es', 'en']).describe('The language for the quiz content (e.g., "es" for Spanish, "en" for English).'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

// Schema for the structured output expected from the AI prompt
const QuestionSchema = z.object({
  questionText: z.string().describe('The text of the open-ended question.'),
  expectedAnswer: z.string().describe('A comprehensive ideal answer to the open-ended question, based on the book content. This should be detailed enough for a student to understand the topic thoroughly.'),
});

const AiPromptOutputSchema = z.object({
  quizTitle: z.string().describe('The title of the quiz, formatted as "CUESTIONARIO - [TOPIC_NAME_IN_UPPERCASE]" if language is "es", or "QUIZ - [TOPIC_NAME_IN_UPPERCASE]" if language is "en".'),
  questions: z.array(QuestionSchema).length(15).describe('An array of exactly 15 open-ended quiz questions.'),
});

// Schema for the final output of the flow (formatted HTML string)
const GenerateQuizOutputSchema = z.object({
  quiz: z.string().describe('The generated quiz as a formatted HTML string.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;


export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  // Mock mode for development when AI is not available
  if (process.env.NODE_ENV === 'development' && !process.env.GOOGLE_AI_API_KEY) {
    console.log('📝 Running generateQuiz in MOCK mode');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const isSpanish = input.language === 'es';
    const titlePrefix = isSpanish ? 'CUESTIONARIO' : 'QUIZ';
    const topicUpper = input.topic.toUpperCase();
    
    const mockQuestions = [
      {
        questionText: isSpanish ? `¿Cuál es el concepto más importante de ${input.topic}?` : `What is the most important concept of ${input.topic}?`,
        expectedAnswer: isSpanish ? `El concepto más importante es la comprensión fundamental de los principios básicos que rigen ${input.topic}.` : `The most important concept is the fundamental understanding of the basic principles that govern ${input.topic}.`
      },
      {
        questionText: isSpanish ? `¿Cómo se relaciona ${input.topic} con otros temas del curso?` : `How does ${input.topic} relate to other course topics?`,
        expectedAnswer: isSpanish ? `${input.topic} se conecta con múltiples áreas del conocimiento a través de sus aplicaciones prácticas.` : `${input.topic} connects with multiple knowledge areas through its practical applications.`
      },
      {
        questionText: isSpanish ? `¿Cuáles son las aplicaciones prácticas de ${input.topic}?` : `What are the practical applications of ${input.topic}?`,
        expectedAnswer: isSpanish ? `Las aplicaciones incluyen resolver problemas cotidianos y comprender fenómenos naturales.` : `Applications include solving everyday problems and understanding natural phenomena.`
      }
    ];
    
    // Generate 15 questions by repeating and varying the mock questions
    const questions = [];
    for (let i = 0; i < 15; i++) {
      const baseQuestion = mockQuestions[i % mockQuestions.length];
      questions.push({
        questionText: `${i + 1}. ${baseQuestion.questionText}`,
        expectedAnswer: baseQuestion.expectedAnswer
      });
    }
    
    const mockHtml = `
      <div class="quiz-container">
        <h1>${titlePrefix} - ${topicUpper}</h1>
        <p><strong>${isSpanish ? 'Libro:' : 'Book:'}</strong> ${input.bookTitle}</p>
        <p><strong>${isSpanish ? 'Curso:' : 'Course:'}</strong> ${input.courseName}</p>
        <hr>
        ${questions.map((q, index) => `
          <div class="question-block">
            <h3>${isSpanish ? 'Pregunta' : 'Question'} ${index + 1}</h3>
            <p><strong>${q.questionText}</strong></p>
            <div class="answer-space">
              <p><strong>${isSpanish ? 'Respuesta esperada:' : 'Expected answer:'}</strong></p>
              <p>${q.expectedAnswer}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    return { quiz: mockHtml };
  }

  // Original AI implementation
  return generateQuizFlow(input);
}

const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema.extend({ topic_uppercase: z.string(), title_prefix: z.string() })}, 
  output: {schema: AiPromptOutputSchema},
  prompt: `You are an expert educator and curriculum designer. Your task is to generate a comprehensive quiz based on your knowledge of the book titled "{{bookTitle}}", focusing on the specific topic "{{topic}}".

The quiz MUST adhere to the following structure:
1.  **Quiz Title**: The title must be exactly "{{title_prefix}} - {{topic_uppercase}}".
2.  **Number of Questions**: Generate exactly 15 unique open-ended questions.
3.  **For each question, provide**:
    *   \`questionText\`: The clear and concise text of the open-ended question.
    *   \`expectedAnswer\`: A comprehensive ideal answer to the question, referencing concepts from the book "{{bookTitle}}" where possible. This answer should be detailed and clear, suitable for study and understanding.

All content (title, questions, answers) should be directly relevant to the topic "{{topic}}" as covered in the book "{{bookTitle}}". Ensure the language of all generated content is {{{language}}}.
  `,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema, // Flow returns the HTML string
  },
  async (input: GenerateQuizInput) => {
    const titlePrefix = input.language === 'es' ? 'CUESTIONARIO' : 'QUIZ';
    const promptInput = {
      ...input,
      topic_uppercase: input.topic.toUpperCase(),
      title_prefix: titlePrefix,
    };
    const {output} = await generateQuizPrompt(promptInput);

    if (!output || !output.questions || output.questions.length === 0) {
      throw new Error('AI failed to generate quiz questions.');
    }

    let formattedQuizHtml = `<h2>${output.quizTitle}</h2><br />`;
    output.questions.forEach((q, index) => {
      formattedQuizHtml += `<p><strong>${index + 1}. ${q.questionText}</strong></p>`;
      const answerLabel = input.language === 'es' ? 'Respuesta Esperada' : 'Expected Answer';
      formattedQuizHtml += `<p style="margin-top: 0.5em;"><strong>${answerLabel}:</strong></p>`;
      // Format the expected answer for better readability, e.g., convert newlines to <br>
      const formattedAnswer = q.expectedAnswer.replace(/\n/g, '<br />');
      formattedQuizHtml += `<p style="margin-top: 0.25em; margin-bottom: 1em; text-align: justify;">${formattedAnswer}</p>`;
      
      if (index < output.questions.length - 1) {
        formattedQuizHtml += '<hr style="margin-top: 1rem; margin-bottom: 1rem; border-top: 1px solid #e5e7eb;" /><br />';
      }
    });

    return { quiz: formattedQuizHtml };
  }
);
