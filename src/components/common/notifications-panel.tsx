"use client";

import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Clock, Key, ClipboardCheck, ClipboardList, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { TaskNotificationManager } from '@/lib/notifications';
import Link from 'next/link';

// Interfaces
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
  attachments?: TaskFile[]; // Files attached to this comment/submission
  grade?: {
    id: string;
    percentage: number;
    feedback?: string;
    gradedBy: string;
    gradedByName: string;
    gradedAt: string;
  };
}

interface TaskFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  subject: string;
  course: string;
  assignedBy: string;
  assignedByName: string;
  taskType: 'assignment' | 'evaluation'; // Tipo de tarea: normal o evaluación
}

interface PasswordRequest {
  id: string;
  username: string;
  email: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface NotificationsPanelProps {
  count: number;
}

export default function NotificationsPanel({ count: propCount }: NotificationsPanelProps) {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const [open, setOpen] = useState(false);
  
  const [unreadComments, setUnreadComments] = useState<(TaskComment & {task?: Task})[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [passwordRequests, setPasswordRequests] = useState<PasswordRequest[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<(TaskComment & {task?: Task})[]>([]);
  const [unreadStudentComments, setUnreadStudentComments] = useState<(TaskComment & {task?: Task})[]>([]);
  const [classTasks, setClassTasks] = useState<Task[]>([]);
  const [taskNotifications, setTaskNotifications] = useState<any[]>([]);
  const [pendingGrading, setPendingGrading] = useState<any[]>([]);
  const [count, setCount] = useState(propCount);
  const [isMarking, setIsMarking] = useState(false);

  // ✅ LOG DE DEBUG: Verificar qué count está recibiendo el componente
  console.log(`🔔 [NotificationsPanel] Received count: ${propCount} for user: ${user?.username} (${user?.role})`);
  console.log(`🔔 [NotificationsPanel] Internal count state: ${count}`);

  // Función para dividir texto en dos líneas para badges
  const splitTextForBadge = (text: string, maxLength: number = 8): string[] => {
    if (text.length <= maxLength) return [text];
    
    const words = text.split(' ');
    if (words.length === 1) {
      // Si es una sola palabra muy larga, dividirla por la mitad
      const mid = Math.ceil(text.length / 2);
      return [text.substring(0, mid), text.substring(mid)];
    }
    
    let firstLine = '';
    let secondLine = '';
    let switchToSecond = false;
    
    for (const word of words) {
      if (!switchToSecond && (firstLine + word).length <= maxLength) {
        firstLine += (firstLine ? ' ' : '') + word;
      } else {
        switchToSecond = true;
        secondLine += (secondLine ? ' ' : '') + word;
      }
    }
    
    return firstLine && secondLine ? [firstLine, secondLine] : [text];
  };

  // Función para obtener abreviatura del curso
  const getCourseAbbreviation = (subject: string): string => {
    const abbreviations: { [key: string]: string } = {
      'Matemáticas': 'MAT',
      'Lenguaje': 'LEN', 
      'Historia': 'HIS',
      'Ciencias Naturales': 'CNT',
      'Inglés': 'ING',
      'Educación Física': 'EDF',
      'Artes': 'ART',
      'Música': 'MUS',
      'Tecnología': 'TEC',
      'Filosofía': 'FIL',
      'Química': 'QUI',
      'Física': 'FIS',
      'Biología': 'BIO'
    };
    
    return abbreviations[subject] || subject.substring(0, 3).toUpperCase();
  };

  // 🔧 NUEVA: Función para validar si una tarea existe
  const validateTaskExists = (taskId: string): boolean => {
    try {
      const storedTasks = localStorage.getItem('smart-student-tasks');
      if (!storedTasks) return false;
      
      const tasks: Task[] = JSON.parse(storedTasks);
      const taskExists = tasks.some(task => task.id === taskId);
      
      if (!taskExists) {
        console.warn(`[NotificationsPanel] Task ${taskId} not found in localStorage`);
      }
      
      return taskExists;
    } catch (error) {
      console.error('Error validating task existence:', error);
      return false;
    }
  };

  // 🎨 NUEVA: Función para obtener el color del enlace según el tipo
  const getLinkColorClass = (linkType: 'evaluation' | 'task' | 'comment' | 'grade'): string => {
    switch (linkType) {
      case 'evaluation':
        return 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300';
      case 'task':
        return 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300';
      case 'comment':
        return 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300';
      case 'grade':
        return 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300';
      default:
        return 'text-primary hover:underline';
    }
  };

  // 🔧 NUEVA: Función para crear enlaces seguros a tareas
  const createSafeTaskLink = (taskId: string, additionalParams: string = '', linkText: string = 'Ver tarea', linkType: 'evaluation' | 'task' = 'task'): JSX.Element => {
    const taskExists = validateTaskExists(taskId);
    
    if (!taskExists) {
      return (
        <button 
          className="inline-block mt-2 text-xs text-gray-400 cursor-not-allowed"
          disabled
          title="Esta tarea ya no existe"
        >
          {linkText} (No disponible)
        </button>
      );
    }
    
    const href = `/dashboard/tareas?taskId=${taskId}${additionalParams}&highlight=true`;
    const colorClass = getLinkColorClass(linkType);
    
    return (
      <Link 
        href={href}
        className={`inline-block mt-2 text-xs ${colorClass} hover:underline`}
      >
        {linkText}
      </Link>
    );
  };

  // 🔧 NUEVA: Función para crear enlaces seguros a comentarios
  const createSafeCommentLink = (taskId: string, commentId: string, linkText: string = 'Ver comentario'): JSX.Element => {
    const taskExists = validateTaskExists(taskId);
    
    if (!taskExists) {
      return (
        <button 
          className="inline-block mt-2 text-xs text-gray-400 cursor-not-allowed"
          disabled
          title="La tarea asociada a este comentario ya no existe"
        >
          {linkText} (No disponible)
        </button>
      );
    }
    
    const href = `/dashboard/tareas?taskId=${taskId}&commentId=${commentId}&highlight=true`;
    const colorClass = getLinkColorClass('comment');
    
    // 🔥 NUEVA MEJORA: Función para manejar el clic en "Ver Comentario"
    const handleCommentClick = (e: React.MouseEvent) => {
      console.log('🔔 [NotificationsPanel] Comment link clicked:', { taskId, commentId });
      
      // Marcar el comentario específico como leído antes de navegar
      if (user?.role === 'student') {
        const storedComments = localStorage.getItem('smart-student-task-comments');
        if (storedComments) {
          const comments = JSON.parse(storedComments);
          let hasUpdates = false;
          
          const updatedComments = comments.map((comment: any) => {
            if (comment.id === commentId && !comment.readBy?.includes(user.username)) {
              hasUpdates = true;
              console.log(`🔔 [NotificationsPanel] Marking comment as read: ${comment.comment}`);
              return {
                ...comment,
                isNew: false,
                readBy: [...(comment.readBy || []), user.username]
              };
            }
            return comment;
          });
          
          if (hasUpdates) {
            localStorage.setItem('smart-student-task-comments', JSON.stringify(updatedComments));
            
            // ✅ NUEVA MEJORA: Disparar eventos específicos para actualizar dashboard (IGUAL QUE PROFESOR)
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('updateDashboardCounts', {
                detail: { userRole: user.role, action: 'single_comment_read' }
              }));
            }, 100);
            
            // Disparar evento para actualizar el dashboard
            window.dispatchEvent(new CustomEvent('studentCommentsUpdated', { 
              detail: { 
                username: user.username,
                taskId: taskId,
                commentId: commentId,
                action: 'single_comment_viewed'
              } 
            }));
            
            // Disparar eventos adicionales
            document.dispatchEvent(new Event('commentsUpdated'));
            
            console.log('🔔 [NotificationsPanel] Comment marked as read and dashboard events dispatched');
          }
        }
      }
    };
    
    return (
      <Link 
        href={href}
        className={`inline-block mt-2 text-xs ${colorClass} hover:underline`}
        onClick={handleCommentClick}
      >
        {linkText}
      </Link>
    );
  };

