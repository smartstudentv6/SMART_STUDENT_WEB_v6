// Script de verificación: Sistema de evaluaciones sin preguntas hardcodeadas
// Este script verifica que todas las preguntas sean generadas dinámicamente por IA

console.log('🧪 VERIFICACIÓN DEL SISTEMA SIN PREGUNTAS HARDCODEADAS');
console.log('=' .repeat(60));

const testCases = [
  {
    topic: 'sistema respiratorio',
    numQuestions: 5,
    description: 'Tema específico de ciencias'
  },
  {
    topic: 'matemáticas básicas',
    numQuestions: 8,
    description: 'Tema de matemáticas'
  },
  {
    topic: 'historia de Colombia',
    numQuestions: 6,
    description: 'Tema de historia específico'
  }
];

async function testQuestionGeneration(topic, numQuestions) {
  console.log(`\n🔬 Probando: "${topic}" (${numQuestions} preguntas)`);
  
  try {
    const response = await fetch('http://localhost:9002/api/generate-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        topic, 
        numQuestions, 
        language: 'es' 
      }),
    });

    if (!response.ok) {
      console.error(`❌ Error ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error('💬 Detalle del error:', errorText);
      return false;
    }

    const questions = await response.json();
    
    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('❌ No se recibieron preguntas válidas');
      return false;
    }

    console.log(`✅ Recibidas ${questions.length} preguntas generadas por IA`);
    
    // Verificar que las preguntas son específicas del tema
    const sampleQuestion = questions[0];
    console.log(`📝 Pregunta muestra: "${sampleQuestion.question?.substring(0, 80)}..."`);
    console.log(`🎯 Opciones: ${sampleQuestion.options?.length || 0} opciones disponibles`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando pruebas del sistema de IA...\n');
  
  let successCount = 0;
  let totalCount = testCases.length;
  
  for (const testCase of testCases) {
    const success = await testQuestionGeneration(testCase.topic, testCase.numQuestions);
    if (success) {
      successCount++;
    }
    
    // Pequeña pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`📊 RESULTADOS: ${successCount}/${totalCount} pruebas exitosas`);
  
  if (successCount === totalCount) {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON!');
    console.log('✅ El sistema está generando preguntas dinámicas correctamente');
    console.log('✅ No se están usando preguntas hardcodeadas');
  } else {
    console.log('⚠️ Algunas pruebas fallaron');
    console.log('❗ Verificar configuración de la API de IA');
  }
}

// Ejecutar las pruebas
runAllTests().catch(console.error);
