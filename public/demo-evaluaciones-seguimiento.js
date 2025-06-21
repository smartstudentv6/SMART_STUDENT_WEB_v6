// Script de demostración para las nuevas funcionalidades de seguimiento y evaluación
// Ejecutar en la consola del navegador después de iniciar sesión como profesor

console.log("🎯 DEMOSTRACIÓN: Nuevas funcionalidades de Tareas");
console.log("===============================================");

// 1. Crear una tarea de evaluación automática
console.log("\n📝 1. Creando tarea de evaluación automática...");

const evaluationTask = {
  id: `task_${Date.now()}`,
  title: "Evaluación de Matemáticas - Álgebra Básica",
  description: "Evaluación automática sobre conceptos básicos de álgebra. Incluye preguntas de opción múltiple, verdadero/falso y respuestas cortas.",
  subject: "Matemáticas",
  course: "1º Medio A",
  assignedBy: "prof_matematicas",
  assignedByName: "Profesor Matemáticas",
  assignedTo: "course",
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
  createdAt: new Date().toISOString(),
  status: "pending",
  priority: "high",
  taskType: "evaluation",
  evaluationConfig: {
    questions: [
      {
        id: "q1",
        question: "¿Cuál es el resultado de 2x + 3 = 9?",
        type: "multiple-choice",
        options: ["x = 3", "x = 6", "x = 4", "x = 2"],
        correctAnswer: 0, // x = 3
        points: 2
      },
      {
        id: "q2",
        question: "La ecuación x² = 16 tiene solución única.",
        type: "true-false",
        correctAnswer: false, // tiene dos soluciones: x = 4 y x = -4
        points: 2
      },
      {
        id: "q3",
        question: "¿Cuál es el coeficiente de x en la expresión 3x² - 5x + 2?",
        type: "short-answer",
        correctAnswer: "-5",
        points: 1
      },
      {
        id: "q4",
        question: "¿Cuál es la forma factorizada de x² - 4?",
        type: "multiple-choice",
        options: ["(x + 2)(x - 2)", "(x - 2)²", "(x + 2)²", "x(x - 4)"],
        correctAnswer: 0, // (x + 2)(x - 2)
        points: 3
      },
      {
        id: "q5",
        question: "Un polinomio de grado 2 siempre tiene exactamente 2 raíces reales.",
        type: "true-false",
        correctAnswer: false, // puede tener 0, 1 o 2 raíces reales
        points: 2
      }
    ],
    passingScore: 70,
    timeLimit: 30,
    allowRetries: true,
    showCorrectAnswers: true
  }
};

// 2. Crear una tarea estándar para comparar
console.log("\n📋 2. Creando tarea estándar...");

const standardTask = {
  id: `task_${Date.now() + 1}`,
  title: "Resolución de Problemas de Álgebra",
  description: "Resuelve los siguientes problemas algebraicos y sube tu solución en formato PDF. Incluye todos los pasos y justificaciones.",
  subject: "Matemáticas",
  course: "1º Medio A",
  assignedBy: "prof_matematicas",
  assignedByName: "Profesor Matemáticas",
  assignedTo: "course",
  dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 días
  createdAt: new Date().toISOString(),
  status: "pending",
  priority: "medium",
  taskType: "standard",
  attachments: [
    {
      id: "attach_1",
      name: "Problemas_Algebra.pdf",
      type: "application/pdf",
      size: 125000,
      url: "data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVGl0bGUgKFByb2JsZW1hcyBkZSBBbGdlYnJhKQovQ3JlYXRvciAoUHJvZmVzb3IgTWF0ZW1hdGljYXMpCj4+CmVuZG9iag==",
      uploadedBy: "prof_matematicas",
      uploadedAt: new Date().toISOString()
    }
  ]
};

// 3. Guardar las tareas
console.log("\n💾 3. Guardando tareas en localStorage...");

const existingTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
const newTasks = [...existingTasks, evaluationTask, standardTask];
localStorage.setItem('smart-student-tasks', JSON.stringify(newTasks));

console.log(`✅ ${newTasks.length} tareas guardadas`);
console.log("   - Evaluación automática:", evaluationTask.title);
console.log("   - Tarea estándar:", standardTask.title);

// 4. Simular algunos comentarios de estudiantes
console.log("\n💬 4. Simulando interacciones de estudiantes...");

