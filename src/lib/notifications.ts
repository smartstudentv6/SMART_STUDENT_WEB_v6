// Sistema de notificaciones para tareas
export interface TaskNotification {
  id: string;
  type: 'new_task' | 'task_submission' | 'task_completed' | 'teacher_comment' | 'grade_received' | 'pending_grading';
  taskId: string;
  taskTitle: string;
  targetUserRole: 'student' | 'teacher';
  targetUsernames: string[]; // usuarios específicos que deben recibir la notificación
  fromUsername: string;
  fromDisplayName: string;
  course: string;
  subject: string;
  timestamp: string;
  read: boolean;
  readBy: string[]; // usuarios que han marcado como leída
  grade?: number; // Para notificaciones de calificación
  taskType?: 'assignment' | 'evaluation'; // Tipo de tarea
}

// Funciones para manejar notificaciones de tareas
export class TaskNotificationManager {
  private static STORAGE_KEY = 'smart-student-task-notifications';

  // Obtener todas las notificaciones
  static getNotifications(): TaskNotification[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Guardar notificaciones
  static saveNotifications(notifications: TaskNotification[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notifications));
    // Disparar evento personalizado para actualizar la UI en tiempo real
    window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
  }

  // Crear notificación cuando un profesor crea una nueva tarea
  static createNewTaskNotifications(
    taskId: string,
    taskTitle: string,
    course: string,
    subject: string,
    teacherUsername: string,
    teacherDisplayName: string,
    taskType: 'assignment' | 'evaluation' = 'assignment'
  ): void {
    console.log('=== DEBUG createNewTaskNotifications ===');
    console.log('TaskId:', taskId);
    console.log('Course:', course);
    
    const studentsInCourse = this.getStudentsInCourse(course);
    console.log('Students found in course:', studentsInCourse);
    
    if (studentsInCourse.length === 0) {
      console.log('No students found in course, skipping notification creation');
      return;
    }

    const notifications = this.getNotifications();
    console.log('Current notifications count:', notifications.length);
    
    const newNotification: TaskNotification = {
      id: `new_task_${taskId}_${Date.now()}`,
      type: 'new_task',
      taskId,
      taskTitle,
      targetUserRole: 'student',
      targetUsernames: studentsInCourse.map(student => student.username),
      fromUsername: teacherUsername,
      fromDisplayName: teacherDisplayName,
      course,
      subject,
      timestamp: new Date().toISOString(),
      read: false,
      readBy: [],
      taskType // 🔥 AGREGADO: Incluir el tipo de tarea
    };

    notifications.push(newNotification);
    console.log('New notification created:', newNotification);
    console.log('Total notifications after creation:', notifications.length);
    
    this.saveNotifications(notifications);
    console.log('Notifications saved to localStorage');
  }

  // Crear notificación pendiente para el profesor cuando crea una tarea/evaluación
  static createPendingGradingNotification(
    taskId: string,
    taskTitle: string,
    course: string,
    subject: string,
    teacherUsername: string,
    teacherDisplayName: string,
    taskType: 'assignment' | 'evaluation' = 'assignment'
  ): void {
    console.log('=== DEBUG createPendingGradingNotification ===');
    console.log('Creating pending grading notification for teacher:', teacherUsername);
    
    const notifications = this.getNotifications();
    
    const newNotification: TaskNotification = {
      id: `pending_grading_${taskId}_${Date.now()}`,
      type: 'pending_grading',
      taskId,
      taskTitle,
      targetUserRole: 'teacher',
      targetUsernames: [teacherUsername],
      fromUsername: 'system', // ✅ CORREGIDO: Usar 'system' para notificaciones del sistema
      fromDisplayName: `${taskTitle} (${course})`, // ✅ CORRECCIÓN: Usar título de evaluación y curso
      course,
      subject,
      timestamp: new Date().toISOString(),
      read: false,
      readBy: [],
      taskType
    };

    notifications.push(newNotification);
    console.log('Pending grading notification created:', newNotification);
    
    this.saveNotifications(notifications);
    console.log('Pending grading notification saved');
  }

