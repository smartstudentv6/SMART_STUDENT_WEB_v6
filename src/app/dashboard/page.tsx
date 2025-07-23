"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { Library, Newspaper, Network, FileQuestion, ClipboardList, Home, Users, Settings, ClipboardCheck, MessageSquare, GraduationCap, Crown, Shield, UserCheck, TrendingUp, Megaphone } from 'lucide-react';
import NotificationsPanel from '@/components/common/notifications-panel';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaskNotificationManager } from '@/lib/notifications';

// Interfaz para los comentarios de tareas
interface TaskComment {
  id: string;
  taskId: string;
  studentUsername: string;
  studentName: string;
  comment: string;
  timestamp: string;
  isSubmission: boolean;
  isNew?: boolean;
  readBy?: string[];
}

const featureCards = [
  {
    titleKey: 'cardBooksTitle',
    descKey: 'cardBooksDesc',
    btnKey: 'cardBooksBtn',
    targetPage: '/dashboard/libros',
    icon: Library,
    colorClass: 'green',
  },
  {
    titleKey: 'cardSummaryTitle',
    descKey: 'cardSummaryDesc',
    btnKey: 'cardSummaryBtn',
    targetPage: '/dashboard/resumen',
    icon: Newspaper,
    colorClass: 'blue', // Ensured this is 'blue'
  },
  {
    titleKey: 'cardMapTitle',
    descKey: 'cardMapDesc',
    btnKey: 'cardMapBtn',
    targetPage: '/dashboard/mapa-mental',
    icon: Network,
    colorClass: 'yellow',
  },
  {
    titleKey: 'cardQuizTitle',
    descKey: 'cardQuizDesc',
    btnKey: 'cardQuizBtn',
    targetPage: '/dashboard/cuestionario',
    icon: FileQuestion,
    colorClass: 'cyan',
  },
  {
    titleKey: 'cardEvalTitle',
    descKey: 'cardEvalDesc',
    btnKey: 'cardEvalBtn',
    targetPage: '/dashboard/evaluacion',
    icon: ClipboardList,
    colorClass: 'purple',
  },
  {
    titleKey: 'cardTasksTitle',
    descKey: 'cardTasksDesc',
    btnKey: 'cardTasksBtn',
    targetPage: '/dashboard/tareas',
    icon: ClipboardCheck,
    colorClass: 'orange',
    showBadge: true, // Para mostrar la burbuja de notificación
  },
  {
    titleKey: 'cardCommunicationsStudentTitle',
    descKey: 'cardCommunicationsStudentDesc',
    btnKey: 'cardCommunicationsStudentBtn',
    targetPage: '/dashboard/comunicaciones',
    icon: Megaphone,
    colorClass: 'red',
    showBadge: false,
  },
];

const adminCards = [
  {
    titleKey: 'cardUserManagementTitle',
    descKey: 'cardUserManagementDesc',
    btnKey: 'cardUserManagementBtn',
    targetPage: '/dashboard/gestion-usuarios',
    icon: Users,
    colorClass: 'teal',
    showBadge: true, // Para mostrar la burbuja de notificación si hay pendientes
  },
  {
    titleKey: 'cardPasswordRequestsTitle',
    descKey: 'cardPasswordRequestsDesc',
    btnKey: 'cardPasswordRequestsBtn',
    targetPage: '/dashboard/solicitudes',
    icon: ClipboardCheck,
    colorClass: 'red',
    showBadge: true, // Para mostrar la burbuja de notificación de solicitudes de contraseña
  },
];

// Tarjetas específicas para profesores
const teacherCards = [
  {
    titleKey: 'cardCommunicationsTitle',
    descKey: 'cardCommunicationsDesc',
    btnKey: 'cardCommunicationsBtn',
    targetPage: '/dashboard/comunicaciones',
    icon: Megaphone,
    colorClass: 'red',
    showBadge: false,
  },
  {
    titleKey: 'cardAttendanceTitle', 
    descKey: 'cardAttendanceDesc',
    btnKey: 'cardAttendanceBtn',
    targetPage: '/dashboard/asistencia',
    icon: UserCheck,
    colorClass: 'indigo',
    showBadge: false,
  },
  {
    titleKey: 'cardStatisticsTitle',
    descKey: 'cardStatisticsDesc', 
    btnKey: 'cardStatisticsBtn',
    targetPage: '/dashboard/estadisticas',
    icon: TrendingUp,
    colorClass: 'emerald',
    showBadge: false,
  },
];

