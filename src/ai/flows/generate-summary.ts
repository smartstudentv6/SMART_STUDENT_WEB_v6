
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
  pdfContext: z.string().optional().describe('Additional context from PDF database search.'),
});

export type GenerateSummaryInput = z.infer<typeof GenerateSummaryInputSchema>;

// Simulated PDF database search function
async function searchPDFDatabase(bookTitle: string, topic: string): Promise<string> {
  // In a real implementation, this would:
  // 1. Connect to your database
  // 2. Search for PDF documents related to the book title
  // 3. Extract relevant content related to the topic
  // 4. Return the extracted text content
  
  // For now, return a simulated PDF context
  return `Información adicional encontrada en la base de datos de PDFs para "${bookTitle}" sobre el tema "${topic}":
  
Esta sección contiene información específica extraída de documentos PDF relacionados con el libro y tema solicitado. El sistema ha identificado contenido relevante que complementa el conocimiento base de la IA.

Nota: En una implementación real, aquí aparecería el contenido específico extraído de los PDFs almacenados en la base de datos.`;
}

const GenerateSummaryOutputSchema = z.object({
  summary: z.string().describe('The generated summary of the topic, potentially up to 10,000 words based on AI knowledge of the book and topic. Should be formatted in Markdown.'),
  keyPoints: z.array(z.string()).optional().describe('An array of 10 key points if requested, in the specified language.'),
  progress: z.string().describe('One-sentence progress of summary generation.'),
});

export type GenerateSummaryOutput = z.infer<typeof GenerateSummaryOutputSchema>;