  // Crear notificación cuando un profesor comenta en una tarea
  static createTeacherCommentNotifications(
    taskId: string,
    taskTitle: string,
    course: string,
    subject: string,
    teacherUsername: string,
    teacherDisplayName: string,
    commentText: string
  ): void {
    const studentsInCourse = this.getStudentsInCourse(course);
    
    if (studentsInCourse.length === 0) return;

    // ✅ CORRECCIÓN: Asegurar que el profesor NO esté en targetUsernames
    const targetUsernames = studentsInCourse.map(student => student.username)
      .filter(username => username !== teacherUsername); // Excluir al profesor de los destinatarios

    console.log(`[createTeacherCommentNotifications] Profesor: ${teacherUsername}, Destinatarios: ${targetUsernames.join(', ')}`);

    // ✅ VALIDACIÓN: Solo crear notificación si hay destinatarios válidos
    if (targetUsernames.length === 0) {
      console.log(`[createTeacherCommentNotifications] ⚠️ No hay destinatarios válidos para la notificación`);
      return;
    }

    const notifications = this.getNotifications();
    
    const newNotification: TaskNotification = {
      id: `teacher_comment_${taskId}_${Date.now()}`,
      type: 'teacher_comment',
      taskId,
      taskTitle,
      targetUserRole: 'student',
      targetUsernames, // ✅ Ya filtrado para excluir al profesor
      fromUsername: teacherUsername,
      fromDisplayName: teacherDisplayName,
      course,
      subject,
      timestamp: new Date().toISOString(),
      read: false,
      readBy: []
    };

    console.log(`[createTeacherCommentNotifications] ✅ Creando notificación válida:`, {
      id: newNotification.id,
      fromUsername: newNotification.fromUsername,
      targetUsernames: newNotification.targetUsernames,
      taskTitle: newNotification.taskTitle
    });

    notifications.push(newNotification);
    this.saveNotifications(notifications);
  }

  // Crear notificación cuando un estudiante entrega una tarea
  static createTaskSubmissionNotification(
    taskId: string,
    taskTitle: string,
    course: string,
    subject: string,
    studentUsername: string,
    studentDisplayName: string,
    teacherUsername: string
  ): void {
    const notifications = this.getNotifications();
    
    const newNotification: TaskNotification = {
      id: `submission_${taskId}_${studentUsername}_${Date.now()}`,
      type: 'task_submission',
      taskId,
      taskTitle,
      targetUserRole: 'teacher',
      targetUsernames: [teacherUsername],
      fromUsername: studentUsername,
      fromDisplayName: studentDisplayName,
      course,
      subject,
      timestamp: new Date().toISOString(),
      read: false,
      readBy: []
    };

    notifications.push(newNotification);
    this.saveNotifications(notifications);
  }

  // Crear notificación cuando una tarea se completa (todos los estudiantes entregaron)
  static createTaskCompletedNotification(
    taskId: string,
    taskTitle: string,
    course: string,
    subject: string,
    teacherUsername: string
  ): void {
    const notifications = this.getNotifications();
    
    const newNotification: TaskNotification = {
      id: `completed_${taskId}_${Date.now()}`,
      type: 'task_completed',
      taskId,
      taskTitle,
      targetUserRole: 'teacher',
      targetUsernames: [teacherUsername],
      fromUsername: 'system',
      fromDisplayName: `${taskTitle} (${course})`, // ✅ CORRECCIÓN: Usar título de tarea y curso
      course,
      subject,
      timestamp: new Date().toISOString(),
      read: false,
      readBy: []
    };

    notifications.push(newNotification);
    this.saveNotifications(notifications);
  }