  // Use the count provided by the parent component instead of calculating our own
  useEffect(() => {
    setCount(propCount);
  }, [propCount]);

  // ✅ NUEVO: Listener para sincronización del conteo
  useEffect(() => {
    const handleCountUpdate = (event: CustomEvent) => {
      if (event.detail?.type === 'teacher_counters_updated') {
        console.log(`[NotificationsPanel] Count update event received:`, event.detail);
        // El conteo se actualiza desde el componente padre (dashboard)
        // Solo necesitamos recargar los datos para mantener sincronización
        if (user?.role === 'teacher') {
          setTimeout(() => {
            loadStudentSubmissions();
            loadTaskNotifications();
            loadPendingGrading();
          }, 100);
        }
      }
    };

    // ✅ NUEVO: Listener para actualizaciones generales de notificaciones
    const handleGeneralNotificationUpdate = (event: CustomEvent) => {
      console.log(`[NotificationsPanel] General notification update:`, event.detail);
      
      // Recargar datos según el rol del usuario
      if (user?.role === 'teacher') {
        loadStudentSubmissions();
        loadTaskNotifications();
        loadPendingGrading();
        
        // Disparar evento para actualizar el conteo del dashboard
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('updateDashboardCounts', {
            detail: { userRole: user.role }
          }));
        }, 200);
      } else if (user?.role === 'student') {
        loadUnreadComments();
        loadPendingTasks();
        loadTaskNotifications();
        
        // Disparar evento para actualizar el conteo del dashboard
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('updateDashboardCounts', {
            detail: { userRole: user.role }
          }));
        }, 200);
      }
    };

    window.addEventListener('notificationsUpdated', handleCountUpdate as EventListener);
    window.addEventListener('commentsUpdated', handleGeneralNotificationUpdate as EventListener);
    window.addEventListener('taskNotificationsUpdated', handleGeneralNotificationUpdate as EventListener);
    
    return () => {
      window.removeEventListener('notificationsUpdated', handleCountUpdate as EventListener);
      window.removeEventListener('commentsUpdated', handleGeneralNotificationUpdate as EventListener);
      window.removeEventListener('taskNotificationsUpdated', handleGeneralNotificationUpdate as EventListener);
    };
  }, [user]);

  useEffect(() => {
    // Load data based on user role
    if (user) {
      console.log(`[NotificationsPanel] Loading data for user: ${user.username}, role: ${user.role}`);
      
      // 🔧 MIGRACIÓN: Actualizar notificaciones que muestran "Sistema"
      TaskNotificationManager.migrateSystemNotifications();
      
      // 🧹 NUEVO: Ejecutar limpieza automática al cargar
      TaskNotificationManager.cleanupFinalizedTaskNotifications();
      
      // Clear all states first to avoid residual data when switching users/roles
      setUnreadComments([]);
      setPendingTasks([]);
      setPasswordRequests([]);
      setStudentSubmissions([]);
      setUnreadStudentComments([]);
      setClassTasks([]);
      setTaskNotifications([]);
      setPendingGrading([]);
      
      if (user.role === 'admin') {
        loadPasswordRequests();
      } else if (user.role === 'student') {
        loadUnreadComments();
        loadPendingTasks();
        loadTaskNotifications();
      } else if (user.role === 'teacher') {
        console.log(`[NotificationsPanel] Loading teacher-specific data for ${user.username}`);
        loadStudentSubmissions();
        loadTaskNotifications();
        loadPendingGrading();
        // Clear pending tasks for teachers as they don't have pending tasks, only submissions to review
        setPendingTasks([]);
      }
    }
    
    // Listener para sincronización automática de notificaciones
    const handleNotificationSync = () => {
      if (user) {
        console.log('[NotificationsPanel] Notification sync event detected, reloading data...');
        // Recargar notificaciones
        if (user.role === 'teacher') {
          loadStudentSubmissions();
          loadTaskNotifications();
          loadPendingGrading();
        } else if (user.role === 'student') {
          loadUnreadComments();
          loadPendingTasks();
          loadTaskNotifications();
        }
        
        // Recargar datos después de sincronización
        setTimeout(() => {
          if (user.role === 'student') {
            loadUnreadComments();
            loadPendingTasks();
            loadTaskNotifications();
          } else if (user.role === 'teacher') {
            loadStudentSubmissions();
            loadTaskNotifications();
            loadPendingGrading();
          }
        }, 1000); // Esperar 1 segundo para que la sincronización complete
      }
    };

    // 🔥 NUEVO: Listener para actualizaciones de notificaciones específicas
    const handleNotificationsUpdated = (event: CustomEvent) => {
      console.log(`[NotificationsPanel] Notificaciones actualizadas:`, event.detail);
      // Recargar notificaciones cuando se actualicen
      handleNotificationSync();
    };
    
    window.addEventListener('notificationSync', handleNotificationSync);
    window.addEventListener('notificationSyncCompleted', handleNotificationSync);
    window.addEventListener('notificationsUpdated', handleNotificationsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('notificationSync', handleNotificationSync);
      window.removeEventListener('notificationSyncCompleted', handleNotificationSync);
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdated as EventListener);
    };
  }, [user]);

  useEffect(() => {
    // Listener for storage events to update in real-time
    const handleStorageChange = (e: StorageEvent) => {
      // 🧹 NUEVO: Ejecutar limpieza automática en cambios de storage para profesores
      if (user?.role === 'teacher' && (
        e.key === 'smart-student-task-notifications' ||
        e.key === 'smart-student-tasks' ||
        e.key === 'smart-student-task-comments'
      )) {
        console.log('🧹 [STORAGE_CHANGE] Ejecutando limpieza automática...');
        TaskNotificationManager.cleanupFinalizedTaskNotifications();
      }
      
      if (e.key === 'password-reset-requests') {
        if (user?.role === 'admin') {
          loadPasswordRequests();
        }
      }
      if (e.key === 'smart-student-task-comments') {
        if (user?.role === 'student') {
          loadUnreadComments();
        } else if (user?.role === 'teacher') {
          loadStudentSubmissions();
        }
      }
      if (e.key === 'smart-student-tasks') {
        if (user?.role === 'student') {
          loadPendingTasks();
        } else if (user?.role === 'teacher') {
          loadStudentSubmissions();
        }
      }
    };
    
    // Setup listeners for both the storage event and custom events
    window.addEventListener('storage', handleStorageChange);

    // Create a named function for the event listener so it can be properly removed
    const handleCommentsUpdated = () => {
      if (user?.role === 'student') {
        loadUnreadComments();
      } else if (user?.role === 'teacher') {
        loadStudentSubmissions();
      }
    };

    // Custom event listener for when a comment is marked as read by a component
    document.addEventListener('commentsUpdated', handleCommentsUpdated);

    // Custom event listener for task notifications
    const handleTaskNotificationsUpdated = () => {
      // 🔧 MEJORA: Ejecutar migración antes de recargar
      TaskNotificationManager.migrateSystemNotifications();
      
      // 🧹 NUEVO: Ejecutar limpieza automática
      TaskNotificationManager.cleanupFinalizedTaskNotifications();
      
      loadTaskNotifications();
    };
    window.addEventListener('taskNotificationsUpdated', handleTaskNotificationsUpdated);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('commentsUpdated', handleCommentsUpdated);
      window.removeEventListener('taskNotificationsUpdated', handleTaskNotificationsUpdated);
    };
  }, [user, open]); // Reload data when the panel is opened or user changes

  const loadUnreadComments = () => {
    try {
      // Load comments
      const storedComments = localStorage.getItem('smart-student-task-comments');
      const storedTasks = localStorage.getItem('smart-student-tasks');
      
      if (storedComments && storedTasks) {
        const comments: TaskComment[] = JSON.parse(storedComments);
        const tasks: Task[] = JSON.parse(storedTasks);
        
        console.log(`[loadUnreadComments] Processing ${comments.length} comments for student ${user?.username}`);
        
        // Filter comments that are unread by the current user and not their own
        // Exclude submissions from other students (students should not see other students' submissions)
        const unread = comments.filter(comment => 
          comment.studentUsername !== user?.username && // Not own comments/submissions
          (!comment.readBy?.includes(user?.username || '')) && // Not read by current user
          !comment.isSubmission // Exclude submissions (deliveries) from other students
        ).map(comment => {
          // Find associated task for each comment for display
          const task = tasks.find(t => t.id === comment.taskId);
          return { ...comment, task };
        });
        
        console.log(`[loadUnreadComments] Found ${unread.length} unread comments for student ${user?.username}`);
        setUnreadComments(unread);
        
        // Update unread comments state
        setUnreadComments(unread);
      }
    } catch (error) {
      console.error('Error loading unread comments:', error);
    }
  };

  const loadPendingTasks = () => {
    try {
      const storedTasks = localStorage.getItem('smart-student-tasks');
      const storedComments = localStorage.getItem('smart-student-task-comments');
      
      if (storedTasks) {
        const tasks: Task[] = JSON.parse(storedTasks);
        const comments: TaskComment[] = storedComments ? JSON.parse(storedComments) : [];
        
        // Filter tasks assigned to the student with due dates approaching
        const now = new Date();
        const studentTasks = tasks.filter(task => {
          // Check if task is assigned to this student
          const isAssigned = (
            task.course && user?.activeCourses?.includes(task.course)
          );
          
          const dueDate = new Date(task.dueDate);
          const isApproaching = dueDate > now; // Only include not overdue tasks
          
          // 🔥 NUEVO: Para evaluaciones, verificar si ya fueron completadas
          if (task.taskType === 'evaluation') {
            const isCompleted = TaskNotificationManager.isEvaluationCompletedByStudent(
              task.id, 
              user?.username || ''
            );
            if (isCompleted) {
              console.log(`[loadPendingTasks] ✅ Filtering out completed evaluation: ${task.title} for ${user?.username}`);
              return false; // No mostrar evaluaciones completadas
            }
          }
          
          // Para tareas regulares, verificar si ya fueron entregadas
          const hasSubmitted = comments.some(comment => 
            comment.taskId === task.id && 
            comment.studentUsername === user?.username && 
            comment.isSubmission
          );
          
          return isAssigned && isApproaching && !hasSubmitted;
        });
        
        // Sort by due date (closest first)
        studentTasks.sort((a, b) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
        
        setPendingTasks(studentTasks);
        console.log(`[loadPendingTasks] Loaded ${studentTasks.length} pending tasks for ${user?.username}`);
      }
    } catch (error) {
      console.error('Error loading pending tasks:', error);
    }
  };

  const loadPasswordRequests = () => {
    try {
      const storedRequests = localStorage.getItem('password-reset-requests');
      
      if (storedRequests) {
        const requests: PasswordRequest[] = JSON.parse(storedRequests);
        
        // Filter pending requests only
        const pendingRequests = requests.filter(req => req.status === 'pending');
        
        // Sort by creation date (newest first)
        pendingRequests.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setPasswordRequests(pendingRequests);
        
        // Update password requests state
        setPasswordRequests(pendingRequests);
      }
    } catch (error) {
      console.error('Error loading password requests:', error);
    }
  };

  // Cargar entregas de estudiantes para profesores
  const loadStudentSubmissions = () => {
    try {
      // Limpiar estado inicial para evitar datos residuales
      setUnreadStudentComments([]);
      setStudentSubmissions([]);
      
      // Cargar comentarios (que incluyen entregas) y tareas
      const storedComments = localStorage.getItem('smart-student-task-comments');
      const storedTasks = localStorage.getItem('smart-student-tasks');
      
      if (storedComments && storedTasks && user?.role === 'teacher') {
        const comments: TaskComment[] = JSON.parse(storedComments);
        const tasks: Task[] = JSON.parse(storedTasks);
        
        console.log(`[loadStudentSubmissions] Processing ${comments.length} comments for teacher ${user.username}`);
        console.log(`[loadStudentSubmissions] All tasks in system:`, tasks.map(t => ({ id: t.id, title: t.title, assignedBy: t.assignedBy })));
        console.log(`[loadStudentSubmissions] Felipe comments:`, comments.filter(c => c.studentUsername === 'felipe').map(c => ({ id: c.id, taskId: c.taskId, isSubmission: c.isSubmission, comment: c.comment?.substring(0, 50) })));
        
        // Filtrar tareas asignadas por este profesor
        const teacherTasks = tasks.filter(task => task.assignedBy === user.username);
        setClassTasks(teacherTasks);
        
        console.log(`[loadStudentSubmissions] Teacher ${user.username} has ${teacherTasks.length} assigned tasks`);
        console.log(`[loadStudentSubmissions] Teacher tasks:`, teacherTasks.map(t => ({ id: t.id, title: t.title, assignedBy: t.assignedBy })));
        
        // Obtener IDs de tareas de este profesor
        const teacherTaskIds = teacherTasks.map(task => task.id);
        console.log(`[loadStudentSubmissions] Teacher task IDs:`, teacherTaskIds);
        
        // 🔧 SOLUCIÓN TEMPORAL: También incluir tareas donde el profesor podría tener permisos
        // Si no hay tareas asignadas por este profesor, incluir todas las tareas del sistema
        const allTaskIds = teacherTaskIds.length > 0 ? teacherTaskIds : tasks.map(task => task.id);
        console.log(`[loadStudentSubmissions] Using task IDs (${teacherTaskIds.length > 0 ? 'teacher-specific' : 'all-tasks'}):`, allTaskIds);
        
        // Filtrar entregas de los estudiantes para las tareas de este profesor
        // que no hayan sido revisadas (no tienen calificación) y que no sean propias
        const submissions = comments
          .filter(comment => 
            comment.isSubmission && 
            allTaskIds.includes(comment.taskId) &&
            comment.studentUsername !== user.username && // Excluir entregas propias del profesor
            !comment.grade // Solo entregas sin calificar
          )
          .map(submission => {
            // Encontrar la tarea asociada para mostrar más información
            const task = tasks.find(t => t.id === submission.taskId);
            return { ...submission, task };
          });
        
        console.log(`[loadStudentSubmissions] Found ${submissions.length} ungraded submissions for teacher ${user.username}`);
        setStudentSubmissions(submissions);

        // Cargar comentarios de estudiantes (NO entregas) para tareas de este profesor
        // que no hayan sido leídos por el profesor
        // 🔄 CORRECCIÓN: Mejora para detectar comentarios de estudiantes aunque estén mal marcados
        const studentComments = comments
          .filter(comment => {
            // Verificar si es un comentario para este profesor
            const esParaProfesor = allTaskIds.includes(comment.taskId);
            
            // Verificar si es del propio profesor
            const esDelProfesor = comment.studentUsername === user.username;
            
            // Verificar si ya fue leído
            const fueLeido = comment.readBy?.includes(user.username);
            
            // ✅ MEJORA: No incluir comentarios que ya están en las notificaciones del sistema
            // Verificamos si hay una notificación de comentario para este usuario y tarea
            const yaEstaEnNotificaciones = TaskNotificationManager.getNotifications().some(notif => 
              notif.type === 'teacher_comment' && 
              notif.taskId === comment.taskId &&
              notif.fromUsername === comment.studentUsername &&
              !notif.readBy.includes(user.username) &&
              // Verificar que el timestamp sea similar (dentro de 1 minuto)
              Math.abs(new Date(notif.timestamp).getTime() - new Date(comment.timestamp).getTime()) < 60000
            );
            
            console.log(`[loadStudentSubmissions] Analyzing comment from ${comment.studentUsername}:`, {
              taskId: comment.taskId,
              isSubmission: comment.isSubmission,
              belongsToTeacher: esParaProfesor,
              isFromTeacher: esDelProfesor,
              wasRead: fueLeido,
              alreadyInNotifications: yaEstaEnNotificaciones,
              hasAttachments: comment.attachments && comment.attachments.length > 0,
              commentLength: comment.comment?.length || 0,
              text: comment.comment?.substring(0, 50) + '...'
            });
            
            // ✅ CORRECCIÓN: Solo incluir comentarios reales (NO entregas) en la sección "Comentarios No Leídos"
            // Las entregas deben aparecer solo en la sección de entregas pendientes
            const esComentario = !comment.isSubmission;
            
            // ✅ NUEVA CONDICIÓN: No incluir si ya está en notificaciones para evitar duplicados
            const shouldInclude = esComentario && esParaProfesor && !esDelProfesor && !fueLeido && !yaEstaEnNotificaciones;
            
            if (shouldInclude) {
              console.log(`✅ [loadStudentSubmissions] Including comment from ${comment.studentUsername} in notifications`);
            } else {
              console.log(`❌ [loadStudentSubmissions] Excluding comment from ${comment.studentUsername}: esComentario=${esComentario}, esParaProfesor=${esParaProfesor}, esDelProfesor=${esDelProfesor}, fueLeido=${fueLeido}, yaEstaEnNotificaciones=${yaEstaEnNotificaciones}`);
            }
            
            // Incluir comentarios que no son del profesor, no han sido leídos, son para tareas de este profesor, y no están duplicados en notificaciones
            return shouldInclude;
          })
          .map(comment => {
            // Encontrar la tarea asociada para mostrar más información
            const task = tasks.find(t => t.id === comment.taskId);
            return { ...comment, task };
          });
        
        console.log(`[loadStudentSubmissions] Found ${studentComments.length} student comments for teacher ${user.username}`);
        setUnreadStudentComments(studentComments);
      } else {
        // Asegurar que los estados estén vacíos cuando no hay datos
        setUnreadStudentComments([]);
        setStudentSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading student submissions:', error);
    }
  };

  // Cargar notificaciones pendientes de calificación para profesores
  const loadPendingGrading = () => {
    if (!user || user.role !== 'teacher') return;
    try {
      const notifications = TaskNotificationManager.getUnreadNotificationsForUser(
        user.username,
        'teacher'
      );
      
      // Filtrar solo notificaciones de pending_grading que NO sean del sistema
      // Las notificaciones del sistema se manejan en taskNotifications
      const pending = notifications.filter(n => 
        n.type === 'pending_grading' && n.fromUsername !== 'system'
      );
      
      console.log(`[NotificationsPanel] loadPendingGrading: Found ${pending.length} pending grading notifications (excluding system)`);
      setPendingGrading(pending);
    } catch (error) {
      console.error('Error loading pending grading:', error);
      setPendingGrading([]);
    }
  };

  const loadTaskNotifications = () => {
    if (!user) return;
    
    try {
      console.log(`[NotificationsPanel] Loading task notifications for user: ${user.username} (role: ${user.role})`);
      
      // 🧹 NUEVO: Ejecutar limpieza automática antes de cargar notificaciones
      TaskNotificationManager.cleanupFinalizedTaskNotifications();
      
      const notifications = TaskNotificationManager.getUnreadNotificationsForUser(
        user.username, 
        user.role as 'student' | 'teacher'
      );
      
      console.log(`[NotificationsPanel] Raw notifications count: ${notifications.length}`);
      notifications.forEach((n, index) => {
        console.log(`[NotificationsPanel] ${index + 1}. Type: ${n.type}, TaskId: ${n.taskId}, From: ${n.fromUsername}, Target: ${n.targetUsernames.join(',')}, ReadBy: ${n.readBy.join(',')}`);
      });
      
      // ✅ MEJORA: Filtrar mejor las notificaciones de evaluaciones completadas
      if (user.role === 'student') {
        // Para estudiantes, filtrar evaluaciones completadas
        const filteredNotifications = notifications.filter(n => {
          if (n.type === 'new_task' && n.taskType === 'evaluation') {
            const isCompleted = TaskNotificationManager.isEvaluationCompletedByStudent(
              n.taskId, user.username
            );
            
            if (isCompleted) {
              console.log(`[NotificationsPanel] ✅ Filtering out completed evaluation: ${n.taskTitle} for ${user.username}`);
              return false; // No mostrar evaluaciones completadas
            }
          }
          return true;
        });
        
        setTaskNotifications(filteredNotifications);
        console.log(`[NotificationsPanel] Loaded ${filteredNotifications.length} task notifications for ${user.username}`);
      } else if (user.role === 'teacher') {
        // Para profesores, separar notificaciones de evaluaciones y tareas
        setTaskNotifications(notifications);
        
        console.log(`[NotificationsPanel] Teacher ${user.username} - all notifications:`, notifications.length);
        
        // Debug para tareas pendientes del sistema
        const systemPendingTasks = notifications.filter(n => 
          n.type === 'pending_grading' && 
          n.fromUsername === 'system' &&
          n.taskType === 'assignment'
        );
        console.log(`[NotificationsPanel] ${user.username} system pending tasks:`, systemPendingTasks.length);
        
        // Debug para evaluaciones pendientes del sistema
        const systemPendingEvaluations = notifications.filter(n => 
          n.type === 'pending_grading' && 
          n.fromUsername === 'system' &&
          n.taskType === 'evaluation'
        );
        console.log(`[NotificationsPanel] ${user.username} system pending evaluations:`, systemPendingEvaluations.length);
        
        // Debug para evaluaciones pendientes
        const evaluationNotifications = notifications.filter(n => 
          (n.type === 'pending_grading' || n.type === 'task_completed') && 
          n.taskType === 'evaluation'
        );
        
        console.log(`[NotificationsPanel] ${user.username} evaluation notifications:`, evaluationNotifications.length);
        
        // Debug para tareas pendientes
        const taskNotifications = notifications.filter(n => 
          (n.type === 'pending_grading' || n.type === 'task_completed') && 
          n.taskType === 'assignment'
        );
        
        console.log(`[NotificationsPanel] ${user.username} task notifications:`, taskNotifications.length);
      }
    } catch (error) {
      console.error('Error loading task notifications:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Get user's preferred language or default to browser language
      const userLang = document.documentElement.lang || 'es';
      return new Intl.DateTimeFormat(userLang === 'es' ? 'es-ES' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return translate('today');
      } else if (diffDays === 1) {
        return translate('yesterday');
      } else {
        return translate('daysAgo', { days: diffDays.toString() });
      }
    } catch (e) {
      return '';
    }
  };

  const handleReadAll = () => {
    setIsMarking(true);
    
    if (user?.role === 'student') {
      try {
        let hasUpdates = false;
        
        // Mark all comments as read
        if (unreadComments.length > 0) {
          const storedComments = localStorage.getItem('smart-student-task-comments');
          if (storedComments) {
            const comments: TaskComment[] = JSON.parse(storedComments);
            const updatedComments = comments.map(comment => {
              // Solo marcar como leído si no es del propio usuario y no está ya leído
              if (!comment.readBy?.includes(user.username) && comment.studentUsername !== user.username) {
                hasUpdates = true;
                return {
                  ...comment,
                  isNew: false,
                  readBy: [...(comment.readBy || []), user.username]
                };
              }
              return comment;
            });
            
            localStorage.setItem('smart-student-task-comments', JSON.stringify(updatedComments));
          }
        }
        
        // Mark task notifications as read (except new_task notifications which should only be marked as read on submission)
        if (taskNotifications.length > 0) {
          const notifications = TaskNotificationManager.getNotifications();
          const updatedNotifications = notifications.map(notification => {
            if (
              notification.targetUsernames.includes(user.username) &&
              !notification.readBy.includes(user.username) &&
              // 🔥 MEJORA: Solo marcar como leídos los comentarios, no las tareas/evaluaciones pendientes
              notification.type !== 'new_task' && 
              notification.type !== 'pending_grading'
            ) {
              hasUpdates = true;
              return {
                ...notification,
                readBy: [...notification.readBy, user.username],
                read: notification.readBy.length + 1 >= notification.targetUsernames.length
              };
            }
            return notification;
          });
          
          TaskNotificationManager.saveNotifications(updatedNotifications);
        }
        
        if (hasUpdates) {
          // Update internal state - only clear comments and comment notifications, NOT pending tasks
          setUnreadComments([]);
          // ✅ MEJORA: Filtrar para mantener tareas y evaluaciones pendientes
          const filteredNotifications = taskNotifications.filter(notification => 
            notification.type === 'new_task' || notification.type === 'pending_grading'
          );
          setTaskNotifications(filteredNotifications);
          // Note: We don't clear pendingTasks as these should remain until completed/submitted
          
          // Restablecer el estado del botón después de un breve retraso
          setTimeout(() => setIsMarking(false), 500);
          
          // ✅ NUEVA MEJORA: Disparar eventos específicos para actualizar contadores del dashboard
          console.log('🔄 [MARK_ALL_READ] Disparando eventos para actualizar contadores del dashboard...');
          
          // Restablecer el estado del botón después de un breve retraso
          setTimeout(() => setIsMarking(false), 500);
          
          // ✅ NUEVA MEJORA: Disparar evento específico para actualizar contadores del dashboard (IGUAL QUE PROFESOR)
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('updateDashboardCounts', {
              detail: { userRole: user.role, action: 'mark_all_read' }
            }));
          }, 100);
          
          // Disparar evento específico para estudiantes
          window.dispatchEvent(new CustomEvent('studentCommentsUpdated', { 
            detail: { 
              username: user.username,
              action: 'mark_all_read'
            } 
          }));
          
          // Trigger events for other components to update
          document.dispatchEvent(new Event('commentsUpdated'));
          window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
          window.dispatchEvent(new Event('storage'));
        }
        
        // Close panel
        setOpen(false);
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    } else if (user?.role === 'teacher') {
      try {
        let hasUpdates = false;
        
        // Mark all student comments as read for teacher
        if (unreadStudentComments.length > 0) {
          const storedComments = localStorage.getItem('smart-student-task-comments');
          if (storedComments) {
            const comments: TaskComment[] = JSON.parse(storedComments);
            const updatedComments = comments.map(comment => {
              // Solo marcar como leído si no es del propio profesor y no está ya leído
              if (!comment.readBy?.includes(user.username) && comment.studentUsername !== user.username) {
                hasUpdates = true;
                return {
                  ...comment,
                  isNew: false,
                  readBy: [...(comment.readBy || []), user.username]
                };
              }
              return comment;
            });
            
            localStorage.setItem('smart-student-task-comments', JSON.stringify(updatedComments));
          }
        }
        
        // Mark only COMMENT notifications as read for teacher (NOT task assignments or pending grading)
        if (taskNotifications.length > 0) {
          const notifications = TaskNotificationManager.getNotifications();
          const updatedNotifications = notifications.map(notification => {
            if (
              notification.targetUsernames.includes(user.username) &&
              !notification.readBy.includes(user.username) &&
              // ✅ MEJORA: Solo marcar como leídos los comentarios, no las tareas/evaluaciones pendientes
              notification.type === 'teacher_comment'
            ) {
              hasUpdates = true;
              return {
                ...notification,
                readBy: [...notification.readBy, user.username],
                read: notification.readBy.length + 1 >= notification.targetUsernames.length
              };
            }
            return notification;
          });
          
          TaskNotificationManager.saveNotifications(updatedNotifications);
        }
        
        if (hasUpdates) {
          // Update internal state - only clear comments, NOT pending tasks/grading notifications
          setUnreadStudentComments([]);
          
          // ✅ MEJORA: Filtrar para mantener tareas y evaluaciones pendientes
          const filteredTaskNotifications = taskNotifications.filter(notification => 
            notification.type === 'pending_grading' || 
            notification.type === 'new_task' ||
            notification.type === 'task_submission' ||
            notification.type === 'task_completed'
          );
          setTaskNotifications(filteredTaskNotifications);
          
          // 🧹 NUEVO: Ejecutar limpieza automática después de marcar como leído
          console.log('🧹 [MARK_ALL_READ] Ejecutando limpieza automática...');
          TaskNotificationManager.cleanupFinalizedTaskNotifications();
          
          // Restablecer el estado del botón después de un breve retraso
          setTimeout(() => setIsMarking(false), 500);
          
          // Note: studentSubmissions are NOT cleared here because they represent
          // actual student work that needs to be reviewed and graded by the teacher
          
          // ✅ NUEVA MEJORA: Disparar evento específico para actualizar contadores del dashboard
          console.log('🔄 [MARK_ALL_READ] Disparando evento para actualizar contadores del dashboard...');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('updateDashboardCounts', {
              detail: { userRole: user.role, action: 'mark_all_read' }
            }));
          }, 100);
          
          // Trigger events for other components to update
          document.dispatchEvent(new Event('commentsUpdated'));
          window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
          window.dispatchEvent(new Event('storage'));
        }
        
        // Close panel
        setOpen(false);
      } catch (error) {
        console.error('Error marking all notifications as read for teacher:', error);
      }
    }
  };

  // Retorna el componente del panel de notificaciones
  return (
    <div className="relative">
      <Popover open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen);
        // 🧹 NUEVO: Ejecutar limpieza automática cada vez que se abre el panel
        if (newOpen && user?.role === 'teacher') {
          console.log('🧹 [PANEL_OPEN] Ejecutando limpieza automática de notificaciones...');
          TaskNotificationManager.cleanupFinalizedTaskNotifications();
          // Pequeño delay para que la limpieza termine antes de recargar
          setTimeout(() => {
            loadTaskNotifications();
            loadStudentSubmissions();
            loadPendingGrading();
            loadUnreadComments();
          }, 100);
        }
      }}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className={`relative transition-all duration-200 ${
              open 
                ? 'bg-primary/15 text-primary hover:bg-primary/20 ring-2 ring-primary/30 shadow-md' 
                : 'hover:bg-secondary/80 hover:text-foreground'
            }`}
            title={translate('notifications')}
          >
            <Bell className={`h-5 w-5 transition-all duration-200 ${
              open ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'
            }`} />
            {count > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 bg-red-500 text-white hover:bg-red-600 text-xs px-[0.4rem] py-[0.1rem] rounded-full"
                title={translate('unreadNotificationsCount', { count: String(count) })}
              >
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 md:w-96 p-0 max-h-[80vh] overflow-hidden" align="end">
          <Card className="border-0 h-full flex flex-col max-h-[80vh]">
            <CardHeader className="pb-2 pt-4 px-4 flex-shrink-0">
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                <span>{translate('notifications')}</span>
                {((user?.role === 'student' && (unreadComments.length > 0 || taskNotifications.length > 0)) ||
                  (user?.role === 'teacher' && (unreadStudentComments.length > 0 || pendingGrading.length > 0 || taskNotifications.length > 0))) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleReadAll}
                    disabled={isMarking}
                    className={`text-xs transition-colors duration-200 ${
                      isMarking 
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' 
                        : 'text-muted-foreground hover:bg-gray-200 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {translate('markAllAsRead')}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            
            <ScrollArea className="flex-1 h-full">
              <div className="max-h-[60vh] overflow-y-auto px-1">
                <CardContent className="p-0 space-y-0">
                  {/* Admin: Password Reset Requests */}
              {user?.role === 'admin' && (
                <div className="divide-y divide-border">
                  {passwordRequests.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground">
                      {translate('noPasswordRequests')}
                    </div>
                  ) : (
                    passwordRequests.map(request => (
                      <div key={request.id} className="p-4 hover:bg-muted/50">
                        <div className="flex items-start gap-2">
                          <div className="bg-red-100 p-2 rounded-full">
                            <Key className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">
                                {translate('passwordResetRequested')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getRelativeTime(request.createdAt)}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {translate('requestFromUser', { username: request.username })}
                            </p>
                            <Link 
                              href="/dashboard/solicitudes"
                              className="inline-block mt-2 text-xs text-primary hover:underline"
                            >
                              {translate('viewRequest')}
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {/* Student: Notifications in correct order */}
              {user?.role === 'student' && (
                <div>
                  {unreadComments.length === 0 && pendingTasks.length === 0 && taskNotifications.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground">
                      {translate('noNotifications')}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {/* 1. EVALUACIONES PENDIENTES - FIRST POSITION */}
                      {(pendingTasks.filter(task => task.taskType === 'evaluation').length > 0 || 
                        taskNotifications.filter(n => n.type === 'new_task' && n.taskType === 'evaluation').length > 0) && (
                        <>
                          <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 dark:border-purple-500">
                            <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">
                              {translate('pendingEvaluations') || 'Evaluaciones Pendientes'} 
                              ({pendingTasks.filter(task => task.taskType === 'evaluation').length + 
                                taskNotifications.filter(n => n.type === 'new_task' && n.taskType === 'evaluation').length})
                            </h3>
                          </div>
                          
                          {/* Existing pending evaluations */}
                          {pendingTasks
                            .filter(task => task.taskType === 'evaluation')
                            .slice(0, 2)
                            .map(task => (
                            <div key={`pending-eval-${task.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-full">
                                  <ClipboardList className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {task.title}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-purple-200 dark:border-purple-600 text-purple-700 dark:text-purple-300 flex flex-col items-center justify-center text-center leading-tight">
                                      {splitTextForBadge(task.subject).map((line, index) => (
                                        <div key={index}>{line}</div>
                                      ))}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {translate('duePrefix')} {formatDate(task.dueDate)}
                                  </p>
                                  {createSafeTaskLink(task.id, '', 'Ver Evaluación', 'evaluation')}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* New evaluation notifications */}
                          {taskNotifications
                            .filter(n => n.type === 'new_task' && n.taskType === 'evaluation')
                            .slice(0, 3 - pendingTasks.filter(task => task.taskType === 'evaluation').length)
                            .map(notification => (
                            <div key={`new-eval-${notification.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-full">
                                  <ClipboardList className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notification.taskTitle}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(notification.timestamp)}
                                    </p>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Nueva evaluación asignada por {notification.teacherName || notification.fromDisplayName}
                                  </p>
                                  <p className="text-xs font-medium mt-1">
                                    {TaskNotificationManager.getCourseNameById(notification.course)} • {notification.subject}
                                  </p>
                                  {createSafeTaskLink(notification.taskId, '', 'Ver Evaluación', 'evaluation')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* 2. TAREAS PENDIENTES - SECOND POSITION */}
                      {(pendingTasks.filter(task => task.taskType === 'assignment' || !task.taskType).length > 0 || 
                        taskNotifications.filter(n => n.type === 'new_task' && (n.taskType === 'assignment' || !n.taskType)).length > 0) && (
                        <>
                          <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 dark:border-orange-500">
                            <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                              {translate('pendingTasks') || 'Tareas Pendientes'} 
                              ({pendingTasks.filter(task => task.taskType === 'assignment' || !task.taskType).length + 
                                taskNotifications.filter(n => n.type === 'new_task' && (n.taskType === 'assignment' || !n.taskType)).length})
                            </h3>
                          </div>
                          
                          {/* Existing pending tasks */}
                          {pendingTasks
                            .filter(task => task.taskType === 'assignment' || !task.taskType)
                            .slice(0, 2)
                            .map(task => (
                            <div key={`pending-task-${task.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-orange-100 dark:bg-orange-800 p-2 rounded-full">
                                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {task.title}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-orange-200 dark:border-orange-600 text-orange-700 dark:text-orange-300 flex flex-col items-center justify-center text-center leading-tight">
                                      {splitTextForBadge(task.subject).map((line, index) => (
                                        <div key={index}>{line}</div>
                                      ))}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {translate('duePrefix')} {formatDate(task.dueDate)}
                                  </p>
                                  {createSafeTaskLink(task.id, '', translate('viewTask'), 'task')}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* New task notifications */}
                          {taskNotifications
                            .filter(n => n.type === 'new_task' && (n.taskType === 'assignment' || !n.taskType))
                            .slice(0, 3 - pendingTasks.filter(task => task.taskType === 'assignment' || !task.taskType).length)
                            .map(notification => (
                            <div key={`new-task-${notification.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-orange-100 dark:bg-orange-800 p-2 rounded-full">
                                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notification.taskTitle}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(notification.timestamp)}
                                    </p>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Nueva tarea asignada por {notification.teacherName || notification.fromDisplayName}
                                  </p>
                                  <p className="text-xs font-medium mt-1">
                                    {TaskNotificationManager.getCourseNameById(notification.course)} • {notification.subject}
                                  </p>
                                  {createSafeTaskLink(notification.taskId, '', translate('viewTask'), 'task')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* 3. COMENTARIOS NO LEÍDOS - THIRD POSITION */}
                      {unreadComments.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500">
                            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              {translate('unreadComments') || 'Comentarios No Leídos'} ({unreadComments.length})
                            </h3>
                          </div>
                          
                          {unreadComments.slice(0, 3).map(comment => (
                            <div key={`unread-comment-${comment.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-3">
                                <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full">
                                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {comment.task?.title || 'Sin título'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(comment.timestamp)}
                                    </p>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {comment.comment}
                                  </p>
                                  <p className="text-xs font-medium mt-1">
                                    {comment.task?.course ? TaskNotificationManager.getCourseNameById(comment.task.course) : 'Sin curso'} • {comment.task?.subject || 'Sin materia'}
                                  </p>
                                  {createSafeCommentLink(comment.taskId, comment.id, translate('viewComment'))}
                                </div>
                              </div>
                            </div>
                          ))}

                          {unreadComments.length > 3 && (
                            <div className="px-4 py-3 text-center">
                              <Link 
                                href="/dashboard/tareas" 
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Ver todos los comentarios ({unreadComments.length})
                              </Link>
                            </div>
                          )}
                        </>
                      )}

                      {/* Grade and other notifications (except new_task) */}
                      {taskNotifications.filter(n => n.type !== 'new_task').length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-500">
                            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                              Calificaciones y Comentarios ({taskNotifications.filter(n => n.type !== 'new_task').length})
                            </h3>
                          </div>
                          
                          {taskNotifications.filter(n => n.type !== 'new_task').map(notification => (
                            <div key={`grade-comment-${notification.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className={`p-2 rounded-full ${
                                  notification.type === 'grade_received' 
                                    ? 'bg-green-100 dark:bg-green-800' 
                                    : 'bg-blue-100 dark:bg-blue-800'
                                }`}>
                                  {notification.type === 'grade_received' ? (
                                    <ClipboardCheck className="h-4 w-4 text-green-600 dark:text-green-300" />
                                  ) : (
                                    <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notification.type === 'grade_received'
                                        ? translate('reviewGrade')
                                        : translate('newTeacherComment')
                                      }
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(notification.timestamp)}
                                    </p>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.type === 'grade_received' && notification.grade
                                      ? `Calificación recibida: ${notification.grade}% en ${notification.taskTitle}`
                                      : `Comentario del profesor en: ${notification.taskTitle}`
                                    }
                                  </p>
                                  <p className="text-xs font-medium mt-1">
                                    {TaskNotificationManager.getCourseNameById(notification.course)} • {notification.subject}
                                  </p>
                                  {createSafeTaskLink(notification.taskId, '', `Ver ${notification.type === 'grade_received' ? 'Calificación' : 'Comentario'}`, notification.type === 'grade_received' ? 'evaluation' : 'comment')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              
              {/* Teacher: Submissions to review */}
              {user?.role === 'teacher' && (
                <div>
                  {(studentSubmissions.length === 0 && pendingGrading.length === 0 && unreadStudentComments.length === 0 && taskNotifications.length === 0) ? (
                    <div className="py-6 text-center text-muted-foreground">
                      {translate('noSubmissionsToReview')}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {/* 1. EVALUACIONES PENDIENTES DE CALIFICAR - PRIMER LUGAR */}
                      {(pendingGrading.filter(notif => notif.taskType === 'evaluation').length > 0 ||
                        taskNotifications.filter(notif => 
                          notif.type === 'pending_grading' && 
                          notif.fromUsername === 'system' &&
                          notif.taskType === 'evaluation'
                        ).length > 0) && (
                        <>
                          <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900/10 border-l-4 border-purple-500 dark:border-purple-600">
                            <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">
                              {translate('pendingEvaluations') || 'Evaluaciones Pendientes'} ({
                                pendingGrading.filter(notif => notif.taskType === 'evaluation').length +
                                taskNotifications.filter(notif => 
                                  notif.type === 'pending_grading' && 
                                  notif.fromUsername === 'system' &&
                                  notif.taskType === 'evaluation'
                                ).length
                              })
                            </h3>
                          </div>
                          
                          {/* Evaluaciones pendientes del sistema (recién creadas) */}
                          {taskNotifications
                            .filter(notif => 
                              notif.type === 'pending_grading' && 
                              notif.fromUsername === 'system' &&
                              notif.taskType === 'evaluation'
                            )
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map(notif => (
                            <div key={`teacher-pending-eval-system-${notif.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-full">
                                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notif.taskTitle}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-purple-200 dark:border-purple-600 text-purple-700 dark:text-purple-300 flex flex-col items-center justify-center text-center leading-tight">
                                      {getCourseAbbreviation(notif.subject)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {TaskNotificationManager.getCourseNameById(notif.course)} • {formatDate(notif.timestamp)}
                                  </p>
                                  {createSafeTaskLink(notif.taskId, '', translate('viewEvaluation'), 'evaluation')}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Evaluaciones pendientes de calificar (entregas de estudiantes) */}
                          {pendingGrading
                            .filter(notif => notif.taskType === 'evaluation')
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Orden por fecha de creación
                            .map(notif => (
                            <div key={`teacher-pending-eval-grade-${notif.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-full">
                                  <ClipboardList className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notif.fromDisplayName || `${notif.taskTitle} (${TaskNotificationManager.getCourseNameById(notif.course)})`}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-purple-200 dark:border-purple-600 text-purple-700 dark:text-purple-300 flex flex-col items-center justify-center text-center leading-tight">
                                      {getCourseAbbreviation(notif.subject)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {translate('evaluation') || 'Evaluación'}
                                  </p>
                                  {createSafeTaskLink(notif.taskId, '', translate('reviewEvaluation'), 'evaluation')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* 2. EVALUACIONES COMPLETADAS POR ESTUDIANTES - SEGUNDO LUGAR */}
                      {taskNotifications.filter(notif => notif.type === 'task_completed' && notif.taskType === 'evaluation').length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-purple-100 dark:bg-purple-900/10 border-l-4 border-gray-300 dark:border-gray-500">
                            <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">
                              {translate('evaluationsCompleted') || 'Evaluaciones Completadas'} ({taskNotifications.filter(notif => notif.type === 'task_completed' && notif.taskType === 'evaluation').length})
                            </h3>
                          </div>
                          {taskNotifications
                            .filter(notif => notif.type === 'task_completed' && notif.taskType === 'evaluation')
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map(notif => (
                            <div key={`teacher-eval-completed-${notif.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-purple-50 dark:bg-purple-700/30 p-2 rounded-full">
                                  <ClipboardList className="h-4 w-4 text-purple-700 dark:text-purple-200" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notif.fromDisplayName || notif.fromUsername}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs border-purple-200 dark:border-purple-500 text-purple-600 dark:text-purple-400 flex flex-col items-center justify-center text-center leading-tight">
                                        {getCourseAbbreviation(notif.subject)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {translate('studentCompletedEvaluation') || 'Completó la evaluación'}: {notif.taskTitle}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(notif.timestamp)}
                                  </p>
                                  {createSafeTaskLink(notif.taskId, '', 'Ver Resultados', 'evaluation')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* 3. TAREAS PENDIENTES DE CALIFICAR - TERCER LUGAR */}
                      {(pendingGrading.filter(notif => notif.taskType === 'assignment').length > 0 || 
                        taskNotifications.filter(notif => 
                          notif.type === 'pending_grading' && 
                          notif.fromUsername === 'system' &&
                          notif.taskType === 'assignment'
                        ).length > 0) && (
                        <>
                          <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 dark:border-orange-500">
                            <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                              {translate('pendingTasks') || 'Tareas Pendientes'} ({
                                pendingGrading.filter(notif => notif.taskType === 'assignment').length +
                                taskNotifications.filter(notif => 
                                  notif.type === 'pending_grading' && 
                                  notif.fromUsername === 'system' &&
                                  notif.taskType === 'assignment'
                                ).length
                              })
                            </h3>
                          </div>
                          
                          {/* Tareas pendientes del sistema (recién creadas) */}
                          {taskNotifications
                            .filter(notif => 
                              notif.type === 'pending_grading' && 
                              notif.fromUsername === 'system' &&
                              notif.taskType === 'assignment'
                            )
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Orden por fecha de creación
                            .map(notif => (
                            <div key={`teacher-pending-task-system-${notif.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-orange-100 dark:bg-orange-800 p-2 rounded-full">
                                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notif.taskTitle}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-orange-200 dark:border-orange-600 text-orange-700 dark:text-orange-300 flex flex-col items-center justify-center text-center leading-tight">
                                      {getCourseAbbreviation(notif.subject)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {TaskNotificationManager.getCourseNameById(notif.course)} • {formatDate(notif.timestamp)}
                                  </p>
                                  {createSafeTaskLink(notif.taskId, '', translate('viewTask'), 'task')}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Tareas pendientes de calificar (entregas de estudiantes) */}
                          {pendingGrading
                            .filter(notif => notif.taskType === 'assignment')
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Orden por fecha de creación
                            .map(notif => (
                            <div key={`teacher-pending-task-grade-${notif.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-orange-100 dark:bg-orange-800 p-2 rounded-full">
                                  <ClipboardCheck className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notif.fromDisplayName || `${notif.taskTitle} (${TaskNotificationManager.getCourseNameById(notif.course)})`}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-orange-200 dark:border-orange-600 text-orange-700 dark:text-orange-300 flex flex-col items-center justify-center text-center leading-tight">
                                      {getCourseAbbreviation(notif.subject)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {TaskNotificationManager.getCourseNameById(notif.course)} • {formatDate(notif.timestamp)}
                                  </p>
                                  {createSafeTaskLink(notif.taskId, '', translate('viewTask'), 'task')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      
                      {/* 4. TAREAS COMPLETADAS POR ESTUDIANTES - CUARTO LUGAR */}
                      {taskNotifications.filter(notif => notif.type === 'task_completed' && notif.taskType === 'assignment').length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 dark:border-orange-500">
                            <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                              {translate('completedTasks') || 'Tareas Completadas'} ({taskNotifications.filter(notif => notif.type === 'task_completed' && notif.taskType === 'assignment').length})
                            </h3>
                          </div>
                          {taskNotifications
                            .filter(notif => notif.type === 'task_completed' && notif.taskType === 'assignment')
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map(notif => (
                            <div key={`teacher-task-completed-${notif.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-orange-100 dark:bg-orange-800/40 p-2 rounded-full">
                                  <ClipboardCheck className="h-4 w-4 text-orange-800 dark:text-orange-100" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notif.fromDisplayName || notif.fromUsername}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 flex flex-col items-center justify-center text-center leading-tight">
                                        {getCourseAbbreviation(notif.subject)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {translate('completedTask') || 'Completó la tarea'}: {notif.taskTitle}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {TaskNotificationManager.getCourseNameById(notif.course)} • {formatDate(notif.timestamp)}
                                  </p>
                                  {createSafeTaskLink(notif.taskId, '', translate('viewTask'), 'task')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* 5. ENTREGAS INDIVIDUALES DE ESTUDIANTES */}
                      {taskNotifications.filter(notif => notif.type === 'task_submission').length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500 dark:border-orange-600">
                            <h3 className="text-sm font-medium text-orange-900 dark:text-orange-100">
                              {translate('completedTasks') || 'Tareas Completadas'} ({taskNotifications.filter(notif => notif.type === 'task_submission').length})
                            </h3>
                          </div>
                          {taskNotifications
                            .filter(notif => notif.type === 'task_submission')
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map(notif => (
                            <div key={`teacher-task-submission-${notif.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-orange-100 dark:bg-orange-800/40 p-2 rounded-full">
                                  <ClipboardCheck className="h-4 w-4 text-orange-800 dark:text-orange-100" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notif.fromDisplayName || notif.fromUsername}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 flex flex-col items-center justify-center text-center leading-tight">
                                        {getCourseAbbreviation(notif.subject)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {translate('submittedTask') || 'Entregó la tarea'}: {notif.taskTitle}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {TaskNotificationManager.getCourseNameById(notif.course)} • {formatDate(notif.timestamp)}
                                  </p>
                                  {createSafeTaskLink(notif.taskId, '', translate('reviewTask') || 'Revisar Tarea', 'task')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      
                      {/* 🚫 ELIMINADO: Sección de entregas de estudiantes - ya no se muestra como sección separada */}
                      {/* La funcionalidad de revisar entregas ahora se maneja a través de las notificaciones del sistema */}

                      {/* Sección de comentarios no leídos de estudiantes */}
                      {unreadStudentComments.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500">
                            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              {translate('unreadStudentComments') || 'Comentarios No Leídos'} ({unreadStudentComments.length})
                            </h3>
                          </div>
                          {unreadStudentComments.map(comment => (
                            <div key={`teacher-student-comment-${comment.id}`} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full">
                                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {comment.studentName}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300 flex flex-col items-center justify-center text-center leading-tight">
                                      {getCourseAbbreviation(comment.task?.subject || translate('task'))}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {comment.comment}
                                  </p>
                                  <p className="text-xs font-medium mt-1">
                                    {translate('task') || 'Tarea'}: {comment.task?.title && comment.task?.course ? `${comment.task.title} (${TaskNotificationManager.getCourseNameById(comment.task.course)})` : comment.task?.title || 'Tarea'}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(comment.timestamp)}
                                  </p>
                                  {createSafeCommentLink(comment.taskId, comment.id, translate('viewComment') || 'Ver Comentario')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
                </CardContent>
              </div>
            </ScrollArea>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
