/**
 * Script de prueba para demostrar la funcionalidad mejorada de comentarios en tareas
 * Incluye: comentarios de profesores, archivos adjuntos, y nuevas funcionalidades
 * Ejecutar en la consola del navegador después de hacer login
 */

console.log('🎯 Iniciando prueba de comentarios mejorados en tareas con archivos...');

// 1. Crear una tarea de prueba con archivos adjuntos (como profesor)
const crearTareaPrueba = () => {
  const task = {
    id: 'task_comentarios_archivos_test',
    title: 'Tarea de Prueba - Sistema Completo Mejorado',
    description: 'Esta tarea demuestra todas las nuevas funcionalidades: comentarios de profesores, archivos adjuntos, respuestas, edición y entregas.',
    subject: 'Ciencias Naturales',
    course: '4to Básico',
    assignedBy: 'jorge',
    assignedByName: 'Jorge Profesor',
    assignedTo: 'course',
    dueDate: '2025-06-25T23:59',
    createdAt: new Date().toISOString(),
    status: 'pending',
    priority: 'high',
    attachments: [
      {
        id: 'attach_1',
        name: 'Guía_Fotosíntesis.pdf',
        type: 'application/pdf',
        size: 2048576, // 2MB
        url: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsO8CjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlciBbL0ZsYXRlRGVjb2RlXQo+PgpzdHJlYW0KeJxNkM1OxCAQx1/F5NjEAQpl6XFfwJN78OAhJpvUpKYbTSrSpu++FLK1h4n/8z8Jef8AAAD//2nPDf8AAAAA',
        uploadedBy: 'jorge',
        uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'attach_2',
        name: 'Ejercicios_Práctica.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024512, // 1MB
        url: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQAAAAIAA==',
        uploadedBy: 'jorge',
        uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  };

  const existingTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
  const filteredTasks = existingTasks.filter(t => t.id !== task.id);
  filteredTasks.push(task);
  localStorage.setItem('smart-student-tasks', JSON.stringify(filteredTasks));
  
  console.log('✅ Tarea de prueba creada con archivos adjuntos:', task.title);
  return task;
};

// 2. Crear comentarios de ejemplo con diferentes roles y archivos
const crearComentariosEjemplo = (taskId) => {
  const comentarios = [
    // Comentario inicial del profesor
    {
      id: 'comment_profesor_1',
      taskId: taskId,
      username: 'jorge',
      userDisplayName: 'Jorge Profesor',
      userRole: 'teacher',
      comment: 'Hola estudiantes! He subido una guía completa sobre fotosíntesis y ejercicios de práctica. Por favor revisen los archivos adjuntos antes de comenzar la tarea.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 horas atrás
      isSubmission: false
    },
    
    // Pregunta de estudiante
    {
      id: 'comment_estudiante_1',
      taskId: taskId,
      username: 'felipe',
      userDisplayName: 'Felipe Estudiante',
      userRole: 'student',
      comment: 'Profesor, tengo una duda sobre la fase oscura de la fotosíntesis. ¿Podrían explicar más sobre el ciclo de Calvin?',
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      isSubmission: false
    },
    
    // Respuesta del profesor
    {
      id: 'comment_profesor_respuesta_1',
      taskId: taskId,
      username: 'jorge',
      userDisplayName: 'Jorge Profesor',
      userRole: 'teacher',
      comment: '@Felipe Estudiante Excelente pregunta, Felipe. El ciclo de Calvin es la fase independiente de la luz donde se fija el CO2. Te recomiendo revisar la página 15 de la guía que subí.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isSubmission: false,
      replyToId: 'comment_estudiante_1'
    },
    
    // Comentario de otro estudiante con archivo
    {
      id: 'comment_estudiante_2',
      taskId: taskId,
      username: 'ana',
      userDisplayName: 'Ana Estudiante',
      userRole: 'student',
      comment: 'He completado mi diagrama de la fotosíntesis. Adjunto mi trabajo para revisión.',
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      isSubmission: true,
      attachments: [
        {
          id: 'student_attach_1',
          name: 'Diagrama_Fotosintesis_Ana.jpg',
          type: 'image/jpeg',
          size: 512000, // 500KB
          url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
          uploadedBy: 'ana',
          uploadedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString()
        }
      ]
    },
    
    // Feedback del profesor sobre la entrega
    {
      id: 'comment_profesor_feedback',
      taskId: taskId,
      username: 'jorge',
      userDisplayName: 'Jorge Profesor',
      userRole: 'teacher',
      comment: '@Ana Estudiante Excelente trabajo, Ana! Tu diagrama está muy bien estructurado. Solo te sugiero agregar más detalles sobre la cadena de transporte de electrones.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      isSubmission: false,
      replyToId: 'comment_estudiante_2'
    },
    
    // Comentario reciente editable
    {
      id: 'comment_reciente_editable',
      taskId: taskId,
      username: 'felipe',
      userDisplayName: 'Felipe Estudiante',
      userRole: 'student',
      comment: 'Gracias profesor por la explicación. Ya entiendo mejor el proceso. Este comentario es reciente y puede ser editado.',
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 min atrás
      isSubmission: false
    }
  ];

  // Limpiar comentarios existentes y migrar comentarios antiguos al nuevo formato
  const existingComments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');
  const filteredComments = existingComments
    .filter(c => c.taskId !== taskId)
    .map(c => {
      // Migrar comentarios en formato antiguo al nuevo formato
      if (c.studentUsername && !c.username) {
        return {
          ...c,
          username: c.studentUsername,
          userDisplayName: c.studentName || 'Usuario',
          userRole: 'student'
        };
      }
      // Asegurar que todos los comentarios tengan las propiedades necesarias
      return {
        ...c,
        username: c.username || 'unknown',
        userDisplayName: c.userDisplayName || 'Usuario',
        userRole: c.userRole || 'student'
      };
    });
  
  const allComments = [...filteredComments, ...comentarios];
  localStorage.setItem('smart-student-task-comments', JSON.stringify(allComments));
  
  console.log('✅ Comentarios de ejemplo creados (incluye profesores):', comentarios.length);
  return comentarios;
};

// 3. Función para mostrar estadísticas mejoradas
const mostrarEstadisticas = (taskId) => {
  const comments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]')
    .filter(c => c.taskId === taskId);
  
  const estadisticas = {
    total: comments.length,
    profesores: comments.filter(c => c.userRole === 'teacher').length,
    estudiantes: comments.filter(c => c.userRole === 'student').length,
    entregas: comments.filter(c => c.isSubmission).length,
    respuestas: comments.filter(c => c.replyToId).length,
    comentariosPrincipales: comments.filter(c => !c.replyToId).length,
    conArchivos: comments.filter(c => c.attachments && c.attachments.length > 0).length,
    editables: comments.filter(c => {
      const commentTime = new Date(c.timestamp);
      const now = new Date();
      const diffMinutes = (now.getTime() - commentTime.getTime()) / (1000 * 60);
      return diffMinutes <= 5;
    }).length
  };
  
  console.log('📊 Estadísticas de comentarios mejoradas:', estadisticas);
  return estadisticas;
};

// 4. Función para demostrar las funcionalidades nuevas
const demostrarFuncionalidades = () => {
  console.log('🚀 Funcionalidades implementadas:');
  console.log('   COMENTARIOS:');
  console.log('   1. ✅ Comentarios de profesores y estudiantes');
  console.log('   2. ✅ Avatares diferenciados por rol (verde=profesor, azul=estudiante)');
  console.log('   3. ✅ Etiquetas de "Profesor" para identificar docentes');
  console.log('   4. ✅ Edición de comentarios (5 minutos después de publicar)');
  console.log('   5. ✅ Sistema de respuestas jerárquicas');
  console.log('   6. ✅ Eliminación de comentarios (autor o profesor)');
  console.log('   7. ✅ Diferenciación visual entre comentarios y entregas');
  console.log('   8. ✅ Indicador de comentarios editados');
  
  console.log('   ARCHIVOS:');
  console.log('   9. ✅ Archivos adjuntos en tareas (por profesores)');
  console.log('   10. ✅ Archivos adjuntos en comentarios/entregas');
  console.log('   11. ✅ Descarga de archivos adjuntos');
  console.log('   12. ✅ Previsualización de archivos con iconos');
  console.log('   13. ✅ Validación de tipos de archivo');
  console.log('   14. ✅ Información de tamaño y uploader');
  
  console.log('   INTERFAZ:');
  console.log('   15. ✅ Límite de caracteres (500) con contador');
  console.log('   16. ✅ Traducciones completas ES/EN');
  console.log('   17. ✅ Estados de carga para subida de archivos');
  console.log('   18. ✅ Permisos granulares por rol');
  console.log('   19. ✅ Diseño responsivo optimizado');
  console.log('   20. ✅ Experiencia diferenciada profesor/estudiante');
};

// 5. Función para crear usuarios de prueba
const crearUsuariosPrueba = () => {
  const users = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
  
  // Verificar si ya existen los usuarios
  const jorgeExists = users.find(u => u.username === 'jorge');
  if (!jorgeExists) {
    users.push({
      username: 'jorge',
      password: 'jorge123',
      displayName: 'Jorge Profesor',
      role: 'teacher',
      activeCourses: ['4to Básico', '5to Básico'],
      teachingAssignments: [
        { subject: 'Ciencias Naturales', courses: ['4to Básico', '5to Básico'] },
        { subject: 'Física', courses: ['4to Básico'] }
      ]
    });
  }
  
  localStorage.setItem('smart-student-users', JSON.stringify(users));
  console.log('✅ Usuarios de prueba verificados');
};

// 6. Ejecutar la demostración completa
const ejecutarDemo = () => {
  console.log('🎬 Ejecutando demostración completa del sistema mejorado...');
  
  crearUsuariosPrueba();
  const task = crearTareaPrueba();
  const comments = crearComentariosEjemplo(task.id);
  const stats = mostrarEstadisticas(task.id);
  
  demostrarFuncionalidades();
  
  console.log('✨ Demostración completada. Recarga la página y sigue estos pasos:');
  console.log('💡 Cómo probar las nuevas funcionalidades:');
  console.log('   � Como ESTUDIANTE (felipe/felipe123):');
  console.log('     • Ve a Tareas → Ver la tarea creada');
  console.log('     • Observa los comentarios del profesor (avatar verde)');
  console.log('     • Descarga los archivos adjuntos del profesor');
  console.log('     • Responde a comentarios del profesor');
  console.log('     • Agrega comentarios con archivos adjuntos');
  console.log('     • Edita comentarios recientes (ícono lápiz)');
  console.log('   🔹 Como PROFESOR (jorge/jorge123):');
  console.log('     • Crea tareas con archivos adjuntos');
  console.log('     • Comenta en tareas de estudiantes');
  console.log('     • Responde a preguntas de estudiantes');
  console.log('     • Proporciona feedback en entregas');
  console.log('     • Elimina comentarios inapropiados');
  console.log('   🔹 GENERAL:');
  console.log('     • Cambia idioma para ver traducciones');
  console.log('     • Prueba en móvil para ver diseño responsivo');
  
  return { task, comments, stats };
};

// Para uso directo
if (typeof window !== 'undefined') {
  window.testComentariosArchivoDemo = ejecutarDemo;
  console.log('📝 Script cargado. Ejecuta testComentariosArchivoDemo() para iniciar.');
}

// Ejecutar automáticamente
ejecutarDemo();
