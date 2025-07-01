"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, Plus, Calendar, User, Users, MessageSquare, Eye, Send, Edit, Trash2, Paperclip, Download, X, Upload, FileText, GraduationCap, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TaskNotificationManager } from '@/lib/notifications';

interface Task {
  id: string;
  title: string;
  description: string;
  subject: string;
  course: string;
  assignedBy: string; // teacher username
  assignedByName: string; // teacher display name
  assignedTo: 'course' | 'student'; // type of assignment
  assignedStudents?: string[]; // specific students if assignedTo is 'student'
  dueDate: string;
  createdAt: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  taskType: 'assignment' | 'evaluation'; // Tipo de tarea: normal o evaluación
  attachments?: TaskFile[]; // Files attached by teacher
  // Configuración específica para evaluaciones
  evaluationConfig?: {
    topic: string; // Tema de la evaluación
    questionCount: number; // Cantidad de preguntas
    timeLimit: number; // Tiempo límite en minutos
  };
  // Resultados de evaluaciones por estudiante
  evaluationResults?: {
    [studentUsername: string]: {
      score: number; // Puntaje obtenido (número de respuestas correctas)
      totalQuestions: number; // Total de preguntas en la evaluación
      completionPercentage: number; // Porcentaje obtenido (0-100)
      completedAt: string; // Fecha de finalización
      attempt: number; // Número de intento (para futuras mejoras)
    };
  };
  // Propiedades adicionales para la copia local del estudiante
  score?: number; // Puntaje del estudiante (para su copia local)
  completionPercentage?: number; // Porcentaje del estudiante (para su copia local)
  completedAt?: string; // Fecha de completado (para su copia local)
}

interface TaskComment {
  id: string;
  taskId: string;
  studentUsername: string;
  studentName: string;
  comment: string;
  timestamp: string;
  isSubmission: boolean; // true if this is the student's submission
  attachments?: TaskFile[]; // Files attached to this comment/submission
  grade?: number; // Calificación del 0 al 100%
  feedback?: string; // Retroalimentación del profesor
  gradedBy?: string; // Profesor que calificó
  gradedAt?: string; // Fecha de calificación
  userRole?: 'teacher' | 'student' | 'admin'; // Rol del usuario que hizo el comentario
  readBy?: string[]; // Array de usuarios que han leído este comentario
  isNew?: boolean; // Si el comentario es nuevo (para compatibilidad)
}

interface TaskFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string; // Base64 data URL or external URL
  uploadedBy: string;
  uploadedAt: string;
}