  // Verificar si todos los estudiantes de un curso han entregado una tarea específica
  static checkAllStudentsSubmitted(
    taskId: string,
    course: string,
    comments?: any[]
  ): boolean {
    // Usar exactamente la misma lógica que getStudentsForCourse en la página de tareas
    const usersObj = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
    
    // Convertimos el objeto a un array de usuarios con su nombre de usuario
    const users = Object.entries(usersObj).map(([username, data]: [string, any]) => ({
      username,
      ...data,
      displayName: data.displayName || username
    }));
    
    const studentsInCourse = users.filter((u: any) => 
      u.role === 'student' && 
      u.activeCourses && 
      u.activeCourses.includes(course)
    );
    
    const allComments = comments || JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');
    
    // Debug logs
    console.log('=== DEBUG checkAllStudentsSubmitted ===');
    console.log('TaskId:', taskId);
    console.log('Course:', course);
    console.log('All users:', users);
    console.log('Students in course:', studentsInCourse);
    console.log('All comments:', allComments);
    
    // Obtener todas las entregas para esta tarea
    const submissions = allComments.filter((comment: any) => 
      comment.taskId === taskId && comment.isSubmission
    );
    
    console.log('Submissions for this task:', submissions);
    
    // Verificar si cada estudiante del curso ha entregado
    const studentsWhoSubmitted = submissions.map((sub: any) => sub.studentUsername);
    const allStudentUsernames = studentsInCourse.map((student: any) => student.username);
    
    console.log('Students who submitted:', studentsWhoSubmitted);
    console.log('All student usernames in course:', allStudentUsernames);
    console.log('Total students in course:', allStudentUsernames.length);
    console.log('Total submissions:', studentsWhoSubmitted.length);
    
    // Todos los estudiantes han entregado si cada estudiante está en la lista de entregas
    const allSubmitted = allStudentUsernames.every((username: string) => 
      studentsWhoSubmitted.includes(username)
    );
    
    console.log('All students submitted?', allSubmitted);
    console.log('=== END DEBUG ===');
    
    return allSubmitted;
  }

  // Marcar una notificación como leída por un usuario específico
  static markAsReadByUser(notificationId: string, username: string): void {
    const notifications = this.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    
    if (notification && !notification.readBy.includes(username)) {
      notification.readBy.push(username);
      // Si todos los usuarios objetivo han leído la notificación, marcarla como completamente leída
      if (notification.readBy.length >= notification.targetUsernames.length) {
        notification.read = true;
      }
      this.saveNotifications(notifications);
    }
  }

  // Marcar notificación de nueva tarea como leída cuando el estudiante entrega
  static markNewTaskNotificationAsReadOnSubmission(taskId: string, studentUsername: string): void {
    const notifications = this.getNotifications();
    const newTaskNotification = notifications.find(n => 
      n.type === 'new_task' && 
      n.taskId === taskId && 
      n.targetUsernames.includes(studentUsername)
    );
    
    if (newTaskNotification) {
      this.markAsReadByUser(newTaskNotification.id, studentUsername);
    }
  }

  // Eliminar completamente las notificaciones de evaluaciones cuando el estudiante las completa
  static removeEvaluationNotificationOnCompletion(taskId: string, studentUsername: string): void {
    console.log('=== DEBUG removeEvaluationNotificationOnCompletion ===');
    console.log('TaskId:', taskId, 'Student:', studentUsername);
    
    const notifications = this.getNotifications();
    const initialCount = notifications.length;
    
    // Buscar y eliminar notificaciones de nueva tarea para esta evaluación específica del estudiante
    const filteredNotifications = notifications.filter(notification => {
      // Mantener la notificación si NO es una nueva tarea para este estudiante y esta evaluación
      if (notification.type === 'new_task' && 
          notification.taskId === taskId && 
          notification.targetUsernames.includes(studentUsername)) {
        
        // Si la notificación tiene otros destinatarios, solo remover este estudiante
        if (notification.targetUsernames.length > 1) {
          notification.targetUsernames = notification.targetUsernames.filter(username => username !== studentUsername);
          notification.readBy = notification.readBy.filter(username => username !== studentUsername);
          return true; // Mantener la notificación pero modificada
        } else {
          // Si este estudiante es el único destinatario, eliminar completamente la notificación
          return false; // Eliminar la notificación
        }
      }
      return true; // Mantener todas las demás notificaciones
    });
    
    const removedCount = initialCount - filteredNotifications.length;
    console.log(`Processed ${removedCount} evaluation notifications for student completion`);
    
    if (removedCount > 0 || filteredNotifications.some(n => n.type === 'new_task' && n.taskId === taskId)) {
      this.saveNotifications(filteredNotifications);
      console.log('Evaluation notifications updated after student completion');
    }
  }

  // Verificar si un estudiante completó una evaluación específica
  static isEvaluationCompletedByStudent(taskId: string, studentUsername: string): boolean {
    try {
      const userTasksKey = `userTasks_${studentUsername}`;
      const userTasks = JSON.parse(localStorage.getItem(userTasksKey) || '[]');
      
      const task = userTasks.find((t: any) => t.id === taskId);
      return task && task.status === 'completed';
    } catch (error) {
      console.error('Error checking evaluation completion:', error);
      return false;
    }
  }

