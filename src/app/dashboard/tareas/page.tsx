"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, Plus, Calendar, User, Users, MessageSquare, Eye, Send, Edit2, Reply, Trash2, Check, X, Paperclip, Upload, Download, FileText, Image, File, UserCheck, UserX, BarChart3, CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  status: 'pending' | 'submitted' | 'reviewed';
  priority: 'low' | 'medium' | 'high';
  attachments?: TaskAttachment[]; // files attached by teacher when creating task
  taskType?: 'standard' | 'evaluation'; // new: type of task
  evaluationConfig?: EvaluationConfig; // new: config for automatic evaluation
}

interface EvaluationConfig {
  questions: EvaluationQuestion[];
  passingScore: number; // percentage needed to pass
  timeLimit?: number; // minutes
  allowRetries: boolean;
  showCorrectAnswers: boolean;
}

interface EvaluationQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[]; // for multiple choice
  correctAnswer: string | number | boolean; // answer or index
  points: number;
}

interface StudentTaskStatus {
  studentUsername: string;
  studentName: string;
  status: 'not-started' | 'in-progress' | 'submitted' | 'graded';
  submissionDate?: string;
  score?: number;
  lastActivity?: string;
}

interface TaskComment {
  id: string;
  taskId: string;
  username: string; // can be student or teacher
  userDisplayName: string;
  userRole: 'student' | 'teacher' | 'admin';
  comment: string;
  timestamp: string;
  isSubmission: boolean; // true if this is the student's submission
  replyToId?: string; // ID of comment this is replying to
  editedAt?: string; // timestamp of last edit
  attachments?: TaskAttachment[]; // file attachments
}

