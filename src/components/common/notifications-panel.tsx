"use client";

import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Clock, Key, ClipboardCheck, ClipboardList } from 'lucide-react';
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
  grade?: {
    id: string;
    percentage: number;
    feedback?: string;
    gradedBy: string;
    gradedByName: string;
    gradedAt: string;
  };
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

  // Use the count provided by the parent component instead of calculating our own
  useEffect(() => {
    setCount(propCount);
  }, [propCount]);

  useEffect(() => {
    // Load data based on user role
    if (user) {
      console.log(`[NotificationsPanel] Loading data for user: ${user.username}, role: ${user.role}`);
      
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
    
    // Listener for storage events to update in real-time
    const handleStorageChange = (e: StorageEvent) => {
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
          // and if it hasn't been submitted yet
          const isAssigned = (
            task.course && user?.activeCourses?.includes(task.course)
          );
          
          const dueDate = new Date(task.dueDate);
          const isApproaching = dueDate > now; // Only include not overdue tasks
          
          // Check if the student has already submitted this task
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
      // Cargar comentarios (que incluyen entregas) y tareas
      const storedComments = localStorage.getItem('smart-student-task-comments');
      const storedTasks = localStorage.getItem('smart-student-tasks');
      
      if (storedComments && storedTasks && user?.role === 'teacher') {
        const comments: TaskComment[] = JSON.parse(storedComments);
        const tasks: Task[] = JSON.parse(storedTasks);
        
        // Filtrar tareas asignadas por este profesor
        const teacherTasks = tasks.filter(task => task.assignedBy === user.username);
        setClassTasks(teacherTasks);
        
        // Obtener IDs de tareas de este profesor
        const teacherTaskIds = teacherTasks.map(task => task.id);
        
        // Filtrar entregas de los estudiantes para las tareas de este profesor
        // que no hayan sido revisadas (no tienen calificación) y que no sean propias
        const submissions = comments
          .filter(comment => 
            comment.isSubmission && 
            teacherTaskIds.includes(comment.taskId) &&
            comment.studentUsername !== user.username && // Excluir entregas propias del profesor
            !comment.grade // Solo entregas sin calificar
          )
          .map(submission => {
            // Encontrar la tarea asociada para mostrar más información
            const task = tasks.find(t => t.id === submission.taskId);
            return { ...submission, task };
          });
        
        setStudentSubmissions(submissions);

        // Cargar comentarios de estudiantes (NO entregas) para tareas de este profesor
        // que no hayan sido leídos por el profesor
        const studentComments = comments
          .filter(comment => 
            !comment.isSubmission && // Solo comentarios, no entregas
            teacherTaskIds.includes(comment.taskId) &&
            comment.studentUsername !== user.username && // ✅ NUEVO: Excluir comentarios propios del profesor
            (!comment.readBy?.includes(user.username)) // No leídos por el profesor
          )
          .map(comment => {
            // Encontrar la tarea asociada para mostrar más información
            const task = tasks.find(t => t.id === comment.taskId);
            return { ...comment, task };
          });
        
        setUnreadStudentComments(studentComments);
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
      const pending = notifications.filter(n => n.type === 'pending_grading');
      setPendingGrading(pending);
    } catch (error) {
      setPendingGrading([]);
    }
  };

  const loadTaskNotifications = () => {
    if (!user) return;
    
    try {
      const notifications = TaskNotificationManager.getUnreadNotificationsForUser(
        user.username, 
        user.role as 'student' | 'teacher'
      );
      
      setTaskNotifications(notifications);
      console.log(`[NotificationsPanel] Loaded ${notifications.length} task notifications for ${user.username}`);
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
              notification.type !== 'new_task' // Don't mark new_task notifications as read here
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
          // Update internal state - only clear comments and notifications, NOT pending tasks
          setUnreadComments([]);
          setTaskNotifications([]);
          // Note: We don't clear pendingTasks as these should remain until completed/submitted
          
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
              // Only mark comment-related notifications as read, NOT pending tasks/grading
              (notification.type === 'teacher_comment' || notification.type === 'task_submission')
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
          
          // Filter taskNotifications to keep only pending grading and new task notifications
          const filteredTaskNotifications = taskNotifications.filter(notification => 
            notification.type === 'pending_grading' || 
            notification.type === 'new_task' ||
            notification.readBy.includes(user.username) // Keep notifications that are now marked as read
          );
          setTaskNotifications(filteredTaskNotifications);
          
          // Note: studentSubmissions are NOT cleared here because they represent
          // actual student work that needs to be reviewed and graded by the teacher
          
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
              className="absolute -top-1 -right-1 bg-red-500 text-white hover:bg-red-600 text-xs px-2 rounded-full"
              title={translate('unreadNotificationsCount', { count: String(count) })}
            >
              {count > 99 ? '99+' : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0 max-h-[80vh]" align="end">
        <Card className="border-0 h-full flex flex-col">
          <CardHeader className="pb-2 pt-4 px-4 flex-shrink-0">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span>{translate('notifications')}</span>
              {((user?.role === 'student' && (unreadComments.length > 0 || taskNotifications.length > 0)) ||
                (user?.role === 'teacher' && (studentSubmissions.length > 0 || unreadStudentComments.length > 0 || pendingGrading.length > 0))) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleReadAll}
                  className="text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                >
                  {translate('markAllAsRead')}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          
          <ScrollArea className="flex-1 min-h-0 scrollbar-custom" style={{ maxHeight: 'calc(80vh - 80px)' }}>
            <div className="p-1">
            <CardContent className="p-0">
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
              
              {/* Student: Unread Comments */}
              {user?.role === 'student' && (
                <div>
                  {unreadComments.length === 0 && pendingTasks.length === 0 && taskNotifications.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground">
                      {translate('noNotifications')}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {/* Pending tasks section - MOVED TO FIRST POSITION */}
                      {pendingTasks.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-muted/30">
                            <h3 className="text-sm font-medium text-foreground">
                              {translate('upcomingTasks')} ({pendingTasks.length})
                            </h3>
                          </div>
                          
                          {pendingTasks.slice(0, 3).map(task => (
                            <div key={task.id} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-orange-100 p-2 rounded-full">
                                  <Clock className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {task.title}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {task.subject}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {translate('duePrefix')} {formatDate(task.dueDate)}
                                  </p>
                                  <Link 
                                    href={`/dashboard/tareas?taskId=${task.id}`}
                                    className="inline-block mt-2 text-xs text-primary hover:underline"
                                  >
                                    {translate('viewTask')}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {pendingTasks.length > 3 && (
                            <div className="px-4 py-3 text-center">
                              <Link 
                                href="/dashboard/tareas" 
                                className="text-xs text-primary hover:underline"
                              >
                                {translate('viewAllTasks', { count: String(pendingTasks.length) })}
                              </Link>
                            </div>
                          )}
                        </>
                      )}

                      {/* Unread comments section - MOVED TO SECOND POSITION */}
                      {unreadComments.length > 0 && (
                        <div className="px-4 py-2 bg-muted/30">
                          <h3 className="text-sm font-medium text-foreground">
                            {translate('unreadComments')} ({unreadComments.length})
                          </h3>
                        </div>
                      )}
                      
                      {unreadComments.map(comment => (
                        <div key={comment.id} className="p-4 hover:bg-muted/50">
                          <div className="flex items-start gap-2">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">
                                  {comment.studentName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(comment.timestamp)}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {comment.comment}
                              </p>
                              <p className="text-xs font-medium mt-1">
                                {comment.task?.title}
                              </p>
                              <Link 
                                href={`/dashboard/tareas?taskId=${comment.taskId}&commentId=${comment.id}`} 
                                className="inline-block mt-1 text-xs text-primary hover:underline"
                              >
                                {translate('viewComment')}
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Task notifications section (including grades) - Only show when no pending tasks */}
                      {taskNotifications.length > 0 && pendingTasks.length === 0 && (
                        <>
                          <div className="px-4 py-2 bg-muted/30">
                            <h3 className="text-sm font-medium text-foreground">
                              {translate('notifications')}
                            </h3>
                          </div>
                          
                          {taskNotifications.map(notification => (
                            <div key={notification.id} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className={`p-2 rounded-full ${
                                  notification.type === 'grade_received' 
                                    ? 'bg-green-100' 
                                    : notification.type === 'teacher_comment'
                                    ? 'bg-blue-100'
                                    : 'bg-orange-100'
                                }`}>
                                  {notification.type === 'grade_received' ? (
                                    <ClipboardCheck className="h-4 w-4 text-green-600" />
                                  ) : notification.type === 'teacher_comment' ? (
                                    <MessageSquare className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <ClipboardCheck className="h-4 w-4 text-orange-600" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notification.type === 'grade_received'
                                        ? translate('reviewGrade')
                                        : notification.type === 'teacher_comment'
                                        ? translate('newTeacherComment')
                                        : notification.type === 'new_task'
                                        ? translate('newTaskNotification')
                                        : translate('newComment')
                                      }
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(notification.timestamp)}
                                    </p>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.type === 'grade_received' && notification.grade
                                      ? translate('gradeReceivedDesc', { 
                                          grade: notification.grade.toString(), 
                                          taskTitle: notification.taskTitle 
                                        })
                                      : notification.type === 'teacher_comment'
                                      ? `${translate('commentOnTask')}: ${notification.taskTitle}`
                                      : notification.type === 'new_task'
                                      ? translate('newTaskNotificationDesc', { 
                                          teacherName: notification.teacherName || 'Profesor',
                                          title: notification.taskTitle 
                                        })
                                      : `${translate('newTaskAssigned')}: ${notification.taskTitle}`
                                    }
                                  </p>
                                  <p className="text-xs font-medium mt-1">
                                    {notification.course} • {notification.subject}
                                  </p>
                                  <Link 
                                    href={`/dashboard/tareas?taskId=${notification.taskId}`}
                                    className="inline-block mt-2 text-xs text-primary hover:underline"
                                  >
                                    {translate('viewTask')}
                                  </Link>
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
                  {(studentSubmissions.length === 0 && pendingGrading.length === 0 && unreadStudentComments.length === 0) ? (
                    <div className="py-6 text-center text-muted-foreground">
                      {translate('noSubmissionsToReview')}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {/* Sección de evaluaciones pendientes de calificar - SIEMPRE ARRIBA */}
                      {pendingGrading.filter(notif => notif.taskType === 'evaluation').length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-purple-50 border-l-4 border-purple-400">
                            <h3 className="text-sm font-medium text-foreground">
                              {translate('pendingEvaluations') || 'Evaluaciones Pendientes'} ({pendingGrading.filter(notif => notif.taskType === 'evaluation').length})
                            </h3>
                          </div>
                          {pendingGrading
                            .filter(notif => notif.taskType === 'evaluation')
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Orden por fecha de creación
                            .map(notif => (
                            <div key={notif.id} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-purple-100 p-2 rounded-full">
                                  <ClipboardList className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notif.taskTitle}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-purple-200 text-purple-700">
                                      {notif.subject}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {translate('evaluation') || 'Evaluación'}
                                  </p>
                                  <Link 
                                    href={`/dashboard/tareas?taskId=${notif.taskId}`}
                                    className="inline-block mt-2 text-xs text-purple-600 hover:underline"
                                  >
                                    {translate('reviewEvaluation') || 'Revisar Evaluación'}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Sección de tareas pendientes de calificar */}
                      {pendingGrading.filter(notif => notif.taskType === 'assignment').length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-orange-50 border-l-4 border-orange-400">
                            <h3 className="text-sm font-medium text-foreground">
                              {translate('pendingTasks') || 'Tareas Pendientes'} ({pendingGrading.filter(notif => notif.taskType === 'assignment').length})
                            </h3>
                          </div>
                          {pendingGrading
                            .filter(notif => notif.taskType === 'assignment')
                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // Orden por fecha de creación
                            .map(notif => (
                            <div key={notif.id} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-orange-100 p-2 rounded-full">
                                  <ClipboardCheck className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {notif.taskTitle}
                                    </p>
                                    <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                                      {notif.subject}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {translate('task') || 'Tarea'}
                                  </p>
                                  <Link 
                                    href={`/dashboard/tareas?taskId=${notif.taskId}`}
                                    className="inline-block mt-2 text-xs text-orange-600 hover:underline"
                                  >
                                    {translate('reviewSubmission') || 'Revisar Entrega'}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      
                      {/* Sección de entregas de estudiantes */}
                      {studentSubmissions.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-muted/30">
                            <h3 className="text-sm font-medium text-foreground">
                              {translate('pendingSubmissions')}
                            </h3>
                          </div>
                          {studentSubmissions.map(submission => (
                            <div key={submission.id} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-orange-100 p-2 rounded-full">
                                  <ClipboardCheck className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {submission.studentName}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {submission.task?.subject || translate('task')}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {translate('submittedTask')}: {submission.task?.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(submission.timestamp)}
                                  </p>
                                  <Link 
                                    href={`/dashboard/tareas?taskId=${submission.taskId}`}
                                    className="inline-block mt-2 text-xs text-primary hover:underline"
                                  >
                                    {translate('reviewSubmission')}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Sección de comentarios no leídos de estudiantes */}
                      {unreadStudentComments.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-muted/30">
                            <h3 className="text-sm font-medium text-foreground">
                              {translate('unreadStudentComments')}
                            </h3>
                          </div>
                          {unreadStudentComments.map(comment => (
                            <div key={comment.id} className="p-4 hover:bg-muted/50">
                              <div className="flex items-start gap-2">
                                <div className="bg-blue-100 p-2 rounded-full">
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm">
                                      {comment.studentName}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {comment.task?.subject || translate('task')}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {comment.comment}
                                  </p>
                                  <p className="text-xs font-medium mt-1">
                                    {translate('onTask')}: {comment.task?.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(comment.timestamp)}
                                  </p>
                                  <Link 
                                    href={`/dashboard/tareas?taskId=${comment.taskId}&commentId=${comment.id}`}
                                    className="inline-block mt-2 text-xs text-primary hover:underline"
                                  >
                                    {translate('viewComment')}
                                  </Link>
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
  );
}