  // Obtener notificaciones no leídas para un usuario específico
  static getUnreadNotificationsForUser(username: string, userRole: 'student' | 'teacher'): TaskNotification[] {
    const notifications = this.getNotifications();
    return notifications.filter(notification => {
      // Filtros básicos
      const basicFilters = notification.targetUserRole === userRole &&
        notification.targetUsernames.includes(username) &&
        !notification.readBy.includes(username) &&
        notification.fromUsername !== username; // Excluir notificaciones de sus propios comentarios

      if (!basicFilters) return false;

      // Para estudiantes: filtrar evaluaciones completadas
      if (userRole === 'student' && notification.type === 'new_task') {
        // Verificar si la tarea es una evaluación y si ya fue completada
        if (notification.taskType === 'evaluation') {
          const isCompleted = this.isEvaluationCompletedByStudent(notification.taskId, username);
          if (isCompleted) {
            console.log(`[getUnreadNotificationsForUser] Filtering out completed evaluation: ${notification.taskTitle} for student: ${username}`);
            return false; // No mostrar notificaciones de evaluaciones completadas
          }
        }
      }

      return true;
    });
  }

  // Contar notificaciones no leídas para un usuario
  static getUnreadCountForUser(username: string, userRole: 'student' | 'teacher'): number {
    const unreadNotifications = this.getUnreadNotificationsForUser(username, userRole);
    
    // Para profesores, contar todas las notificaciones incluyendo pending_grading y task_completed
    if (userRole === 'teacher') {
      // Asegurar que se incluyen las notificaciones de tipo pending_grading y task_completed
      const notificationCount = unreadNotifications.filter(n => 
        n.type === 'pending_grading' || 
        n.type === 'task_completed' || 
        n.type === 'teacher_comment' ||
        (n.type === 'new_task' && n.fromUsername === username) // Notificaciones de tareas creadas por este profesor
      ).length;
      
      console.log(`[TaskNotificationManager] Teacher ${username} has ${notificationCount} notifications (including ${unreadNotifications.filter(n => n.type === 'pending_grading').length} pending_grading and ${unreadNotifications.filter(n => n.type === 'task_completed').length} task_completed)`);
      
      return notificationCount;
    }
    
    // Para estudiantes, excluir notificaciones de comentarios (teacher_comment)
    // ya que estos se cuentan por separado en unreadCommentsCount para evitar duplicación
    if (userRole === 'student') {
      return unreadNotifications.filter(n => 
        n.type !== 'teacher_comment'
      ).length;
    }
    
    return unreadNotifications.length;
  }

  // Obtener estudiantes en un curso específico
  private static getStudentsInCourse(course: string): Array<{username: string, displayName: string}> {
    // Obtenemos los usuarios del localStorage (que es un objeto)
    const usersObj = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
    
    // Convertimos el objeto a un array de usuarios con su nombre de usuario
    const users = Object.entries(usersObj).map(([username, data]: [string, any]) => ({
      username,
      ...data,
      displayName: data.displayName || username
    }));
    
    return users
      .filter((user: any) => 
        user.role === 'student' && 
        user.activeCourses && 
        user.activeCourses.includes(course)
      )
      .map((user: any) => ({
        username: user.username,
        displayName: user.displayName || user.username
      }));
  }

  // Crear notificación cuando un profesor califica una tarea
  static createGradeNotification(
    taskId: string,
    taskTitle: string,
    course: string,
    subject: string,
    studentUsername: string,
    teacherUsername: string,
    teacherDisplayName: string,
    grade: number
  ): void {
    const notifications = this.getNotifications();
    
    const newNotification: TaskNotification = {
      id: `grade_${taskId}_${studentUsername}_${Date.now()}`,
      type: 'grade_received',
      taskId,
      taskTitle,
      targetUserRole: 'student',
      targetUsernames: [studentUsername],
      fromUsername: teacherUsername,
      fromDisplayName: teacherDisplayName,
      course,
      subject,
      timestamp: new Date().toISOString(),
      read: false,
      readBy: [],
      grade
    };

    notifications.push(newNotification);
    this.saveNotifications(notifications);
    
    console.log(`[TaskNotificationManager] Created grade notification for student ${studentUsername}: ${grade}% on task "${taskTitle}"`);
  }

