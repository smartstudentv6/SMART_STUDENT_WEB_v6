'use server';

/**
 * @fileOverview Generates a mind map from a central theme and book content.
 *
 * - createMindMap - A function that generates a mind map.
 * - CreateMindMapInput - The input type for the createMindMap function.
 * - CreateMindMapOutput - The return type for the createMindMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateMindMapInputSchema = z.object({
  centralTheme: z.string().describe('The central theme of the mind map.'),
  bookContent: z.string().describe('The content of the book to generate the mind map from.'),
});
export type CreateMindMapInput = z.infer<typeof CreateMindMapInputSchema>;

const CreateMindMapOutputSchema = z.object({
  mindMap: z.string().describe('The generated mind map in text format.'),
});
export type CreateMindMapOutput = z.infer<typeof CreateMindMapOutputSchema>;

export async function createMindMap(input: CreateMindMapInput): Promise<CreateMindMapOutput> {
  return createMindMapFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createMindMapPrompt',
  input: {schema: CreateMindMapInputSchema},
  output: {schema: CreateMindMapOutputSchema},
  prompt: `You are an expert in creating mind maps. Given the central theme and the content of a book, create a mind map that visualizes the relationships between concepts.

Central Theme: {{{centralTheme}}}
Book Content: {{{bookContent}}}

Create a mind map in text format:
`,
});

const createMindMapFlow = ai.defineFlow(
  {
    name: 'createMindMapFlow',
    inputSchema: CreateMindMapInputSchema,
    outputSchema: CreateMindMapOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
