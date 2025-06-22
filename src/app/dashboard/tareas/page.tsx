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
import { ClipboardList, Plus, Calendar, User, Users, MessageSquare, Eye, Send, Edit, Trash2, Paperclip, Download, X, Upload } from 'lucide-react';
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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    course: '',
    assignedTo: 'course' as 'course' | 'student',
    assignedStudents: [] as string[],
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
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
          if (task.status === 'reviewed') {
            stats[course].reviewed++;
          } else {
            stats[course].submitted++;
          }
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
      priority: 'medium'
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
      isSubmission: isSubmission,
      attachments: commentAttachments
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
      priority: task.priority
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
      priority: 'medium'
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
  const hasStudentSubmitted = (taskId: string, studentUsername: string) => {
    return comments.some(comment => 
      comment.taskId === taskId && 
      comment.studentUsername === studentUsername && 
      comment.isSubmission
    );
  };

  // Delete student submission to allow re-submission
  const handleDeleteSubmission = (commentId: string) => {
    const commentToDelete = comments.find(c => c.id === commentId);
    if (!commentToDelete || !selectedTask) return;

    // Show confirmation dialog
    if (!window.confirm(translate('confirmDeleteSubmission'))) {
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

    toast({
      title: translate('submissionDeleted'),
      description: translate('submissionDeletedDesc'),
    });
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
        
        <div className="flex items-center space-x-3">
          {user?.role === 'teacher' && (
            <>
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-3 py-1"
                >
                  {translate('listView')}
                </Button>
                <Button
                  variant={viewMode === 'course' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('course')}
                  className="px-3 py-1"
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

              <Button onClick={() => setShowCreateDialog(true)}>
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
                <Card key={course} className="border-l-4 border-l-indigo-500">
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
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                            {translate('pendingTasks')}: {stats.pending}
                          </Badge>
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            {translate('submittedTasks')}: {stats.submitted}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
                            {translate('reviewedTasks')}: {stats.reviewed}
                          </Badge>
                        </div>
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
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority === 'high' ? translate('priorityHigh') : 
                                 task.priority === 'medium' ? translate('priorityMedium') : translate('priorityLow')}
                              </Badge>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status === 'pending' ? translate('statusPending') : 
                                 task.status === 'submitted' ? translate('statusSubmitted') : translate('statusReviewed')}
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
                          <Badge className={getStatusColor(task.status)}>
                            {task.status === 'pending' ? translate('statusPending') : 
                             task.status === 'submitted' ? translate('statusSubmitted') : translate('statusReviewed')}
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
            <Button onClick={handleCreateTask}>
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
                    {selectedTask.status === 'pending' ? translate('statusPending') : 
                     selectedTask.status === 'submitted' ? translate('statusSubmitted') : translate('statusReviewed')}
                  </Badge>
                </span>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">{translate('commentsAndSubmissions')}</h4>
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
                      )}
                      
                      {/* Show submission notice for students who submitted */}
                      {comment.isSubmission && user?.role === 'student' && comment.studentUsername === user.username && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
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
              
              {user?.role === 'student' && (
                <div className="space-y-3">
                  <Separator />
                  <div>
                    <Label htmlFor="newComment">
                      {isSubmission ? translate('submitTask') : translate('addComment')}
                    </Label>
                    <Textarea
                      id="newComment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={isSubmission ? translate('submissionPlaceholder') : translate('commentPlaceholder')}
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
                      <Button 
                        onClick={handleAddComment} 
                        disabled={!newComment.trim()}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isSubmission ? translate('submit') : translate('comment')}
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
            <Button onClick={handleUpdateTask}>
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
    </div>
  );
}