export default function DashboardHomePage() {
  const { translate } = useLanguage();
  const { user } = useAuth();
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
  const [pendingPasswordRequestsCount, setPendingPasswordRequestsCount] = useState(0);
  const [pendingTaskSubmissionsCount, setPendingTaskSubmissionsCount] = useState(0);
  const [unreadStudentCommentsCount, setUnreadStudentCommentsCount] = useState(0);
  const [taskNotificationsCount, setTaskNotificationsCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  // Cargar comentarios no leídos de las tareas y entregas pendientes
  useEffect(() => {
    if (user) {
      // Cargar notificaciones de tareas
      loadTaskNotifications();
      // Cargar tareas pendientes reales
      loadPendingTasks();
      
      // Cargar comentarios de tareas del localStorage
      const storedComments = localStorage.getItem('smart-student-task-comments');
      if (storedComments) {
        const comments: TaskComment[] = JSON.parse(storedComments);
        
        if (user.role === 'student') {
          // Filtrar comentarios que no han sido leídos por el usuario actual
          // EXCLUIR comentarios de entrega (isSubmission) ya que son parte del trabajo entregado, no comentarios de discusión
          let unread = comments.filter((comment: TaskComment) => 
            comment.studentUsername !== user.username && // No contar los propios comentarios
            (!comment.readBy?.includes(user.username)) &&
            !comment.isSubmission // NUEVO: Excluir comentarios de entrega
          );

          // Eliminar duplicados de comentarios del profesor (por taskId, comment, timestamp, studentUsername)
          unread = unread.filter((comment, idx, arr) =>
            arr.findIndex(c =>
              c.taskId === comment.taskId &&
              c.comment === comment.comment &&
              c.timestamp === comment.timestamp &&
              c.studentUsername === comment.studentUsername
            ) === idx
          );
          setUnreadCommentsCount(unread.length);
        } else if (user.role === 'teacher') {
          // Para profesores, cargar entregas pendientes
          loadPendingTaskSubmissions();
        }
      }
    }
  }, [user]);

  // Función para cargar notificaciones de tareas
  const loadTaskNotifications = () => {
    if (user) {
      // 🔥 CORRECCIÓN DIRECTA: Calcular desde localStorage para profesores como fallback
      if (user.role === 'teacher') {
        try {
          const notifications = JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]');
          
          // Filtrar notificaciones no leídas para este profesor usando la misma lógica que funcionó en el debug
          const teacherNotifications = notifications.filter((notif: any) => 
            notif.targetUserRole === 'teacher' &&
            (notif.targetUsernames?.includes(user.username) || notif.targetUsernames?.includes(user.id)) &&
            !notif.readBy?.includes(user.username) && !notif.readBy?.includes(user.id)
          );
          
          console.log(`� [Dashboard] DIRECT localStorage calculation for ${user.username}:`);
          console.log(`📋 Total notifications in localStorage: ${notifications.length}`);
          console.log(`📋 Teacher notifications (filtered): ${teacherNotifications.length}`);
          
          // Filtrar por tipos específicos para profesores
          const taskSubmissions = teacherNotifications.filter((n: any) => n.type === 'task_submission');
          const pendingGrading = teacherNotifications.filter((n: any) => n.type === 'pending_grading');
          const taskCompleted = teacherNotifications.filter((n: any) => n.type === 'task_completed');
          const evaluationCompleted = teacherNotifications.filter((n: any) => n.type === 'evaluation_completed'); // 🔥 NUEVO: Agregar evaluaciones completadas
          const teacherComments = teacherNotifications.filter((n: any) => n.type === 'teacher_comment');
          
          // 🔥 CORRECCIÓN: Usar la misma lógica de filtrado que getUnreadCountForUser
          const countableTypes = ['pending_grading', 'task_completed', 'task_submission', 'evaluation_completed', 'teacher_comment'];
          const countableNotifications = teacherNotifications.filter((n: any) => countableTypes.includes(n.type));
          const directCount = countableNotifications.length;
          
          console.log(`🔍 [Dashboard] DIRECT Breakdown:`, {
            'task_submission (Tareas Completadas)': taskSubmissions.length,
            'pending_grading': pendingGrading.length,
            'task_completed': taskCompleted.length, 
            'evaluation_completed': evaluationCompleted.length, // 🔥 NUEVO: Mostrar conteo de evaluaciones completadas
            'teacher_comment': teacherComments.length,
            'COUNTABLE NOTIFICATIONS': countableNotifications.length,
            'DIRECT TOTAL': directCount
          });
          
          // También intentar el TaskNotificationManager para comparar
          let managerCount = 0;
          try {
            managerCount = TaskNotificationManager.getUnreadCountForUser(user.username, 'teacher', user.id);
            console.log(`🔍 [Dashboard] TaskNotificationManager returned: ${managerCount}`);
          } catch (error) {
            console.warn(`⚠️ [Dashboard] TaskNotificationManager failed:`, error);
          }
          
          // 🔥 USAR directCount (corregido) como prioritario, managerCount solo como fallback
          const finalCount = directCount;
          console.log(`🎯 [Dashboard] Using final count: ${finalCount} (direct: ${directCount}, manager: ${managerCount})`);
          console.log(`🔍 [Dashboard] Prioritizing corrected directCount over TaskNotificationManager`);
          
          setTaskNotificationsCount(finalCount);
          
        } catch (error) {
          console.error('Error in direct notification calculation:', error);
          // Fallback al TaskNotificationManager original
          const count = TaskNotificationManager.getUnreadCountForUser(user.username, 'teacher', user.id);
          setTaskNotificationsCount(count);
        }
      } else {
        // Para estudiantes, usar TaskNotificationManager normal
        const count = TaskNotificationManager.getUnreadCountForUser(
          user.username, 
          user.role as 'student' | 'teacher',
          user.id
        );
        console.log(`🔔 [Dashboard] TaskNotifications - User ${user.username} (${user.role}) has ${count} unread task notifications`);
        setTaskNotificationsCount(count);
      }
    }
  };

  // Función para cargar solicitudes de contraseña pendientes
  const loadPendingPasswordRequests = () => {
    if (user && user.role === 'admin') {
      const storedRequests = localStorage.getItem('password-reset-requests');
      if (storedRequests) {
        const requests = JSON.parse(storedRequests);
        
        // Filtrar solicitudes pendientes
        const pendingRequests = requests.filter((req: any) => req.status === 'pending');
        
        setPendingPasswordRequestsCount(pendingRequests.length);
      } else {
        setPendingPasswordRequestsCount(0);
      }
    }
  };

  // Función para limpiar datos inconsistentes
  const cleanupInconsistentData = () => {
    try {
      // ✅ NUEVO: Limpiar notificaciones propias inconsistentes
      TaskNotificationManager.repairSelfNotifications();
      
      // ✅ NUEVO: Reparar notificaciones del sistema con fromUsername incorrecto
      TaskNotificationManager.repairSystemNotifications();
      
      // ✅ ESPECÍFICO: Limpiar notificaciones de comentarios propios del profesor
      TaskNotificationManager.cleanupOwnCommentNotifications();
      
      // ✅ ESPECÍFICO: Eliminar notificaciones de comentarios propios de profesores
      TaskNotificationManager.removeTeacherOwnCommentNotifications();
      
      // Limpiar notificaciones duplicadas o huérfanas
      const notifications = JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]');
      const tasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
      const taskIds = tasks.map((t: any) => t.id);
      
      // Filtrar notificaciones válidas (que tengan tarea existente)
      const validNotifications = notifications.filter((n: any) => taskIds.includes(n.taskId));
      
      // Remover duplicados
      const uniqueNotifications = validNotifications.filter((notif: any, index: number, arr: any[]) => {
        const key = `${notif.type}_${notif.taskId}_${notif.fromUsername}_${notif.targetUsernames.join(',')}`;
        return arr.findIndex((n: any) => 
          `${n.type}_${n.taskId}_${n.fromUsername}_${n.targetUsernames.join(',')}` === key
        ) === index;
      });
      
      if (uniqueNotifications.length !== notifications.length) {
        console.log(`[Dashboard] Cleaned up ${notifications.length - uniqueNotifications.length} invalid/duplicate notifications`);
        localStorage.setItem('smart-student-task-notifications', JSON.stringify(uniqueNotifications));
      }
      
      // Limpiar comentarios huérfanos y duplicados
      const comments = JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');
      let validComments = comments.filter((c: any) => taskIds.includes(c.taskId));
      
      // Eliminar duplicados de comentarios/entregas
      const uniqueComments = validComments.filter((comment: any, index: number, arr: any[]) => {
        const key = `${comment.taskId}_${comment.studentUsername}_${comment.comment}_${comment.timestamp}_${comment.isSubmission}`;
        return arr.findIndex((c: any) => 
          `${c.taskId}_${c.studentUsername}_${c.comment}_${c.timestamp}_${c.isSubmission}` === key
        ) === index;
      });
      
      if (uniqueComments.length !== comments.length) {
        console.log(`[Dashboard] Cleaned up ${comments.length - uniqueComments.length} orphaned/duplicate comments`);
        localStorage.setItem('smart-student-task-comments', JSON.stringify(uniqueComments));
      }
    } catch (error) {
      console.error('Error cleaning up data:', error);
    }
  };

  // Cargar entregas pendientes para profesores para mostrar en las notificaciones
  const loadPendingTaskSubmissions = () => {
    if (user && user.role === 'teacher') {
      try {
        const storedComments = localStorage.getItem('smart-student-task-comments');
        const storedTasks = localStorage.getItem('smart-student-tasks');
        
        if (storedComments && storedTasks) {
          const comments = JSON.parse(storedComments);
          const tasks = JSON.parse(storedTasks);
          
          // Filtrar tareas asignadas por este profesor - usar múltiples criterios
          const teacherTasks = tasks.filter((task: any) => 
            task.assignedBy === user.username || 
            task.assignedById === user.id ||
            task.assignedBy === user.id ||
            task.assignedById === user.username
          );
          const teacherTaskIds = teacherTasks.map((task: any) => task.id);
          
          console.log(`[Dashboard] Teacher ${user.username} task filtering:`);
          console.log(`- Total tasks in localStorage: ${tasks.length}`);
          console.log(`- Tasks assigned by this teacher: ${teacherTasks.length}`);
          console.log(`- Teacher task IDs: [${teacherTaskIds.join(', ')}]`);
          
          if (teacherTasks.length > 0) {
            console.log('- Found teacher tasks:');
            teacherTasks.forEach((task: any, index: number) => {
              console.log(`  ${index + 1}. "${task.title}" (ID: ${task.id})`);
              console.log(`     - assignedBy: "${task.assignedBy}"`);
              console.log(`     - assignedById: "${task.assignedById}"`);
            });
          } else {
            console.warn(`⚠️ [Dashboard] No tasks found for teacher ${user.username}. Checking all tasks:`);
            tasks.forEach((task: any, index: number) => {
              console.log(`  Task ${index + 1}: "${task.title}"`);
              console.log(`    - assignedBy: "${task.assignedBy}"`);
              console.log(`    - assignedById: "${task.assignedById}"`);
            });
          }
          
          // Filtrar entregas sin calificar - ser más estricto con la validación
          // También excluir entregas propias del profesor
          let pendingSubmissions = comments.filter((comment: any) => 
            comment.isSubmission === true && 
            teacherTaskIds.includes(comment.taskId) &&
            comment.studentUsername !== user.username && // Excluir entregas propias del profesor
            (!comment.grade || comment.grade === null || comment.grade === undefined)
          );

          // Eliminar duplicados de entregas - Agrupar por estudiante y tarea (solo la entrega más reciente)
          // Esto asegura que una entrega con comentario se cuente como UN SOLO evento
          const uniqueSubmissions = pendingSubmissions.reduce((acc: any[], submission: any) => {
            const key = `${submission.taskId}_${submission.studentUsername}`;
            const existing = acc.find(s => `${s.taskId}_${s.studentUsername}` === key);
            
            if (!existing) {
              // Primera entrega para esta combinación tarea-estudiante
              acc.push(submission);
            } else {
              // Si ya existe, mantener la más reciente (por timestamp)
              if (new Date(submission.timestamp) > new Date(existing.timestamp)) {
                const index = acc.indexOf(existing);
                acc[index] = submission;
              }
            }
            
            return acc;
          }, []);

          pendingSubmissions = uniqueSubmissions;

          // Cargar comentarios de estudiantes (NO entregas) para tareas de este profesor
          // que no hayan sido leídos por el profesor y que no sean propios
          // ✅ MEJORA: Evitar duplicados con notificaciones del sistema
          const studentComments = comments.filter((comment: any) => {
            if (comment.isSubmission || // Solo comentarios, no entregas
                !teacherTaskIds.includes(comment.taskId) || // Solo para tareas del profesor
                comment.studentUsername === user.username || // Excluir comentarios propios
                comment.readBy?.includes(user.username)) { // Ya leídos
              return false;
            }
            
            // ✅ NUEVA VALIDACIÓN: No incluir comentarios que ya están en las notificaciones del sistema
            const alreadyInNotifications = TaskNotificationManager.getNotifications().some((notif: any) => 
              notif.type === 'teacher_comment' && 
              notif.taskId === comment.taskId &&
              notif.fromUsername === comment.studentUsername &&
              !notif.readBy.includes(user.username) &&
              // Verificar que el timestamp sea similar (dentro de 1 minuto)
              Math.abs(new Date(notif.timestamp).getTime() - new Date(comment.timestamp).getTime()) < 60000
            );
            
            return !alreadyInNotifications;
          });
          
          console.log(`[Dashboard] Teacher ${user.username} analysis:`);
          console.log(`- Total tasks assigned: ${teacherTasks.length}`);
          console.log(`- Task IDs: [${teacherTaskIds.join(', ')}]`);
          console.log(`- Total submissions: ${comments.filter((c: any) => c.isSubmission && teacherTaskIds.includes(c.taskId)).length}`);
          console.log(`- Ungraded submissions: ${pendingSubmissions.length}`);
          console.log(`- Unread student comments: ${studentComments.length}`);
          
          if (pendingSubmissions.length > 0) {
            console.log('Ungraded submissions details:');
            pendingSubmissions.forEach((sub: any, index: number) => {
              const task = tasks.find((t: any) => t.id === sub.taskId);
              console.log(`  ${index + 1}. ${sub.studentName} - "${task?.title || 'Unknown'}" - Grade: ${sub.grade} (${typeof sub.grade})`);
            });
          }

          if (studentComments.length > 0) {
            console.log('Unread student comments details:');
            studentComments.forEach((comment: any, index: number) => {
              const task = tasks.find((t: any) => t.id === comment.taskId);
              console.log(`  ${index + 1}. ${comment.studentName} - "${task?.title || 'Unknown'}" - Comment: "${comment.comment.substring(0, 50)}..."`);
            });
          }
          
          setPendingTaskSubmissionsCount(pendingSubmissions.length);
          setUnreadStudentCommentsCount(studentComments.length);
          
          // ✅ MEJORA: Disparar eventos para sincronizar el panel de notificaciones
          console.log(`[Dashboard] Triggering notification sync events for updated counts`);
          window.dispatchEvent(new CustomEvent('notificationsUpdated', { 
            detail: { 
              type: 'teacher_counters_updated',
              unreadStudentCommentsCount: studentComments.length,
              pendingTaskSubmissionsCount: pendingSubmissions.length
            } 
          }));
        } else {
          console.log(`[Dashboard] No stored data found for teacher ${user.username}`);
          setPendingTaskSubmissionsCount(0);
          setUnreadStudentCommentsCount(0);
        }
      } catch (error) {
        console.error('Error loading pending submissions:', error);
        setPendingTaskSubmissionsCount(0);
        setUnreadStudentCommentsCount(0);
      }
    } else {
      setPendingTaskSubmissionsCount(0);
      setUnreadStudentCommentsCount(0);
    }
  };

  // Función para cargar tareas pendientes reales
  const loadPendingTasks = () => {
    if (user) {
      const storedTasks = localStorage.getItem('smart-student-tasks');
      if (storedTasks) {
        const tasks = JSON.parse(storedTasks);
        const storedComments = localStorage.getItem('smart-student-task-comments');
        const comments = storedComments ? JSON.parse(storedComments) : [];
        
        if (user.role === 'student') {
          // Para estudiantes: contar tareas asignadas que aún no han sido completadas/entregadas
          const studentTasks = tasks.filter((task: any) => {
            if (task.assignedTo === 'course' && task.course === (user as any).course) {
              return true;
            }
            if (task.assignedTo === 'specific' && task.assignedStudents?.includes(user.username)) {
              return true;
            }
            return false;
          });
          
          // Contar tareas que no tienen entrega o están pendientes de calificación
          const pendingTasks = studentTasks.filter((task: any) => {
            const submissions = comments.filter((comment: any) => 
              comment.taskId === task.id && 
              comment.studentUsername === user.username && 
              comment.isSubmission
            );
            
            // Si no hay entregas, la tarea está pendiente
            if (submissions.length === 0) return true;
            
            // Si hay entregas pero no están calificadas, también está pendiente
            const latestSubmission = submissions[submissions.length - 1];
            return !latestSubmission.grade;
          });
          
          setPendingTasksCount(pendingTasks.length);
          console.log(`[Dashboard] Student ${user.username} has ${pendingTasks.length} pending tasks`);
          
        } else if (user.role === 'teacher') {
          // Para profesores, el contador de tareas pendientes no se usa (solo se usa pendingTaskSubmissionsCount)
          setPendingTasksCount(0);
          console.log(`[Dashboard] Teacher ${user.username} - pendingTasksCount for card set to 0 (only pendingTaskSubmissionsCount is used)`);
        }
      } else {
        setPendingTasksCount(0);
      }
    }
  };

  // Función para cargar tareas pendientes del profesor (estado 'pending')
  const loadPendingTeacherTasks = () => {
    if (user && user.role === 'teacher') {
      try {
        const storedTasks = localStorage.getItem('smart-student-tasks');
        if (storedTasks) {
          const tasks = JSON.parse(storedTasks);
          
          // Filtrar tareas creadas por este profesor que están en estado 'pending' - usar múltiples criterios
          const pendingTasks = tasks.filter((task: any) => 
            (task.assignedById === user.id || 
             task.assignedBy === user.username ||
             task.assignedById === user.username ||
             task.assignedBy === user.id) &&
            task.status === 'pending'
          );
          
          console.log(`[Dashboard] Teacher ${user.username} has ${pendingTasks.length} pending tasks`);
          
          // Usar el estado existente pendingTasksCount para mostrar las tareas pendientes
          setPendingTasksCount(pendingTasks.length);
        } else {
          setPendingTasksCount(0);
        }
      } catch (error) {
        console.error('Error loading pending teacher tasks:', error);
        setPendingTasksCount(0);
      }
    }
  };

  // Cargar solicitudes de contraseña pendientes y entregas pendientes, y actualizar la cuenta de comentarios
  useEffect(() => {
    // Primero limpiar datos inconsistentes
    cleanupInconsistentData();
    
    // Luego cargar los contadores
    loadPendingPasswordRequests();
    loadPendingTaskSubmissions();
    loadTaskNotifications();
    loadPendingTasks();
    
    // 🔔 NUEVA FUNCIONALIDAD: Cargar tareas pendientes del profesor para notificaciones
    if (user?.role === 'teacher') {
      loadPendingTeacherTasks();
    }
    
    // Escuchar cambios en localStorage para actualizar los contadores en tiempo real
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'password-reset-requests') {
        loadPendingPasswordRequests();
      }
      if (e.key === 'smart-student-task-comments') {
        if (user?.role === 'student') {
          // Recargar comentarios no leídos para estudiantes
          const storedComments = localStorage.getItem('smart-student-task-comments');
          if (storedComments) {
            const comments = JSON.parse(storedComments);
            let unread = comments.filter((comment: any) => 
              comment.studentUsername !== user.username && 
              (!comment.readBy?.includes(user.username)) &&
              !comment.isSubmission // NUEVO: Excluir comentarios de entrega
            );

            // Eliminar duplicados de comentarios del profesor
            unread = unread.filter((comment: any, idx: number, arr: any[]) =>
              arr.findIndex((c: any) =>
                c.taskId === comment.taskId &&
                c.comment === comment.comment &&
                c.timestamp === comment.timestamp &&
                c.studentUsername === comment.studentUsername
              ) === idx
            );
            setUnreadCommentsCount(unread.length);
          }
        } else if (user?.role === 'teacher') {
          // Recargar entregas pendientes para profesores
          loadPendingTaskSubmissions();
        }
      }
      
      // 🔔 NUEVA FUNCIONALIDAD: Escuchar cambios en tareas para actualizar tareas pendientes del profesor
      if (e.key === 'smart-student-tasks') {
        if (user?.role === 'teacher') {
          loadPendingTeacherTasks();
        }
        // También actualizar otras métricas relacionadas con tareas
        loadPendingTasks();
        loadPendingTaskSubmissions();
      }
    };
    
    // Función para manejar el evento personalizado cuando se marcan comentarios como leídos
    const handleCommentsUpdated = () => {
      console.log('🔄 [Dashboard] handleCommentsUpdated triggered');
      
      if (user?.role === 'student') {
        // Recargar comentarios no leídos para estudiantes
        const storedComments = localStorage.getItem('smart-student-task-comments');
        if (storedComments) {
          const comments = JSON.parse(storedComments);
          let unread = comments.filter((comment: any) => 
            comment.studentUsername !== user.username && 
            (!comment.readBy?.includes(user.username)) &&
            !comment.isSubmission // NUEVO: Excluir comentarios de entrega
          );

          // Eliminar duplicados de comentarios del profesor
          unread = unread.filter((comment: any, idx: number, arr: any[]) =>
            arr.findIndex((c: any) =>
              c.taskId === comment.taskId &&
              c.comment === comment.comment &&
              c.timestamp === comment.timestamp &&
              c.studentUsername === comment.studentUsername
            ) === idx
          );
          
          const newCount = unread.length;
          console.log(`🔔 [Dashboard] Student ${user.username} - updating unread comments count from ${unreadCommentsCount} to ${newCount}`);
          setUnreadCommentsCount(newCount);
          
          // 🔥 NUEVA MEJORA: Disparar evento para actualizar el panel de notificaciones
          window.dispatchEvent(new CustomEvent('updateDashboardCounts', { 
            detail: { 
              type: 'student_comments_updated',
              newCount: newCount,
              oldCount: unreadCommentsCount
            } 
          }));
        }
        // También actualizar tareas pendientes cuando hay cambios en comentarios
        loadPendingTasks();
      } else if (user?.role === 'teacher') {
        // Recargar entregas pendientes para profesores
        loadPendingTaskSubmissions();
        loadPendingTasks();
      }
    };

    // Función para manejar el evento personalizado de notificaciones de tareas
    const handleTaskNotificationsUpdated = () => {
      loadTaskNotifications();
      loadPendingTasks(); // También actualizar el contador de tareas pendientes
      
      // 🔔 NUEVA FUNCIONALIDAD: Actualizar tareas pendientes del profesor
      if (user?.role === 'teacher') {
        loadPendingTeacherTasks();
      }
    };

    // ✅ NUEVO: Listener para actualizaciones de conteo desde el panel de notificaciones
    const handleDashboardCountsUpdate = (event: CustomEvent) => {
      console.log(`[Dashboard] Received count update request from notifications panel:`, event.detail);
      
      // Recargar todos los contadores según el rol
      if (user?.role === 'teacher') {
        loadPendingTaskSubmissions();
        loadTaskNotifications();
        loadPendingTeacherTasks();
      } else if (user?.role === 'student') {
        // Recargar comentarios no leídos
        const storedComments = localStorage.getItem('smart-student-task-comments');
        if (storedComments) {
          const comments = JSON.parse(storedComments);
          let unread = comments.filter((comment: any) => 
            comment.studentUsername !== user.username && 
            (!comment.readBy?.includes(user.username)) &&
            !comment.isSubmission
          );

          unread = unread.filter((comment: any, idx: number, arr: any[]) =>
            arr.findIndex((c: any) =>
              c.taskId === comment.taskId &&
              c.comment === comment.comment &&
              c.timestamp === comment.timestamp &&
              c.studentUsername === comment.studentUsername
            ) === idx
          );
          setUnreadCommentsCount(unread.length);
        }
        
        loadPendingTasks();
        loadTaskNotifications();
      } else if (user?.role === 'admin') {
        loadPendingPasswordRequests();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('commentsUpdated', handleCommentsUpdated);
    window.addEventListener('taskNotificationsUpdated', handleTaskNotificationsUpdated);
    window.addEventListener('updateDashboardCounts', handleDashboardCountsUpdate as EventListener);
    
    // 🔥 NUEVO: Listener para cuando se califica una tarea
    const handleTaskGraded = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🎯 [Dashboard] handleTaskGraded triggered:', customEvent.detail);
      
      // Actualizar contadores para estudiantes cuando se califica su tarea
      if (user?.role === 'student') {
        loadPendingTasks(); // Actualizar tareas pendientes
        loadTaskNotifications(); // Actualizar notificaciones
      }
    };
    window.addEventListener('taskGraded', handleTaskGraded);
    
    // 🔥 NUEVA MEJORA: Listener específico para actualizaciones de comentarios de estudiantes
    const handleStudentCommentsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 [Dashboard] handleStudentCommentsUpdated triggered:', customEvent.detail);
      
      if (user?.role === 'student' && customEvent.detail.username === user.username) {
        // Forzar recarga inmediata del conteo de comentarios
        setTimeout(() => {
          const storedComments = localStorage.getItem('smart-student-task-comments');
          if (storedComments) {
            const comments = JSON.parse(storedComments);
            let unread = comments.filter((comment: any) => 
              comment.studentUsername !== user.username && 
              (!comment.readBy?.includes(user.username)) &&
              !comment.isSubmission
            );

            // Eliminar duplicados
            unread = unread.filter((comment: any, idx: number, arr: any[]) =>
              arr.findIndex((c: any) =>
                c.taskId === comment.taskId &&
                c.comment === comment.comment &&
                c.timestamp === comment.timestamp &&
                c.studentUsername === comment.studentUsername
              ) === idx
            );
            
            const newCount = unread.length;
            console.log(`🔔 [Dashboard] Force updating student comments count to ${newCount}`);
            setUnreadCommentsCount(newCount);
          }
        }, 100); // Pequeño delay para asegurar que localStorage se haya actualizado
      }
    };

    // 🔥 NUEVA MEJORA: Listener para cuando se cierra el diálogo de tareas
    const handleTaskDialogClosed = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 [Dashboard] handleTaskDialogClosed triggered:', customEvent.detail);
      
      if (user?.role === 'student' && customEvent.detail.username === user.username) {
        console.log('🔔 [Dashboard] Student closed task dialog - forcing comment count update');
        
        // Forzar recarga inmediata del conteo de comentarios después de cerrar el diálogo
        setTimeout(() => {
          const storedComments = localStorage.getItem('smart-student-task-comments');
          if (storedComments) {
            const comments = JSON.parse(storedComments);
            let unread = comments.filter((comment: any) => 
              comment.studentUsername !== user.username && 
              (!comment.readBy?.includes(user.username)) &&
              !comment.isSubmission
            );

            // Eliminar duplicados
            unread = unread.filter((comment: any, idx: number, arr: any[]) =>
              arr.findIndex((c: any) =>
                c.taskId === comment.taskId &&
                c.comment === comment.comment &&
                c.timestamp === comment.timestamp &&
                c.studentUsername === comment.studentUsername
              ) === idx
            );
            
            const newCount = unread.length;
            console.log(`🔔 [Dashboard] Updating student comments count after dialog close: ${newCount}`);
            setUnreadCommentsCount(newCount);
            
            // Disparar evento para actualizar el panel de notificaciones
            window.dispatchEvent(new CustomEvent('updateDashboardCounts', { 
              detail: { 
                type: 'student_comments_updated_dialog_closed',
                newCount: newCount,
                action: 'task_dialog_closed'
              } 
            }));
          }
        }, 200); // Delay más largo para asegurar que localStorage se haya actualizado
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('commentsUpdated', handleCommentsUpdated);
    window.addEventListener('taskNotificationsUpdated', handleTaskNotificationsUpdated);
    window.addEventListener('updateDashboardCounts', handleDashboardCountsUpdate as EventListener);
    window.addEventListener('studentCommentsUpdated', handleStudentCommentsUpdated as EventListener);
    window.addEventListener('taskDialogClosed', handleTaskDialogClosed as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('commentsUpdated', handleCommentsUpdated);
      window.removeEventListener('taskNotificationsUpdated', handleTaskNotificationsUpdated);
      window.removeEventListener('updateDashboardCounts', handleDashboardCountsUpdate as EventListener);
      window.removeEventListener('studentCommentsUpdated', handleStudentCommentsUpdated as EventListener);
      window.removeEventListener('taskDialogClosed', handleTaskDialogClosed as EventListener);
      window.removeEventListener('taskGraded', handleTaskGraded); // 🔥 NUEVO: Remover listener taskGraded
    };
  }, [user]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200 hover:bg-gray-100 hover:text-red-800 transition-colors duration-200'; // NotificationBadge: hover fondo gris claro
      case 'teacher': return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-gray-100 hover:text-blue-800 transition-colors duration-200'; // NotificationBadge: hover fondo gris claro
      case 'student': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-700 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors duration-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getButtonColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'home-card-button-green';
      case 'blue': return 'home-card-button-blue';
      case 'yellow': return 'home-card-button-yellow';
      case 'cyan': return 'home-card-button-cyan';
      case 'purple': return 'home-card-button-purple';
      case 'orange': return 'home-card-button-orange';
      case 'red': return 'home-card-button-red';
      case 'indigo': return 'home-card-button-indigo';
      case 'teal': return 'home-card-button-teal';
      case 'rose': return 'home-card-button-rose';
      case 'emerald': return 'home-card-button-emerald';
      default: return '';
    }
  };
  
  const getIconColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'text-green-500 dark:text-green-400';
      case 'blue': return 'text-blue-500 dark:text-blue-400';
      case 'yellow': return 'text-yellow-500 dark:text-yellow-400';
      case 'cyan': return 'text-cyan-500 dark:text-cyan-400';
      case 'purple': return 'text-purple-500 dark:text-purple-400';
      case 'orange': return 'text-orange-500 dark:text-orange-400';
      case 'red': return 'text-red-500 dark:text-red-400';
      case 'indigo': return 'text-indigo-500 dark:text-indigo-400';
      case 'teal': return 'text-teal-500 dark:text-teal-400';
      case 'rose': return 'text-rose-500 dark:text-rose-400';
      case 'emerald': return 'text-emerald-500 dark:text-emerald-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start gap-3">
            <h1 className="text-3xl font-bold text-foreground font-headline">
              {translate('welcomeMessage', { 
                name: user?.displayName 
                  ? user.displayName.charAt(0).toUpperCase() + user.displayName.slice(1).toLowerCase()
                  : 'Usuario' 
              })}
            </h1>
            <Home className="w-8 h-8 text-foreground" />
          </div>
          {user && (
            <div className="flex items-center gap-3">
              {/* User Role Badge */}
              <Badge className={cn("text-xs font-medium px-2 py-1 inline-flex items-center gap-1.5", getRoleBadgeColor(user.role))}>
                {user.role === 'admin' && (
                  <Crown className="w-3 h-3 text-red-700 dark:text-red-400 flex-shrink-0" />
                )}
                {user.role === 'teacher' && (
                  <Shield className="w-3 h-3 text-blue-700 dark:text-blue-400 flex-shrink-0" />
                )}
                {user.role === 'student' && (
                  <GraduationCap className="w-3 h-3 text-green-500 dark:text-green-400 flex-shrink-0" />
                )}
                {user.role === 'admin' && translate('adminRole')}
                {user.role === 'teacher' && translate('teacherRole')}
                {user.role === 'student' && translate('studentRole')}
              </Badge>
              {/* Notification Panel */}
              <NotificationsPanel count={
                (() => {
                  // 🔧 CORRECCIÓN: Evitar duplicación de entregas en el contador del profesor
                  let totalCount;
                  
                  if (user.role === 'admin') {
                    totalCount = pendingPasswordRequestsCount;
                  } else if (user.role === 'teacher') {
                    // Para profesores: solo usar entregas + comentarios + notificaciones del sistema (excluyendo task_submission)
                    // porque pendingTaskSubmissionsCount ya cuenta las entregas directamente desde localStorage
                    
                    // Calcular taskNotificationsCount sin incluir task_submission Y task_completed para evitar duplicación
                    const notifications = JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]');
                    const teacherNotificationsExcludingDuplicates = notifications.filter((notif: any) => 
                      notif.targetUserRole === 'teacher' &&
                      (notif.targetUsernames?.includes(user.username) || notif.targetUsernames?.includes(user.id)) &&
                      (!notif.readBy?.includes(user.username) && !notif.readBy?.includes(user.id)) &&
                      notif.type !== 'task_submission' && // 🔧 EXCLUIR task_submission para evitar duplicación
                      notif.type !== 'task_completed' // 🔧 EXCLUIR task_completed para evitar duplicación
                    ).length;
                    
                    totalCount = pendingTaskSubmissionsCount + unreadStudentCommentsCount + teacherNotificationsExcludingDuplicates;
                  } else {
                    // Para estudiantes: mantener lógica original
                    totalCount = pendingTasksCount + unreadCommentsCount + taskNotificationsCount;
                  }
                  
                  // ✅ LOGS DE DEBUG MEJORADOS
                  console.log(`🔔 [Dashboard] NOTIFICATION PANEL CALCULATION FOR ${user.username} (${user.role}):`);
                  console.log(`  • pendingTaskSubmissionsCount: ${pendingTaskSubmissionsCount}`);
                  console.log(`  • unreadStudentCommentsCount: ${unreadStudentCommentsCount}`);
                  if (user.role === 'teacher') {
                    const teacherNotificationsExcludingDuplicates = JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]')
                      .filter((notif: any) => 
                        notif.targetUserRole === 'teacher' &&
                        (notif.targetUsernames?.includes(user.username) || notif.targetUsernames?.includes(user.id)) &&
                        (!notif.readBy?.includes(user.username) && !notif.readBy?.includes(user.id)) &&
                        notif.type !== 'task_submission' &&
                        notif.type !== 'task_completed'
                      ).length;
                    console.log(`  • taskNotificationsCount (excluding task_submission & task_completed): ${teacherNotificationsExcludingDuplicates} ⭐ (FIXED: no duplicates)`);
                    console.log(`  • taskNotificationsCount (original): ${taskNotificationsCount} ⚠️ (included duplicates)`);
                  } else {
                    console.log(`  • taskNotificationsCount: ${taskNotificationsCount} ⭐ (includes evaluation_completed)`);
                  }
                  console.log(`  • pendingTasksCount: ${pendingTasksCount}`);
                  console.log(`  • unreadCommentsCount: ${unreadCommentsCount}`);
                  console.log(`  🎯 NOTIFICATION PANEL TOTAL COUNT: ${totalCount}`);
                  
                  // ✅ VERIFICACIÓN ADICIONAL
                  if (totalCount === 0 && user.role === 'teacher') {
                    console.warn(`⚠️ [Dashboard] WARNING: Teacher has 0 notifications. This might be incorrect.`);
                  }
                  
                  return totalCount;
                })()
              } />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {featureCards.map((card) => (
          <Card key={card.titleKey} className="flex flex-col text-center shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="items-center relative">
              {card.showBadge && card.titleKey === 'cardTasksTitle' && (
                (() => {
                  let totalTaskCount;
                  
                  if (user?.role === 'student') {
                    // Para estudiantes: mantener lógica original
                    totalTaskCount = pendingTasksCount + unreadCommentsCount + taskNotificationsCount;
                  } else {
                    // Para profesores: evitar duplicación de entregas 
                    // Calcular taskNotificationsCount sin incluir task_submission
                    const notifications = JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]');
                    const teacherNotificationsExcludingSubmissions = notifications.filter((notif: any) => 
                      notif.targetUserRole === 'teacher' &&
                      user && (notif.targetUsernames?.includes(user.username) || notif.targetUsernames?.includes(user.id)) &&
                      user && (!notif.readBy?.includes(user.username) && !notif.readBy?.includes(user.id)) &&
                      notif.type !== 'task_submission' // 🔧 EXCLUIR task_submission para evitar duplicación
                    ).length;
                    
                    totalTaskCount = pendingTaskSubmissionsCount + unreadStudentCommentsCount + teacherNotificationsExcludingSubmissions;
                  }

                  
                  // ✅ LOGS DE DEBUG PARA TARJETA DE TAREAS
                  console.log(`📋 [Dashboard] TASK CARD CALCULATION FOR ${user?.username} (${user?.role}):`);
                  if (user?.role === 'student') {
                    console.log(`  • pendingTasksCount: ${pendingTasksCount}`);
                    console.log(`  • unreadCommentsCount: ${unreadCommentsCount}`);
                    console.log(`  • taskNotificationsCount: ${taskNotificationsCount}`);
                  } else {
                    console.log(`  • pendingTaskSubmissionsCount: ${pendingTaskSubmissionsCount}`);
                    console.log(`  • unreadStudentCommentsCount: ${unreadStudentCommentsCount}`);
                    const teacherNotificationsExcludingSubmissions = JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]')
                      .filter((notif: any) => 
                        notif.targetUserRole === 'teacher' &&
                        user && (notif.targetUsernames?.includes(user.username) || notif.targetUsernames?.includes(user.id)) &&
                        user && (!notif.readBy?.includes(user.username) && !notif.readBy?.includes(user.id)) &&
                        notif.type !== 'task_submission'
                      ).length;
                    console.log(`  • taskNotificationsCount (excluding task_submission): ${teacherNotificationsExcludingSubmissions} ⭐ (FIXED: no duplicates)`);
                    console.log(`  • taskNotificationsCount (original): ${taskNotificationsCount} ⚠️ (included duplicates)`);
                  }
                  console.log(`  🎯 TOTAL TASK CARD COUNT: ${totalTaskCount}`);                  return totalTaskCount > 0 && (
                    user?.role === 'student' ? (
                      <Badge 
                        className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 text-xs px-2 rounded-full"
                        title={translate('pendingTasksAndNotifications', { count: String(totalTaskCount) }) || `${totalTaskCount} tareas/notificaciones pendientes`}
                      >
                        {totalTaskCount > 99 ? '99+' : totalTaskCount}
                      </Badge>
                    ) : (
                      <Badge 
                        className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 text-xs px-2 rounded-full"
                        title={translate('pendingGradingAndNotifications', { count: String(totalTaskCount) }) || `${totalTaskCount} calificaciones/notificaciones pendientes`}
                      >
                        {totalTaskCount > 99 ? '99+' : totalTaskCount}
                      </Badge>
                    )
                  );
                })()
              )}
              <card.icon className={`w-10 h-10 mb-3 ${getIconColorClass(card.colorClass)}`} />
              <CardTitle className="text-lg font-semibold font-headline">{translate(card.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <CardDescription className="text-sm mb-4 flex-grow">
                {translate(card.descKey)}
              </CardDescription>
              <Button
                variant="outline"
                asChild
                className={cn(
                  "home-card-button",
                  getButtonColorClass(card.colorClass),
                  "hover:shadow-lg transition-shadow duration-200"
                )}
              >
                <Link href={card.targetPage}>{translate(card.btnKey)}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        
        {/* Admin specific cards */}
        {user?.role === 'admin' && adminCards.map((card) => (
          <Card 
            key={card.titleKey} 
            className={`flex flex-col text-center shadow-sm hover:shadow-lg transition-shadow duration-300 ${
              card.colorClass === 'teal' 
                ? 'border-teal-200 dark:border-teal-800' 
                : card.colorClass === 'red' 
                  ? 'border-red-200 dark:border-red-800'
                  : 'border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <CardHeader className="items-center relative">
              {card.showBadge && card.titleKey === 'cardPasswordRequestsTitle' && pendingPasswordRequestsCount > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 text-xs px-2 rounded-full"
                  title={translate('pendingPasswordRequests', { count: String(pendingPasswordRequestsCount) })}
                >
                  {pendingPasswordRequestsCount > 99 ? '99+' : pendingPasswordRequestsCount}
                </Badge>
              )}
              <card.icon className={`w-10 h-10 mb-3 ${getIconColorClass(card.colorClass)}`} />
              <CardTitle className="text-lg font-semibold font-headline">{translate(card.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <CardDescription className="text-sm mb-4 flex-grow">
                {translate(card.descKey)}
              </CardDescription>
              <Button
                variant="outline"
                asChild
                className={cn(
                  "home-card-button",
                  getButtonColorClass(card.colorClass),
                  "hover:shadow-lg transition-shadow duration-200"
                )}
              >
                <Link href={card.targetPage}>{translate(card.btnKey)}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Teacher specific cards */}
        {user?.role === 'teacher' && teacherCards.map((card) => (
          <Card 
            key={card.titleKey} 
            className={`flex flex-col text-center shadow-sm hover:shadow-lg transition-shadow duration-300 ${
              card.colorClass === 'rose' 
                ? 'border-rose-200 dark:border-rose-800' 
                : card.colorClass === 'indigo' 
                  ? 'border-indigo-200 dark:border-indigo-800'
                  : card.colorClass === 'emerald'
                    ? 'border-emerald-200 dark:border-emerald-800'
                    : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            <CardHeader className="items-center relative">
              {card.showBadge && card.titleKey === 'cardCommunicationsTitle' && (
                <Badge 
                  className="absolute -top-2 -right-2 bg-rose-500 text-white hover:bg-rose-600 text-xs px-2 rounded-full"
                  title="Nuevas comunicaciones"
                >
                  3
                </Badge>
              )}
              <card.icon className={`w-10 h-10 mb-3 ${getIconColorClass(card.colorClass)}`} />
              <CardTitle className="text-lg font-semibold font-headline">{translate(card.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <CardDescription className="text-sm mb-4 flex-grow">
                {translate(card.descKey)}
              </CardDescription>
              <Button
                variant="outline"
                asChild
                className={cn(
                  "home-card-button",
                  getButtonColorClass(card.colorClass),
                  "hover:shadow-lg transition-shadow duration-200"
                )}
              >
                <Link href={card.targetPage}>{translate(card.btnKey)}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

