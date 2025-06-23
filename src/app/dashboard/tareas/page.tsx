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
import { ClipboardList, Plus, Calendar, User, Users, MessageSquare, Eye, Send, Edit, Trash2, Paperclip, Download, X, Upload, ClipboardCheck, UserCheck } from 'lucide-react';
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
  status: 'pending' | 'completed';  // Global status for teacher view
  priority: 'low' | 'medium' | 'high';
  type: 'tarea' | 'evaluacion'; // Type of task
  topic?: string; // Required for evaluations
  attachments?: TaskFile[]; // Files attached by teacher
}

interface TaskStudentStatus {
  id: string;
  taskId: string;
  studentUsername: string;
  status: 'pending' | 'submitted'; // Individual status per student
  submittedAt?: string;
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
  grade?: TaskGrade; // Grade assigned by teacher (only for submissions)
  isNew?: boolean; // true if this is a new comment that hasn't been seen yet
  readBy?: string[]; // array of usernames who have read this comment
}

interface TaskGrade {
  id: string;
  percentage: number; // 0-100
  feedback?: string; // Optional feedback from teacher
  gradedBy: string; // teacher username
  gradedByName: string; // teacher display name
  gradedAt: string; // timestamp
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
  const [taskStudentStatuses, setTaskStudentStatuses] = useState<TaskStudentStatus[]>([]);
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
  const [readComments, setReadComments] = useState<string[]>([]); // IDs de comentarios que el usuario ha leído
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'course'>('list');
  