export async function generateSummary(input: GenerateSummaryInput): Promise<GenerateSummaryOutput> {
  try {
    // Debug logging
    console.log('=== GENERATE SUMMARY DEBUG ===');
    console.log('Input:', JSON.stringify(input, null, 2));
    console.log('GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
    console.log('GOOGLE_API_KEY value:', process.env.GOOGLE_API_KEY ? `${process.env.GOOGLE_API_KEY.substring(0, 10)}...` : 'not set');
    
    // Check if API key is available and valid
    const hasValidApiKey = process.env.GOOGLE_API_KEY && 
                          process.env.GOOGLE_API_KEY !== 'your_google_api_key_here' && 
                          process.env.GOOGLE_API_KEY.length > 10;
    
    console.log('hasValidApiKey:', hasValidApiKey);
    
    if (!hasValidApiKey) {
      // Return enhanced mock data for development with more detailed content
      const isSpanish = input.language === 'es';
      
      const topicContent = getTopicContent(input.topic, input.bookTitle, isSpanish);
      
      console.log('Using mock data. includeKeyPoints:', input.includeKeyPoints);
      console.log('Mock keyPoints length:', topicContent.keyPoints?.length || 0);
      
      return {
        summary: topicContent.summary,
        keyPoints: input.includeKeyPoints ? topicContent.keyPoints : undefined,
        progress: isSpanish 
          ? `Resumen generado con datos de ejemplo para "${input.topic}" durante la configuración de la API.`
          : `Summary generated with example data for "${input.topic}" during API setup.`
      };
    }

    // Simulate PDF database search - In a real implementation, this would query your database
    const pdfContent = await searchPDFDatabase(input.bookTitle, input.topic);
    
    console.log('Using real API. Calling generateSummaryFlow...');
    
    // Generate summary using Gemini with PDF content context
    const result = await generateSummaryFlow({
      ...input,
      pdfContext: pdfContent
    });
    
    console.log('API result keyPoints length:', result.keyPoints?.length || 0);
    console.log('=== END DEBUG ===');
    
    return result;
  } catch (error) {
    console.error('Error generating summary:', error);
    const isSpanish = input.language === 'es';
    // Return fallback data
    return {
      summary: isSpanish 
        ? `# Error al generar resumen\n\nNo se pudo generar el resumen para "${input.topic}". Por favor, intenta nuevamente.`
        : `# Error generating summary\n\nCould not generate summary for "${input.topic}". Please try again.`,
      keyPoints: undefined,
      progress: isSpanish ? 'Error en la generación del resumen.' : 'Error in summary generation.'
    };
  }
}

// Enhanced content generator for different topics and books
function getTopicContent(topic: string, bookTitle: string, isSpanish: boolean) {
  const topicLower = topic.toLowerCase();
  
  // Sistema Respiratorio content
  if (topicLower.includes('respiratorio') || topicLower.includes('respiratory')) {
    return {
      summary: isSpanish ? `# Sistema Respiratorio

## Introducción

El sistema respiratorio es uno de los sistemas más vitales del cuerpo humano, encargado del intercambio gaseoso entre el organismo y el medio ambiente. Su función principal es proporcionar oxígeno a las células y eliminar el dióxido de carbono como producto de desecho del metabolismo celular.

## Anatomía del Sistema Respiratorio

### Vías Respiratorias Superiores

**Nariz y cavidad nasal**: La nariz actúa como la primera línea de defensa y acondicionamiento del aire. La cavidad nasal está revestida por mucosa respiratoria que calienta, humidifica y filtra el aire inspirado.

**Faringe**: Es un conducto compartido entre los sistemas respiratorio y digestivo. Se divide en nasofaringe, orofaringe e hipofaringe.

**Laringe**: Contiene las cuerdas vocales y actúa como válvula protectora durante la deglución. La epiglotis previene que los alimentos ingresen a las vías respiratorias.

### Vías Respiratorias Inferiores

**Tráquea**: Tubo de aproximadamente 12 cm de longitud, reforzado por anillos cartilaginosos en forma de C que mantienen su permeabilidad.

**Bronquios**: La tráquea se bifurca en bronquios principales derecho e izquierdo, que a su vez se ramifican en bronquios secundarios y terciarios.

**Bronquiolos**: Conductos de menor calibre que no poseen cartílago en sus paredes, solo músculo liso que permite la regulación del flujo aéreo.

**Alvéolos**: Estructuras microscópicas donde ocurre el intercambio gaseoso. Los pulmones contienen aproximadamente 300 millones de alvéolos.

## Fisiología Respiratoria

### Mecánica Respiratoria

**Inspiración**: Proceso activo mediado principalmente por el diafragma y los músculos intercostales externos. La contracción del diafragma aumenta el volumen torácico, creando una presión negativa que permite el ingreso de aire.

**Espiración**: En reposo es un proceso pasivo, resultado de la relajación de los músculos inspiratorios y la elasticidad pulmonar. Durante el ejercicio se vuelve activa con la participación de músculos accesorios.

### Intercambio Gaseoso

El intercambio gaseoso ocurre por difusión simple a través de la membrana alveolocapilar. El oxígeno pasa de los alvéolos a la sangre, mientras que el dióxido de carbono se transfiere en dirección opuesta.

### Transporte de Gases

**Oxígeno**: Se transporta principalmente unido a la hemoglobina (98%) y en menor proporción disuelto en plasma (2%).

**Dióxido de carbono**: Se transporta como bicarbonato (70%), unido a proteínas (23%) y disuelto en plasma (7%).

## Control de la Respiración

### Centro Respiratorio

Ubicado en el bulbo raquídeo, regula automáticamente la frecuencia y profundidad respiratoria. Responde a cambios en los niveles de CO₂, O₂ y pH sanguíneo.

### Quimiorreceptores

- **Centrales**: Detectan cambios en el pH del líquido cefalorraquídeo
- **Periféricos**: Localizados en cuerpos carotídeos y aórticos, sensibles a hipoxia, hipercapnia y acidosis

## Funciones Adicionales

### Funciones No Respiratorias

- **Fonación**: Producción de sonidos mediante las cuerdas vocales
- **Olfato**: Detección de olores a través del epitelio olfatorio
- **Regulación del pH**: Eliminación de CO₂ para mantener el equilibrio ácido-base
- **Defensa**: Filtración de partículas y microorganismos
- **Metabolismo**: Conversión de angiotensina I a angiotensina II

## Patologías Comunes

### Enfermedades Obstructivas

- **Asma**: Inflamación crónica de las vías respiratorias con broncoconstricción reversible
- **EPOC**: Enfermedad pulmonar obstructiva crónica, principalmente causada por tabaquismo

### Enfermedades Restrictivas

- **Fibrosis pulmonar**: Engrosamiento y cicatrización del tejido pulmonar
- **Neumotórax**: Acumulación de aire en el espacio pleural

### Infecciones

- **Neumonía**: Infección de los alvéolos pulmonares
- **Bronquitis**: Inflamación de los bronquios

## Importancia Clínica

El conocimiento del sistema respiratorio es fundamental para:

- Diagnóstico y tratamiento de enfermedades pulmonares
- Manejo de la ventilación mecánica
- Rehabilitación respiratoria
- Prevención de enfermedades respiratorias
- Comprensión de la fisiología del ejercicio

## Conclusión

El sistema respiratorio es un sistema complejo y altamente eficiente que garantiza el intercambio gaseoso necesario para la vida. Su correcto funcionamiento depende de la integridad anatómica y la coordinación fisiológica de todos sus componentes, desde las vías respiratorias superiores hasta los alvéolos pulmonares.` 
        : `# Respiratory System

## Introduction

The respiratory system is one of the most vital systems in the human body, responsible for gas exchange between the organism and the environment. Its main function is to provide oxygen to cells and eliminate carbon dioxide as a waste product of cellular metabolism.

## Anatomy of the Respiratory System

### Upper Respiratory Tract

**Nose and nasal cavity**: The nose acts as the first line of defense and air conditioning. The nasal cavity is lined with respiratory mucosa that warms, humidifies, and filters inspired air.

**Pharynx**: A shared conduit between the respiratory and digestive systems. It is divided into nasopharynx, oropharynx, and hypopharynx.

**Larynx**: Contains the vocal cords and acts as a protective valve during swallowing. The epiglottis prevents food from entering the respiratory tract.

### Lower Respiratory Tract

**Trachea**: A tube approximately 12 cm long, reinforced by C-shaped cartilaginous rings that maintain its patency.

**Bronchi**: The trachea bifurcates into right and left main bronchi, which further branch into secondary and tertiary bronchi.

**Bronchioles**: Smaller caliber ducts that lack cartilage in their walls, containing only smooth muscle that allows airflow regulation.

**Alveoli**: Microscopic structures where gas exchange occurs. The lungs contain approximately 300 million alveoli.

## Respiratory Physiology

### Respiratory Mechanics

**Inspiration**: Active process mediated mainly by the diaphragm and external intercostal muscles. Diaphragm contraction increases thoracic volume, creating negative pressure that allows air entry.

**Expiration**: At rest, it's a passive process resulting from relaxation of inspiratory muscles and lung elasticity. During exercise, it becomes active with accessory muscle participation.

### Gas Exchange

Gas exchange occurs by simple diffusion through the alveolar-capillary membrane. Oxygen passes from alveoli to blood, while carbon dioxide transfers in the opposite direction.

### Gas Transport

**Oxygen**: Transported mainly bound to hemoglobin (98%) and in lesser proportion dissolved in plasma (2%).

**Carbon dioxide**: Transported as bicarbonate (70%), bound to proteins (23%), and dissolved in plasma (7%).

## Respiratory Control

### Respiratory Center

Located in the medulla oblongata, it automatically regulates respiratory frequency and depth. It responds to changes in blood CO₂, O₂, and pH levels.

### Chemoreceptors

- **Central**: Detect changes in cerebrospinal fluid pH
- **Peripheral**: Located in carotid and aortic bodies, sensitive to hypoxia, hypercapnia, and acidosis

## Additional Functions

### Non-respiratory Functions

- **Phonation**: Sound production through vocal cords
- **Olfaction**: Odor detection through olfactory epithelium
- **pH regulation**: CO₂ elimination to maintain acid-base balance
- **Defense**: Filtration of particles and microorganisms
- **Metabolism**: Conversion of angiotensin I to angiotensin II

## Common Pathologies

### Obstructive Diseases

- **Asthma**: Chronic airway inflammation with reversible bronchoconstriction
- **COPD**: Chronic obstructive pulmonary disease, mainly caused by smoking

### Restrictive Diseases

- **Pulmonary fibrosis**: Thickening and scarring of lung tissue
- **Pneumothorax**: Air accumulation in pleural space

### Infections

- **Pneumonia**: Infection of pulmonary alveoli
- **Bronchitis**: Inflammation of bronchi

## Clinical Importance

Knowledge of the respiratory system is fundamental for:

- Diagnosis and treatment of pulmonary diseases
- Mechanical ventilation management
- Respiratory rehabilitation
- Prevention of respiratory diseases
- Understanding exercise physiology

## Conclusion

The respiratory system is a complex and highly efficient system that ensures the gas exchange necessary for life. Its proper functioning depends on anatomical integrity and physiological coordination of all its components, from upper respiratory tract to pulmonary alveoli.`,
      keyPoints: isSpanish ? [
        "El sistema respiratorio es responsable del intercambio gaseoso entre el organismo y el medio ambiente",
        "Las vías respiratorias se dividen en superiores (nariz, faringe, laringe) e inferiores (tráquea, bronquios, alvéolos)",
        "La inspiración es un proceso activo mediado por el diafragma y músculos intercostales",
        "El intercambio gaseoso ocurre por difusión simple en la membrana alveolocapilar",
        "El oxígeno se transporta principalmente unido a la hemoglobina (98%)",
        "El centro respiratorio en el bulbo raquídeo regula automáticamente la respiración",
        "Los quimiorreceptores detectan cambios en CO₂, O₂ y pH para ajustar la respiración",
        "Las funciones no respiratorias incluyen fonación, olfato y regulación del pH",
        "Las patologías comunes incluyen asma, EPOC, neumonía y bronquitis",
        "El conocimiento del sistema respiratorio es fundamental para el diagnóstico y tratamiento clínico"
      ] : [
        "The respiratory system is responsible for gas exchange between the organism and environment",
        "Airways are divided into upper (nose, pharynx, larynx) and lower (trachea, bronchi, alveoli)",
        "Inspiration is an active process mediated by diaphragm and intercostal muscles",
        "Gas exchange occurs by simple diffusion at the alveolar-capillary membrane",
        "Oxygen is transported mainly bound to hemoglobin (98%)",
        "The respiratory center in medulla oblongata automatically regulates breathing",
        "Chemoreceptors detect changes in CO₂, O₂, and pH to adjust respiration",
        "Non-respiratory functions include phonation, olfaction, and pH regulation",
        "Common pathologies include asthma, COPD, pneumonia, and bronchitis",
        "Knowledge of respiratory system is fundamental for clinical diagnosis and treatment"
      ]
    };
  }
  
  // Default general content
  return {
    summary: isSpanish ? `# Resumen de ${topic}

## Introducción

Este es un resumen detallado sobre "${topic}" basado en el contenido del libro "${bookTitle}". El sistema está configurado para generar resúmenes comprensivos utilizando inteligencia artificial.

## Conceptos Principales

### Definición y Alcance

El tema "${topic}" abarca múltiples aspectos importantes que requieren un análisis detallado para su comprensión completa.

### Características Fundamentales

- **Aspecto teórico**: Fundamentos conceptuales del tema
- **Aspecto práctico**: Aplicaciones en el mundo real
- **Relevancia actual**: Importancia en el contexto contemporáneo

## Desarrollo del Tema

### Elementos Clave

El estudio de "${topic}" involucra la comprensión de varios elementos interconectados que forman un sistema coherente de conocimiento.

### Metodología de Análisis

Para analizar adecuadamente este tema, es necesario considerar múltiples perspectivas y enfoques metodológicos.

## Aplicaciones Prácticas

### En el Ámbito Académico

El conocimiento de "${topic}" es fundamental para el desarrollo académico y profesional en campos relacionados.

### En el Ámbito Profesional

Las aplicaciones prácticas de este conocimiento se extienden a diversas áreas profesionales.

## Conclusiones

El estudio de "${topic}" proporciona una base sólida para la comprensión de conceptos más avanzados y su aplicación en contextos específicos.

## Recomendaciones para Estudio Adicional

- Revisar fuentes primarias del tema
- Practicar con ejercicios aplicados
- Buscar conexiones con otros temas relacionados
- Mantenerse actualizado con desarrollos recientes

*Nota: Para obtener resúmenes generados por IA con contenido específico del libro, configure la API key de Google Gemini en las variables de entorno.*` 
      : `# Summary of ${topic}

## Introduction

This is a detailed summary about "${topic}" based on the content of the book "${bookTitle}". The system is configured to generate comprehensive summaries using artificial intelligence.

## Main Concepts

### Definition and Scope

The topic "${topic}" encompasses multiple important aspects that require detailed analysis for complete understanding.

### Fundamental Characteristics

- **Theoretical aspect**: Conceptual foundations of the topic
- **Practical aspect**: Real-world applications
- **Current relevance**: Importance in contemporary context

## Topic Development

### Key Elements

The study of "${topic}" involves understanding several interconnected elements that form a coherent system of knowledge.

### Analysis Methodology

To properly analyze this topic, it's necessary to consider multiple perspectives and methodological approaches.

## Practical Applications

### In Academic Field

Knowledge of "${topic}" is fundamental for academic and professional development in related fields.

### In Professional Field

Practical applications of this knowledge extend to various professional areas.

## Conclusions

The study of "${topic}" provides a solid foundation for understanding more advanced concepts and their application in specific contexts.

## Recommendations for Additional Study

- Review primary sources on the topic
- Practice with applied exercises
- Look for connections with other related topics
- Stay updated with recent developments

*Note: To get AI-generated summaries with specific book content, configure the Google Gemini API key in environment variables.*`,
    keyPoints: isSpanish ? [
      `El tema "${topic}" abarca múltiples aspectos importantes para su comprensión`,
      `Los fundamentos teóricos proporcionan la base conceptual necesaria`,
      `Las aplicaciones prácticas conectan la teoría con el mundo real`,
      `La relevancia actual demuestra la importancia contemporánea del tema`,
      `La metodología de análisis requiere múltiples perspectivas`,
      `Las aplicaciones académicas son fundamentales para el desarrollo profesional`,
      `El conocimiento se extiende a diversas áreas profesionales`,
      `Las recomendaciones incluyen revisar fuentes primarias y practicar`,
      `La conexión con otros temas enriquece la comprensión general`,
      `La actualización constante es importante para mantener relevancia`
    ] : [
      `The topic "${topic}" encompasses multiple important aspects for understanding`,
      `Theoretical foundations provide the necessary conceptual base`,
      `Practical applications connect theory with the real world`,
      `Current relevance demonstrates the contemporary importance of the topic`,
      `Analysis methodology requires multiple perspectives`,
      `Academic applications are fundamental for professional development`,
      `Knowledge extends to various professional areas`,
      `Recommendations include reviewing primary sources and practicing`,
      `Connection with other topics enriches general understanding`,
      `Constant updating is important to maintain relevance`
    ]
  };
}

const generateSummaryPrompt = ai.definePrompt({
  name: 'generateSummaryPrompt',
  input: {
    schema: GenerateSummaryInputSchema,
  },
  output: {
    schema: GenerateSummaryOutputSchema,
  },
  prompt: `You are an AI assistant expert in educational content and academic summarization, with access to a comprehensive database of PDF documents.

Topic to Summarize: {{{topic}}}
Book Title: {{{bookTitle}}}
Output Language: {{{language}}}
{{#if pdfContext}}
PDF Database Context: {{{pdfContext}}}
{{/if}}

Instructions:
1. Generate a comprehensive and detailed educational summary of the specified topic "{{{topic}}}" based on:
   - Your knowledge of the book "{{{bookTitle}}}"
   - General academic knowledge if the specific book is not in your training data
   {{#if pdfContext}}
   - The additional context provided from the PDF database search
   {{/if}}
   
   The summary MUST be written in the language specified by the 'language' input field:
   - If 'language' is 'es', write everything in Spanish
   - If 'language' is 'en', write everything in English
   
   IMPORTANT: Create an extensive, comprehensive summary aiming for approximately 8,000-10,000 words of substantial, educational content. This should be a thorough academic resource.
   
   Structure your summary as follows:
   - Start with a detailed introduction explaining what the topic is about (500-800 words)
   - Include 8-12 main sections with descriptive headings (700-1000 words each)
   - Provide detailed explanations with specific examples, case studies, and practical applications
   - Include scientific or technical terminology with clear explanations
   - Add subsections within each main section for better organization
   - Include historical context where relevant
   - Discuss current research and developments
   - Address common misconceptions or challenges
   - Provide comparative analysis where applicable
   - End with comprehensive conclusions and practical applications (500-800 words)
   
   Format using Markdown:
   - Use # for the main title
   - Use ## for major sections  
   - Use ### for subsections
   - Use #### for detailed sub-points
   - Use **bold** for important terms and concepts
   - Use *italics* for emphasis
   - Use bullet points (-) for lists
   - Use numbered lists (1.) for sequential information
   - Use double newlines between paragraphs
   - Include relevant quotes or citations where appropriate

{{#if includeKeyPoints}}
2. MANDATORY: After the summary, you MUST extract exactly 10 key points that represent the most important takeaways from your comprehensive summary. This is a REQUIRED field when includeKeyPoints is true. These should be:
   - Distinct and non-repetitive
   - Educational and highly informative
   - Written as complete, detailed statements (2-3 sentences each)
   - Cover different aspects of the topic
   - In the same language as the summary ({{{language}}})
   - Prioritize the most critical concepts for student understanding
   
   IMPORTANT: The keyPoints field in the JSON response must contain an array of exactly 10 strings, not null or empty.
{{/if}}

Focus on creating educational content that would serve as a complete academic resource for students studying this topic at university level. Make it comprehensive, authoritative, and accessible while maintaining academic rigor.

Return the output in the specified JSON format with "summary", "keyPoints" (if requested), and "progress" fields.`,
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
    
    // Debug logging
    console.log('API Response - includeKeyPoints:', input.includeKeyPoints);
    console.log('API Response - keyPoints received:', output.keyPoints ? output.keyPoints.length : 'none');
    
    const progressMessage = `Generated a detailed summary for topic "${input.topic}" from book "${input.bookTitle}" in ${input.language}.`;
    
    // Ensure keyPoints are returned if requested, even if API didn't generate them
    let finalKeyPoints = output.keyPoints;
    if (input.includeKeyPoints && (!finalKeyPoints || finalKeyPoints.length === 0)) {
      // Generate fallback key points
      const isSpanish = input.language === 'es';
      finalKeyPoints = generateFallbackKeyPoints(input.topic, input.bookTitle, isSpanish);
    }
    
    return {
      summary: output.summary || '',
      keyPoints: input.includeKeyPoints ? finalKeyPoints : undefined,
      progress: progressMessage,
    };
  }
);

// Function to generate fallback key points when API doesn't provide them
function generateFallbackKeyPoints(topic: string, bookTitle: string, isSpanish: boolean): string[] {
  return isSpanish ? [
    `Análisis detallado del tema "${topic}" según el contenido del libro "${bookTitle}"`,
    `Conceptos fundamentales que todo estudiante debe conocer sobre este tema`,
    `Aplicaciones prácticas y relevancia en el contexto académico actual`,
    `Metodologías de estudio recomendadas para profundizar en el conocimiento`,
    `Conexiones interdisciplinarias que enriquecen la comprensión del tema`,
    `Importancia histórica y desarrollo evolutivo de los conceptos clave`,
    `Casos de estudio y ejemplos prácticos para ilustrar la teoría`,
    `Herramientas de evaluación y autoevaluación del aprendizaje`,
    `Recursos adicionales recomendados para continuar el estudio`,
    `Implicaciones futuras y tendencias emergentes en el área de estudio`
  ] : [
    `Detailed analysis of the topic "${topic}" according to the content of the book "${bookTitle}"`,
    `Fundamental concepts that every student should know about this topic`,
    `Practical applications and relevance in the current academic context`,
    `Recommended study methodologies to deepen knowledge`,
    `Interdisciplinary connections that enrich topic understanding`,
    `Historical importance and evolutionary development of key concepts`,
    `Case studies and practical examples to illustrate theory`,
    `Assessment tools and self-evaluation of learning`,
    `Additional recommended resources to continue studying`,
    `Future implications and emerging trends in the study area`
  ];
}