  // Marcar notificaciones de calificación como leídas cuando el estudiante entra a la pestaña de tareas
  static markGradeNotificationsAsReadOnTasksView(studentUsername: string): void {
    const notifications = this.getNotifications();
    let updated = false;
    
    const updatedNotifications = notifications.map(notification => {
      if (
        notification.type === 'grade_received' &&
        notification.targetUsernames.includes(studentUsername) &&
        !notification.readBy.includes(studentUsername)
      ) {
        updated = true;
        return {
          ...notification,
          readBy: [...notification.readBy, studentUsername],
          read: notification.readBy.length + 1 >= notification.targetUsernames.length
        };
      }
      return notification;
    });
    
    if (updated) {
      this.saveNotifications(updatedNotifications);
      console.log(`[TaskNotificationManager] Marked grade notifications as read for student ${studentUsername} on tasks view`);
    }
  }

  // Marcar todas las notificaciones de una tarea específica como leídas cuando el estudiante la revisa
  static markTaskNotificationsAsReadOnReview(taskId: string, studentUsername: string): void {
    const notifications = this.getNotifications();
    let updated = false;
    
    const updatedNotifications = notifications.map(notification => {
      if (
        notification.taskId === taskId &&
        notification.targetUsernames.includes(studentUsername) &&
        !notification.readBy.includes(studentUsername) &&
        // 🔥 MEJORA: Solo marcar como leídos los comentarios y notificaciones de tipo 'teacher_comment'
        // No marcar como leídas las notificaciones de tipo 'new_task' (para mantener las tareas/evaluaciones pendientes)
        (notification.type === 'teacher_comment')
      ) {
        updated = true;
        return {
          ...notification,
          readBy: [...notification.readBy, studentUsername],
          read: notification.readBy.length + 1 >= notification.targetUsernames.length
        };
      }
      return notification;
    });
    
    if (updated) {
      this.saveNotifications(updatedNotifications);
      console.log(`[TaskNotificationManager] Marked all comment notifications for task ${taskId} as read for student ${studentUsername}`);
      
      // 🔥 MEJORA: También marcar comentarios no leídos para esta tarea como leídos
      this.markCommentsAsReadForTask(taskId, studentUsername);
    }
  }

  // 🔥 NUEVA FUNCIÓN: Marcar comentarios de una tarea como leídos
  static markCommentsAsReadForTask(taskId: string, username: string): void {
    try {
      const storedComments = localStorage.getItem('smart-student-task-comments');
      if (!storedComments) return;
      
      const comments = JSON.parse(storedComments);
      let updated = false;
      
      // Marcar solo comentarios de la tarea específica como leídos
      const updatedComments = comments.map(comment => {
        if (
          comment.taskId === taskId && 
          !comment.isSubmission &&  // No marcar entregas, solo comentarios
          comment.studentUsername !== username && // No marcar comentarios propios
          (!comment.readBy?.includes(username))
        ) {
          updated = true;
          return {
            ...comment,
            isNew: false,
            readBy: [...(comment.readBy || []), username]
          };
        }
        return comment;
      });
      
      if (updated) {
        localStorage.setItem('smart-student-task-comments', JSON.stringify(updatedComments));
        console.log(`[TaskNotificationManager] Marked comments for task ${taskId} as read for ${username}`);
        
        // Disparar evento para actualizar la UI
        document.dispatchEvent(new Event('commentsUpdated'));
      }
    } catch (error) {
      console.error('Error marking task comments as read:', error);
    }
  }

  // Verificar si todos los estudiantes de una tarea han sido evaluados
  static checkAllStudentsGraded(taskId: string, course: string): boolean {
    console.log('=== DEBUG checkAllStudentsGraded ===');
    console.log('TaskId:', taskId, 'Course:', course);
    
    // Obtener estudiantes del curso
    const studentsInCourse = this.getStudentsInCourse(course);
    console.log('Students in course:', studentsInCourse.length);
    
    if (studentsInCourse.length === 0) {
      console.log('No students in course, marking as graded');
      return true;
    }
    
    // Obtener todos los comentarios/entregas
    const allComments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');
    
    // Verificar si cada estudiante tiene una entrega calificada
    const gradedCount = studentsInCourse.filter(student => {
      const submission = allComments.find((comment: any) => 
        comment.taskId === taskId && 
        comment.studentUsername === student.username && 
        comment.isSubmission &&
        comment.grade !== undefined && 
        comment.grade !== null
      );
      
      console.log(`Student ${student.username} - has graded submission:`, !!submission);
      return !!submission;
    }).length;
    
    const allGraded = gradedCount === studentsInCourse.length;
    console.log(`Graded: ${gradedCount}/${studentsInCourse.length} - All graded:`, allGraded);
    
    return allGraded;
  }

