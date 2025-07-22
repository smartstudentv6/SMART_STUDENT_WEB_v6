import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if API key is configured
    const apiKey = process.env.GOOGLE_API_KEY;
    const hasApiKey = apiKey && 
                     apiKey !== 'your_google_api_key_here' &&
                     apiKey.length > 0 &&
                     apiKey.startsWith('AIza'); // Google API keys start with AIza

    console.log('🔍 Checking AI status...');
    console.log('📊 API Key configured:', hasApiKey ? 'Yes' : 'No');
    console.log('🔑 API Key length:', apiKey ? apiKey.length : 0);
    console.log('🎯 Expected key format:', apiKey ? (apiKey.startsWith('AIza') ? 'Valid' : 'Invalid') : 'None');

    if (!hasApiKey) {
      const reason = !apiKey 
        ? 'Variable GOOGLE_API_KEY no encontrada'
        : apiKey === 'your_google_api_key_here'
        ? 'API key no configurada (valor por defecto)'
        : !apiKey.startsWith('AIza')
        ? 'Formato de API key inválido'
        : 'API key vacía';

      console.log('❌ AI inactive:', reason);
      return NextResponse.json({ 
        isActive: false, 
        reason,
        instructions: 'Configura GOOGLE_API_KEY en .env.local con tu clave de Google AI Studio',
        timestamp: new Date().toISOString()
      });
    }

    // Test basic connectivity (without making actual API call to avoid quota usage)
    console.log('✅ AI is configured and ready');
    return NextResponse.json({ 
      isActive: true,
      reason: 'IA configurada y lista para usar',
      model: 'googleai/gemini-2.0-flash',
      keyLength: apiKey.length,
      timestamp: new Date().toISOString(),
      features: [
        'Generación de resúmenes',
        'Creación de mapas mentales', 
        'Generación de cuestionarios',
        'Contenido de evaluaciones'
      ]
    });

  } catch (error) {
    console.error('💥 Error checking AI status:', error);
    
    // If there's any error, we'll still return active if API key is present
    const hasApiKey = process.env.GOOGLE_API_KEY && 
                     process.env.GOOGLE_API_KEY !== 'your_google_api_key_here' &&
                     process.env.GOOGLE_API_KEY.length > 0;
    
    return NextResponse.json({ 
      isActive: hasApiKey,
      reason: hasApiKey ? 'IA configurada (modo de respaldo)' : 'Error de configuración',
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    });
  }
}
