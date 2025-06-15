
'use server';

/**
 * @fileOverview Generates a mind map image from a central theme and book content.
 *
 * - createMindMap - A function that generates a mind map image.
 * - CreateMindMapInput - The input type for the createMindMap function.
 * - CreateMindMapOutput - The return type for the createMindMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateMindMapInputSchema = z.object({
  centralTheme: z.string().describe('The central theme of the mind map.'),
  bookTitle: z.string().describe('The title of the book to provide context for the mind map content.'),
});
export type CreateMindMapInput = z.infer<typeof CreateMindMapInputSchema>;

const CreateMindMapOutputSchema = z.object({
  imageDataUri: z.string().describe('The generated mind map image as a data URI.'),
});
export type CreateMindMapOutput = z.infer<typeof CreateMindMapOutputSchema>;

export async function createMindMap(input: CreateMindMapInput): Promise<CreateMindMapOutput> {
  return createMindMapFlow(input);
}

const createMindMapFlow = ai.defineFlow(
  {
    name: 'createMindMapFlow',
    inputSchema: CreateMindMapInputSchema,
    outputSchema: CreateMindMapOutputSchema,
  },
  async (input: CreateMindMapInput): Promise<CreateMindMapOutput> => {
    const generationPrompt = `You are an expert at creating clear, visually appealing, and informative mind map images.
Generate a mind map image centered around the theme: "${input.centralTheme}".
The context for this mind map is the book: "${input.bookTitle}".

All concepts and text in the mind map nodes MUST be:
1. Directly relevant to "${input.centralTheme}", drawing information as if from the book "${input.bookTitle}".
2. Clearly legible with large enough text. Avoid very small or unreadable characters.
3. Concise and easy to understand. Use keywords or short phrases.

Visually structure the main ideas branching from the central theme ("${input.centralTheme}") as the main node. Sub-topics should be connected appropriately.
The mind map should be designed to be an effective study tool, with a clean and professional appearance.
Ensure good contrast between text and background within the nodes.`;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Specific model for image generation
      prompt: generationPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Must include IMAGE
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed or no image was returned by the model.');
    }
    // The URL from Gemini for generated images is a data URI (e.g., "data:image/png;base64,...")
    return { imageDataUri: media.url };
  }
);
