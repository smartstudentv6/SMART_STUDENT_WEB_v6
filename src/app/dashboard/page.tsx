
"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { Library, Newspaper, Network, FileQuestion, ClipboardList, Home, Users, Mail, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    icon: CheckSquare,
    colorClass: 'teal',
  },
];

// Admin-only cards
const adminCards = [
  {
    titleKey: 'cardUserManagementTitle',
    descKey: 'cardUserManagementDesc',
    btnKey: 'cardUserManagementBtn',
    targetPage: '/dashboard/gestion-usuarios',
    icon: Users,
    colorClass: 'red',
  },
  {
    titleKey: 'cardPasswordRequestsTitle',
    descKey: 'cardPasswordRequestsDesc',
    btnKey: 'cardPasswordRequestsBtn',
    targetPage: '/dashboard/solicitudes',
    icon: Mail,
    colorClass: 'orange',
  },
];

export default function DashboardHomePage() {
  const { translate } = useLanguage();
  const { user, isAdmin } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  // Function to get pending password reset requests count
  useEffect(() => {
    if (isAdmin()) {
      const updatePendingCount = () => {
        try {
          const requestsData = localStorage.getItem('password-reset-requests');
          if (requestsData) {
            const requests = JSON.parse(requestsData);
            const pendingCount = requests.filter((request: any) => request.status === 'pending').length;
            setPendingRequestsCount(pendingCount);
          } else {
            setPendingRequestsCount(0);
          }
        } catch (error) {
          console.error('Error counting pending requests:', error);
          setPendingRequestsCount(0);
        }
      };

      // Initial count
      updatePendingCount();

      // Set up interval to check for changes
      const interval = setInterval(updatePendingCount, 2000);

      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Function to get pending tasks count
  useEffect(() => {
    const updatePendingTasksCount = () => {
      try {
        const tasksData = localStorage.getItem('tasks');
        if (tasksData && user) {
          const tasks = JSON.parse(tasksData);
          let pendingCount = 0;
          
          tasks.forEach((task: any) => {
            // Check if this task is assigned to the current user
            const isAssignedToUser = task.assignedTo === 'all' || 
              (task.assignedTo === 'course' && user.activeCourses?.includes(task.course)) ||
              (Array.isArray(task.assignedStudents) && task.assignedStudents.includes(user.username));
            
            if (isAssignedToUser) {
              // Check if user has submitted this task
              const submissions = task.submissions || [];
              const userSubmission = submissions.find((sub: any) => sub.username === user.username);
              
              if (!userSubmission) {
                pendingCount++;
              }
            }
          });
          
          setPendingTasksCount(pendingCount);
        } else {
          setPendingTasksCount(0);
        }
      } catch (error) {
        console.error('Error counting pending tasks:', error);
        setPendingTasksCount(0);
      }
    };

    // Initial count
    updatePendingTasksCount();

    // Set up interval to check for changes
    const interval = setInterval(updatePendingTasksCount, 2000);

    return () => clearInterval(interval);
  }, [user]);

  // Función para extraer solo el primer nombre
  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  const getButtonColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'home-card-button-green';
      case 'blue': return 'home-card-button-blue';
      case 'yellow': return 'home-card-button-yellow';
      case 'cyan': return 'home-card-button-cyan';
      case 'purple': return 'home-card-button-purple';
      case 'red': return 'home-card-button-red';
      case 'orange': return 'home-card-button-orange';
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
      case 'red': return 'text-red-500 dark:text-red-400';
      case 'orange': return 'text-orange-500 dark:text-orange-400';
      case 'teal': return 'text-teal-500 dark:text-teal-400';
      default: return 'text-muted-foreground';
    }
  };

  // Combine cards: regular cards + admin cards if user is admin
  const allCards = [...featureCards, ...(isAdmin() ? adminCards : [])];


  return (
    <div className="space-y-8">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start gap-3">
            <h1 className="text-3xl font-bold text-foreground font-headline">
              {translate('dashboardWelcome')} {user?.displayName ? getFirstName(user.displayName) : translate('dashboardDefaultUser')}
            </h1>
            <Home className="w-8 h-8 text-foreground" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {allCards.map((card) => (
          <Card key={card.titleKey} className="flex flex-col text-center shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="items-center">
              <div className="relative">
                <card.icon className={`w-10 h-10 mb-3 ${getIconColorClass(card.colorClass)}`} />
                {/* Show notification badge for Solicitudes card if there are pending requests */}
                {card.titleKey === 'cardPasswordRequestsTitle' && pendingRequestsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white border-2 border-white dark:border-gray-800"
                  >
                    {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                  </Badge>
                )}
                {/* Show notification badge for Tasks card if there are pending tasks */}
                {card.titleKey === 'cardTasksTitle' && pendingTasksCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white border-2 border-white dark:border-gray-800"
                  >
                    {pendingTasksCount > 99 ? '99+' : pendingTasksCount}
                  </Badge>
                )}
              </div>
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
    
