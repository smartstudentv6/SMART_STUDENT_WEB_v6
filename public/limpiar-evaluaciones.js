// Script para limpiar datos de demostración de evaluaciones y seguimiento
// Ejecutar en la consola del navegador

console.log("🧹 LIMPIEZA: Datos de evaluaciones y seguimiento");
console.log("===============================================");

// 1. Mostrar estadísticas actuales
console.log("\n📊 Estado actual del sistema:");
const currentTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
const currentComments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');

console.log(`📋 Tareas actuales: ${currentTasks.length}`);
console.log(`💬 Comentarios actuales: ${currentComments.length}`);

// Analizar tipos de tareas
const evaluationTasks = currentTasks.filter(t => t.taskType === 'evaluation');
const standardTasks = currentTasks.filter(t => t.taskType === 'standard' || !t.taskType);

console.log(`   - Evaluaciones automáticas: ${evaluationTasks.length}`);
console.log(`   - Tareas estándar: ${standardTasks.length}`);

// 2. Opción de limpieza selectiva
console.log("\n🎯 Opciones de limpieza disponibles:");
console.log("=====================================");

// Función para limpiar solo las tareas de demostración (las creadas hoy)
window.limpiarDemo = function() {
  console.log("\n🧹 Limpiando tareas de demostración...");
  
  const today = new Date().toDateString();
  const tasksToKeep = currentTasks.filter(task => {
    const taskDate = new Date(task.createdAt).toDateString();
    return taskDate !== today || (!task.title.includes('Evaluación de Matemáticas') && !task.title.includes('Resolución de Problemas'));
  });
  
  const commentsToKeep = currentComments.filter(comment => {
    const commentDate = new Date(comment.timestamp).toDateString();
    return commentDate !== today;
  });
  
  localStorage.setItem('smart-student-tasks', JSON.stringify(tasksToKeep));
  localStorage.setItem('smart-student-task-comments', JSON.stringify(commentsToKeep));
  
  console.log(`✅ Limpieza completada:`);
  console.log(`   - Tareas eliminadas: ${currentTasks.length - tasksToKeep.length}`);
  console.log(`   - Comentarios eliminados: ${currentComments.length - commentsToKeep.length}`);
  console.log(`   - Tareas restantes: ${tasksToKeep.length}`);
  console.log(`   - Comentarios restantes: ${commentsToKeep.length}`);
  
  setTimeout(() => window.location.reload(), 1000);
};

// Función para limpiar todas las evaluaciones automáticas
window.limpiarEvaluaciones = function() {
  console.log("\n🧹 Eliminando todas las evaluaciones automáticas...");
  
  const tasksToKeep = currentTasks.filter(task => task.taskType !== 'evaluation');
  
  // También eliminar comentarios de tareas de evaluación
  const evaluationTaskIds = currentTasks.filter(t => t.taskType === 'evaluation').map(t => t.id);
  const commentsToKeep = currentComments.filter(comment => !evaluationTaskIds.includes(comment.taskId));
  
  localStorage.setItem('smart-student-tasks', JSON.stringify(tasksToKeep));
  localStorage.setItem('smart-student-task-comments', JSON.stringify(commentsToKeep));
  
  console.log(`✅ Evaluaciones eliminadas:`);
  console.log(`   - Evaluaciones eliminadas: ${evaluationTasks.length}`);
  console.log(`   - Comentarios eliminados: ${currentComments.length - commentsToKeep.length}`);
  console.log(`   - Tareas restantes: ${tasksToKeep.length}`);
  console.log(`   - Comentarios restantes: ${commentsToKeep.length}`);
  
  setTimeout(() => window.location.reload(), 1000);
};

// Función para reset completo
window.resetCompleto = function() {
  console.log("\n🧹 RESET COMPLETO del sistema de tareas...");
  
  const confirm = window.confirm("⚠️ ¿Estás seguro de que quieres eliminar TODAS las tareas y comentarios?");
  
  if (confirm) {
    localStorage.removeItem('smart-student-tasks');
    localStorage.removeItem('smart-student-task-comments');
    
    console.log(`✅ Reset completo realizado:`);
    console.log(`   - Todas las tareas eliminadas`);
    console.log(`   - Todos los comentarios eliminados`);
    
    setTimeout(() => window.location.reload(), 1000);
  } else {
    console.log("❌ Reset cancelado");
  }
};

// Función para mostrar estadísticas detalladas
window.mostrarEstadisticas = function() {
  console.log("\n📊 ESTADÍSTICAS DETALLADAS");
  console.log("===========================");
  
  const tasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
  const comments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');
  
  console.log(`📋 Total de tareas: ${tasks.length}`);
  
  // Agrupar por tipo
  const tasksByType = tasks.reduce((acc, task) => {
    const type = task.taskType || 'standard';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(tasksByType).forEach(([type, count]) => {
    const typeName = type === 'evaluation' ? 'Evaluaciones automáticas' : 'Tareas estándar';
    console.log(`   - ${typeName}: ${count}`);
  });
  
  // Agrupar por materia
  const tasksBySubject = tasks.reduce((acc, task) => {
    const subject = task.subject || 'Sin materia';
    acc[subject] = (acc[subject] || 0) + 1;
    return acc;
  }, {});
  
  console.log("\n📚 Por materia:");
  Object.entries(tasksBySubject).forEach(([subject, count]) => {
    console.log(`   - ${subject}: ${count}`);
  });
  
  // Estadísticas de comentarios
  console.log(`\n💬 Total de comentarios: ${comments.length}`);
  
  const submissions = comments.filter(c => c.isSubmission);
  console.log(`📤 Entregas: ${submissions.length}`);
  
  const regularComments = comments.filter(c => !c.isSubmission);
  console.log(`💭 Comentarios: ${regularComments.length}`);
  
  // Comentarios por rol
  const commentsByRole = comments.reduce((acc, comment) => {
    const role = comment.userRole || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  
  console.log("\n👥 Comentarios por rol:");
  Object.entries(commentsByRole).forEach(([role, count]) => {
    const roleName = {
      'student': 'Estudiantes',
      'teacher': 'Profesores',
      'admin': 'Administradores'
    }[role] || role;
    console.log(`   - ${roleName}: ${count}`);
  });
  
  // Evaluaciones con estadísticas
  const evaluations = tasks.filter(t => t.taskType === 'evaluation');
  if (evaluations.length > 0) {
    console.log("\n🎯 Evaluaciones automáticas:");
    evaluations.forEach(eval => {
      console.log(`   📝 ${eval.title}`);
      console.log(`      - Preguntas: ${eval.evaluationConfig?.questions?.length || 0}`);
      console.log(`      - Puntaje mínimo: ${eval.evaluationConfig?.passingScore || 0}%`);
      console.log(`      - Tiempo límite: ${eval.evaluationConfig?.timeLimit || 0} min`);
      console.log(`      - Reintentos: ${eval.evaluationConfig?.allowRetries ? 'Sí' : 'No'}`);
    });
  }
};

console.log("\n🛠️ COMANDOS DISPONIBLES:");
console.log("========================");
console.log("limpiarDemo()         - Elimina solo las tareas de demostración de hoy");
console.log("limpiarEvaluaciones() - Elimina todas las evaluaciones automáticas");
console.log("resetCompleto()       - Elimina TODAS las tareas y comentarios");
console.log("mostrarEstadisticas() - Muestra estadísticas detalladas");

console.log("\n💡 Ejemplo de uso:");
console.log("   limpiarDemo()");

// Mostrar estadísticas iniciales
mostrarEstadisticas();
