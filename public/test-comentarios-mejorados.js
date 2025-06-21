/**
 * Script de prueba para demostrar la funcionalidad mejorada de comentarios en tareas
 * Ejecutar en la consola del navegador después de hacer login como estudiante
 */

console.log('🎯 Iniciando prueba de comentarios mejorados en tareas...');

// 1. Crear una tarea de prueba (como profesor)
const crearTareaPrueba = () => {
  const task = {
    id: 'task_comentarios_test',
    title: 'Tarea de Prueba - Comentarios Mejorados',
    description: 'Esta es una tarea para probar las nuevas funcionalidades de comentarios: edición, respuestas, eliminación y entregas.',
    subject: 'Ciencias Naturales',
    course: '4to Básico',
    assignedBy: 'jorge',
    assignedByName: 'Jorge Profesor',
    assignedTo: 'course',
    dueDate: '2025-06-25T23:59',
    createdAt: new Date().toISOString(),
    status: 'pending',
    priority: 'medium'
  };

  const existingTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
  const filteredTasks = existingTasks.filter(t => t.id !== task.id);
  filteredTasks.push(task);
  localStorage.setItem('smart-student-tasks', JSON.stringify(filteredTasks));
  
  console.log('✅ Tarea de prueba creada:', task.title);
  return task;
};

// 2. Crear comentarios de ejemplo con diferentes funcionalidades
const crearComentariosEjemplo = (taskId) => {
  const comentarios = [
    {
      id: 'comment_principal_1',
      taskId: taskId,
      studentUsername: 'felipe',
      studentName: 'Felipe Estudiante',
      comment: 'Profesor, tengo una duda sobre el tema de fotosíntesis. ¿Podrían explicar más sobre la fase oscura?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
      isSubmission: false
    },
    {
      id: 'comment_respuesta_1',
      taskId: taskId,
      studentUsername: 'ana',
      studentName: 'Ana Estudiante',
      comment: '@Felipe Estudiante Hola Felipe! Yo también tenía esa duda. Encontré un video muy bueno que explica el ciclo de Calvin.',
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 horas atrás
      isSubmission: false,
      replyToId: 'comment_principal_1'
    },
    {
      id: 'comment_principal_2',
      taskId: taskId,
      studentUsername: 'carlos',
      studentName: 'Carlos Estudiante',
      comment: 'He completado el diagrama de la fotosíntesis. Incluí las ecuaciones químicas y el flujo de energía.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hora atrás
      isSubmission: true
    },
    {
      id: 'comment_principal_3',
      taskId: taskId,
      studentUsername: 'felipe',
      studentName: 'Felipe Estudiante',
      comment: 'Gracias Ana por la recomendación. Ya vi el video y ahora entiendo mejor el proceso.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min atrás
      isSubmission: false,
      replyToId: 'comment_respuesta_1'
    },
    {
      id: 'comment_reciente',
      taskId: taskId,
      studentUsername: 'felipe',
      studentName: 'Felipe Estudiante',
      comment: 'Este comentario es reciente y puede ser editado por 5 minutos.',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min atrás
      isSubmission: false
    }
  ];

  const existingComments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');
  const filteredComments = existingComments.filter(c => c.taskId !== taskId);
  const allComments = [...filteredComments, ...comentarios];
  localStorage.setItem('smart-student-task-comments', JSON.stringify(allComments));
  
  console.log('✅ Comentarios de ejemplo creados:', comentarios.length);
  return comentarios;
};

// 3. Función para mostrar estadísticas de comentarios
const mostrarEstadisticas = (taskId) => {
  const comments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]')
    .filter(c => c.taskId === taskId);
  
  const estadisticas = {
    total: comments.length,
    entregas: comments.filter(c => c.isSubmission).length,
    respuestas: comments.filter(c => c.replyToId).length,
    comentariosPrincipales: comments.filter(c => !c.replyToId).length,
    editables: comments.filter(c => {
      const commentTime = new Date(c.timestamp);
      const now = new Date();
      const diffMinutes = (now.getTime() - commentTime.getTime()) / (1000 * 60);
      return diffMinutes <= 5;
    }).length
  };
  
  console.log('📊 Estadísticas de comentarios:', estadisticas);
  return estadisticas;
};

// 4. Función para demostrar las funcionalidades
const demostrarFuncionalidades = () => {
  console.log('🚀 Funcionalidades implementadas:');
  console.log('   1. ✅ Comentarios con avatares y mejor diseño visual');
  console.log('   2. ✅ Edición de comentarios (5 minutos después de publicar)');
  console.log('   3. ✅ Sistema de respuestas a comentarios específicos');
  console.log('   4. ✅ Eliminación de comentarios (autor o profesor)');
  console.log('   5. ✅ Diferenciación visual entre comentarios y entregas');
  console.log('   6. ✅ Indicador de comentarios editados');
  console.log('   7. ✅ Límite de caracteres (500) en comentarios');
  console.log('   8. ✅ Interfaz mejorada para profesores y estudiantes');
  console.log('   9. ✅ Organización jerárquica de comentarios y respuestas');
  console.log('   10. ✅ Traducciones completas en español e inglés');
};

// 5. Ejecutar la demostración
const ejecutarDemo = () => {
  console.log('🎬 Ejecutando demostración completa...');
  
  const task = crearTareaPrueba();
  const comments = crearComentariosEjemplo(task.id);
  const stats = mostrarEstadisticas(task.id);
  
  demostrarFuncionalidades();
  
  console.log('✨ Demostración completada. Recarga la página y navega a Tareas para ver los cambios.');
  console.log('💡 Sugerencias para probar:');
  console.log('   • Haz clic en "Ver" de la tarea creada');
  console.log('   • Prueba agregar un nuevo comentario');
  console.log('   • Haz clic en "Responder" a un comentario existente');
  console.log('   • Edita un comentario reciente (ícono de lápiz)');
  console.log('   • Marca un comentario como "entrega final"');
  console.log('   • Cambia el idioma para ver las traducciones');
  
  return { task, comments, stats };
};

// Ejecutar automáticamente si se ejecuta el script
if (typeof window !== 'undefined') {
  window.testComentariosDemo = ejecutarDemo;
  console.log('📝 Script cargado. Ejecuta testComentariosDemo() para iniciar la demostración.');
}

// Para uso directo
ejecutarDemo();