  // Eliminar notificación pendiente de calificación cuando todos están evaluados
  static removePendingGradingNotification(taskId: string, teacherUsername: string): void {
    console.log('=== DEBUG removePendingGradingNotification ===');
    console.log('TaskId:', taskId, 'Teacher:', teacherUsername);
    
    const notifications = this.getNotifications();
    const initialCount = notifications.length;
    
    const filteredNotifications = notifications.filter(notification => 
      !(notification.type === 'pending_grading' && 
        notification.taskId === taskId && 
        notification.targetUsernames.includes(teacherUsername))
    );
    
    const removedCount = initialCount - filteredNotifications.length;
    console.log(`Removed ${removedCount} pending grading notifications`);
    
    if (removedCount > 0) {
      this.saveNotifications(filteredNotifications);
      console.log('Pending grading notifications removed and saved');
    }
  }

  // Verificar y actualizar el estado de calificación de una tarea
  static checkAndUpdateGradingStatus(taskId: string, course: string, teacherUsername: string): void {
    console.log('=== DEBUG checkAndUpdateGradingStatus ===');
    
    const allGraded = this.checkAllStudentsGraded(taskId, course);
    
    if (allGraded) {
      console.log('All students graded, removing pending notification');
      this.removePendingGradingNotification(taskId, teacherUsername);
    } else {
      console.log('Not all students graded yet, keeping pending notification');
    }
  }

  // Limpiar notificaciones antiguas (más de 30 días)
  static cleanupOldNotifications(): void {
    const notifications = this.getNotifications();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredNotifications = notifications.filter(notification => 
      new Date(notification.timestamp) > thirtyDaysAgo
    );
    
    if (filteredNotifications.length < notifications.length) {
      this.saveNotifications(filteredNotifications);
    }
  }

  // NUEVA FUNCIÓN: Limpiar notificaciones propias inconsistentes
  static cleanupSelfNotifications(): void {
    console.log('[TaskNotificationManager] Iniciando limpieza de notificaciones propias...');
    const notifications = this.getNotifications();
    let cleaned = 0;
    
    // Filtrar notificaciones donde fromUsername !== targetUsername para cada targetUsername
    const cleanedNotifications = notifications.filter(notification => {
      // Si la notificación es del mismo usuario para él mismo, es inconsistente
      const hasSelfNotification = notification.targetUsernames.includes(notification.fromUsername);
      
      if (hasSelfNotification) {
        console.log(`[TaskNotificationManager] Removiendo notificación propia inconsistente:`, {
          id: notification.id,
          type: notification.type,
          fromUsername: notification.fromUsername,
          targetUsernames: notification.targetUsernames,
          taskTitle: notification.taskTitle
        });
        cleaned++;
        return false; // Remover esta notificación
      }
      
      return true; // Mantener esta notificación
    });
    
    if (cleaned > 0) {
      this.saveNotifications(cleanedNotifications);
      console.log(`[TaskNotificationManager] Limpieza completada: ${cleaned} notificaciones propias removidas`);
    } else {
      console.log('[TaskNotificationManager] No se encontraron notificaciones propias inconsistentes');
    }
  }

  // NUEVA FUNCIÓN: Reparar targetUsernames para excluir fromUsername
  static repairSelfNotifications(): void {
    console.log('[TaskNotificationManager] Iniciando reparación de notificaciones propias...');
    const notifications = this.getNotifications();
    let repaired = 0;
    
    const repairedNotifications = notifications.map(notification => {
      // Si fromUsername está en targetUsernames, removerlo
      if (notification.targetUsernames.includes(notification.fromUsername)) {
        console.log(`[TaskNotificationManager] Reparando notificación:`, {
          id: notification.id,
          type: notification.type,
          fromUsername: notification.fromUsername,
          originalTargets: [...notification.targetUsernames],
          taskTitle: notification.taskTitle
        });
        
        const repairedTargets = notification.targetUsernames.filter(
          username => username !== notification.fromUsername
        );
        
        repaired++;
        return {
          ...notification,
          targetUsernames: repairedTargets
        };
      }
      
      return notification;
    });
    
    if (repaired > 0) {
      this.saveNotifications(repairedNotifications);
      console.log(`[TaskNotificationManager] Reparación completada: ${repaired} notificaciones reparadas`);
    } else {
      console.log('[TaskNotificationManager] No se encontraron notificaciones que reparar');
    }
  }

