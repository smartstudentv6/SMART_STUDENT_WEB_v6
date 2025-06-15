
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
  bookContent: z.string().describe('The content of the book to generate the mind map from.'),
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
    const generationPrompt = `Generate a clear and visually appealing mind map image.
Central Theme: ${input.centralTheme}.
Key concepts should be derived from the provided book content snippets, focusing on the central theme.
Book Content for context: ${input.bookContent}.
The image should visually structure the main ideas branching from the central theme, with sub-topics connected appropriately. Aim for a design that is easy to understand and visually engaging.`;

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
