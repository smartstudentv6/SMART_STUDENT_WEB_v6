"use client";

import { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  subject: string;
  course: string;
  assignedBy: string;
  assignedByName: string;
  assignedTo: 'course' | 'student';
  assignedStudents?: string[];
  dueDate: string;
  createdAt: string;
  status: 'pending' | 'submitted' | 'reviewed';
  priority: 'low' | 'medium' | 'high';
}

export function usePendingTasks(username?: string, activeCourses?: string[]) {
  const [pendingCount, setPendingCount] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!username || !activeCourses) {
      setPendingCount(0);
      setTasks([]);
      return;
    }

    const loadTasks = () => {
      try {
        const storedTasks = localStorage.getItem('smart-student-tasks');
        if (storedTasks) {
          const allTasks: Task[] = JSON.parse(storedTasks);
          
          // Filtrar tareas pendientes para este estudiante
          const studentTasks = allTasks.filter(task => {
            if (task.status !== 'pending') return false;
            
            if (task.assignedTo === 'course') {
              return activeCourses.includes(task.course);
            } else {
              return task.assignedStudents?.includes(username);
            }
          });

          setTasks(studentTasks);
          setPendingCount(studentTasks.length);
        }
      } catch (error) {
        console.error('Error loading pending tasks:', error);
        setPendingCount(0);
        setTasks([]);
      }
    };

    loadTasks();

    // Escuchar cambios en localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'smart-student-tasks') {
        loadTasks();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar cambios directos (mismo tab)
    const checkTasks = () => loadTasks();
    const interval = setInterval(checkTasks, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [username, activeCourses]);

  return { pendingCount, tasks };
}

export function getPendingTasksCount(username?: string, activeCourses?: string[]): number {
  if (typeof window === 'undefined' || !username || !activeCourses) return 0;
  
  try {
    const storedTasks = localStorage.getItem('smart-student-tasks');
    if (!storedTasks) return 0;
    
    const allTasks: Task[] = JSON.parse(storedTasks);
    
    const pendingTasks = allTasks.filter(task => {
      if (task.status !== 'pending') return false;
      
      if (task.assignedTo === 'course') {
        return activeCourses.includes(task.course);
      } else {
        return task.assignedStudents?.includes(username);
      }
    });

    return pendingTasks.length;
  } catch (error) {
    console.error('Error getting pending tasks count:', error);
    return 0;
  }
}