  // Grading states
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [submissionToGrade, setSubmissionToGrade] = useState<TaskComment | null>(null);
  const [gradePercentage, setGradePercentage] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    course: '',
    assignedTo: 'course' as 'course' | 'student',
    assignedStudents: [] as string[],
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    type: 'tarea' as 'tarea' | 'evaluacion',
    topic: ''
  });

  // Load tasks and comments
  useEffect(() => {
    loadTasks();
    loadComments();
    loadTaskStudentStatuses();
  }, []);

  // Recalculate task statuses when comments change
  useEffect(() => {
    if (tasks.length > 0 && comments.length >= 0) {
      const updatedTasks = tasks.map(task => {
        const newStatus = calculateTaskStatusWithComments(task, comments);
        if (task.status !== newStatus) {
          return { ...task, status: newStatus };
        }
        return task;
      });

      // Only update if there are actual changes
      const hasChanges = updatedTasks.some((task, index) => task.status !== tasks[index].status);
      if (hasChanges) {
        localStorage.setItem('smart-student-tasks', JSON.stringify(updatedTasks));
        setTasks(updatedTasks);
        
        // Update selectedTask if it's one of the changed tasks
        if (selectedTask) {
          const updatedSelectedTask = updatedTasks.find(t => t.id === selectedTask.id);
          if (updatedSelectedTask && updatedSelectedTask.status !== selectedTask.status) {
            setSelectedTask(updatedSelectedTask);
          }
        }
      }
    }
  }, [comments, tasks, selectedTask]); // React to comments, tasks, and selectedTask changes
  
  // Initialize readComments based on user and comments data
  useEffect(() => {
    if (user && comments.length > 0) {
      // Get all comments that the current user has read
      const alreadyRead = comments
        .filter(comment => comment.readBy?.includes(user.username))
        .map(comment => comment.id);
        
      setReadComments(alreadyRead);
    }
  }, [user, comments.length]);

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

  const loadTaskStudentStatuses = () => {
    const storedStatuses = localStorage.getItem('smart-student-task-statuses');
    if (storedStatuses) {
      setTaskStudentStatuses(JSON.parse(storedStatuses));
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

  const saveTaskStudentStatuses = (newStatuses: TaskStudentStatus[]) => {
    localStorage.setItem('smart-student-task-statuses', JSON.stringify(newStatuses));
    setTaskStudentStatuses(newStatuses);
  };

  // Get individual student status for a task
  const getStudentTaskStatus = (taskId: string, studentUsername: string): 'pending' | 'submitted' => {
    const status = taskStudentStatuses.find(s => 
      s.taskId === taskId && s.studentUsername === studentUsername
    );
    return status?.status || 'pending';
  };

  // Create initial statuses for all assigned students when a task is created
  const createInitialStudentStatuses = (task: Task) => {
    let studentsToAssign: any[] = [];
    
    if (task.assignedTo === 'course') {
      studentsToAssign = getStudentsForCourse(task.course);
    } else if (task.assignedTo === 'student' && task.assignedStudents) {
      const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
      studentsToAssign = allUsers.filter((u: any) => 
        u.role === 'student' && task.assignedStudents?.includes(u.username)
      );
    }

    const newStatuses: TaskStudentStatus[] = studentsToAssign.map(student => ({
      id: `status_${task.id}_${student.username}_${Date.now()}`,
      taskId: task.id,
      studentUsername: student.username,
      status: 'pending'
    }));

    const updatedStatuses = [...taskStudentStatuses, ...newStatuses];
    saveTaskStudentStatuses(updatedStatuses);
  };

  // Update student status when they submit
  const updateStudentTaskStatus = (taskId: string, studentUsername: string, status: 'pending' | 'submitted', submittedAt?: string) => {
    const existingStatusIndex = taskStudentStatuses.findIndex(s => 
      s.taskId === taskId && s.studentUsername === studentUsername
    );

    let updatedStatuses = [...taskStudentStatuses];
    
    if (existingStatusIndex >= 0) {
      // Update existing status
      updatedStatuses[existingStatusIndex] = {
        ...updatedStatuses[existingStatusIndex],
        status,
        submittedAt
      };
    } else {
      // Create new status
      const newStatus: TaskStudentStatus = {
        id: `status_${taskId}_${studentUsername}_${Date.now()}`,
        taskId,
        studentUsername,
        status,
        submittedAt
      };
      updatedStatuses.push(newStatus);
    }

    saveTaskStudentStatuses(updatedStatuses);
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
    if (!course) return [];
    
    const users = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
    
    // First try the standard way - looking for students with this course in activeCourses array
    const standardStudents = users.filter((u: any) => 
      u.role === 'student' && 
      u.activeCourses && 
      u.activeCourses.includes(course)
    );
    
    // If that doesn't work, try a more flexible approach
    if (standardStudents.length === 0) {
      return users.filter((u: any) => 
        u.role === 'student' && (
          // Look for course in any course-related field
          (u.course && u.course === course) ||
          (u.currentCourse && u.currentCourse === course) ||
          (typeof u.courses === 'object' && Object.values(u.courses).includes(course)) ||
          (Array.isArray(u.courses) && u.courses.includes(course))
        )
      );
    }
    
    return standardStudents;
  };

  // Get all students assigned to a task with their submission status
  const getTaskStudentsWithStatus = (task: Task) => {
    let students: any[] = [];
    
    if (task.assignedTo === 'course') {
      // Get all students in the course
      students = getStudentsForCourse(task.course);
      
      // If no students found for course, try again with raw localStorage access
      // This helps ensure we get students even if there's an issue with getStudentsForCourse
      if (students.length === 0) {
        const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
        students = allUsers.filter((u: any) => 
          u.role === 'student' && 
          u.activeCourses && 
          u.activeCourses.includes(task.course)
        );
      }
    } else if (task.assignedTo === 'student' && task.assignedStudents) {
      // Get only specifically assigned students
      const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
      students = allUsers.filter((u: any) => 
        u.role === 'student' && task.assignedStudents?.includes(u.username)
      );
    }
    
    // Add submission status to each student
    return students.map((student: any) => {
      const hasSubmitted = comments.some(comment => 
        comment.taskId === task.id && 
        comment.studentUsername === student.username && 
        comment.isSubmission
      );
      
      return {
        ...student,
        hasSubmitted: hasSubmitted,
        status: hasSubmitted ? 'submissionDone' : 'submissionPending'
      };
    });
  };

  // Filter tasks based on user role
  const getFilteredTasks = () => {
    if (user?.role === 'teacher') {
      // Teachers see tasks they created
      let filtered = tasks.filter(task => task.assignedBy === user.username);
      
      // Apply course filter if selected
      if (selectedCourseFilter !== 'all') {
        filtered = filtered.filter(task => task.course === selectedCourseFilter);
      }
      
      return filtered;
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
        // Check if any student has submitted this task
        const hasSubmissions = comments.some(comment => 
          comment.taskId === task.id && comment.isSubmission
        );
        
        if (hasSubmissions) {
          // For now we only have 'pending' and 'completed' status
          stats[course].submitted++;
        } else {
          stats[course].pending++;
        }
      });
    });
    
    return stats;
  };

  // Handle file upload
  const handleFileUpload = (fileList: FileList | null, isTaskAttachment: boolean) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const newFiles: TaskFile[] = [];

    files.forEach(file => {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: translate('error'),
          description: translate('fileTooLarge', { name: file.name }),
          variant: 'destructive'
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newFile: TaskFile = {
          id: `file_${Date.now()}_${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: e.target?.result as string,
          uploadedBy: user?.username || '',
          uploadedAt: new Date().toISOString()
        };

        if (isTaskAttachment) {
          setTaskAttachments(prev => [...prev, newFile]);
        } else {
          setCommentAttachments(prev => [...prev, newFile]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove file from attachments
  const removeFile = (fileId: string, isTaskAttachment: boolean) => {
    if (isTaskAttachment) {
      setTaskAttachments(prev => prev.filter(f => f.id !== fileId));
    } else {
      setCommentAttachments(prev => prev.filter(f => f.id !== fileId));
    }
  };

  // Download file
  const downloadFile = (file: TaskFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Validate that due date is in the future
  const validateDueDate = (dueDateStr: string): boolean => {
    const dueDate = new Date(dueDateStr);
    const now = new Date();
    return dueDate > now;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format file size in a human-readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    // Additional validation for evaluations
    if (formData.type === 'evaluacion') {
      if (!formData.subject || !formData.topic) {
        toast({
          title: translate('error'),
          description: translate('evaluationRequiresSubjectTopic'),
          variant: 'destructive'
        });
        return;
      }

      // Check if evaluation already exists for this course/subject/topic combination
      const existingEvaluation = tasks.find(task => 
        task.type === 'evaluacion' &&
        task.course === formData.course &&
        task.subject === formData.subject &&
        task.topic === formData.topic
      );

      if (existingEvaluation) {
        toast({
          title: translate('error'),
          description: translate('evaluationAlreadyExists'),
          variant: 'destructive'
        });
        return;
      }

      // Evaluations can only be assigned to entire course
      if (formData.assignedTo !== 'course') {
        toast({
          title: translate('error'),
          description: translate('evaluationMustBeCourse'),
          variant: 'destructive'
        });
        return;
      }
    }
    
    // Validate that the due date is in the future
    if (!validateDueDate(formData.dueDate)) {
      toast({
        title: translate('error'),
        description: translate('dueDateMustBeFuture'),
        variant: 'destructive'
      });
      return;
    }

    // Validate that at least one student is selected if assign to specific students
    if (formData.assignedTo === 'student' && formData.assignedStudents.length === 0) {
      toast({
        title: translate('error'),
        description: translate('selectAtLeastOneStudent'),
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
      type: formData.type,
      topic: formData.type === 'evaluacion' ? formData.topic : undefined,
      attachments: taskAttachments
    };

    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);

    // Create initial student statuses for this task
    createInitialStudentStatuses(newTask);

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
      type: 'tarea',
      topic: ''
    });
    setTaskAttachments([]);
    setShowCreateDialog(false);
  };

  // Check if student has already submitted this task
  const hasStudentSubmitted = (taskId: string, studentUsername: string) => {
    return comments.some(comment => 
      comment.taskId === taskId && 
      comment.studentUsername === studentUsername && 
      comment.isSubmission
    );
  };

  // Grading functions
  const handleGradeSubmission = (submission: TaskComment) => {
    if (user?.role !== 'teacher') return;
    
    setSubmissionToGrade(submission);
    setGradePercentage(submission.grade?.percentage || 0);
    setGradeFeedback(submission.grade?.feedback || '');
    setShowGradeDialog(true);
  };

  const handleSaveGrade = () => {
    if (!submissionToGrade || !user || user.role !== 'teacher') return;

    if (gradePercentage < 0 || gradePercentage > 100) {
      toast({
        title: translate('error'),
        description: translate('gradePercentageInvalid'),
        variant: 'destructive',
      });
      return;
    }

    const grade: TaskGrade = {
      id: `grade_${Date.now()}`,
      percentage: gradePercentage,
      feedback: gradeFeedback.trim(),
      gradedBy: user.username,
      gradedByName: user.displayName,
      gradedAt: new Date().toISOString()
    };

    const updatedComments = comments.map(comment => 
      comment.id === submissionToGrade.id 
        ? { ...comment, grade }
        : comment
    );

    setComments(updatedComments);
    saveComments(updatedComments);

    toast({
      title: translate('gradeAssigned'),
      description: translate('gradeAssignedDesc', { 
        student: submissionToGrade.studentName,
        percentage: gradePercentage.toString()
      }),
    });

    setShowGradeDialog(false);
    setSubmissionToGrade(null);
    setGradePercentage(0);
    setGradeFeedback('');
  };

  const getSubmissionGrade = (taskId: string, studentUsername: string): TaskGrade | undefined => {
    const submission = comments.find(comment => 
      comment.taskId === taskId && 
      comment.studentUsername === studentUsername && 
      comment.isSubmission
    );
    return submission?.grade;
  };

  const getGradeColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
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
      isSubmission: isSubmission,
      attachments: commentAttachments,
      isNew: true,
      readBy: [user?.username || ''] // El creador ya lo ha leído
    };

    const updatedComments = [...comments, comment];
    saveComments(updatedComments);

    // Update task status if this is a submission
    if (isSubmission && user?.role === 'student') {
      // Update individual student status to 'submitted'
      updateStudentTaskStatus(selectedTask.id, user.username, 'submitted', new Date().toISOString());
      
      // Check if all students have now submitted for the global task status
      const task = tasks.find(t => t.id === selectedTask.id);
      if (task) {
        // Include the current submission in our status check
        const tempComments = [...comments, comment];
        
        // Calculate if all students have submitted, including our new comment
        const newStatus = calculateTaskStatusWithComments(task, tempComments);
        
        // Update the task with the new status
        const updatedTask = { ...task, status: newStatus };
        const updatedTasks = tasks.map(t => 
          t.id === selectedTask.id 
            ? updatedTask
            : t
        );
        
        // Save to localStorage
        saveTasks(updatedTasks);
        
        // Update both the tasks state and selectedTask state to reflect changes in the UI immediately
        setTasks(updatedTasks);
        setSelectedTask(updatedTask);
      }
    }

    // Update the comments state to reflect the new comment in the UI
    setComments(updatedComments);

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
      type: task.type || 'tarea', // Default to 'tarea' for backward compatibility
      topic: task.topic || ''
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
    
    // Additional validation for evaluations
    if (formData.type === 'evaluacion') {
      if (!formData.subject || !formData.topic) {
        toast({
          title: translate('error'),
          description: translate('evaluationRequiresSubjectTopic'),
          variant: 'destructive'
        });
        return;
      }

      // Check if evaluation already exists for this course/subject/topic combination
      // But exclude the current task to allow updating other fields
      const existingEvaluation = tasks.find(task => 
        task.id !== selectedTask.id &&
        task.type === 'evaluacion' &&
        task.course === formData.course &&
        task.subject === formData.subject &&
        task.topic === formData.topic
      );

      if (existingEvaluation) {
        toast({
          title: translate('error'),
          description: translate('evaluationAlreadyExists'),
          variant: 'destructive'
        });
        return;
      }

      // Evaluations can only be assigned to entire course
      if (formData.assignedTo !== 'course') {
        toast({
          title: translate('error'),
          description: translate('evaluationMustBeCourse'),
          variant: 'destructive'
        });
        return;
      }
    }
    
    // Validate that the due date is in the future
    if (!validateDueDate(formData.dueDate)) {
      toast({
        title: translate('error'),
        description: translate('dueDateMustBeFuture'),
        variant: 'destructive'
      });
      return;
    }

    // Validate that at least one student is selected if assign to specific students
    if (formData.assignedTo === 'student' && formData.assignedStudents.length === 0) {
      toast({
        title: translate('error'),
        description: translate('selectAtLeastOneStudent'),
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
      type: formData.type,
      topic: formData.type === 'evaluacion' ? formData.topic : undefined
    };

    // Recalculate the task status based on the new assignment settings
    const newStatus = calculateTaskStatusWithComments(updatedTask, comments);
    updatedTask.status = newStatus;

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
      type: 'tarea',
      topic: ''
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

  // Handle deletion of a student submission
  const handleDeleteSubmission = (commentId: string) => {
    const commentToDelete = comments.find(c => c.id === commentId);
    if (!commentToDelete || !selectedTask) return;

    // Show confirmation dialog
    if (!confirm(translate('confirmDeleteSubmission'))) {
      return;
    }

    // Update individual student status back to 'pending' if this was their submission
    if (commentToDelete.isSubmission && user?.role === 'student') {
      updateStudentTaskStatus(selectedTask.id, user.username, 'pending');
    }

    // Remove the submission comment
    const updatedComments = comments.filter(comment => comment.id !== commentId);
    saveComments(updatedComments);

    // Update task status based on remaining submissions
    const task = tasks.find(t => t.id === selectedTask.id);
    if (task) {
      // Calculate status with the updated comments
      const newStatus = calculateTaskStatusWithComments(task, updatedComments);
      
      // Update the task with the new status
      const updatedTask = { ...task, status: newStatus };
      const updatedTasks = tasks.map(t => 
        t.id === selectedTask.id 
          ? updatedTask
          : t
      );
      
      // Save to localStorage
      saveTasks(updatedTasks);
      
      // Update both the tasks state and selectedTask state to reflect changes in the UI immediately
      setTasks(updatedTasks);
      setSelectedTask(updatedTask);
    }

    // Update the comments state to reflect the removal in the UI
    setComments(updatedComments);

    toast({
      title: translate('submissionDeleted'),
      description: translate('submissionDeletedDesc')
    });
  };

  // Mark a comment as read by the current user
  const markCommentAsRead = (commentId: string) => {
    if (!user || readComments.includes(commentId)) return;
    
    // Update local readComments state
    setReadComments(prev => [...prev, commentId]);
    
    // Update the comment in the comments array
    const updatedComments = comments.map(comment => {
      if (comment.id === commentId) {
        // Add current user to readBy if they're not already there
        const readBy = comment.readBy || [];
        if (!readBy.includes(user.username)) {
          return {
            ...comment,
            isNew: false,
            readBy: [...readBy, user.username]
          };
        }
      }
      return comment;
    });
    
    // Save updated comments to localStorage
    saveComments(updatedComments);
    setComments(updatedComments);
  };

  const getTaskComments = (taskId: string) => {
    const taskComments = comments.filter(comment => comment.taskId === taskId);
    
    // For students, show all regular comments but only their own submissions
    if (user?.role === 'student') {
      return taskComments.filter(comment => 
        // Show regular comments from all students
        !comment.isSubmission || 
        // But only show their own submissions
        (comment.isSubmission && comment.studentUsername === user.username)
      );
    }
    
    // For teachers, show all comments
    return taskComments;
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
      case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'; // En Curso
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'; // Finalizada (teacher view)
      case 'submitted': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'; // Entregada (student view)
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Calculate the actual status of a task based on current submissions (for teacher view)
  const calculateTaskStatus = (task: Task): 'pending' | 'completed' => {
    return calculateTaskStatusWithComments(task, comments);
  };
  
  // Calculate task status with a specific set of comments (for teacher view)
  const calculateTaskStatusWithComments = (task: Task, commentsToUse: TaskComment[]): 'pending' | 'completed' => {
    // Get all students who are assigned to this task
    let studentsToCheck: any[] = [];
    if (task.assignedTo === 'course') {
      studentsToCheck = getStudentsForCourse(task.course);
    } else if (task.assignedTo === 'student' && task.assignedStudents) {
      const allUsers = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
      studentsToCheck = allUsers.filter((u: any) => 
        u.role === 'student' && task.assignedStudents?.includes(u.username)
      );
    }
    
    // If no students are assigned, task remains pending
    if (studentsToCheck.length === 0) {
      return 'pending';
    }
    
    // Check if ALL assigned students have submitted
    const allSubmitted = studentsToCheck.every(student => 
      commentsToUse.some(c => 
        c.taskId === task.id && 
        c.studentUsername === student.username && 
        c.isSubmission
      )
    );
    
    return allSubmitted ? 'completed' : 'pending';
  };

  // Calculate individual student status for a task (for student view)
  const calculateStudentTaskStatus = (task: Task, studentUsername: string): 'pending' | 'submitted' => {
    // Check if this specific student has submitted
    const hasSubmitted = comments.some(c => 
      c.taskId === task.id && 
      c.studentUsername === studentUsername && 
      c.isSubmission
    );
    
    return hasSubmitted ? 'submitted' : 'pending';
  };

  // Get the status display for UI based on user role
  const getTaskStatusForDisplay = (task: Task): 'pending' | 'completed' | 'submitted' => {
    if (user?.role === 'teacher') {
      // Teachers see global status: "En Curso" or "Finalizada"
      return calculateTaskStatus(task);
    } else if (user?.role === 'student') {
      // Students see their individual status: "En Curso" or "Entregada"
      const studentStatus = calculateStudentTaskStatus(task, user.username);
      return studentStatus === 'submitted' ? 'submitted' : 'pending';
    }
    return 'pending';
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <ClipboardCheck className="w-8 h-8 mr-3 text-orange-600" />
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
                  className={`px-3 py-1 ${viewMode === 'list' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'hover:bg-orange-100 hover:text-orange-800'}`}
                >
                  {translate('listView')}
                </Button>
                <Button
                  variant={viewMode === 'course' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('course')}
                  className={`px-3 py-1 ${viewMode === 'course' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'hover:bg-orange-100 hover:text-orange-800'}`}
                >
                  {translate('courseView')}
                </Button>
              </div>

              {/* Course Filter */}
              <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={translate('filterByCourse')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{translate('allCourses')}</SelectItem>
                  {getAvailableCourses().map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
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
                <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {translate('tasksEmptyTeacher')}
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(getTasksByCourse()).map(([course, courseTasks]) => {
              return (
                <Card key={course} className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-xl flex items-center">
                          <Users className="w-5 h-5 mr-2" />
                          {course}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {courseTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-medium">{task.title}</h4>
                              
                              {/* Assignment Type Indicator */}
                              {task.assignedTo === 'course' ? (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800">
                                  <Users className="w-3 h-3 mr-1" />
                                  {translate('course')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800">
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  {task.assignedStudents?.length || 0} {(task.assignedStudents?.length || 0) === 1 ? translate('student') : translate('students')}
                                </Badge>
                              )}
                              
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority === 'high' ? translate('priorityHigh') : 
                                 task.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                              </Badge>
                              <Badge className={getStatusColor(getTaskStatusForDisplay(task))}>
                                {getTaskStatusForDisplay(task) === 'pending' ? translate('statusInProgress') : 
                                 getTaskStatusForDisplay(task) === 'submitted' ? translate('statusSubmitted') :
                                 translate('statusFinished')}
                              </Badge>
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
                                setShowTaskDialog(true);
                              }}
                              title={translate('viewTask')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              className="text-blue-600 hover:text-blue-700"
                              title={translate('editTask')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                              className="text-red-600 hover:text-red-700"
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
                  <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
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
                          
                          {/* Assignment Type Indicator */}
                          {task.assignedTo === 'course' ? (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800">
                              <Users className="w-3 h-3 mr-1" />
                              {translate('course')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800">
                              <UserCheck className="w-3 h-3 mr-1" />
                              {task.assignedStudents?.length || 0} {(task.assignedStudents?.length || 0) === 1 ? translate('student') : translate('students')}
                            </Badge>
                          )}
                          
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority === 'high' ? translate('priorityHigh') : task.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                          </Badge>
                          <Badge className={getStatusColor(getTaskStatusForDisplay(task))}>
                            {getTaskStatusForDisplay(task) === 'pending' ? translate('statusInProgress') : 
                             getTaskStatusForDisplay(task) === 'submitted' ? translate('statusSubmitted') :
                             translate('statusFinished')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
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
                        {user?.role === 'teacher' && task.assignedBy === user.username && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task)}
                              className="text-red-600 hover:text-red-700"
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
            
            {/* Estudiantes disponibles - mostrados solo cuando se selecciona asignar a estudiantes específicos */}
            {formData.assignedTo === 'student' && formData.course && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">{translate('selectStudents')} *</Label>
                <div className="col-span-3 border rounded-md p-3 max-h-[200px] overflow-y-auto">
                  {getStudentsForCourse(formData.course).length > 0 ? (
                    getStudentsForCourse(formData.course).map((student: any) => (
                      <div key={student.username} className="flex items-center space-x-2 mb-2">
                        <Checkbox 
                          id={`student-${student.username}`} 
                          checked={formData.assignedStudents.includes(student.username)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              assignedStudents: checked 
                                ? [...prev.assignedStudents, student.username]
                                : prev.assignedStudents.filter(s => s !== student.username)
                            }));
                          }} 
                        />
                        <Label 
                          htmlFor={`student-${student.username}`}
                          className="text-sm cursor-pointer"
                        >
                          {student.displayName} ({student.username})
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{translate('noStudentsInCourse')}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">{translate('dueDate')} *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
                title={translate('dueDateMustBeFuture')}
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
                    className="w-full"
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
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(file)}
                          className="flex-shrink-0"
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
                  <Badge className={`ml-1 ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status === 'pending' ? translate('statusInProgress') : 
                     translate('statusFinished')}
                  </Badge>
                </span>
              </div>

              {/* Lista de estudiantes y su estado - solo visible para profesores */}
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
                            const students = getTaskStudentsWithStatus(selectedTask);
                            
                            // If no students found, show a message
                            if (students.length === 0) {
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
                            
                            // Show all students with their status
                            return students.map((student) => {
                              // Buscar la entrega del estudiante si existe
                              const submission = comments.find(comment => 
                                comment.taskId === selectedTask.id && 
                                comment.studentUsername === student.username && 
                                comment.isSubmission
                              );
                              
                              const grade = submission?.grade;
                              
                              return (
                                <tr key={student.username} className="hover:bg-muted/50">
                                  <td className="py-2 px-3">{student.displayName || student.username}</td>
                                  <td className="py-2 px-3">
                                    <Badge className={`${student.hasSubmitted ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                      {student.hasSubmitted 
                                        ? translate('submissionDone')
                                        : translate('submissionPending')
                                      }
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-3">
                                    {submission 
                                      ? formatDate(submission.timestamp) 
                                      : '-'
                                    }
                                  </td>
                                  <td className="py-2 px-3">
                                    {grade ? (
                                      <div className="flex items-center space-x-2">
                                        <span className={`font-semibold ${getGradeColor(grade.percentage)}`}>
                                          {grade.percentage}%
                                        </span>
                                        {grade.feedback && (
                                          <span className="text-xs text-muted-foreground" title={grade.feedback}>
                                            💬
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      student.hasSubmitted ? (
                                        <span className="text-muted-foreground text-xs">{translate('notGraded')}</span>
                                      ) : '-'
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {submission ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleGradeSubmission(submission)}
                                        className="text-xs"
                                      >
                                        {grade ? translate('editGrade') : translate('gradeSubmission')}
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
              
              <Separator />
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">{translate('commentsAndSubmissions')}</h4>
                  {user?.role === 'student' && (
                    <span className="text-xs text-muted-foreground">
                      {translate('commentsVisibleToAll')}
                    </span>
                  )}
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {getTaskComments(selectedTask.id).map(comment => (
                    <div 
                      key={comment.id} 
                      className={`${
                        comment.isNew && (!comment.readBy?.includes(user?.username || ''))
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                          : 'bg-muted'
                      } p-3 rounded-lg transition-all`}
                      onMouseEnter={() => markCommentAsRead(comment.id)}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span className="font-medium text-sm">{comment.studentName}</span>
                          {comment.isNew && (!comment.readBy?.includes(user?.username || '')) && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 ml-2 text-xs px-2 py-0">
                              {translate('new')}
                            </Badge>
                          )}
                        </div>
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
                        /* Mostrar archivos de comentarios normales O si es profesor O si es el estudiante dueño del comentario */
                        (!comment.isSubmission || user?.role === 'teacher' || comment.studentUsername === user?.username) && (
                          <div className="mt-2 space-y-1">
                            {comment.attachments.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-2 bg-background rounded text-xs">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate" title={file.name}>{file.name}</span>
                                  <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadFile(file)}
                                  className="flex-shrink-0 h-6 w-6 p-0"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                      
                      {/* Show submission notice for students who submitted */}
                      {comment.isSubmission && user?.role === 'student' && comment.studentUsername === user.username && (
                        <div className="mt-2 space-y-2">
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">✓ {translate('finalSubmissionMade')}</span>
                                <br />
                                <span>{translate('cannotModifySubmission')}</span>
                              </div>
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
                            </div>
                          </div>
                          
                          {/* Show grade if the submission has been graded and it's the student's own submission */}
                          {comment.grade && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  📊 {translate('gradeReceived')}
                                </span>
                                <span className={`text-lg font-bold ${getGradeColor(comment.grade.percentage)}`}>
                                  {comment.grade.percentage}%
                                </span>
                              </div>
                              {comment.grade.feedback && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                    {translate('teacherFeedback')}:
                                  </p>
                                  <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                                    {comment.grade.feedback}
                                  </p>
                                </div>
                              )}
                              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                {translate('gradedBy')} {comment.grade.gradedByName} • {formatDate(comment.grade.gradedAt)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Show grade if the submission has been graded and user is teacher */}
                      {comment.isSubmission && comment.grade && user?.role === 'teacher' && (
                        <div className="mt-2 space-y-2">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                📊 {translate('gradeAssigned')}
                              </span>
                              <span className={`text-lg font-bold ${getGradeColor(comment.grade.percentage)}`}>
                                {comment.grade.percentage}%
                              </span>
                            </div>
                            {comment.grade.feedback && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                  {translate('teacherFeedback')}:
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                                  {comment.grade.feedback}
                                </p>
                              </div>
                            )}
                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                              {translate('gradedBy')} {comment.grade.gradedByName} • {formatDate(comment.grade.gradedAt)}
                            </div>
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
              
              {/* Formulario para añadir comentarios - disponible para profesores y estudiantes */}
              <div className="space-y-3">
                <Separator />
                <div>
                  <Label htmlFor="newComment">
                    {user?.role === 'student' 
                      ? (isSubmission ? translate('submitTask') : translate('addComment'))
                      : translate('addComment')}
                  </Label>
                  <Textarea
                    id="newComment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={user?.role === 'student'
                      ? (isSubmission ? translate('submissionPlaceholder') : translate('commentPlaceholder'))
                      : translate('teacherCommentPlaceholder')}
                    className="mt-1"
                  />
                  
                  {/* File Upload for Comments */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center space-x-2">
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
                        className="w-full"
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
                    {user?.role === 'student' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isSubmission"
                          checked={isSubmission}
                          onCheckedChange={(checked) => setIsSubmission(!!checked)}
                          disabled={hasStudentSubmitted(selectedTask.id, user.username)}
                        />
                        <Label htmlFor="isSubmission" className="text-sm cursor-pointer">
                          {translate('markAsSubmission')}
                        </Label>
                      </div>
                    )}
                    <Button 
                      onClick={handleAddComment} 
                      disabled={!newComment.trim()}
                      className="bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-400"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {user?.role === 'student' ? 
                        (isSubmission ? translate('submit') : translate('comment')) : 
                        translate('sendComment')}
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
            
            {/* Estudiantes disponibles - mostrados solo cuando se selecciona asignar a estudiantes específicos */}
            {formData.assignedTo === 'student' && formData.course && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">{translate('selectStudents')} *</Label>
                <div className="col-span-3 border rounded-md p-3 max-h-[200px] overflow-y-auto">
                  {getStudentsForCourse(formData.course).length > 0 ? (
                    getStudentsForCourse(formData.course).map((student: any) => (
                      <div key={student.username} className="flex items-center space-x-2 mb-2">
                        <Checkbox 
                          id={`student-${student.username}`} 
                          checked={formData.assignedStudents.includes(student.username)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              assignedStudents: checked 
                                ? [...prev.assignedStudents, student.username]
                                : prev.assignedStudents.filter(s => s !== student.username)
                            }));
                          }} 
                        />
                        <Label 
                          htmlFor={`student-${student.username}`}
                          className="text-sm cursor-pointer"
                        >
                          {student.displayName} ({student.username})
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{translate('noStudentsInCourse')}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">{translate('dueDate')} *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
                title={translate('dueDateMustBeFuture')}
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

      {/* Grade Submission Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{translate('gradeSubmission')}</DialogTitle>
            <DialogDescription>
              {submissionToGrade && (
                translate('gradeSubmissionDesc', { student: submissionToGrade.studentName })
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gradePercentage">{translate('gradePercentage')} (0-100%)</Label>
              <Input
                id="gradePercentage"
                type="number"
                min="0"
                max="100"
                value={gradePercentage}
                onChange={(e) => setGradePercentage(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gradeFeedback">{translate('gradeFeedback')} ({translate('optional')})</Label>
              <Textarea
                id="gradeFeedback"
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder={translate('gradeFeedbackPlaceholder')}
                rows={3}
              />
            </div>

            {submissionToGrade && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">{translate('studentSubmission')}</h4>
                <div className="bg-muted p-3 rounded-lg max-h-32 overflow-y-auto">
                  <p className="text-sm">{submissionToGrade.comment}</p>
                  {submissionToGrade.attachments && submissionToGrade.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {submissionToGrade.attachments.map((file) => (
                        <div key={file.id} className="flex items-center space-x-2 text-xs">
                          <Paperclip className="w-3 h-3" />
                          <span>{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGradeDialog(false)}>
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
