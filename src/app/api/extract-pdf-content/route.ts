import { NextRequest, NextResponse } from 'next/server';
import { bookPDFs } from '@/lib/books-data';

// Helper function to extract Google Drive file ID from various URL formats
function extractGoogleDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)\//,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Generate mock PDF content based on book and subject
function generateMockPDFContent(book: any): string {
  const { course, subject, title } = book;
  
  // Create realistic mock content based on the subject and course level
  const mockContent = `
Contenido educativo de ${title}
Curso: ${course}
Materia: ${subject}

Este libro contiene conceptos fundamentales y avanzados relacionados con ${subject} para estudiantes de ${course}.

Los temas principales incluyen:
- Conceptos básicos y definiciones importantes
- Ejemplos prácticos y casos de estudio
- Ejercicios y actividades de refuerzo
- Metodologías de aprendizaje específicas

El contenido está estructurado de manera progresiva, desde conceptos básicos hasta aplicaciones más complejas.
Los estudiantes pueden utilizar este material para reforzar su comprensión y prepararse para evaluaciones.

Cada capítulo incluye objetivos de aprendizaje claros y actividades de autoevaluación.
Se recomienda complementar el estudio con práctica adicional y discusión en grupo.

El material está actualizado según los estándares curriculares vigentes para ${course}.
Los conceptos se presentan con ejemplos relevantes y contextualizados.
`;

  return mockContent.trim();
}

// Function to simulate PDF content extraction
async function simulatePDFContentExtraction(driveId: string, book: any): Promise<string> {
  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, return mock content based on the book information
    // In a production environment, this would actually parse the PDF
    const mockContent = generateMockPDFContent(book);
    
    return `${mockContent}\n\n[Contenido extraído del PDF ID: ${driveId}]`;
    
  } catch (error) {
    console.error('Error simulating PDF content extraction:', error);
    return `Contenido de referencia para ${book.title}. El PDF está disponible pero no se pudo extraer el contenido completo. Materia: ${book.subject}, Curso: ${book.course}.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { bookTitle } = await request.json();
    
    if (!bookTitle) {
      return NextResponse.json(
        { error: 'Book title is required' },
        { status: 400 }
      );
    }
    
    // Find the book in our database
    const book = bookPDFs.find(book => book.title === bookTitle);
    
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    
    // Extract Google Drive file ID
    const driveId = book.driveId || extractGoogleDriveFileId(book.pdfUrl);
    
    if (!driveId) {
      return NextResponse.json(
        { error: 'Invalid PDF URL format' },
        { status: 400 }
      );
    }
    
    // Simulate PDF content extraction
    const pdfContent = await simulatePDFContentExtraction(driveId, book);
    
    return NextResponse.json({
      success: true,
      bookTitle: book.title,
      course: book.course,
      subject: book.subject,
      pdfContent: pdfContent,
      driveId: driveId
    });
    
  } catch (error) {
    console.error('Error in extract-pdf-content API:', error);
    return NextResponse.json(
      { error: 'Failed to extract PDF content' },
      { status: 500 }
    );
  }
}
