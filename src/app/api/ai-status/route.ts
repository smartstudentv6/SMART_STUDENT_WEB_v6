import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function GET() {
  try {
    // Check if API key is configured
    const hasApiKey = process.env.GOOGLE_API_KEY && 
                     process.env.GOOGLE_API_KEY !== 'your_google_api_key_here' &&
                     process.env.GOOGLE_API_KEY.length > 0;

    console.log('Checking AI status...');
    console.log('Has API Key:', hasApiKey);
    console.log('API Key length:', process.env.GOOGLE_API_KEY?.length || 0);

    if (!hasApiKey) {
      return NextResponse.json({ 
        isActive: false, 
        reason: 'API key not configured properly' 
      });
    }

    // Try a simple AI call to verify the connection
    try {
      console.log('Testing AI connection...');
      const testResult = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: 'Respond with just "OK" if you can read this.',
        config: {
          maxOutputTokens: 10,
          temperature: 0
        }
      });

      console.log('AI test result:', testResult.text);
      const isWorking = testResult.text && testResult.text.toLowerCase().includes('ok');
      
      return NextResponse.json({ 
        isActive: isWorking,
        reason: isWorking ? 'AI is working correctly' : 'AI test failed',
        response: testResult.text
      });
    } catch (aiError) {
      console.error('AI test failed:', aiError);
      return NextResponse.json({ 
        isActive: false, 
        reason: 'AI connection test failed',
        error: aiError instanceof Error ? aiError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Error checking AI status:', error);
    return NextResponse.json({ 
      isActive: false, 
      reason: 'Status check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
