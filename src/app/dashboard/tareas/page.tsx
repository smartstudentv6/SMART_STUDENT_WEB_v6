  "use client";

  import { useState, useEffect } from 'react';
  import { useAuth, User as UserType } from '@/contexts/auth-context';
  import { useLanguage } from '@/contexts/language-context';
  import { useRouter } from 'next/navigation';
  import { Button } from '@/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
  import { Checkbox } from '@/components/ui/checkbox';
  import { Input } from '@/components/ui/input';
  import { TaskNotificationManager } from '@/lib/notifications';
  import { Label } from '@/components/ui/label';
  import { Textarea } from '@/components/ui/textarea';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Badge } from '@/components/ui/badge';
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
  import { Separator } from '@/components/ui/separator';
  import { ClipboardList, Plus, Calendar, User, Users, MessageSquare, Eye, Send, Edit, Trash2, Paperclip, Download, X, Upload, Star, Lock, ClipboardCheck, Timer, ChevronRight, Award } from 'lucide-react';
  import { useToast } from '@/hooks/use-toast';
  import { getUpdatedTeacherData, validateTeacherData } from '@/lib/data-sync';

  // Extended User interface with teacher assignment
  interface ExtendedUser extends UserType {
    password: string;
    assignedTeacherId?: string;
    teachingSubjects?: string[];
  }

  interface Task {
    id: string;
    title: string;
    description: string;
    subject: string; // This might become subjectId if subjects get their own store
    course: string; // This will become courseId
    assignedById: string; // Changed from assignedBy (teacher username)
    assignedByName: string; // teacher display name (can be kept for convenience or fetched)
    assignedTo: 'course' | 'student'; // type of assignment
    assignedStudentIds?: string[]; // Changed from assignedStudents (specific student IDs)
    dueDate: string;
    createdAt: string;
    status: 'pending' | 'submitted' | 'reviewed' | 'delivered' | 'finished';
    priority: 'low' | 'medium' | 'high';
    attachments?: TaskFile[]; // Files attached by teacher
    taskType: 'tarea' | 'evaluacion'; // New field for task type
    // Evaluation specific fields
    topic?: string; // Topic for evaluation
    numQuestions?: number; // Number of questions
    timeLimit?: number; // Time limit in minutes
  }

  interface TaskComment {
    id: string;
    taskId: string;
    studentId: string; // Changed from studentUsername
    studentUsername: string; // ✅ NUEVO: Necesario para filtros de notificaciones
    studentName: string; // Can be kept for convenience or fetched using studentId
    comment: string;
    timestamp: string;
    isSubmission: boolean; // true if this is the student's submission
    attachments?: TaskFile[]; // Files attached to this comment/submission
    grade?: number; // Calificación del profesor (opcional)
    teacherComment?: string; // Comentario del profesor (opcional)
    reviewedAt?: string; // Fecha de revisión (opcional)
    readBy?: string[]; // ✅ NUEVO: Lista de usernames que han leído este comentario
    authorUsername?: string; // 🔥 NUEVO: Quién escribió realmente el comentario
    authorRole?: 'student' | 'teacher'; // 🔥 NUEVO: Rol del autor real
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
    const { translate, language } = useLanguage();
    const router = useRouter();
    const { toast } = useToast();

    // Agregar estilos inline para centrado de encabezados (additive approach)
    const tableHeaderStyle = {
      textAlign: 'center' as const,
      fontWeight: '600' as const,
      paddingLeft: '1rem',
      paddingRight: '1rem'
    };

    const [tasks, setTasks] = useState<Task[]>([]);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showTaskDialog, setShowTaskDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showGradeDialog, setShowGradeDialog] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [submissionToGrade, setSubmissionToGrade] = useState<TaskComment | null>(null);
    const [gradeForm, setGradeForm] = useState({
      grade: '',
      teacherComment: ''
    });
    const [newComment, setNewComment] = useState('');
    const [isSubmission, setIsSubmission] = useState(false);
    const [taskAttachments, setTaskAttachments] = useState<TaskFile[]>([]);
    const [commentAttachments, setCommentAttachments] = useState<TaskFile[]>([]);
    const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
    const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'list' | 'course'>('list');

    // En las tablas existentes, aplicar el estilo directamente a los th
    // Esto se aplicará automáticamente cuando el componente se renderice
    const applyHeaderCentering = () => {
      const headers = document.querySelectorAll('thead th');
      headers.forEach(header => {
        (header as HTMLElement).style.textAlign = 'center';
        (header as HTMLElement).style.fontWeight = '600';
        (header as HTMLElement).style.paddingLeft = '1rem';
        (header as HTMLElement).style.paddingRight = '1rem';
      });
    };

    // Agregar useEffect para aplicar estilos automáticamente
    useEffect(() => {
      applyHeaderCentering();
    }, [showTaskDialog, selectedTask]);

    // Estados para el diálogo de revisión mejorado
    const [showReviewDialog, setShowReviewDialog] = useState(false);
    const [showEvaluationReviewDialog, setShowEvaluationReviewDialog] = useState(false);
    const [selectedEvaluationResult, setSelectedEvaluationResult] = useState<any>(null);
    const [currentReview, setCurrentReview] = useState<{
      studentId: string; // Changed from studentUsername
      studentDisplayName: string;
      taskId: string;
      submission?: TaskComment;
      grade: number;
      feedback: string;
      isGraded: boolean;
    }>({
      studentId: '', // Changed from studentUsername
      studentDisplayName: '',
      taskId: '',
      submission: undefined,
      grade: 0,
      feedback: '',
      isGraded: false
    });

    const [formData, setFormData] = useState({
      title: '',
      description: '',
      subject: '', // This might become subjectId
      course: '', // This will hold courseId during form input
      assignedTo: 'course' as 'course' | 'student',
      assignedStudentIds: [] as string[], // Changed from assignedStudents
      dueDate: '',
      priority: 'medium' as 'low' | 'medium' | 'high',
      taskType: 'tarea' as 'tarea' | 'evaluacion',
      // Evaluation specific fields
      topic: '',
      numQuestions: 0,
      timeLimit: 0
    });

    // Estados para evaluación mejorada
    const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
    const [showLoadingDialog, setShowLoadingDialog] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [currentEvaluation, setCurrentEvaluation] = useState<{
      task: Task | null;
      questions: any[];
      startTime: Date | null;
      answers: { [key: string]: any };
      timeRemaining: number;
      currentQuestionIndex: number;
    }>({
      task: null,
      questions: [],
      startTime: null,
      answers: {},
      timeRemaining: 0,
      currentQuestionIndex: 0
    });

    // Estado para resultados de evaluación
    const [evaluationResults, setEvaluationResults] = useState<{[taskId: string]: any}>({});

    // Estado para revisión de evaluación
    const [showReviewEvaluationDialog, setShowReviewEvaluationDialog] = useState(false);
    const [currentEvaluationReview, setCurrentEvaluationReview] = useState<any>(null);

    // Estado para modal de tiempo agotado
    const [showTimeExpiredDialog, setShowTimeExpiredDialog] = useState(false);
    const [timeExpiredResult, setTimeExpiredResult] = useState<any>(null);
    const [evaluationTimeExpired, setEvaluationTimeExpired] = useState(false);

    // Estados para asignaturas del profesor
    const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
    const [teacherCourses, setTeacherCourses] = useState<{id: string, name: string}[]>([]);

    // Debug: Monitor cambios en el modal de tiempo agotado
    useEffect(() => {
      console.log('🔥 [useEffect] showTimeExpiredDialog cambió a:', showTimeExpiredDialog);
      console.log('🔥 [useEffect] timeExpiredResult:', !!timeExpiredResult);
      console.log('🔥 [useEffect] evaluationTimeExpired:', evaluationTimeExpired);
    }, [showTimeExpiredDialog, timeExpiredResult, evaluationTimeExpired]);

    // Nuevo useEffect para detectar cuando el tiempo llega a 0
    useEffect(() => {
      if (currentEvaluation.timeRemaining === 0 && 
          currentEvaluation.task && 
          !showTimeExpiredDialog &&
          !timeExpiredResult) {
        console.log('🔥 [useEffect] Tiempo llegó a 0, forzando completion');
        handleCompleteEvaluation(true);
      }
    }, [currentEvaluation.timeRemaining]);

    // Cargar resultados de evaluaciones existentes
    useEffect(() => {
      loadEvaluationResults();
    }, [user]);

    // useEffect adicional para recargar datos del profesor cuando cambien en gestión de usuarios
    useEffect(() => {
      const handleStorageChange = () => {
        if (user && user.role === 'teacher') {
          console.log('📡 [Storage Change] Recargando datos del profesor...');
          refreshTeacherData();
        }
      };

      // Escuchar cambios en localStorage
      window.addEventListener('storage', handleStorageChange);
      
      // También agregar un listener personalizado para cambios internos
      window.addEventListener('userDataUpdated', handleStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('userDataUpdated', handleStorageChange);
      };
    }, [user]);

    // Function to get task status for current user, considering evaluations
    const getTaskStatusForCurrentUser = (task: Task) => {
      if (task.taskType === 'evaluacion') {
        if (user?.role === 'student') {
          const evaluationResult = evaluationResults[task.id];
          if (evaluationResult) {
            return {
              status: 'reviewed',
              statusText: `${translate('statusFinished')} (${evaluationResult.percentage}%)`,
              statusClass: 'bg-green-500 hover:bg-green-600 text-white'
            };
          } else {
            return {
              status: 'pending',
              statusText: translate('statusPending'),
              statusClass: getStatusColor('pending')
            };
          }
        } else if (user?.role === 'teacher') {
          // Para profesores, mostrar el estado real de la evaluación
          return {
            status: task.status,
            statusText: task.status === 'pending' ? translate('statusPending') : 
                        task.status === 'finished' ? translate('statusFinished') : 
                        translate('statusPending'),
            statusClass: getStatusColor(task.status)
          };
        }
      }

      // Para tareas normales, usar el estado original
      return {
        status: task.status,
        statusText: task.status === 'pending' ? translate('statusPending') : 
                    task.status === 'delivered' ? translate('underReview') :
                    task.status === 'submitted' ? translate('underReview') : 
                    task.status === 'finished' ? translate('statusFinished') : translate('statusFinished'),
        statusClass: getStatusColor(task.status)
      };
    };

    const loadEvaluationResults = () => {
      if (user) {
        const storedResults = localStorage.getItem('smart-student-evaluation-results');
        if (storedResults) {
          const results = JSON.parse(storedResults);
          const userResults = results.filter((result: any) => result.studentId === user.id);
          const resultsMap: {[taskId: string]: any} = {};
          userResults.forEach((result: any) => {
            resultsMap[result.taskId] = result;
          });
          setEvaluationResults(resultsMap);

          // Si es profesor, verificar y actualizar estados de evaluaciones
          if (user.role === 'teacher') {
            // Verificar todas las evaluaciones creadas por este profesor
            const teacherEvaluations = tasks.filter(task => 
              task.taskType === 'evaluacion' && 
              task.assignedById === user.id &&
              task.status === 'pending'
            );
            
            teacherEvaluations.forEach(task => {
              checkAndUpdateEvaluationStatus(task.id);
            });
          }
        }
      }
    };

    // Load tasks and comments
    useEffect(() => {
      loadTasks();
      loadComments();
      loadEvaluationResults();
      
      // Cargar datos del profesor si es un profesor
      if (user && user.role === 'teacher') {
        loadTeacherData();
      }
      
      // 🧹 LIMPIEZA AUTOMÁTICA SÚPER AGRESIVA: Eliminar TODAS las notificaciones "task_completed"
      // Ejecuta en cada carga de página y se repite para mantener el panel limpio
      const cleanupTaskCompletedNotifications = () => {
        if (user?.role === 'teacher') {
          try {
            const notifications = JSON.parse(localStorage.getItem('smart-student-notifications') || '[]');
            const taskCompletedNotifications = notifications.filter((n: any) => n.type === 'task_completed');
            
            console.log(`🔍 [CLEANUP] VERIFICANDO: ${notifications.length} notificaciones totales`);
            console.log(`🎯 [CLEANUP] ENCONTRADAS: ${taskCompletedNotifications.length} notificaciones task_completed`);
            
            if (taskCompletedNotifications.length > 0) {
              // Mostrar detalles de las notificaciones que se van a eliminar
              console.log('📋 [CLEANUP] ELIMINANDO notificaciones task_completed:', 
                taskCompletedNotifications.map((n: any) => ({
                  id: n.id,
                  title: n.taskTitle || n.title,
                  timestamp: n.timestamp
                }))
              );
              
              const cleanedNotifications = notifications.filter((n: any) => n.type !== 'task_completed');
              localStorage.setItem('smart-student-notifications', JSON.stringify(cleanedNotifications));
              
              // Disparar evento para actualizar la UI inmediatamente
              window.dispatchEvent(new CustomEvent('notificationsUpdated', {
                detail: { 
                  type: 'cleanup', 
                  action: 'auto_cleanup_task_completed',
                  removed: taskCompletedNotifications.length 
                }
              }));
              
              console.log(`✅ [CLEANUP] ELIMINADAS: ${taskCompletedNotifications.length} notificaciones task_completed`);
              console.log(`📊 [CLEANUP] RESTANTES: ${cleanedNotifications.length} notificaciones en total`);
            } else {
              console.log(`✅ [CLEANUP] PANEL LIMPIO: No hay notificaciones task_completed`);
            }
          } catch (error) {
            console.warn('⚠️ [CLEANUP] Error al limpiar notificaciones automáticamente:', error);
          }
        }
      };

      // Ejecutar limpieza inicial
      cleanupTaskCompletedNotifications();
      
      // Ejecutar limpieza cada 2 segundos para mantener el panel limpio
      const cleanupInterval = setInterval(cleanupTaskCompletedNotifications, 2000);
      
      // Forzar refresco de tareas para asegurar que el panel de estudiantes se actualice con las entregas
      loadTasks && loadTasks();
      // Si hay un selectedTask, forzar su recarga desde localStorage para obtener la versión más reciente
      if (selectedTask) {
        const storedTasks = localStorage.getItem('smart-student-tasks');
        if (storedTasks) {
          const tasksArr = JSON.parse(storedTasks);
          const updated = tasksArr.find((t: any) => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
      
      // Limpiar interval cuando el componente se desmonte
      return () => {
        clearInterval(cleanupInterval);
      };
    }, []);
    
    // Maneja la navegación desde notificaciones (separado para ejecutarse después de cargar las tareas)
    useEffect(() => {
      if (tasks.length > 0) {
        // Lee los parámetros de la URL para manejar navegación desde notificaciones
        const urlParams = new URLSearchParams(window.location.search);
        const taskIdParam = urlParams.get('taskId');
        const commentIdParam = urlParams.get('commentId');
        const highlightParam = urlParams.get('highlight');
        
        if (taskIdParam) {
          // Busca la tarea por ID y ábrela
          const task = tasks.find(t => t.id === taskIdParam);
          if (task) {
            setSelectedTask(task);
            setShowTaskDialog(true);
            
            // 🔥 ESCENARIO 2: Eliminar notificaciones de comentarios cuando el profesor abre la tarea
            if (user?.role === 'teacher' && user?.username) {
              console.log('🔔 [ESCENARIO 2] Profesor abrió la tarea, eliminando notificaciones de comentarios...');
              
              // 🎯 CAMBIO: NO eliminar automáticamente las notificaciones de evaluaciones completadas
              // Las notificaciones de evaluaciones completadas deben eliminarse solo cuando el profesor
              // hace clic específicamente en "Ver Resultados" desde el panel de notificaciones
              if (task.taskType === 'evaluacion') {
                console.log('🔔 [EVALUACION_VISTA] Profesor abrió evaluación - MANTENIENDO notificaciones de evaluaciones completadas');
                // TaskNotificationManager.removeEvaluationCompletedNotifications(taskIdParam, user.username); // COMENTADO
              }
              
              // Obtener comentarios de esta tarea
              const storedComments = localStorage.getItem('smart-student-task-comments');
              if (storedComments) {
                const allComments: TaskComment[] = JSON.parse(storedComments);
                let hasChanges = false;
                
                // Marcar como leídos todos los comentarios de estudiantes para esta tarea
                const updatedComments = allComments.map(comment => {
                  if (comment.taskId === taskIdParam && 
                      !comment.isSubmission && 
                      comment.studentUsername !== user.username &&
                      !comment.readBy?.includes(user.username)) {
                    
                    console.log(`📖 [ESCENARIO 2] Marcando como leído comentario de ${comment.studentName}: ${comment.comment?.substring(0, 30)}...`);
                    hasChanges = true;
                    
                    return {
                      ...comment,
                      readBy: [...(comment.readBy || []), user.username]
                    };
                  }
                  return comment;
                });
                
                // Guardar cambios si hubo modificaciones
                if (hasChanges) {
                  localStorage.setItem('smart-student-task-comments', JSON.stringify(updatedComments));
                  
                  // Eliminar notificaciones de comentarios para esta tarea
                  TaskNotificationManager.removeCommentNotifications(taskIdParam, user.username);
                  
                  // Disparar evento para actualizar notificaciones
                  window.dispatchEvent(new CustomEvent('taskNotificationsUpdated', {
                    detail: { 
                      type: 'task_opened',
                      taskId: taskIdParam,
                      action: 'remove_comment_notifications'
                    }
                  }));
                  
                  // ✅ NUEVA MEJORA: También disparar evento para actualizar contadores del dashboard
                  window.dispatchEvent(new CustomEvent('updateDashboardCounts', {
                    detail: { userRole: user.role, action: 'task_opened', taskId: taskIdParam }
                  }));
                  
                  console.log('✅ [ESCENARIO 2] Comentarios marcados como leídos y notificaciones eliminadas');
                }
              }
            }
            
            // Si hay un ID de comentario para destacar
            if (commentIdParam && highlightParam === 'true') {
              setHighlightedCommentId(commentIdParam);
              // Programar un desplazamiento al comentario después de que se abra el diálogo
              setTimeout(() => {
                const commentElement = document.getElementById(`comment-${commentIdParam}`);
                if (commentElement) {
                  commentElement.scrollIntoView({ behavior: 'smooth' });
                }
              }, 500); // Pequeño retraso para asegurar que el diálogo esté completamente abierto
            }
          }
        }
      }
    }, [tasks]);

    // Limpiar highlightedCommentId cuando se cierra el diálogo y recargar comentarios cuando se abre
    useEffect(() => {
      if (!showTaskDialog) {
        setHighlightedCommentId(null);
        
        // 🔥 NUEVA MEJORA: Disparar evento cuando se cierra el diálogo para actualizar el dashboard
        if (user?.role === 'student') {
          console.log('🔔 [TaskDialog] Closed - dispatching dashboard update event');
          window.dispatchEvent(new CustomEvent('taskDialogClosed', { 
            detail: { 
              userRole: user.role,
              username: user.username,
              action: 'task_dialog_closed'
            } 
          }));
        }
      } else {
        // Recargar comentarios cuando se abre el diálogo para tener datos frescos
        console.log('🔄 Reloading comments because task dialog opened');
        loadComments();
        
        // Si el usuario es estudiante y hay una tarea seleccionada, marcar TODOS los comentarios como leídos
        if (user?.role === 'student' && selectedTask && user.username) {
          console.log('🔔 Marking ALL comments as read for task', selectedTask.id);
          
          // Usar setTimeout para asegurar que los comentarios se cargan primero
          setTimeout(() => {
            // Marcar directamente en localStorage todos los comentarios de la tarea como leídos
            const storedComments = localStorage.getItem('smart-student-task-comments');
            if (storedComments) {
              const comments = JSON.parse(storedComments);
              let updated = false;
              
              const updatedComments = comments.map((comment: any) => {
                if (
                  comment.taskId === selectedTask.id && 
                  comment.studentUsername !== user.username && // No marcar comentarios propios
                  (!comment.readBy?.includes(user.username))
                ) {
                  updated = true;
                  console.log(`🔔 Marking comment ${comment.id} as read`);
                  return {
                    ...comment,
                    isNew: false,
                    readBy: [...(comment.readBy || []), user.username]
                  };
                }
                return comment;
              });
              
              if (updated) {
                localStorage.setItem('smart-student-task-comments', JSON.stringify(updatedComments));
                console.log(`🔔 ✅ Marked all comments for task ${selectedTask.id} as read`);
                
                // Disparar eventos para actualizar la UI
                document.dispatchEvent(new Event('commentsUpdated'));
                window.dispatchEvent(new CustomEvent('studentCommentsUpdated', { 
                  detail: { 
                    username: user.username,
                    taskId: selectedTask.id,
                    action: 'marked_as_read_bulk'
                  } 
                }));
                
                // Disparar evento para actualizar dashboard
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('updateDashboardCounts', {
                    detail: { userRole: 'student', action: 'task_opened' }
                  }));
                }, 100);
              }
            }
          }, 200);
          
          // También usar la función del TaskNotificationManager como respaldo
          TaskNotificationManager.markCommentsAsReadForTask(selectedTask.id, user.username);
        }
      }
    }, [showTaskDialog, selectedTask, user]);

    // Listener para actualizar el panel de estudiantes cuando hay entregas
    useEffect(() => {
      const handleStudentPanelUpdate = (event: CustomEvent) => {
        console.log('🔄 Student panel update event:', event.detail);
        // Recargar comentarios para actualizar el estado de los estudiantes
        loadComments();
        // Si el diálogo está abierto, forzar re-render del panel
        if (showTaskDialog && selectedTask) {
          setTimeout(() => {
            console.log('🔄 Forcing panel refresh after student submission');
            setSelectedTask({...selectedTask}); // Trigger re-render
          }, 500);
        }
      };

      window.addEventListener('studentPanelUpdate', handleStudentPanelUpdate as EventListener);
      
      return () => {
        window.removeEventListener('studentPanelUpdate', handleStudentPanelUpdate as EventListener);
      };
    }, [showTaskDialog, selectedTask]);

    // Verificación periódica del estado de evaluaciones (solo para profesores)
    useEffect(() => {
      if (user?.role !== 'teacher') return;

      const checkEvaluationsInterval = setInterval(() => {
        const allEvaluations = tasks.filter(task => 
          task.taskType === 'evaluacion' && 
          task.assignedById === user.id
        );

        console.log(`🔄 Verificación periódica: ${allEvaluations.length} evaluaciones del profesor`);
        allEvaluations.forEach(task => {
          console.log(`⏰ Verificando evaluación "${task.title}" - Estado: ${task.status}`);
          checkAndUpdateEvaluationStatus(task.id);
        });
      }, 30000); // Verificar cada 30 segundos

      return () => clearInterval(checkEvaluationsInterval);
    }, [user, tasks]);

    const loadTasks = () => {
      const storedTasks = localStorage.getItem('smart-student-tasks');
      const usersText = localStorage.getItem('smart-student-users');
      const allUsers: ExtendedUser[] = usersText ? JSON.parse(usersText) : [];

      if (storedTasks) {
        let tasksData = JSON.parse(storedTasks) as Partial<Task>[];
        let tasksModified = false;

        tasksData = tasksData.map(task => {
          const migratedTask: Partial<Task> = { ...task };
          // Migrate assignedBy to assignedById
          if ((task as any).assignedBy && !task.assignedById) {
            const teacher = allUsers.find(u => u.username === (task as any).assignedBy && u.role === 'teacher');
            if (teacher && teacher.id) {
              migratedTask.assignedById = teacher.id;
              delete (migratedTask as any).assignedBy; // Remove old field
              tasksModified = true;
            } else {
              // console.warn(`Teacher username ${(task as any).assignedBy} not found for task ${task.title}`);
              migratedTask.assignedById = (task as any).assignedBy; // Keep old value if no ID found, mark for review
            }
          }

          // Migrate assignedStudents (usernames) to assignedStudentIds
          if ((task as any).assignedStudents && !task.assignedStudentIds) {
            migratedTask.assignedStudentIds = (task as any).assignedStudents
              .map((username: string) => {
                const student = allUsers.find(u => u.username === username && u.role === 'student');
                if (student && student.id) return student.id;
                // console.warn(`Student username ${username} not found for task ${task.title}`);
                return null;
              })
              .filter((id: string | null) => id !== null) as string[];
            delete (migratedTask as any).assignedStudents;
            tasksModified = true;
          }
          // Course is expected to be courseId, no direct migration here, assumed to be correct from creation
          return migratedTask;
        });

        setTasks(tasksData as Task[]);
        if (tasksModified) {
          // console.log("Migrating tasks in localStorage due to ID changes...");
          localStorage.setItem('smart-student-tasks', JSON.stringify(tasksData));
        }

        // Verificar y corregir el estado de evaluaciones al cargar tareas
        const evaluationTasks = (tasksData as Task[]).filter(task => 
          task.taskType === 'evaluacion'
        );
        
        console.log(`🔍 Verificando estados de ${evaluationTasks.length} evaluaciones al cargar...`);
        evaluationTasks.forEach(task => {
          console.log(`📋 Evaluación "${task.title}" - Estado actual: ${task.status}`);
          // Usar setTimeout para evitar problemas de estado
          setTimeout(() => checkAndUpdateEvaluationStatus(task.id), 100);
        });

        // 🔥 NUEVO: Limpiar notificaciones obsoletas de evaluaciones ya finalizadas
        if (user?.role === 'teacher') {
          setTimeout(() => {
            console.log('🧹 Limpiando notificaciones obsoletas de evaluaciones finalizadas...');
            const finishedEvaluations = (tasksData as Task[]).filter(task => 
              task.taskType === 'evaluacion' && 
              task.status === 'finished' &&
              task.assignedById === user.id
            );
            
            finishedEvaluations.forEach(task => {
              TaskNotificationManager.removeNotificationsForTask(task.id, ['pending_grading']);
              console.log(`🗑️ Removed obsolete notifications for finished evaluation: ${task.title}`);
            });
            
            if (finishedEvaluations.length > 0) {
              window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
              console.log(`✅ Cleaned up notifications for ${finishedEvaluations.length} finished evaluations`);
            }
          }, 500);
        }
      }
    };

    const loadComments = () => {
      const storedComments = localStorage.getItem('smart-student-task-comments');
      const usersText = localStorage.getItem('smart-student-users');
      const allUsers: ExtendedUser[] = usersText ? JSON.parse(usersText) : [];

      if (storedComments) {
        let commentsData = JSON.parse(storedComments) as Partial<TaskComment>[];
        let commentsModified = false;

        commentsData = commentsData.map(comment => {
          const migratedComment: Partial<TaskComment> = { ...comment };
          if ((comment as any).studentUsername && !comment.studentId) {
            const student = allUsers.find(u => u.username === (comment as any).studentUsername && u.role === 'student');
            if (student && student.id) {
              migratedComment.studentId = student.id;
              // studentName can be kept or re-fetched based on studentId if needed for consistency
              // migratedComment.studentName = student.displayName;
              delete (migratedComment as any).studentUsername;
              commentsModified = true;
            } else {
              // console.warn(`Student username ${(comment as any).studentUsername} not found for comment ${comment.id}`);
              migratedComment.studentId = (comment as any).studentUsername; // Keep old value if no ID found
            }
          }
          return migratedComment;
        });

        console.log('📥 Loading comments from localStorage:', {
          totalComments: commentsData.length,
          // submissions: commentsData.filter((c: any) => c.isSubmission),
          // allComments: commentsData
        });
        setComments(commentsData as TaskComment[]);
        if (commentsModified) {
          // console.log("Migrating comments in localStorage due to ID changes...");
          localStorage.setItem('smart-student-task-comments', JSON.stringify(commentsData));
        }

      } else {
        console.log('📥 No comments found in localStorage');
        setComments([]);
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

    // Get available courses and subjects for teacher
    const getAvailableCourses = () => {
      if (user?.role === 'teacher') {
        // Primero usar el estado cargado si está disponible
        if (teacherCourses.length > 0) {
          return teacherCourses.map(course => course.id);
        }
        
        // Fallback a los cursos del usuario del contexto
        return user.activeCourses || [];
      }
      return [];
    };

    // Function to get course name from course ID
    const getCourseNameById = (courseId: string): string => {
      const coursesText = localStorage.getItem('smart-student-courses');
      if (coursesText) {
        const courses = JSON.parse(coursesText);
        const course = courses.find((c: any) => c.id === courseId);
        return course ? course.name : courseId; // Return name if found, otherwise return ID
      }
      return courseId;
    };

    // Function to get teacher username from teacher ID
    const getTeacherUsernameById = (teacherId: string): string => {
      const usersText = localStorage.getItem('smart-student-users');
      if (usersText) {
        const users = JSON.parse(usersText);
        const teacher = users.find((u: any) => u.id === teacherId && u.role === 'teacher');
        return teacher ? teacher.username : teacherId;
      }
      return teacherId;
    };

    // Function to get all courses with their names for dropdown
    const getAvailableCoursesWithNames = () => {
      if (user?.role === 'teacher') {
        // 🎯 CORRECCIÓN: Usar courseSubjectAssignments para obtener cursos específicos del profesor
        
        // Primero, intentar obtener desde el localStorage actualizado
        const usersText = localStorage.getItem('smart-student-users');
        if (usersText) {
          const users = JSON.parse(usersText);
          const currentUser = users.find((u: any) => u.username === user.username);
          
          if (currentUser && currentUser.courseSubjectAssignments && currentUser.courseSubjectAssignments.length > 0) {
            // Extraer cursos únicos de las asignaciones con sus IDs y nombres
            const uniqueCourses = currentUser.courseSubjectAssignments
              .map((assignment: any) => ({ 
                id: assignment.courseId, 
                name: assignment.courseName 
              }))
              .filter((course: {id: string, name: string}, index: number, array: {id: string, name: string}[]) => 
                array.findIndex((c: {id: string, name: string}) => c.id === course.id) === index
              ); // Eliminar duplicados por ID
            
            console.log('🏫 [getAvailableCoursesWithNames] Cursos específicos del profesor:', uniqueCourses);
            return uniqueCourses;
          }
        }
        
        // Segundo, usar el estado cargado si está disponible (fallback)
        if (teacherCourses.length > 0) {
          console.log('🏫 [getAvailableCoursesWithNames] Usando teacherCourses del estado:', teacherCourses);
          return teacherCourses;
        }
        
        // Tercero, generar desde los cursos del usuario del contexto (fallback)
        const courseIds = user.activeCourses || [];
        const coursesFromContext = courseIds.map(courseId => ({
          id: courseId,
          name: getCourseNameById(courseId)
        }));
        console.log('🏫 [getAvailableCoursesWithNames] Usando activeCourses del contexto:', coursesFromContext);
        return coursesFromContext;
      }
      return [];
    };

    // Función para refrescar los datos del profesor cuando cambien en gestión de usuarios
    const refreshTeacherData = () => {
      if (user && user.role === 'teacher') {
        loadTeacherData();
      }
    };

    // Función para cargar datos del profesor
    const loadTeacherData = () => {
      try {
        if (!user?.username) return;
        
        // 🎯 CORRECCIÓN: Cargar datos directamente desde localStorage usando courseSubjectAssignments
        const usersText = localStorage.getItem('smart-student-users');
        if (usersText) {
          const users = JSON.parse(usersText);
          const currentUser = users.find((u: any) => u.username === user.username);
          
          if (currentUser && currentUser.courseSubjectAssignments && currentUser.courseSubjectAssignments.length > 0) {
            // Extraer asignaturas únicas de las asignaciones
            const uniqueSubjects = currentUser.courseSubjectAssignments
              .flatMap((assignment: any) => assignment.subjects)
              .filter((subject: string, index: number, array: string[]) => array.indexOf(subject) === index);
            
            setTeacherSubjects(uniqueSubjects);
            console.log('📚 [loadTeacherData] Asignaturas específicas cargadas:', uniqueSubjects);
            
            // Extraer cursos únicos con sus nombres de las asignaciones
            const uniqueCourses = currentUser.courseSubjectAssignments
              .map((assignment: any) => ({ 
                id: assignment.courseId, 
                name: assignment.courseName 
              }))
              .filter((course: {id: string, name: string}, index: number, array: {id: string, name: string}[]) => 
                array.findIndex((c: {id: string, name: string}) => c.id === course.id) === index
              );
            
            setTeacherCourses(uniqueCourses);
            console.log('🏫 [loadTeacherData] Cursos específicos cargados:', uniqueCourses);
            
            return; // Datos cargados exitosamente
          }
        }
        
        // Fallback: usar el sistema anterior si no hay courseSubjectAssignments
        const teacherData = getUpdatedTeacherData(user.username);
        if (teacherData && validateTeacherData(teacherData)) {
          // Cargar asignaturas del profesor (método anterior)
          setTeacherSubjects(teacherData.teachingSubjects || []);
          console.log('📚 [loadTeacherData] Asignaturas cargadas (fallback):', teacherData.teachingSubjects);
          
          // Cargar cursos del profesor con sus nombres (método anterior)
          const coursesWithNames = (teacherData.activeCourses || []).map((courseId: string) => ({
            id: courseId,
            name: getCourseNameById(courseId)
          }));
          setTeacherCourses(coursesWithNames);
          console.log('🏫 [loadTeacherData] Cursos cargados (fallback):', coursesWithNames);
        } else {
          console.warn('⚠️ [loadTeacherData] Datos del profesor no válidos o no encontrados');
          // Limpiar estados si no hay datos válidos
          setTeacherSubjects([]);
          setTeacherCourses([]);
        }
      } catch (error) {
        console.error('Error loading teacher data:', error);
        // En caso de error, limpiar estados
        setTeacherSubjects([]);
        setTeacherCourses([]);
      }
    };

    // 🎯 NUEVA FUNCIÓN: Obtener asignaturas específicas para un curso seleccionado
    const getAvailableSubjectsForCourse = (courseId: string) => {
      if (user?.role === 'teacher' && courseId) {
        // Obtener desde el localStorage actualizado usando courseSubjectAssignments
        const usersText = localStorage.getItem('smart-student-users');
        if (usersText) {
          const users = JSON.parse(usersText);
          const currentUser = users.find((u: any) => u.username === user.username);
          
          if (currentUser && currentUser.courseSubjectAssignments && currentUser.courseSubjectAssignments.length > 0) {
            // Buscar la asignación específica para este curso
            const courseAssignment = currentUser.courseSubjectAssignments.find(
              (assignment: any) => assignment.courseId === courseId
            );
            
            if (courseAssignment && courseAssignment.subjects) {
              console.log(`📚 [getAvailableSubjectsForCourse] Asignaturas para curso ${courseId}:`, courseAssignment.subjects);
              return courseAssignment.subjects;
            }
          }
        }
        
        // Fallback: devolver todas las asignaturas disponibles si no se encuentra la asignación específica
        console.warn(`⚠️ [getAvailableSubjectsForCourse] No se encontraron asignaturas específicas para curso ${courseId}, usando todas las disponibles`);
        return getAvailableSubjects();
      }
      return [];
    };

    const getAvailableSubjects = () => {
      if (user?.role === 'teacher') {
        // 🎯 CORRECCIÓN: Usar courseSubjectAssignments para obtener asignaturas específicas del profesor
        
        // Primero, intentar obtener desde el localStorage actualizado
        const usersText = localStorage.getItem('smart-student-users');
        if (usersText) {
          const users = JSON.parse(usersText);
          const currentUser = users.find((u: any) => u.username === user.username);
          
          if (currentUser && currentUser.courseSubjectAssignments && currentUser.courseSubjectAssignments.length > 0) {
            // Extraer todas las asignaturas únicas de todas las asignaciones de curso
            const allSubjects = currentUser.courseSubjectAssignments
              .flatMap((assignment: any) => assignment.subjects)
              .filter((subject: string, index: number, array: string[]) => array.indexOf(subject) === index); // Eliminar duplicados
            
            console.log('📚 [getAvailableSubjects] Asignaturas específicas del profesor:', allSubjects);
            return allSubjects;
          }
        }
        
        // Segundo, usar el estado cargado si está disponible (fallback)
        if (teacherSubjects.length > 0) {
          console.log('📚 [getAvailableSubjects] Usando teacherSubjects del estado:', teacherSubjects);
          return teacherSubjects;
        }
        
        // Tercero, intentar obtener desde teachingAssignments (estructura antigua)
        if (user.teachingAssignments && user.teachingAssignments.length > 0) {
          const subjects = [...new Set(user.teachingAssignments.map(ta => ta.subject))];
          console.log('📚 [getAvailableSubjects] Usando teachingAssignments:', subjects);
          return subjects;
        }
        
        // Último fallback: asignaturas generales (NO debería llegar aquí en producción)
        console.warn('⚠️ [getAvailableSubjects] Usando fallback - el profesor no tiene asignaciones específicas');
        return ['Matemáticas', 'Lenguaje y Comunicación', 'Ciencias Naturales', 'Historia, Geografía y Ciencias Sociales'];
      }
      return [];
    };

    // Get students for selected course
    const getStudentsForCourse = (courseId: string): { id: string, username: string, displayName: string }[] => {
      if (!courseId) return [];
      const usersText = localStorage.getItem('smart-student-users');
      const allUsers: ExtendedUser[] = usersText ? JSON.parse(usersText) : [];

      return allUsers
        .filter(u => u.role === 'student' && u.activeCourses && u.activeCourses.includes(courseId))
        .map(u => ({ id: u.id, username: u.username, displayName: u.displayName }));
    };

    // Get students from a specific course, ensuring they are assigned to the current teacher for that task
    const getStudentsFromCourseRelevantToTask = (courseId: string, teacherId: string | undefined) => {
      if (!courseId) {
        console.log(`⚠️ getStudentsFromCourseRelevantToTask: courseId es null`);
        return [];
      }
      
      console.log(`🏫 getStudentsFromCourseRelevantToTask: courseId=${courseId}, teacherId=${teacherId}`);
      
      const usersText = localStorage.getItem('smart-student-users');
      const allUsers: ExtendedUser[] = usersText ? JSON.parse(usersText) : [];
      console.log(`👥 Total usuarios: ${allUsers.length}`);

      const studentUsers = allUsers.filter(u => {
        const isStudent = u.role === 'student';
        const isInCourse = u.activeCourses?.includes(courseId);
        
        // 🔧 PARCHE: Ser más flexible con la asignación de profesor
        // Si no existe assignedTeacherId, incluir todos los estudiantes del curso
        const isAssignedToTeacher = !teacherId || !u.assignedTeacherId || u.assignedTeacherId === teacherId;
        
        console.log(`👤 Usuario ${u.username}: estudiante=${isStudent}, en curso=${isInCourse}, asignado a profesor=${isAssignedToTeacher} (teacherId=${u.assignedTeacherId})`);
        
        return isStudent && isInCourse && isAssignedToTeacher;
      }).map(u => ({
        id: u.id, // Include ID
        username: u.username,
        displayName: u.displayName || u.username
      }));

      console.log(`🎓 Students from course "${courseId}" for teacher "${teacherId}":`, {
        studentsInCourse: studentUsers,
        count: studentUsers.length
      });
      
      return studentUsers;
    };

    // Función para obtener los estudiantes asignados a una tarea
    const getAssignedStudentsForTask = (task: Task | null): { id: string, username: string, displayName: string }[] => {
      if (!task || !task.id) {
        console.log(`⚠️ getAssignedStudentsForTask: task es null o no tiene ID`);
        return [];
      }
      
      console.log(`🔍 getAssignedStudentsForTask: Procesando tarea "${task.title}"`);
      console.log(`📋 Detalles de la tarea:`, {
        id: task.id,
        assignedTo: task.assignedTo,
        course: task.course,
        assignedById: task.assignedById,
        assignedStudentIds: task.assignedStudentIds
      });
      
      const usersText = localStorage.getItem('smart-student-users');
      const allUsers: ExtendedUser[] = usersText ? JSON.parse(usersText) : [];
      console.log(`👥 Total usuarios en sistema: ${allUsers.length}`);

      let students: { id: string, username: string, displayName: string }[] = [];

      // Si la tarea está asignada a estudiantes específicos
      if (task.assignedTo === 'student' && task.assignedStudentIds) {
        console.log(`🎯 Tarea asignada a estudiantes específicos: ${task.assignedStudentIds.join(', ')}`);
        students = task.assignedStudentIds.map(studentId => {
          const userData = allUsers.find(u => u.id === studentId);
          const student = {
            id: studentId,
            username: userData?.username || `user-${studentId}`,
            displayName: userData?.displayName || `Estudiante ${studentId}`
          };
          console.log(`👤 Estudiante mapeado: ${student.displayName} (${student.id})`);
          return student;
        }).filter(s => s.id); // Filter out any potential nulls if a studentId wasn't found
      }
      // Si la tarea está asignada a todo un curso
      else if (task.assignedTo === 'course' && task.course) { // task.course is courseId
        console.log(`🏫 Tarea asignada a curso completo: ${task.course}`);
        students = getStudentsFromCourseRelevantToTask(task.course, task.assignedById);
        console.log(`👥 Estudiantes encontrados en curso: ${students.length}`);
      }
      else {
        console.log(`⚠️ Configuración de asignación no reconocida`);
      }

      // Solo mostrar los estudiantes que están explícitamente asignados
      // Sin agregar estudiantes adicionales que hayan entregado por error

      // Specific filtering for "luis" is removed as it's not ID-based and generally not robust.
      // If specific exclusions are needed, they should be handled by a more generic mechanism.

      console.log(`📋 Students assigned to task "${task.title}":`, {
        taskAssignedTo: task.assignedTo,
        courseId: task.course, // task.course is courseId
        studentsFound: students,
        studentsCount: students.length,
        studentUsernames: students.map(s => s.username),
        studentDisplayNames: students.map(s => s.displayName)
      });

      return students;
    };

    // Función para obtener la entrega de un estudiante por su ID
    const getStudentSubmission = (taskId: string, studentId: string): TaskComment | undefined => {
      if (!taskId || !studentId) return undefined;

      // console.log(`🔍 getStudentSubmission searching for studentId: "${studentId}" in task: "${taskId}"`);
      
      const submission = comments.find(c =>
        c.taskId === taskId &&
        c.studentId === studentId &&
        c.isSubmission
      );
      
      if (submission) {
        // console.log(`✅ Submission found for studentId "${studentId}":`, submission);
        return {
          ...submission,
          grade: submission.grade || undefined,
          teacherComment: submission.teacherComment || '',
          reviewedAt: submission.reviewedAt || (submission.grade !== undefined && !submission.reviewedAt ? new Date().toISOString() : undefined)
        };
      }
      
      // console.log(`❌ No submission found for studentId "${studentId}" in task "${taskId}"`);
      return undefined;
    };

    // Función para obtener el resultado de una evaluación de un estudiante
    const getStudentEvaluationResult = (taskId: string, studentId: string) => { // Changed studentUsername to studentId
      // En un entorno real, esta información vendría de una tabla específica en la base de datos
      // Por ahora, para propósitos de demostración, no devolvemos nada ya que no hay evaluaciones completadas
      
      // Buscar si existe algún resultado de evaluación guardado en localStorage
      const storedResults = localStorage.getItem('smart-student-evaluation-results');
      if (storedResults) {
        const results = JSON.parse(storedResults);
        return results.find((result: any) => result.taskId === taskId && result.studentId === studentId);
      }
      
      // Si no hay resultados guardados, el estudiante no ha completado la evaluación
      return undefined;
    };

    // Función para verificar si todos los estudiantes han completado la evaluación
    const checkAndUpdateEvaluationStatus = (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || task.taskType !== 'evaluacion') return;

      const assignedStudents = getAssignedStudentsForTask(task);
      console.log(`🔍 Verificando estado de evaluación para tarea "${task.title}" (ID: ${taskId})`);
      console.log(`� Estado actual de la tarea: "${task.status}"`);
      console.log(`�👥 Estudiantes asignados: ${assignedStudents.length}`, assignedStudents.map(s => s.displayName));

      const completedStudents = assignedStudents.filter(student => {
        const result = getStudentEvaluationResult(taskId, student.id);
        console.log(`📊 Estudiante ${student.displayName} (ID: ${student.id}) - Resultado:`, result ? 'Completado' : 'Pendiente');
        return result !== undefined;
      });

      const completedCount = completedStudents.length;
      console.log(`📈 Progreso: ${completedCount}/${assignedStudents.length} estudiantes han completado la evaluación`);

      // Si todos los estudiantes han completado la evaluación, actualizar el estado a 'finished'
      if (completedCount === assignedStudents.length && assignedStudents.length > 0) {
        if (task.status !== 'finished') {
          console.log(`✅ ¡Todos los estudiantes completaron la evaluación! Cambiando estado de "${task.status}" a 'finished'`);
          const updatedTasks = tasks.map(t => 
            t.id === taskId ? { ...t, status: 'finished' as const } : t
          );
          saveTasks(updatedTasks);
          
          // 🔥 NUEVO: Limpiar notificaciones pendientes del profesor para esta evaluación completada
          TaskNotificationManager.removeNotificationsForTask(taskId, ['pending_grading']);
          console.log('🧹 Removed pending evaluation notifications for teacher after all students completed');
          
          // Disparar evento para actualizar notificaciones en tiempo real
          window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
          
          // Mostrar notificación al profesor
          toast({
            title: "Evaluación Finalizada",
            description: `La evaluación "${task.title}" ha sido completada por todos los estudiantes.`,
            duration: 5000,
          });
        } else {
          console.log(`✅ Evaluación ya está marcada como 'finished' correctamente`);
        }
      } else {
        console.log(`⏳ Evaluación pendiente: ${assignedStudents.length - completedCount} estudiantes aún no han completado`);
        
        // CORRECCIÓN IMPORTANTE: Asegurar que el estado se mantenga como 'pending' si no todos han completado
        if (task.status !== 'pending') {
          console.log(`🔄 CORRIGIENDO: Restaurando estado de "${task.status}" a 'pending' porque no todos han completado`);
          const updatedTasks = tasks.map(t => 
            t.id === taskId ? { ...t, status: 'pending' as const } : t
          );
          saveTasks(updatedTasks);
        } else {
          console.log(`✅ Estado 'pending' es correcto`);
        }
      }
    };

    // Filter tasks based on user role
    // Genera la fecha mínima en formato ISO para el input datetime-local
    const getMinDateTimeString = () => {
      const now = new Date();
      return now.toISOString().slice(0, 16); // Formato YYYY-MM-DDTHH:MM requerido para datetime-local
    };
    
    // Utilidad para añadir el atributo min a los inputs de fecha
    useEffect(() => {
      // Aplicar el atributo min a todos los inputs de tipo datetime-local
      const dateInputs = document.querySelectorAll('input[type="datetime-local"]');
      const minDate = getMinDateTimeString();
      
      dateInputs.forEach(input => {
        input.setAttribute('min', minDate);
      });
    }, [showCreateDialog, showEditDialog]); // Se ejecuta cuando se abre un diálogo

    const getFilteredTasks = () => {
      if (user?.role === 'teacher') {
        // Los profesores ven solo las tareas que crearon
        let filtered = tasks.filter(task => task.assignedById === user.id);
        if (selectedCourseFilter !== 'all') {
          filtered = filtered.filter(task => task.course === selectedCourseFilter);
        }

        // Verificar estado de evaluaciones pendientes para actualizar automáticamente
        filtered
          .filter(task => task.taskType === 'evaluacion' && task.status === 'pending')
          .forEach(task => {
            // Realizar verificación asíncrona para no bloquear el renderizado
            setTimeout(() => checkAndUpdateEvaluationStatus(task.id), 0);
          });

        return filtered;
      } else if (user?.role === 'student') {
        // Los estudiantes solo ven tareas que existen actualmente y que están asignadas a su curso o usuario
        // Además, solo deben ver tareas activas (no eliminadas ni antiguas)
        // Si el profesor elimina una tarea, ya no debe aparecer para el estudiante
        return tasks.filter(task => {
          // Solo tareas asignadas por un profesor válido y que existan
          if (!task.assignedById) return false;
          if (task.assignedTo === 'course') {
            return user.activeCourses?.includes(task.course);
          } else {
            return task.assignedStudentIds?.includes(user.id);
          }
        });
      }
      return [];
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
      const stats: { [course: string]: { total: number; pending: number; submitted: number; reviewed: number } } = {};
      
      Object.keys(tasksByCourse).forEach(course => {
        const courseTasks = tasksByCourse[course];
        stats[course] = {
          total: courseTasks.length,
          pending: 0,
          submitted: 0,
          reviewed: 0
        };
        
        // Calculate statistics based on actual task status and student submissions
        courseTasks.forEach(task => {
          // Obtener todos los estudiantes asignados a esta tarea
          const assignedStudents = getAssignedStudentsForTask(task);
          
          // Verificar si todos los estudiantes han entregado la tarea
          const allSubmitted = assignedStudents.length > 0 && 
            assignedStudents.every(student => 
              hasStudentSubmitted(task.id, student.username)
            );
          
          // Verificar si al menos un estudiante ha entregado
          const someSubmitted = assignedStudents.some(student => 
            hasStudentSubmitted(task.id, student.username)
          );
          
          if (allSubmitted) {
            if (task.status === 'reviewed') {
              stats[course].reviewed++;
            } else {
              stats[course].submitted++;
            }
          } else if (someSubmitted) {
            // Si hay entregas parciales, sigue siendo pendiente
            stats[course].pending++;
          } else {
            stats[course].pending++;
          }
        });
      });
      
      return stats;
    };

    const handleCreateTask = () => {
      if (!formData.title || !formData.description || !formData.course || !formData.dueDate || !formData.subject) {
        toast({
          title: translate('error'),
          description: translate('completeAllFields'),
          variant: 'destructive'
        });
        return;
      }

      // Validación específica para evaluaciones
      if (formData.taskType === 'evaluacion') {
        if (!formData.topic || !formData.numQuestions || !formData.timeLimit) {
          toast({
            title: 'Error',
            description: 'Para las evaluaciones debe especificar: Tema, Cantidad de Preguntas y Tiempo límite',
            variant: 'destructive'
          });
          return;
        }
        
        if (![5, 10, 15, 20, 25, 30].includes(formData.numQuestions)) {
          toast({
            title: 'Error', 
            description: 'La cantidad de preguntas debe ser una de las opciones disponibles: 5, 10, 15, 20, 25 o 30',
            variant: 'destructive'
          });
          return;
        }
        
        if (formData.timeLimit < 1 || formData.timeLimit > 180) {
          toast({
            title: 'Error',
            description: 'El tiempo límite debe estar entre 1 y 180 minutos',
            variant: 'destructive'
          });
          return;
        }
      }
      
      // Validar que la fecha límite sea en el futuro
      const dueDate = new Date(formData.dueDate);
      const now = new Date();
      if (dueDate <= now) {
        toast({
          title: translate('error'),
          description: translate('dueDateMustBeFuture'),
          variant: 'destructive'
        });
        return;
      }

      const taskId = `task_${Date.now()}`;
      const newTask: Task = {
        id: taskId,
        title: formData.title,
        description: formData.description,
        subject: formData.subject, // This might become subjectId later
        course: formData.course, // This is expected to be courseId from the form
        assignedById: user?.id || '', // Use user ID
        assignedByName: user?.displayName || '', // Keep for display convenience
        assignedTo: formData.assignedTo,
        assignedStudentIds: formData.assignedTo === 'student' ? formData.assignedStudentIds : undefined, // Use assignedStudentIds
        dueDate: formData.dueDate,
        createdAt: new Date().toISOString(),
        status: 'pending',
        priority: formData.priority,
        attachments: taskAttachments,
        taskType: formData.taskType,
        // Include evaluation fields if it's an evaluation
        topic: formData.taskType === 'evaluacion' ? formData.topic : undefined,
        numQuestions: formData.taskType === 'evaluacion' ? formData.numQuestions : undefined,
        timeLimit: formData.taskType === 'evaluacion' ? formData.timeLimit : undefined
      };

      const updatedTasks = [...tasks, newTask];
      saveTasks(updatedTasks);
      
      // 🔔 NUEVA FUNCIONALIDAD: Crear notificación de "Tarea Pendiente" para el profesor
      TaskNotificationManager.createPendingGradingNotification(
        taskId,
        formData.title,
        formData.course, // This is courseId
        formData.subject,
        user?.username || '', // Pass user.username, not user.id
        user?.displayName || '',
        formData.taskType === 'evaluacion' ? 'evaluation' : 'assignment'
      );

      // Crear notificaciones para los estudiantes sobre la nueva tarea
      TaskNotificationManager.createNewTaskNotifications(
        taskId,
        formData.title,
        formData.course, // This is courseId
        formData.subject,
        user?.id || '', // Pass user.id as teacherId
        user?.displayName || '',
        formData.taskType === 'evaluacion' ? 'evaluation' : 'assignment'
      );

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
        assignedStudentIds: [],
        dueDate: '',
        priority: 'medium',
        taskType: 'tarea',
        topic: '',
        numQuestions: 0,
        timeLimit: 0
      });
      setTaskAttachments([]);
      setShowCreateDialog(false);
    };

    const handleAddComment = () => {
      if (!newComment.trim() || !selectedTask) return;

      // Check if student already made a submission for this task
      if (isSubmission && user?.role === 'student' && user.id) {
        const existingSubmission = comments.find(comment => 
          comment.taskId === selectedTask.id && 
          comment.studentId === user.id && 
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

      // Asegurarse de que los archivos adjuntos se incluyan correctamente
      const attachmentsToSave = [...commentAttachments];
      
      // Verificación de archivos adjuntos
      if (user?.role === 'student' && isSubmission && attachmentsToSave.length === 0) {
        console.log('⚠️ Advertencia: Entrega sin archivos adjuntos');
      }

      if (!user) {
        toast({
          title: "Error",
          description: "Usuario no autenticado",
          variant: "destructive"
        });
        return;
      }

      const comment: TaskComment = {
        id: `comment_${Date.now()}`,
        taskId: selectedTask.id,
        studentId: user.role === 'student' ? user.id : user.id, // Usar el ID del profesor cuando sea profesor
        studentUsername: user.role === 'student' ? user.username : user.username, // Usar username del profesor cuando sea profesor
        studentName: user.role === 'student' ? (user.displayName || user.username) :
          `Profesor ${user.displayName || user.username}`, // 🔥 CORRECCIÓN: Si es profesor, mostrar "Profesor [nombre]"
        comment: newComment,
        timestamp: new Date().toISOString(),
        isSubmission: isSubmission,
        attachments: attachmentsToSave, // Usar la copia de archivos adjuntos
        readBy: [], // ✅ NUEVO: Inicializar como array vacío para tracking de lectura
        authorUsername: user.username, // 🔥 NUEVO: Campo para identificar quién escribió realmente el comentario
        authorRole: user.role as 'student' | 'teacher' // 🔥 NUEVO: Campo para identificar el rol del autor
      };

      const updatedComments = [...comments, comment];
      saveComments(updatedComments);
      // Forzar recarga de comentarios desde localStorage para refrescar panel
      loadComments();

      console.log('💾 Comment saved:', {
        isSubmission,
        studentId: user?.id,
        taskId: selectedTask.id,
        commentId: comment.id,
        totalComments: updatedComments.length,
        attachmentsCount: commentAttachments.length,
        attachments: commentAttachments.map(a => a.name)
      });

      // Si es una entrega, notificar al profesor inmediatamente
      if (isSubmission && user?.role === 'student') {
        console.log(`📝 Estudiante ${user.displayName} entregando tarea "${selectedTask.title}"`);
        
        // Crear notificación usando TaskNotificationManager
        TaskNotificationManager.createTaskSubmissionNotification(
          selectedTask.id,
          selectedTask.title,
          selectedTask.course,
          selectedTask.subject,
          user.username,
          user.displayName || user.username,
          getTeacherUsernameById(selectedTask.assignedById)
        );

        toast({
          title: translate('taskSubmitted'),
          description: 'Tu tarea ha sido entregada y el profesor ha sido notificado.',
          variant: 'default'
        });
        
        // Disparar evento para actualizar notificaciones
        window.dispatchEvent(new CustomEvent('notificationsUpdated', {
          detail: { type: 'task_submission', taskId: selectedTask.id, studentId: user.id }
        }));
        
        // Forzar actualización del panel de estudiantes del profesor
        window.dispatchEvent(new CustomEvent('studentPanelUpdate', {
          detail: { taskId: selectedTask.id, studentId: user.id, submissionTime: new Date().toISOString() }
        }));
      }

      // Update task status only if ALL students have submitted - UPDATED para estados mejorados
      if (isSubmission) {
        // Obtener todos los estudiantes asignados a la tarea
        let assignedStudents = getAssignedStudentsForTask(selectedTask);
        
        console.log(`🔍 DEBUG: Verificando entregas para tarea "${selectedTask.title}"`);
        console.log(`👥 Estudiantes asignados: ${assignedStudents.length}`);
        console.log(`📋 Lista de estudiantes:`, assignedStudents);
        console.log(`👤 Usuario actual: ${user?.id} (${user?.username})`);
        
        // Verificar si ahora todos los estudiantes han entregado la tarea
        // Incluimos el comentario actual en la verificación
        console.log(`🔍 Verificando si todos los estudiantes han entregado...`);
        console.log(`📋 Estudiantes asignados:`, assignedStudents);
        
        // 🔥 PARCHE: Si no hay estudiantes asignados, intentar obtenerlos directamente del curso
        if (assignedStudents.length === 0 && selectedTask.course) {
          console.log(`⚠️ No hay estudiantes asignados, obteniendo del curso: ${selectedTask.course}`);
          const courseStudents = getStudentsFromCourseRelevantToTask(selectedTask.course, selectedTask.assignedById);
          console.log(`👥 Estudiantes del curso encontrados: ${courseStudents.length}`, courseStudents);
          assignedStudents = courseStudents;
        }
        
        const allStudentsSubmitted = assignedStudents.length > 0 && 
          assignedStudents.every(student => {
            const hasSubmitted = student.id === user?.id || hasStudentSubmitted(selectedTask.id, student.id);
            console.log(`✅ Estudiante ${student.displayName} (${student.id}): ${hasSubmitted ? 'ENTREGADO' : 'PENDIENTE'}`);
            return hasSubmitted;
          });
        
        // 🔥 CORRECCIÓN: NO cambiar el estado cuando los estudiantes entregan
        // La tarea debe mantenerse en 'pending' hasta que el profesor califique TODAS las entregas
        // El estado solo cambia a 'reviewed' (Finalizada) cuando el profesor termina de calificar a todos
        
        // Log para debug - mostrar cuántos estudiantes han entregado
        const submittedCount = assignedStudents.filter(student => 
          student.id === user?.id || hasStudentSubmitted(selectedTask.id, student.id)
        ).length;
        
        console.log(`📊 Entregas: ${submittedCount}/${assignedStudents.length} estudiantes han entregado la tarea "${selectedTask.title}"`);
        console.log(`⏳ Estado de la tarea mantiene: "pending" hasta que profesor califique todas las entregas`);
        console.log(`🎯 Todos entregaron: ${allStudentsSubmitted ? 'SÍ' : 'NO'}`);
        
        // 🔥 NUEVO: Si todos los estudiantes entregaron, crear notificación de tarea completa
        if (allStudentsSubmitted) {
          console.log(`🚀 Verificando si crear notificación de tarea completa...`);
          console.log(`📋 Detalles para notificación:`, {
            taskId: selectedTask.id,
            taskTitle: selectedTask.title,
            course: selectedTask.course,
            subject: selectedTask.subject,
            assignedById: selectedTask.assignedById,
            taskType: selectedTask.taskType
          });
          
          // � TEMPORALMENTE DESHABILITADO: Bloquear TODAS las notificaciones task_completed hasta resolver duplicados
          console.log(`⚠️ NOTIFICACIÓN BLOQUEADA: Creación de task_completed temporalmente deshabilitada`);
          console.log(`📝 Razón: Evitar duplicados mientras se investiga el problema`);
          
          /* 
          // �🔧 CORRECCIÓN CRÍTICA: NO crear notificaciones para evaluaciones aquí
          // Las evaluaciones ya se manejan en la página de evaluaciones con createEvaluationCompletedNotification
          if (selectedTask.taskType !== 'evaluacion') {
            console.log(`✅ Creando notificación para tarea de tipo: ${selectedTask.taskType}`);
            
            // 🔧 CORRECCIÓN CRÍTICA: Obtener el username del profesor, no usar el ID
            const teacherUsername = getTeacherUsernameById(selectedTask.assignedById);
            
            TaskNotificationManager.createTaskCompletedNotification(
              selectedTask.id,
              selectedTask.title,
              selectedTask.course,
              selectedTask.subject,
              teacherUsername, // Usar username del profesor, no ID
              'assignment' // Solo para assignments, no evaluations
            );
            
            console.log(`✅ Tarea completa: Todos los estudiantes han entregado "${selectedTask.title}"`);
            
            // 🔥 FORZAR REFRESCO DE NOTIFICACIONES
            // Disparar evento personalizado para actualizar el panel de notificaciones
            window.dispatchEvent(new CustomEvent('notificationsUpdated', {
              detail: { type: 'task_completed', taskId: selectedTask.id }
            }));
          } else {
            console.log(`ℹ️ Saltando notificación para evaluación - ya se maneja en página de evaluaciones`);
            console.log(`📝 Evaluación "${selectedTask.title}" completada por todos los estudiantes`);
          }
          */
        }
        
        // NO actualizar el estado aquí - se mantiene en 'pending' hasta calificación completa
      }

      setNewComment('');
      setIsSubmission(false);
      
      // Registrar que estamos limpiando los archivos adjuntos después de guardar el comentario
      console.log('🧹 Limpiando archivos adjuntos después de guardar', commentAttachments.length);
      setCommentAttachments([]);

      if (!isSubmission) {
        toast({
          title: translate('commentAdded'),
          description: translate('commentAddedDesc'),
        });
      }
    };

    // 🚫 FUNCIÓN generateFallbackQuestions ELIMINADA
    // Todas las preguntas deben generarse dinámicamente por la IA basadas en el tema específico indicado por el profesor
    // No se permiten preguntas hardcodeadas o genéricas

    const generateEvaluationQuestions = async (topic: string, numQuestions: number): Promise<any[]> => {
      try {
        console.log(`🤖 Solicitando ${numQuestions} preguntas sobre "${topic}" a la API de IA...`);

        // 1. Hacer una petición POST a la API Route
        const response = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topic, numQuestions, language }),
        });

        console.log('📡 Respuesta del servidor recibida. Status:', response.status);

        // Verificar si la respuesta tiene contenido antes de parsear
        const responseText = await response.text();
        console.log('📄 Contenido de la respuesta:', responseText);

        if (!response.ok) {
          // Si la API no está disponible, mostrar error específico
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { error: responseText || `Error ${response.status}: ${response.statusText}` };
          }
          
          console.error('❌ Error de la API de IA:', {
            status: response.status,
            statusText: response.statusText,
            errorData: errorData,
            responseText: responseText
          });
          
          // Determinar el tipo de error y mostrar mensaje apropiado
          let errorMessage = "Error de la API de IA";
          let errorDescription = "No se pudieron generar las preguntas específicas para el tema solicitado.";
          
          if (response.status === 500 || errorData?.error?.includes('API Key')) {
            errorMessage = "API de IA no configurada";
            errorDescription = "La API de inteligencia artificial no está configurada correctamente. Contacta al administrador.";
          } else if (response.status === 429) {
            errorMessage = "Límite de consultas excedido";
            errorDescription = "Se ha alcanzado el límite de consultas a la IA. Intenta de nuevo más tarde.";
          } else if (response.status === 503) {
            errorMessage = "Servicio de IA no disponible";
            errorDescription = "El servicio de inteligencia artificial no está disponible temporalmente.";
          }
          
          toast({
            title: errorMessage,
            description: errorDescription,
            variant: "destructive",
          });
          
          return []; // Devolver array vacío para indicar fallo
        }

        // 2. Convertir la respuesta a JSON (con validación mejorada)
        if (!responseText.trim()) {
          console.error('❌ Respuesta vacía de la API de IA');
          toast({
            title: "Error de respuesta",
            description: "La API de IA devolvió una respuesta vacía. Intenta de nuevo.",
            variant: "destructive",
          });
          return [];
        }

        let questions;
        try {
          questions = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Error al parsear JSON de la API de IA:', parseError);
          console.error('❌ Contenido que falló al parsear:', responseText);
          toast({
            title: "Error de formato",
            description: "La respuesta de la IA tiene un formato inválido. Intenta de nuevo.",
            variant: "destructive",
          });
          return [];
        }

        console.log('✅ Preguntas recibidas desde la API de IA:', questions.length);
        console.log('🔍 DEBUG - Estructura de primera pregunta:', JSON.stringify(questions[0], null, 2));

        // Validar que se recibieron preguntas válidas
        if (!Array.isArray(questions) || questions.length === 0) {
          console.error('❌ Preguntas inválidas recibidas de la API de IA');
          toast({
            title: "Error de contenido",
            description: "La IA no pudo generar preguntas válidas para el tema especificado.",
            variant: "destructive",
          });
          return [];
        }

        // Validar estructura de cada pregunta con debug mejorado
        console.log('🔍 DEBUG - Validando estructura de preguntas...');
        const validQuestions = questions.filter((q, index) => {
          console.log(`🔍 DEBUG - Pregunta ${index}:`, {
            hasQuestion: typeof q.question === 'string',
            hasOptions: Array.isArray(q.options),
            optionsLength: q.options?.length,
            hasCorrectAnswer: q.correct_answer !== undefined,
            hasCorrectAnswers: q.correct_answers !== undefined,
            hasCorrect: q.correct !== undefined,
            allKeys: Object.keys(q)
          });
          
          const isValid = q && 
            typeof q.question === 'string' && 
            Array.isArray(q.options) && 
            q.options.length > 0 &&
            (q.correct_answer !== undefined || q.correct_answers !== undefined || q.correct !== undefined);
            
          if (!isValid) {
            console.warn(`⚠️ Pregunta ${index} es inválida:`, q);
          }
          
          return isValid;
        });

        if (validQuestions.length === 0) {
          console.error('❌ Ninguna pregunta tiene la estructura correcta');
          toast({
            title: "Error de validación",
            description: "Las preguntas generadas por la IA no tienen la estructura correcta.",
            variant: "destructive",
          });
          return [];
        }

        if (validQuestions.length < questions.length) {
          console.warn(`⚠️ Se filtraron ${questions.length - validQuestions.length} preguntas con estructura inválida`);
        }

        console.log('✅ Preguntas validadas correctamente:', validQuestions.length);

        // 3. Randomizar el orden de las preguntas
        const shuffledQuestions = [...validQuestions].sort(() => 0.5 - Math.random());

        console.log('🔀 Preguntas randomizadas y listas para uso');
        return shuffledQuestions;

      } catch (error: any) {
        console.error("❌ Error crítico al solicitar preguntas de la API de IA:", error);
        
        // Mostrar mensaje de error específico al usuario
        toast({
          title: "Error de conexión",
          description: "No se pudo conectar con la API de IA. Verifica tu conexión a internet e intenta de nuevo.",
          variant: "destructive",
        });
        
        return []; // Devolver array vacío en caso de error crítico
      }
    };

    const handleStartEvaluation = async (task: Task) => {
      // Verificar si ya completó la evaluación
      if (evaluationResults[task.id]) {
        toast({
          title: "Evaluación completada",
          description: "Ya has completado esta evaluación.",
          variant: "destructive"
        });
        return;
      }

      // Validar criterios configurados por el profesor
      const topic = task.topic || 'Tema general';
      const numQuestions = task.numQuestions && task.numQuestions > 0 ? task.numQuestions : 5;
      const timeLimit = task.timeLimit && task.timeLimit > 0 ? task.timeLimit : 10;

      // Mostrar advertencia si algunos criterios no están configurados
      if (!task.topic || !task.numQuestions || !task.timeLimit) {
        console.warn('⚠️ Algunos criterios de evaluación no están configurados por el profesor:', {
          topic: task.topic,
          numQuestions: task.numQuestions, 
          timeLimit: task.timeLimit
        });
      }

      setShowLoadingDialog(true);
      setLoadingProgress(0);
      setLoadingStatus(translate('evalLoadingInitializing'));

      // --- LÓGICA DE CARGA MEJORADA ---
      // 1. Simulación rápida de los pasos iniciales (hasta el 80%)
      const initialSteps = [
        { progress: 20, status: translate('evalLoadingVerifyingConfig') },
        { progress: 50, status: translate('evalLoadingPreparingAI', { topic }) },
        { progress: 80, status: translate('evalLoadingGeneratingQuestions', { count: numQuestions.toString() }) }
      ];

      let stepIndex = 0;
      const initialInterval = setInterval(() => {
        if (stepIndex < initialSteps.length) {
          const step = initialSteps[stepIndex];
          setLoadingProgress(step.progress);
          setLoadingStatus(step.status);
          stepIndex++;
        } else {
          clearInterval(initialInterval);

          // 2. Paso final: La llamada real a la IA
          setLoadingProgress(90);
          setLoadingStatus(translate('evalLoadingConsultingAI'));

          // Llamamos a la función de generación y esperamos a que termine
          generateEvaluationQuestions(topic, numQuestions).then(questions => {
            // 3. Cuando las preguntas llegan, completamos al 100% y cerramos
            setLoadingProgress(100);
            setLoadingStatus(translate('evalLoadingReady'));

            // Pequeña pausa para que el usuario vea el 100%
            setTimeout(() => {
              setShowLoadingDialog(false);

              if (questions.length === 0) {
                // El toast de error ya se muestra dentro de generateEvaluationQuestions
                return;
              }

              console.log('🔍 GENERATED QUESTIONS:', questions.map(q => ({ 
                question: q.question?.substring(0, 50), 
                options: q.options?.map((o: any) => o?.substring(0, 20)) 
              })));

              const timeInSeconds = timeLimit * 60;
              setCurrentEvaluation({
                task,
                questions,
                startTime: new Date(),
                answers: {},
                timeRemaining: timeInSeconds,
                currentQuestionIndex: 0
              });
              setShowEvaluationDialog(true);
              
              // Iniciar countdown del timer
              console.log('🔥 [startEvaluation] Iniciando evaluación con tiempo límite:', timeLimit, 'minutos');
              startEvaluationTimer(timeInSeconds);
            }, 500); // 0.5 segundos de pausa en el 100%
          }).catch(error => {
            // Manejar errores de la IA
            console.error('Error al generar preguntas:', error);
            setShowLoadingDialog(false);
          });
        }
      }, 400); // Intervalo más rápido para la simulación
    };

    const startEvaluationTimer = (initialTime: number) => {
      console.log('🔥 [startEvaluationTimer] Iniciando timer con tiempo:', initialTime);
      let timerRef: NodeJS.Timeout;
      
      timerRef = setInterval(() => {
        setCurrentEvaluation(prev => {
          const newTime = prev.timeRemaining - 1;
          
          if (newTime <= 0) {
            console.log('🔥 [startEvaluationTimer] ¡TIEMPO AGOTADO! Deteniendo timer');
            clearInterval(timerRef);
            
            // Ejecutar handleCompleteEvaluation con un delay para asegurar que el estado se actualice
            setTimeout(() => {
              console.log('🔥 [startEvaluationTimer] Ejecutando handleCompleteEvaluation(true)');
              handleCompleteEvaluation(true);
            }, 200);
            
            return { ...prev, timeRemaining: 0 };
          }
          
          // Log cada segundo cuando queden menos de 30 segundos
          if (newTime <= 30) {
            console.log(`🔥 [startEvaluationTimer] Tiempo restante: ${newTime} segundos`);
          } else if (newTime % 10 === 0) {
            console.log(`🔥 [startEvaluationTimer] Tiempo restante: ${newTime} segundos`);
          }
          
          return { ...prev, timeRemaining: newTime };
        });
      }, 1000);
    };

    const handleReviewEvaluation = async (task: Task) => {
      const evaluationResult = evaluationResults[task.id];
      if (evaluationResult) {
        // Traducir las preguntas dinámicamente según el idioma actual
        const translatedResult = await translateEvaluationResult(evaluationResult, task);
        setCurrentEvaluationReview(translatedResult);
        setShowReviewEvaluationDialog(true);
      }
    };

    // Función para traducir los resultados de evaluación según el idioma actual
    const translateEvaluationResult = async (result: any, task: Task) => {
      const currentLanguage = localStorage.getItem('smart-student-lang') || 'es';
      
      console.log('🔍 TRANSLATION DEBUG - Current language:', currentLanguage);
      console.log('🔍 TRANSLATION DEBUG - LocalStorage key check:', localStorage.getItem('smart-student-lang'));
      console.log('🔍 TRANSLATION DEBUG - All localStorage keys:', Object.keys(localStorage));
      console.log('🔍 TRANSLATION DEBUG - Result has questions:', !!result.questions);
      console.log('🔍 TRANSLATION DEBUG - Questions length:', result.questions?.length);
      
      // FORZAR VERIFICACIÓN: Verificar otras posibles claves de idioma
      const altLanguageCheck = localStorage.getItem('language') || localStorage.getItem('locale') || localStorage.getItem('i18n-language');
      console.log('🔍 TRANSLATION DEBUG - Alternative language keys:', { altLanguageCheck });
      
      // Si ya está en español o no hay preguntas, devolver tal como está
      if (currentLanguage === 'es' || !result.questions || result.questions.length === 0) {
        console.log('🔍 TRANSLATION DEBUG - Returning original result (no translation needed)');
        console.log('🔍 TRANSLATION DEBUG - Reason: currentLanguage =', currentLanguage, ', hasQuestions =', !!result.questions);
        return result;
      }

      console.log('🔄 Translating evaluation result from Spanish to English...');
      console.log('Original topic:', task.topic);
      console.log('Original questions sample:', result.questions[0]?.question?.substring(0, 100));
      
      // Generar preguntas en inglés para el mismo tema usando la nueva función asíncrona
      const englishQuestions = await generateEvaluationQuestions(task.topic || 'mathematics', result.questions.length);
      
      console.log('Generated English questions:', englishQuestions.length);
      console.log('English questions sample:', englishQuestions[0]?.question?.substring(0, 100));
      
      // Mapear las preguntas guardadas con las traducciones al inglés
      const translatedQuestions = result.questions.map((savedQuestion: any, index: number) => {
        const englishQuestion = englishQuestions[index];
        
        // Si no hay pregunta en inglés correspondiente, mantener la original
        if (!englishQuestion || typeof englishQuestion !== 'object') {
          console.log(`⚠️ No English question found for index ${index}`);
          return savedQuestion;
        }
        
        // Verificar que la pregunta en inglés tiene las propiedades necesarias
        const hasRequiredProps = 'question' in englishQuestion && 
                                'options' in englishQuestion && 
                                'explanation' in englishQuestion &&
                                'correct' in englishQuestion;
        
        if (!hasRequiredProps) {
          console.log(`⚠️ English question ${index} missing required properties`);
          return savedQuestion;
        }
        
        const translatedQuestion = {
          ...savedQuestion,
          question: (englishQuestion as any).question,
          options: (englishQuestion as any).options,
          explanation: (englishQuestion as any).explanation,
          // Actualizar texto de respuesta del estudiante y respuesta correcta
          studentAnswerText: savedQuestion.studentAnswer !== undefined ? 
            (englishQuestion as any).options[savedQuestion.studentAnswer] : undefined,
          correctAnswer: (englishQuestion as any).options[(englishQuestion as any).correct],
          // Mantener datos originales del estudiante
          studentAnswer: savedQuestion.studentAnswer,
          correct: savedQuestion.correct,
          isCorrect: savedQuestion.isCorrect
        };
        
        console.log(`✅ Translated question ${index + 1}:`, {
          original: savedQuestion.question?.substring(0, 50) + '...',
          translated: (englishQuestion as any).question?.substring(0, 50) + '...'
        });
        
        return translatedQuestion;
      });

      const translatedResult = {
        ...result,
        questions: translatedQuestions
      };
      
      console.log('🎯 Translation completed');
      return translatedResult;
    };

    const handleCompleteEvaluation = (timeExpired: boolean = false) => {
      if (!currentEvaluation.task) return;

      let correctAnswers = 0;
      const totalQuestions = currentEvaluation.questions.length;

      // Calcular respuestas correctas y procesar cada pregunta
      const processedQuestions = currentEvaluation.questions.map((question, index) => {
        const studentAnswer = currentEvaluation.answers[index];
        const correctAnswer = question.correct;
        let isCorrect = false;

        // --- ✅ LÓGICA DE CALIFICACIÓN PARA TODOS LOS TIPOS ---
        if (question.type === 'multiple_select') {
          // Para selección múltiple, la respuesta correcta y del estudiante son arrays.
          // Los ordenamos y comparamos para ver si son idénticos.
          const studentSelection = Array.isArray(studentAnswer) ? studentAnswer.sort() : [];
          const correctSelection = Array.isArray(correctAnswer) ? correctAnswer.sort() : [];
          isCorrect = JSON.stringify(studentSelection) === JSON.stringify(correctSelection);
        } else {
          // Para selección única y V/F, la comparación es directa.
          isCorrect = studentAnswer === correctAnswer;
        }
        
        if (isCorrect) {
          correctAnswers++;
        }
        
        return {
          ...question,
          studentAnswer: studentAnswer,
          studentAnswerText: Array.isArray(studentAnswer)
            ? studentAnswer.map(i => question.options[i]).join(', ')
            : question.options[studentAnswer],
          correctAnswer: Array.isArray(correctAnswer)
            ? correctAnswer.map(i => question.options[i]).join(', ')
            : question.options[correctAnswer],
          isCorrect: isCorrect,
        };
      });

      const percentage = Math.round((correctAnswers / totalQuestions) * 100);
      const timeUsed = (currentEvaluation.task.timeLimit || 10) * 60 - currentEvaluation.timeRemaining;

      // Crear resultado de evaluación con detalles completos
      const evaluationResult = {
        taskId: currentEvaluation.task.id,
        studentId: user?.id,
        studentUsername: user?.username,
        studentName: user?.displayName,
        answers: currentEvaluation.answers,
        questions: processedQuestions, // Guardar preguntas procesadas con resultados
        correctAnswers,
        totalQuestions,
        percentage,
        completedAt: new Date().toISOString(),
        timeUsed,
        timeExpired,
        task: {
          title: currentEvaluation.task.title,
          topic: currentEvaluation.task.topic,
          timeLimit: currentEvaluation.task.timeLimit,
          numQuestions: currentEvaluation.task.numQuestions
        }
      };

      // Guardar en localStorage
      const existingResults = JSON.parse(localStorage.getItem('smart-student-evaluation-results') || '[]');
      existingResults.push(evaluationResult);
      localStorage.setItem('smart-student-evaluation-results', JSON.stringify(existingResults));

      // Verificar si todos los estudiantes han completado la evaluación para actualizar el estado
      checkAndUpdateEvaluationStatus(currentEvaluation.task!.id);

      // NO actualizar el estado de la tarea aquí - esto se hace en checkAndUpdateEvaluationStatus
      // Solo guardar el resultado individual del estudiante
      /* 
      // Actualizar estado de la tarea a finalizado
      const storedTasks = localStorage.getItem('smart-student-tasks');
      if (storedTasks) {
        const tasks = JSON.parse(storedTasks);
        const taskIndex = tasks.findIndex((t: any) => t.id === currentEvaluation.task!.id);
        if (taskIndex !== -1) {
          tasks[taskIndex] = {
            ...tasks[taskIndex],
            status: 'reviewed', // INCORRECTO: No cambiar el estado aquí
            evaluationResult: {
              completed: true,
              percentage: percentage,
              completedAt: evaluationResult.completedAt,
              correctAnswers: correctAnswers,
              totalQuestions: totalQuestions
            }
          };
          localStorage.setItem('smart-student-tasks', JSON.stringify(tasks));
        }
      }
      */

      // Actualizar estado local
      setEvaluationResults(prev => ({
        ...prev,
        [currentEvaluation.task!.id]: evaluationResult
      }));

      // Crear notificación en tiempo real para el profesor
      const notification = {
        id: `eval_completed_${Date.now()}`,
        type: 'evaluation_completed',
        taskId: currentEvaluation.task.id,
        fromUsername: user?.username,
        fromName: user?.displayName,
        targetUserRole: 'teacher',
        targetUsernames: [currentEvaluation.task.assignedById || ''],
        message: `${user?.displayName} completó la evaluación "${currentEvaluation.task.title}" - Nota: ${correctAnswers}/${totalQuestions} (${percentage}%)`,
        timestamp: new Date().toISOString(),
        readBy: [],
        data: evaluationResult // Incluir datos completos de la evaluación
      };

      // Agregar a notificaciones
      const existingNotifications = JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]');
      existingNotifications.push(notification);
      localStorage.setItem('smart-student-task-notifications', JSON.stringify(existingNotifications));

      // Disparar evento para actualizar notificaciones en tiempo real
      window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
      
      // 🔥 NUEVO: Disparar evento para actualizar tareas pendientes
      window.dispatchEvent(new CustomEvent('pendingTasksUpdated'));
      
      console.log('🎯 [handleCompleteEvaluation] Events dispatched: taskNotificationsUpdated, pendingTasksUpdated');

      // Si el tiempo se agotó, mostrar modal específico ANTES de cerrar la evaluación
      if (timeExpired) {
        console.log('🔥 [handleCompleteEvaluation] Tiempo agotado - Configurando estados para modal');
        console.log('🔥 [handleCompleteEvaluation] evaluationResult:', evaluationResult);
        
        // Configurar estados para el modal
        setEvaluationTimeExpired(true);
        setTimeExpiredResult(evaluationResult);
        setShowTimeExpiredDialog(true);
        
        console.log('🔥 [handleCompleteEvaluation] Estados configurados - timeExpiredResult:', !!evaluationResult);
        console.log('🔥 [handleCompleteEvaluation] showTimeExpiredDialog será:', true);
        
        // NO cerrar la evaluación hasta que el usuario haga clic en "Revisar"
        // Solo resetear algunas propiedades para evitar continuar la evaluación
        setCurrentEvaluation(prev => ({
          ...prev,
          timeRemaining: 0,
          // Bloquear interacciones manteniendo el estado
        }));
      } else {
        // Limpiar estado y cerrar inmediatamente para evaluación normal
        setShowEvaluationDialog(false);
        setCurrentEvaluation({
          task: null,
          questions: [],
          startTime: null,
          answers: {},
          timeRemaining: 0,
          currentQuestionIndex: 0
        });
        
        // Mostrar mensaje de éxito normal
        toast({
          title: "Evaluación Completada",
          description: `¡Evaluación completada! Tu calificación es ${correctAnswers}/${totalQuestions} (${percentage}%)`,
        });
      }

      // Recargar tareas para reflejar cambios
      loadTasks();
      loadEvaluationResults(); // Recargar resultados de evaluaciones
    };





    const handleEditTask = (task: Task) => {
      setSelectedTask(task);
      setFormData({
        title: task.title,
        description: task.description,
        subject: task.subject, // Might become subjectId
        course: task.course, // Expected to be courseId
        assignedTo: task.assignedTo,
        assignedStudentIds: task.assignedStudentIds || [], // Use assignedStudentIds
        dueDate: task.dueDate,
        priority: task.priority,
        taskType: task.taskType || 'tarea',
        topic: task.topic || '',
        numQuestions: task.numQuestions || 0,
        timeLimit: task.timeLimit || 0
      });
      setShowEditDialog(true);
    };

    const handleUpdateTask = () => {
      if (!selectedTask || !formData.title || !formData.description || !formData.course || !formData.dueDate || !formData.subject) {
        toast({
          title: translate('error'),
          description: translate('completeAllFields'),
          variant: 'destructive'
        });
        return;
      }

      // Validación específica para evaluaciones
      if (formData.taskType === 'evaluacion') {
        if (!formData.topic || !formData.numQuestions || !formData.timeLimit) {
          toast({
            title: 'Error',
            description: 'Para las evaluaciones debe especificar: Tema, Cantidad de Preguntas y Tiempo límite',
            variant: 'destructive'
          });
          return;
        }
        
        if (![5, 10, 15, 20, 25, 30].includes(formData.numQuestions)) {
          toast({
            title: 'Error', 
            description: 'La cantidad de preguntas debe ser una de las opciones disponibles: 5, 10, 15, 20, 25 o 30',
            variant: 'destructive'
          });
          return;
        }
        
        if (formData.timeLimit < 1 || formData.timeLimit > 180) {
          toast({
            title: 'Error',
            description: 'El tiempo límite debe estar entre 1 y 180 minutos',
            variant: 'destructive'
          });
          return;
        }
      }
      
      // Validar que la fecha límite sea en el futuro
      const dueDate = new Date(formData.dueDate);
      const now = new Date();
      if (dueDate <= now) {
        toast({
          title: translate('error'),
          description: translate('dueDateMustBeFuture'),
          variant: 'destructive'
        });
        return;
      }

      const updatedTask: Task = {
        ...selectedTask,
        title: formData.title,
        description: formData.description,
        subject: formData.subject, // Might become subjectId
        course: formData.course, // Expected to be courseId
        assignedTo: formData.assignedTo,
        assignedStudentIds: formData.assignedTo === 'student' ? formData.assignedStudentIds : undefined, // Use assignedStudentIds
        dueDate: formData.dueDate,
        priority: formData.priority,
        taskType: formData.taskType,
        // Include evaluation fields if it's an evaluation
        topic: formData.taskType === 'evaluacion' ? formData.topic : undefined,
        numQuestions: formData.taskType === 'evaluacion' ? formData.numQuestions : undefined,
        timeLimit: formData.taskType === 'evaluacion' ? formData.timeLimit : undefined
      };

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
        assignedStudentIds: [],
        dueDate: '',
        priority: 'medium',
        taskType: 'tarea',
        topic: '',
        numQuestions: 0,
        timeLimit: 0
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

      const updatedTasks = tasks.filter(task => task.id !== taskToDelete.id);
      saveTasks(updatedTasks);

      // Also remove related comments
      const updatedComments = comments.filter(comment => comment.taskId !== taskToDelete.id);
      saveComments(updatedComments);

      toast({
        title: translate('taskDeleted'),
        description: translate('taskDeletedDesc', { title: taskToDelete.title }),
      });

      setTaskToDelete(null);
      setShowDeleteDialog(false);
    };

    const getTaskComments = (taskId: string) => {
      return comments.filter(comment => comment.taskId === taskId);
    };

    // 🔧 NUEVA FUNCIÓN: Contar solo comentarios del profesor (excluir entregas de estudiantes)
    // PROBLEMA SOLUCIONADO: El contador mostraba "3 comentarios" cuando debía mostrar "1 comentario"
    // porque estaba contando también las entregas de estudiantes como comentarios
    const getTeacherCommentsCount = (taskId: string) => {
      return comments.filter(comment => 
        comment.taskId === taskId && 
        !comment.isSubmission // Excluir entregas de estudiantes (isSubmission: true)
      ).length;
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
        case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
        case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
        case 'delivered': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
        case 'submitted': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        case 'reviewed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        case 'finished': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      }
    };

    const getTaskTypeColor = (taskType: string) => {
      switch (taskType) {
        case 'evaluacion': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
        case 'tarea': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
        default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
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
    
    // Formato de fecha en una sola línea para tablas compactas
    const formatDateOneLine = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date);
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day} ${month} ${year}, ${hours}:${minutes}`;
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

    // Check if student has already submitted this task
    const hasStudentSubmitted = (taskId: string, studentId: string) => {
      console.log(`🔍 hasStudentSubmitted: Verificando taskId=${taskId}, studentId=${studentId}`);
      
      // Check if student has submitted using studentId
      let hasSubmission = comments.some(comment => 
        comment.taskId === taskId && 
        comment.studentId === studentId && 
        comment.isSubmission
      );
      
      console.log(`📝 Búsqueda por studentId: ${hasSubmission ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
      
      // If not found, try with studentName fallback (for legacy compatibility)
      if (!hasSubmission) {
        const usersText = localStorage.getItem('smart-student-users');
        const allUsers: ExtendedUser[] = usersText ? JSON.parse(usersText) : [];
        const studentData = allUsers.find(u => u.id === studentId);
        if (studentData) {
          hasSubmission = comments.some(comment => 
            comment.taskId === taskId && 
            (comment.studentName === studentData.displayName || comment.studentName === studentData.username) &&
            comment.isSubmission
          );
          console.log(`📝 Búsqueda por studentName (${studentData.displayName}/${studentData.username}): ${hasSubmission ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
        }
      }
      
      // Debug: mostrar todas las submissions para esta tarea
      const taskSubmissions = comments.filter(c => c.taskId === taskId && c.isSubmission);
      console.log(`📋 Todas las entregas para taskId=${taskId}:`, taskSubmissions.map(c => ({
        id: c.id,
        studentId: c.studentId,
        studentName: c.studentName,
        timestamp: c.timestamp
      })));
      
      console.log(`🎯 Resultado final para studentId=${studentId}: ${hasSubmission ? 'TIENE ENTREGA' : 'NO TIENE ENTREGA'}`);
      return hasSubmission;
    };

    // Función temporal para debug de Felipe específicamente
    const checkFelipeSubmission = (taskId: string) => {
      console.log('🔍 FELIPE SPECIAL CHECK for task:', taskId);
      
      // Buscar por todos los posibles nombres que podría tener Felipe
      const felipeSubmissions = comments.filter(c => 
        c.taskId === taskId && 
        c.isSubmission && 
        (
          c.studentName === 'Felipe Estudiante' ||
          c.studentName?.toLowerCase().includes('felipe') ||
          c.studentId === 'felipe-id' // Legacy compatibility
        )
      );
      
      console.log('Felipe submissions found:', felipeSubmissions.length, felipeSubmissions.map(s => ({
        studentId: s.studentId,
        name: s.studentName,
        id: s.id
      })));
      
      return felipeSubmissions.length > 0 ? felipeSubmissions[0] : undefined;
    };
    
    // Función específica para encontrar entregas de María
    const checkMariaSubmission = (taskId: string) => {
      console.log('🔍 MARIA SPECIAL CHECK for task:', taskId);
      
      // Buscar por todos los posibles nombres que podría tener María
      const mariaSubmissions = comments.filter(c => 
        c.taskId === taskId && 
        c.isSubmission && 
        (
          c.studentName === 'Maria Estudiante' ||
          c.studentName?.toLowerCase().includes('maria') ||
          c.studentId === 'maria-id' // Legacy compatibility
        )
      );
      
      console.log('Maria submissions found:', mariaSubmissions.length, mariaSubmissions.map(s => ({
        studentId: s.studentId,
        name: s.studentName,
        id: s.id,
        comment: s.comment.substring(0, 30) + '...'
      })));
      
      return mariaSubmissions.length > 0 ? mariaSubmissions[0] : undefined;
    };

    // Get individual student status for a task - UPDATED para nuevos estados
    const getStudentTaskStatus = (taskId: string, studentId: string) => { // Changed studentUsername to studentId
      // console.log(`🔍 getStudentTaskStatus called with:`, { taskId, studentId });

      const submission = getStudentSubmission(taskId, studentId); // Use the updated getStudentSubmission

      // console.log(`🔍 Search results for student ${studentId} in task ${taskId}:`, {
      //   foundSubmission: submission ? {
      //     id: submission.id,
      //     timestamp: submission.timestamp,
      //     studentId: submission.studentId,
      //     studentName: submission.studentName,
      //     hasGrade: submission.grade !== undefined,
      //     hasTeacherComment: !!submission.teacherComment,
      //     reviewedAt: submission.reviewedAt
      //   } : null
      // });
      
      if (!submission) {
        // console.log(`❌ No submission found for ${studentId} - returning 'pending'`);
        return 'pending';
      }
      
      // Si tiene calificación o comentario del profesor Y fecha de revisión, está finalizado
      if (submission.reviewedAt && (submission.grade !== undefined || submission.teacherComment)) {
        // console.log(`✅ Submission finalized for ${studentId} - returning 'reviewed'`);
        return 'reviewed'; // Finalizado
      }
      
      // Si tiene entrega pero no revisión, está en revisión
      // console.log(`📋 Submission under review for ${studentId} - returning 'delivered'`);
      return 'delivered'; // En Revisión (o 'submitted' if that's preferred before grading)
    };

    // Function for teacher to grade a submission - UPDATED para estado Finalizado
    const handleGradeSubmission = (submissionId: string, grade: number, teacherComment: string) => {
      const updatedComments = comments.map(comment => 
        comment.id === submissionId 
          ? { 
              ...comment, 
              grade, 
              teacherComment, 
              reviewedAt: new Date().toISOString() 
            }
          : comment
      );
      saveComments(updatedComments);
      // Forzar recarga de comentarios desde localStorage para refrescar panel
      loadComments();

      // Verificar si todas las entregas de esta tarea están revisadas
      if (selectedTask) {
        const allStudents = getAssignedStudentsForTask(selectedTask); // Returns {id, username, displayName}
        
        // ✅ LÓGICA CORREGIDA: Verificar que TODOS los estudiantes hayan entregado Y sean calificados
        const allReviewed = allStudents.every(student => {
          const studentSubmission = getStudentSubmission(selectedTask.id, student.id);
          
          // Para que esté "completamente revisado" debe cumplir TODAS estas condiciones:
          // 1. El estudiante debe haber hecho una entrega (isSubmission = true)
          // 2. La entrega debe tener calificación (grade !== undefined)
          // 3. La entrega debe estar marcada como revisada (reviewedAt)
          
          if (!studentSubmission || !studentSubmission.isSubmission) {
            console.log(`❌ Student ${student.displayName} has not submitted yet`);
            return false; // No ha entregado
          }
          
          const hasGrade = studentSubmission.grade !== undefined;
          const isReviewed = studentSubmission.reviewedAt || studentSubmission.id === submissionId;
          
          if (!hasGrade) {
            console.log(`❌ Student ${student.displayName} submission not graded yet`);
            return false; // No tiene calificación
          }
          
          if (!isReviewed) {
            console.log(`❌ Student ${student.displayName} submission not reviewed yet`);
            return false; // No está revisado
          }
          
          console.log(`✅ Student ${student.displayName} submission is complete: delivered + graded + reviewed`);
          return true; // Entregado, calificado y revisado
        });

        console.log(`📊 Task completion check: ${allStudents.length} students total, all reviewed: ${allReviewed}`);

        // Si todos están revisados, cambiar el estado de la tarea del profesor a 'reviewed' (Finalizada)
        if (allReviewed) {
          const updatedTasks = tasks.map(task => 
            task.id === selectedTask.id 
              ? { ...task, status: 'reviewed' as const } // Mark task as reviewed
              : task
          );
          saveTasks(updatedTasks);
          
          // 🔔 ACTUALIZAR NOTIFICACIÓN: Cambiar de "Tarea Pendiente" a "Tarea Finalizada"
          TaskNotificationManager.updateTaskStatusNotification(
            selectedTask.id,
            'reviewed',
            user?.id || ''
          );
          
          // 🧹 NUEVO: Eliminar todas las notificaciones de esta tarea al finalizar completamente
          TaskNotificationManager.removeNotificationsForTask(selectedTask.id, [
            'pending_grading', 
            'task_submission', 
            'task_completed'
          ]);
          
          console.log('✅ Task marked as FINALIZED - all students have delivered AND been graded');
          console.log('🧹 All task notifications cleaned up for finalized task');
        } else {
          console.log('⏳ Task remains PENDING - not all students have delivered or been graded');
          
          // 🧹 NUEVO: Eliminar notificaciones específicas del estudiante recién calificado
          TaskNotificationManager.removeNotificationsForTask(selectedTask.id, ['task_submission']);
          
          // 🎯 NUEVO: Eliminar notificaciones de 'task_completed' cuando el profesor califica
          TaskNotificationManager.removeTaskCompletedNotifications(selectedTask.id);
          
          // 🔥 NUEVO: Disparar evento para actualizar panel de notificaciones
          const submission = comments.find(c => c.id === submissionId);
          window.dispatchEvent(new CustomEvent('taskGraded', {
            detail: { taskId: selectedTask.id, studentUsername: submission?.studentUsername }
          }));
        }
      }

      // Crear notificación para el estudiante
      const submission = comments.find(c => c.id === submissionId); // This submission has studentId
      if (submission && selectedTask && submission.studentId) {
        const notification = {
          id: `notif_${Date.now()}`,
          type: 'task_graded',
          taskId: selectedTask.id,
          taskTitle: selectedTask.title,
          studentId: submission.studentId,
          teacherName: user?.displayName || user?.username,
          message: `Tu tarea "${selectedTask.title}" ha sido calificada`,
          timestamp: new Date().toISOString(),
          read: false,
          grade: grade,
          course: selectedTask.course, // This is courseId
          subject: selectedTask.subject
        };

        // Guardar notificación
        const existingNotifications = JSON.parse(localStorage.getItem('smart-student-notifications') || '[]');
        const updatedNotifications = [...existingNotifications, notification];
        localStorage.setItem('smart-student-notifications', JSON.stringify(updatedNotifications));
      }

      toast({
        title: 'Entrega Calificada',
        description: `La entrega ha sido calificada con ${grade} puntos.`,
      });
    };

    // Open grade dialog
    const openGradeDialog = (taskId: string, studentId: string) => { // Changed studentUsername to studentId
      // console.log('🎯 Opening grade dialog for:', { taskId, studentId });
      
      const submission = getStudentSubmission(taskId, studentId); // Use updated getStudentSubmission
      
      if (!submission) {
        const usersText = localStorage.getItem('smart-student-users');
        const allUsers: ExtendedUser[] = usersText ? JSON.parse(usersText) : [];
        const studentData = allUsers.find(u => u.id === studentId); // Fetch student for name
        const studentDisplayName = studentData?.displayName || `ID ${studentId}`;
        const errorMessage = `No se encontró una entrega para el estudiante "${studentDisplayName}" en esta tarea.`;
        
        // console.error('❌ No submission found for openGradeDialog:', { taskId, studentId });
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }
      
      // console.log(`✅ Submission found for studentId "${studentId}":`, submission);
      
      setSubmissionToGrade(submission); // submission already contains grade and teacherComment if they exist
      setGradeForm({
        grade: submission.grade?.toString() || '',
        teacherComment: submission.teacherComment || ''
      });
      setShowGradeDialog(true);
    };

    // Función para guardar la calificación
    const saveGrade = () => {
      if (!submissionToGrade) return;
      
      const grade = parseInt(gradeForm.grade);
      if (isNaN(grade) || grade < 0 || grade > 100) {
        alert('Por favor ingresa una calificación válida entre 0 y 100');
        return;
      }
      
      if (!gradeForm.teacherComment.trim()) {
        const confirmSave = confirm('¿Estás seguro de guardar sin comentario adicional?');
        if (!confirmSave) return;
      }
      
      // Actualizar el comentario existente con la calificación
      const updatedComments = comments.map(comment => {
        if (comment.id === submissionToGrade.id) {
          return {
            ...comment,
            grade: grade,
            teacherComment: gradeForm.teacherComment.trim(),
            reviewedAt: new Date().toISOString()
          };
        }
        return comment;
      });
      
      setComments(updatedComments);
      localStorage.setItem('smart-student-task-comments', JSON.stringify(updatedComments));
      
      // Cerrar el diálogo
      setShowGradeDialog(false);
      setSubmissionToGrade(null);
      setGradeForm({ grade: '', teacherComment: '' });
      
      console.log('✅ Grade saved successfully');
    };

    // Función para intentar cerrar el diálogo
    const handleCloseGradeDialog = () => {
      if (!submissionToGrade) {
        setShowGradeDialog(false);
        return;
      }
      
      const hasGrade = gradeForm.grade.trim() !== '';
      const hasComment = gradeForm.teacherComment.trim() !== '';
      const wasAlreadyGraded = submissionToGrade.grade !== undefined;
      
      if (!hasGrade && !hasComment && !wasAlreadyGraded) {
        alert('Debes calificar y/o agregar un comentario antes de cerrar.');
        return;
      }
      
      if ((hasGrade || hasComment) && (!wasAlreadyGraded || gradeForm.grade !== submissionToGrade.grade?.toString() || gradeForm.teacherComment !== submissionToGrade.teacherComment)) {
        const confirmClose = confirm('Tienes cambios sin guardar. ¿Estás seguro de cerrar sin guardar?');
        if (!confirmClose) return;
      }
      
      setShowGradeDialog(false);
      setSubmissionToGrade(null);
      setGradeForm({ grade: '', teacherComment: '' });
    };

    // Submit grade
    // Delete student submission to allow re-submission
    const handleDeleteSubmission = (commentId: string) => {
      const commentToDelete = comments.find(c => c.id === commentId);
      if (!commentToDelete || !selectedTask) return;

      // Verificar si la tarea ya está calificada
      if (commentToDelete.grade !== undefined || commentToDelete.reviewedAt) {
        toast({
          title: 'No se puede eliminar',
          description: 'Esta tarea ya ha sido calificada por el profesor y no se puede eliminar.',
          variant: 'destructive'
        });
        return;
      }

      // Show confirmation dialog
      if (!window.confirm('¿Estás seguro de que quieres eliminar tu entrega? Esta acción no se puede deshacer.')) {
        return;
      }

      // Remove the submission comment
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      saveComments(updatedComments);

      // Obtener todos los estudiantes asignados a la tarea
      const assignedStudents = getAssignedStudentsForTask(selectedTask);
      
      // Verificar si ahora todos los estudiantes han entregado la tarea
      const allStudentsSubmitted = assignedStudents.length > 0 && 
        assignedStudents.every(student => 
          student.id !== commentToDelete.studentId && // Excluimos el que acabamos de eliminar
          hasStudentSubmitted(selectedTask.id, student.id)
        );
      
      // Actualizar el estado a "pendiente" si ya no todos han entregado
      if (!allStudentsSubmitted) {
        const updatedTasks = tasks.map(task => 
          task.id === selectedTask.id 
            ? { ...task, status: 'pending' as const }
            : task
        );
        saveTasks(updatedTasks);
      }

      toast({
        title: 'Entrega eliminada',
        description: 'Tu entrega ha sido eliminada exitosamente.',
      });
    };

    const filteredTasks = getFilteredTasks();

    // Función para abrir el diálogo de revisión mejorado
    const handleReviewSubmission = (studentId: string, taskId: string, tryDisplayName?: boolean) => {
      console.log(`🔍 handleReviewSubmission called with studentId: "${studentId}", taskId: "${taskId}"`);
      
      let submission = getStudentSubmission(taskId, studentId);
      
      // Si no se encuentra, intentar con el displayName
      if (!submission && tryDisplayName) {
        const student = getAssignedStudentsForTask(selectedTask).find(s => s.id === studentId || s.username === studentId);
        if (student && student.displayName) {
          console.log(`🔄 Trying with displayName: "${student.displayName}"`);
          submission = getStudentSubmission(taskId, student.displayName);
        }
        
        // Si aún no se encuentra, intentar buscar por studentName en los comentarios
        if (!submission) {
          console.log(`🔄 Trying with studentName search`);
          submission = comments.find(c =>
            c.taskId === taskId &&
            c.isSubmission &&
            (c.studentName === studentId || 
            c.studentName === student?.displayName ||
            c.studentId === studentId ||
            c.studentUsername === studentId)
          );
        }
      }
      
      if (!submission) {
        console.log(`❌ No submission found for student: "${studentId}"`);
        console.log(`Available submissions for task "${taskId}":`, comments.filter(c => c.taskId === taskId && c.isSubmission));
        toast({
          title: 'Error',
          description: 'No se encontró una entrega para este estudiante.',
          variant: 'destructive'
        });
        return;
      }
      
      const student = getAssignedStudentsForTask(selectedTask).find(s => s.id === studentId || s.username === studentId);
      console.log(`✅ Found submission for student: "${studentId}"`, submission);
      
      setCurrentReview({
        studentId,
        studentDisplayName: student?.displayName || studentId,
        taskId,
        submission,
        grade: submission.grade || 0,
        feedback: submission.teacherComment || '',
        isGraded: submission.grade !== undefined
      });
      setShowReviewDialog(true);
    };

    // Función para abrir el diálogo de revisión de evaluación
    const handleViewEvaluationDetail = (studentId: string, taskId: string) => {
      console.log('🔍 handleViewEvaluationDetail called with:', { studentId, taskId });
      
      const evaluationResult = getStudentEvaluationResult(taskId, studentId);
      console.log('🔍 Evaluation result found:', !!evaluationResult);
      
      if (!evaluationResult) {
        toast({
          title: translate('error'),
          description: 'No se encontró el resultado de la evaluación',
          variant: 'destructive'
        });
        return;
      }

      // Encontrar la tarea correspondiente para obtener el tema
      const task = tasks.find(t => t.id === taskId);
      console.log('🔍 Task found for translation:', !!task, task?.topic);
      
      if (task) {
        // Traducir las preguntas dinámicamente según el idioma actual
        console.log('🔄 About to translate evaluation result...');
        const translatedResult = translateEvaluationResult(evaluationResult, task);
        console.log('🔄 Translation completed, setting result');
        setSelectedEvaluationResult(translatedResult);
      } else {
        console.log('⚠️ No task found, using original result');
        setSelectedEvaluationResult(evaluationResult);
      }
      setShowEvaluationReviewDialog(true);
    };

    // Función para guardar la revisión y calificación
    const saveReviewAndGrade = () => {
      if (!currentReview.submission || !selectedTask) return;
      
      if (currentReview.grade < 0 || currentReview.grade > 100) {
        toast({
          title: 'Error',
          description: 'La calificación debe estar entre 0 y 100.',
          variant: 'destructive'
        });
        return;
      }
      
      // Actualizar el comentario con la calificación y feedback
      const updatedComments = comments.map(comment => {
        if (comment.id === currentReview.submission!.id) {
          return {
            ...comment,
            grade: currentReview.grade,
            teacherComment: currentReview.feedback,
            reviewedAt: new Date().toISOString(),
            reviewed: true
          };
        }
        return comment;
      });
      
      saveComments(updatedComments);
      
      // Verificar si todas las entregas están revisadas
      const allSubmissionsReviewed = getAssignedStudentsForTask(selectedTask).every(student => {
        const studentSubmission = getStudentSubmission(selectedTask.id, student.id);
        return !!studentSubmission?.reviewedAt || student.id === currentReview.studentId;
      });
      
      if (allSubmissionsReviewed) {
        const updatedTasks = tasks.map(task => 
          task.id === selectedTask.id 
            ? { ...task, status: 'reviewed' as const }
            : task
        );
        saveTasks(updatedTasks);
      }

      // Crear notificación para el estudiante
      const notification = {
        id: `notif_${Date.now()}`,
        type: 'task_graded',
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        studentId: currentReview.studentId, // Use studentId
        teacherName: user?.displayName || user?.username, // Keep for display
        // teacherId: user?.id, // Optionally add teacherId
        message: `Tu tarea "${selectedTask.title}" ha sido calificada con ${currentReview.grade}/100`,
        timestamp: new Date().toISOString(),
        read: false,
        grade: currentReview.grade,
        course: selectedTask.course, // This is courseId
        subject: selectedTask.subject
      };

      const existingNotifications = JSON.parse(localStorage.getItem('smart-student-notifications') || '[]');
      const updatedNotifications = [...existingNotifications, notification];
      localStorage.setItem('smart-student-notifications', JSON.stringify(updatedNotifications));
      
      toast({
        title: 'Tarea Calificada',
        description: `La tarea ha sido calificada con ${currentReview.grade}/100.`,
      });
      
      setShowReviewDialog(false);
    };

    // Función auxiliar para obtener el nombre del estudiante por username
    const getStudentNameByUsername = (username: string) => {
      const student = getStudentsForCourse(selectedTask?.course || '').find(
        s => s.username === username
      );
      return student?.displayName || username;
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <ClipboardList className="w-8 h-8 mr-3 text-orange-500" />
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
                    className={`px-3 py-1 ${viewMode === 'list' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'hover:bg-orange-100 hover:text-orange-700'}`}
                  >
                    {translate('listView')}
                  </Button>
                  <Button
                    variant={viewMode === 'course' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('course')}
                    className={`px-3 py-1 ${viewMode === 'course' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'hover:bg-orange-100 hover:text-orange-700'}`}
                  >
                    {translate('courseView')}
                  </Button>
                </div>

                {/* Course Filter */}
                <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                  <SelectTrigger className="w-48 select-orange-hover-trigger">
                    <SelectValue placeholder={translate('filterByCourse')} />
                  </SelectTrigger>
                  <SelectContent className="select-orange-hover">
                    <SelectItem value="all" className="hover:bg-orange-100 hover:text-orange-700 individual-option select-item-spaced">{translate('allCourses')}</SelectItem>
                    {getAvailableCoursesWithNames().map((course: {id: string, name: string}) => (
                      <SelectItem key={`main-header-course-filter-${course.id}`} value={course.id} className="hover:bg-orange-100 hover:text-orange-700 individual-option select-item-spaced">{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  onClick={() => {
                    // Establecer fecha de vencimiento por defecto a 7 días en el futuro
                    const defaultDueDate = new Date();
                    defaultDueDate.setDate(defaultDueDate.getDate() + 7);
                    const defaultDueDateString = defaultDueDate.toISOString().slice(0, 16);
                    
                    // Inicializar el formulario con la fecha por defecto
                    setFormData(prevData => ({
                      ...prevData,
                      dueDate: defaultDueDateString
                    }));
                    
                    setShowCreateDialog(true);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
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
                  <Card key={course} className="card-orange-shadow border-l-4 border-l-indigo-500">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-xl flex items-center">
                            <Users className="w-5 h-5 mr-2" />
                            {getCourseNameById(course)}
                          </CardTitle>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                              {translate('totalTasks')}: {stats.total}
                            </Badge>
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                              {translate('statusSubmitted')}: {stats.submitted}
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
                          <div key={`pending-task-${task.id}`} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge variant="outline" className={getTaskTypeColor(task.taskType || 'tarea')}>
                                  {task.taskType === 'evaluacion' ? translate('evaluation') : translate('task')}
                                </Badge>
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority === 'high' ? translate('priorityHigh') : 
                                  task.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                                </Badge>
                                <Badge className={getTaskStatusForCurrentUser(task).statusClass}>
                                  {getTaskStatusForCurrentUser(task).statusText}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                                <span className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {translate('duePrefix')} {formatDateOneLine(task.dueDate)}
                                </span>
                                <span className="flex items-center">
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  {getTeacherCommentsCount(task.id)} {translate('commentsCount')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  console.log('🔄 Opening task dialog from course view - reloading comments');
                                  loadComments(); // Recargar comentarios antes de abrir
                                  
                                  // Si es una evaluación, verificar su estado antes de abrir
                                  if (task.taskType === 'evaluacion') {
                                    checkAndUpdateEvaluationStatus(task.id);
                                  }
                                  
                                  setSelectedTask(task);
                                  setShowTaskDialog(true);
                                }}
                                title={translate('viewTask')}
                                className="action-button"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTask(task)}
                                className="action-button"
                                title={translate('editTask')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTask(task)}
                                className="action-button action-button-delete"
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
                filteredTasks.map(task => {
                  // Para estudiantes, calcular su estado individual
                  const studentStatus = user?.role === 'student' 
                    ? getStudentTaskStatus(task.id, user.username || '')
                    : task.status;
                  
                  return (
                  <Card key={`active-task-${task.id}`} className="card-orange-shadow hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline">{task.subject}</Badge>
                            <Badge variant="outline" className={getTaskTypeColor(task.taskType || 'tarea')}>
                              {task.taskType === 'evaluacion' ? translate('evaluation') : translate('task')}
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority === 'high' ? translate('priorityHigh') : task.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                            </Badge>
                            {/* Badge de estado y badge de porcentaje en burbujas separadas para estudiante */}
                            {user?.role === 'student' ? (() => {
                              // Verificar si es evaluación y está completada
                              if (task.taskType === 'evaluacion') {
                                const evaluationResult = evaluationResults[task.id];
                                if (evaluationResult) {
                                  return (
                                    <>
                                      <Badge className={getStatusColor('submitted') + ' font-bold mr-1'}>
                                        {translate('statusFinished')}
                                      </Badge>
                                      <Badge className={evaluationResult.percentage >= 70 ? 'bg-green-100 text-green-700 font-bold ml-2' : 'bg-red-100 text-red-700 font-bold ml-2'}>
                                        {evaluationResult.percentage}%
                                      </Badge>
                                    </>
                                  );
                                } else {
                                  return (
                                    <Badge className={getStatusColor('pending')}>
                                      {translate('statusPending')}
                                    </Badge>
                                  );
                                }
                              }
                              
                              // Para tareas normales, lógica original
                              const mySubmission = comments.find(c => c.taskId === task.id && c.studentId === user.id && c.isSubmission);
                              if (!mySubmission) {
                                // Pendiente: igual que en la vista detalle
                                return (
                                  <Badge className={getStatusColor('pending')}>
                                    {translate('statusPending')}
                                  </Badge>
                                );
                              } else if (mySubmission && (mySubmission.grade === undefined || mySubmission.grade === null)) {
                                // En Revisión: amarillo (forzado)
                                return (
                                  <Badge className="bg-yellow-100 text-yellow-800 font-bold">
                                    {translate('underReview')}
                                  </Badge>
                                );
                              } else if (mySubmission && typeof mySubmission.grade === 'number') {
                                // Finalizado: igual que en la vista detalle (usamos submitted/verde)
                                return (
                                  <>
                                    <Badge className={getStatusColor('submitted') + ' font-bold mr-1'}>
                                      {translate('statusFinished')}
                                    </Badge>
                                    <Badge className={mySubmission.grade >= 70 ? 'bg-green-100 text-green-700 font-bold ml-2' : 'bg-red-100 text-red-700 font-bold ml-2'}>
                                      {mySubmission.grade}%
                                    </Badge>
                                  </>
                                );
                              }
                            })() : (
                              <Badge className={getStatusColor(task.status)}>
                                {task.status === 'pending' ? translate('statusPending') : 
                                  task.status === 'delivered' ? translate('underReview') :
                                  task.status === 'submitted' ? translate('underReview') : translate('statusFinished')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('🔄 Opening task dialog - reloading comments');
                              loadComments(); // Recargar comentarios antes de abrir
                              
                              // Si es una evaluación, verificar su estado antes de abrir
                              if (task.taskType === 'evaluacion') {
                                checkAndUpdateEvaluationStatus(task.id);
                              }
                              
                              setSelectedTask(task);
                              setShowTaskDialog(true);
                            }}
                            className="action-button"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {user?.role === 'teacher' && task.assignedById === user.id && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTask(task)}
                                className="action-button"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTask(task)}
                                className="action-button action-button-delete"
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
                            {translate('duePrefix')} {formatDateOneLine(task.dueDate)}
                          </span>
                          <span className="flex items-center">
                            {task.assignedTo === 'course' ? (
                              <>
                                <Users className="w-3 h-3 mr-1" />
                                {getCourseNameById(task.course)}
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3 mr-1" />
                                {task.assignedStudentIds?.length} {translate('studentsCount')}
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {getTeacherCommentsCount(task.id)} {translate('commentsCount')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Create Task Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{formData.taskType === 'evaluacion' ? 'Crear Nueva Evaluación' : translate('createNewTask')}</DialogTitle>
              <DialogDescription>
                {translate('createTaskDescription')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">{translate('taskTitle')} <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="col-span-3"
                  placeholder={translate('taskTitlePlaceholder')}
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">{translate('taskDescription')} <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="course" className="text-right">{translate('taskCourse')} <span className="text-red-500">*</span></Label>
                <Select value={formData.course} onValueChange={(value) => {
                  // Obtener asignaturas disponibles para el nuevo curso
                  const availableSubjects = getAvailableSubjectsForCourse(value);
                  
                  // Si la asignatura actual no está disponible en el nuevo curso, limpiarla
                  const newSubject = availableSubjects.includes(formData.subject) ? formData.subject : '';
                  
                  setFormData(prev => ({ 
                    ...prev, 
                    course: value,
                    subject: newSubject 
                  }));
                }}>
                  <SelectTrigger className={`${formData.taskType === 'evaluacion' ? 'select-purple-hover-trigger' : 'select-orange-hover-trigger'} col-span-3`}>
                    <SelectValue placeholder={translate('selectCourse')} />
                  </SelectTrigger>
                  <SelectContent className={formData.taskType === 'evaluacion' ? 'select-purple-hover' : 'select-orange-hover'}>
                    {getAvailableCoursesWithNames().map((course: {id: string, name: string}) => (
                      <SelectItem key={`edit-task-course-${course.id}`} value={course.id}>{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="text-right">{translate('taskSubject')} <span className="text-red-500">*</span></Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))} required>
                  <SelectTrigger className={`${formData.taskType === 'evaluacion' ? 'select-purple-hover-trigger' : 'select-orange-hover-trigger'} col-span-3`}>
                    <SelectValue placeholder={translate('selectSubject')} />
                  </SelectTrigger>
                  <SelectContent className={formData.taskType === 'evaluacion' ? 'select-purple-hover' : 'select-orange-hover'}>
                    {(formData.course ? getAvailableSubjectsForCourse(formData.course) : getAvailableSubjects()).map((subject: string) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{translate('assignTo')}</Label>
                <Select value={formData.assignedTo} onValueChange={(value: 'course' | 'student') => setFormData(prev => ({ ...prev, assignedTo: value, assignedStudentIds: [] }))}>
                  <SelectTrigger className={`${formData.taskType === 'evaluacion' ? 'select-purple-hover-trigger' : 'select-orange-hover-trigger'} col-span-3`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={formData.taskType === 'evaluacion' ? 'select-purple-hover' : 'select-orange-hover'}>
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
                      {getStudentsForCourse(formData.course).length > 0 ? (
                        getStudentsForCourse(formData.course).map((student: { id: string, username: string, displayName: string }) => (
                          <div key={student.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`create-student-${student.username}`}
                              checked={formData.assignedStudentIds?.includes(student.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    assignedStudentIds: [...(prev.assignedStudentIds || []), student.id]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    assignedStudentIds: prev.assignedStudentIds?.filter((s: string) => s !== student.id) || []
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
                <Label htmlFor="dueDate" className="text-right">{translate('dueDate')} <span className="text-red-500">*</span></Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{translate('priority')}</Label>
                <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="select-orange-hover-trigger col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="select-orange-hover">
                    <SelectItem value="low">{translate('priorityLow')}</SelectItem>
                    <SelectItem value="medium">{translate('priorityMedium')}</SelectItem>
                    <SelectItem value="high">{translate('priorityHigh')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{translate('taskType')}</Label>
                <Select 
                  value={formData.taskType} 
                  onValueChange={(value: 'tarea' | 'evaluacion') => {
                    setFormData(prev => ({
                      ...prev,
                      taskType: value,
                      // Establecer valores por defecto cuando se selecciona evaluación
                      numQuestions: value === 'evaluacion' ? 10 : prev.numQuestions,
                      timeLimit: value === 'evaluacion' ? 2 : prev.timeLimit
                    }))
                  }}
                >
                  <SelectTrigger className="select-orange-hover-trigger col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="select-orange-hover">
                    <SelectItem value="tarea">{translate('taskTypeAssignment')}</SelectItem>
                    <SelectItem value="evaluacion">{translate('taskTypeEvaluation')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Evaluation specific fields */}
              {formData.taskType === 'evaluacion' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="topic" className="text-right">Tema <span className="text-red-500">*</span></Label>
                    <Input
                      id="topic"
                      value={formData.topic}
                      onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                      className="col-span-3"
                      placeholder="Introduce el tema de la evaluación"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="numQuestions" className="text-right">{translate('questionCountLabel')} <span className="text-red-500">*</span></Label>
                    <Select 
                      value={formData.numQuestions?.toString() || ''} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, numQuestions: parseInt(value) }))}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona la cantidad de preguntas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 preguntas</SelectItem>
                        <SelectItem value="10">10 preguntas</SelectItem>
                        <SelectItem value="15">15 preguntas</SelectItem>
                        <SelectItem value="20">20 preguntas</SelectItem>
                        <SelectItem value="25">25 preguntas</SelectItem>
                        <SelectItem value="30">30 preguntas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="timeLimit" className="text-right">Tiempo (minutos) <span className="text-red-500">*</span></Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      value={formData.timeLimit || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 0 }))}
                      className="col-span-3"
                      placeholder="Ej: 45"
                      min="1"
                      max="180"
                      required
                    />
                  </div>
                </>
              )}

              {/* File Upload Section for Create Task - Only for regular tasks, not evaluations */}
              {formData.taskType !== 'evaluacion' && (
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
                        onClick={() => document.getElementById('task-file-upload')?.click()}
                        className={`w-full ${(formData.taskType as string) === 'evaluacion' 
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700'
                          : 'bg-orange-100 hover:bg-orange-500 hover:text-white text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-600 dark:hover:text-white dark:text-orange-400 dark:border-orange-700'
                        }`}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        {translate('attachFile')}
                      </Button>
                    </div>
                    
                    {/* Display uploaded files */}
                    {taskAttachments.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {taskAttachments.map((file) => (
                          <div key={`new-task-file-${file.id}`} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
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
                              className="flex-shrink-0 h-6 w-6 p-0 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} 
                className={formData.taskType === 'evaluacion' ? 'cancel-button-evaluation' : 'cancel-button'}>
                {translate('cancel')}
              </Button>
              <Button 
                onClick={handleCreateTask}
                className={`${formData.taskType === 'evaluacion' 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-orange-500 hover:bg-orange-600'} text-white`}
              >
                {formData.taskType === 'evaluacion' ? translate('createEvaluation') : translate('createTask')}
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
          } else {
            // Reload comments when opening dialog to ensure fresh data
            loadComments();
            
            // Log debug information when opening task dialog
            console.log('🔍 TASK DIALOG OPENED FOR:', selectedTask);
            
            // NOTA: Código de demo/debug deshabilitado para comportamiento correcto
            // Solo deben aparecer entregas reales de estudiantes
            /*
            // Forzar la creación de una entrega falsa para María si no existe
            if (selectedTask) {
              const mariaExists = comments.some(c => 
                c.taskId === selectedTask.id && 
                c.isSubmission && 
                (c.studentName?.toLowerCase().includes('maria') || c.studentId?.toLowerCase().includes('maria'))
              );
              
              if (!mariaExists) {
                console.log('🚨 Creating fake submission for Maria...');
                const mariaSubmission: TaskComment = {
                  id: `fake_maria_submission_${Date.now()}`,
                  taskId: selectedTask.id,
                  studentId: 'maria',
                  studentName: 'Maria Estudiante',
                  comment: 'Entrega de María (generada automáticamente)',
                  timestamp: new Date().toISOString(),
                  isSubmission: true,
                  attachments: []
                };
                
                const updatedComments = [...comments, mariaSubmission];
                saveComments(updatedComments);
                loadComments();
              }
            }
            */
            if (selectedTask) {
              console.log(`🔍 Opening task dialog for "${selectedTask.title}":`, {
                taskId: selectedTask.id,
                totalComments: comments.length,
                submissionComments: comments.filter(c => c.isSubmission),
                allComments: comments
              });
            }
          }
        }}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span>{selectedTask?.title}</span>
                <Badge variant="outline" className={getTaskTypeColor(selectedTask?.taskType || 'tarea')}>
                  {selectedTask?.taskType === 'evaluacion' ? translate('evaluation') : translate('task')}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {selectedTask?.assignedByName} • {getCourseNameById(selectedTask?.course || '')} • {selectedTask?.subject}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTask && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{translate('taskDescriptionDetail')}</h4>
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                </div>

                {/* Task Attachments */}
                {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{translate('attachments')}</h4>
                    <div className="space-y-2">
                      {selectedTask.attachments.map((file) => (
                        <div key={`selected-task-file-${file.id}`} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate" title={file.name}>{file.name}</span>
                            <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(file)}
                            className="flex-shrink-0 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Estado y badge de porcentaje para el estudiante, lógica unificada con la lista */}
                <div className="flex space-x-4 text-sm">
                  <span className="whitespace-nowrap font-medium">
                    <strong>{translate('taskDueDateLabel')}</strong> <span className="single-line-date text-base">{formatDateOneLine(selectedTask.dueDate)}</span>
                  </span>
                  <span>
                    <strong>{translate('taskStatusLabel')}</strong>
                    {user?.role === 'student' ? (() => {
                      // Verificar si es evaluación y está completada
                      if (selectedTask.taskType === 'evaluacion') {
                        const evaluationResult = evaluationResults[selectedTask.id];
                        if (evaluationResult) {
                          return (
                            <>
                              <Badge className={getStatusColor('submitted') + ' font-bold ml-1'}>
                                {translate('statusFinished')}
                              </Badge>
                              <Badge className={`ml-2 ${evaluationResult.percentage >= 70 ? 'bg-green-100 text-green-700 font-bold' : 'bg-red-100 text-red-700 font-bold'}`}>
                                {evaluationResult.percentage}%
                              </Badge>
                            </>
                          );
                        } else {
                          return (
                            <Badge className={getStatusColor('pending') + ' ml-1'}>
                              {translate('statusPending')}
                            </Badge>
                          );
                        }
                      }
                      
                      // Para tareas normales, lógica original
                      const mySubmission = comments.find(c => c.taskId === selectedTask.id && c.studentId === user.id && c.isSubmission);
                      if (!mySubmission) {
                        // Pendiente
                        return (
                          <Badge className={getStatusColor('pending') + ' ml-1'}>
                            {translate('statusPending')}
                          </Badge>
                        );
                      } else if (mySubmission && (mySubmission.grade === undefined || mySubmission.grade === null)) {
                        // En Revisión: amarillo (forzado)
                        return (
                          <Badge className="bg-yellow-100 text-yellow-800 font-bold ml-1">
                            {translate('underReview')}
                          </Badge>
                        );
                      } else if (mySubmission && typeof mySubmission.grade === 'number') {
                        // Finalizado
                        return (
                          <Badge className={getStatusColor('submitted') + ' font-bold ml-1'}>
                            {translate('statusFinished')}
                          </Badge>
                        );
                      }
                    })() : (
                      <Badge className={`ml-1 ${getStatusColor(selectedTask.status)}`}>
                        {selectedTask.status === 'pending' ? translate('statusPending') : 
                          selectedTask.status === 'submitted' ? translate('underReview') : translate('statusFinished')}
                      </Badge>
                    )}
                  </span>
                </div>

                {/* Evaluation specific information */}
                {selectedTask.taskType === 'evaluacion' && user?.role === 'student' && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-medium mb-3 text-purple-800 dark:text-purple-200">{translate('evaluationInformation')}</h4>
                    
                    {/* Tabla horizontal de información de evaluación - Sin scroll horizontal */}
                    <div className="border border-purple-200 dark:border-purple-700 rounded-lg">
                      <table className="w-full table-fixed">
                        <thead className="bg-purple-100 dark:bg-purple-900/40">
                          <tr>
                            <th className="w-1/6 px-2 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300 align-middle">{translate('evaluationTopic')}</th>
                            <th className="w-1/8 px-2 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300 align-middle">{translate('evaluationQuestions')}</th>
                            <th className="w-1/8 px-2 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300 align-middle">{translate('evaluationTime')}</th>
                            <th className="w-1/6 px-2 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300 align-middle">{translate('evaluationGradeColumn')}</th>
                            <th className="w-1/8 px-2 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300 align-middle">{translate('evaluationDateColumn')}</th>
                            <th className="w-1/4 px-2 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300 align-middle">{translate('evaluationActionsColumn')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white dark:bg-slate-800/50">
                            <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400 text-sm font-medium align-middle">
                              {selectedTask.topic || (
                                <span className="text-gray-400 italic">--</span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400 text-sm font-medium align-middle">
                              {selectedTask.numQuestions && selectedTask.numQuestions > 0 ? selectedTask.numQuestions : (
                                <span className="text-gray-400 italic">--</span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400 text-sm font-medium align-middle">
                              {selectedTask.timeLimit && selectedTask.timeLimit > 0 ? `${selectedTask.timeLimit} ${translate('minutes')}` : (
                                <span className="text-gray-400 italic">--</span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400 text-sm font-medium align-middle">
                              {evaluationResults[selectedTask.id] ? (
                                <span className="text-gray-600 dark:text-gray-400 font-medium">
                                  {evaluationResults[selectedTask.id].correctAnswers}/{evaluationResults[selectedTask.id].totalQuestions} ({evaluationResults[selectedTask.id].percentage}%)
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">{translate('statusPending')}</span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center text-gray-600 dark:text-gray-400 text-sm font-medium align-middle">
                              {evaluationResults[selectedTask.id] ? (
                                <span className="text-gray-600 dark:text-gray-400">
                                  {new Date(evaluationResults[selectedTask.id].completedAt).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">--</span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center align-middle">
                              {evaluationResults[selectedTask.id] ? (
                                <Button
                                  onClick={() => handleReviewEvaluation(selectedTask)}
                                  className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-2 py-1"
                                  size="sm"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  {translate('resultsButton')}
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleStartEvaluation(selectedTask)}
                                  className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-3 py-1"
                                  size="sm"
                                >
                                  <ClipboardCheck className="w-3 h-3 mr-1" />
                                  {translate('takeEvaluation')}
                                </Button>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Evaluation specific information for teachers (keep original format) */}
                {selectedTask.taskType === 'evaluacion' && user?.role === 'teacher' && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-bold mb-4 text-purple-800 dark:text-purple-200 text-left">{translate('evaluationInformation')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {selectedTask.topic && (
                        <div className="text-center">
                          <strong className="text-purple-700 dark:text-purple-300 block mb-1">{translate('evaluationTopic')}:</strong>
                          <p className="text-purple-600 dark:text-purple-400">{selectedTask.topic}</p>
                        </div>
                      )}
                      {selectedTask.numQuestions && selectedTask.numQuestions > 0 && (
                        <div className="text-center">
                          <strong className="text-purple-700 dark:text-purple-300 block mb-1">{translate('evaluationQuestions')}:</strong>
                          <p className="text-purple-600 dark:text-purple-400">{selectedTask.numQuestions}</p>
                        </div>
                      )}
                      {selectedTask.timeLimit && selectedTask.timeLimit > 0 && (
                        <div className="text-center">
                          <strong className="text-purple-700 dark:text-purple-300 block mb-1">{translate('evaluationTime')}:</strong>
                          <p className="text-purple-600 dark:text-purple-400">{selectedTask.timeLimit} minutos</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <Separator />
                
                {/* Detalle por estudiante - Solo visible para profesor - REPOSICIONADO AL PRINCIPIO */}
                {user?.role === 'teacher' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold">{translate('studentDetailPanel')}</h4>
                    </div>

                    {/* Tabla para tareas normales */}
                    {selectedTask?.taskType !== 'evaluacion' && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="centered-header py-2 px-3 font-medium">{translate('studentNameColumn')}</th>
                                <th className="centered-header py-2 px-3 font-medium">{translate('studentStatusColumn')}</th>
                                <th className="centered-header py-2 px-3 font-medium">{translate('studentGradeColumn')}</th>
                                <th className="centered-header py-2 px-3 font-medium min-w-[150px]">{translate('submissionDateColumn')}</th>
                                <th className="centered-header py-2 px-3 font-medium">{translate('studentActionsColumn')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getAssignedStudentsForTask(selectedTask).length > 0 ? (
                                getAssignedStudentsForTask(selectedTask).map((student, index) => {
                                  let submission = getStudentSubmission(selectedTask.id, student.id);
                                  let studentStatus = getStudentTaskStatus(selectedTask.id, student.id);
                                  
                                  // NOTA: Parches temporales deshabilitados para comportamiento correcto
                                  // El botón "Revisar" solo debe aparecer cuando hay entrega real
                                  /*
                                  // PARCHE TEMPORAL: Si es Felipe y no encontramos submission, usar método especial
                                  if (!submission && student.displayName === 'Felipe Estudiante') {
                                    console.log('🚨 Using Felipe special check');
                                    const felipeSubmission = checkFelipeSubmission(selectedTask.id);
                                    if (felipeSubmission) {
                                      submission = {
                                        ...felipeSubmission,
                                        grade: felipeSubmission.grade || undefined,
                                        teacherComment: felipeSubmission.teacherComment || '',
                                        reviewedAt: felipeSubmission.reviewedAt || (felipeSubmission.grade !== undefined ? new Date().toISOString() : undefined)
                                      };
                                      studentStatus = submission.grade !== undefined || submission.teacherComment ? 'reviewed' : 'delivered';
                                    }
                                  }

                                  // PARCHE TEMPORAL: Si es María y no encontramos submission, usar método especial
                                  if (!submission && (student.displayName === 'Maria Estudiante' || student.username.toLowerCase().includes('maria'))) {
                                    console.log('🚨 Using Maria special check');
                                    const mariaSubmission = checkMariaSubmission(selectedTask.id);
                                    if (mariaSubmission) {
                                      console.log('✅ Found Maria submission using special function:', mariaSubmission);
                                      submission = {
                                        ...mariaSubmission,
                                        grade: mariaSubmission.grade || undefined,
                                        teacherComment: mariaSubmission.teacherComment || '',
                                        reviewedAt: mariaSubmission.reviewedAt || (mariaSubmission.grade !== undefined ? new Date().toISOString() : undefined)
                                      };
                                      studentStatus = 'delivered'; // Forzamos el estado como "delivered" para asegurar que se muestre correctamente
                                      console.log('✅ Maria status set to DELIVERED:', studentStatus);
                                    } else {
                                      console.log('❌ No Maria submission found using special function');
                                    }
                                  }
                                  */
                                  
                                  const hasSubmission = submission !== undefined;
                                  
                                  console.log(`👨‍🎓 TABLE ROW - Student ${student.displayName} (${student.username}):`, {
                                    studentObject: student,
                                    searchingWithUsername: student.username,
                                    hasSubmission,
                                    studentStatus,
                                    submissionId: submission?.id,
                                    submissionTimestamp: submission?.timestamp,
                                    submissionDetails: submission ? {
                                      studentId: submission.studentId,
                                      studentName: submission.studentName,
                                      isSubmission: submission.isSubmission,
                                      comment: submission.comment.substring(0, 50)
                                    } : null,
                                    allCommentsForThisTask: comments.filter(c => c.taskId === selectedTask.id).map(c => ({
                                      id: c.id,
                                      studentId: c.studentId,
                                      studentName: c.studentName,
                                      isSubmission: c.isSubmission
                                    }))
                                  });
                                  
                                  return (
                                    <tr key={student.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                                      <td className="py-2 px-3 text-center">{student.displayName}</td>
                                      <td className="py-2 px-3 text-center">
                                        <Badge className={
                                          studentStatus === 'pending' ? 'bg-gray-100 text-gray-800' :
                                          studentStatus === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-green-100 text-green-800'
                                        }>
                                          {studentStatus === 'pending' ? translate('statusPending') : 
                                          studentStatus === 'delivered' ? translate('underReview') : 
                                          translate('statusFinished')}
                                        </Badge>
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        {hasSubmission && submission && submission.grade !== undefined ? 
                                          <span className="font-medium">{submission.grade}/100</span> :
                                          <span className="text-muted-foreground italic">{hasSubmission ? translate('pendingGrade') : translate('noSubmissionYet')}</span>
                                        }
                                      </td>
                                      <td className="py-2 px-3 text-center date-cell">
                                        <span className="single-line-date font-medium">
                                          {hasSubmission && submission ? formatDateOneLine(submission.timestamp) : '-'}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <div className="flex justify-center space-x-2">
                                          {/* Solo mostrar botón Revisar/Editar cuando el estudiante ha hecho una entrega */}
                                          {hasSubmission && (studentStatus === 'delivered' || studentStatus === 'reviewed') ? (
                                            <Button 
                                              size="sm" 
                                              className="h-7 bg-orange-500 hover:bg-orange-600 text-white"
                                              onClick={() => handleReviewSubmission(student.id || student.username, selectedTask.id, true)}
                                            >
                                              {studentStatus === 'reviewed' ? translate('editSubmission') : translate('reviewSubmission')}
                                            </Button>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">{translate('noSubmission') || "Sin entrega"}</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                                    {translate('noStudentsInTask')}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Tabla para evaluaciones */}
                    {selectedTask?.taskType === 'evaluacion' && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="centered-header py-2 px-3 font-medium">{translate('studentNameColumn')}</th>
                                <th className="centered-header py-2 px-3 font-medium">{translate('evaluationStatusColumn')}</th>
                                <th className="centered-header py-2 px-3 font-medium">{translate('evaluationGradeColumn')}</th>
                                <th className="centered-header py-2 px-3 font-medium min-w-[150px]">{translate('evaluationDateColumn')}</th>
                                <th className="centered-header py-2 px-3 font-medium">{translate('evaluationActionsColumn')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getAssignedStudentsForTask(selectedTask).length > 0 ? (
                                getAssignedStudentsForTask(selectedTask).map((student, index) => {
                                  const evaluationResult = getStudentEvaluationResult(selectedTask.id, student.id);
                                  const hasCompleted = evaluationResult !== undefined;
                                  
                                  return (
                                    <tr key={student.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                                      <td className="py-2 px-3 text-center">{student.displayName}</td>
                                      <td className="py-2 px-3 text-center">
                                        <Badge className={hasCompleted ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}>
                                          {hasCompleted ? translate('statusCompleted') : translate('statusPending')}
                                        </Badge>
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        {hasCompleted ? 
                                          <span className="font-medium">{evaluationResult.correctAnswers}/{evaluationResult.totalQuestions} ({evaluationResult.percentage}%)</span> :
                                          <span className="text-muted-foreground italic">{translate('noSubmissionYet')}</span>
                                        }
                                      </td>
                                      <td className="py-2 px-3 text-center date-cell">
                                        <span className="single-line-date font-medium">
                                          {hasCompleted ? formatDateOneLine(evaluationResult.completedAt) : '-'}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        {hasCompleted && (
                                          <Button 
                                            size="sm" 
                                            className="h-7 bg-purple-500 hover:bg-purple-600 text-white"
                                            onClick={() => handleViewEvaluationDetail(student.id, selectedTask.id)}
                                          >
                                            {translate('viewEvaluationDetail')}
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                                    {translate('noStudentsInTask')}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Panel de comentarios - REPOSICIONADO */}
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h4 className="font-medium mb-3">{translate('comments')}</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {getTaskComments(selectedTask.id)
                      .filter(comment => {
                        // PROFESOR: solo comentarios (no entregas)
                        if (user?.role === 'teacher') return !comment.isSubmission;
                        // ESTUDIANTE: solo su entrega y todos los comentarios
                        if (user?.role === 'student') {
                          if (comment.isSubmission) {
                            return comment.studentId === user.id;
                          }
                          return true;
                        }
                        // Otros roles: solo comentarios
                        return !comment.isSubmission;
                      })
                      .map(comment => (
                        <div
                          key={`task-comment-${comment.id}`}
                          id={`comment-${comment.id}`}
                          className={`bg-muted p-4 rounded-lg transition-all duration-300 ${
                            highlightedCommentId === comment.id
                              ? 'border-2 border-blue-500 shadow-md bg-blue-50 dark:bg-blue-900/20'
                              : ''
                          }`}
                        >
                          {/* NUEVA ORGANIZACIÓN PARA ENTREGA DE ESTUDIANTE */}
                          {comment.isSubmission ? (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              {/* Bloque principal: Nombre, estado Entregado, fecha/hora, porcentaje */}
                              <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
                                {/* Nombre primero */}
                                <span className="font-semibold text-base text-gray-900 dark:text-gray-100">{comment.studentName}</span>
                                {/* Estado Entregado */}
                                <Badge className="bg-blue-100 text-blue-800 font-bold px-2 py-1 text-xs ml-4 md:ml-6">{translate('submitted')}</Badge>
                                {/* Fecha */}
                                <span className="text-xs text-muted-foreground ml-2 md:ml-4">{formatDateOneLine(comment.timestamp)}</span>
                                {/* Porcentaje */}
                                {((user?.role === 'teacher') || (user?.role === 'student' && comment.studentId === user.id)) && typeof comment.grade === 'number' && (
                                  <Badge className={comment.grade >= 70 ? 'bg-green-100 text-green-700 font-bold px-2 py-1 text-xs ml-2 md:ml-4' : 'bg-red-100 text-red-700 font-bold px-2 py-1 text-xs ml-2 md:ml-4'}>
                                    {comment.grade}%
                                  </Badge>
                                )}
                              </div>
                              {/* Botón eliminar o badge calificado alineado derecha */}
                              <div className="flex items-center gap-2 md:ml-auto">
                                {user?.role === 'student' && comment.studentId === user.id && !comment.grade && !comment.reviewedAt && (
                                  <Button variant="destructive" size="sm" onClick={() => handleDeleteSubmission(comment.id)}>
                                    <Trash2 className="w-4 h-4 mr-1" /> {translate('delete')}
                                  </Button>
                                )}
                                {comment.reviewedAt && (
                                  <Badge className="bg-red-100 text-red-700 font-bold px-2 py-1 text-xs flex items-center">
                                    <Lock className="w-3 h-3 mr-1" /> {translate('graded')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Comentario normal
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <span className="font-semibold text-base text-gray-900 dark:text-gray-100">{comment.studentName}</span>
                              <span className="text-xs text-muted-foreground md:ml-3">{formatDateOneLine(comment.timestamp)}</span>
                            </div>
                          )}

                          {/* Comentario */}
                          <p className="text-sm mb-1 mt-2 whitespace-pre-line">{comment.comment}</p>

                          {/* Adjuntos */}
                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {comment.attachments.map((file) => (
                                <div key={`comment-file-${file.id}`} className="flex items-center gap-2 text-xs">
                                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                                  <span className="truncate" title={file.name}>{file.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => downloadFile(file)}
                                    className="h-6 w-6 p-0 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    
                    {getTaskComments(selectedTask.id).length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        {translate('noCommentsYet')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sección para agregar comentarios - REPOSICIONADO AL FINAL */}
                <div className="space-y-3 mt-6">
                  <Separator />
                  <div>
                    <Label htmlFor="newComment">
                      {user?.role === 'student' && isSubmission 
                        ? translate('submitTask') 
                        : user?.role === 'teacher' 
                          ? translate('teacherCommentPlaceholder') 
                          : translate('addComment')}
                    </Label>
                    <Textarea
                      id="newComment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        user?.role === 'student' && isSubmission 
                          ? translate('submissionPlaceholder') 
                          : user?.role === 'teacher' 
                            ? translate('teacherCommentPlaceholder') 
                            : translate('commentPlaceholder')
                      }
                      className="mt-1"
                    />
                    
                    {/* File Upload for Comments - Solo para tareas normales, no para evaluaciones */}
                    {selectedTask?.taskType !== 'evaluacion' && (
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
                            onClick={() => document.getElementById('comment-file-upload')?.click()}
                            className="w-full bg-orange-100 hover:bg-orange-500 hover:text-white text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-600 dark:hover:text-white dark:text-orange-400 dark:border-orange-700"
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
                              <div key={`comment-attachment-${file.id}`} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
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
                                  className="flex-shrink-0 h-6 w-6 p-0 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-3">
                      {user?.role === 'student' && selectedTask?.taskType !== 'evaluacion' && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isSubmission"
                            checked={isSubmission}
                            onChange={(e) => setIsSubmission(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="isSubmission" className="text-sm">
                            {translate('markAsFinalSubmission')}
                          </Label>
                        </div>
                      )}
                      {user?.role === 'teacher' && (
                        <div>{/* Espacio vacío para mantener la alineación */}</div>
                      )}
                      <Button 
                        onClick={handleAddComment} 
                        disabled={!newComment.trim() && commentAttachments.length === 0}
                        className={`${
                          selectedTask?.taskType === 'evaluacion' 
                            ? 'bg-purple-500 hover:bg-purple-600' 
                            : 'bg-orange-500 hover:bg-orange-600'
                        } text-white disabled:bg-gray-300 disabled:text-gray-500`}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {user?.role === 'student' && isSubmission 
                          ? translate('submit') 
                          : translate('sendComment')}
                      </Button>
                    </div>
                  </div>
                </div>
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
                <Label htmlFor="title" className="text-right">{translate('taskTitle')} <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="col-span-3"
                  placeholder={translate('taskTitlePlaceholder')}
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">{translate('taskDescription')} <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="course" className="text-right">{translate('taskCourse')} <span className="text-red-500">*</span></Label>
                <Select value={formData.course} onValueChange={(value) => {
                  // Obtener asignaturas disponibles para el nuevo curso
                  const availableSubjects = getAvailableSubjectsForCourse(value);
                  
                  // Si la asignatura actual no está disponible en el nuevo curso, limpiarla
                  const newSubject = availableSubjects.includes(formData.subject) ? formData.subject : '';
                  
                  setFormData(prev => ({ 
                    ...prev, 
                    course: value,
                    subject: newSubject 
                  }));
                }}>
                  <SelectTrigger className="select-orange-hover-trigger col-span-3">
                    <SelectValue placeholder={translate('selectCourse')} />
                  </SelectTrigger>
                  <SelectContent className="select-orange-hover">
                    {getAvailableCoursesWithNames().map((course: {id: string, name: string}) => (
                      <SelectItem key={`comment-course-${course.id}`} value={course.id}>{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="text-right">{translate('taskSubject')} <span className="text-red-500">*</span></Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))} required>
                  <SelectTrigger className="select-orange-hover-trigger col-span-3">
                    <SelectValue placeholder={translate('selectSubject')} />
                  </SelectTrigger>
                  <SelectContent className="select-orange-hover">
                    {(formData.course ? getAvailableSubjectsForCourse(formData.course) : getAvailableSubjects()).map((subject: string) => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{translate('assignTo')}</Label>
                <Select value={formData.assignedTo} onValueChange={(value: 'course' | 'student') => setFormData(prev => ({ ...prev, assignedTo: value }))}>
                  <SelectTrigger className="select-orange-hover-trigger col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="select-orange-hover">
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
                      {getStudentsForCourse(formData.course).length > 0 ? (
                        getStudentsForCourse(formData.course).map((student: { id: string, username: string, displayName: string }) => (
                          <div key={student.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={`edit-student-${student.username}`}
                              checked={formData.assignedStudentIds?.includes(student.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    assignedStudentIds: [...(prev.assignedStudentIds || []), student.id]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    assignedStudentIds: prev.assignedStudentIds?.filter((s: string) => s !== student.id) || []
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
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{translate('priority')}</Label>
                <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="select-orange-hover-trigger col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="select-orange-hover">
                    <SelectItem value="low">{translate('priorityLow')}</SelectItem>
                    <SelectItem value="medium">{translate('priorityMedium')}</SelectItem>
                    <SelectItem value="high">{translate('priorityHigh')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">{translate('taskType')}</Label>
                <Select value={formData.taskType} onValueChange={(value: 'tarea' | 'evaluacion') => setFormData(prev => ({ ...prev, taskType: value }))}>
                  <SelectTrigger className="select-orange-hover-trigger col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="select-orange-hover">
                    <SelectItem value="tarea">{translate('taskTypeAssignment')}</SelectItem>
                    <SelectItem value="evaluacion">{translate('taskTypeEvaluation')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Evaluation specific fields */}
              {formData.taskType === 'evaluacion' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="topic-edit" className="text-right">Tema <span className="text-red-500">*</span></Label>
                    <Input
                      id="topic-edit"
                      value={formData.topic}
                      onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                      className="col-span-3"
                      placeholder="Introduce el tema de la evaluación"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="numQuestions-edit" className="text-right">{translate('questionCountLabel')} <span className="text-red-500">*</span></Label>
                    <Select 
                      value={formData.numQuestions?.toString() || ''} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, numQuestions: parseInt(value) }))}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona la cantidad de preguntas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 preguntas</SelectItem>
                        <SelectItem value="10">10 preguntas</SelectItem>
                        <SelectItem value="15">15 preguntas</SelectItem>
                        <SelectItem value="20">20 preguntas</SelectItem>
                        <SelectItem value="25">25 preguntas</SelectItem>
                        <SelectItem value="30">30 preguntas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="timeLimit-edit" className="text-right">Tiempo (minutos) <span className="text-red-500">*</span></Label>
                    <Input
                      id="timeLimit-edit"
                      type="number"
                      value={formData.timeLimit || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 0 }))}
                      className="col-span-3"
                      placeholder="Ej: 45"
                      min="1"
                      max="180"
                      required
                    />
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="cancel-button">
                {translate('cancel')}
              </Button>
              <Button 
                onClick={handleUpdateTask}
                className={`${formData.taskType === 'evaluacion' 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-orange-500 hover:bg-orange-600'} text-white`}
              >
                {formData.taskType === 'evaluacion' ? translate('updateEvaluation') || translate('updateTask') : translate('updateTask')}
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
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="cancel-button">
                {translate('cancel')}
              </Button>
              <Button onClick={confirmDeleteTask} variant="destructive">
                {translate('deleteTask')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Grade Submission Dialog */}
        <Dialog open={showGradeDialog} onOpenChange={handleCloseGradeDialog}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{translate('gradeSubmissionTitle')}</DialogTitle>
              <DialogDescription>
                {translate('gradeSubmissionDesc')}
              </DialogDescription>
            </DialogHeader>
            
            {submissionToGrade && selectedTask && (
              <div className="space-y-6">
                {/* Información de la tarea */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">{translate('taskInformation')}</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>{translate('task')}:</strong> {selectedTask.title}</p>
                    <p><strong>{translate('taskDescription')}:</strong> {selectedTask.description}</p>
                    <p><strong>{translate('dueDate')}:</strong> {formatDateOneLine(selectedTask.dueDate)}</p>
                    <p><strong>{translate('tableCourse')}:</strong> {getCourseNameById(selectedTask.course)}</p>
                    <p><strong>{translate('taskSubject')}:</strong> {selectedTask.subject}</p>
                  </div>
                </div>

                {/* Información del estudiante */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2 text-green-800 dark:text-green-200">{translate('studentInformation')}</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>{translate('studentNameColumn')}:</strong> {submissionToGrade.studentName}</p>
                    <p><strong>{translate('user')}:</strong> {submissionToGrade.studentName}</p>
                    <p><strong>{translate('submissionDateColumn')}:</strong> {formatDateOneLine(submissionToGrade.timestamp)}</p>
                  </div>
                </div>

                {/* Entrega del estudiante */}
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border">
                  <h4 className="font-medium mb-3">Entrega del Estudiante</h4>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                    <p className="text-sm whitespace-pre-wrap">{submissionToGrade.comment}</p>
                  </div>
                </div>

                {/* Archivos adjuntos de la entrega */}
                {submissionToGrade.attachments && submissionToGrade.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Archivos de la Entrega</h4>
                    <div className="space-y-2">
                      {submissionToGrade.attachments.map((file) => (
                        <div key={`submission-file-${file.id}`} className="flex items-center justify-between p-3 bg-muted rounded border">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate font-medium" title={file.name}>{file.name}</span>
                            <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(file)}
                            className="flex-shrink-0 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Descargar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Archivos adjuntos de la tarea original */}
                {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Archivos de la Tarea Original</h4>
                    <div className="space-y-2">
                      {selectedTask.attachments.map((file) => (
                        <div key={`task-file-${file.id}`} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="truncate" title={file.name}>{file.name}</span>
                            <span className="text-muted-foreground text-xs">({formatFileSize(file.size)})</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(file)}
                            className="flex-shrink-0 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Descargar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Sección de calificación */}
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border">
                  <h4 className="font-medium mb-4 text-orange-800 dark:text-orange-200">Calificación</h4>
                  
                  <div className="space-y-4">
                    {/* Campo de calificación */}
                    <div>
                      <label htmlFor="gradeInput" className="block text-sm font-medium mb-2">
                        {translate('gradeRange')} <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="gradeInput"
                          type="number"
                          min="0"
                          max="100"
                          value={gradeForm.grade}
                          onChange={(e) => setGradeForm(prev => ({ ...prev, grade: e.target.value }))}
                          placeholder="Ej: 85"
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">/ 100</span>
                        {gradeForm.grade && (
                          <Badge variant="outline" className={parseInt(gradeForm.grade) >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {parseInt(gradeForm.grade) >= 70 ? translate('approved') : translate('failed')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Campo de comentario */}
                    <div>
                      <label htmlFor="teacherComment" className="block text-sm font-medium mb-2">
                        Comentario de Retroalimentación
                      </label>
                      <Textarea
                        id="teacherComment"
                        value={gradeForm.teacherComment}
                        onChange={(e) => setGradeForm(prev => ({ ...prev, teacherComment: e.target.value }))}
                        placeholder={translate('feedbackPlaceholder')}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseGradeDialog}
                    className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
                  >
                    {translate('cancel')}
                  </Button>
                  <Button 
                    onClick={saveGrade}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={!gradeForm.grade.trim()}
                  >
                    {translate('saveGrade')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo de Revisión Mejorado */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span>{currentReview.isGraded ? translate('editSubmission') : translate('reviewSubmission')} - {currentReview.studentDisplayName}</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {currentReview.isGraded ? translate('graded') : translate('toGrade')}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {selectedTask?.title}
              </DialogDescription>
            </DialogHeader>
            
            {currentReview.submission && selectedTask && (
              <div className="space-y-6">
                {/* Información de la Tarea */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium mb-3 text-blue-800 dark:text-blue-200 flex items-center">
                    <ClipboardList className="w-5 h-5 mr-2" />
                    {translate('taskInformation')}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>{translate('taskTitle')}:</strong> {selectedTask.title}</p>
                      <p><strong>{translate('tableCourse')}:</strong> {getCourseNameById(selectedTask.course)}</p>
                      <p><strong>{translate('taskSubject')}:</strong> {selectedTask.subject}</p>
                    </div>
                    <div>
                      <p><strong>{translate('dueDate')}:</strong> {formatDateOneLine(selectedTask.dueDate)}</p>
                      <div><strong>{translate('priority')}:</strong> 
                        <Badge className={`ml-1 ${getPriorityColor(selectedTask.priority)}`}>
                          {selectedTask.priority === 'high' ? translate('priorityHigh') : 
                          selectedTask.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p><strong>{translate('taskDescription')}:</strong></p>
                    <p className="text-muted-foreground mt-1">{selectedTask.description}</p>
                  </div>
                </div>

                {/* Información del Estudiante */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium mb-3 text-green-800 dark:text-green-200 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    {translate('studentAndSubmissionInfo')}
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>{translate('studentNameColumn')}:</strong> {currentReview.studentDisplayName}</p>
                      <p><strong>ID:</strong> {currentReview.studentId}</p>
                      <p><strong>{translate('deliveryTime')}:</strong> {formatDate(currentReview.submission.timestamp)}</p>
                    </div>
                    <div>
                      <p><strong>{translate('fullDate')}:</strong> {new Date(currentReview.submission.timestamp).toLocaleString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}</p>
                      <p><strong>{translate('timeElapsed')}:</strong> {(() => {
                        const now = new Date();
                        const submissionTime = new Date(currentReview.submission.timestamp);
                        const diffMs = now.getTime() - submissionTime.getTime();
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffHours / 24);
                        
                        if (diffDays > 0) {
                          return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''} y ${diffHours % 24} hora${(diffHours % 24) > 1 ? 's' : ''}`;
                        } else if (diffHours > 0) {
                          return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                        } else {
                          const diffMinutes = Math.floor(diffMs / (1000 * 60));
                          return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
                        }
                      })()}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <strong>{translate('currentStatus')}:</strong>
                        {/* Estado de la entrega del estudiante, igual que en la lista */}
                        {(() => {
                          if (!currentReview.submission) {
                            // No hay entrega: Pendiente
                            return (
                              <Badge className="bg-gray-100 text-gray-800">
                                {translate('statusPending')}
                              </Badge>
                            );
                          } else if (currentReview.submission && (currentReview.submission.grade === undefined || currentReview.submission.grade === null)) {
                            // Entregada pero sin nota: En Revisión (amarillo)
                            return (
                              <Badge className="bg-yellow-100 text-yellow-800 font-bold">
                                {translate('underReview')}
                              </Badge>
                            );
                          } else if (currentReview.submission && typeof currentReview.submission.grade === 'number') {
                            // Finalizado: verde + badge porcentaje
                            return (
                              <>
                                <Badge className="bg-green-100 text-green-800 font-bold mr-1">
                                  {translate('statusFinished')}
                                </Badge>
                                <Badge className={currentReview.submission.grade >= 70 ? 'bg-green-100 text-green-700 font-bold ml-2' : 'bg-red-100 text-red-700 font-bold ml-2'}>
                                  {currentReview.submission.grade}/100
                                </Badge>
                              </>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido de la Entrega */}
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border">
                  <h4 className="font-medium mb-3 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    {translate('submissionContent')}
                  </h4>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded border min-h-[100px]">
                    <p className="text-sm whitespace-pre-wrap">
                      {currentReview.submission.comment || translate('noTextContent')}
                    </p>
                  </div>
                </div>

                {/* Archivos Adjuntos de la Entrega */}
                {currentReview.submission.attachments && currentReview.submission.attachments.length > 0 ? (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-medium mb-3 flex items-center text-purple-800 dark:text-purple-200">
                      <Paperclip className="w-5 h-5 mr-2" />
                      {translate('submissionAttachments')} ({currentReview.submission.attachments.length})
                    </h4>
                    <div className="space-y-3">
                      {currentReview.submission.attachments.map((file, index) => (
                        <div key={`review-submission-file-${file.id}`} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <Paperclip className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate" title={file.name}>
                                📎 {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Tamaño: {formatFileSize(file.size)} • Subido: {formatDate(file.uploadedAt)}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                {translate('fileNumber', { number: (index + 1).toString(), total: (currentReview.submission?.attachments?.length || 0).toString() })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(file)}
                            className="flex-shrink-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 ml-3"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Ver/Descargar
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        💡 <strong>Tip:</strong> Haz clic en "Ver/Descargar" para revisar cada archivo antes de calificar la entrega.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium mb-3 flex items-center text-gray-600 dark:text-gray-400">
                      <Paperclip className="w-5 h-5 mr-2" />
                      {translate('attachedFiles')}
                    </h4>
                    <div className="text-center py-6">
                      <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {translate('noAttachedFiles')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Sección de Calificación */}
                <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg border border-orange-200">
                  <h4 className="font-medium mb-4 text-orange-800 dark:text-orange-200 flex items-center">
                    <Star className="w-5 h-5 mr-2" />
                    {translate('gradeAndFeedback')}
                  </h4>
                  
                  <div className="space-y-6">
                    {/* Resumen de la Entrega */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">📋 {translate('submissionSummary')}</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>{translate('studentNameColumn')}:</strong> {currentReview.studentDisplayName}</p>
                          <p><strong>{translate('submittedOn')}:</strong> {formatDate(currentReview.submission.timestamp)}</p>
                        </div>
                        <div>
                          <p><strong>{translate('attachedFiles')}:</strong> {currentReview.submission.attachments?.length || 0}</p>
                          <p><strong>{translate('comments')}:</strong> {currentReview.submission.comment ? translate('yes') : translate('no')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Campo de calificación mejorado */}
                    <div>
                      <label htmlFor="gradeInputNew" className="block text-sm font-medium mb-3">
                        🎯 {translate('gradeRange')} <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <Input
                            id="gradeInputNew"
                            type="number"
                            min="0"
                            max="100"
                            value={currentReview.grade || ''}
                            onChange={(e) => setCurrentReview(prev => ({ 
                              ...prev, 
                              grade: parseInt(e.target.value) || 0 
                            }))}
                            placeholder="0"
                            className="w-32 text-lg text-center font-bold"
                          />
                          <span className="text-lg text-muted-foreground font-medium">/ 100</span>
                          {currentReview.grade > 0 && (
                            <Badge variant="outline" className={
                              currentReview.grade >= 70 
                                ? 'bg-green-100 text-green-800 border-green-300 text-sm font-bold' 
                                : 'bg-red-100 text-red-800 border-red-300 text-sm font-bold'
                            }>
                              {currentReview.grade >= 70 ? `✅ ${translate('approved')}` : `❌ ${translate('failed')}`}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Escala de calificación visual */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>0</span>
                            <span>25</span>
                            <span>50</span>
                            <span>70</span>
                            <span>100</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                currentReview.grade >= 70 ? 'bg-green-500' : 
                                currentReview.grade >= 50 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(currentReview.grade || 0, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>{translate('insufficient')}</span>
                            <span>{translate('regular')}</span>
                            <span>{translate('good')}</span>
                            <span>{translate('veryGood')}</span>
                            <span>{translate('excellent')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Campo de retroalimentación mejorado */}
                    <div>
                      <label htmlFor="feedbackInputNew" className="block text-sm font-medium mb-3">
                        💬 {translate('feedbackForStudent')}
                      </label>
                      <Textarea
                        id="feedbackInputNew"
                        value={currentReview.feedback}
                        onChange={(e) => setCurrentReview(prev => ({ 
                          ...prev, 
                          feedback: e.target.value 
                        }))}
                        placeholder={translate('feedbackPlaceholder')}
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {translate('feedbackVisibleNote')}
                      </p>
                    </div>

                    {/* Calificación previa (si existe) */}
                    {currentReview.isGraded && currentReview.submission.reviewedAt && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200">
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          <strong>Calificación anterior:</strong> {currentReview.submission.grade}/100
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          Revisado el: {formatDate(currentReview.submission.reviewedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowReviewDialog(false)}
                className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300"
              >
                {translate('cancel')}
              </Button>
              <Button 
                onClick={saveReviewAndGrade}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!currentReview.grade || currentReview.grade < 0 || currentReview.grade > 100}
              >
                {currentReview.isGraded ? translate('updateGrade') : translate('saveGrade')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Loading Dialog para evaluación mejorado */}
        <Dialog open={showLoadingDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-purple-700 flex items-center justify-center space-x-2">
                <ClipboardCheck className="w-5 h-5" />
                <span>{translate('evalLoadingPreparingEvaluation')}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-6 py-6">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-purple-200"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - loadingProgress / 100)}`}
                    className="text-purple-600 transition-all duration-500 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-purple-700">{loadingProgress}%</span>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-purple-600 font-medium">{loadingStatus}</p>
                <div className="flex justify-center">
                  <div className="animate-pulse flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Evaluation Dialog mejorado - Formato similar a pestaña evaluaciones */}
        <Dialog open={showEvaluationDialog} onOpenChange={() => {}}>
          <DialogContent className="max-w-none w-screen h-screen m-0 rounded-none border-0 p-0">
            <DialogTitle className="sr-only">
              {translate('navEvaluation')} - {currentEvaluation.task?.topic || translate('navEvaluation')}
            </DialogTitle>
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
              <Card className="w-full max-w-2xl mx-auto shadow-xl">
                <CardHeader className="text-center border-b pb-4">
                  <CardTitle className="text-2xl font-bold font-headline">
                    {translate('navEvaluation').toUpperCase()} - {currentEvaluation.task?.topic?.toUpperCase() || translate('navEvaluation').toUpperCase()}
                  </CardTitle>
                  <CardDescription className="flex items-center justify-center space-x-4">
                    <span>{translate('evalQuestionProgress', { current: ((currentEvaluation.currentQuestionIndex || 0) + 1).toString(), total: currentEvaluation.questions.length.toString() })}</span>
                    <span className={`font-mono text-base text-primary tabular-nums flex items-center ${currentEvaluation.timeRemaining <= 60 ? 'text-red-500 animate-pulse' : ''}`}>
                      <Timer className="w-4 h-4 mr-1.5" />
                      {translate('evalTimeLeft', { time: `${Math.floor(currentEvaluation.timeRemaining / 60)}:${(currentEvaluation.timeRemaining % 60).toString().padStart(2, '0')}` })}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 min-h-[300px] flex flex-col justify-between">
                  {currentEvaluation.questions.length > 0 && (
                    <div>
                      {(() => {
                        // Obtenemos la pregunta actual y su tipo
                        const question = currentEvaluation.questions[currentEvaluation.currentQuestionIndex || 0];
                        const questionType = question?.type || 'multiple_choice';
                        const currentAnswer = currentEvaluation.answers[currentEvaluation.currentQuestionIndex || 0];

                        // Lógica para manejar respuestas de selección múltiple (checkboxes)
                        const handleMultipleSelect = (selectedIndex: number) => {
                          const newAnswers = { ...currentEvaluation.answers };
                          const currentSelection = (currentAnswer as number[] | undefined) || [];
                          
                          if (currentSelection.includes(selectedIndex)) {
                            newAnswers[currentEvaluation.currentQuestionIndex || 0] = currentSelection.filter(item => item !== selectedIndex);
                          } else {
                            newAnswers[currentEvaluation.currentQuestionIndex || 0] = [...currentSelection, selectedIndex].sort();
                          }
                          setCurrentEvaluation({ ...currentEvaluation, answers: newAnswers });
                        };

                        // Lógica para respuestas de selección única (alternativas y V/F)
                        const handleSingleSelect = (selectedIndex: number) => {
                            const newAnswers = { ...currentEvaluation.answers };
                            newAnswers[currentEvaluation.currentQuestionIndex || 0] = selectedIndex;
                            setCurrentEvaluation({ ...currentEvaluation, answers: newAnswers });
                        };

                        return (
                          <>
                            <p className="text-lg font-medium mb-4 text-left md:text-center">
                              {question?.question}
                            </p>
                            {questionType === 'multiple_select' && (
                                <p className="text-sm text-center text-purple-600 mb-4">
                                  ({translate('multipleSelectInstruction')})
                                </p>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {question?.options.map((option: string, index: number) => (
                                // --- ✨ AQUÍ ESTÁ LA CORRECCIÓN CLAVE ✨ ---
                                questionType === 'multiple_select' ? (
                                  // Si es selección múltiple, renderizamos un Checkbox
                                  <div key={index} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-primary/10">
                                    <Checkbox
                                      id={`option-${index}`}
                                      checked={Array.isArray(currentAnswer) && currentAnswer.includes(index)}
                                      onCheckedChange={() => handleMultipleSelect(index)}
                                    />
                                    <Label htmlFor={`option-${index}`} className="text-base font-normal cursor-pointer w-full">
                                      {String.fromCharCode(65 + index)}. {option}
                                    </Label>
                                  </div>
                                ) : (
                                  // Si no, renderizamos un Botón (para alternativas o V/F)
                                  <Button
                                    key={index}
                                    variant="ghost"
                                    className={`py-3 text-base justify-start text-left h-auto whitespace-normal w-full ${
                                      currentAnswer === index
                                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                        : 'border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20'
                                    }`}
                                    onClick={() => handleSingleSelect(index)}
                                    disabled={currentEvaluation.timeRemaining === 0}
                                  >
                                    <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span> {option}
                                  </Button>
                                )
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  
                  <div className={`flex mt-8 ${(currentEvaluation.currentQuestionIndex || 0) > 0 ? 'justify-between' : 'justify-end'}`}>
                    {(currentEvaluation.currentQuestionIndex || 0) > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          const newIndex = Math.max(0, (currentEvaluation.currentQuestionIndex || 0) - 1);
                          setCurrentEvaluation({
                            ...currentEvaluation,
                            currentQuestionIndex: newIndex
                          });
                        }}
                        className="text-base py-3 px-6 hover:bg-purple-100 hover:text-purple-700 hover:border-purple-300"
                        disabled={currentEvaluation.timeRemaining === 0}
                      >
                        <ChevronRight className="w-5 h-5 mr-2 rotate-180" />
                        {translate('evalPreviousButton')}
                      </Button>
                    )}
                    
                    {(currentEvaluation.currentQuestionIndex || 0) < currentEvaluation.questions.length - 1 ? (
                      <Button
                        onClick={() => {
                          const newIndex = (currentEvaluation.currentQuestionIndex || 0) + 1;
                          setCurrentEvaluation({
                            ...currentEvaluation,
                            currentQuestionIndex: newIndex
                          });
                        }}
                        className="text-base py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={currentEvaluation.timeRemaining === 0}
                      >
                        {translate('evalNextButton')}
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleCompleteEvaluation()}
                        className="text-base py-3 px-6 bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700"
                        disabled={currentEvaluation.timeRemaining === 0}
                      >
                        <Award className="w-5 h-5 mr-2" />
                        {translate('evalFinishButton')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Modal de Tiempo Agotado - DENTRO del diálogo de evaluación */}
              {showTimeExpiredDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Timer className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Tiempo Agotado</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Se acabó el tiempo para completar la evaluación. La evaluación se ha guardado automáticamente con las respuestas que alcanzaste a completar.
                    </p>
                    
                    {timeExpiredResult && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800 mb-6">
                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-6 text-center text-lg">{translate('resultsObtained')}</h4>
                        <div className="flex justify-center space-x-12">
                          <div className="text-center">
                            <span className="font-medium text-red-700 dark:text-red-300 block mb-2">{translate('correctAnswersLabel')}</span>
                            <p className="text-red-600 dark:text-red-400 text-2xl font-bold">
                              {timeExpiredResult.correctAnswers}/{timeExpiredResult.totalQuestions}
                            </p>
                          </div>
                          <div className="text-center">
                            <span className="font-medium text-red-700 dark:text-red-300 block mb-2">Calificación:</span>
                            <p className="text-red-600 dark:text-red-400 text-2xl font-bold">
                              {timeExpiredResult.percentage}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center">
                      <Button
                        onClick={() => {
                          setShowTimeExpiredDialog(false);
                          setEvaluationTimeExpired(false);
                          // Cerrar la evaluación completamente
                          setShowEvaluationDialog(false);
                          setCurrentEvaluation({
                            task: null,
                            questions: [],
                            startTime: null,
                            answers: {},
                            timeRemaining: 0,
                            currentQuestionIndex: 0
                          });
                          // Mostrar revisión de resultados
                          setCurrentEvaluationReview(timeExpiredResult);
                          setShowReviewEvaluationDialog(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg font-medium rounded-lg"
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        {translate('resultsButton')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Revisión de Evaluación con detalles completos */}
        <Dialog open={showReviewEvaluationDialog} onOpenChange={setShowReviewEvaluationDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span>{translate('evalReviewTitle')}</span>
              </DialogTitle>
              <DialogDescription>
                {translate('evalReviewDescription')}
              </DialogDescription>
            </DialogHeader>
            
            {currentEvaluationReview && (
              <div className="space-y-6">
                {/* Información general */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">{translate('evalReviewGeneralInfo')}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">{translate('evalReviewTopic')}</span>
                      <p className="text-blue-600 dark:text-blue-400">{currentEvaluationReview.task?.topic || translate('evalReviewNotSpecified')}</p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">{translate('evalReviewTimeUsed')}</span>
                      <p className="text-blue-600 dark:text-blue-400">
                        {Math.floor(currentEvaluationReview.timeUsed / 60)}:{(currentEvaluationReview.timeUsed % 60).toString().padStart(2, '0')} min
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">{translate('evalReviewDate')}</span>
                      <p className="text-blue-600 dark:text-blue-400">
                        {new Date(currentEvaluationReview.completedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">{translate('evalReviewStatus')}</span>
                      <p className="text-blue-600 dark:text-blue-400">
                        {currentEvaluationReview.timeExpired ? translate('evalReviewTimeExpired') : translate('evalReviewCompletedOnTime')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resultados */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-3">{translate('evalReviewResults')}</h4>
                  <div className="flex items-center justify-center space-x-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {currentEvaluationReview.correctAnswers}/{currentEvaluationReview.totalQuestions}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">{translate('evalReviewCorrectAnswers')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {currentEvaluationReview.percentage}%
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">{translate('evalReviewPercentage')}</div>
                    </div>
                  </div>
                </div>

                {/* Revisión detallada de preguntas */}
                {currentEvaluationReview.questions && currentEvaluationReview.questions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">{translate('evalReviewDetailedReview')}</h4>
                    
                    {currentEvaluationReview.questions.map((question: any, index: number) => {
                      // --- ✨ CORRECCIÓN CLAVE AQUÍ ✨ ---
                      // Simplemente leemos el valor 'isCorrect' que ya fue calculado y guardado.
                      const isCorrect = question.isCorrect;
                      const userAnswer = question.studentAnswer; // Usamos el studentAnswer guardado
                      
                      return (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg border-l-4 ${
                            isCorrect 
                              ? 'bg-green-50 dark:bg-green-900/20 border-l-green-500 border border-green-200 dark:border-green-800' 
                              : 'bg-red-50 dark:bg-red-900/20 border-l-red-500 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h5 className="font-medium text-gray-800 dark:text-gray-200">
                              {translate('evalReviewQuestion')} {index + 1}
                            </h5>
                            <Badge 
                              className={isCorrect 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                              }
                            >
                              {isCorrect ? translate('evalReviewCorrect') : translate('evalReviewIncorrect')}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-700 dark:text-gray-300 mb-4 font-medium">
                            {question.question}
                          </p>
                          
                          <div className="space-y-2 mb-4">
                            {question.options.map((option: string, optionIndex: number) => {
                              // Determinar si esta opción fue seleccionada por el estudiante
                              const isStudentAnswer = Array.isArray(userAnswer) 
                                ? userAnswer.includes(optionIndex)
                                : userAnswer === optionIndex;
                              
                              // Determinar si esta opción es correcta
                              const isCorrectOption = Array.isArray(question.correct)
                                ? question.correct.includes(optionIndex)
                                : question.correct === optionIndex;
                              
                              return (
                                <div 
                                  key={optionIndex}
                                  className={`p-2 rounded border text-sm ${
                                    isCorrectOption
                                      ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 font-medium'
                                      : isStudentAnswer && !isCorrectOption
                                      ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300'
                                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold">
                                      {String.fromCharCode(65 + optionIndex)}.
                                    </span>
                                    <span>{option}</span>
                                    {isCorrectOption && (
                                      <Badge className="bg-green-200 text-green-800 text-xs ml-auto">
                                        {translate('evalReviewCorrectAnswer')}
                                      </Badge>
                                    )}
                                    {isStudentAnswer && !isCorrectOption && (
                                      <Badge className="bg-red-200 text-red-800 text-xs ml-auto">
                                        {translate('evalReviewYourAnswer')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {question.explanation && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-700 mt-3">
                              <span className="font-medium text-blue-700 dark:text-blue-300 text-sm block mb-1">
                                {translate('evalReviewExplanation')}
                              </span>
                              <p className="text-blue-600 dark:text-blue-400 text-sm">
                                {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botón cerrar */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={() => setShowReviewEvaluationDialog(false)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {translate('evalReviewClose')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo de revisión de evaluación */}
        <Dialog open={showEvaluationReviewDialog} onOpenChange={setShowEvaluationReviewDialog}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-purple-800 dark:text-purple-200">
                {translate('viewEvaluationDetail')} - {selectedEvaluationResult?.studentName || translate('student')}
              </DialogTitle>
            </DialogHeader>
            
            {selectedEvaluationResult && (
              <div className="space-y-6">
                {/* Debug log */}
                {console.log('🎯 RENDERING EVALUATION DIALOG:', {
                  currentLanguage: localStorage.getItem('smart-student-lang'),
                  hasQuestions: !!selectedEvaluationResult.questions,
                  firstQuestion: selectedEvaluationResult.questions?.[0]?.question?.substring(0, 50),
                  studentName: selectedEvaluationResult.studentName
                })}
                
                {/* Resumen de la evaluación */}
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-bold mb-4 text-purple-800 dark:text-purple-200 text-left">{translate('evalSummaryTitle')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <strong className="text-purple-700 dark:text-purple-300 block mb-1">{translate('evalSummaryScore')}</strong>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {selectedEvaluationResult.correctAnswers}/{selectedEvaluationResult.totalQuestions}
                      </p>
                    </div>
                    <div className="text-center">
                      <strong className="text-purple-700 dark:text-purple-300 block mb-1">{translate('evalSummaryPercentage')}</strong>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {selectedEvaluationResult.percentage}%
                      </p>
                    </div>
                    <div className="text-center">
                      <strong className="text-purple-700 dark:text-purple-300 block mb-1">{translate('evalSummaryTime')}</strong>
                      <p className="text-purple-600 dark:text-purple-400">
                        {selectedEvaluationResult.timeUsed 
                          ? `${Math.floor(selectedEvaluationResult.timeUsed / 60)}:${(selectedEvaluationResult.timeUsed % 60).toString().padStart(2, '0')} min`
                          : selectedEvaluationResult.timeSpent || translate('notAvailable')
                        }
                      </p>
                    </div>
                    <div className="text-center">
                      <strong className="text-purple-700 dark:text-purple-300 block mb-1">{translate('evalSummaryDate')}</strong>
                      <p className="text-purple-600 dark:text-purple-400">
                        {new Date(selectedEvaluationResult.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preguntas y respuestas */}
                {selectedEvaluationResult.questions && selectedEvaluationResult.questions.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-4 text-gray-800 dark:text-gray-200">{translate('evalDetailedReview')}</h4>
                    <div className="space-y-4">
                      {selectedEvaluationResult.questions.map((question: any, index: number) => (
                        <div 
                          key={index}
                          className={`p-4 rounded-lg border-2 ${
                            question.isCorrect 
                              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-gray-800 dark:text-gray-200">
                              {translate('evalReviewQuestion')} {index + 1}
                            </h5>
                            <Badge className={question.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {question.isCorrect ? translate('evalReviewCorrect') : translate('evalReviewIncorrect')}
                            </Badge>
                          </div>
                          
                          <p className="mb-3 text-gray-700 dark:text-gray-300">{question.question}</p>
                          
                          <div className="space-y-2">
                            <div>
                              <strong className="text-sm text-gray-600 dark:text-gray-400">{translate('evalReviewCorrectAnswer')}</strong>
                              <p className="ml-2 text-green-700 dark:text-green-300">{question.correctAnswer}</p>
                            </div>
                            
                            {question.explanation && (
                              <div>
                                <strong className="text-sm text-gray-600 dark:text-gray-400">{translate('evalReviewExplanation')}</strong>
                                <p className="ml-2 text-gray-600 dark:text-gray-400 text-sm">{question.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Funciones auxiliares para la vista de detalles por estudiante */}
        {/* Fin del contenido principal */}
      </div>
    );
  }
