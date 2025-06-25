"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { useRouter } from 'next/navigation';
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
import { ClipboardList, Plus, Calendar, User, Users, MessageSquare, Eye, Send, Edit, Trash2, Paperclip, Download, X, Upload } from 'lucide-react';
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
  attachments?: TaskFile[]; // Files attached by teacher
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
    initialComment: ''
  });

  // Load tasks and comments
  useEffect(() => {
    loadTasks();
    loadComments();
    
    // Mark notifications as read when student views tasks page
    if (user?.role === 'student') {
      // Mark grade notifications as read when entering tasks page
      TaskNotificationManager.markGradeNotificationsAsReadOnTasksView(user.username);
      
      const unreadNotifications = TaskNotificationManager.getUnreadNotificationsForUser(
        user.username, 
        'student'
      );
      
      // Mark all new task notifications as read
      unreadNotifications
        .filter(notification => notification.type === 'new_task')
        .forEach(notification => {
          TaskNotificationManager.markAsReadByUser(notification.id, user.username);
        });
      
      // Trigger notification update event to refresh the UI
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
      }, 100);
    }
  }, [user]);

  const loadTasks = () => {
    const storedTasks = localStorage.getItem('smart-student-tasks');
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  };

  const loadComments = () => {
    const storedComments = localStorage.getItem('smart-student-task-comments');
    if (storedComments) {
      setComments(JSON.parse(storedComments));
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
    const users = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
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
      attachments: taskAttachments
    };

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
        user.displayName || user.username
      );
    }

    // Si hay un comentario inicial, agregarlo
    if (formData.initialComment.trim() && user?.role === 'teacher') {
      const initialComment: TaskComment = {
        id: `comment_${Date.now()}`,
        taskId: newTask.id,
        studentUsername: user.username,
        studentName: user.displayName || user.username,
        comment: formData.initialComment,
        timestamp: new Date().toISOString(),
        isSubmission: false,
        attachments: [],
        userRole: user?.role === 'teacher' ? 'teacher' : (user?.role === 'admin' ? 'admin' : 'teacher')
      };

      const updatedComments = [...comments, initialComment];
      saveComments(updatedComments);

      // Crear notificaciones para los estudiantes sobre el comentario del profesor
      TaskNotificationManager.createTeacherCommentNotifications(
        newTask.id,
        newTask.title,
        newTask.course,
        newTask.subject,
        user.username,
        user.displayName || user.username,
        formData.initialComment
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
      initialComment: ''
    });
    setTaskAttachments([]);
    setShowCreateDialog(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedTask) return;

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
      userRole: user?.role || 'student'
    };

    const updatedComments = [...comments, comment];
    saveComments(updatedComments);

    // Si es un comentario del profesor, crear notificaciones para todos los estudiantes del curso
    if (user?.role === 'teacher') {
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
      initialComment: ''
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

    const updatedTask: Task = {
      ...selectedTask,
      title: formData.title,
      description: formData.description,
      subject: formData.subject,
      course: formData.course,
      assignedTo: formData.assignedTo,
      assignedStudents: formData.assignedTo === 'student' ? formData.assignedStudents : undefined,
      dueDate: formData.dueDate,
      priority: formData.priority
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
      assignedStudents: [],
      dueDate: '',
      priority: 'medium',
      initialComment: ''
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
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
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
    const submission = comments.find(comment => 
      comment.taskId === taskId && 
      comment.studentUsername === studentUsername && 
      comment.isSubmission && 
      comment.grade !== undefined
    );
    return submission?.grade;
  };

  // Get task status for a specific student
  const getTaskStatusForStudent = (task: Task, studentUsername: string) => {
    if (hasStudentSubmitted(task.id, studentUsername)) {
      return 'submitted'; // Student has submitted
    }
    return 'pending'; // Student hasn't submitted yet
  };

  // Get status display text for student
  const getStatusTextForStudent = (task: Task, studentUsername: string) => {
    const status = getTaskStatusForStudent(task, studentUsername);
    switch (status) {
      case 'submitted': return translate('statusSubmitted');
      case 'pending': return translate('statusPending');
      default: return translate('statusPending');
    }
  };

  // Get status color for student
  const getStatusColorForStudent = (task: Task, studentUsername: string) => {
    const status = getTaskStatusForStudent(task, studentUsername);
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
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
      const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
      students = allUsers.filter((u: any) => 
        u.role === 'student' && task.assignedStudents?.includes(u.username)
      );
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
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority === 'high' ? translate('priorityHigh') : 
                                 task.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                              </Badge>
                              <Badge className={user?.role === 'student' ? getStatusColorForStudent(task, user.username) : getStatusColor(task.status)}>
                                {user?.role === 'student' ? getStatusTextForStudent(task, user.username) : (task.status === 'pending' ? translate('statusPending') : translate('statusCompleted'))}
                              </Badge>
                              {user?.role === 'student' && (() => {
                                const grade = getStudentGrade(task.id, user.username);
                                return grade !== undefined ? (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
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
                                setSelectedTask(task);
                                setIsSubmission(false); // Reset checkbox state
                                
                                // Mark all notifications for this task as read when student reviews it
                                if (user?.role === 'student') {
                                  TaskNotificationManager.markTaskNotificationsAsReadOnReview(task.id, user.username);
                                }
                                
                                setShowTaskDialog(true);
                              }}
                              title={translate('viewTask')}
                              className="hover:bg-orange-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title={translate('editTask')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority === 'high' ? translate('priorityHigh') : task.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                          </Badge>
                          <Badge className={user?.role === 'student' ? getStatusColorForStudent(task, user.username) : getStatusColor(task.status)}>
                            {user?.role === 'student' ? getStatusTextForStudent(task, user.username) : (task.status === 'pending' ? translate('statusPending') : translate('statusCompleted'))}
                          </Badge>
                          {user?.role === 'student' && (() => {
                            const grade = getStudentGrade(task.id, user.username);
                            return grade !== undefined ? (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
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
                            setSelectedTask(task);
                            setIsSubmission(false); // Reset checkbox state
                            
                            // Mark all notifications for this task as read when student reviews it
                            if (user?.role === 'student') {
                              TaskNotificationManager.markTaskNotificationsAsReadOnReview(task.id, user.username);
                            }
                            
                            setShowTaskDialog(true);
                          }}
                          className="hover:bg-orange-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {user?.role === 'teacher' && task.assignedBy === user.username && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        <span className="flex items-center">
                          {task.assignedTo === 'course' ? (
                            <>
                              <Users className="w-3 h-3 mr-1" />
                              {task.course}
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 mr-1" />
                              {task.assignedStudents?.length} {translate('studentsCount')}
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center">
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

            {/* Initial Comment Section */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="initialComment" className="text-right pt-2">{translate('initialComment')}</Label>
              <Textarea
                id="initialComment"
                value={formData.initialComment}
                onChange={(e) => setFormData(prev => ({ ...prev, initialComment: e.target.value }))}
                className="col-span-3"
                placeholder={translate('initialCommentPlaceholder')}
                rows={3}
              />
            </div>

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
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {translate('cancel')}
            </Button>
            <Button onClick={handleCreateTask} className="bg-orange-600 hover:bg-orange-700 text-white">
              {translate('createTask')}
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
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>
              {selectedTask?.assignedByName} • {selectedTask?.course} • {selectedTask?.subject}
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

              {/* Students Status - Only visible for teachers */}
              {user?.role === 'teacher' && (
                <>
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-3">{translate('studentsStatus')}</h4>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="py-2 px-3 text-left font-medium">{translate('student')}</th>
                            <th className="py-2 px-3 text-left font-medium">{translate('status')}</th>
                            <th className="py-2 px-3 text-left font-medium">{translate('submissionDate')}</th>
                            <th className="py-2 px-3 text-left font-medium">{translate('grade')}</th>
                            <th className="py-2 px-3 text-left font-medium">{translate('actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-muted">
                          {(() => {
                            const studentsWithStatus = getStudentsWithTaskStatus(selectedTask);
                            
                            if (studentsWithStatus.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="py-4 px-3 text-center text-muted-foreground">
                                    {selectedTask.assignedTo === 'course' 
                                      ? translate('noStudentsInCourse')
                                      : translate('noStudentsAssigned')
                                    }
                                  </td>
                                </tr>
                              );
                            }
                            
                            return studentsWithStatus.map((student) => (
                              <tr key={student.username} className="hover:bg-muted/50">
                                <td className="py-2 px-3">{student.displayName || student.username}</td>
                                <td className="py-2 px-3">
                                  <Badge className={`${student.hasSubmitted ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                                    {student.hasSubmitted 
                                      ? translate('statusSubmitted')
                                      : translate('statusPending')
                                    }
                                  </Badge>
                                </td>
                                <td className="py-2 px-3">
                                  {student.submissionDate 
                                    ? formatDate(student.submissionDate) 
                                    : '-'
                                  }
                                </td>
                                <td className="py-2 px-3">
                                  {student.submission?.grade !== undefined 
                                    ? `${student.submission.grade}%`
                                    : student.hasSubmitted ? translate('notGraded') : '-'
                                  }
                                </td>
                                <td className="py-2 px-3">
                                  {student.hasSubmitted && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleGradeSubmission(student.submission)}
                                      className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                                    >
                                      {student.submission?.grade !== undefined 
                                        ? translate('editGrade')
                                        : translate('gradeSubmission')
                                      }
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
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
                  {getTaskComments(selectedTask.id).map(comment => (
                    <div key={comment.id} className="bg-muted p-3 rounded-lg">
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
                                <span className="font-medium">✓ {translate('graded')}: {comment.grade}/7</span>
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
                                className="ml-2 h-6 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
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
                                className="ml-2 h-6 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
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
                                🔒 {translate('gradedNoDelete')}
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
                  ))}
                  
                  {getTaskComments(selectedTask.id).length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      {translate('noCommentsYet')}
                    </p>
                  )}
                </div>
              </div>
              
              {(user?.role === 'student' || user?.role === 'teacher') && (
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
                        {user?.role === 'student' && (
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
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
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
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
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
            <Button variant="outline" onClick={() => setShowGradingDialog(false)}>
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
