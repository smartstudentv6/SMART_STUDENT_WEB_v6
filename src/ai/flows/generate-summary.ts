
// src/ai/flows/generate-summary.ts
'use server';

/**
 * @fileOverview Generates a summary of a specific topic from a selected book,
 * optionally using provided book content.
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
  bookContent: z.string().optional().describe("Optional full text content from the book to base the summary on. Expected format: plain text."),
  includeKeyPoints: z.boolean().optional().describe('Whether to include 10 key points from the summary.'),
});

export type GenerateSummaryInput = z.infer<typeof GenerateSummaryInputSchema>;

const GenerateSummaryOutputSchema = z.object({
  summary: z.string().describe('The generated summary of the topic, potentially up to 10,000 words based on AI knowledge of the book and topic or provided content.'),
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
  prompt: `You are an AI assistant that generates detailed and comprehensive summaries.

Topic to Summarize: {{{topic}}}

{{#if bookContent}}
You have been provided with specific content from a book. Base your summary primarily on this provided text.
Book Content:
{{{bookContent}}}
{{else}}
You will generate a summary based on your general knowledge of the book titled '{{{bookTitle}}}'.
Book Title: {{{bookTitle}}}
{{/if}}

Instructions:
1. Generate a very detailed and comprehensive summary of the specified topic.
   {{#if bookContent}}
   Focus on the provided book content.
   {{else}}
   Focus on your knowledge of the book titled '{{{bookTitle}}}'.
   {{/if}}
   Aim for a substantial length, potentially up to 10,000 words if the content (either provided or your knowledge) warrants such detail. Prioritize quality, coherence, and relevance to the topic.

{{#if includeKeyPoints}}
2. After generating the summary, extract exactly 10 key points from the summary you wrote. These key points should be distinct and represent the most crucial takeaways.
{{/if}}

Return the output in the specified JSON format. The summary should be in the "summary" field. If requested, the 10 key points should be in the "keyPoints" field as an array of strings. The "progress" field should indicate what was summarized.
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
    const progressMessage = input.bookContent
      ? 'Generated a detailed summary based on the provided book content.'
      : 'Generated a detailed summary based on general knowledge of the book and topic.';
    return {
      summary: output.summary || '',
      keyPoints: output.keyPoints || (input.includeKeyPoints ? [] : undefined),
      progress: progressMessage,
    };
  }
);

