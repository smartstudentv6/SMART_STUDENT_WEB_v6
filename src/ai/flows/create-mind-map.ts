
'use server';

/**
 * @fileOverview Generates a mind map image from a central theme and book content.
 * This involves two steps:
 * 1. Generating a structured representation of the mind map (nodes and sub-nodes).
 * 2. Rendering this structured data as a mind map image.
 *
 * - createMindMap - A function that generates a mind map image.
 * - CreateMindMapInput - The input type for the createMindMap function.
 * - CreateMindMapOutput - The return type for the createMindMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input for the entire flow
const CreateMindMapInputSchema = z.object({
  centralTheme: z.string().describe('The central theme of the mind map.'),
  bookTitle: z.string().describe('The title of the book to provide context for the mind map content.'),
  language: z.enum(['es', 'en']).describe('The language for the node labels (e.g., "es" for Spanish, "en" for English).')
});
export type CreateMindMapInput = z.infer<typeof CreateMindMapInputSchema>;

// Output for the entire flow
const CreateMindMapOutputSchema = z.object({
  imageDataUri: z.string().describe('The generated mind map image as a data URI.'),
});
export type CreateMindMapOutput = z.infer<typeof CreateMindMapOutputSchema>;


// Schema for the structured mind map data
const MindMapNodeSchema = z.object({
  label: z.string().describe('The text label for this node.'),
  children: z.array(z.lazy(() => MindMapNodeSchema)).optional().describe('Optional child nodes, forming sub-topics.'),
});
export type MindMapNode = z.infer<typeof MindMapNodeSchema>;

const MindMapStructureSchema = z.object({
  centralThemeLabel: z.string().describe('The label for the central theme, confirmed or refined by the AI.'),
  mainBranches: z.array(MindMapNodeSchema).describe('An array of main ideas branching from the central theme. Aim for 3-5 main branches for clarity. Each main branch can have 2-3 sub-topics.'),
});
export type MindMapStructure = z.infer<typeof MindMapStructureSchema>;


// Prompt to generate the mind map's textual structure
const generateMindMapStructurePrompt = ai.definePrompt({
  name: 'generateMindMapStructurePrompt',
  input: { schema: CreateMindMapInputSchema }, 
  output: { schema: MindMapStructureSchema }, 
  prompt: `You are an expert in instructional design and content organization.
Based on the book titled "{{bookTitle}}", generate a hierarchical structure for a conceptual map.
The central theme is: "{{centralTheme}}".
The language for all node labels must be: {{language}}.

Your task is to:
1.  Confirm or slightly refine the central theme label if necessary for clarity, ensuring it's concise.
2.  Identify 3 to 5 main concepts or topics directly related to this central theme, as found in the book. These will be the main branches.
3.  For each main branch, identify 2 to 3 key sub-topics or supporting details from the book.
4.  Ensure all labels (central theme, main branches, sub-topics) are concise, clear, and in the specified language ({{language}}).
5.  Structure the output according to the MindMapStructureSchema.

Example of desired output structure (conceptual):
{
  "centralThemeLabel": "Photosynthesis (FOTOSÍNTESIS)",
  "mainBranches": [
    { "label": "Inputs (Entradas)", "children": [{ "label": "Light (Luz)" }, { "label": "Water (Agua)" }, { "label": "CO2" }] },
    { "label": "Process (Proceso)", "children": [{ "label": "Light Reactions (Reacciones Luminosas)" }, { "label": "Calvin Cycle (Ciclo de Calvin)" }] },
    { "label": "Outputs (Salidas)", "children": [{ "label": "Glucose (Glucosa)" }, { "label": "Oxygen (Oxígeno)" }] }
  ]
}
Focus on accuracy and relevance to the book content. Ensure a clear hierarchical structure suitable for a top-down conceptual map.
`,
});

// This internal prompt definition is used to render the structured data into a string for the image model.
const renderMindMapImageHandlebarsPrompt = ai.definePrompt({
  name: 'renderMindMapImageHandlebarsPrompt',
  input: { schema: MindMapStructureSchema },
  prompt: `You are an expert at creating clear, visually appealing, and informative conceptual map IMAGES in a diagrammatic style.
Generate a conceptual map IMAGE based on the EXACT structure, text, and styling cues provided below.
Do NOT generate text output, only the IMAGE. The image should be a clean, diagrammatic conceptual map. Avoid artistic or overly stylized renderings. The background should be simple and not interfere with text legibility.

The absolute MOST IMPORTANT requirement is that ALL TEXT in EVERY NODE must be perfectly clear, easily readable, and large enough to be distinguished. Use a simple, legible sans-serif font. Ensure good contrast between the text and its node background. Each text label you are given MUST be rendered as a distinct, clearly readable text element within its own node in the image.

The textual content for each node is GIVEN to you below. You MUST use this exact text.

Central Theme (Main, Central Node): "{{centralThemeLabel}}"

Main Ideas branching from the Central Theme:
{{#each mainBranches}}
- Main Idea Node: "{{label}}"
  {{#if children.length}}
  Sub-topics/concepts branching from "{{label}}":
    {{#each children}}
    - Sub-topic Node: "{{this.label}}"
      {{#if this.children.length}}
      Further sub-topics for "{{this.label}}":
        {{#each this.children}}
        - Sub-sub-topic Node: "{{this.label}}"
        {{/each}}
      {{/if}}
    {{/each}}
  {{/if}}
{{/each}}

Strict Requirements for the IMAGE:
1.  **RENDER PROVIDED TEXT EXACTLY AND CLEARLY**: This is the most critical instruction. The textual content for every node is GIVEN to you in the structure above (e.g., "{{centralThemeLabel}}", "{{label}}", "{{this.label}}"). You MUST render this text precisely as it is written, inside its respective node. The text must be:
    *   PERFECTLY LEGIBLE.
    *   LARGE ENOUGH to be easily read without zooming.
    *   Use a SIMPLE, SANS-SERIF FONT.
    *   Have EXCELLENT CONTRAST against the node's background.
    *   DO NOT ABBREVIATE, CHANGE, OMIT, OR ADD ANY TEXT to the labels provided.
2.  **CLEAR HIERARCHY AND NODE STYLES (Vertical/Default Layout)**:
    *   **Layout**: The map should follow a top-down hierarchical structure. The central theme ("{{centralThemeLabel}}") must be the most prominent node, positioned at the top. Main ideas (labels from \`mainBranches\`) must clearly branch downwards or outwards from it. Sub-topics (labels from \`children\` of main ideas) must clearly branch from their respective parent main idea nodes. Use clear visual connectors (lines or simple arrows). DO NOT write text (like "Conector") on the connector lines themselves; they should be purely visual.
    *   **Node Shapes**:
        *   The Central Theme node containing "{{centralThemeLabel}}" must be a **rectangle**.
        *   Nodes representing Main Ideas (the direct children of the central theme, i.e., items in \`mainBranches\`) must be **rectangles**.
        *   Nodes representing Sub-topics (children of Main Ideas) must be **circles**.
        *   If there are further levels of sub-topics (children of children), they should also be **circles**.
3.  **PROFESSIONAL APPEARANCE**: The map should be visually organized, uncluttered, and professional. Use distinct shapes as specified. A simple, consistent color scheme (e.g., light-colored nodes like pale yellow with dark text, or a scheme that ensures high contrast and readability) is preferred. Text legibility, correct shapes, and accurate content are more important than complex aesthetics.
4.  **NO HALLUCINATED CONTENT**: Do not add any nodes, text, shapes, or visual elements that are not explicitly defined by the structure provided above. Your task is to visualize the given data, not to add to it.

If any text is distorted, unreadable, or omitted, or if any text is added that was not in the provided structure, or if the node shapes are incorrect, the image is considered a failure. Prioritize text clarity, faithfulness to the provided content, and correct node styling above all other considerations.
`,
});


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
    // Step 1: Generate the structured mind map data
    const structureResponse = await generateMindMapStructurePrompt(input);
    const mindMapStructure = structureResponse.output;

    if (!mindMapStructure) {
      throw new Error('Failed to generate mind map structure.');
    }

    // Step 2: Render the structured data as an image
    const renderOutput = await renderMindMapImageHandlebarsPrompt.render(mindMapStructure);
    const actualPromptText = renderOutput.messages[0]?.content[0]?.text;

    if (!actualPromptText) {
      throw new Error('Failed to render the image generation prompt text from RenderResponse.');
    }
    
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', 
      prompt: actualPromptText, // Pass the extracted text string
      config: {
        responseModalities: ['TEXT', 'IMAGE'], 
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed or no image was returned by the model.');
    }
    return { imageDataUri: media.url };
  }
);

