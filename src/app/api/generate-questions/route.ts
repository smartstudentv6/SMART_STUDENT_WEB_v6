// API Route para generar preguntas con Gemini de forma segura
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Inicializa el cliente de Gemini con tu API Key desde las variables de entorno
// ¡IMPORTANTE! Nunca escribas la API Key directamente en el código.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
  try {
    // 1. Extraer los parámetros del cuerpo de la petición
    const { topic, numQuestions } = await request.json();

    if (!topic || !numQuestions) {
      return NextResponse.json(
        { error: "Faltan los parámetros 'topic' y 'numQuestions'" },
        { status: 400 }
      );
    }

    // --- LÓGICA DE DISTRIBUCIÓN DE PREGUNTAS ---
    const baseCount = Math.floor(numQuestions / 3);
    let remainder = numQuestions % 3;

    let mcCount = baseCount; // multiple_choice
    let msCount = baseCount; // multiple_select
    let tfCount = baseCount; // true_false

    // Distribuir el resto para alcanzar el total exacto
    if (remainder > 0) {
      mcCount++;
      remainder--;
    }
    if (remainder > 0) {
      msCount++;
      remainder--;
    }

    console.log(`[API Route] Petición para ${numQuestions} preguntas sobre "${topic}"`);
    console.log(`[API Route] Distribución: ${mcCount} Alternativas, ${msCount} Selección Múltiple, ${tfCount} V/F`);

    // 2. PROMPT MEJORADO CON INSTRUCCIONES MATEMÁTICAS EXACTAS
    const userPrompt = `
      Genera un cuestionario de exactamente ${numQuestions} preguntas sobre "${topic}" para estudiantes de secundaria, distribuidas de la siguiente manera:
      - Exactamente ${mcCount} preguntas de tipo "multiple_choice" (selección única con 4 opciones).
      - Exactamente ${msCount} preguntas de tipo "multiple_select" (selección múltiple con 4 opciones).
      - Exactamente ${tfCount} preguntas de tipo "true_false" (verdadero o falso).

      IMPORTANTE: El total debe ser exactamente ${numQuestions} preguntas (${mcCount} + ${msCount} + ${tfCount} = ${numQuestions}).
      
      Asegúrate de que las preguntas y sus opciones sean únicas y no se repitan.
      Tu respuesta DEBE SER ÚNICAMENTE un objeto JSON válido, sin texto introductorio, sin explicaciones y sin formato Markdown.
      
      El JSON debe ser un array de exactamente ${numQuestions} objetos. Cada objeto debe tener:
      1. "type": una cadena que sea "multiple_choice", "multiple_select", o "true_false"
      2. "question": el texto de la pregunta
      3. "options": un array de strings con las alternativas
         - Para "true_false", este array debe ser siempre ["Verdadero", "Falso"]
         - Para los otros dos tipos, debe contener exactamente 4 opciones de texto
      4. "correct": la respuesta correcta
         - Para "multiple_choice" y "true_false", debe ser un NÚMERO con el índice correcto (ej: 0)
         - Para "multiple_select", debe ser un ARRAY de NÚMEROS con los índices correctos (ej: [1, 3])
      5. "explanation": una breve explicación de la respuesta correcta
    `;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const result = await model.generateContent(userPrompt);
      const response = await result.response;
      let text = response.text();

      console.log("[API Route] Respuesta recibida de Gemini:", text);

      // 3. Limpiar y parsear la respuesta JSON
      // A veces la IA devuelve el JSON envuelto en ```json ... ```
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("La respuesta de la IA no contiene un JSON válido.");
      }

      const cleanedJson = jsonMatch[0];
      const questions = JSON.parse(cleanedJson);

      console.log(`[API Route] JSON parseado correctamente. Devolviendo ${questions.length} preguntas.`);

      // 4. Validar que la cantidad de preguntas sea correcta
      if (questions.length !== numQuestions) {
        console.warn(`[API Route] ⚠️ Se esperaban ${numQuestions} preguntas pero se generaron ${questions.length}. Ajustando...`);
        
        if (questions.length > numQuestions) {
          // Si hay más preguntas de las esperadas, tomar solo las primeras
          questions.splice(numQuestions);
        } else {
          // Si hay menos preguntas, generar preguntas adicionales simples
          while (questions.length < numQuestions) {
            questions.push({
              type: "true_false",
              question: `Pregunta adicional ${questions.length + 1} sobre ${topic}`,
              options: ["Verdadero", "Falso"],
              correct: 0,
              explanation: "Pregunta generada para completar el cuestionario."
            });
          }
        }
      }

      // 5. Verificar distribución final
      const finalDistribution = {
        multiple_choice: questions.filter((q: any) => q.type === 'multiple_choice').length,
        multiple_select: questions.filter((q: any) => q.type === 'multiple_select').length,
        true_false: questions.filter((q: any) => q.type === 'true_false').length
      };

      console.log(`[API Route] ✅ Distribución final:`, finalDistribution);
      console.log(`[API Route] ✅ Total: ${finalDistribution.multiple_choice + finalDistribution.multiple_select + finalDistribution.true_false} preguntas`);

      // 6. Devolver las preguntas al frontend
      return NextResponse.json(questions);

    } catch (error) {
      console.error("Error al generar preguntas con la API de Gemini:", error);
      return NextResponse.json(
        { error: "No se pudieron generar las preguntas desde la IA." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API Route] ❌ Error al procesar la petición:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