  // NUEVA FUNCIÓN: Reparar notificaciones del sistema que tienen fromUsername incorrecto
  static repairSystemNotifications(): void {
    console.log('[TaskNotificationManager] Iniciando reparación de notificaciones del sistema...');
    const notifications = this.getNotifications();
    let repaired = 0;
    
    const repairedNotifications = notifications.map(notification => {
      // Reparar notificaciones pending_grading y task_completed que no sean del sistema
      if ((notification.type === 'pending_grading' || notification.type === 'task_completed') && 
          notification.fromUsername !== 'system') {
        console.log(`[TaskNotificationManager] Reparando notificación del sistema:`, {
          id: notification.id,
          type: notification.type,
          originalFromUsername: notification.fromUsername,
          taskTitle: notification.taskTitle
        });
        
        repaired++;
        return {
          ...notification,
          fromUsername: 'system',
          fromDisplayName: `${notification.taskTitle} (${notification.course})`
        };
      }
      
      return notification;
    });
    
    if (repaired > 0) {
      this.saveNotifications(repairedNotifications);
      console.log(`[TaskNotificationManager] Reparación del sistema completada: ${repaired} notificaciones reparadas`);
    } else {
      console.log('[TaskNotificationManager] No se encontraron notificaciones del sistema que reparar');
    }
  }

  // NUEVA FUNCIÓN ESPECÍFICA: Limpiar notificaciones de comentarios propios
  static cleanupOwnCommentNotifications(): void {
    console.log('[TaskNotificationManager] 🧹 Limpiando notificaciones de comentarios propios...');
    const notifications = this.getNotifications();
    let cleaned = 0;
    
    const cleanedNotifications = notifications.filter(notification => {
      // Eliminar notificaciones de teacher_comment donde el profesor es emisor Y receptor
      if (notification.type === 'teacher_comment' && 
          notification.targetUsernames.includes(notification.fromUsername)) {
        console.log(`[TaskNotificationManager] 🗑️ Eliminando notificación de comentario propio:`, {
          id: notification.id,
          type: notification.type,
          fromUsername: notification.fromUsername,
          targetUsernames: notification.targetUsernames,
          taskTitle: notification.taskTitle,
          timestamp: notification.timestamp
        });
        cleaned++;
        return false; // Eliminar esta notificación
      }
      
      return true; // Mantener esta notificación
    });
    
    if (cleaned > 0) {
      this.saveNotifications(cleanedNotifications);
      console.log(`[TaskNotificationManager] ✅ Limpieza completada: ${cleaned} notificaciones de comentarios propios eliminadas`);
    } else {
      console.log('[TaskNotificationManager] ✅ No se encontraron notificaciones de comentarios propios para eliminar');
    }
  }

  // FUNCIÓN ESPECÍFICA: Eliminar notificaciones de comentarios propios de profesores
  static removeTeacherOwnCommentNotifications(): void {
    console.log('[TaskNotificationManager] 🧹 Eliminando notificaciones de comentarios propios de profesores...');
    const notifications = this.getNotifications();
    let removed = 0;
    
    const filteredNotifications = notifications.filter(notification => {
      // Eliminar notificaciones de teacher_comment donde el profesor es emisor Y está en targetUsernames
      if (notification.type === 'teacher_comment' && 
          notification.targetUsernames.includes(notification.fromUsername)) {
        console.log(`[TaskNotificationManager] 🗑️ Eliminando comentario propio de profesor:`, {
          id: notification.id,
          fromUsername: notification.fromUsername,
          targetUsernames: notification.targetUsernames,
          taskTitle: notification.taskTitle,
          timestamp: notification.timestamp
        });
        removed++;
        return false; // Eliminar esta notificación
      }
      
      return true; // Mantener esta notificación
    });
    
    if (removed > 0) {
      this.saveNotifications(filteredNotifications);
      console.log(`[TaskNotificationManager] ✅ Eliminadas ${removed} notificaciones de comentarios propios de profesores`);
      
      // Disparar evento para actualizar la UI
      window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
    } else {
      console.log('[TaskNotificationManager] ✅ No se encontraron notificaciones de comentarios propios de profesores');
    }
  }

