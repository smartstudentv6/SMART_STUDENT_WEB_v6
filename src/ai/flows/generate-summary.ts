
// src/ai/flows/generate-summary.ts
'use server';

/**
 * @fileOverview Generates a summary of a specific topic from a selected book.
 *
 * - generateSummary - A function that handles the summary generation process.
 * - GenerateSummaryInput - The input type for the generateSummary function.
 * - GenerateSummaryOutput - The return type for the generateSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSummaryInputSchema = z.object({
  bookTitle: z.string().describe('The title of the book to summarize from.'),
  topic: z.string().describe('The specific topic to summarize. This helps focus the summary.'),
  includeKeyPoints: z.boolean().optional().describe('Whether to include 10 key points from the summary.'),
});

export type GenerateSummaryInput = z.infer<typeof GenerateSummaryInputSchema>;

const GenerateSummaryOutputSchema = z.object({
  summary: z.string().describe('The generated summary of the topic, potentially up to 10,000 words based on AI knowledge of the book and topic.'),
  keyPoints: z.array(z.string()).optional().describe('An array of 10 key points if requested.'),
  progress: z.string().describe('One-sentence progress of summary generation.'),
});

export type GenerateSummaryOutput = z.infer<typeof GenerateSummaryOutputSchema>;

export async function generateSummary(input: GenerateSummaryInput): Promise<GenerateSummaryOutput> {
  return generateSummaryFlow(input);
}

const generateSummaryPrompt = ai.definePrompt({
  name: 'generateSummaryPrompt',
  input: {
    schema: GenerateSummaryInputSchema,
  },
  output: {
    schema: GenerateSummaryOutputSchema,
  },
  prompt: `You are an AI assistant that generates detailed and comprehensive summaries of specific topics from books, based on your knowledge of them.

Book Title: {{{bookTitle}}}
Topic: {{{topic}}}

Instructions: Generate a very detailed and comprehensive summary of the specified topic from the given book title. Aim for a substantial length, potentially up to 10,000 words if your knowledge of the book and topic warrants such detail, but prioritize quality, coherence, and relevance to the topic.

{{#if includeKeyPoints}}
After generating the summary, also extract exactly 10 key points from the summary you wrote. These key points should be distinct and represent the most crucial takeaways.
{{/if}}

Return the output in the specified JSON format. The summary should be in the "summary" field. If requested, the 10 key points should be in the "keyPoints" field as an array of strings.
`,
});

const generateSummaryFlow = ai.defineFlow(
  {
    name: 'generateSummaryFlow',
    inputSchema: GenerateSummaryInputSchema,
    outputSchema: GenerateSummaryOutputSchema,
  },
  async input => {
    const {output} = await generateSummaryPrompt(input);
    if (!output) {
      throw new Error('Failed to generate summary output.');
    }
    return {
      summary: output.summary || '',
      keyPoints: output.keyPoints || (input.includeKeyPoints ? [] : undefined),
      progress: 'Generated a detailed summary of the specified topic.',
    };
  }
);