interface TaskAttachment {
  id: string;
  name: string;
  type: string; // file type (pdf, doc, image, etc.)
  size: number; // file size in bytes
  url: string; // file URL or base64 data
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmission, setIsSubmission] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showStudentTrackingDialog, setShowStudentTrackingDialog] = useState(false);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [selectedTaskForTracking, setSelectedTaskForTracking] = useState<Task | null>(null);
  const [evaluationAnswers, setEvaluationAnswers] = useState<Record<string, string | number | boolean>>({});
  const [evaluationResult, setEvaluationResult] = useState<{score: number, passed: boolean, answers: any} | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'tracking'>('list');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    course: '',
    assignedTo: 'course' as 'course' | 'student',
    assignedStudents: [] as string[],
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    attachments: [] as TaskAttachment[],
    taskType: 'standard' as 'standard' | 'evaluation',
    evaluationConfig: {
      questions: [],
      passingScore: 70,
      timeLimit: 60,
      allowRetries: true,
      showCorrectAnswers: true
    } as EvaluationConfig
  });

  // Load tasks and comments
  useEffect(() => {
    loadTasks();
    loadComments();
  }, []);

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

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToAttachment = async (file: File): Promise<TaskAttachment> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string,
          uploadedBy: user?.username || '',
          uploadedAt: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const processSelectedFiles = async (): Promise<TaskAttachment[]> => {
    if (selectedFiles.length === 0) return [];
    
    setUploadingFiles(true);
    try {
      const attachments = await Promise.all(
        selectedFiles.map(file => convertFileToAttachment(file))
      );
      return attachments;
    } finally {
      setUploadingFiles(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = (attachment: TaskAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Filter tasks based on user role
  const getFilteredTasks = () => {
    if (user?.role === 'teacher') {
      // Teachers see tasks they created
      return tasks.filter(task => task.assignedBy === user.username);
    } else if (user?.role === 'student') {
      // Students see tasks assigned to them or their course
      return tasks.filter(task => {
        if (task.assignedTo === 'course') {
          return user.activeCourses?.includes(task.course);
        } else {
          return task.assignedStudents?.includes(user.username);
        }
      });
    }
    return [];
  };

  const handleCreateTask = async () => {
    if (!formData.title || !formData.description || !formData.course || !formData.dueDate) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios.",
        variant: 'destructive'
      });
      return;
    }

    // Validar que si se asigna a estudiantes específicos, haya al menos uno seleccionado
    if (formData.assignedTo === 'student' && formData.assignedStudents.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un estudiante para asignar la tarea.",
        variant: 'destructive'
      });
      return;
    }

    // Process selected files
    const attachments = await processSelectedFiles();

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
      attachments: attachments.length > 0 ? attachments : undefined,
      taskType: formData.taskType,
      evaluationConfig: formData.taskType === 'evaluation' ? formData.evaluationConfig : undefined
    };

    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);

    // Determinar cuántos estudiantes se asignaron
    const assignedCount = formData.assignedTo === 'course' 
      ? getStudentsForCourse(formData.course).length 
      : formData.assignedStudents.length;

    toast({
      title: "Tarea creada",
      description: `Tarea "${formData.title}" asignada a ${assignedCount} estudiante(s)${attachments.length > 0 ? ` con ${attachments.length} archivo(s) adjunto(s)` : ''}.`,
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
      attachments: [],
      taskType: 'standard',
      evaluationConfig: {
        questions: [],
        passingScore: 70,
        timeLimit: 60,
        allowRetries: true,
        showCorrectAnswers: true
      }
    });
    setSelectedFiles([]);
    setShowCreateDialog(false);
  };

  const handleEditTask = async () => {
    if (!selectedTask) return;

    if (!formData.title || !formData.description || !formData.course || !formData.dueDate) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios.",
        variant: 'destructive'
      });
      return;
    }

    // Validar que si se asigna a estudiantes específicos, haya al menos uno seleccionado
    if (formData.assignedTo === 'student' && formData.assignedStudents.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un estudiante para asignar la tarea.",
        variant: 'destructive'
      });
      return;
    }

    // Validar evaluaciones
    if (formData.taskType === 'evaluation' && formData.evaluationConfig.questions.length === 0) {
      toast({
        title: "Error",
        description: "Las evaluaciones deben tener al menos una pregunta.",
        variant: 'destructive'
      });
      return;
    }

    // Process selected files
    const attachments = await processSelectedFiles();

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
      attachments: [...(selectedTask.attachments || []), ...attachments],
      taskType: formData.taskType,
      evaluationConfig: formData.taskType === 'evaluation' ? formData.evaluationConfig : undefined
    };

    const updatedTasks = tasks.map(task => 
      task.id === selectedTask.id ? updatedTask : task
    );
    saveTasks(updatedTasks);

    toast({
      title: "Tarea actualizada",
      description: `La tarea "${formData.title}" ha sido actualizada exitosamente.`,
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
      attachments: [],
      taskType: 'standard',
      evaluationConfig: {
        questions: [],
        passingScore: 70,
        timeLimit: 60,
        allowRetries: true,
        showCorrectAnswers: true
      }
    });
    setSelectedFiles([]);
    setSelectedTask(null);
    setShowEditDialog(false);
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    const confirmDelete = window.confirm(
      translate('tasksDeleteConfirmTitle', { title: taskToDelete.title }) + '\n\n' + translate('tasksDeleteConfirmMessage')
    );

    if (confirmDelete) {
      // Eliminar la tarea
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      saveTasks(updatedTasks);

      // Eliminar comentarios asociados
      const updatedComments = comments.filter(comment => comment.taskId !== taskId);
      saveComments(updatedComments);

      toast({
        title: translate('tasksDeleteSuccess'),
        description: translate('tasksDeleteSuccessMessage', { title: taskToDelete.title }),
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;

    // Process selected files for attachment
    const attachments = await processSelectedFiles();

    const comment: TaskComment = {
      id: `comment_${Date.now()}`,
      taskId: selectedTask.id,
      username: user?.username || '',
      userDisplayName: user?.displayName || '',
      userRole: user?.role || 'student',
      comment: newComment,
      timestamp: new Date().toISOString(),
      isSubmission: isSubmission,
      replyToId: replyingToId || undefined,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    const updatedComments = [...comments, comment];
    saveComments(updatedComments);

    // Update task status if this is a submission
    if (isSubmission) {
      const updatedTasks = tasks.map(task => 
        task.id === selectedTask.id 
          ? { ...task, status: 'submitted' as const }
          : task
      );
      saveTasks(updatedTasks);
    }

    setNewComment('');
    setIsSubmission(false);
    setReplyingToId(null);
    setSelectedFiles([]);

    toast({
      title: isSubmission ? "Tarea enviada" : replyingToId ? "Respuesta agregada" : "Comentario agregado",
      description: isSubmission ? "Tu tarea ha sido enviada al profesor." : 
                   replyingToId ? "Tu respuesta ha sido agregada." : "Comentario agregado exitosamente.",
    });
  };

  const handleEditComment = (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setEditingCommentId(commentId);
      setEditingCommentText(comment.comment);
    }
  };

  const handleSaveEditComment = () => {
    if (!editingCommentText.trim() || !editingCommentId) return;

    const updatedComments = comments.map(comment => 
      comment.id === editingCommentId 
        ? { ...comment, comment: editingCommentText, editedAt: new Date().toISOString() }
        : comment
    );
    saveComments(updatedComments);

    setEditingCommentId(null);
    setEditingCommentText('');

    toast({
      title: "Comentario actualizado",
      description: "Tu comentario ha sido actualizado exitosamente.",
    });
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    const updatedComments = comments.filter(comment => comment.id !== commentId);
    saveComments(updatedComments);

    toast({
      title: "Comentario eliminado",
      description: "El comentario ha sido eliminado.",
    });
  };

  const handleReplyToComment = (commentId: string) => {
    setReplyingToId(commentId);
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setNewComment(`@${comment.userDisplayName || 'Usuario'} `);
    }
  };

  const canEditComment = (comment: TaskComment) => {
    if (comment.username !== user?.username) return false;
    const commentTime = new Date(comment.timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - commentTime.getTime()) / (1000 * 60);
    return diffMinutes <= 5; // Allow editing for 5 minutes
  };

  const canDeleteComment = (comment: TaskComment) => {
    return comment.username === user?.username || user?.role === 'teacher';
  };

  const getTaskComments = (taskId: string) => {
    return comments
      .filter(comment => comment.taskId === taskId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getCommentReplies = (commentId: string, taskId: string) => {
    return comments.filter(comment => 
      comment.taskId === taskId && comment.replyToId === commentId
    );
  };

  const getMainComments = (taskId: string) => {
    return comments.filter(comment => 
      comment.taskId === taskId && !comment.replyToId
    );
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
      case 'submitted': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'reviewed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
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

  // Get students status for a specific task
  const getStudentTaskStatuses = (task: Task): StudentTaskStatus[] => {
    const courseStudents = getStudentsForCourse(task.course);
    const taskComments = getTaskComments(task.id);
    
    return courseStudents.map((student: any) => {
      const studentComments = taskComments.filter((c: TaskComment) => c.username === student.username);
      const submissionComment = studentComments.find((c: TaskComment) => c.isSubmission);
      const lastComment = studentComments.sort((a: TaskComment, b: TaskComment) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      
      let status: 'not-started' | 'in-progress' | 'submitted' | 'graded' = 'not-started';
      
      if (submissionComment) {
        status = 'submitted';
        // Check if teacher has commented after submission
        const teacherResponseAfterSubmission = taskComments.find((c: TaskComment) => 
          c.userRole === 'teacher' && 
          new Date(c.timestamp) > new Date(submissionComment.timestamp)
        );
        if (teacherResponseAfterSubmission) {
          status = 'graded';
        }
      } else if (studentComments.length > 0) {
        status = 'in-progress';
      }
      
      return {
        studentUsername: student.username,
        studentName: student.displayName || student.username,
        status,
        submissionDate: submissionComment?.timestamp,
        lastActivity: lastComment?.timestamp
      };
    });
  };

  // Handle evaluation submission
  const handleEvaluationSubmission = (task: Task) => {
    if (!task.evaluationConfig) return;
    
    let totalScore = 0;
    let maxScore = 0;
    const detailedAnswers: any[] = [];
    
    task.evaluationConfig.questions.forEach((question: EvaluationQuestion) => {
      maxScore += question.points;
      const userAnswer = evaluationAnswers[question.id];
      let isCorrect = false;
      
      if (question.type === 'multiple-choice') {
        isCorrect = userAnswer === question.correctAnswer;
      } else if (question.type === 'true-false') {
        isCorrect = userAnswer === question.correctAnswer;
      } else if (question.type === 'short-answer') {
        // Simple string comparison (could be improved with fuzzy matching)
        isCorrect = String(userAnswer).toLowerCase().trim() === 
                   String(question.correctAnswer).toLowerCase().trim();
      }
      
      if (isCorrect) {
        totalScore += question.points;
      }
      
      detailedAnswers.push({
        questionId: question.id,
        question: question.question,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        points: isCorrect ? question.points : 0
      });
    });
    
    const percentage = Math.round((totalScore / maxScore) * 100);
    const passed = percentage >= task.evaluationConfig.passingScore;
    
    const result = {
      score: percentage,
      passed,
      answers: detailedAnswers
    };
    
    setEvaluationResult(result);
    
    // Save evaluation result as a comment
    const evaluationComment: TaskComment = {
      id: `comment_${Date.now()}`,
      taskId: task.id,
      username: user?.username || '',
      userDisplayName: user?.displayName || user?.username || '',
      userRole: user?.role || 'student',
      comment: `Evaluación completada: ${percentage}% (${passed ? 'APROBADO' : 'REPROBADO'})`,
      timestamp: new Date().toISOString(),
      isSubmission: true,
      attachments: [{
        id: `eval_${Date.now()}`,
        name: 'Resultado de Evaluación',
        type: 'application/json',
        size: JSON.stringify(result).length,
        url: `data:application/json;base64,${btoa(JSON.stringify(result))}`,
        uploadedBy: user?.username || '',
        uploadedAt: new Date().toISOString()
      }]
    };
    
    const updatedComments = [...comments, evaluationComment];
    saveComments(updatedComments);
    
    toast({
      title: passed ? "¡Evaluación Aprobada!" : "Evaluación Reprobada",
      description: `Puntuación: ${percentage}% (${totalScore}/${maxScore} puntos)`,
      variant: passed ? 'default' : 'destructive'
    });
  };

  // Add evaluation question
  const addEvaluationQuestion = () => {
    const newQuestion: EvaluationQuestion = {
      id: `q_${Date.now()}`,
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1
    };
    
    setFormData(prev => ({
      ...prev,
      evaluationConfig: {
        ...prev.evaluationConfig,
        questions: [...prev.evaluationConfig.questions, newQuestion]
      }
    }));
  };

  // Update evaluation question
  const updateEvaluationQuestion = (questionId: string, updates: Partial<EvaluationQuestion>) => {
    setFormData(prev => ({
      ...prev,
      evaluationConfig: {
        ...prev.evaluationConfig,
        questions: prev.evaluationConfig.questions.map((q: EvaluationQuestion) => 
          q.id === questionId ? { ...q, ...updates } : q
        )
      }
    }));
  };

  // Remove evaluation question
  const removeEvaluationQuestion = (questionId: string) => {
    setFormData(prev => ({
      ...prev,
      evaluationConfig: {
        ...prev.evaluationConfig,
        questions: prev.evaluationConfig.questions.filter((q: EvaluationQuestion) => q.id !== questionId)
      }
    }));
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <ClipboardList className="w-8 h-8 mr-3 text-indigo-600" />
            {translate('tasksPageTitle')}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'teacher' 
              ? translate('tasksPageSubTeacher')
              : translate('tasksPageSubStudent')
            }
          </p>
        </div>
        
        {user?.role === 'teacher' && (
          <div className="flex space-x-2">
            <Button 
              variant={currentView === 'list' ? 'default' : 'outline'}
              onClick={() => setCurrentView('list')}
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              {translate('tasksListView')}
            </Button>
            <Button 
              variant={currentView === 'tracking' ? 'default' : 'outline'}
              onClick={() => setCurrentView('tracking')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {translate('tasksTrackingView')}
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {translate('tasksNewTask')}
            </Button>
          </div>
        )}
      </div>

      {/* Vista de Lista de Tareas */}
      {currentView === 'list' && (
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
                    <CardTitle className="text-lg">{task.title}</CardTitle>                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline">{task.subject}</Badge>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority === 'high' ? translate('tasksPriorityHigh') : 
                       task.priority === 'medium' ? translate('tasksPriorityMedium') : 
                       translate('tasksPriorityLow')}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status === 'pending' ? translate('tasksStatusPending') : 
                       task.status === 'submitted' ? translate('tasksStatusSubmitted') : 
                       translate('tasksStatusReviewed')}
                    </Badge>
                    {task.taskType === 'evaluation' && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <Award className="w-3 h-3 mr-1" />
                        {translate('tasksTypeEvaluationBadge')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {task.taskType === 'evaluation' && user?.role === 'student' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedTask(task);
                        setShowEvaluationDialog(true);
                        setEvaluationAnswers({});
                        setEvaluationResult(null);
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      {translate('tasksPerformEvaluation')}
                    </Button>
                  )}
                  
                  {/* Botones para profesores */}
                  {user?.role === 'teacher' && task.assignedBy === user.username && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowEditDialog(true);
                          // Pre-cargar datos de la tarea en el formulario
                          setFormData({
                            title: task.title,
                            description: task.description,
                            subject: task.subject,
                            course: task.course,
                            assignedTo: task.assignedTo,
                            assignedStudents: task.assignedStudents || [],
                            dueDate: task.dueDate,
                            priority: task.priority,
                            attachments: task.attachments || [],
                            taskType: task.taskType || 'standard',
                            evaluationConfig: task.evaluationConfig || {
                              questions: [],
                              passingScore: 70,
                              timeLimit: 60,
                              allowRetries: true,
                              showCorrectAnswers: true
                            }
                          });
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        {translate('tasksEditButton')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {translate('tasksDeleteButton')}
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
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
                      {translate('tasksDueDate')} {formatDate(task.dueDate)}
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
                          {task.assignedStudents?.length} {translate('userManagementStudentsCount')}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {getTaskComments(task.id).length} {getTaskComments(task.id).length === 1 ? translate('tasksCommentsSingular') : translate('tasksComments')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        </div>
      )}

      {/* Vista de Seguimiento de Entregas */}
      {currentView === 'tracking' && user?.role === 'teacher' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                {translate('tasksTrackingTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {translate('tasksTrackingEmpty')}
                  </p>
                ) : (
                  filteredTasks.map(task => {
                    const studentStatuses = getStudentTaskStatuses(task);
                    const submittedCount = studentStatuses.filter(s => s.status === 'submitted' || s.status === 'graded').length;
                    const totalStudents = studentStatuses.length;
                    const completionRate = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;
                    
                    return (
                      <Card key={task.id} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{task.title}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {task.course} • {translate('tasksDueDate')} {formatDate(task.dueDate)}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {completionRate}%
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {submittedCount}/{totalStudents} {translate('tasksDeliveredCount')}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>{translate('tasksDeliveryProgress')}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTaskForTracking(task);
                                  setShowStudentTrackingDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalles
                              </Button>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${completionRate}%` }}
                              ></div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1 text-gray-500" />
                                {studentStatuses.filter(s => s.status === 'not-started').length} Sin empezar
                              </div>
                              <div className="flex items-center">
                                <User className="w-3 h-3 mr-1 text-blue-500" />
                                {studentStatuses.filter(s => s.status === 'in-progress').length} {translate('tasksTrackingInProgress')}
                              </div>
                              <div className="flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                                {studentStatuses.filter(s => s.status === 'submitted').length} {translate('tasksTrackingSubmitted')}
                              </div>
                              <div className="flex items-center">
                                <Award className="w-3 h-3 mr-1 text-purple-500" />
                                {studentStatuses.filter(s => s.status === 'graded').length} Calificadas
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog de Detalles de Seguimiento */}
      <Dialog open={showStudentTrackingDialog} onOpenChange={setShowStudentTrackingDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              {translate('tasksTrackingDetailTitle')} {selectedTaskForTracking?.title}
            </DialogTitle>
            <DialogDescription>
              {translate('tasksTrackingDetailSub')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTaskForTracking && (
            <div className="space-y-4">
              <div className="grid gap-2">
                {getStudentTaskStatuses(selectedTaskForTracking).map(student => (
                  <div key={student.studentUsername} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {student.status === 'not-started' && <Clock className="w-5 h-5 text-gray-500" />}
                        {student.status === 'in-progress' && <User className="w-5 h-5 text-blue-500" />}
                        {student.status === 'submitted' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {student.status === 'graded' && <Award className="w-5 h-5 text-purple-500" />}
                      </div>
                      <div>
                        <p className="font-medium">{student.studentName}</p>
                        <p className="text-sm text-muted-foreground">@{student.studentUsername}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        student.status === 'not-started' ? 'secondary' :
                        student.status === 'in-progress' ? 'default' :
                        student.status === 'submitted' ? 'default' : 'default'
                      }>
                        {student.status === 'not-started' && translate('tasksTrackingNotStarted')}
                        {student.status === 'in-progress' && translate('tasksTrackingInProgress')}
                        {student.status === 'submitted' && translate('tasksTrackingSubmitted')}
                        {student.status === 'graded' && translate('tasksTrackingGraded')}
                      </Badge>
                      {student.submissionDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(student.submissionDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{translate('tasksCreateTitle')}</DialogTitle>
            <DialogDescription>
              {translate('tasksCreateDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">{translate('tasksTitle')} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="col-span-3"
                placeholder={translate('tasksTitle')}
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">{translate('tasksDescription')} *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder={translate('tasksDescription')}
                rows={4}
              />
            </div>
            
            {/* Primero el curso */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="course" className="text-right">{translate('tasksCourse')} *</Label>
              <Select 
                value={formData.course} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  course: value,
                  // Reset student selection when course changes
                  assignedStudents: []
                }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={translate('tasksCourse')} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCourses().map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Luego la asignatura */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">{translate('tasksSubject')}</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={translate('tasksSubject')} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubjects().map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Tarea */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskType" className="text-right">{translate('tasksTaskType')}</Label>
              <Select 
                value={formData.taskType} 
                onValueChange={(value: 'standard' | 'evaluation') => setFormData(prev => ({ 
                  ...prev, 
                  taskType: value 
                }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={translate('tasksTaskType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{translate('tasksTypeStandard')}</SelectItem>
                  <SelectItem value="evaluation">{translate('tasksTypeEvaluation')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{translate('tasksAssignTo')}</Label>
              <Select 
                value={formData.assignedTo} 
                onValueChange={(value: 'course' | 'student') => setFormData(prev => ({ 
                  ...prev, 
                  assignedTo: value,
                  // Reset student selection when assignment type changes
                  assignedStudents: []
                }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">{translate('tasksAssignToCourse')}</SelectItem>
                  <SelectItem value="student">{translate('tasksAssignToStudents')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Mostrar selector de estudiantes específicos cuando se selecciona esa opción */}
            {formData.assignedTo === 'student' && formData.course && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">{translate('tasksSelectStudents')} *</Label>
                <div className="col-span-3 space-y-2">
                  <div className="text-sm text-muted-foreground mb-2">
                    {translate('tasksSelectStudents')} {formData.course}:
                  </div>
                  <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                    {getStudentsForCourse(formData.course).map((student: any) => (
                      <div key={student.username} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          id={`student-${student.username}`}
                          checked={formData.assignedStudents.includes(student.username)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                assignedStudents: [...prev.assignedStudents, student.username]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                assignedStudents: prev.assignedStudents.filter(s => s !== student.username)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <label 
                          htmlFor={`student-${student.username}`}
                          className="text-sm cursor-pointer"
                        >
                          {student.displayName}
                        </label>
                      </div>
                    ))}
                    {getStudentsForCourse(formData.course).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No hay estudiantes en este curso
                      </div>
                    )}
                  </div>
                  {formData.assignedStudents.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {formData.assignedStudents.length} estudiante(s) seleccionado(s)
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">{translate('tasksDueLimit')} *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{translate('tasksPriority')}</Label>
              <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{translate('tasksPriorityLow')}</SelectItem>
                  <SelectItem value="medium">{translate('tasksPriorityMedium')}</SelectItem>
                  <SelectItem value="high">{translate('tasksPriorityHigh')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Configuración de Evaluación Automática */}
            {formData.taskType === 'evaluation' && (
              <div className="space-y-4 border rounded-lg p-4 bg-blue-50/50">
                <h3 className="font-semibold text-blue-900 flex items-center">
                  <Award className="w-4 h-4 mr-2" />
                  Configuración de Evaluación
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="passingScore">Puntaje mínimo (%)</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.evaluationConfig.passingScore}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        evaluationConfig: {
                          ...prev.evaluationConfig,
                          passingScore: parseInt(e.target.value) || 70
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeLimit">Tiempo límite (min)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="5"
                      max="180"
                      value={formData.evaluationConfig.timeLimit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        evaluationConfig: {
                          ...prev.evaluationConfig,
                          timeLimit: parseInt(e.target.value) || 60
                        }
                      }))}
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowRetries"
                      checked={formData.evaluationConfig.allowRetries}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        evaluationConfig: {
                          ...prev.evaluationConfig,
                          allowRetries: e.target.checked
                        }
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="allowRetries" className="text-sm">
                      Permitir reintentos
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showCorrectAnswers"
                      checked={formData.evaluationConfig.showCorrectAnswers}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        evaluationConfig: {
                          ...prev.evaluationConfig,
                          showCorrectAnswers: e.target.checked
                        }
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="showCorrectAnswers" className="text-sm">
                      Mostrar respuestas correctas
                    </Label>
                  </div>
                </div>

                {/* Preguntas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Preguntas de la Evaluación</Label>
                    <Button type="button" onClick={addEvaluationQuestion} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Pregunta
                    </Button>
                  </div>
                  
                  {formData.evaluationConfig.questions.map((question: EvaluationQuestion, index: number) => (
                    <div key={question.id} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="font-medium">Pregunta {index + 1}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeEvaluationQuestion(question.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <Input
                          placeholder="Escribe la pregunta..."
                          value={question.question}
                          onChange={(e) => updateEvaluationQuestion(question.id, { question: e.target.value })}
                        />
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={question.type}
                            onValueChange={(value: 'multiple-choice' | 'true-false' | 'short-answer') => 
                              updateEvaluationQuestion(question.id, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple-choice">Opción múltiple</SelectItem>
                              <SelectItem value="true-false">Verdadero/Falso</SelectItem>
                              <SelectItem value="short-answer">Respuesta corta</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Puntos"
                            min="1"
                            max="10"
                            value={question.points}
                            onChange={(e) => updateEvaluationQuestion(question.id, { points: parseInt(e.target.value) || 1 })}
                          />
                        </div>

                        {question.type === 'multiple-choice' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Opciones (marca la correcta):</Label>
                            {question.options?.map((option: string, optionIndex: number) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctAnswer === optionIndex}
                                  onChange={() => updateEvaluationQuestion(question.id, { correctAnswer: optionIndex })}
                                />
                                <Input
                                  placeholder={`Opción ${optionIndex + 1}`}
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...(question.options || [])];
                                    newOptions[optionIndex] = e.target.value;
                                    updateEvaluationQuestion(question.id, { options: newOptions });
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === 'true-false' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Respuesta correcta:</Label>
                            <Select
                              value={String(question.correctAnswer)}
                              onValueChange={(value) => updateEvaluationQuestion(question.id, { correctAnswer: value === 'true' })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Verdadero</SelectItem>
                                <SelectItem value="false">Falso</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {question.type === 'short-answer' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Respuesta correcta:</Label>
                            <Input
                              placeholder="Respuesta esperada"
                              value={String(question.correctAnswer)}
                              onChange={(e) => updateEvaluationQuestion(question.id, { correctAnswer: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {formData.evaluationConfig.questions.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No hay preguntas agregadas. Haz clic en "Agregar Pregunta" para comenzar.
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Sección de archivos adjuntos */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">{translate('tasksAttachedFilesLabel')}</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    id="taskFileUpload"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                  />                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('taskFileUpload')?.click()}
                      disabled={uploadingFiles}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      {translate('tasksAttachFiles')}
                    </Button>
                    {selectedFiles.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedFiles.length} {translate('tasksFilesSelected')}
                      </span>
                    )}
                </div>
                
                {/* Preview de archivos seleccionados */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(file.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSelectedFile(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  {translate('tasksFileFormats')}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTask}>
              {translate('tasksCreateTask')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{translate('tasksEditDialogTitle')}</DialogTitle>
            <DialogDescription>
              Modifica la información de la tarea seleccionada.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">Título *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="col-span-3"
                placeholder="Título de la tarea"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-description" className="text-right pt-2">Descripción *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="Describe la tarea detalladamente..."
                rows={4}
              />
            </div>
            
            {/* Primero el curso */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-course" className="text-right">Curso *</Label>
              <Select 
                value={formData.course} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  course: value,
                  // Reset student selection when course changes
                  assignedStudents: []
                }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un curso" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCourses().map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Luego la asignatura */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-subject" className="text-right">Asignatura</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona una asignatura" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubjects().map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Tarea */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-taskType" className="text-right">Tipo de Tarea</Label>
              <Select 
                value={formData.taskType} 
                onValueChange={(value: 'standard' | 'evaluation') => setFormData(prev => ({ 
                  ...prev, 
                  taskType: value 
                }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona el tipo de tarea" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Tarea Estándar</SelectItem>
                  <SelectItem value="evaluation">Evaluación Automática</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Asignar a</Label>
              <Select 
                value={formData.assignedTo} 
                onValueChange={(value: 'course' | 'student') => setFormData(prev => ({ 
                  ...prev, 
                  assignedTo: value,
                  // Reset student selection when assignment type changes
                  assignedStudents: []
                }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Todo el curso</SelectItem>
                  <SelectItem value="student">Estudiantes específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Selector de estudiantes específicos */}
            {formData.assignedTo === 'student' && formData.course && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Estudiantes</Label>
                <div className="col-span-3 space-y-2">
                  <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
                    {getStudentsForCourse(formData.course).map((student: any) => (
                      <div key={student.username} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          id={`edit-student-${student.username}`}
                          checked={formData.assignedStudents.includes(student.username)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                assignedStudents: [...prev.assignedStudents, student.username]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                assignedStudents: prev.assignedStudents.filter(s => s !== student.username)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <label 
                          htmlFor={`edit-student-${student.username}`}
                          className="text-sm cursor-pointer"
                        >
                          {student.displayName}
                        </label>
                      </div>
                    ))}
                    {getStudentsForCourse(formData.course).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No hay estudiantes en este curso
                      </div>
                    )}
                  </div>
                  {formData.assignedStudents.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {formData.assignedStudents.length} estudiante(s) seleccionado(s)
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-dueDate" className="text-right">Fecha límite *</Label>
              <Input
                id="edit-dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Prioridad</Label>
              <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Configuración de Evaluación Automática */}
            {formData.taskType === 'evaluation' && (
              <div className="space-y-4 border rounded-lg p-4 bg-blue-50/50">
                <h3 className="font-semibold text-blue-900 flex items-center">
                  <Award className="w-4 h-4 mr-2" />
                  Configuración de Evaluación
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-passingScore">Puntaje mínimo (%)</Label>
                    <Input
                      id="edit-passingScore"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.evaluationConfig.passingScore}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        evaluationConfig: {
                          ...prev.evaluationConfig,
                          passingScore: parseInt(e.target.value) || 70
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-timeLimit">Tiempo límite (min)</Label>
                    <Input
                      id="edit-timeLimit"
                      type="number"
                      min="5"
                      max="180"
                      value={formData.evaluationConfig.timeLimit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        evaluationConfig: {
                          ...prev.evaluationConfig,
                          timeLimit: parseInt(e.target.value) || 60
                        }
                      }))}
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-allowRetries"
                      checked={formData.evaluationConfig.allowRetries}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        evaluationConfig: {
                          ...prev.evaluationConfig,
                          allowRetries: e.target.checked
                        }
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="edit-allowRetries" className="text-sm">
                      Permitir reintentos
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-showCorrectAnswers"
                      checked={formData.evaluationConfig.showCorrectAnswers}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        evaluationConfig: {
                          ...prev.evaluationConfig,
                          showCorrectAnswers: e.target.checked
                        }
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="edit-showCorrectAnswers" className="text-sm">
                      Mostrar respuestas correctas
                    </Label>
                  </div>
                </div>

                {/* Preguntas de evaluación - versión simplificada para edición */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Preguntas de la Evaluación</Label>
                    <Button type="button" onClick={addEvaluationQuestion} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Pregunta
                    </Button>
                  </div>
                  
                  {formData.evaluationConfig.questions.length > 0 ? (
                    <div className="text-sm text-muted-foreground">
                      {formData.evaluationConfig.questions.length} pregunta(s) configurada(s).
                      <br />
                      <em>{translate('tasksEditNote')}</em>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No hay preguntas agregadas.
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Sección de archivos adjuntos existentes */}
            {selectedTask?.attachments && selectedTask.attachments.length > 0 && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Archivos actuales</Label>
                <div className="col-span-3 space-y-2">
                  {selectedTask.attachments.map((attachment, index) => (
                    <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(attachment.type)}
                        <div>
                          <div className="text-sm font-medium">{attachment.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadFile(attachment)}
                        className="h-6 w-6 p-0"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Agregar nuevos archivos */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Agregar archivos</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    id="editTaskFileUpload"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('editTaskFileUpload')?.click()}
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Seleccionar archivos
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Formatos soportados: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, ZIP, RAR
                </div>
                {selectedFiles.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-green-600">
                      {selectedFiles.length} nuevo(s) archivo(s) seleccionado(s):
                    </div>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded bg-green-50">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(file.type)}
                          <div>
                            <div className="text-sm font-medium">{file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSelectedFile(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
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
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setSelectedTask(null);
              setSelectedFiles([]);
            }}>
              {translate('tasksCancel')}
            </Button>
            <Button onClick={handleEditTask}>
              {translate('tasksSaveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-purple-600" />
              Evaluación: {selectedTask?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedTask?.evaluationConfig && (
                <div className="flex items-center space-x-4 text-sm">
                  <span>⏱️ {selectedTask.evaluationConfig.timeLimit} minutos</span>
                  <span>📊 Puntaje mínimo: {selectedTask.evaluationConfig.passingScore}%</span>
                  <span>🔄 {selectedTask.evaluationConfig.allowRetries ? 'Reintentos permitidos' : 'Un solo intento'}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask?.evaluationConfig && !evaluationResult && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">{translate('tasksEvaluationInstructions')}</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• {translate('tasksEvaluationInstruction1')}</li>
                  <li>• {translate('tasksEvaluationInstruction2', { score: selectedTask.evaluationConfig.passingScore.toString() })}</li>
                  {selectedTask.evaluationConfig.allowRetries ? 
                    <li>• {translate('tasksEvaluationInstruction3')}</li> :
                    <li>• {translate('tasksEvaluationInstruction4')}</li>
                  }
                </ul>
              </div>

              {selectedTask.evaluationConfig.questions.map((question: EvaluationQuestion, index: number) => (
                <div key={question.id} className="border rounded-lg p-4 bg-white">
                  <div className="mb-3">
                    <h4 className="font-medium text-lg">
                      Pregunta {index + 1} ({question.points} {question.points === 1 ? 'punto' : 'puntos'})
                    </h4>
                    <p className="text-gray-700 mt-2">{question.question}</p>
                  </div>
                  
                  {question.type === 'multiple-choice' && (
                    <div className="space-y-2">
                      {question.options?.map((option: string, optionIndex: number) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={optionIndex}
                            checked={evaluationAnswers[question.id] === optionIndex}
                            onChange={(e) => setEvaluationAnswers(prev => ({
                              ...prev,
                              [question.id]: parseInt(e.target.value)
                            }))}
                            className="rounded"
                          />
                          <label className="cursor-pointer">{option}</label>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === 'true-false' && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value="true"
                          checked={evaluationAnswers[question.id] === true}
                          onChange={() => setEvaluationAnswers(prev => ({
                            ...prev,
                            [question.id]: true
                          }))}
                          className="rounded"
                        />
                        <label className="cursor-pointer">Verdadero</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value="false"
                          checked={evaluationAnswers[question.id] === false}
                          onChange={() => setEvaluationAnswers(prev => ({
                            ...prev,
                            [question.id]: false
                          }))}
                          className="rounded"
                        />
                        <label className="cursor-pointer">Falso</label>
                      </div>
                    </div>
                  )}

                  {question.type === 'short-answer' && (
                    <Input
                      placeholder="Escribe tu respuesta..."
                      value={String(evaluationAnswers[question.id] || '')}
                      onChange={(e) => setEvaluationAnswers(prev => ({
                        ...prev,
                        [question.id]: e.target.value
                      }))}
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {Object.keys(evaluationAnswers).length} de {selectedTask.evaluationConfig.questions.length} preguntas respondidas
                </div>
                <Button
                  onClick={() => handleEvaluationSubmission(selectedTask)}
                  disabled={Object.keys(evaluationAnswers).length !== selectedTask.evaluationConfig.questions.length}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Evaluación
                </Button>
              </div>
            </div>
          )}

          {evaluationResult && (
            <div className="space-y-6">
              <div className={`border rounded-lg p-6 ${evaluationResult.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${evaluationResult.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                    {evaluationResult.passed ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600" />
                    )}
                  </div>
                  <h3 className={`text-2xl font-bold ${evaluationResult.passed ? 'text-green-900' : 'text-red-900'}`}>
                    {evaluationResult.passed ? '¡APROBADO!' : 'REPROBADO'}
                  </h3>
                  <p className={`text-lg ${evaluationResult.passed ? 'text-green-700' : 'text-red-700'}`}>
                    Puntuación: {evaluationResult.score}%
                  </p>
                </div>
              </div>

              {selectedTask?.evaluationConfig?.showCorrectAnswers && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Revisión de Respuestas</h4>
                  {evaluationResult.answers.map((answer: any, index: number) => (
                    <div key={answer.questionId} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium">Pregunta {index + 1}</h5>
                        <Badge variant={answer.isCorrect ? 'default' : 'destructive'}>
                          {answer.isCorrect ? 'Correcta' : 'Incorrecta'} ({answer.points} pts)
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-3">{answer.question}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="font-medium text-blue-600">Tu respuesta:</Label>
                          <p className={answer.isCorrect ? 'text-green-600' : 'text-red-600'}>
                            {String(answer.userAnswer)}
                          </p>
                        </div>
                        <div>
                          <Label className="font-medium text-green-600">Respuesta correcta:</Label>
                          <p className="text-green-600">{String(answer.correctAnswer)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {selectedTask?.evaluationConfig?.allowRetries && !evaluationResult.passed && (
                  <Button
                    onClick={() => {
                      setEvaluationResult(null);
                      setEvaluationAnswers({});
                    }}
                    variant="outline"
                  >
                    Intentar de Nuevo
                  </Button>
                )}
                <Button onClick={() => setShowEvaluationDialog(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
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
                <h4 className="font-medium mb-2">{translate('tasksDescription')}</h4>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                
                {/* Mostrar archivos adjuntos de la tarea si los hay */}
                {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h5 className="font-medium text-sm">{translate('tasksTeacherFiles')}</h5>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedTask.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center space-x-2">
                            {getFileIcon(attachment.type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{attachment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.size)} • Subido por {attachment.uploadedBy}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile(attachment)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4 text-sm">
                <span>
                  <strong>{translate('tasksDueLimit')}</strong> {formatDate(selectedTask.dueDate)}
                </span>
                <span>
                  <strong>{translate('tasksStatus')}</strong> 
                  <Badge className={`ml-1 ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status === 'pending' ? translate('tasksStatusPending') : 
                     selectedTask.status === 'submitted' ? translate('tasksStatusSubmitted') : 
                     translate('tasksStatusReviewed')}
                  </Badge>
                </span>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">{translate('tasksCommentAndDeliveries')}</h4>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {getMainComments(selectedTask.id).map(comment => (
                    <div key={comment.id} className="space-y-2">
                      {/* Main Comment */}
                      <div className={`p-4 rounded-lg border-l-4 ${
                        comment.isSubmission 
                          ? 'bg-green-50 border-l-green-500 dark:bg-green-900/10' 
                          : 'bg-muted border-l-blue-500'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              comment.userRole === 'teacher' 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                                : 'bg-gradient-to-r from-blue-500 to-purple-600'
                            }`}>
                              {(comment.userDisplayName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-sm">
                                {comment.userDisplayName || 'Usuario'}
                                {comment.userRole === 'teacher' && (
                                  <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                                    {translate('tasksTeacherLabel')}
                                  </span>
                                )}
                              </span>
                              {comment.editedAt && (
                                <span className="text-xs text-muted-foreground ml-2">{translate('tasksCommentEdited')}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {comment.isSubmission && (
                              <Badge variant="secondary" className="text-xs">
                                {translate('tasksDeliveryBadge')}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.timestamp)}
                            </span>
                            <div className="flex space-x-1">
                              {canEditComment(comment) && editingCommentId !== comment.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditComment(comment.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                              {(user?.role === 'student' || user?.role === 'teacher') && comment.username !== user.username && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReplyToComment(comment.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Reply className="w-3 h-3" />
                                </Button>
                              )}
                              {canDeleteComment(comment) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="text-sm"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={handleSaveEditComment} disabled={!editingCommentText.trim()}>
                                <Check className="w-3 h-3 mr-1" />
                                {translate('tasksCommentSave')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                <X className="w-3 h-3 mr-1" />
                                {translate('tasksCommentCancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm">{comment.comment}</p>
                            
                            {/* Show attachments if any */}
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">{translate('tasksAttachedFiles')}</div>
                                <div className="grid grid-cols-1 gap-2">
                                  {comment.attachments.map((attachment) => (
                                    <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                                      <div className="flex items-center space-x-2">
                                        {getFileIcon(attachment.type)}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatFileSize(attachment.size)}
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => downloadFile(attachment)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Replies */}
                      {getCommentReplies(comment.id, selectedTask.id).map(reply => (
                        <div key={reply.id} className="ml-8 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border-l-2 border-l-gray-300">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                                reply.userRole === 'teacher' 
                                  ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                                  : 'bg-gradient-to-r from-gray-400 to-gray-600'
                              }`}>
                                {(reply.userDisplayName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-medium text-sm">
                                  {reply.userDisplayName || 'Usuario'}
                                  {reply.userRole === 'teacher' && (
                                    <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                                      {translate('tasksTeacherLabel')}
                                    </span>
                                  )}
                                </span>
                                {reply.editedAt && (
                                  <span className="text-xs text-muted-foreground ml-2">{translate('tasksCommentEdited')}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(reply.timestamp)}
                              </span>
                              {canDeleteComment(reply) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{reply.comment}</p>
                          
                          {/* Show attachments In replies if any */}
                          {reply.attachments && reply.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <div className="text-xs text-muted-foreground">{translate('tasksAttachedFiles')}</div>
                              <div className="grid grid-cols-1 gap-1">
                                {reply.attachments.map((attachment) => (
                                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded border">
                                    <div className="flex items-center space-x-2">
                                      {getFileIcon(attachment.type)}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{attachment.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {formatFileSize(attachment.size)}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => downloadFile(attachment)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {getMainComments(selectedTask.id).length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {translate('tasksCommentNoComments')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {(user?.role === 'student' || user?.role === 'teacher') && (
                <div className="space-y-3">
                  <Separator />
                  
                  {replyingToId && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Reply className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            {translate('tasksCommentReplyTo')} {comments.find(c => c.id === replyingToId)?.userDisplayName || 'Usuario'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingToId(null);
                            setNewComment('');
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="newComment">
                      {replyingToId ? translate('tasksCommentAddReply') : 
                       isSubmission ? translate('tasksSubmitTask') : translate('tasksAddComment')}
                    </Label>
                    <Textarea
                      id="newComment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        replyingToId ? translate('tasksReplyPlaceholder') :
                        isSubmission ? translate('tasksDeliveryPlaceholder') : translate('tasksCommentPlaceholder')
                      }
                      className="mt-1"
                      rows={3}
                    />
                    
                    {/* File upload section */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          id="fileUpload"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('fileUpload')?.click()}
                          disabled={uploadingFiles}
                        >
                          <Paperclip className="w-4 h-4 mr-2" />
                          {translate('tasksAttachFiles')}
                        </Button>
                        {selectedFiles.length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {selectedFiles.length} {translate('tasksFilesSelected')}
                          </span>
                        )}
                      </div>
                      
                      {/* Selected files preview */}
                      {selectedFiles.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <div className="flex items-center space-x-2">
                                {getFileIcon(file.type)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSelectedFile(index)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center space-x-4">
                        {!replyingToId && user?.role === 'student' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="isSubmission"
                              checked={isSubmission}
                              onChange={(e) => setIsSubmission(e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor="isSubmission" className="text-sm">
                              {translate('tasksMarkAsFinalDelivery')}
                            </Label>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {newComment.length}/500 {translate('tasksCommentCharacterLimit')}
                        </div>
                      </div>
                      <Button 
                        onClick={handleAddComment} 
                        disabled={(!newComment.trim() && selectedFiles.length === 0) || newComment.length > 500 || uploadingFiles}
                        size="sm"
                      >
                        {uploadingFiles ? (
                          <>
                            <Upload className="w-4 h-4 mr-2 animate-spin" />
                            {translate('tasksUploading')}
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            {replyingToId ? translate('tasksCommentReply') : 
                             isSubmission ? translate('tasksSubmitTask') : translate('tasksAddComment')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