  // FUNCIÓN ESPECÍFICA: Prevenir creación de notificaciones de comentarios propios
  static shouldCreateTeacherCommentNotification(teacherUsername: string, targetUsernames: string[]): boolean {
    // No crear notificación si el profesor está en la lista de destinatarios
    if (targetUsernames.includes(teacherUsername)) {
      console.log(`[TaskNotificationManager] ⚠️ Previniendo notificación propia para profesor ${teacherUsername}`);
      return false;
    }
    return true;
  }

  // 🔥 NUEVA FUNCIÓN: Crear notificación cuando un estudiante completa una evaluación
  static createEvaluationCompletedNotification(
    taskId: string,
    taskTitle: string,
    course: string,
    subject: string,
    studentUsername: string,
    studentDisplayName: string,
    teacherUsername: string,
    evaluationResults: {
      score: number;
      totalQuestions: number;
      completionPercentage: number;
      completedAt: string;
    }
  ): void {
    console.log('=== DEBUG createEvaluationCompletedNotification ===');
    console.log('Creating evaluation completion notification for teacher:', teacherUsername);
    console.log('Student:', studentUsername, 'Results:', evaluationResults);
    
    const notifications = this.getNotifications();
    
    const newNotification: TaskNotification = {
      id: `eval_completed_${taskId}_${studentUsername}_${Date.now()}`,
      type: 'task_completed',
      taskId,
      taskTitle,
      targetUserRole: 'teacher',
      targetUsernames: [teacherUsername],
      fromUsername: studentUsername,
      fromDisplayName: studentDisplayName,
      course,
      subject,
      timestamp: new Date().toISOString(),
      read: false,
      readBy: [],
      taskType: 'evaluation'
      // ✅ CORRECCIÓN: Eliminado el campo grade para no mostrar resultado en notificación
    };

    notifications.push(newNotification);
    console.log('Evaluation completion notification created:', newNotification);
    
    this.saveNotifications(notifications);
    console.log('Evaluation completion notification saved for teacher:', teacherUsername);
  }

  // 🔧 FUNCIÓN DE MIGRACIÓN: Actualizar notificaciones existentes que muestran "Sistema"
  static migrateSystemNotifications(): void {
    console.log('[TaskNotificationManager] 🔄 Migrando notificaciones que muestran "Sistema"...');
    
    const notifications = this.getNotifications();
    let migrated = 0;
    
    // Obtener tareas para poder acceder a los títulos y cursos
    const globalTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
    
    const updatedNotifications = notifications.map(notification => {
      if (notification.fromDisplayName === 'Sistema' || notification.fromDisplayName === 'system') {
        // Buscar la tarea correspondiente para obtener el título correcto
        const relatedTask = globalTasks.find((task: any) => task.id === notification.taskId);
        
        if (relatedTask) {
          console.log(`Migrando notificación de "${notification.fromDisplayName}" a "${relatedTask.title} (${relatedTask.course})"`);
          migrated++;
          return {
            ...notification,
            fromDisplayName: `${relatedTask.title} (${relatedTask.course})`
          };
        } else {
          // Si no se encuentra la tarea, usar información de la notificación
          const newDisplayName = `${notification.taskTitle} (${notification.course})`;
          console.log(`Migrando notificación de "${notification.fromDisplayName}" a "${newDisplayName}"`);
          migrated++;
          return {
            ...notification,
            fromDisplayName: newDisplayName
          };
        }
      }
      
      return notification;
    });
    
    if (migrated > 0) {
      this.saveNotifications(updatedNotifications);
      console.log(`[TaskNotificationManager] ✅ ${migrated} notificaciones migradas exitosamente`);
      
      // 🔧 MEJORA: Disparar múltiples eventos para asegurar actualización de UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
        window.dispatchEvent(new Event('storage')); // Para componentes que escuchan cambios de localStorage
        // Pequeño delay para asegurar que todos los eventos se propaguen
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('notificationsMigrated', { 
            detail: { migratedCount: migrated } 
          }));
        }, 100);
      }
    } else {
      console.log('[TaskNotificationManager] ℹ️ No se encontraron notificaciones que necesiten migración');
    }
  }
}
