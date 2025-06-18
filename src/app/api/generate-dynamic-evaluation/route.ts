import { NextRequest, NextResponse } from 'next/server';
import { generateDynamicEvaluationContent } from '@/ai/flows/generate-evaluation-content';

export async function POST(request: NextRequest) {
  try {
    const { bookTitle, topic, language, pdfContent } = await request.json();
    
    if (!bookTitle || !topic || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: bookTitle, topic, and language are required' },
        { status: 400 }
      );
    }
    
    // Add timestamp to ensure uniqueness in generation
    const timestamp = Date.now();
    const randomSeed = Math.floor(Math.random() * 10000);
    
    const result = await generateDynamicEvaluationContent({
      bookTitle,
      topic,
      language: language as 'es' | 'en',
      pdfContent: pdfContent || '',
      timestamp,
      randomSeed
    });
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error generating dynamic evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to generate evaluation content' },
      { status: 500 }
    );
  }
}
