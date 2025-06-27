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
    teacherDisplayName: string
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
      readBy: []
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
      fromDisplayName: 'Sistema',
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
      fromDisplayName: 'Sistema',
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

  // Obtener notificaciones no leídas para un usuario específico
  static getUnreadNotificationsForUser(username: string, userRole: 'student' | 'teacher'): TaskNotification[] {
    const notifications = this.getNotifications();
    return notifications.filter(notification => 
      notification.targetUserRole === userRole &&
      notification.targetUsernames.includes(username) &&
      !notification.readBy.includes(username) &&
      notification.fromUsername !== username // ✅ NUEVO: Excluir notificaciones de sus propios comentarios
    );
  }

  // Contar notificaciones no leídas para un usuario
  static getUnreadCountForUser(username: string, userRole: 'student' | 'teacher'): number {
    const unreadNotifications = this.getUnreadNotificationsForUser(username, userRole);
    
    // Para profesores, excluir notificaciones de tipo 'task_submission' 
    // ya que estas se cuentan por separado en pendingTaskSubmissionsCount
    if (userRole === 'teacher') {
      return unreadNotifications.filter(n => n.type !== 'task_submission').length;
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
      console.log(`[TaskNotificationManager] Marked all notifications for task ${taskId} as read for student ${studentUsername}`);
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
          fromDisplayName: 'Sistema'
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
}
