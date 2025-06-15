
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
  language: z.enum(['es', 'en']).describe('The language for the output summary and key points (e.g., "es" for Spanish, "en" for English).'),
});

export type GenerateSummaryInput = z.infer<typeof GenerateSummaryInputSchema>;

const GenerateSummaryOutputSchema = z.object({
  summary: z.string().describe('The generated summary of the topic, potentially up to 10,000 words based on AI knowledge of the book and topic. Should be formatted in Markdown.'),
  keyPoints: z.array(z.string()).optional().describe('An array of 10 key points if requested, in the specified language.'),
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
Book Title: {{{bookTitle}}}
Output Language: {{{language}}}

Instructions:
1. Generate a very detailed and comprehensive summary of the specified topic, based on your knowledge of the book titled '{{{bookTitle}}}'.
   The summary MUST be written in the language specified by the 'language' input field (i.e., if 'language' is 'es', the summary must be in Spanish; if 'language' is 'en', the summary must be in English).
   Aim for a substantial length, potentially up to 10,000 words if your knowledge warrants such detail. Prioritize quality, coherence, and relevance to the topic.
   Please format your summary using Markdown syntax:
   - Use double newlines (pressing Enter twice) to separate paragraphs.
   - Use Markdown headings (e.g., ## My Subheading) for sub-sections.
   - Use double asterisks (e.g., **important term**) for bold text.

{{#if includeKeyPoints}}
2. After generating the summary, extract exactly 10 key points from the summary you wrote. These key points should be distinct and represent the most crucial takeaways.
   These key points MUST also be in the language specified by the 'language' input field.
{{/if}}

Return the output in the specified JSON format. The summary should be in the "summary" field. If requested, the 10 key points should be in the "keyPoints" field as an array of strings. The "progress" field should indicate what was summarized.
The summary and key points (if requested) must be in the language: {{{language}}}.
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
    const progressMessage = `Generated a detailed summary for topic "${input.topic}" from book "${input.bookTitle}" in ${input.language}.`;
    return {
      summary: output.summary || '',
      keyPoints: output.keyPoints || (input.includeKeyPoints ? [] : undefined),
      progress: progressMessage,
    };
  }
);