export default function TareasPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmission, setIsSubmission] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<TaskFile[]>([]);
  const [commentAttachments, setCommentAttachments] = useState<TaskFile[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'course'>('list');
  const [gradingComment, setGradingComment] = useState<TaskComment | null>(null);
  const [showGradingDialog, setShowGradingDialog] = useState(false);
  const [gradeValue, setGradeValue] = useState<number>(100);
  const [feedbackValue, setFeedbackValue] = useState<string>('');
  const [commentToGrade, setCommentToGrade] = useState<TaskComment | null>(null);
  const [showGradeDialog, setShowGradeDialog] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    course: '',
    assignedTo: 'course' as 'course' | 'student',
    assignedStudents: [] as string[],
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    taskType: 'assignment' as 'assignment' | 'evaluation', // Por defecto es tarea normal
    // Configuración predeterminada para evaluaciones
    evaluationConfig: {
      topic: '',
      questionCount: 15,
      timeLimit: 30 // minutos
    }
  });

  // Función para forzar recarga de datos de evaluación
  const forceReloadTaskData = (taskId: string) => {
    console.log('🔄 Forcing reload of task data for task:', taskId);
    
    // Recargar tareas desde localStorage
    loadTasks();
    
    // Si hay una tarea seleccionada con el mismo ID, actualizarla
    if (selectedTask && selectedTask.id === taskId) {
      setTimeout(() => {
        const freshTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
        const freshTask = freshTasks.find((t: any) => t.id === taskId);
        
        if (freshTask) {
          console.log('✅ Updated selected task with fresh data:', freshTask);
          
          // 🔧 MEJORA: Forzar sincronización de resultados de evaluación
          if (freshTask.taskType === 'evaluation') {
            console.log('🔄 Forcing evaluation results synchronization...');
            
            // Llamar a getAllEvaluationResults para forzar la sincronización
            const syncedResults = getAllEvaluationResults(freshTask);
            console.log('🔄 Synchronized results:', syncedResults.length, 'students processed');
            
            // Recargar la tarea actualizada después de la sincronización
            const reSyncedTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
            const reSyncedTask = reSyncedTasks.find((t: any) => t.id === taskId);
            
            if (reSyncedTask) {
              setSelectedTask(reSyncedTask);
              console.log('✅ Selected task updated with synchronized evaluation results');
            }
          } else {
            setSelectedTask(freshTask);
          }
        }
      }, 100);
    }
  };

  // Load tasks and comments
  useEffect(() => {
    loadTasks();
    loadComments();
    
    // Mark notifications as read when student views tasks page
    if (user?.role === 'student') {
      // Mark grade notifications as read when entering tasks page
      TaskNotificationManager.markGradeNotificationsAsReadOnTasksView(user.username);
      
      // NOTE: NO marcar notificaciones de nuevas tareas como leídas aquí
      // Solo se deben marcar como leídas cuando el estudiante ENTREGA la tarea
      // Esto se hace en handleAddComment() cuando isSubmission es true
      
      // Trigger notification update event to refresh the UI
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
      }, 100);
    }
    
    // 🚨 NUEVO: Si es profesor, ejecutar sincronización de emergencia después de cargar
    if (user?.role === 'teacher') {
      setTimeout(() => {
        console.log('🚨 TEACHER LOGIN: Running emergency sync on page load...');
        
        const allTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
        const evaluationTasks = allTasks.filter((task: any) => task.taskType === 'evaluation');
        
        if (evaluationTasks.length > 0) {
          console.log(`🚨 Found ${evaluationTasks.length} evaluations, running emergency sync...`);
          
          const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
          const students = Object.entries(allUsers).filter(([_, data]: [string, any]) => data.role === 'student');
          
          let hasGlobalChanges = false;
          
          evaluationTasks.forEach((evalTask: any) => {
            if (!evalTask.evaluationResults) {
              evalTask.evaluationResults = {};
              hasGlobalChanges = true;
            }
            
            students.forEach(([studentUsername, userData]: [string, any]) => {
              const isAssigned = evalTask.assignedTo === 'course' 
                ? userData.activeCourses?.includes(evalTask.course)
                : evalTask.assignedStudents?.includes(studentUsername);
              
              if (isAssigned) {
                const userTasksKey = `userTasks_${studentUsername}`;
                const userTasksString = localStorage.getItem(userTasksKey);
                
                if (userTasksString) {
                  try {
                    const userTasks = JSON.parse(userTasksString);
                    const userTask = userTasks.find((ut: any) => ut.id === evalTask.id);
                    
                    if (userTask && (userTask.status === 'completed' || userTask.completionPercentage !== undefined)) {
                      console.log(`🚨 EMERGENCY LOAD SYNC: Found data for ${studentUsername} in ${evalTask.title}`);
                      
                      evalTask.evaluationResults[studentUsername] = {
                        score: userTask.score || 0,
                        completionPercentage: userTask.completionPercentage || 0,
                        completedAt: userTask.completedAt || new Date().toISOString(),
                        totalQuestions: userTask.evaluationConfig?.questionCount || evalTask.evaluationConfig?.questionCount || 0,
                        attempt: 1
                      };
                      
                      hasGlobalChanges = true;
                      console.log(`✅ EMERGENCY LOAD SYNC: Updated ${studentUsername}`);
                    }
                  } catch (error) {
                    console.error(`❌ EMERGENCY LOAD SYNC: Error with ${studentUsername}:`, error);
                  }
                }
              }
            });
          });
          
          if (hasGlobalChanges) {
            localStorage.setItem('smart-student-tasks', JSON.stringify(allTasks));
            console.log('💾 EMERGENCY LOAD SYNC: Saved changes to localStorage');
            
            // Recargar las tareas en el estado
            setTimeout(() => {
              loadTasks();
              console.log('✅ EMERGENCY LOAD SYNC: Reloaded tasks in state');
            }, 100);
          }
        }
      }, 1000); // Ejecutar después de 1 segundo
    }
  }, [user]);

  // Recargar tareas cuando la página vuelve a ser visible (ej: regresando de evaluación)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.role === 'student') {
        console.log('📋 Page visible again, reloading tasks to check for updates');
        
        // Forzar recarga múltiple para asegurar que se actualizan los datos
        loadTasks();
        setTimeout(() => {
          loadTasks();
          console.log('🔄 Second reload after visibility change');
        }, 100);
        setTimeout(() => {
          loadTasks();
          console.log('🔄 Third reload after visibility change');
        }, 500);
      }
    };

    const handleFocus = () => {
      if (user?.role === 'student') {
        console.log('📋 Window focused, reloading tasks');
        loadTasks();
      }
    };

    // Listener personalizado para actualizaciones de evaluación
    const handleEvaluationCompleted = (event: any) => {
      console.log('🎯 Evaluation completed event received:', event.detail);
      
      // Forzar recarga inmediata de tareas
      loadTasks();
      
      // Si hay una tarea seleccionada que coincida con la que se completó, actualizarla
      if (selectedTask && event.detail.taskId === selectedTask.id) {
        console.log('🔄 Updating selected task data after evaluation completion');
        setTimeout(() => {
          loadTasks();
          // Forzar actualización de la tarea seleccionada
          forceReloadTaskData(selectedTask.id);
        }, 500);
      }
    };

    // Listener para cuando el profesor abre una evaluación desde notificaciones
    const handleEvaluationViewRequest = (event: any) => {
      console.log('👨‍🏫 Teacher evaluation view request:', event.detail);
      
      if (event.detail.taskId) {
        // Forzar recarga de datos antes de mostrar
        forceReloadTaskData(event.detail.taskId);
        
        setTimeout(() => {
          const freshTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
          const freshTask = freshTasks.find((t: any) => t.id === event.detail.taskId);
          
          if (freshTask) {
            console.log('📊 Opening evaluation with fresh data:', freshTask);
            setSelectedTask(freshTask);
            setShowTaskDialog(true);
          }
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('evaluationCompleted', handleEvaluationCompleted);
    window.addEventListener('evaluationViewRequest', handleEvaluationViewRequest);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('evaluationCompleted', handleEvaluationCompleted);
      window.removeEventListener('evaluationViewRequest', handleEvaluationViewRequest);
    };
  }, [user]);

  // Handle navigation from notifications
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    const commentId = searchParams.get('commentId');
    
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        // 🔧 MEJORA: Cargar datos frescos de localStorage antes de abrir el diálogo
        const freshTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
        const freshTask = freshTasks.find((t: any) => t.id === taskId);
        
        // Open the task dialog with fresh data
        setSelectedTask(freshTask || task);
        setShowTaskDialog(true);
        
        // If there's a specific comment to highlight, scroll to it after a brief delay
        if (commentId) {
          setTimeout(() => {
            const commentElement = document.getElementById(`comment-${commentId}`);
            if (commentElement) {
              commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              commentElement.classList.add('bg-yellow-100', 'border-yellow-400');
              setTimeout(() => {
                commentElement.classList.remove('bg-yellow-100', 'border-yellow-400');
              }, 3000);
            }
          }, 500);
        }
        
        // Mark ALL unread comments in this task as read when navigating from notification
        // This works for both students and teachers
        // Add delay to allow users to see highlighted comments first
        setTimeout(() => {
          markAllTaskCommentsAsRead(taskId);
        }, 2000); // 2 seconds delay to allow visual feedback
      }
    }
  }, [tasks, searchParams, user]);

  // Función para verificar y actualizar tareas/evaluaciones vencidas
  const checkAndUpdateExpiredTasks = (tasks: Task[]) => {
    const now = new Date();
    let hasChanges = false;
    
    const updatedTasks = tasks.map(task => {
      const dueDate = new Date(task.dueDate);
      
      // Si la fecha límite ya pasó y la tarea/evaluación está pendiente
      if (dueDate <= now && task.status === 'pending') {
        console.log(`⏰ Task/Evaluation expired: ${task.title} (Due: ${task.dueDate})`);
        hasChanges = true;
        
        return {
          ...task,
          status: 'completed' as const, // Cambiar a finalizado automáticamente
          expiredAt: now.toISOString() // Marcar cuando expiró la tarea
        };
      }
      
      return task;
    });
    
    // Si hubo cambios, actualizar localStorage
    if (hasChanges) {
      localStorage.setItem('smart-student-tasks', JSON.stringify(updatedTasks));
      console.log('💾 Updated expired tasks in global storage');
      
      // Disparar evento para actualizar notificaciones
      window.dispatchEvent(new Event('taskNotificationsUpdated'));
    }
    
    return updatedTasks;
  };

  const loadTasks = () => {
    let allTasks: Task[] = [];
    
    // Cargar tareas globales del profesor
    const storedTasks = localStorage.getItem('smart-student-tasks');
    if (storedTasks) {
      allTasks = JSON.parse(storedTasks);
      
      // Verificar y actualizar tareas vencidas
      allTasks = checkAndUpdateExpiredTasks(allTasks);
    }
    
    // Si es estudiante, también cargar sus tareas específicas
    if (user?.role === 'student') {
      const userTasksKey = `userTasks_${user.username}`;
      const userTasks = localStorage.getItem(userTasksKey);
      if (userTasks) {
        const userTasksData: Task[] = JSON.parse(userTasks);
        console.log(`📋 Loading user-specific tasks for ${user.username}:`, userTasksData);
        
        // Combinar tareas, priorizando las tareas específicas del usuario
        userTasksData.forEach(userTask => {
          const existingIndex = allTasks.findIndex(task => task.id === userTask.id);
          if (existingIndex !== -1) {
            // Reemplazar con la versión del usuario (puede tener estado actualizado)
            allTasks[existingIndex] = userTask;
            console.log(`✅ Updated task status for ${userTask.title}: ${userTask.status}`);
            
            // Debug específico para evaluaciones completadas
            if (userTask.taskType === 'evaluation' && userTask.status === 'completed') {
              console.log(`🎯 EVALUATION COMPLETED DETECTED:`, {
                taskId: userTask.id,
                title: userTask.title,
                status: userTask.status,
                score: userTask.score,
                completionPercentage: userTask.completionPercentage,
                completedAt: userTask.completedAt
              });
            }
          } else {
            // Agregar nueva tarea específica del usuario
            allTasks.push(userTask);
          }
        });
      }
      
      // NUEVO: Sincronizar tareas asignadas al estudiante que no estén en su userTasks
      console.log('🔄 Synchronizing tasks assigned to student...');
      let userTasksData: Task[] = userTasks ? JSON.parse(userTasks) : [];
      let hasChanges = false;
      
      allTasks.forEach(globalTask => {
        // Verificar si esta tarea está asignada al estudiante
        const isAssignedToStudent = (
          globalTask.assignedTo === 'course' && user.activeCourses?.includes(globalTask.course)
        ) || (
          globalTask.assignedTo === 'student' && globalTask.assignedStudents?.includes(user.username)
        );
        
        if (isAssignedToStudent) {
          const existsInUserTasks = userTasksData.find(ut => ut.id === globalTask.id);
          if (!existsInUserTasks) {
            console.log(`📥 Adding missing task to user tasks: ${globalTask.title}`);
            userTasksData.push(globalTask);
            hasChanges = true;
          }
        }
      });
      
      // Guardar cambios si hubo sincronización
      if (hasChanges) {
        localStorage.setItem(userTasksKey, JSON.stringify(userTasksData));
        console.log('✅ Synchronized user tasks with global tasks');
        
        // Actualizar allTasks con los datos sincronizados
        userTasksData.forEach(userTask => {
          const existingIndex = allTasks.findIndex(task => task.id === userTask.id);
          if (existingIndex !== -1) {
            allTasks[existingIndex] = userTask;
          }
        });
      }
    }
    
    console.log('📋 Final tasks loaded:', allTasks.map(t => ({id: t.id, title: t.title, status: t.status, taskType: t.taskType})));
    
    // 🔧 NUEVO: Si es profesor, forzar sincronización automática de evaluaciones
    if (user?.role === 'teacher') {
      console.log('👨‍🏫 Teacher detected, running automatic evaluation sync...');
      
      const evaluationTasks = allTasks.filter(task => task.taskType === 'evaluation');
      if (evaluationTasks.length > 0) {
        console.log(`📊 Found ${evaluationTasks.length} evaluation tasks, running AGGRESSIVE sync...`);
        
        // 🚨 SINCRONIZACIÓN AGRESIVA AUTOMÁTICA
        const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
        const students = Object.entries(allUsers).filter(([_, data]: [string, any]) => data.role === 'student');
        console.log('👥 All students for auto sync:', students.map(([username, _]) => username));
        
        let globalHasChanges = false;
        
        evaluationTasks.forEach(evalTask => {
          try {
            console.log(`🔄 Auto-syncing evaluation: ${evalTask.title}`);
            
            if (!evalTask.evaluationResults) {
              evalTask.evaluationResults = {};
              globalHasChanges = true;
            }
            
            students.forEach(([studentUsername, userData]: [string, any]) => {
              // Verificar si el estudiante está asignado a esta evaluación
              const isAssigned = evalTask.assignedTo === 'course' 
                ? userData.activeCourses?.includes(evalTask.course)
                : evalTask.assignedStudents?.includes(studentUsername);
              
              if (isAssigned) {
                const userTasksKey = `userTasks_${studentUsername}`;
                const userTasksString = localStorage.getItem(userTasksKey);
                
                if (userTasksString) {
                  try {
                    const userTasks = JSON.parse(userTasksString);
                    const userTask = userTasks.find((ut: any) => ut.id === evalTask.id);
                    
                    if (userTask && (userTask.status === 'completed' || userTask.completionPercentage !== undefined)) {
                      console.log(`🚨 AUTO SYNC: Found results for ${studentUsername} in ${evalTask.title}`);
                      
                      // Verificar si necesita actualización
                      if (!evalTask.evaluationResults) {
                        evalTask.evaluationResults = {};
                      }
                      
                      const needsUpdate = !evalTask.evaluationResults[studentUsername] || 
                        evalTask.evaluationResults[studentUsername].completionPercentage !== (userTask.completionPercentage || 0);
                      
                      if (needsUpdate) {
                        evalTask.evaluationResults[studentUsername] = {
                          score: userTask.score || 0,
                          completionPercentage: userTask.completionPercentage || 0,
                          completedAt: userTask.completedAt || new Date().toISOString(),
                          totalQuestions: userTask.evaluationConfig?.questionCount || evalTask.evaluationConfig?.questionCount || 0,
                          attempt: 1
                        };
                        
                        globalHasChanges = true;
                        console.log(`✅ AUTO SYNC: Updated ${studentUsername} results in ${evalTask.title}`);
                      }
                    }
                  } catch (error) {
                    console.error(`❌ AUTO SYNC: Error processing ${studentUsername}:`, error);
                  }
                }
              }
            });
          } catch (error) {
            console.error(`❌ Error in aggressive sync for ${evalTask.title}:`, error);
          }
        });
        
        // Guardar cambios si hubo modificaciones
        if (globalHasChanges) {
          console.log('💾 AUTO SYNC: Saving globally synchronized tasks...');
          localStorage.setItem('smart-student-tasks', JSON.stringify(allTasks));
          console.log('✅ AUTO SYNC: Global synchronization completed');
        }
        
        // También ejecutar la sincronización normal como respaldo
        evaluationTasks.forEach(evalTask => {
          try {
            const syncedResults = getAllEvaluationResults(evalTask);
            console.log(`✅ Normal sync: ${syncedResults.length} results for evaluation: ${evalTask.title}`);
          } catch (error) {
            console.error(`❌ Error in normal sync for ${evalTask.title}:`, error);
          }
        });
        
        // Recargar las tareas después de la sincronización
        setTimeout(() => {
          const refreshedTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
          console.log('🔄 Reloading tasks after evaluation sync...');
          setTasks(refreshedTasks);
        }, 500);
      }
    }
    
    setTasks(allTasks);
  };

  const loadComments = () => {
    const storedComments = localStorage.getItem('smart-student-task-comments');
    if (storedComments) {
      const commentsData: TaskComment[] = JSON.parse(storedComments);
      
      // Migrate existing comments to include readBy and userRole fields if missing
      const migratedComments = commentsData.map(comment => ({
        ...comment,
        readBy: comment.readBy || (comment.userRole === 'teacher' ? [] : [comment.studentUsername]),
        userRole: comment.userRole || (comment.studentUsername.includes('profesor') || comment.studentUsername.includes('teacher') ? 'teacher' : 'student'),
        isNew: comment.isNew !== undefined ? comment.isNew : (comment.userRole === 'teacher' || comment.studentUsername.includes('profesor'))
      }));
      
      // Save migrated data back to localStorage if changes were made
      const originalString = JSON.stringify(commentsData);
      const migratedString = JSON.stringify(migratedComments);
      if (originalString !== migratedString) {
        localStorage.setItem('smart-student-task-comments', migratedString);
        console.log('📝 Migrated comments data to include readBy and userRole fields');
      }
      
      setComments(migratedComments);
    }
  };

  const saveTasks = (newTasks: Task[]) => {
    localStorage.setItem('smart-student-tasks', JSON.stringify(newTasks));
    setTasks(newTasks);
  };

  const saveComments = (newComments: TaskComment[]) => {
    localStorage.setItem('smart-student-task-comments', JSON.stringify(newComments));
    setComments(newComments);
  };

  // Mark a specific comment as read by the current user
  const markCommentAsRead = (taskId: string, commentId?: string) => {
    if (!user) return;
    
    const storedComments = localStorage.getItem('smart-student-task-comments');
    if (storedComments) {
      const commentsData: TaskComment[] = JSON.parse(storedComments);
      let hasUpdates = false;
      
      const updatedComments = commentsData.map(comment => {
        // Mark specific comment as read, or all comments for the task if no commentId specified
        if (comment.taskId === taskId && (!commentId || comment.id === commentId)) {
          if (!comment.readBy?.includes(user.username)) {
            hasUpdates = true;
            return {
              ...comment,
              isNew: false,
              readBy: [...(comment.readBy || []), user.username]
            };
          }
        }
        return comment;
      });
      
      if (hasUpdates) {
        localStorage.setItem('smart-student-task-comments', JSON.stringify(updatedComments));
        setComments(updatedComments);
        
        // Trigger update event to refresh notification panel
        document.dispatchEvent(new CustomEvent('commentsUpdated'));
      }
    }
  };

  // Mark ALL unread comments in a specific task as read by the current user
  const markAllTaskCommentsAsRead = (taskId: string) => {
    if (!user) return;
    
    const storedComments = localStorage.getItem('smart-student-task-comments');
    if (storedComments) {
      const commentsData: TaskComment[] = JSON.parse(storedComments);
      let hasUpdates = false;
      let markedCount = 0;
      
      const updatedComments = commentsData.map(comment => {
        // Mark ALL unread comments in this task as read (from different users)
        if (comment.taskId === taskId && 
            comment.studentUsername !== user.username && 
            !comment.readBy?.includes(user.username)) {
          hasUpdates = true;
          markedCount++;
          console.log(`📩 Marking comment as read: ${comment.comment.substring(0, 30)}...`);
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
        setComments(updatedComments);
        
        // Trigger update event to refresh notification panel
        document.dispatchEvent(new CustomEvent('commentsUpdated'));          console.log(`✅ Marcados como leídos ${markedCount} comentarios de otros usuarios en la tarea ${taskId} para ${user.username}`);
      } else {
        console.log(`ℹ️ No hay comentarios no leídos de otros usuarios en la tarea ${taskId} para ${user.username}`);
      }
    }
  };

  // Get available courses and subjects for teacher
  const getAvailableCourses = () => {
    if (user?.role === 'teacher') {
      return user.activeCourses || [];
    }
    return [];
  };

  const getAvailableSubjects = () => {
    if (user?.role === 'teacher' && user.teachingAssignments) {
      return [...new Set(user.teachingAssignments.map(ta => ta.subject))];
    }
    return ['Matemáticas', 'Lenguaje y Comunicación', 'Ciencias Naturales', 'Historia, Geografía y Ciencias Sociales'];
  };

  // Get students for selected course
  const getStudentsForCourse = (course: string) => {
    // Obtenemos los usuarios del localStorage (que es un objeto)
    const usersObj = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
    
    // Convertimos el objeto a un array de usuarios con su nombre de usuario
    const users = Object.entries(usersObj).map(([username, data]: [string, any]) => ({
      username,
      ...data,
      displayName: data.displayName || username
    }));
    
    // Filtramos solo los estudiantes del curso
    return users.filter((u: any) => 
      u.role === 'student' && 
      u.activeCourses && 
      u.activeCourses.includes(course)
    );
  };

  // Get students from a specific course
  const getStudentsFromCourse = (course: string) => {
    if (!course) return [];
    
    // Get all users from localStorage or mock data
    const users = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
    const studentUsers = Object.entries(users)
      .filter(([_, userData]: [string, any]) => 
        userData.role === 'student' && 
        userData.activeCourses?.includes(course)
      )
      .map(([username, userData]: [string, any]) => ({
        username,
        displayName: userData.displayName || username
      }));
    
    return studentUsers;
  };

  // Filter tasks based on user role
  const getFilteredTasks = () => {
    let filtered: Task[] = [];
    
    if (user?.role === 'teacher') {
      // Teachers see tasks they created
      filtered = tasks.filter(task => task.assignedBy === user.username);
      
      // Apply course filter if selected
      if (selectedCourseFilter !== 'all') {
        filtered = filtered.filter(task => task.course === selectedCourseFilter);
      }
    } else if (user?.role === 'student') {
      // Students see tasks assigned to them or their course
      filtered = tasks.filter(task => {
        if (task.assignedTo === 'course') {
          return user.activeCourses?.includes(task.course);
        } else {
          return task.assignedStudents?.includes(user.username);
        }
      });
    }
    
    // Sort by creation date ascending (oldest first)
    return filtered.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  };

  // Group tasks by course for teacher view
  const getTasksByCourse = () => {
    const filtered = getFilteredTasks();
    const grouped: { [course: string]: Task[] } = {};
    
    filtered.forEach(task => {
      if (!grouped[task.course]) {
        grouped[task.course] = [];
      }
      grouped[task.course].push(task);
    });
    
    return grouped;
  };

  // Get course statistics for teacher
  const getCourseStats = () => {
    const tasksByCourse = getTasksByCourse();
    const stats: { [course: string]: { total: number; pending: number; completed: number } } = {};
    
    Object.keys(tasksByCourse).forEach(course => {
      const courseTasks = tasksByCourse[course];
      stats[course] = {
        total: courseTasks.length,
        pending: 0,
        completed: 0
      };
      
      // Calculate statistics based on task status
      courseTasks.forEach(task => {
        if (task.status === 'completed') {
          stats[course].completed++;
        } else {
          stats[course].pending++;
        }
      });
    });
    
    return stats;
  };

  const handleCreateTask = () => {
    if (!formData.title || !formData.description || !formData.course || !formData.dueDate) {
      toast({
        title: translate('error'),
        description: translate('completeAllFields'),
        variant: 'destructive'
      });
      return;
    }

    // Validar campos específicos para evaluaciones
    if (formData.taskType === 'evaluation' && !formData.evaluationConfig.topic) {
      toast({
        title: translate('error'),
        description: translate('evaluationTopicRequired') || 'El tema de la evaluación es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: formData.title,
      description: formData.description,
      subject: formData.subject,
      course: formData.course,
      assignedBy: user?.username || '',
      assignedByName: user?.displayName || '',
      assignedTo: formData.assignedTo,
      assignedStudents: formData.assignedTo === 'student' ? formData.assignedStudents : undefined,
      dueDate: formData.dueDate,
      createdAt: new Date().toISOString(),
      status: 'pending',
      priority: formData.priority,
      taskType: formData.taskType,
      attachments: taskAttachments
    };
    
    // Añadir configuración específica de evaluación si es necesario
    if (formData.taskType === 'evaluation') {
      newTask.evaluationConfig = {
        topic: formData.evaluationConfig.topic,
        questionCount: formData.evaluationConfig.questionCount,
        timeLimit: formData.evaluationConfig.timeLimit
      };
    }

    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);

    // Crear notificaciones para los estudiantes del curso
    if (user?.role === 'teacher') {
      TaskNotificationManager.createNewTaskNotifications(
        newTask.id,
        newTask.title,
        newTask.course,
        newTask.subject,
        user.username,
        user.displayName || user.username,
        newTask.taskType
      );
      
      // Crear notificación pendiente para el profesor
      TaskNotificationManager.createPendingGradingNotification(
        newTask.id,
        newTask.title,
        newTask.course,
        newTask.subject,
        user.username,
        user.displayName || user.username,
        newTask.taskType
      );
    }

    toast({
      title: translate('taskCreated'),
      description: translate('taskCreatedDesc', { title: formData.title }),
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      subject: '',
      course: '',
      assignedTo: 'course',
      assignedStudents: [],
      dueDate: '',
      priority: 'medium',
      taskType: 'assignment',
      evaluationConfig: {
        topic: '',
        questionCount: 15,
        timeLimit: 30
      }
    });
    setTaskAttachments([]);
    setShowCreateDialog(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedTask) return;

    // Verificar si la fecha límite ya pasó (solo para entregas de estudiantes)
    if (isSubmission && user?.role === 'student') {
      const now = new Date();
      const dueDate = new Date(selectedTask.dueDate);
      
      if (dueDate <= now) {
        toast({
          title: translate('error'),
          description: translate('submissionAfterDueDate') || 'No se pueden realizar entregas después de la fecha límite',
          variant: 'destructive'
        });
        return;
      }
    }

    // Check if student already made a submission for this task
    if (isSubmission && user?.role === 'student') {
      const existingSubmission = comments.find(comment => 
        comment.taskId === selectedTask.id && 
        comment.studentUsername === user.username && 
        comment.isSubmission
      );
      
      if (existingSubmission) {
        toast({
          title: translate('error'),
          description: translate('alreadySubmitted'),
          variant: 'destructive'
        });
        return;
      }
    }

    const comment: TaskComment = {
      id: `comment_${Date.now()}`,
      taskId: selectedTask.id,
      studentUsername: user?.username || '',
      studentName: user?.displayName || '',
      comment: newComment,
      timestamp: new Date().toISOString(),
      isSubmission: user?.role === 'student' ? isSubmission : false, // Solo estudiantes pueden hacer entregas
      attachments: commentAttachments,
      userRole: user?.role || 'student',
      readBy: user?.role === 'teacher' ? [] : [user?.username || ''], // Teachers: not read by anyone yet, Students: read by themselves
      isNew: user?.role === 'teacher' // Teacher comments are new for students
    };

    const updatedComments = [...comments, comment];
    saveComments(updatedComments);

    // Si es un comentario del profesor, crear notificaciones para todos los estudiantes del curso
    // SOLO si la tarea no fue recién creada (evitar notificaciones duplicadas)
    if (user?.role === 'teacher') {
      const taskCreatedAt = new Date(selectedTask.createdAt).getTime();
      const now = new Date().getTime();
      const timeSinceCreation = now - taskCreatedAt;
      
      // Solo crear notificaciones de comentario si han pasado más de 5 minutos desde la creación de la tarea
      // Esto evita notificaciones duplicadas cuando el profesor agrega comentarios inmediatamente después de crear la tarea
      if (timeSinceCreation > 5 * 60 * 1000) { // 5 minutos en millisegundos
        TaskNotificationManager.createTeacherCommentNotifications(
          selectedTask.id,
          selectedTask.title,
          selectedTask.course,
          selectedTask.subject,
          user.username,
          user.displayName || user.username,
          newComment
        );
      }
    }

    // Update task status if this is a submission
    if (isSubmission && user?.role === 'student') {
      // Verificar si todos los estudiantes del curso han entregado la tarea
      // (pasando los comentarios actualizados)
      const allSubmitted = TaskNotificationManager.checkAllStudentsSubmitted(
        selectedTask.id,
        selectedTask.course,
        updatedComments
      );

      const updatedTasks = tasks.map(task => 
        task.id === selectedTask.id 
          ? { ...task, status: allSubmitted ? 'completed' as const : 'pending' as const }
          : task
      );
      saveTasks(updatedTasks);
      setTasks(updatedTasks); // Update local state immediately

      // Crear notificación para el profesor cuando un estudiante entrega una tarea
      if (user?.role === 'student') {
        TaskNotificationManager.createTaskSubmissionNotification(
          selectedTask.id,
          selectedTask.title,
          selectedTask.course,
          selectedTask.subject,
          user.username,
          user.displayName || user.username,
          selectedTask.assignedBy
        );

        // Marcar la notificación de nueva tarea como leída ya que el estudiante entregó
        TaskNotificationManager.markNewTaskNotificationAsReadOnSubmission(
          selectedTask.id,
          user.username
        );

        // Si todos los estudiantes entregaron, crear notificación de tarea completada
        if (allSubmitted) {
          TaskNotificationManager.createTaskCompletedNotification(
            selectedTask.id,
            selectedTask.title,
            selectedTask.course,
            selectedTask.subject,
            selectedTask.assignedBy
          );
        }
      }
    }

    setNewComment('');
    setIsSubmission(false);
    setCommentAttachments([]);

    toast({
      title: isSubmission ? translate('taskSubmitted') : translate('commentAdded'),
      description: isSubmission ? translate('taskSubmittedDesc') : translate('commentAddedDesc'),
    });
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      subject: task.subject,
      course: task.course,
      assignedTo: task.assignedTo,
      assignedStudents: task.assignedStudents || [],
      dueDate: task.dueDate,
      priority: task.priority,
      taskType: task.taskType || 'assignment',
      evaluationConfig: task.evaluationConfig || {
        topic: '',
        questionCount: 15,
        timeLimit: 30
      }
    });
    setShowEditDialog(true);
  };

  const handleUpdateTask = () => {
    if (!selectedTask || !formData.title || !formData.description || !formData.course || !formData.dueDate) {
      toast({
        title: translate('error'),
        description: translate('completeAllFields'),
        variant: 'destructive'
      });
      return;
    }

    // Validar campos específicos para evaluaciones
    if (formData.taskType === 'evaluation' && !formData.evaluationConfig?.topic) {
      toast({
        title: translate('error'),
        description: translate('evaluationTopicRequired') || 'El tema de la evaluación es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    const updatedTask: Task = {
      ...selectedTask,
      title: formData.title,
      description: formData.description,
      subject: formData.subject,
      course: formData.course,
      assignedTo: formData.assignedTo,
      assignedStudents: formData.assignedTo === 'student' ? formData.assignedStudents : undefined,
      dueDate: formData.dueDate,
      priority: formData.priority,
      taskType: formData.taskType
    };
    
    // Actualizar configuración específica de evaluación si es necesario
    if (formData.taskType === 'evaluation' && formData.evaluationConfig) {
      updatedTask.evaluationConfig = {
        topic: formData.evaluationConfig.topic || '',
        questionCount: formData.evaluationConfig.questionCount || 15,
        timeLimit: formData.evaluationConfig.timeLimit || 30
      };
    } else {
      // Si no es evaluación, eliminar la configuración de evaluación
      delete updatedTask.evaluationConfig;
    }

    const updatedTasks = tasks.map(task => 
      task.id === selectedTask.id ? updatedTask : task
    );
    saveTasks(updatedTasks);

    toast({
      title: translate('taskUpdated'),
      description: translate('taskUpdatedDesc', { title: formData.title }),
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      subject: '',
      course: '',
      assignedTo: 'course',
      assignedStudents: [],
      dueDate: '',
      priority: 'medium',
      taskType: 'assignment',
      evaluationConfig: {
        topic: '',
        questionCount: 15,
        timeLimit: 30
      }
    });
    setSelectedTask(null);
    setShowEditDialog(false);
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;

    console.log(`[DeleteTask] Deleting task: ${taskToDelete.title} (ID: ${taskToDelete.id})`);

    // 1. Eliminar de tareas globales
    const updatedTasks = tasks.filter(task => task.id !== taskToDelete.id);
    saveTasks(updatedTasks);

    // 2. Eliminar comentarios relacionados
    const updatedComments = comments.filter(comment => comment.taskId !== taskToDelete.id);
    saveComments(updatedComments);

    // 3. 🔥 NUEVO: Eliminar de tareas individuales de cada usuario
    try {
      const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
      let totalUsersUpdated = 0;
      
      Object.keys(allUsers).forEach(username => {
        const userTasksKey = `userTasks_${username}`;
        const userTasks = JSON.parse(localStorage.getItem(userTasksKey) || '[]');
        const filteredUserTasks = userTasks.filter((task: any) => task.id !== taskToDelete.id);
        
        if (filteredUserTasks.length !== userTasks.length) {
          localStorage.setItem(userTasksKey, JSON.stringify(filteredUserTasks));
          totalUsersUpdated++;
          console.log(`[DeleteTask] Removed task ${taskToDelete.id} from user ${username}`);
        }
      });

      console.log(`[DeleteTask] Updated ${totalUsersUpdated} user task lists`);

      // 4. 🔥 NUEVO: Eliminar notificaciones relacionadas con esta tarea
      const notifications = JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]');
      const filteredNotifications = notifications.filter((n: any) => n.taskId !== taskToDelete.id);
      
      if (filteredNotifications.length !== notifications.length) {
        localStorage.setItem('smart-student-task-notifications', JSON.stringify(filteredNotifications));
        console.log(`[DeleteTask] Removed ${notifications.length - filteredNotifications.length} related notifications`);
      }

    } catch (error) {
      console.error('[DeleteTask] Error cleaning up user data:', error);
    }

    toast({
      title: translate('taskDeleted'),
      description: translate('taskDeletedDesc', { title: taskToDelete.title }),
    });

    setTaskToDelete(null);
    setShowDeleteDialog(false);
    
    // 5. Disparar eventos para actualizar las interfaces
    window.dispatchEvent(new Event('taskNotificationsUpdated'));
    window.dispatchEvent(new Event('tasksUpdated'));
  };

  const getTaskComments = (taskId: string) => {
    let filteredComments = comments.filter(comment => comment.taskId === taskId);
    
    // Si es un estudiante, filtrar para que solo vea:
    // 1. Sus propios comentarios y entregas
    // 2. Comentarios normales de otros estudiantes (NO sus entregas/trabajos)
    // 3. Todos los comentarios del profesor
    if (user?.role === 'student') {
      filteredComments = filteredComments.filter(comment => {
        // Mostrar sus propios comentarios y entregas
        if (comment.studentUsername === user.username) {
          return true;
        }
        
        // Mostrar todos los comentarios del profesor y admin
        if (comment.userRole === 'teacher' || comment.userRole === 'admin') {
          return true;
        }
        
        // Compatibilidad hacia atrás: identificar profesores y admins por lista de usuarios
        if (!comment.userRole) {
          const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
          const commentUser = allUsers.find((u: any) => u.username === comment.studentUsername);
          if (commentUser?.role === 'teacher' || commentUser?.role === 'admin') {
            return true;
          }
        }
        
        // Para otros estudiantes: solo mostrar comentarios normales, NO entregas
        if ((comment.userRole === 'student' || !comment.userRole) && comment.studentUsername !== user.username) {
          return !comment.isSubmission;
        }
        
        return false;
      });
    }
    
    return filteredComments.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-orange-200 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200 hover:bg-orange-200 hover:text-orange-900 focus:bg-orange-200 focus:text-orange-900 dark:hover:bg-orange-900/40 dark:hover:text-orange-200';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 hover:bg-orange-100 hover:text-orange-800 focus:bg-orange-100 focus:text-orange-800 dark:hover:bg-orange-900/20 dark:hover:text-orange-300';
      case 'low': return 'bg-orange-50 text-orange-700 dark:bg-orange-900/10 dark:text-orange-400 hover:bg-orange-50 hover:text-orange-700 focus:bg-orange-50 focus:text-orange-700 dark:hover:bg-orange-900/10 dark:hover:text-orange-400';
      default: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 hover:bg-orange-100 hover:text-orange-800 focus:bg-orange-100 focus:text-orange-800 dark:hover:bg-orange-900/20 dark:hover:text-orange-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-100 hover:text-gray-800 focus:bg-gray-100 focus:text-gray-800 dark:hover:bg-gray-900/20 dark:hover:text-gray-400';
      case 'completed': return 'bg-orange-300 text-orange-900 dark:bg-orange-800/30 dark:text-orange-100 hover:bg-orange-300 hover:text-orange-900 focus:bg-orange-300 focus:text-orange-900 dark:hover:bg-orange-800/30 dark:hover:text-orange-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-100 hover:text-gray-800 focus:bg-gray-100 focus:text-gray-800 dark:hover:bg-gray-900/20 dark:hover:text-gray-400';
    }
  };

  const getTaskTypeBadge = (taskType: 'assignment' | 'evaluation') => {
    switch (taskType) {
      case 'evaluation':
        return {
          className: 'bg-orange-400 text-orange-900 dark:bg-orange-600/50 dark:text-orange-100 border-orange-300 dark:border-orange-500 hover:bg-orange-400 hover:text-orange-900 focus:bg-orange-400 focus:text-orange-900 dark:hover:bg-orange-600/50 dark:hover:text-orange-100',
          icon: GraduationCap,
          text: translate('taskTypeEvaluation') || 'Evaluación'
        };
      case 'assignment':
      default:
        return {
          className: 'bg-orange-200 text-orange-800 dark:bg-orange-800/30 dark:text-orange-200 border-orange-300 dark:border-orange-600 hover:bg-orange-200 hover:text-orange-800 focus:bg-orange-200 focus:text-orange-800 dark:hover:bg-orange-800/30 dark:hover:text-orange-200',
          icon: FileText,
          text: translate('taskTypeAssignment') || 'Tarea'
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // File handling functions
  const handleFileUpload = async (files: FileList | null, isForTask: boolean = false) => {
    if (!files || files.length === 0) return;

    const newFiles: TaskFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: translate('error'),
          description: translate('fileTooLarge', { name: file.name }),
          variant: 'destructive'
        });
        continue;
      }

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;
      
      const taskFile: TaskFile = {
        id: `file_${Date.now()}_${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: base64,
        uploadedBy: user?.username || '',
        uploadedAt: new Date().toISOString()
      };

      newFiles.push(taskFile);
    }

    if (isForTask) {
      setTaskAttachments(prev => [...prev, ...newFiles]);
    } else {
      setCommentAttachments(prev => [...prev, ...newFiles]);
    }

    toast({
      title: translate('filesUploaded'),
      description: translate('filesUploadedDesc', { count: newFiles.length.toString() }),
    });
  };

  const removeFile = (fileId: string, isForTask: boolean = false) => {
    if (isForTask) {
      setTaskAttachments(prev => prev.filter(f => f.id !== fileId));
    } else {
      setCommentAttachments(prev => prev.filter(f => f.id !== fileId));
    }
  };

  const downloadFile = (file: TaskFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get current date-time in ISO format for min attribute in datetime-local inputs
  const getCurrentISODateTime = () => {
    const now = new Date();
    // Format to YYYY-MM-DDThh:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Check if student has already submitted this task
  const hasStudentSubmitted = (taskId: string, studentUsername: string) => {
    return comments.some(comment => 
      comment.taskId === taskId && 
      comment.studentUsername === studentUsername && 
      comment.isSubmission
    );
  };

  // Get student's grade for a task
  const getStudentGrade = (taskId: string, studentUsername: string) => {
    // Buscar la tarea para determinar si es una evaluación
    const task = tasks.find(t => t.id === taskId);
    
    if (task?.taskType === 'evaluation') {
      // Para evaluaciones, obtener el porcentaje de los resultados
      const evaluationResults = getEvaluationResults(task, studentUsername);
      return evaluationResults?.completionPercentage;
    } else {
      // Para tareas normales, buscar en comentarios/entregas
      const submission = comments.find(comment => 
        comment.taskId === taskId && 
        comment.studentUsername === studentUsername && 
        comment.isSubmission && 
        comment.grade !== undefined
      );
      return submission?.grade;
    }
  };

  // Get task status for a specific student
  const getTaskStatusForStudent = (task: Task, studentUsername: string) => {
    console.log(`🔍 Checking task status for: ${task.title} (${task.id}) - Student: ${studentUsername}`);
    
    // Verificar si la fecha límite ha vencido
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const isExpired = dueDate <= now;
    
    console.log(`⏰ Due date check for ${task.title}:`, {
      dueDate: task.dueDate,
      isExpired,
      taskStatus: task.status
    });
    
    // Para evaluaciones, verificar si el estudiante la ha completado
    if (task.taskType === 'evaluation') {
      console.log(`📊 Task is evaluation, checking completion status...`);
      
      // Verificar en evaluationResults si existe
      if (task.evaluationResults && task.evaluationResults[studentUsername]) {
        console.log(`✅ Found evaluation results in task.evaluationResults:`, task.evaluationResults[studentUsername]);
        return 'completed'; // Evaluation completed
      }
      
      // También revisar en el localStorage del usuario específico
      if (user?.username === studentUsername) {
        const userTasksKey = `userTasks_${studentUsername}`;
        const userTasks = JSON.parse(localStorage.getItem(userTasksKey) || '[]');
        const userTask = userTasks.find((ut: any) => ut.id === task.id);
        console.log(`📋 Checking user task in localStorage:`, userTask);
        
        if (userTask && userTask.status === 'completed') {
          console.log(`✅ Found completed evaluation in user tasks:`, {
            status: userTask.status,
            score: userTask.score,
            completionPercentage: userTask.completionPercentage,
            completedAt: userTask.completedAt
          });
          return 'completed'; // Evaluation completed
        }
      }
      
      // Si la evaluación está vencida y no se completó, marcarla como finalizada
      if (isExpired) {
        console.log(`⏰ Evaluation expired and not completed for ${studentUsername}`);
        return 'expired'; // Evaluation expired
      }
      
      console.log(`❌ Evaluation not completed yet for ${studentUsername}`);
      return 'pending'; // Evaluation not completed yet
    }
    
    // Para tareas normales, verificar si hay submisión
    if (hasStudentSubmitted(task.id, studentUsername)) {
      return 'submitted'; // Student has submitted
    }
    
    // Si la tarea está vencida y no se entregó, marcarla como vencida
    if (isExpired) {
      console.log(`⏰ Task expired and not submitted for ${studentUsername}`);
      return 'expired'; // Task expired
    }
    
    return 'pending'; // Student hasn't submitted yet
  };

  // Get status display text for student
  const getStatusTextForStudent = (task: Task, studentUsername: string) => {
    const status = getTaskStatusForStudent(task, studentUsername);
    switch (status) {
      case 'submitted': return translate('statusSubmitted');
      case 'completed': return translate('statusCompleted');
      case 'expired': return translate('statusExpired') || 'Vencida';
      case 'pending': return translate('statusPending');
      default: return translate('statusPending');
    }
  };

  // Get status color for student
  const getStatusColorForStudent = (task: Task, studentUsername: string) => {
    const status = getTaskStatusForStudent(task, studentUsername);
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 cursor-default pointer-events-none';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 cursor-default pointer-events-none';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 cursor-default pointer-events-none';
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 cursor-default pointer-events-none';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 cursor-default pointer-events-none';
    }
  };

  // Get evaluation results for a student
  const getEvaluationResults = (task: Task, studentUsername: string) => {
    if (task.taskType !== 'evaluation') return null;
    
    console.log(`🔍 Getting evaluation results for: ${task.title} - Student: ${studentUsername}`);
    
    // First check evaluationResults in the task
    if (task.evaluationResults && task.evaluationResults[studentUsername]) {
      console.log(`✅ Found results in task.evaluationResults:`, task.evaluationResults[studentUsername]);
      return task.evaluationResults[studentUsername];
    }
    
    // Then check user-specific localStorage
    if (user?.username === studentUsername) {
      const userTasksKey = `userTasks_${studentUsername}`;
      const userTasks = JSON.parse(localStorage.getItem(userTasksKey) || '[]');
      const userTask = userTasks.find((ut: any) => ut.id === task.id);
      console.log(`📋 Checking user task for results:`, userTask);
      
      if (userTask && userTask.status === 'completed') {
        const results = {
          score: userTask.score || 0,
          completionPercentage: userTask.completionPercentage || 0,
          completedAt: userTask.completedAt,
          totalQuestions: userTask.evaluationConfig?.questionCount || task.evaluationConfig?.questionCount || 0
        };
        console.log(`✅ Found results in user tasks:`, results);
        return results;
      }
    }
    
    console.log(`❌ No evaluation results found for ${studentUsername}`);
    return null;
  };

  // Helper function to get all student usernames
  const getAllStudentUsernames = () => {
    const usersObj = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
    console.log('👥 All users in localStorage:', Object.keys(usersObj));
    
    const studentUsernames = Object.entries(usersObj)
      .filter(([_, userData]: [string, any]) => userData.role === 'student')
      .map(([username, _]: [string, any]) => username);
    
    console.log('🎓 Student usernames found:', studentUsernames);
    return studentUsernames;
  };

  // Helper function to get student user data
  const getStudentUserData = (username: string) => {
    const usersObj = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
    return usersObj[username] || { displayName: username, activeCourses: [] };
  };

  // 🔧 FUNCIÓN DE DIAGNÓSTICO MEJORADA - Para debug manual
  const debugEvaluationResults = (taskId: string) => {
    console.log('🔍 === DIAGNÓSTICO COMPLETO DE EVALUACIÓN ===');
    console.log('📋 Task ID:', taskId);
    
    // 1. Verificar tarea global
    const globalTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
    const globalTask = globalTasks.find((t: any) => t.id === taskId);
    console.log('📊 Global task:', globalTask);
    console.log('📊 Global task evaluation results:', globalTask?.evaluationResults);
    
    if (!globalTask) {
      console.error('❌ Global task not found!');
      return;
    }
    
    // 2. Verificar usuarios
    const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
    console.log('👥 All users object keys:', Object.keys(allUsers));
    
    const students = Object.entries(allUsers).filter(([_, data]: [string, any]) => data.role === 'student');
    console.log('🎓 Students found:', students.map(([username, _]) => username));
    
    // 3. Verificar estudiantes asignados a esta tarea
    const assignedStudents: string[] = [];
    students.forEach(([studentUsername, userData]: [string, any]) => {
      const isAssigned = globalTask.assignedTo === 'course' 
        ? userData.activeCourses?.includes(globalTask.course)
        : globalTask.assignedStudents?.includes(studentUsername);
      
      if (isAssigned) {
        assignedStudents.push(studentUsername);
        console.log(`🎯 ${studentUsername} is assigned to this task (course: ${globalTask.course})`);
        console.log(`👤 ${studentUsername} active courses:`, userData.activeCourses);
      }
    });
    
    console.log('📝 Total assigned students:', assignedStudents);
    
    // 4. Verificar userTasks de cada estudiante asignado
    assignedStudents.forEach((studentUsername: string) => {
      console.log(`\n🔍 === ANÁLISIS DE ${studentUsername} ===`);
      
      const userTasksKey = `userTasks_${studentUsername}`;
      const userTasksString = localStorage.getItem(userTasksKey);
      console.log(`📋 localStorage key "${userTasksKey}":`, userTasksString ? 'EXISTS' : 'NOT FOUND');
      
      if (userTasksString) {
        try {
          const userTasks = JSON.parse(userTasksString);
          console.log(`📋 ${studentUsername} - Total tasks:`, userTasks.length);
          console.log(`📋 ${studentUsername} - All task IDs:`, userTasks.map((t: any) => t.id));
          
          const userTask = userTasks.find((ut: any) => ut.id === taskId);
          if (userTask) {
            console.log(`✅ ${studentUsername} - Found matching task:`, userTask);
            console.log(`📊 ${studentUsername} - Task status:`, userTask.status);
            console.log(`📊 ${studentUsername} - Completion percentage:`, userTask.completionPercentage);
            console.log(`📊 ${studentUsername} - Score:`, userTask.score);
            console.log(`📊 ${studentUsername} - Completed at:`, userTask.completedAt);
            console.log(`📊 ${studentUsername} - Has evaluation config:`, !!userTask.evaluationConfig);
            
            if (userTask.evaluationConfig) {
              console.log(`📊 ${studentUsername} - Evaluation config:`, userTask.evaluationConfig);
            }
          } else {
            console.log(`❌ ${studentUsername} - No matching task found for ID: ${taskId}`);
          }
        } catch (error) {
          console.error(`❌ ${studentUsername} - Error parsing userTasks:`, error);
        }
      } else {
        console.log(`❌ ${studentUsername} - No userTasks found in localStorage`);
      }
    });
    
    // 5. Verificar localStorage keys disponibles
    console.log('\n📂 Available localStorage keys:');
    const allKeys = Object.keys(localStorage);
    const userTaskKeys = allKeys.filter(key => key.startsWith('userTasks_'));
    console.log('� UserTask keys found:', userTaskKeys);
    
    // 6. Intentar reconstruir resultados manualmente
    console.log('\n🔧 === INTENTO DE RECONSTRUCCIÓN MANUAL ===');
    const reconstructedResults: any = {};
    
    assignedStudents.forEach((studentUsername: string) => {
      const userTasksKey = `userTasks_${studentUsername}`;
      const userTasksString = localStorage.getItem(userTasksKey);
      
      if (userTasksString) {
        try {
          const userTasks = JSON.parse(userTasksString);
          const userTask = userTasks.find((ut: any) => ut.id === taskId);
          
          if (userTask) {
            reconstructedResults[studentUsername] = {
              score: userTask.score || 0,
              completionPercentage: userTask.completionPercentage || 0,
              completedAt: userTask.completedAt || 'Unknown',
              totalQuestions: userTask.evaluationConfig?.questionCount || globalTask.evaluationConfig?.questionCount || 0,
              status: userTask.status || 'pending'
            };
            
            console.log(`✅ Reconstructed for ${studentUsername}:`, reconstructedResults[studentUsername]);
          }
        } catch (error) {
          console.error(`❌ Error reconstructing for ${studentUsername}:`, error);
        }
      }
    });
    
    console.log('🔧 Final reconstructed results:', reconstructedResults);
    console.log('🔍 === FIN DIAGNÓSTICO ===');
    
    return reconstructedResults;
  };

  // Exponer función de debug globalmente para uso en consola del navegador
  useEffect(() => {
    (window as any).debugEvaluationResults = debugEvaluationResults;
    return () => {
      delete (window as any).debugEvaluationResults;
    };
  }, []);

  // Get all evaluation results for a task (for teacher view)
  const getAllEvaluationResults = (task: Task) => {
    if (task.taskType !== 'evaluation') return [];
    
    console.log('🔍 getAllEvaluationResults called for task:', task.id, task.title);
    console.log('📊 Current task.evaluationResults:', task.evaluationResults);
    
    // 🚨 DEBUG: Verificar datos completos en localStorage
    console.log('🔍 DEBUG: Checking all localStorage data...');
    const allTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
    const thisTask = allTasks.find((t: any) => t.id === task.id);
    console.log('📊 Task from localStorage:', thisTask);
    console.log('📊 EvaluationResults from localStorage:', thisTask?.evaluationResults);
    
    // 🔧 MEJORA: Forzar recarga completa de datos desde localStorage
    const freshTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
    const freshTask = freshTasks.find((t: any) => t.id === task.id);
    if (freshTask) {
      console.log('🔄 Using fresh task data from localStorage:', freshTask.evaluationResults);
      task = freshTask; // Usar la tarea más actualizada
    } else {
      console.warn('⚠️ Fresh task not found in localStorage!');
    }
    
    const results: Array<{
      studentUsername: string;
      studentName: string;
      score: number;
      completionPercentage: number;
      completedAt: string;
      totalQuestions: number;
    }> = [];
    
    // Get all students who should take this evaluation
    const targetStudents = task.assignedTo === 'course' 
      ? getAllStudentUsernames().filter(student => {
          const userData = getStudentUserData(student);
          return userData.activeCourses?.includes(task.course);
        })
      : task.assignedStudents || [];
    
    console.log('👥 Target students for evaluation:', targetStudents);
    console.log('📋 Available localStorage keys:', Object.keys(localStorage).filter(key => key.includes('userTasks')));
    
    // 🔧 NUEVO: Bandera para tracking de sincronización
    let needsSync = false;
    
    targetStudents.forEach(studentUsername => {
      console.log(`🔍 Checking results for student: ${studentUsername}`);
      
      let foundResult = false;
      
      // 🔧 PRIMERO: Check exhaustivo en student's localStorage (más fiable)
      const userTasksKey = `userTasks_${studentUsername}`;
      const userTasksString = localStorage.getItem(userTasksKey);
      console.log(`📋 Checking ${userTasksKey}:`, userTasksString ? 'EXISTS' : 'NOT FOUND');
      
      if (userTasksString) {
        try {
          const userTasks = JSON.parse(userTasksString);
          const userTask = userTasks.find((ut: any) => ut.id === task.id);
          console.log(`📋 User task for ${studentUsername}:`, userTask);
          
          if (userTask && userTask.status === 'completed' && userTask.completionPercentage !== undefined) {
            console.log(`✅ Found completed evaluation in user tasks for ${studentUsername}:`, {
              score: userTask.score,
              completionPercentage: userTask.completionPercentage,
              completedAt: userTask.completedAt
            });
            
            // 🔧 SINCRONIZACIÓN: Actualizar los resultados en la tarea global si no existen o están desactualizados
            if (!task.evaluationResults) {
              task.evaluationResults = {};
              needsSync = true;
              console.log('🔄 Initializing task.evaluationResults');
            }
            if (!task.evaluationResults[studentUsername] || 
                task.evaluationResults[studentUsername].completionPercentage !== userTask.completionPercentage) {
              const resultData = {
                score: userTask.score || 0,
                completionPercentage: userTask.completionPercentage || 0,
                completedAt: userTask.completedAt,
                totalQuestions: userTask.evaluationConfig?.questionCount || task.evaluationConfig?.questionCount || 0,
                attempt: 1 // Agregar campo attempt requerido
              };
              
              task.evaluationResults[studentUsername] = resultData;
              needsSync = true;
              console.log(`🔧 Synced evaluation results for ${studentUsername} to global task:`, resultData);
            }
            
            results.push({
              studentUsername,
              studentName: getStudentUserData(studentUsername).displayName || studentUsername,
              score: userTask.score || 0,
              completionPercentage: userTask.completionPercentage || 0,
              completedAt: userTask.completedAt,
              totalQuestions: userTask.evaluationConfig?.questionCount || task.evaluationConfig?.questionCount || 0
            });
            foundResult = true;
          } else {
            console.log(`❌ User task for ${studentUsername} not completed or missing data:`, {
              exists: !!userTask,
              status: userTask?.status,
              completionPercentage: userTask?.completionPercentage
            });
          }
        } catch (error) {
          console.error(`Error parsing userTasks for ${studentUsername}:`, error);
        }
      } else {
        console.log(`❌ No userTasks found for ${studentUsername}`);
      }
      
      // 🔧 SEGUNDO: Check if student has completed evaluation in task.evaluationResults (solo si no se encontró en userTasks)
      if (!foundResult && task.evaluationResults && task.evaluationResults[studentUsername]) {
        const result = task.evaluationResults[studentUsername];
        console.log(`✅ Found results in task.evaluationResults for ${studentUsername}:`, result);
        results.push({
          studentUsername,
          studentName: getStudentUserData(studentUsername).displayName || studentUsername,
          ...result
        });
        foundResult = true;
      }
      
      // 🔧 ÚLTIMO: Si no se encontró resultado, agregar estudiante con 0% (no completó o fuera de tiempo)
      if (!foundResult) {
        console.log(`❌ No results found for ${studentUsername}, adding as incomplete (0%)`);
        
        // Verificar si la evaluación está vencida
        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const isExpired = now > dueDate;
        
        results.push({
          studentUsername,
          studentName: getStudentUserData(studentUsername).displayName || studentUsername,
          score: 0,
          completionPercentage: 0,
          completedAt: isExpired ? 'Expirada' : 'Pendiente',
          totalQuestions: task.evaluationConfig?.questionCount || 0
        });
      }
    });
    
    // 🔧 CRUCIAL: Guardar cambios sincronizados en localStorage si es necesario
    if (needsSync) {
      console.log('💾 Saving synchronized evaluation results to localStorage');
      
      // Actualizar la tarea en el array de tareas
      const currentTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
      const updatedTasks = currentTasks.map((t: any) => 
        t.id === task.id ? { ...t, evaluationResults: task.evaluationResults } : t
      );
      
      // Guardar las tareas actualizadas
      localStorage.setItem('smart-student-tasks', JSON.stringify(updatedTasks));
      
      // También actualizar el estado local si es la tarea seleccionada
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask({ ...selectedTask, evaluationResults: task.evaluationResults });
      }
      
      // Actualizar el estado de tareas
      const updatedTasksState = tasks.map(t => 
        t.id === task.id ? { ...t, evaluationResults: task.evaluationResults } : t
      );
      setTasks(updatedTasksState);
      
      console.log('✅ Synchronized evaluation results saved successfully');
    }
    
    console.log('📊 Final evaluation results:', results);
    return results.sort((a, b) => b.completionPercentage - a.completionPercentage); // Sort by highest score first
  };

  // Delete student submission to allow re-submission
  const handleDeleteSubmission = (commentId: string) => {
    const commentToDelete = comments.find(c => c.id === commentId);
    if (!commentToDelete || !selectedTask) return;

    // Different confirmation messages for teacher and student
    const isTeacher = user?.role === 'teacher';
    const isGraded = commentToDelete.grade !== undefined;
    
    let confirmMessage = translate('confirmDeleteSubmission');
    if (isTeacher && isGraded) {
      confirmMessage = translate('confirmDeleteGradedSubmission', { 
        student: commentToDelete.studentName,
        grade: commentToDelete.grade?.toString() || '0'
      });
    } else if (isTeacher) {
      confirmMessage = translate('confirmDeleteSubmissionAsTeacher', { 
        student: commentToDelete.studentName 
      });
    }

    // Show confirmation dialog
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Remove the submission comment
    const updatedComments = comments.filter(comment => comment.id !== commentId);
    saveComments(updatedComments);

    // Update task status back to pending if this was the only submission
    const remainingSubmissions = updatedComments.filter(comment => 
      comment.taskId === selectedTask.id && comment.isSubmission
    );

    if (remainingSubmissions.length === 0) {
      const updatedTasks = tasks.map(task => 
        task.id === selectedTask.id 
          ? { ...task, status: 'pending' as const }
          : task
      );
      saveTasks(updatedTasks);
    }

    // Different success messages
    const successTitle = isTeacher ? translate('submissionDeletedByTeacher') : translate('submissionDeleted');
    const successDesc = isTeacher 
      ? translate('submissionDeletedByTeacherDesc', { student: commentToDelete.studentName })
      : translate('submissionDeletedDesc');

    toast({
      title: successTitle,
      description: successDesc,
    });
  };

  // Nueva función para calificar entregas
  const handleGradeSubmission = (comment: TaskComment) => {
    setGradingComment(comment);
    setGradeValue(comment.grade || 100);
    setFeedbackValue(comment.feedback || '');
    setShowGradingDialog(true);
  };

  // Función para guardar la calificación
  const handleSaveGrade = () => {
    if (!gradingComment || !selectedTask) return;

    const updatedComments = comments.map(comment => 
      comment.id === gradingComment.id 
        ? {
            ...comment,
            grade: gradeValue,
            feedback: feedbackValue,
            gradedBy: user?.username || '',
            gradedAt: new Date().toISOString()
          }
        : comment
    );

    saveComments(updatedComments);

    // Crear notificación de calificación para el estudiante
    TaskNotificationManager.createGradeNotification(
      selectedTask.id,
      selectedTask.title,
      selectedTask.course,
      selectedTask.subject,
      gradingComment.studentUsername,
      user?.username || '',
      user?.displayName || user?.username || '',
      gradeValue
    );

    // Verificar si todos los estudiantes han sido evaluados para eliminar notificación pendiente
    if (user?.role === 'teacher') {
      TaskNotificationManager.checkAndUpdateGradingStatus(
        selectedTask.id,
        selectedTask.course,
        user.username
      );
    }

    toast({
      title: translate('gradeAssigned'),
      description: translate('gradeAssignedDesc', { 
        student: gradingComment.studentName,
        percentage: gradeValue.toString()
      }),
    });

    setShowGradingDialog(false);
    setGradingComment(null);
    setGradeValue(100);
    setFeedbackValue('');
  };

  const filteredTasks = getFilteredTasks();

  // Get students with their task status for a specific task
  const getStudentsWithTaskStatus = (task: Task) => {
    if (!task) return [];
    
    let students: any[] = [];
    
    if (task.assignedTo === 'course') {
      // Get all students from the course
      students = getStudentsForCourse(task.course);
      
      // Debug log para comparar con checkAllStudentsSubmitted
      console.log('=== DEBUG getStudentsWithTaskStatus ===');
      console.log('Task:', task.title, 'Course:', task.course);
      console.log('Students found by getStudentsForCourse:', students.length, students.map(s => s.username));
      
    } else if (task.assignedTo === 'student' && task.assignedStudents) {
      // Get only specifically assigned students
      const usersObj = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
      
      // Convertir el objeto de usuarios en un array y filtrar los estudiantes asignados
      students = Object.entries(usersObj)
        .filter(([username, userData]: [string, any]) => 
          userData.role === 'student' && task.assignedStudents?.includes(username)
        )
        .map(([username, userData]: [string, any]) => ({
          username,
          displayName: userData.displayName || username
        }));
    }
    
    // Add submission status to each student
    return students.map((student: any) => {
      const submission = comments.find(comment => 
        comment.taskId === task.id && 
        comment.studentUsername === student.username && 
        comment.isSubmission
      );
      
      // Debug log para este estudiante específico
      console.log(`Student: ${student.username}, hasSubmission: ${!!submission}`, submission);
      
      return {
        ...student,
        hasSubmitted: !!submission,
        submissionDate: submission?.timestamp,
        submission: submission
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <ClipboardList className="w-8 h-8 mr-3 text-orange-600" />
            {translate('tasksPageTitle')}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'teacher' 
              ? translate('tasksPageSubTeacher')
              : translate('tasksPageSubStudent')
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {user?.role === 'teacher' && (
            <>
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 ${viewMode === 'list' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'hover:bg-orange-50 hover:text-orange-700'}`}
                >
                  {translate('listView')}
                </Button>
                <Button
                  variant={viewMode === 'course' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('course')}
                  className={`px-3 py-1 ${viewMode === 'course' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'hover:bg-orange-50 hover:text-orange-700'}`}
                >
                  {translate('courseView')}
                </Button>
              </div>

              {/* Course Filter */}
              <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                <SelectTrigger className="w-48 border-orange-300 focus:border-orange-500 focus:ring-orange-500">
                  <SelectValue placeholder={translate('filterByCourse')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="focus:bg-orange-100 focus:text-orange-900 data-[state=checked]:bg-orange-100 data-[state=checked]:text-orange-900">{translate('allCourses')}</SelectItem>
                  {getAvailableCourses().map(course => (
                    <SelectItem key={course} value={course} className="focus:bg-orange-100 focus:text-orange-900 data-[state=checked]:bg-orange-100 data-[state=checked]:text-orange-900">{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={() => setShowCreateDialog(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                {translate('newTask')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tasks Display */}
      <div className="space-y-6">
        {user?.role === 'teacher' && viewMode === 'course' ? (
          /* Course View for Teachers */
          Object.keys(getTasksByCourse()).length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {translate('tasksEmptyTeacher')}
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(getTasksByCourse()).map(([course, courseTasks]) => {
              const stats = getCourseStats()[course];
              return (
                <Card key={course} className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl flex items-center">
                          <Users className="w-5 h-5 mr-2" />
                          {course}
                        </CardTitle>
                        <div className="flex items-center space-x-4 mt-2">
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                            {translate('totalTasks')}: {stats.total}
                          </Badge>
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            {translate('statusCompleted')}: {stats.completed}
                          </Badge>
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                            {translate('statusPending')}: {stats.pending}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {courseTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{task.title}</h4>
                              {(() => {
                                const typeBadge = getTaskTypeBadge(task.taskType || 'assignment');
                                const IconComponent = typeBadge.icon;
                                return (
                                  <Badge variant="outline" className={`${typeBadge.className} cursor-default pointer-events-none`}>
                                    <IconComponent className="w-3 h-3 mr-1" />
                                    {typeBadge.text}
                                  </Badge>
                                );
                              })()}
                              <Badge className={`${getPriorityColor(task.priority)} cursor-default pointer-events-none`}>
                                {task.priority === 'high' ? translate('priorityHigh') : 
                                 task.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                              </Badge>
                              <Badge className={`${user?.role === 'student' ? getStatusColorForStudent(task, user.username) : getStatusColor(task.status)} cursor-default pointer-events-none`}>
                                {user?.role === 'student' ? getStatusTextForStudent(task, user.username) : (task.status === 'pending' ? translate('statusPending') : translate('statusCompleted'))}
                              </Badge>
                              {user?.role === 'student' && (() => {
                                const grade = getStudentGrade(task.id, user.username);
                                return grade !== undefined ? (
                                  <Badge className="bg-orange-300 text-orange-900 dark:bg-orange-700/40 dark:text-orange-100 cursor-default pointer-events-none">
                                    {grade}%
                                  </Badge>
                                ) : null;
                              })()}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {translate('duePrefix')} {formatDate(task.dueDate)}
                              </span>
                              <span className="flex items-center">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                {getTaskComments(task.id).length} {translate('commentsCount')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // NUEVO: Forzar recarga de datos antes de mostrar la tarea (especialmente para evaluaciones)
                                if (task.taskType === 'evaluation' && user?.role === 'teacher') {
                                  console.log('🔄 Teacher opening evaluation task, forcing complete data reload...');
                                  console.log('📊 Current task data:', task);
                                  
                                  // 🚨 EJECUTAR SINCRONIZACIÓN DE EMERGENCIA AUTOMÁTICA
                                  console.log('🚨 AUTO-EXECUTING EMERGENCY SYNC for evaluation...');
                                  
                                  // Forzar sincronización de TODOS los estudiantes automáticamente
                                  const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
                                  const students = Object.entries(allUsers).filter(([_, data]: [string, any]) => data.role === 'student');
                                  
                                  console.log('👥 Students found for auto emergency sync:', students.map(([username, _]) => username));
                                  
                                  let hasChanges = false;
                                  const currentTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
                                  const taskIndex = currentTasks.findIndex((t: any) => t.id === task.id);
                                  
                                  if (taskIndex !== -1) {
                                    if (!currentTasks[taskIndex].evaluationResults) {
                                      currentTasks[taskIndex].evaluationResults = {};
                                    }
                                    
                                    students.forEach(([studentUsername, userData]: [string, any]) => {
                                      // Verificar si el estudiante está asignado a esta evaluación
                                      const isAssigned = task.assignedTo === 'course' 
                                        ? userData.activeCourses?.includes(task.course)
                                        : task.assignedStudents?.includes(studentUsername);
                                      
                                      if (isAssigned) {
                                        const userTasksKey = `userTasks_${studentUsername}`;
                                        const userTasksString = localStorage.getItem(userTasksKey);
                                        
                                        console.log(`🔄 Auto checking ${studentUsername} (assigned: ${isAssigned})...`);
                                        
                                        if (userTasksString) {
                                          try {
                                            const userTasks = JSON.parse(userTasksString);
                                            const userTask = userTasks.find((ut: any) => ut.id === task.id);
                                            
                                            if (userTask) {
                                              console.log(`📊 Found user task for ${studentUsername}:`, {
                                                status: userTask.status,
                                                completionPercentage: userTask.completionPercentage,
                                                score: userTask.score,
                                                completedAt: userTask.completedAt
                                              });
                                              
                                              if (userTask.status === 'completed' || userTask.completionPercentage !== undefined) {
                                                console.log(`🚨 AUTO EMERGENCY SYNC: Found completed/partial task for ${studentUsername}`);
                                                
                                                currentTasks[taskIndex].evaluationResults[studentUsername] = {
                                                  score: userTask.score || 0,
                                                  completionPercentage: userTask.completionPercentage || 0,
                                                  completedAt: userTask.completedAt || new Date().toISOString(),
                                                  totalQuestions: userTask.evaluationConfig?.questionCount || task.evaluationConfig?.questionCount || 0,
                                                  attempt: 1
                                                };
                                                
                                                hasChanges = true;
                                                console.log(`✅ AUTO EMERGENCY SYNC: Updated results for ${studentUsername}`);
                                              }
                                            }
                                          } catch (error) {
                                            console.error(`❌ AUTO EMERGENCY SYNC: Error processing ${studentUsername}:`, error);
                                          }
                                        }
                                      }
                                    });
                                    
                                    if (hasChanges) {
                                      localStorage.setItem('smart-student-tasks', JSON.stringify(currentTasks));
                                      console.log('💾 AUTO EMERGENCY SYNC: Saved updated tasks to localStorage');
                                      
                                      // Actualizar el estado inmediatamente
                                      setTasks(currentTasks);
                                      console.log('✅ AUTO EMERGENCY SYNC: Updated tasks state');
                                    }
                                  }
                                  
                                  // Forzar múltiples recargas para asegurar datos actualizados
                                  loadTasks(); 
                                  
                                  setTimeout(() => {
                                    // Usar la tarea más actualizada directamente del localStorage
                                    const updatedTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
                                    const freshTask = updatedTasks.find((t: any) => t.id === task.id);
                                    
                                    if (freshTask) {
                                      console.log('📊 Using fresh task data from localStorage:', freshTask);
                                      console.log('📊 Fresh task evaluationResults:', freshTask.evaluationResults);
                                      setSelectedTask(freshTask);
                                    } else {
                                      console.log('⚠️ Fresh task not found, using original');
                                      setSelectedTask(task);
                                    }
                                    
                                    setIsSubmission(false);
                                    setShowTaskDialog(true);
                                  }, 300); // Dar más tiempo para la recarga y sincronización
                                } else {
                                  setSelectedTask(task);
                                  setIsSubmission(false); // Reset checkbox state
                                  setShowTaskDialog(true);
                                }
                                
                                // NO marcar notificaciones de nueva tarea como leídas al ver la tarea
                                // Las notificaciones de nueva tarea solo se marcan como leídas cuando se entrega la tarea
                                // Mark only grade notifications as read when student reviews the task
                                if (user?.role === 'student') {
                                  TaskNotificationManager.markGradeNotificationsAsReadOnTasksView(user.username);
                                }
                              }}
                              title={translate('viewTask')}
                              className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-500 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 transition-colors"
                              title={translate('editTask')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                              className="text-orange-800 hover:text-orange-900 hover:bg-orange-100 dark:text-orange-300 dark:hover:text-orange-200 dark:hover:bg-orange-900/30 transition-colors"
                              title={translate('deleteTask')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )
        ) : (
          /* List View (for both teachers and students) */
          <div className="grid gap-4">
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {user?.role === 'teacher' 
                      ? translate('tasksEmptyTeacher')
                      : translate('tasksEmptyStudent')
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTasks.map(task => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline">{task.subject}</Badge>
                          {(() => {
                            const typeBadge = getTaskTypeBadge(task.taskType || 'assignment');
                            const IconComponent = typeBadge.icon;
                            return (
                              <Badge variant="outline" className={`${typeBadge.className} cursor-default pointer-events-none`}>
                                <IconComponent className="w-3 h-3 mr-1" />
                                {typeBadge.text}
                              </Badge>
                            );
                          })()}
                          <Badge className={`${getPriorityColor(task.priority)} cursor-default pointer-events-none`}>
                            {task.priority === 'high' ? translate('priorityHigh') : task.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                          </Badge>
                          <Badge className={`${user?.role === 'student' ? getStatusColorForStudent(task, user.username) : getStatusColor(task.status)} cursor-default pointer-events-none`}>
                            {user?.role === 'student' ? getStatusTextForStudent(task, user.username) : (task.status === 'pending' ? translate('statusPending') : translate('statusCompleted'))}
                          </Badge>
                          {user?.role === 'student' && (() => {
                            const grade = getStudentGrade(task.id, user.username);
                            return grade !== undefined ? (
                              <Badge className="bg-orange-300 text-orange-900 dark:bg-orange-700/40 dark:text-orange-100 cursor-default pointer-events-none">
                                {grade}%
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // 🔧 MEJORA: Cargar datos frescos de localStorage antes de abrir el diálogo
                            const freshTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
                            const freshTask = freshTasks.find((t: any) => t.id === task.id);
                            
                            setSelectedTask(freshTask || task);
                            setIsSubmission(false); // Reset checkbox state
                            
                            // NO marcar notificaciones de nueva tarea como leídas al ver la tarea
                            // Las notificaciones de nueva tarea solo se marcan como leídas cuando se entrega la tarea
                            // Mark only grade notifications as read when student reviews the task
                            if (user?.role === 'student') {
                              TaskNotificationManager.markGradeNotificationsAsReadOnTasksView(user.username);
                            }
                            
                            setShowTaskDialog(true);
                          }}
                          className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20 transition-colors"
                          title={translate('viewTask')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {user?.role === 'teacher' && task.assignedBy === user.username && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-500 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                              className="text-orange-800 hover:text-orange-900 hover:bg-orange-100 dark:text-orange-300 dark:hover:text-orange-200 dark:hover:bg-orange-900/30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {task.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {translate('duePrefix')} {formatDate(task.dueDate)}
                        </span>
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {getTaskComments(task.id).length} {translate('commentsCount')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{translate('createNewTask')}</DialogTitle>
            <DialogDescription>
              {translate('createTaskDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">{translate('taskTitle')} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="col-span-3"
                placeholder={translate('taskTitlePlaceholder')}
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">{translate('taskDescription')} *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder={translate('taskDescriptionPlaceholder')}
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="course" className="text-right">{translate('taskCourse')} *</Label>
              <Select value={formData.course} onValueChange={(value) => setFormData(prev => ({ ...prev, course: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={translate('selectCourse')} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCourses().map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">{translate('taskSubject')}</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={translate('selectSubject')} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubjects().map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{translate('assignTo')}</Label>
              <Select value={formData.assignedTo} onValueChange={(value: 'course' | 'student') => setFormData(prev => ({ ...prev, assignedTo: value, assignedStudents: [] }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">{translate('assignToCourse')}</SelectItem>
                  <SelectItem value="student">{translate('assignToStudents')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.assignedTo === 'student' && formData.course && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{translate('assignToStudents')}</Label>
                <div className="col-span-3">
                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                    {getStudentsFromCourse(formData.course).length > 0 ? (
                      getStudentsFromCourse(formData.course).map(student => (
                        <div key={student.username} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`student-${student.username}`}
                            checked={formData.assignedStudents?.includes(student.username)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedStudents: [...(prev.assignedStudents || []), student.username]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedStudents: prev.assignedStudents?.filter(s => s !== student.username) || []
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`student-${student.username}`} className="cursor-pointer">
                            {student.displayName}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground py-2 text-center">
                        {translate('noEvaluationsSubtext') || "No hay estudiantes disponibles para este curso"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">{translate('dueDate')} *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
                min={getCurrentISODateTime()} // Set minimum to current date-time
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{translate('priority')}</Label>
              <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{translate('priorityLow')}</SelectItem>
                  <SelectItem value="medium">{translate('priorityMedium')}</SelectItem>
                  <SelectItem value="high">{translate('priorityHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Task Type Selector */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{translate('taskType') || "Tipo de tarea"}</Label>
              <Select value={formData.taskType} onValueChange={(value: 'assignment' | 'evaluation') => setFormData(prev => ({ ...prev, taskType: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">{translate('taskTypeAssignment') || "Tarea"}</SelectItem>
                  <SelectItem value="evaluation">{translate('taskTypeEvaluation') || "Evaluación"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Evaluation Config fields - only shown when taskType is 'evaluation' */}
            {formData.taskType === 'evaluation' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="evaluationTopic" className="text-right">{translate('evaluationTopic') || "Tema"} *</Label>
                  <Input
                    id="evaluationTopic"
                    value={formData.evaluationConfig.topic}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      evaluationConfig: { ...prev.evaluationConfig, topic: e.target.value }
                    }))}
                    className="col-span-3"
                    placeholder={translate('evaluationTopicPlaceholder') || "Tema de la evaluación"}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="questionCount" className="text-right">{translate('questionCount') || "Cantidad de preguntas"}</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min="1"
                    value={formData.evaluationConfig.questionCount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      evaluationConfig: { ...prev.evaluationConfig, questionCount: parseInt(e.target.value) || 15 }
                    }))}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="timeLimit" className="text-right">{translate('timeLimit') || "Tiempo límite (min)"}</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="5"
                    value={formData.evaluationConfig.timeLimit}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      evaluationConfig: { ...prev.evaluationConfig, timeLimit: parseInt(e.target.value) || 30 }
                    }))}
                    className="col-span-3"
                  />
                </div>
              </>
            )}

            {/* File Upload Section for Create Task */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">{translate('attachments')}</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files, true)}
                    className="hidden"
                    id="task-file-upload"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip,.rar"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('task-file-upload')?.click()}
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:bg-orange-600 focus:text-white focus:border-orange-600 active:bg-orange-700 active:text-white"
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    {translate('attachFile')}
                  </Button>
                </div>
                
                {/* Display uploaded files */}
                {taskAttachments.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {taskAttachments.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate" title={file.name}>{file.name}</span>
                          <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id, true)}
                          className="flex-shrink-0 h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-400 hover:border-gray-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            >
              {translate('cancel')}
            </Button>
            <Button onClick={handleCreateTask} className="bg-orange-600 hover:bg-orange-700 text-white">
              {formData.taskType === 'evaluation' 
                ? (translate('createEvaluation') || 'Crear Evaluación')
                : (translate('createTask') || 'Crear Tarea')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={(open) => {
        setShowTaskDialog(open);
        if (!open) {
          // Reset states when closing dialog
          setNewComment('');
          setIsSubmission(false);
          setCommentAttachments([]);
        } else if (open && selectedTask) {
          // Cuando se abre el modal, recargar datos frescos especialmente para evaluaciones
          console.log('🔄 Dialog opened, reloading fresh data for task:', selectedTask.id);
          
          if (selectedTask.taskType === 'evaluation' && user?.role === 'teacher') {
            console.log('📊 Reloading evaluation data for teacher');
            // Forzar recarga de datos para evaluaciones
            setTimeout(() => {
              forceReloadTaskData(selectedTask.id);
            }, 100);
          }
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle>{selectedTask?.title}</DialogTitle>
                <DialogDescription>
                  {selectedTask?.assignedByName} • {selectedTask?.course} • {selectedTask?.subject}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{translate('taskDescriptionDetail')}</h4>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              </div>

              {/* Botón "Realizar Evaluación" para estudiantes cuando es una evaluación */}
              {user?.role === 'student' && selectedTask?.taskType === 'evaluation' && (
                <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  {(() => {
                    console.log(`🎯 RENDERING EVALUATION UI for task: ${selectedTask.title} (${selectedTask.id})`);
                    console.log(`📊 Task data:`, {
                      taskType: selectedTask.taskType,
                      status: selectedTask.status,
                      evaluationConfig: selectedTask.evaluationConfig,
                      evaluationResults: selectedTask.evaluationResults
                    });
                    
                    // Verificar si la fecha límite ha vencido
                    const now = new Date();
                    const dueDate = new Date(selectedTask.dueDate);
                    const isExpired = dueDate <= now;
                    
                    console.log(`⏰ Due date check:`, {
                      dueDate: selectedTask.dueDate,
                      dueDateParsed: dueDate.toISOString(),
                      now: now.toISOString(),
                      isExpired
                    });
                    
                    const evaluationResults = getEvaluationResults(selectedTask, user.username);
                    const isCompleted = getTaskStatusForStudent(selectedTask, user.username) === 'completed';
                    
                    console.log(`🔍 UI State Check:`, {
                      isCompleted,
                      evaluationResults,
                      hasResults: !!evaluationResults,
                      shouldShowResults: isCompleted && evaluationResults,
                      isExpired
                    });
                    
                    // Si la evaluación ha vencido y no está completada, mostrar mensaje de vencimiento
                    if (isExpired && !isCompleted) {
                      console.log(`⏰ SHOWING EXPIRED EVALUATION MESSAGE`);
                      return (
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-3">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                              <GraduationCap className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                          </div>
                          <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                            {translate('evalExpiredStatus') || 'Evaluación Vencida'}
                          </h4>
                          <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                            {translate('evalExpiredMessage') || 'La fecha límite para realizar esta evaluación ha expirado.'}
                          </p>
                          <div className="text-xs text-red-500 dark:text-red-500">
                            {translate('evalExpiredDate', { date: dueDate.toLocaleString() }) || 
                             `Fecha límite: ${dueDate.toLocaleString()}`}
                          </div>
                        </div>
                      );
                    }
                    
                    if (isCompleted && evaluationResults) {
                      console.log(`✅ SHOWING COMPLETED RESULTS UI`);
                      // Mostrar resultados de la evaluación completada
                      return (
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-3">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                              <GraduationCap className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                          </div>
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                            {translate('evalCompletedStatus')}
                          </h4>
                          
                          {/* Información original de la evaluación */}
                          {selectedTask.evaluationConfig && (
                            <div className="text-xs text-green-600 dark:text-green-400 mb-3 space-y-1">
                              <div>{translate('evalTopic', { topic: selectedTask.evaluationConfig.topic })}</div>
                              <div>{translate('evalQuestions', { count: selectedTask.evaluationConfig.questionCount.toString() })}</div>
                              <div>{translate('evalTimeLimit', { time: selectedTask.evaluationConfig.timeLimit.toString() })}</div>
                            </div>
                          )}
                          
                          {/* Resultados de la evaluación */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {translate('evalCompletedPercentage', { percentage: (evaluationResults.completionPercentage?.toFixed(1) || '0.0') })}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {translate('evalCompletedScore', { 
                                score: evaluationResults.score || 0, 
                                total: evaluationResults.totalQuestions || selectedTask.evaluationConfig?.questionCount || 0 
                              })}
                            </div>
                            {evaluationResults.completedAt && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                {translate('evalCompletedDate', { date: new Date(evaluationResults.completedAt).toLocaleString() })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      console.log(`🔄 SHOWING TAKE EVALUATION BUTTON`);
                      // Mostrar botón para realizar evaluación
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                              {translate('evalTakeInstruction')}
                            </p>
                            {selectedTask.evaluationConfig && (
                              <div className="text-xs text-purple-600 dark:text-purple-400 space-y-1">
                                <div>{translate('evalTopic', { topic: selectedTask.evaluationConfig.topic })}</div>
                                <div>{translate('evalQuestions', { count: selectedTask.evaluationConfig.questionCount.toString() })}</div>
                                <div>{translate('evalTimeLimit', { time: selectedTask.evaluationConfig.timeLimit.toString() })}</div>
                              </div>
                            )}
                          </div>
                          <Button 
                            className="ml-4 bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => {
                              // Navegar directamente a la evaluación con los parámetros de la tarea
                              setShowTaskDialog(false);
                              
                              // Construir URL con parámetros de la tarea para auto-iniciar evaluación
                              const params = new URLSearchParams({
                                course: selectedTask.course,
                                book: selectedTask.subject, // subject representa la asignatura/libro
                                topic: selectedTask.evaluationConfig?.topic || '',
                                autoStart: 'true', // Indicador para auto-iniciar
                                taskId: selectedTask.id,
                                // Parámetros específicos del profesor
                                questionCount: selectedTask.evaluationConfig?.questionCount?.toString() || '15',
                                timeLimit: selectedTask.evaluationConfig?.timeLimit?.toString() || '120'
                              });
                              
                              router.push(`/dashboard/evaluacion?${params.toString()}`);
                            }}
                          >
                            <GraduationCap className="w-4 h-4 mr-2" />
                            {translate('evalTakeButton')}
                          </Button>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Task Attachments */}
              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">{translate('attachments')}</h4>
                  <div className="space-y-2">
                    {selectedTask.attachments.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate" title={file.name}>{file.name}</span>
                          <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(file)}
                          className="flex-shrink-0 border-orange-300 text-orange-700 hover:bg-orange-600 hover:text-white hover:border-orange-600"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4 text-sm">
                <span>
                  <strong>{translate('taskDueDateLabel')}</strong> {formatDate(selectedTask.dueDate)}
                </span>
                <span>
                  <strong>{translate('taskStatusLabel')}</strong> 
                  <Badge className={`ml-1 ${user?.role === 'student' ? getStatusColorForStudent(selectedTask, user.username) : getStatusColor(selectedTask.status)}`}>
                    {user?.role === 'student' ? getStatusTextForStudent(selectedTask, user.username) : (selectedTask.status === 'pending' ? translate('statusPending') : translate('statusCompleted'))}
                  </Badge>
                </span>
                {user?.role === 'student' && (() => {
                  const grade = getStudentGrade(selectedTask.id, user.username);
                  return grade !== undefined ? (
                    <span>
                      <strong>{translate('grade')}:</strong> 
                      <Badge className="ml-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {grade}%
                      </Badge>
                    </span>
                  ) : null;
                })()}
              </div>

              {/* Student's Grade and Feedback */}
              {user?.role === 'student' && (() => {
                const submission = comments.find(comment => 
                  comment.taskId === selectedTask.id && 
                  comment.studentUsername === user.username && 
                  comment.isSubmission && 
                  comment.grade !== undefined
                );
                return submission?.feedback ? (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">{translate('teacherFeedback')}</h4>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                        <p className="text-sm">{submission.feedback}</p>
                        {submission.gradedBy && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {translate('gradedBy')}: {submission.gradedBy} • {formatDate(submission.gradedAt || submission.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : null;
              })()}

              {/* Evaluation Results - Only visible for teacher when task is evaluation */}
              {selectedTask.taskType === 'evaluation' && user?.role === 'teacher' && (
                    <>
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{translate('evaluationResults')}</h4>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('🚨 EMERGENCY SYNC - Manual debug requested');
                                
                                // 🔍 DIAGNÓSTICO COMPLETO PRIMERO
                                console.log('=== DIAGNÓSTICO COMPLETO ===');
                                
                                // 1. Verificar tarea actual
                                console.log('📊 Selected Task:', selectedTask);
                                console.log('📊 Selected Task ID:', selectedTask.id);
                                console.log('📊 Selected Task Course:', selectedTask.course);
                                console.log('📊 Selected Task Assignment:', selectedTask.assignedTo);
                                
                                // 2. Verificar usuarios
                                const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '{}');
                                console.log('👥 All Users Object:', allUsers);
                                const students = Object.entries(allUsers).filter(([_, data]: [string, any]) => data.role === 'student');
                                console.log('🎓 Students Found:', students);
                                
                                // 3. Verificar estudiantes del curso específico
                                const courseStudents = students.filter(([_, userData]: [string, any]) => 
                                  userData.activeCourses?.includes(selectedTask.course)
                                );
                                console.log(`🎯 Students in course "${selectedTask.course}":`, courseStudents);
                                
                                // 4. Verificar datos de cada estudiante
                                courseStudents.forEach(([studentUsername, userData]) => {
                                  console.log(`\n🔍 CHECKING STUDENT: ${studentUsername}`);
                                  console.log(`👤 Student Data:`, userData);
                                  
                                  const userTasksKey = `userTasks_${studentUsername}`;
                                  const userTasksString = localStorage.getItem(userTasksKey);
                                  console.log(`📋 localStorage key "${userTasksKey}":`, userTasksString ? 'EXISTS' : 'NOT FOUND');
                                  
                                  if (userTasksString) {
                                    try {
                                      const userTasks = JSON.parse(userTasksString);
                                      console.log(`📋 ${studentUsername} - All Tasks:`, userTasks);
                                      
                                      const userTask = userTasks.find((ut: any) => ut.id === selectedTask.id);
                                      console.log(`📋 ${studentUsername} - This Task:`, userTask);
                                      
                                      if (userTask) {
                                        console.log(`� ${studentUsername} - Task Details:`, {
                                          status: userTask.status,
                                          completionPercentage: userTask.completionPercentage,
                                          score: userTask.score,
                                          completedAt: userTask.completedAt,
                                          hasEvaluationConfig: !!userTask.evaluationConfig
                                        });
                                      }
                                    } catch (error) {
                                      console.error(`❌ Error parsing ${studentUsername} tasks:`, error);
                                    }
                                  }
                                });
                                
                                // 5. Verificar tarea global
                                const globalTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
                                const globalTask = globalTasks.find((t: any) => t.id === selectedTask.id);
                                console.log('📊 Global Task:', globalTask);
                                console.log('📊 Global Task Evaluation Results:', globalTask?.evaluationResults);
                                
                                console.log('=== FIN DIAGNÓSTICO ===\n');
                                
                                // Ejecutar función de debug
                                if ((window as any).debugEvaluationResults) {
                                  (window as any).debugEvaluationResults(selectedTask.id);
                                }
                                
                                // 🚨 FORZAR SINCRONIZACIÓN MANUAL AGRESIVA
                                console.log('🚨 STARTING AGGRESSIVE MANUAL SYNC...');
                                
                                let hasChanges = false;
                                const currentTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
                                const taskIndex = currentTasks.findIndex((t: any) => t.id === selectedTask.id);
                                
                                if (taskIndex !== -1) {
                                  if (!currentTasks[taskIndex].evaluationResults) {
                                    currentTasks[taskIndex].evaluationResults = {};
                                  }
                                  
                                  // Procesar TODOS los estudiantes del curso
                                  courseStudents.forEach(([studentUsername, userData]: [string, any]) => {
                                    const userTasksKey = `userTasks_${studentUsername}`;
                                    const userTasksString = localStorage.getItem(userTasksKey);
                                    
                                    console.log(`🔄 Processing ${studentUsername}...`);
                                    
                                    if (userTasksString) {
                                      try {
                                        const userTasks = JSON.parse(userTasksString);
                                        const userTask = userTasks.find((ut: any) => ut.id === selectedTask.id);
                                        
                                        if (userTask) {
                                          console.log(`� Found task for ${studentUsername}:`, {
                                            status: userTask.status,
                                            completionPercentage: userTask.completionPercentage,
                                            score: userTask.score
                                          });
                                          
                                          // FORZAR ACTUALIZACIÓN INDEPENDIENTEMENTE DEL ESTADO
                                          const resultData = {
                                            score: userTask.score || 0,
                                            completionPercentage: userTask.completionPercentage || 0,
                                            completedAt: userTask.completedAt || (userTask.status === 'completed' ? new Date().toISOString() : 'Pendiente'),
                                            totalQuestions: userTask.evaluationConfig?.questionCount || selectedTask.evaluationConfig?.questionCount || 0,
                                            attempt: 1
                                          };
                                          
                                          currentTasks[taskIndex].evaluationResults[studentUsername] = resultData;
                                          hasChanges = true;
                                          console.log(`✅ FORCED UPDATE for ${studentUsername}:`, resultData);
                                        } else {
                                          console.log(`❌ No task found for ${studentUsername}`);
                                        }
                                      } catch (error) {
                                        console.error(`❌ Error processing ${studentUsername}:`, error);
                                      }
                                    } else {
                                      console.log(`❌ No localStorage found for ${studentUsername}`);
                                    }
                                  });
                                  
                                  if (hasChanges) {
                                    localStorage.setItem('smart-student-tasks', JSON.stringify(currentTasks));
                                    console.log('💾 FORCED SAVE: Updated tasks to localStorage');
                                    
                                    // Actualizar el estado inmediatamente
                                    setSelectedTask(currentTasks[taskIndex]);
                                    setTasks(currentTasks);
                                    
                                    console.log('✅ FORCED UPDATE: Updated React state');
                                    
                                    toast({
                                      title: "🚨 Emergency Sync Complete",
                                      description: `Se forzó la sincronización de ${courseStudents.length} estudiantes.`,
                                    });
                                  } else {
                                    console.log('⚠️ NO CHANGES: No student data found to sync');
                                    toast({
                                      title: "⚠️ No Data Found",
                                      description: "No se encontraron datos de evaluaciones completadas para sincronizar.",
                                    });
                                  }
                                } else {
                                  console.error('❌ Task not found in global tasks');
                                  toast({
                                    title: "❌ Error",
                                    description: "No se pudo encontrar la tarea en el almacenamiento global.",
                                  });
                                }
                              }}
                              className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                            >
                              🚨 Emergency Sync
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log('🔄 Manual reload requested by teacher');
                                
                                // 🚨 FORZAR SINCRONIZACIÓN COMPLETA Y AGRESIVA
                                console.log('🚨 EXECUTING AGGRESSIVE SYNC...');
                                
                                // 1. Forzar recarga completa de datos
                                forceReloadTaskData(selectedTask.id);
                                
                                // 2. Ejecutar debug completo
                                if ((window as any).debugEvaluationResults) {
                                  (window as any).debugEvaluationResults(selectedTask.id);
                                }
                                
                                // 3. Forzar re-renderizado del modal con datos actualizados
                                setTimeout(() => {
                                  console.log('🔄 Phase 2: Force re-rendering modal with fresh data...');
                                  
                                  // Obtener datos completamente frescos
                                  const freshTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
                                  const freshTask = freshTasks.find((t: any) => t.id === selectedTask.id);
                                  
                                  if (freshTask) {
                                    console.log('✅ Phase 2: Updating modal with fresh task data:', freshTask);
                                    console.log('📊 Phase 2: Fresh evaluation results:', freshTask.evaluationResults);
                                    
                                    // 4. FORZAR NUEVA SINCRONIZACIÓN
                                    if (freshTask.taskType === 'evaluation') {
                                      console.log('🔄 Phase 2: Forcing NEW evaluation sync...');
                                      const syncedResults = getAllEvaluationResults(freshTask);
                                      console.log('🔄 Phase 2: Re-synced results:', syncedResults);
                                      
                                      // 5. OBTENER DATOS POST-SINCRONIZACIÓN
                                      setTimeout(() => {
                                        const postSyncTasks = JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
                                        const postSyncTask = postSyncTasks.find((t: any) => t.id === selectedTask.id);
                                        
                                        if (postSyncTask) {
                                          console.log('✅ Phase 3: Final task update:', postSyncTask);
                                          setSelectedTask(postSyncTask);
                                        }
                                      }, 200);
                                    }
                                    
                                    setSelectedTask(freshTask);
                                  }
                                }, 500);
                                
                                toast({
                                  title: translate('dataRefreshed') || 'Datos actualizados',
                                  description: translate('evaluationDataRefreshed') || 'Los resultados de la evaluación han sido actualizados.',
                                });
                              }}
                              className="text-blue-600 hover:text-blue-700 border-blue-300 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {translate('refreshData') || 'Actualizar'}
                            </Button>
                          </div>
                        </div>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="py-2 px-3 text-center font-medium">{translate('studentName')}</th>
                                <th className="py-2 px-3 text-center font-medium">{translate('scoreColumn')}</th>
                                <th className="py-2 px-3 text-center font-medium">{translate('percentageColumn')}</th>
                                <th className="py-2 px-3 text-center font-medium">{translate('completedAtColumn')}</th>
                                <th className="py-2 px-3 text-center font-medium">{translate('statusColumn')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-muted">
                              {(() => {
                                const evaluationResults = getAllEvaluationResults(selectedTask);
                                
                                if (evaluationResults.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan={5} className="py-4 px-3 text-center text-muted-foreground">
                                        {translate('noEvaluationResults') || "Ningún estudiante ha completado la evaluación aún"}
                                      </td>
                                    </tr>
                                  );
                                }
                                
                                return evaluationResults.map(result => (
                                  <tr key={result.studentUsername}>
                                    <td className="py-2 px-3">{result.studentName}</td>
                                    <td className="py-2 px-3 text-center">
                                      <span className="font-medium">
                                        {result.score}/{result.totalQuestions}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <Badge className={
                                        result.completionPercentage >= 80 
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                          : result.completionPercentage >= 60
                                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                      }>
                                        {result.completionPercentage.toFixed(1)}%
                                      </Badge>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {result.completedAt === 'Pendiente' || result.completedAt === 'Expirada'
                                        ? (
                                          <Badge variant="outline" className={
                                            result.completedAt === 'Expirada' 
                                              ? 'border-red-300 text-red-700 dark:border-red-600 dark:text-red-400'
                                              : 'border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400'
                                          }>
                                            {result.completedAt}
                                          </Badge>
                                        )
                                        : result.completedAt
                                        ? new Date(result.completedAt).toLocaleString()
                                        : '-'
                                      }
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <Badge className={
                                        result.completedAt === 'Expirada'
                                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                          : result.completedAt === 'Pendiente'
                                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                      }>
                                        {result.completedAt === 'Expirada'
                                          ? translate('statusExpired') || 'Expirada'
                                          : result.completedAt === 'Pendiente'
                                          ? translate('statusPending') || 'Pendiente'
                                          : translate('statusCompleted') || 'Finalizado'
                                        }
                                      </Badge>
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Evaluation Summary */}
                        {(() => {
                          const results = getAllEvaluationResults(selectedTask);
                          if (results.length > 0) {
                            // Calcular estadísticas más precisas
                            const completedResults = results.filter(r => 
                              r.completedAt !== 'Pendiente' && r.completedAt !== 'Expirada'
                            );
                            const pendingCount = results.filter(r => r.completedAt === 'Pendiente').length;
                            const expiredCount = results.filter(r => r.completedAt === 'Expirada').length;
                            
                            // Promedio solo de estudiantes que completaron
                            const avgScore = completedResults.length > 0 
                              ? completedResults.reduce((sum, r) => sum + r.completionPercentage, 0) / completedResults.length
                              : 0;
                            const passedCount = results.filter(r => r.completionPercentage >= 60).length;
                            
                            return (
                              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                  <div className="text-center">
                                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                                      {results.length}
                                    </div>
                                    <div className="text-muted-foreground">{translate('totalStudents') || 'Total'}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-green-600 dark:text-green-400">
                                      {completedResults.length}
                                    </div>
                                    <div className="text-muted-foreground">{translate('completed') || 'Completado'}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-orange-600 dark:text-orange-400">
                                      {pendingCount}
                                    </div>
                                    <div className="text-muted-foreground">{translate('pending') || 'Pendiente'}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-red-600 dark:text-red-400">
                                      {expiredCount}
                                    </div>
                                    <div className="text-muted-foreground">{translate('expired') || 'Expirada'}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-purple-600 dark:text-purple-400">
                                      {avgScore.toFixed(1)}%
                                    </div>
                                    <div className="text-muted-foreground">{translate('average') || 'Promedio'}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </>
                  )}

              {/* Students Status Table - Only visible for teacher when task is normal assignment */}
              {selectedTask.taskType === 'assignment' && user?.role === 'teacher' && (
                <>
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">{translate('studentsStatus') || 'Estado de Estudiantes'}</h4>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="py-2 px-3 text-center font-medium">{translate('studentName') || 'Estudiante'}</th>
                            <th className="py-2 px-3 text-center font-medium">{translate('submissionStatus') || 'Estado'}</th>
                            <th className="py-2 px-3 text-center font-medium">{translate('grade') || 'Calificación'}</th>
                            <th className="py-2 px-3 text-center font-medium">{translate('submissionDate') || 'Fecha de Entrega'}</th>
                            <th className="py-2 px-3 text-center font-medium">{translate('actions') || 'Acciones'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-muted">
                          {(() => {
                            const studentsWithStatus = getStudentsWithTaskStatus(selectedTask);
                            
                            if (studentsWithStatus.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="py-4 px-3 text-center text-muted-foreground">
                                    {translate('noStudentsAssigned') || "No hay estudiantes asignados a esta tarea"}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return studentsWithStatus.map(student => (
                              <tr key={student.username}>
                                <td className="py-2 px-3">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{student.displayName}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <Badge className={
                                    student.hasSubmitted
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                      : (() => {
                                          const now = new Date();
                                          const dueDate = new Date(selectedTask.dueDate);
                                          const isExpired = dueDate <= now;
                                          return isExpired
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
                                        })()
                                  }>
                                    {student.hasSubmitted
                                      ? translate('statusSubmitted') || 'Entregada'
                                      : (() => {
                                          const now = new Date();
                                          const dueDate = new Date(selectedTask.dueDate);
                                          const isExpired = dueDate <= now;
                                          return isExpired
                                            ? translate('statusExpired') || 'Vencida'
                                            : translate('statusPending') || 'Pendiente';
                                        })()
                                    }
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {student.submission?.grade !== undefined ? (
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                      {student.submission.grade}%
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {student.submissionDate ? (
                                    <span className="text-sm whitespace-nowrap">
                                      {new Date(student.submissionDate).toLocaleDateString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: '2-digit'
                                      })} {new Date(student.submissionDate).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {student.hasSubmitted ? (
                                    student.submission?.grade !== undefined ? (
                                      // Si ya está calificado, mostrar botón "Calificado"
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-green-300 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600"
                                        onClick={() => {
                                          // Scroll to the student's submission in comments
                                          setTimeout(() => {
                                            const commentElement = document.getElementById(`comment-${student.submission.id}`);
                                            if (commentElement) {
                                              commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              commentElement.classList.add('ring-2', 'ring-green-400', 'ring-opacity-75');
                                              setTimeout(() => {
                                                commentElement.classList.remove('ring-2', 'ring-green-400', 'ring-opacity-75');
                                              }, 2000);
                                            }
                                          }, 100);
                                        }}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        {translate('graded') || 'Calificado'}
                                      </Button>
                                    ) : (
                                      // Si no está calificado, mostrar botón "Revisar Tarea"
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-orange-300 text-orange-700 hover:bg-orange-600 hover:text-white hover:border-orange-600"
                                        onClick={() => {
                                          // Scroll to the student's submission in comments
                                          setTimeout(() => {
                                            const commentElement = document.getElementById(`comment-${student.submission.id}`);
                                            if (commentElement) {
                                              commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              commentElement.classList.add('ring-2', 'ring-orange-400', 'ring-opacity-75');
                                              setTimeout(() => {
                                                commentElement.classList.remove('ring-2', 'ring-orange-400', 'ring-opacity-75');
                                              }, 2000);
                                            }
                                          }, 100);
                                        }}
                                      >
                                        <Eye className="w-4 h-4 mr-1" />
                                        {translate('reviewTask') || 'Revisar Tarea'}
                                      </Button>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      {translate('noSubmission') || 'Sin entrega'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Assignment Summary */}
                    {(() => {
                      const studentsWithStatus = getStudentsWithTaskStatus(selectedTask);
                      if (studentsWithStatus.length > 0) {
                        const submittedCount = studentsWithStatus.filter(s => s.hasSubmitted).length;
                        const pendingCount = studentsWithStatus.length - submittedCount;
                        const gradedCount = studentsWithStatus.filter(s => s.submission?.grade !== undefined).length;
                        const now = new Date();
                        const dueDate = new Date(selectedTask.dueDate);
                        const isExpired = dueDate <= now;
                        const expiredCount = isExpired ? pendingCount : 0;
                        const actualPendingCount = isExpired ? 0 : pendingCount;
                        
                        return (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                              <div className="text-center">
                                <div className="font-semibold text-blue-600 dark:text-blue-400">
                                  {studentsWithStatus.length}
                                </div>
                                <div className="text-muted-foreground">{translate('totalStudents') || 'Total'}</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-green-600 dark:text-green-400">
                                  {submittedCount}
                                </div>
                                <div className="text-muted-foreground">{translate('submittedTasks') || 'Entregadas'}</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-orange-600 dark:text-orange-400">
                                  {actualPendingCount}
                                </div>
                                <div className="text-muted-foreground">{translate('pending') || 'Pendientes'}</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-red-600 dark:text-red-400">
                                  {expiredCount}
                                </div>
                                <div className="text-muted-foreground">{translate('expiredTasks') || 'Vencidas'}</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-purple-600 dark:text-purple-400">
                                  {gradedCount}
                                </div>
                                <div className="text-muted-foreground">{translate('gradedTasks') || 'Calificadas'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </>
              )}
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">{translate('commentsAndSubmissions')}</h4>
                {user?.role === 'student' && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ℹ️ {translate('studentsCannotSeeOthersSubmissions')}
                    </p>
                  </div>
                )}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {getTaskComments(selectedTask.id).map(comment => {
                    // Check if comment is unread by current user
                    // A comment is unread if the current user is not in the readBy array
                    // AND the comment is from a different user (not their own comment)
                    const isUnreadByUser = !comment.readBy?.includes(user?.username || '') &&
                      comment.studentUsername !== user?.username;
                    
                    // Debug logging
                    console.log(`📝 Comment ${comment.id}:`, {
                      commentAuthor: comment.studentUsername,
                      commentUserRole: comment.userRole,
                      currentUser: user?.username,
                      currentUserRole: user?.role,
                      readBy: comment.readBy,
                      isUnread: isUnreadByUser,
                      commentText: comment.comment.substring(0, 30) + '...'
                    });
                    
                    return (
                      <div 
                        key={comment.id} 
                        id={`comment-${comment.id}`}
                        className={`bg-muted p-3 rounded-lg transition-colors duration-300 ${
                          isUnreadByUser ? 'border-2 border-orange-300 bg-orange-50 dark:bg-orange-900/20' : ''
                        }`}
                        onClick={() => {
                          // Mark comment as read when clicked
                          if (isUnreadByUser) {
                            markCommentAsRead(selectedTask.id, comment.id);
                          }
                        }}
                      >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">{comment.studentName}</span>
                        <div className="flex items-center space-x-2">
                          {comment.isSubmission && (
                            <Badge variant="secondary" className="text-xs">{translate('submission')}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                      
                      {/* Comment Attachments */}
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {comment.attachments.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 bg-background rounded text-xs">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate" title={file.name}>{file.name}</span>
                                <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadFile(file)}
                                className="flex-shrink-0 h-6 w-6 p-0 border-orange-300 text-orange-700 hover:bg-orange-600 hover:text-white hover:border-orange-600"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Teacher Grading Interface */}
                      {comment.isSubmission && user?.role === 'teacher' && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs border border-blue-200 dark:border-blue-800">
                          {comment.grade ? (
                            <div className="flex justify-between items-center">
                              <div className="text-blue-700 dark:text-blue-400">
                                <span className="font-medium">✓ {translate('graded')}: {comment.grade}%</span>
                                {comment.feedback && (
                                  <>
                                    <br />
                                    <span>{translate('feedback')}: {comment.feedback}</span>
                                  </>
                                )}
                                <br />
                                <span className="text-muted-foreground">
                                  {translate('gradedBy')} {comment.gradedBy} - {formatDate(comment.gradedAt || '')}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGradeSubmission(comment)}
                                className="ml-2 h-6 px-2 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700"
                              >
                                {translate('editGrade')}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span className="text-blue-700 dark:text-blue-400 font-medium">
                                📝 {translate('pendingGrade')}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGradeSubmission(comment)}
                                className="ml-2 h-6 px-2 text-xs bg-orange-50 hover:bg-orange-100 text-orange-900 hover:text-orange-900 border-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700"
                              >
                                {translate('gradeSubmission')}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Show submission notice for students who submitted */}
                      {comment.isSubmission && user?.role === 'student' && comment.studentUsername === user.username && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">✓ {translate('finalSubmissionMade')}</span>
                              <br />
                              {comment.grade !== undefined ? (
                                <span>{translate('cannotDeleteGradedSubmission')}</span>
                              ) : (
                                <span>{translate('cannotModifySubmission')}</span>
                              )}
                            </div>
                            {/* Student can only delete if not graded yet */}
                            {comment.grade === undefined ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteSubmission(comment.id)}
                                className="ml-2 h-6 px-2 text-xs"
                                title={translate('deleteSubmission')}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                {translate('deleteSubmission')}
                              </Button>
                            ) : (
                              <div className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                🔒 {translate('cannotDeleteGradedSubmission')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Show delete option for teacher on any submission */}
                      {comment.isSubmission && user?.role === 'teacher' && (
                        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">👨‍🏫 {translate('teacherOptions')}</span>
                              <br />
                              <span>{translate('canManageSubmission')}</span>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSubmission(comment.id)}
                              className="ml-2 h-6 px-2 text-xs"
                              title={translate('deleteSubmissionAsTeacher')}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              {translate('deleteSubmission')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ); // Close the return statement for the map
                  })}
                  
                  {getTaskComments(selectedTask.id).length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      {translate('noCommentsYet')}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Mostrar formulario de comentarios solo si la tarea no está vencida (para estudiantes) */}
              {(() => {
                // Verificar si la fecha límite ha vencido (solo para estudiantes)
                const now = new Date();
                const dueDate = new Date(selectedTask.dueDate);
                const isExpired = dueDate <= now;
                const hasSubmitted = user?.role === 'student' ? hasStudentSubmitted(selectedTask.id, user.username) : false;
                
                // Los profesores siempre pueden comentar
                if (user?.role === 'teacher') {
                  return true;
                }
                
                // Para estudiantes: mostrar formulario solo si no está vencida Y no ha entregado
                if (user?.role === 'student') {
                  // Si ya entregó, mostrar mensaje de confirmación
                  if (hasSubmitted) {
                    return (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">✅ {translate('taskAlreadySubmitted')}</h4>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {translate('submissionCompleteMessage') || 'Has completado tu entrega para esta tarea. El profesor la revisará y te dará retroalimentación.'}
                        </p>
                      </div>
                    );
                  }
                  
                  // Si está vencida y no entregó, mostrar mensaje de vencimiento
                  if (isExpired && !hasSubmitted) {
                    return (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">⏰ {translate('taskExpired') || 'Tarea Vencida'}</h4>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {translate('taskExpiredMessage') || 'La fecha límite para entregar esta tarea ha expirado. Ya no es posible realizar entregas.'}
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                          {translate('taskExpiredDate', { date: dueDate.toLocaleString() }) || 
                           `Fecha límite: ${dueDate.toLocaleString()}`}
                        </p>
                      </div>
                    );
                  }
                  
                  // Si no está vencida y no ha entregado, permitir formulario
                  return true;
                }
                
                return false;
              })() && (user?.role === 'student' || user?.role === 'teacher') && (
                <div className="space-y-3">
                  <Separator />
                  <div>
                    <Label htmlFor="newComment">
                      {user?.role === 'student' 
                        ? (isSubmission ? translate('submitTask') : translate('addComment'))
                        : translate('addTeacherComment')
                      }
                    </Label>
                    <Textarea
                      id="newComment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        user?.role === 'student' 
                          ? (isSubmission ? translate('submissionPlaceholder') : translate('commentPlaceholder'))
                          : translate('teacherCommentPlaceholder')
                      }
                      className="mt-1"
                    />
                    
                    {/* File Upload for Comments */}
                    <div className="mt-3 space-y-2">
                      <div>
                        <Input
                          type="file"
                          multiple
                          onChange={(e) => handleFileUpload(e.target.files, false)}
                          className="hidden"
                          id="comment-file-upload"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip,.rar"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('comment-file-upload')?.click()}
                          className="w-full border-orange-300 text-orange-700 hover:bg-orange-600 hover:text-white hover:border-orange-600 focus:bg-orange-600 focus:text-white focus:border-orange-600 active:bg-orange-700 active:text-white"
                          size="sm"
                        >
                          <Paperclip className="w-4 h-4 mr-2" />
                          {translate('attachFile')}
                        </Button>
                      </div>
                      
                      {/* Display uploaded files for comment */}
                      {commentAttachments.length > 0 && (
                        <div className="space-y-2 max-h-24 overflow-y-auto">
                          {commentAttachments.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate" title={file.name}>{file.name}</span>
                                <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id, false)}
                                className="flex-shrink-0 h-6 w-6 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center space-x-2">
                        {user?.role === 'student' && selectedTask?.taskType !== 'evaluation' && (
                          <>
                            <input
                              type="checkbox"
                              id="isSubmission"
                              checked={isSubmission}
                              onChange={(e) => {
                                if (!selectedTask || hasStudentSubmitted(selectedTask.id, user.username)) {
                                  return; // Don't allow changes if already submitted
                                }
                                setIsSubmission(e.target.checked);
                              }}
                              disabled={selectedTask ? hasStudentSubmitted(selectedTask.id, user.username) : false}
                              className="rounded"
                            />
                            <Label 
                              htmlFor="isSubmission" 
                              className={`text-sm ${selectedTask && hasStudentSubmitted(selectedTask.id, user.username) ? 'text-muted-foreground' : ''}`}
                            >
                              {selectedTask && hasStudentSubmitted(selectedTask.id, user.username) 
                                ? translate('taskAlreadySubmitted')
                                : translate('markAsFinalSubmission')
                              }
                            </Label>
                          </>
                        )}
                      </div>
                      <Button 
                        onClick={handleAddComment} 
                        disabled={!newComment.trim()}
                        className="bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-400"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {user?.role === 'student' 
                          ? (isSubmission ? translate('submit') : translate('comment'))
                          : translate('sendComment')
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{translate('editTask')}</DialogTitle>
            <DialogDescription>
              {translate('editTaskDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">{translate('taskTitle')} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="col-span-3"
                placeholder={translate('taskTitlePlaceholder')}
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">{translate('taskDescription')} *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder={translate('taskDescriptionPlaceholder')}
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="course" className="text-right">{translate('taskCourse')} *</Label>
              <Select value={formData.course} onValueChange={(value) => setFormData(prev => ({ ...prev, course: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={translate('selectCourse')} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCourses().map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">{translate('taskSubject')}</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={translate('selectSubject')} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubjects().map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{translate('assignTo')}</Label>
              <Select value={formData.assignedTo} onValueChange={(value: 'course' | 'student') => setFormData(prev => ({ ...prev, assignedTo: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">{translate('assignToCourse')}</SelectItem>
                  <SelectItem value="student">{translate('assignToStudents')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.assignedTo === 'student' && formData.course && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{translate('assignToStudents')}</Label>
                <div className="col-span-3">
                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                    {getStudentsFromCourse(formData.course).length > 0 ? (
                      getStudentsFromCourse(formData.course).map(student => (
                        <div key={student.username} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`student-${student.username}`}
                            checked={formData.assignedStudents?.includes(student.username)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedStudents: [...(prev.assignedStudents || []), student.username]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  assignedStudents: prev.assignedStudents?.filter(s => s !== student.username) || []
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`student-${student.username}`} className="cursor-pointer">
                            {student.displayName}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground py-2 text-center">
                        {translate('noEvaluationsSubtext') || "No hay estudiantes disponibles para este curso"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">{translate('dueDate')} *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
                min={getCurrentISODateTime()} // Set minimum to current date-time
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{translate('priority')}</Label>
              <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{translate('priorityLow')}</SelectItem>
                  <SelectItem value="medium">{translate('priorityMedium')}</SelectItem>
                  <SelectItem value="high">{translate('priorityHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Task Type Selector */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{translate('taskType') || "Tipo de tarea"}</Label>
              <Select value={formData.taskType} onValueChange={(value: 'assignment' | 'evaluation') => setFormData(prev => ({ ...prev, taskType: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">{translate('taskTypeAssignment') || "Tarea"}</SelectItem>
                  <SelectItem value="evaluation">{translate('taskTypeEvaluation') || "Evaluación"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Evaluation Config fields - only shown when taskType is 'evaluation' */}
            {formData.taskType === 'evaluation' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="evaluationTopic" className="text-right">{translate('evaluationTopic') || "Tema"} *</Label>
                  <Input
                    id="evaluationTopic"
                    value={formData.evaluationConfig?.topic || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      evaluationConfig: { ...(prev.evaluationConfig || { questionCount: 15, timeLimit: 30 }), topic: e.target.value }
                    }))}
                    className="col-span-3"
                    placeholder={translate('evaluationTopicPlaceholder') || "Tema de la evaluación"}
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="questionCount" className="text-right">{translate('questionCount') || "Cantidad de preguntas"}</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min="1"
                    value={formData.evaluationConfig?.questionCount || 15}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      evaluationConfig: { ...(prev.evaluationConfig || { topic: '', timeLimit: 30 }), questionCount: parseInt(e.target.value) || 15 }
                    }))}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="timeLimit" className="text-right">{translate('timeLimit') || "Tiempo límite (min)"}</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="5"
                    value={formData.evaluationConfig?.timeLimit || 30}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      evaluationConfig: { ...(prev.evaluationConfig || { topic: '', questionCount: 15 }), timeLimit: parseInt(e.target.value) || 30 }
                    }))}
                    className="col-span-3"
                  />
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-400 hover:border-gray-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            >
              {translate('cancel')}
            </Button>
            <Button onClick={handleUpdateTask} className="bg-orange-600 hover:bg-orange-700 text-white">
              {translate('updateTask')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{translate('confirmDelete')}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {translate('taskDeleteConfirm', { title: taskToDelete?.title || '' })}
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-400 hover:border-gray-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            >
              {translate('cancel')}
            </Button>
            <Button onClick={confirmDeleteTask} variant="destructive">
              {translate('deleteTask')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog open={showGradingDialog} onOpenChange={setShowGradingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{translate('gradeSubmission')}</DialogTitle>
            <DialogDescription>
              {translate('gradeSubmissionDesc', { student: gradingComment?.studentName || '' })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Mostrar la entrega del estudiante */}
            {gradingComment && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">{translate('studentSubmission')}</h4>
                <p className="text-sm">{gradingComment.comment}</p>
                
                {/* Mostrar archivos adjuntos si los hay */}
                {gradingComment.attachments && gradingComment.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {gradingComment.attachments.map((file) => (
                      <div key={file.id} className="flex items-center space-x-2 text-xs">
                        <Paperclip className="w-3 h-3 text-muted-foreground" />
                        <span>{file.name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadFile(file)}
                          className="h-5 w-5 p-0 border-orange-300 text-orange-700 hover:bg-orange-600 hover:text-white hover:border-orange-600"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="grade" className="text-right">{translate('grade')} *</Label>
              <div className="col-span-3">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={gradeValue}
                  onChange={(e) => {
                    const value = Math.min(100, Math.max(0, Number(e.target.value)));
                    setGradeValue(value);
                  }}
                  className="border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                  placeholder={translate('customGradePlaceholder')}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {translate('gradePercentageRange')}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="feedback" className="text-right pt-2">{translate('feedback')}</Label>
              <Textarea
                id="feedback"
                value={feedbackValue}
                onChange={(e) => setFeedbackValue(e.target.value)}
                className="col-span-3"
                placeholder={translate('feedbackPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowGradingDialog(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-400 hover:border-gray-500 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            >
              {translate('cancel')}
            </Button>
            <Button onClick={handleSaveGrade} className="bg-orange-600 hover:bg-orange-700 text-white">
              {translate('saveGrade')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