const demoComments = [
  {
    id: `comment_${Date.now()}_1`,
    taskId: standardTask.id,
    username: "maria_gonzalez",
    userDisplayName: "María González",
    userRole: "student",
    comment: "Profesor, tengo una duda con el problema 3. ¿Podrías ayudarme?",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
    isSubmission: false
  },
  {
    id: `comment_${Date.now()}_2`,
    taskId: standardTask.id,
    username: "carlos_lopez",
    userDisplayName: "Carlos López",
    userRole: "student",
    comment: "Adjunto mi solución a los problemas de álgebra. Espero que esté correcto.",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hora atrás
    isSubmission: true,
    attachments: [
      {
        id: "student_attach_1",
        name: "Solucion_Carlos.pdf",
        type: "application/pdf",
        size: 89000,
        url: "data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVGl0bGUgKFNvbHVjaW9uIGRlIENhcmxvcykKPj4KZW5kb2JqCg==",
        uploadedBy: "carlos_lopez",
        uploadedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: `comment_${Date.now()}_3`,
    taskId: standardTask.id,
    username: "ana_rodriguez",
    userDisplayName: "Ana Rodríguez",
    userRole: "student",
    comment: "He resuelto todos los problemas. Aquí está mi trabajo final.",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutos atrás
    isSubmission: true,
    attachments: [
      {
        id: "student_attach_2",
        name: "Trabajo_Ana.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 45000,
        url: "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQABgAIAAAAIQDd...",
        uploadedBy: "ana_rodriguez",
        uploadedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ]
  }
];

const existingComments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');
const newComments = [...existingComments, ...demoComments];
localStorage.setItem('smart-student-task-comments', JSON.stringify(newComments));

console.log(`✅ ${demoComments.length} comentarios de estudiantes simulados`);

// 5. Mostrar estadísticas del sistema
console.log("\n📊 5. Estadísticas del sistema actualizado:");
console.log("==========================================");

const allTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
const allComments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');

const evaluationTasks = allTasks.filter(t => t.taskType === 'evaluation');
const standardTasks = allTasks.filter(t => t.taskType === 'standard' || !t.taskType);

console.log(`📋 Total de tareas: ${allTasks.length}`);
console.log(`   - Evaluaciones automáticas: ${evaluationTasks.length}`);
console.log(`   - Tareas estándar: ${standardTasks.length}`);
console.log(`💬 Total de comentarios: ${allComments.length}`);

// Análisis de entregas
const submissions = allComments.filter(c => c.isSubmission);
console.log(`📤 Total de entregas: ${submissions.length}`);

// Mostrar información de la evaluación creada
console.log("\n🎯 Información de la evaluación creada:");
console.log("======================================");
console.log(`📝 Título: ${evaluationTask.title}`);
console.log(`📚 Materia: ${evaluationTask.subject}`);
console.log(`🎓 Curso: ${evaluationTask.course}`);
console.log(`⏱️  Tiempo límite: ${evaluationTask.evaluationConfig.timeLimit} minutos`);
console.log(`📊 Puntaje mínimo: ${evaluationTask.evaluationConfig.passingScore}%`);
console.log(`❓ Preguntas: ${evaluationTask.evaluationConfig.questions.length}`);
console.log(`🔄 Reintentos: ${evaluationTask.evaluationConfig.allowRetries ? 'Permitidos' : 'No permitidos'}`);
console.log(`📋 Mostrar respuestas: ${evaluationTask.evaluationConfig.showCorrectAnswers ? 'Sí' : 'No'}`);

// Desglose por tipo de pregunta
const questionTypes = evaluationTask.evaluationConfig.questions.reduce((acc, q) => {
  acc[q.type] = (acc[q.type] || 0) + 1;
  return acc;
}, {});

console.log("\n📊 Distribución de preguntas:");
Object.entries(questionTypes).forEach(([type, count]) => {
  const typeName = {
    'multiple-choice': 'Opción múltiple',
    'true-false': 'Verdadero/Falso',
    'short-answer': 'Respuesta corta'
  }[type] || type;
  console.log(`   - ${typeName}: ${count}`);
});

// Puntuación total
const totalPoints = evaluationTask.evaluationConfig.questions.reduce((sum, q) => sum + q.points, 0);
console.log(`\n🏆 Puntuación total: ${totalPoints} puntos`);

console.log("\n🎉 DEMOSTRACIÓN COMPLETADA");
console.log("========================");
console.log("👨‍🏫 Como PROFESOR puedes:");
console.log("  • Ver el panel de seguimiento de entregas");
console.log("  • Crear evaluaciones automáticas");
console.log("  • Monitorear el progreso de los estudiantes");
console.log("  • Configurar parámetros de evaluación");
console.log("\n👨‍🎓 Como ESTUDIANTE puedes:");
console.log("  • Realizar evaluaciones automáticas");
console.log("  • Recibir retroalimentación inmediata");
console.log("  • Ver tus resultados y respuestas correctas");
console.log("  • Reintentar evaluaciones (si está permitido)");

console.log("\n🔄 Para probar:");
console.log("1. Inicia sesión como profesor para ver el seguimiento");
console.log("2. Inicia sesión como estudiante para tomar evaluaciones");
console.log("3. Recarga la página para ver los cambios");

// Actualizar la página para mostrar los cambios
setTimeout(() => {
  console.log("\n🔄 Actualizando página para mostrar cambios...");
  window.location.reload();
}, 2000);
