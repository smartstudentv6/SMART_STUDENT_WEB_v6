
'use server';

/**
 * @fileOverview Generates a mind map image from a central theme and book content.
 * This involves two steps:
 * 1. Generating a structured representation of the mind map (nodes and sub-nodes).
 * 2. Rendering this structured data as a mind map image, allowing for horizontal or vertical orientation.
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
  language: z.enum(['es', 'en']).describe('The language for the node labels (e.g., "es" for Spanish, "en" for English).'),
  isHorizontal: z.boolean().optional().describe('Whether the mind map should be rendered horizontally. Defaults to vertical.')
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

// Schema for rendering the image (combines structure with orientation preference)
const RenderImageInputSchema = MindMapStructureSchema.extend({
  isHorizontal: z.boolean().optional(),
});
export type RenderImageInput = z.infer<typeof RenderImageInputSchema>;


// Prompt to generate the mind map's textual structure
const generateMindMapStructurePrompt = ai.definePrompt({
  name: 'generateMindMapStructurePrompt',
  // Input uses CreateMindMapInputSchema to get language, theme, book
  input: { schema: CreateMindMapInputSchema }, 
  output: { schema: MindMapStructureSchema }, 
  prompt: `You are an expert in instructional design and content organization.
Based on the book titled "{{bookTitle}}", generate a hierarchical structure for a conceptual map.
The central theme is: "{{centralTheme}}".
The language for all node labels must be: {{language}}.

Your task is to:
1.  Confirm or slightly refine the central theme label if necessary for clarity, ensuring it's concise.
2.  Identify 3 to 5 main concepts or topics directly related to this central theme, as found in the book. These will be the main branches.
3.  For each main branch, identify 2 to 3 key sub-topics or supporting details from the book. These sub-topics form a connected hierarchy under their parent main branch.
4.  Ensure all labels (central theme, main branches, sub-topics) are concise, clear, and in the specified language ({{language}}).
5.  Structure the output according to the MindMapStructureSchema. All generated nodes must be part of this connected hierarchy.

Example of desired output structure (conceptual):
{
  "centralThemeLabel": "Photosynthesis (FOTOSÍNTESIS)",
  "mainBranches": [
    { "label": "Inputs (Entradas)", "children": [{ "label": "Light (Luz)" }, { "label": "Water (Agua)" }, { "label": "CO2" }] },
    { "label": "Process (Proceso)", "children": [{ "label": "Light Reactions (Reacciones Luminosas)" }, { "label": "Calvin Cycle (Ciclo de Calvin)" }] },
    { "label": "Outputs (Salidas)", "children": [{ "label": "Glucose (Glucosa)" }, { "label": "Oxygen (Oxígeno)" }] }
  ]
}
Focus on accuracy and relevance to the book content. Ensure a clear hierarchical structure suitable for a conceptual map where all nodes are interconnected.
`,
});

// This internal prompt definition is used to render the structured data into a string for the image model.
const renderMindMapImageHandlebarsPrompt = ai.definePrompt({
  name: 'renderMindMapImageHandlebarsPrompt',
  input: { schema: RenderImageInputSchema }, // Uses the combined schema
  prompt: `You are an expert at creating clear, visually appealing, and informative conceptual map IMAGES in a diagrammatic style.
Generate a conceptual map IMAGE based on the EXACT structure, text, and styling cues provided below.
Do NOT generate text output, only the IMAGE. The image should be a clean, diagrammatic conceptual map. Avoid artistic or overly stylized renderings. The background should be simple and not interfere with text legibility.

The absolute MOST IMPORTANT requirement is that ALL TEXT in EVERY NODE must be perfectly clear, easily readable, and large enough to be distinguished. Use a simple, legible sans-serif font. Ensure good contrast between the text and its node background. Each text label you are given MUST be rendered as a distinct, clearly readable text element within its own node in the image.

The textual content for each node is GIVEN to you below. You MUST use this exact text.

Central Theme (Main Node): "{{centralThemeLabel}}"

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
    *   If you cannot render text clearly and accurately for every single node given, the image is a failure.

{{#if isHorizontal}}
2.  **CLEAR HIERARCHY AND NODE STYLES (HORIZONTAL Layout)**:
    *   **Layout**: The map MUST follow a **left-to-right horizontal structure**. The central theme ("{{centralThemeLabel}}") must be the most prominent node, positioned on the **far left**. Main ideas (labels from \`mainBranches\`) must clearly branch horizontally to the right from it. Sub-topics (labels from \`children\` of main ideas) must clearly branch horizontally to the right from their respective parent main idea nodes, reflecting the provided hierarchy. Use clear visual connectors (lines or simple arrows). DO NOT write text on the connector lines themselves; they should be purely visual.
    *   **Node Shapes**: For horizontal maps, **ALL nodes (Central Theme, Main Ideas, Sub-topics, and any further levels) MUST be RECTANGLES**.
{{else}}
2.  **CLEAR HIERARCHY AND NODE STYLES (Vertical/Default Layout)**:
    *   **Layout**: The map MUST follow a **top-down hierarchical structure**. The central theme ("{{centralThemeLabel}}") must be the most prominent node, positioned at the **top**. Main ideas (labels from \`mainBranches\`) must clearly branch downwards or outwards from it. Sub-topics (labels from \`children\` of main ideas) must clearly branch from their respective parent main idea nodes, reflecting the provided hierarchy. Use clear visual connectors (lines or simple arrows). DO NOT write text on the connector lines themselves; they should be purely visual.
    *   **Node Shapes**:
        *   The Central Theme node containing "{{centralThemeLabel}}" must be a **rectangle**.
        *   Nodes representing Main Ideas (the direct children of the central theme, i.e., items in \`mainBranches\`) must be **rectangles**.
        *   Nodes representing Sub-topics (children of Main Ideas) must be **circles**.
        *   If there are further levels of sub-topics (children of children), they should also be **circles**.
{{/if}}

3.  **PROFESSIONAL APPEARANCE**: The map should be visually organized, uncluttered, and professional. Use distinct shapes as specified. A simple, consistent color scheme (e.g., light-colored nodes like pale yellow or light blue with dark text, or a scheme that ensures high contrast and readability) is preferred. Text legibility, correct shapes, accurate content, and faithful representation of the provided hierarchy are more important than complex aesthetics.
4.  **ABSOLUTE STRUCTURAL FIDELITY AND NO HALLUCINATIONS**:
    *   You are GIVEN a precise textual structure. Your ONLY task is to visually represent THIS EXACT STRUCTURE.
    *   **DO NOT ADD ANY NODES, TEXT, or SHAPES** that are not explicitly defined by the input structure.
    *   **EVERY NODE MUST BE CONNECTED**: Every Main Idea node MUST be visually connected to the Central Theme. Every Sub-topic node MUST be visually connected to its parent Main Idea. If there are sub-sub-topics, they MUST be connected to their parent sub-topic.
    *   **NO DISCONNECTED OR FLOATING NODES ARE ALLOWED**, except for the Central Theme node *before* its first branches.
    *   All visual connections (lines/arrows) in the image MUST accurately reflect the parent-child relationships defined in the provided textual hierarchy.
    *   The final image must be a direct, faithful, and complete visual translation of the provided data structure.

If any text is distorted, unreadable, or omitted, or if any text is added that was not in the provided structure, or if the node shapes are incorrect (based on the {{#if isHorizontal}}horizontal{{else}}vertical{{/if}} layout requirement), or if the connections do not accurately represent the provided hierarchy (e.g., a node is disconnected), the image is considered a failure. Prioritize text clarity, faithfulness to the provided content and structure, and correct node styling above all other considerations.
`,
});


export async function createMindMap(input: CreateMindMapInput): Promise<CreateMindMapOutput> {
  // Mock mode for development when AI is not available
  if (process.env.NODE_ENV === 'development' && !process.env.GOOGLE_AI_API_KEY) {
    console.log('🧠 Running createMindMap in MOCK mode');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return a mock SVG mind map as data URI
    const mockSvg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <style>
          .node { fill: #f1f5f9; stroke: #334155; stroke-width: 2; }
          .central { fill: #3b82f6; stroke: #1e40af; }
          .text { font-family: Arial, sans-serif; font-size: 14px; text-anchor: middle; }
          .central-text { fill: white; font-weight: bold; font-size: 16px; }
          .branch-text { fill: #334155; font-weight: 500; }
          .line { stroke: #64748b; stroke-width: 2; }
        </style>
        
        <!-- Central node -->
        <circle cx="400" cy="300" r="80" class="node central"/>
        <text x="400" y="305" class="text central-text">${input.centralTheme}</text>
        
        <!-- Branch 1 -->
        <line x1="480" y1="300" x2="600" y2="200" class="line"/>
        <circle cx="600" cy="200" r="50" class="node"/>
        <text x="600" y="205" class="text branch-text">Concepto 1</text>
        
        <!-- Branch 2 -->
        <line x1="400" y1="220" x2="400" y2="100" class="line"/>
        <circle cx="400" cy="100" r="50" class="node"/>
        <text x="400" y="105" class="text branch-text">Concepto 2</text>
        
        <!-- Branch 3 -->
        <line x1="320" y1="300" x2="200" y2="200" class="line"/>
        <circle cx="200" cy="200" r="50" class="node"/>
        <text x="200" y="205" class="text branch-text">Concepto 3</text>
        
        <!-- Branch 4 -->
        <line x1="400" y1="380" x2="400" y2="500" class="line"/>
        <circle cx="400" cy="500" r="50" class="node"/>
        <text x="400" y="505" class="text branch-text">Concepto 4</text>
        
        <!-- Sub-nodes -->
        <line x1="650" y1="200" x2="720" y2="150" class="line"/>
        <circle cx="720" cy="150" r="30" class="node"/>
        <text x="720" y="155" class="text branch-text">Detalle</text>
        
        <line x1="150" y1="200" x2="80" y2="150" class="line"/>
        <circle cx="80" cy="150" r="30" class="node"/>
        <text x="80" y="155" class="text branch-text">Detalle</text>
      </svg>
    `;
    
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(mockSvg).toString('base64')}`;
    return { imageDataUri: dataUri };
  }

  // Original AI implementation
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
    // Pass the full input, as generateMindMapStructurePrompt expects centralTheme, bookTitle, and language
    const structureResponse = await generateMindMapStructurePrompt(input); 
    const mindMapStructure = structureResponse.output;

    if (!mindMapStructure) {
      throw new Error('Failed to generate mind map structure.');
    }

    // Step 2: Render the structured data as an image
    // Prepare the input for the image rendering prompt
    const renderImageInput: RenderImageInput = {
      ...mindMapStructure,
      isHorizontal: input.isHorizontal, // Pass the isHorizontal flag
    };

    const renderOutput = await renderMindMapImageHandlebarsPrompt.render(renderImageInput);
    const actualPromptText = renderOutput.messages[0]?.content[0]?.text;

    if (!actualPromptText) {
      throw new Error('Failed to render the image generation prompt text from RenderResponse.');
    }
    
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', 
      prompt: actualPromptText, 
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

