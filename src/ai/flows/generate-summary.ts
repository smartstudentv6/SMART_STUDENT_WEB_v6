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
  topic: z.string().describe('The specific topic to summarize.'),
  includeKeywords: z.boolean().optional().describe('Whether to include key points in the summary.'),
});

export type GenerateSummaryInput = z.infer<typeof GenerateSummaryInputSchema>;

const GenerateSummaryOutputSchema = z.object({
  summary: z.string().describe('The generated summary of the topic.'),
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
  prompt: `You are an AI assistant that generates summaries of specific topics from books.

  Book Title: {{{bookTitle}}}
  Topic: {{{topic}}}

  Instructions: Generate a concise and informative summary of the specified topic from the given book. The summary should be easy to understand and highlight the key concepts related to the topic.
  {{#if includeKeywords}}
  Also, include key points related to the topic.
  {{/if}}

  Summary:`, // Ensure the summary is returned as a string
});

const generateSummaryFlow = ai.defineFlow(
  {
    name: 'generateSummaryFlow',
    inputSchema: GenerateSummaryInputSchema,
    outputSchema: GenerateSummaryOutputSchema,
  },
  async input => {
    const {output} = await generateSummaryPrompt(input);
    return {
      ...output!,
      progress: 'Generated a concise summary of the specified topic from the book.',
    };
  }
);
