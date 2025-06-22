
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'admin' | 'student' | 'teacher';

// Interface for teacher-subject assignment
export interface TeacherSubjectAssignment {
  teacherUsername: string;
  teacherName: string;
  subject: string;
  courses: string[]; // Courses where this teacher teaches this subject
}

// Extended user interface
export interface User {
  username: string;
  role: UserRole;
  displayName: string;
  activeCourses: string[]; // Cursos a los que tiene acceso
  email?: string;
  // For students: their assigned teachers by subject
  assignedTeachers?: Record<string, string>; // { subject: teacherUsername }
  // For teachers: subjects they teach and in which courses
  teachingAssignments?: TeacherSubjectAssignment[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  hasAccessToCourse: (course: string) => boolean;
  isAdmin: () => boolean;
  getAccessibleCourses: () => string[];
}

// Mock users database
const USERS: Record<string, { 
  password: string; 
  role: UserRole; 
  displayName: string; 
  activeCourses: string[]; 
  email?: string;
  assignedTeachers?: Record<string, string>;
  teachingAssignments?: TeacherSubjectAssignment[];
}> = {
  'admin': {
    password: '1234',
    role: 'admin',
    displayName: 'Administrador',
    activeCourses: [], // Admin tiene acceso a todos los cursos
    email: 'admin@smartstudent.com'
  },
  'felipe': {
    password: '1234',
    role: 'student',
    displayName: 'Felipe',
    activeCourses: ['4to Básico'], // Estudiante solo 1 curso activo
    email: 'felipe@student.com',
    assignedTeachers: {
      'Matemáticas': 'jorge',
      'Ciencias Naturales': 'carlos',
      'Lenguaje y Comunicación': 'jorge',
      'Historia, Geografía y Ciencias Sociales': 'carlos'
    }
  },
  'jorge': {
    password: '1234',
    role: 'teacher',
    displayName: 'Jorge Profesor',
    activeCourses: ['4to Básico', '5to Básico'], // Profesor con múltiples cursos
    email: 'jorge@teacher.com',
    teachingAssignments: [
      {
        teacherUsername: 'jorge',
        teacherName: 'Jorge Profesor',
        subject: 'Matemáticas',
        courses: ['4to Básico', '5to Básico']
      },
      {
        teacherUsername: 'jorge',
        teacherName: 'Jorge Profesor',
        subject: 'Lenguaje y Comunicación',
        courses: ['4to Básico', '5to Básico']
      }
    ]
  },
  'maria': {
    password: '1234',
    role: 'student',
    displayName: 'María Estudiante',
    activeCourses: ['1ro Básico'], // Estudiante de primer año
    email: 'maria@student.com',
    assignedTeachers: {
      'Matemáticas': 'carlos',
      'Ciencias Naturales': 'carlos',
      'Lenguaje y Comunicación': 'carlos',
      'Historia, Geografía y Ciencias Sociales': 'carlos'
    }
  },
  'carlos': {
    password: '1234',
    role: 'teacher',
    displayName: 'Carlos Profesor',
    activeCourses: ['1ro Básico', '2do Básico', '4to Básico'], // Profesor de múltiples años
    email: 'carlos@teacher.com',
    teachingAssignments: [
      {
        teacherUsername: 'carlos',
        teacherName: 'Carlos Profesor',
        subject: 'Ciencias Naturales',
        courses: ['1ro Básico', '2do Básico', '4to Básico']
      },
      {
        teacherUsername: 'carlos',
        teacherName: 'Carlos Profesor',
        subject: 'Historia, Geografía y Ciencias Sociales',
        courses: ['1ro Básico', '2do Básico', '4to Básico']
      },
      {
        teacherUsername: 'carlos',
        teacherName: 'Carlos Profesor',
        subject: 'Matemáticas',
        courses: ['1ro Básico']
      },
      {
        teacherUsername: 'carlos',
        teacherName: 'Carlos Profesor',
        subject: 'Lenguaje y Comunicación',
        courses: ['1ro Básico']
      }
    ]
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check local storage for persisted auth state
    const storedAuth = localStorage.getItem('smart-student-auth');
    const storedUser = localStorage.getItem('smart-student-user');
    
    if (storedAuth === 'true' && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUser(userData);
      } catch (error) {
        // If stored data is invalid, clear it
        localStorage.removeItem('smart-student-auth');
        localStorage.removeItem('smart-student-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, pass: string): Promise<boolean> => {
    const userKey = username.toLowerCase();
    
    console.log('=== LOGIN DEBUG ===');
    console.log('Usuario:', userKey);
    console.log('Contraseña ingresada:', pass);
    
    // First try to get user from localStorage (updated by user management)
    let userData;
    let userFoundInStorage = false;
    
    try {
      const storedUsers = localStorage.getItem('smart-student-users');
      console.log('Datos en localStorage:', storedUsers);
      
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        console.log('Usuarios en localStorage:', users);
        const storedUser = users.find((u: any) => u.username === userKey);
        
        if (storedUser) {
          console.log('Usuario encontrado en localStorage:', storedUser);
          console.log('Contraseña almacenada:', storedUser.password);
          userFoundInStorage = true;
          if (storedUser.password === pass) {
            console.log('✅ Contraseña correcta (localStorage)');
            userData = storedUser;
          } else {
            console.log('❌ Contraseña incorrecta (localStorage)');
            // User exists in localStorage but password is wrong
            return false;
          }
        } else {
          console.log('Usuario NO encontrado en localStorage');
        }
      }
    } catch (error) {
      console.warn('Could not load users from localStorage:', error);
    }
    
    // Fallback to static USERS only if user is NOT in localStorage
    if (!userData && !userFoundInStorage) {
      console.log('Intentando con usuarios estáticos...');
      userData = USERS[userKey];
      if (!userData || userData.password !== pass) {
        console.log('❌ Usuario no encontrado o contraseña incorrecta (estático)');
        return false;
      }
      console.log('✅ Login exitoso con usuario estático');
    }
    
    // Validate student course assignment (only one course allowed)
    if (userData.role === 'student' && userData.activeCourses.length > 1) {
      // Fix the data: keep only the first course
      userData.activeCourses = [userData.activeCourses[0]];
      
      // Update in localStorage if it exists there
      try {
        const storedUsers = localStorage.getItem('smart-student-users');
        if (storedUsers) {
          const users = JSON.parse(storedUsers);
          const updatedUsers = users.map((u: any) => 
            u.username === userKey ? { ...u, activeCourses: userData.activeCourses } : u
          );
          localStorage.setItem('smart-student-users', JSON.stringify(updatedUsers));
        }
      } catch (error) {
        console.warn('Could not update user data in localStorage:', error);
      }
    }
    
    const user: User = {
      username: userKey,
      role: userData.role,
      displayName: userData.displayName,
      activeCourses: userData.activeCourses,
      email: userData.email
    };
    
    setIsAuthenticated(true);
    setUser(user);
    localStorage.setItem('smart-student-auth', 'true');
    localStorage.setItem('smart-student-user', JSON.stringify(user));
    
    // Migrate global evaluation history to user-specific key if it exists
    try {
      const globalHistoryKey = 'evaluationHistory';
      const userSpecificHistoryKey = `evaluationHistory_${userKey}`;
      
      const globalHistory = localStorage.getItem(globalHistoryKey);
      const userHistory = localStorage.getItem(userSpecificHistoryKey);
      
      // Only migrate if global history exists and user doesn't have history yet
      if (globalHistory && !userHistory) {
        localStorage.setItem(userSpecificHistoryKey, globalHistory);
        console.log(`Migrated evaluation history for user: ${userKey}`);
      }
    } catch (error) {
      console.warn('Failed to migrate evaluation history:', error);
    }
    
    router.push('/dashboard');
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('smart-student-auth');
    localStorage.removeItem('smart-student-user');
    router.push('/login');
  };

  // Funciones de permisos
  const hasAccessToCourse = (course: string): boolean => {
    if (!user) return false;
    
    // Admin tiene acceso a todos los cursos
    if (user.role === 'admin') return true;
    
    // Estudiantes y profesores solo a sus cursos activos
    // Verificar que activeCourses existe y es un array
    if (!user.activeCourses || !Array.isArray(user.activeCourses)) {
      return false;
    }
    
    return user.activeCourses.includes(course);
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin' || false;
  };

  const getAccessibleCourses = (): string[] => {
    if (!user) return [];
    
    // Admin ve todos los cursos disponibles
    if (user.role === 'admin') {
      return [
        '1ro Básico', '2do Básico', '3ro Básico', '4to Básico', '5to Básico',
        '6to Básico', '7mo Básico', '8vo Básico', '1ro Medio', '2do Medio',
        '3ro Medio', '4to Medio'
      ];
    }
    
    // Verificar que activeCourses existe y es un array
    if (!user.activeCourses || !Array.isArray(user.activeCourses)) {
      return [];
    }
    
    return user.activeCourses;
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout, 
      isLoading,
      hasAccessToCourse,
      isAdmin,
      getAccessibleCourses
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

    