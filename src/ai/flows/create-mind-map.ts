
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
    const generationPrompt = `You are an expert at creating clear, visually appealing, and informative conceptual map images.
Generate a conceptual map image, NOT just text.
The central theme of this conceptual map is: "${input.centralTheme}".
The information and context for this map should be drawn as if from the book titled: "${input.bookTitle}".

The conceptual map image MUST adhere to the following strict requirements:
1.  **Clear Hierarchy**: The central theme ("${input.centralTheme}") must be the main, central node. Main ideas directly related to the theme should branch out from it. Sub-topics or related concepts should branch from these main ideas. Ensure clear visual connections between related nodes.
2.  **Legible Text in Nodes**: ALL text within EVERY node MUST be perfectly clear, easily readable, and large enough to be distinguished. Use a simple, legible font style. Avoid small, blurry, or distorted characters. Ensure good contrast between the text and its node background.
3.  **Relevant Content**: ALL concepts, terms, and phrases used in the nodes MUST be directly and solely relevant to the central theme "${input.centralTheme}", drawing information as if from the book "${input.bookTitle}". Do not include extraneous information.
4.  **Concise Node Text**: Text within each node should be brief and to the point, using keywords or very short phrases.
5.  **Professional Appearance**: The overall map should be visually organized, clean, and professional, suitable as an effective study tool.

Prioritize the clarity of the text and the logical structure of the conceptual relationships above all else.
If you cannot generate an image with clearly legible text in the nodes that accurately represents the conceptual map based on the theme and book, indicate failure.`;

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

