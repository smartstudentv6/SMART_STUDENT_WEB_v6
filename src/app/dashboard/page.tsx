"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { Library, Newspaper, Network, FileQuestion, ClipboardList, Home, Crown, GraduationCap, Users, Settings, ClipboardCheck, MessageSquare } from 'lucide-react';
import NotificationsPanel from '@/components/common/notifications-panel';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

export default function DashboardHomePage() {
  const { translate } = useLanguage();
  const { user } = useAuth();
  const [unreadCommentsCount, setUnreadCommentsCount] = useState(0);
  const [pendingPasswordRequestsCount, setPendingPasswordRequestsCount] = useState(0);
  const [pendingTaskSubmissionsCount, setPendingTaskSubmissionsCount] = useState(0);

  // Cargar comentarios no leídos de las tareas y entregas pendientes
  useEffect(() => {
    if (user) {
      // Cargar comentarios de tareas del localStorage
      const storedComments = localStorage.getItem('smart-student-task-comments');
      if (storedComments) {
        const comments: TaskComment[] = JSON.parse(storedComments);
        
        if (user.role === 'student') {
          // Filtrar comentarios que no han sido leídos por el usuario actual
          const unread = comments.filter((comment: TaskComment) => 
            comment.studentUsername !== user.username && // No contar los propios comentarios
            (!comment.readBy?.includes(user.username))
          );
          
          setUnreadCommentsCount(unread.length);
        } else if (user.role === 'teacher') {
          // Para profesores, cargar entregas pendientes
          loadPendingTaskSubmissions();
        }
      }
    }
  }, [user]);

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

  // Cargar entregas pendientes para profesores para mostrar en las notificaciones
  const loadPendingTaskSubmissions = () => {
    if (user && user.role === 'teacher') {
      try {
        const storedComments = localStorage.getItem('smart-student-task-comments');
        const storedTasks = localStorage.getItem('smart-student-tasks');
        
        if (storedComments && storedTasks) {
          const comments = JSON.parse(storedComments);
          const tasks = JSON.parse(storedTasks);
          
          // Filtrar tareas asignadas por este profesor
          const teacherTasks = tasks.filter((task: any) => task.assignedBy === user.username);
          const teacherTaskIds = teacherTasks.map((task: any) => task.id);
          
          // Filtrar entregas sin calificar
          const pendingSubmissions = comments.filter((comment: any) => 
            comment.isSubmission && 
            teacherTaskIds.includes(comment.taskId) &&
            !comment.grade
          );
          
          setPendingTaskSubmissionsCount(pendingSubmissions.length);
        }
      } catch (error) {
        console.error('Error loading pending submissions:', error);
      }
    }
  };

  // Cargar solicitudes de contraseña pendientes y entregas pendientes, y actualizar la cuenta de comentarios
  useEffect(() => {
    loadPendingPasswordRequests();
    loadPendingTaskSubmissions();
    
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
            const unread = comments.filter((comment: any) => 
              comment.studentUsername !== user.username && 
              (!comment.readBy?.includes(user.username))
            );
            setUnreadCommentsCount(unread.length);
          }
        } else if (user?.role === 'teacher') {
          // Recargar entregas pendientes para profesores
          loadPendingTaskSubmissions();
        }
      }
    };
    
    // Función para manejar el evento personalizado cuando se marcan comentarios como leídos
    const handleCommentsUpdated = () => {
      if (user?.role === 'student') {
        // Recargar comentarios no leídos para estudiantes
        const storedComments = localStorage.getItem('smart-student-task-comments');
        if (storedComments) {
          const comments = JSON.parse(storedComments);
          const unread = comments.filter((comment: any) => 
            comment.studentUsername !== user.username && 
            (!comment.readBy?.includes(user.username))
          );
          setUnreadCommentsCount(unread.length);
        }
      } else if (user?.role === 'teacher') {
        // Recargar entregas pendientes para profesores
        loadPendingTaskSubmissions();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('commentsUpdated', handleCommentsUpdated);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('commentsUpdated', handleCommentsUpdated);
    };
  }, [user]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'teacher': return Users;
      case 'student': return GraduationCap;
      default: return Home;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-yellow-600 dark:text-yellow-400';
      case 'teacher': return 'text-blue-600 dark:text-blue-400';
      case 'student': return 'text-green-600 dark:text-green-400';
      default: return 'text-foreground';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'teacher': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'student': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
              {/* Notification Panel */}
              <NotificationsPanel count={
                user.role === 'admin' 
                  ? pendingPasswordRequestsCount
                  : user.role === 'teacher'
                    ? pendingTaskSubmissionsCount
                    : unreadCommentsCount
              } />
              <Badge className={cn("text-sm font-medium", getRoleBadgeColor(user.role))}>
                {user.role === 'admin' && translate('adminRole')}
                {user.role === 'teacher' && translate('teacherRole')}
                {user.role === 'student' && translate('studentRole')}
              </Badge>
              {React.createElement(getRoleIcon(user.role), {
                className: cn("w-6 h-6", getRoleColor(user.role))
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {featureCards.map((card) => (
          <Card key={card.titleKey} className="flex flex-col text-center shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="items-center relative">
              {card.showBadge && (
                (user?.role === 'student' && unreadCommentsCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 text-xs px-2 rounded-full"
                    title={translate('unreadNotificationsCount', { count: String(unreadCommentsCount) })}
                  >
                    {unreadCommentsCount > 99 ? '99+' : unreadCommentsCount}
                  </Badge>
                )) || 
                (user?.role === 'teacher' && pendingTaskSubmissionsCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 text-xs px-2 rounded-full"
                    title={translate('pendingSubmissionsCount', { count: String(pendingTaskSubmissionsCount) })}
                  >
                    {pendingTaskSubmissionsCount > 99 ? '99+' : pendingTaskSubmissionsCount}
                  </Badge>
                ))
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
                  "hover:shadow-lg hover:scale-105 transition-all duration-200"
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
                  "hover:shadow-lg hover:scale-105 transition-all duration-200"
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

