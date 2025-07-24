"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Users, Plus, Edit, Trash2, Shield, BookOpen, ChevronDown, ChevronRight, UserPlus, UserMinus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, UserRole, TeacherSubjectAssignment } from '@/contexts/auth-context';
import { Course } from '@/lib/types'; // Import Course type
import { generateUniqueId } from '@/lib/utils'; // Import generateUniqueId
import { getAllSubjects, getSubjectsForCourse } from '@/lib/books-data';

// Extended User interface with teacher assignment
interface ExtendedUser extends User { // User from auth-context already has id, username, role, displayName, activeCourses, email
  password: string; // Password should ideally not be part of the client-side User object for long.
  assignedTeacherId?: string; // For students: ID of their assigned teacher
  teachingSubjects?: string[]; // For teachers: subjects they teach (simplified version)
  courseSubjectAssignments?: CourseSubjectAssignment[]; // New field for specific course-subject assignments
  selectedCourseId?: string; // For backward compatibility
  // activeCourses will store course IDs
}

// Course-Subject assignment for teachers
interface CourseSubjectAssignment {
  id: string;
  courseId: string;
  courseName: string;
  subjects: string[];
}

// Simulate user database management
interface UserFormData {
  id?: string; // Optional: only present for existing users
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  activeCourseIds: string[]; // Changed from activeCourses (names) to activeCourseIds
  password: string;
  assignedTeacherId?: string; // For students: ID of their assigned teacher
  teachingSubjects?: string[]; // For teachers
  selectedCourseId?: string; // For dynamic subject loading (stores course ID)
  courseSubjectAssignments?: CourseSubjectAssignment[]; // New field for teachers
}

const initialAvailableCoursesData = [ // Renamed to avoid conflict, will be replaced by state
  '1ro Básico',
  '2do Básico', 
  '3ro Básico',
  '4to Básico',
  '5to Básico',
  '6to Básico',
  '7mo Básico',
  '8vo Básico',
  '1ro Medio',
  '2do Medio',
  '3ro Medio',
  '4to Medio'
];

// Get available subjects from the books data
const getAvailableSubjects = () => {
  return getAllSubjects();
};

// Get subjects available for a specific course
const getSubjectsForSpecificCourse = (course: string) => {
  return getSubjectsForCourse(course);
};

export default function GestionUsuariosPage() {
  const { user, isAdmin, refreshUser } = useAuth();
  const { translate } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]); // State for courses
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [expandedTeachers, setExpandedTeachers] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<UserFormData>({
    // id will be undefined for new users
    username: '',
    displayName: '',
    email: '',
    role: 'student',
    activeCourseIds: [], // Updated field name
    password: '',
    assignedTeacherId: undefined, // Updated field name
    teachingSubjects: [],
    selectedCourseId: undefined, // Updated field name
    courseSubjectAssignments: [] // New field for teachers
  });

  // Available courses (using the initial data for now)
  const availableCourses = initialAvailableCoursesData;

  // Redirect if not admin
  useEffect(() => {
    if (user && !isAdmin()) {
      router.push('/dashboard');
      toast({
        title: translate('userManagementAccessDenied'),
        description: translate('userManagementAccessDeniedDesc'),
        variant: 'destructive'
      });
    }
  }, [user, isAdmin, router, toast]);

  // Load users and courses from localStorage (simulated database)
  useEffect(() => {
    const loadInitialData = () => {
      // Load Courses
      const storedCourses = localStorage.getItem('smart-student-courses');
      let coursesModified = false;
      let loadedCourses: Course[];

      if (storedCourses) {
        try {
          loadedCourses = JSON.parse(storedCourses);
          // Ensure all courses have IDs
          loadedCourses.forEach(c => {
            if (!c.id) {
              c.id = generateUniqueId();
              coursesModified = true;
            }
          });
        } catch (error) {
          console.error('Error loading courses, initializing defaults:', error);
          loadedCourses = initialAvailableCoursesData.map(courseName => ({
            id: generateUniqueId(),
            name: courseName,
          }));
          coursesModified = true;
        }
      } else {
        loadedCourses = initialAvailableCoursesData.map(courseName => ({
          id: generateUniqueId(),
          name: courseName,
        }));
        coursesModified = true;
      }
      setCourses(loadedCourses);
      if (coursesModified) {
        localStorage.setItem('smart-student-courses', JSON.stringify(loadedCourses));
      }

      // Load Users
      const storedUsers = localStorage.getItem('smart-student-users');
      let usersModifiedInitially = false; // Tracks if IDs were added or defaults initialized
      let loadedUsersData: ExtendedUser[];

      if (storedUsers) {
        try {
          const parsedUsers = JSON.parse(storedUsers) as Partial<ExtendedUser>[];
          loadedUsersData = parsedUsers.map(u => {
            if (!u.id) {
              u.id = u.username || generateUniqueId(); // Use username as ID if possible for existing, else generate
              usersModifiedInitially = true;
            }
            return {
              id: u.id,
              username: u.username || `user-${u.id}`, // Ensure username exists
              role: u.role || 'student',
              displayName: u.displayName || u.username || `User ${u.id}`,
              activeCourses: u.activeCourses || [], // This will be list of course names or IDs, to be migrated
              email: u.email,
              password: u.password || '1234', // Default password if missing
              assignedTeacherId: (u as any).assignedTeacherId || (u as any).assignedTeacher, // Keep if ID, or keep username for now
              teachingSubjects: u.teachingSubjects || [],
              assignedTeachers: (u as User).assignedTeachers,
              teachingAssignments: (u as User).teachingAssignments,
            } as ExtendedUser;
          });
        } catch (error) {
          console.error('Error loading or migrating users, initializing defaults:', error);
          // Pass empty array for allCurrentUsers as they are not loaded yet to avoid circular dependency in this init step
          loadedUsersData = initializeDefaultUsers(loadedCourses, []);
          usersModifiedInitially = true;
        }
      } else {
         // Pass empty array for allCurrentUsers
        loadedUsersData = initializeDefaultUsers(loadedCourses, []);
        usersModifiedInitially = true;
      }

      // Perform data migration for course names to IDs and teacher usernames to IDs
      let usersDataUpdatedForMigration = false;
      const finalUsers = loadedUsersData.map(u => {
        let userChangedInMigration = false;
        const currentActiveCourses = u.activeCourses || [];
        const newActiveCourseIds: string[] = [];

        if (currentActiveCourses.length > 0) {
          currentActiveCourses.forEach(courseRef => {
            // Check if courseRef is already an ID
            const courseExistsById = loadedCourses.find(c => c.id === courseRef);
            if (courseExistsById) {
              newActiveCourseIds.push(courseRef);
            } else { // Assume courseRef is a name and try to find its ID
              const courseByName = loadedCourses.find(c => c.name === courseRef);
              if (courseByName) {
                newActiveCourseIds.push(courseByName.id);
                userChangedInMigration = true;
              } else {
                // console.warn(`Course name "${courseRef}" not found for user ${u.username}`);
              }
            }
          });
          // Only update if there was a change in representation (name to ID)
          if (userChangedInMigration || JSON.stringify(u.activeCourses) !== JSON.stringify(newActiveCourseIds)) {
             u.activeCourses = newActiveCourseIds; // User.activeCourses now stores IDs
          }
        }


        // Migrate assignedTeacher (username for default users) to assignedTeacherId
        // This relies on all users being loaded in loadedUsersData with their IDs (even if defaults)
        const oldAssignedTeacherFormat = (u as any).assignedTeacher;
        if (u.role === 'student' && oldAssignedTeacherFormat && typeof oldAssignedTeacherFormat === 'string' && !u.assignedTeacherId) {
          const teacherUser = loadedUsersData.find(t => t.username === oldAssignedTeacherFormat && t.role === 'teacher');
          if (teacherUser && teacherUser.id) {
            u.assignedTeacherId = teacherUser.id;
            delete (u as any).assignedTeacher;
            userChangedInMigration = true;
          } else {
            // console.warn(`Teacher username "${oldAssignedTeacherFormat}" not found for student ${u.username}`);
          }
        }
        if(userChangedInMigration) usersDataUpdatedForMigration = true;
        return u;
      });

      setUsers(finalUsers);
      if (usersModifiedInitially || usersDataUpdatedForMigration) {
        setUsers(finalUsers);
        localStorage.setItem('smart-student-users', JSON.stringify(finalUsers));
      } else {
        setUsers(finalUsers);
      }
    };

    const initializeDefaultUsers = (currentCourses: Course[], allCurrentUsersForLookup: ExtendedUser[]): ExtendedUser[] => {
      const defaultUsersData: Array<Omit<ExtendedUser, 'id' | 'activeCourses' | 'assignedTeacherId'> & { activeCourseNames?: string[], assignedTeacherUsername?: string }> = [
        { username: 'admin', displayName: 'Administrador del Sistema', email: 'admin@smartstudent.com', role: 'admin', password: '1234' },
        { username: 'felipe', displayName: 'Felipe Estudiante', email: 'felipe@student.com', role: 'student', activeCourseNames: ['4to Básico'], assignedTeacherUsername: 'jorge', password: '1234' },
        { username: 'jorge', displayName: 'Jorge Profesor', email: 'jorge@teacher.com', role: 'teacher', activeCourseNames: ['4to Básico', '5to Básico'], teachingSubjects: ['Matemáticas', 'Lenguaje y Comunicación'], password: '1234' },
        { username: 'maria', displayName: 'María Estudiante', email: 'maria@student.com', role: 'student', activeCourseNames: ['1ro Básico'], assignedTeacherUsername: 'carlos', password: '1234' },
        { username: 'carlos', displayName: 'Carlos Profesor', email: 'carlos@teacher.com', role: 'teacher', activeCourseNames: ['1ro Básico', '2do Básico'], teachingSubjects: ['Ciencias Naturales', 'Historia, Geografía y Ciencias Sociales', 'Matemáticas', 'Lenguaje y Comunicación'], password: '1234' },
        { username: 'ana', displayName: 'Ana Profesora', email: 'ana@teacher.com', role: 'teacher', activeCourseNames: ['4to Básico'], teachingSubjects: ['Matemáticas'], password: '1234' },
        { username: 'luis', displayName: 'Luis Estudiante', email: 'luis@student.com', role: 'student', activeCourseNames: ['4to Básico'], assignedTeacherUsername: 'ana', password: '1234' },
        { username: 'sofia', displayName: 'Sofía Estudiante', email: 'sofia@student.com', role: 'student', password: '1234' }
      ];

      const getCourseIdByName = (name: string) => currentCourses.find(c => c.name === name)?.id;

      // Create a map of usernames to IDs from the allCurrentUsersForLookup if available, or from the defaults themselves if it's the first pass
      const tempUserMapForTeacherLookup = new Map<string, string>();
      if (allCurrentUsersForLookup.length > 0) {
        allCurrentUsersForLookup.forEach(u => tempUserMapForTeacherLookup.set(u.username, u.id));
      } else { // If allCurrentUsersForLookup is empty, means we are initializing, so teacher IDs will be their usernames for now
        defaultUsersData.filter(u => u.role === 'teacher').forEach(u => tempUserMapForTeacherLookup.set(u.username, u.username));
      }


      return defaultUsersData.map(uData => {
        const user = uData as any;
        const activeCourseIds = user.activeCourseNames?.map(getCourseIdByName).filter(Boolean) as string[] || [];

        let teacherIdValue: string | undefined = undefined;
        if (user.assignedTeacherUsername) {
          teacherIdValue = tempUserMapForTeacherLookup.get(user.assignedTeacherUsername);
          // If lookup failed (e.g. during very first init), store username temporarily for later migration pass
          if (!teacherIdValue) teacherIdValue = user.assignedTeacherUsername;
        }

        return {
          ...user,
          id: user.username,
          activeCourses: activeCourseIds,
          assignedTeacherId: teacherIdValue,
          assignedTeacher: undefined, // Ensure old field is not present
          activeCourseNames: undefined,
          assignedTeacherUsername: undefined,
        } as ExtendedUser;
      });
    };

    loadInitialData();
  }, []); // Runs once on mount

  const handleSaveUser = () => {
    if (!formData.username || !formData.displayName || !formData.password) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios.",
        variant: 'destructive'
      });
      return;
    }

    // Check if username already exists (only when creating new user)
    if (!editingUser && users.some(u => u.username === formData.username)) {
      toast({
        title: "Error",
        description: "Ya existe un usuario con este nombre de usuario.",
        variant: 'destructive'
      });
      return;
    }

    // Validate teacher subject assignment
    if (formData.role === 'teacher') {
      // Check main course subjects
      const hasMainCourseSubjects = formData.teachingSubjects && formData.teachingSubjects.length > 0;
      
      // Check additional course subjects
      const hasAdditionalSubjects = (formData.courseSubjectAssignments || []).some(assignment => 
        assignment.subjects.length > 0
      );
      
      if (!hasMainCourseSubjects && !hasAdditionalSubjects) {
        toast({
          title: "Error",
          description: "El profesor debe tener al menos una asignatura asignada.",
          variant: 'destructive'
        });
        return;
      }
      
      // Validate that all additional course assignments have subjects selected
      const invalidAssignments = (formData.courseSubjectAssignments || []).filter(assignment => 
        assignment.courseName && assignment.subjects.length === 0
      );
      
      if (invalidAssignments.length > 0) {
        toast({
          title: "Error",
          description: translate('allCoursesAdditionalSubjects'),
          variant: 'destructive'
        });
        return;
      }
    }

    // Validate student course assignment (only one course allowed)
    if (formData.role === 'student' && formData.activeCourseIds.length > 1) {
      toast({
        title: "Error",
        description: translate('userManagementStudentOneCourseRule'),
        variant: 'destructive'
      });
      return;
    }

    // Validate student teacher assignment
    if (formData.role === 'student' && formData.activeCourseIds.length > 0 && !formData.assignedTeacherId) {
      toast({
        title: "Error",
        description: translate('userManagementSelectTeacher'),
        variant: 'destructive'
      });
      return;
    }

    let updatedUsersList;
    
    // Calculate final active courses for teachers (main course + additional courses)
    let finalActiveCourseIds = formData.activeCourseIds;
    let finalTeachingSubjects = formData.teachingSubjects || [];
    
    if (formData.role === 'teacher') {
      // Start with main course
      const mainCourseIds = formData.selectedCourseId ? [formData.selectedCourseId] : [];
      
      // Add additional courses
      const additionalCourseIds = (formData.courseSubjectAssignments || [])
        .filter(assignment => assignment.courseId && assignment.subjects.length > 0)
        .map(assignment => assignment.courseId);
      
      // Combine all courses
      finalActiveCourseIds = [...new Set([...mainCourseIds, ...additionalCourseIds])];
      
      // Combine all subjects
      const additionalSubjects = (formData.courseSubjectAssignments || [])
        .flatMap(assignment => assignment.subjects);
      
      finalTeachingSubjects = [...new Set([...finalTeachingSubjects, ...additionalSubjects])];
    }
    
    if (editingUser && formData.id) { // Editing existing user
      updatedUsersList = users.map(u => {
        if (u.id === formData.id) {
          return {
            ...u, // Preserve existing fields like teachingAssignments if not directly in formData
            id: formData.id,
            username: formData.username,
            displayName: formData.displayName,
            email: formData.email,
            role: formData.role,
            activeCourses: finalActiveCourseIds, // Use calculated final courses
            password: formData.password, // Handle password update carefully in real app
            assignedTeacherId: formData.assignedTeacherId,
            teachingSubjects: finalTeachingSubjects, // Use calculated final subjects
          } as ExtendedUser;
        }
        return u;
      });
    } else { // Creating new user
      const newUserId = generateUniqueId();
      const newUser: ExtendedUser = {
        id: newUserId,
        username: formData.username,
        displayName: formData.displayName,
        email: formData.email,
        role: formData.role,
        activeCourses: finalActiveCourseIds, // Use calculated final courses
        password: formData.password,
        assignedTeacherId: formData.assignedTeacherId,
        teachingSubjects: formData.role === 'teacher' ? finalTeachingSubjects : undefined, // Use calculated final subjects
        // Initialize other User fields from auth-context if necessary
        assignedTeachers: undefined,
        teachingAssignments: undefined,
      };
      
      // If this is a student being assigned to a course, ensure only one course (already handled by activeCourseIds logic)
      // if (newUser.role === 'student' && newUser.activeCourses.length > 0) {
      //   newUser.activeCourses = [newUser.activeCourses[0]];
      // }
      updatedUsersList = [...users, newUser];
    }

    setUsers(updatedUsersList);
    // Guardar inmediatamente en localStorage
    localStorage.setItem('smart-student-users', JSON.stringify(updatedUsersList));
    
    // Actualizar el contexto de autenticación si el usuario actual está logueado
    if (user) {
      refreshUser();
    }
    
    // Marcar que hay cambios sin guardar (para mostrar el botón de guardar cambios)
    setHasUnsavedChanges(true);

    toast({
      title: translate('success'),
      description: editingUser ? 
        translate('userUpdatedSaveChanges') : 
        translate('userCreatedSaveChanges'),
    });

    handleCloseDialog();
  };

  // Función para sincronizar todos los cambios a nivel global
  const syncAllChanges = () => {
    // Guardar usuarios actualizados en localStorage
    localStorage.setItem('smart-student-users', JSON.stringify(users));
    
    // Actualizar el contexto de autenticación si el usuario actual está logueado
    if (user) {
      refreshUser();
    }
    
    // Actualizar otras referencias en localStorage
    try {
      // Actualizar referencias en cursos y tareas
      const courseMappings = getTeacherCourseMappings();
      localStorage.setItem('smart-student-course-mappings', JSON.stringify(courseMappings));
      
      // Actualizar entregas (si hay cambios en las asignaciones)
      updateSubmissionAssignments();
      
      // Actualizar evaluaciones
      updateEvaluationAssignments();
      
      // Otras sincronizaciones específicas
      ensureSpecialCases();
      
      toast({
        title: translate('changedSavedTitle'),
        description: translate('changedSavedDesc'),
      });
    } catch (error) {
      console.error('Error al sincronizar los cambios:', error);
      toast({
        title: translate('syncErrorTitle'),
        description: translate('syncErrorDesc'),
        variant: 'destructive'
      });
    }
  };
  
  // Funciones auxiliares para la sincronización global
  const getTeacherCourseMappings = () => {
    // Crear un mapa de cursos a profesores
    const mappings: Record<string, string[]> = {};
    
    users.filter(u => u.role === 'teacher').forEach(teacher => {
      if (teacher.activeCourses) {
        teacher.activeCourses.forEach(course => {
          if (!mappings[course]) {
            mappings[course] = [];
          }
          mappings[course].push(teacher.username);
        });
      }
    });
    
    return mappings;
  };
  
  const updateSubmissionAssignments = () => {
    try {
      // Comprobar si hay datos de entregas en localStorage
      const submissionsData = localStorage.getItem('smart-student-task-comments');
      if (submissionsData) {
        const submissions = JSON.parse(submissionsData);
        // Aquí se podrían actualizar las referencias a los usuarios
        localStorage.setItem('smart-student-task-comments', JSON.stringify(submissions));
      }
    } catch (e) {
      console.error('Error al actualizar entregas:', e);
    }
  };
  
  const updateEvaluationAssignments = () => {
    try {
      const evaluationsData = localStorage.getItem('smart-student-evaluations');
      if (evaluationsData) {
        const evaluations = JSON.parse(evaluationsData);
        // Aquí se podrían actualizar las referencias a los usuarios
        localStorage.setItem('smart-student-evaluations', JSON.stringify(evaluations));
      }
    } catch (e) {
      console.error('Error al actualizar evaluaciones:', e);
    }
  };
  
  const ensureSpecialCases = () => {
    // Asegurarse de que los casos especiales (María y Luis) se manejen correctamente
    console.log('Asegurando casos especiales para María y filtrando a Luis');
    // Aquí se podría implementar lógica específica para estos casos
  };

  const handleDeleteUser = (userIdToDelete: string) => {
    // Find the user to delete
    const userToDelete = users.find(u => u.id === userIdToDelete);
    
    // Protect admin user - check by role and username
    if (userToDelete && (userToDelete.role === 'admin' || userToDelete.username === 'admin')) {
      toast({
        title: "Error",
        description: "No se puede eliminar el usuario administrador.",
        variant: 'destructive'
      });
      return;
    }

    const updatedUsers = users.filter(u => u.id !== userIdToDelete);
    setUsers(updatedUsers);
    // Guardar inmediatamente en localStorage
    localStorage.setItem('smart-student-users', JSON.stringify(updatedUsers));
    
    // Actualizar el contexto de autenticación si el usuario actual está logueado
    if (user) {
      refreshUser();
    }
    
    // Marcar que hay cambios sin guardar
    setHasUnsavedChanges(true);

    toast({
      title: "Éxito",
      description: "Usuario eliminado correctamente.",
    });
  };

  const handleEditUser = (userToEdit: ExtendedUser) => {
    setEditingUser(userToEdit);
    
    // For students, ensure only one course is selected
    let coursesToSet = userToEdit.activeCourses;
    if (userToEdit.role === 'student' && coursesToSet.length > 1) {
      coursesToSet = [coursesToSet[0]]; // Keep only the first course
    }
    
    // For teachers, reconstruct course-subject assignments
    let mainCourseId: string | undefined;
    let mainCourseSubjects: string[] = [];
    let additionalAssignments: CourseSubjectAssignment[] = [];
    
    if (userToEdit.role === 'teacher' && userToEdit.activeCourses.length > 0) {
      // Use the first course as main course
      mainCourseId = userToEdit.activeCourses[0];
      const mainCourseName = courses.find(c => c.id === mainCourseId)?.name || '';
      
      if (mainCourseName && userToEdit.teachingSubjects) {
        // Get subjects that belong to main course
        const mainCourseAvailableSubjects = getSubjectsForSpecificCourse(mainCourseName);
        mainCourseSubjects = userToEdit.teachingSubjects.filter(subject => 
          mainCourseAvailableSubjects.includes(subject)
        );
        
        // Create assignments for additional courses
        const remainingSubjects = userToEdit.teachingSubjects.filter(subject => 
          !mainCourseSubjects.includes(subject)
        );
        
        // Group remaining subjects by course
        const courseSubjectMap = new Map<string, string[]>();
        
        userToEdit.activeCourses.slice(1).forEach(courseId => {
          const courseName = courses.find(c => c.id === courseId)?.name;
          if (courseName) {
            const courseSubjects = getSubjectsForSpecificCourse(courseName);
            const matchingSubjects = remainingSubjects.filter(subject => 
              courseSubjects.includes(subject)
            );
            if (matchingSubjects.length > 0) {
              courseSubjectMap.set(courseId, matchingSubjects);
            }
          }
        });
        
        // Create course-subject assignments
        additionalAssignments = Array.from(courseSubjectMap.entries()).map(([courseId, subjects]) => ({
          id: generateUniqueId(),
          courseId,
          courseName: courses.find(c => c.id === courseId)?.name || '',
          subjects
        }));
      }
    }
    
    setFormData({
      id: userToEdit.id,
      username: userToEdit.username,
      displayName: userToEdit.displayName,
      email: userToEdit.email || '',
      role: userToEdit.role,
      activeCourseIds: coursesToSet,
      password: userToEdit.password,
      assignedTeacherId: userToEdit.assignedTeacherId,
      teachingSubjects: mainCourseSubjects,
      selectedCourseId: mainCourseId,
      courseSubjectAssignments: additionalAssignments
    });
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingUser(null);
    setFormData({
      username: '',
      displayName: '',
      email: '',
      role: 'student',
      activeCourseIds: [],
      password: '',
      assignedTeacherId: undefined,
      teachingSubjects: [],
      selectedCourseId: undefined,
      courseSubjectAssignments: []
    });
  };

  const handleCourseToggle = (courseName: string, checked: boolean) => {
    // Find the course ID for this course name
    const courseId = courses.find(c => c.name === courseName)?.id;
    if (!courseId) {
      console.error(`Course ID not found for course name: ${courseName}`);
      return;
    }
    
    if (formData.role === 'student') {
      // Students can only be in ONE course at a time
      if (checked) {
        setFormData(prev => ({
          ...prev,
          activeCourseIds: [courseId], // Replace with only this course ID
          assignedTeacherId: undefined // Reset teacher assignment when course changes
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          activeCourseIds: [], // Remove from all courses
          assignedTeacherId: undefined // Remove teacher assignment
        }));
      }
    } else {
      // Teachers can be in multiple courses
      if (checked) {
        setFormData(prev => ({
          ...prev,
          activeCourseIds: [...prev.activeCourseIds, courseId]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          activeCourseIds: prev.activeCourseIds.filter(c => c !== courseId)
        }));
      }
    }
  };

  const handleSubjectToggle = (subject: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        teachingSubjects: [...(prev.teachingSubjects || []), subject]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        teachingSubjects: (prev.teachingSubjects || []).filter(s => s !== subject)
      }));
    }
  };

  const handleCourseSelection = (courseName: string) => {
    // Find the course ID for this course name
    const courseId = courses.find(c => c.name === courseName)?.id;
    if (!courseId) {
      console.error(`Course ID not found for course name: ${courseName}`);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      selectedCourseId: courseId, // Use selectedCourseId
      activeCourseIds: [courseId], // Use activeCourseIds and auto-select the course ID
      teachingSubjects: [] // Reset subjects when course changes
    }));
  };

  // New functions for handling course-subject assignments
  const addCourseAssignment = () => {
    const newAssignment: CourseSubjectAssignment = {
      id: generateUniqueId(),
      courseId: '',
      courseName: '',
      subjects: []
    };
    
    setFormData(prev => ({
      ...prev,
      courseSubjectAssignments: [...(prev.courseSubjectAssignments || []), newAssignment]
    }));
  };

  const removeCourseAssignment = (assignmentId: string) => {
    setFormData(prev => ({
      ...prev,
      courseSubjectAssignments: (prev.courseSubjectAssignments || []).filter(a => a.id !== assignmentId)
    }));
  };

  const updateCourseAssignment = (assignmentId: string, courseId: string, courseName: string) => {
    setFormData(prev => ({
      ...prev,
      courseSubjectAssignments: (prev.courseSubjectAssignments || []).map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, courseId, courseName, subjects: [] } // Reset subjects when course changes
          : assignment
      )
    }));
  };

  const updateAssignmentSubjects = (assignmentId: string, subjects: string[]) => {
    setFormData(prev => ({
      ...prev,
      courseSubjectAssignments: (prev.courseSubjectAssignments || []).map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, subjects }
          : assignment
      )
    }));
  };

  const toggleSubjectInAssignment = (assignmentId: string, subject: string, checked: boolean) => {
    const assignment = formData.courseSubjectAssignments?.find(a => a.id === assignmentId);
    if (!assignment) return;

    const currentSubjects = assignment.subjects || [];
    const newSubjects = checked 
      ? [...currentSubjects, subject]
      : currentSubjects.filter(s => s !== subject);

    updateAssignmentSubjects(assignmentId, newSubjects);
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'teacher': return 'default';
      case 'student': return 'outline'; // Will be styled with custom green
      default: return 'outline';
    }
  };

  const getRoleBadgeCustomClass = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30';
      case 'student': return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30';
      default: return '';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'admin': return translate('adminOption');
      case 'teacher': return translate('teacherOption');
      case 'student': return translate('studentOption');
      default: return role;
    }
  };

  // Function to get students assigned to a specific teacher
  const getStudentsForTeacher = (teacherData: ExtendedUser) => {
    if (teacherData.role !== 'teacher' || !teacherData.id) return [];
    
    return users.filter(user => 
      user.role === 'student' && 
      user.assignedTeacherId === teacherData.id // Compare with teacher's ID
    );
  };

  // Function to get available students (those not assigned to any teacher)
  const getAvailableStudentsForTeacher = (teacherData: ExtendedUser) => {
    if (teacherData.role !== 'teacher') return [];
    
    return users.filter(user => 
      user.role === 'student' && 
      !user.assignedTeacherId && // Only students with no teacher assignment
      user.activeCourses.some(courseId => teacherData.activeCourses.includes(courseId)) // Student has a course that the teacher teaches
    );
  };

  // Function to get students assigned to other teachers (for potential transfer)
  const getStudentsInOtherCourses = (teacherData: ExtendedUser) => {
    if (teacherData.role !== 'teacher' || !teacherData.id) return [];
    
    return users.filter(user => 
      user.role === 'student' && 
      user.assignedTeacherId &&
      user.assignedTeacherId !== teacherData.id && // Different teacher
      user.activeCourses.some(courseId => teacherData.activeCourses.includes(courseId)) // Student has a course that the teacher teaches
    );
  };

  // Function to add student to specific teacher (removes from other teachers first)
  const addStudentToTeacher = (studentId: string, teacherId: string, courseId: string) => {
    const teacher = users.find(u => u.id === teacherId && u.role === 'teacher');
    // Ensure teacher.activeCourses (now course IDs) includes the target courseId
    if (!teacher || !teacher.activeCourses.includes(courseId)) {
      toast({
        title: "Error",
        description: translate('teacherDoesntTeachCourse'), // This translation might need adjustment if it mentions course name
        variant: 'destructive'
      });
      return;
    }

    const updatedUsers = users.map(user => {
      if (user.id === studentId && user.role === 'student') {
        return {
          ...user,
          activeCourses: [courseId], // Student has one course (ID)
          assignedTeacherId: teacherId // Student assigned to specific teacher ID
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    // No actualizamos localStorage aquí, se hará al presionar "Guardar cambios"
    
    const student = users.find(u => u.id === studentId);
    const hadPreviousTeacher = student?.assignedTeacherId;
    const courseName = courses.find(c => c.id === courseId)?.name || courseId;
    
    toast({
      title: translate('success'),
      description: (hadPreviousTeacher 
        ? `${translate('studentTransferredTo')} ${translate('teacherTitle')} ${teacher.displayName} - ${courseName}`
        : `${translate('studentAssignedTo')} ${translate('teacherTitle')} ${teacher.displayName} - ${courseName}`) +
        `. ${translate('saveChangesToApply')}`,
    });
  };

  // Function to remove student from teacher (removes completely)
  const removeStudentFromTeacher = (studentId: string) => {
    const updatedUsers = users.map(user => {
      if (user.id === studentId && user.role === 'student') {
        return {
          ...user,
          activeCourses: [], // Remove from all courses (course IDs)
          assignedTeacherId: undefined // Remove teacher assignment ID
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    // No actualizamos localStorage aquí, se hará al presionar "Guardar cambios"
    
    toast({
      title: translate('success'),
      description: translate('studentRemovedFromTeacher') + `. ${translate('saveChangesToApply')}`,
    });
  };

  // Function to get all teachers that teach a specific course (now by course ID)
  const getTeachersForCourse = (courseId: string) => {
    if (!courseId) return [];
    return users.filter(user => 
      user.role === 'teacher' && 
      user.activeCourses.includes(courseId) // activeCourses now stores course IDs
    );
  };

  // Función para obtener la abreviatura de 3 letras para cada asignatura
  const getSubjectAbbreviation = (subject: string): string => {
    // Mapeo de asignaturas a sus abreviaturas de 3 letras en mayúsculas
    const abbreviations: Record<string, string> = {
      'Matemáticas': 'MAT',
      'Lenguaje y Comunicación': 'LEN',
      'Historia, Geografía y Ciencias Sociales': 'HIS',
      'Ciencias Naturales': 'CNT',
      'Inglés': 'ING',
      'Educación Física': 'EDF',
      'Artes Visuales': 'ART',
      'Música': 'MUS',
      'Tecnología': 'TEC',
      'Orientación': 'ORI',
      'Religión': 'REL',
      'Filosofía': 'FIL',
      'Física': 'FIS',
      'Química': 'QUI',
      'Biología': 'BIO'
    };
    
    // Si la asignatura está en nuestro mapeo, devolver la abreviatura
    if (subject in abbreviations) {
      return abbreviations[subject];
    }
    
    // Si no, tomar las primeras 3 letras y convertirlas a mayúsculas
    return subject.substring(0, 3).toUpperCase();
  };

  // Función para obtener el color característico de cada asignatura
  const getSubjectColors = (subject: string): string => {
    const colors: Record<string, string> = {
      'Matemáticas': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
      'Lenguaje y Comunicación': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
      'Historia, Geografía y Ciencias Sociales': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
      'Ciencias Naturales': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
      'Inglés': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
      'Educación Física': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
      'Artes Visuales': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700',
      'Música': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700',
      'Tecnología': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700',
      'Orientación': 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700',
      'Religión': 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700',
      'Filosofía': 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700',
      'Física': 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700',
      'Química': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
      'Biología': 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-700'
    };
    
    return colors[subject] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700';
  };

  // Función para obtener las asignaturas que un profesor enseña en un curso específico
  const getTeacherSubjectsForCourse = (teacherData: ExtendedUser, courseId: string): string[] => {
    if (!teacherData || teacherData.role !== 'teacher') return [];
    
    const course = courses.find(c => c.id === courseId);
    if (!course) return [];
    
    // Si el profesor tiene courseSubjectAssignments (nueva estructura)
    if (teacherData.courseSubjectAssignments && teacherData.courseSubjectAssignments.length > 0) {
      const assignment = teacherData.courseSubjectAssignments.find(a => a.courseId === courseId);
      return assignment?.subjects || [];
    }
    
    // Fallback: Si solo tiene el curso principal y teachingSubjects (estructura anterior)
    if (teacherData.selectedCourseId === courseId && teacherData.teachingSubjects) {
      return teacherData.teachingSubjects;
    }
    
    // Si no hay asignaciones específicas, devolver todas las asignaturas disponibles para el curso
    // (esto es para compatibilidad con datos existentes)
    if (teacherData.activeCourses?.includes(courseId) && teacherData.teachingSubjects) {
      return teacherData.teachingSubjects;
    }
    
    return [];
  };

  // Function to get the current course and teacher for a student (using IDs)
  const getStudentCurrentAssignment = (studentId: string) => {
    const student = users.find(u => u.id === studentId);
    if (!student || student.role !== 'student' || !student.assignedTeacherId || !student.activeCourses || student.activeCourses.length === 0) {
      return null;
    }
    
    const currentCourseId = student.activeCourses[0]; // Student has one course ID
    const currentCourse = courses.find(c => c.id === currentCourseId);
    const currentTeacher = users.find(u => u.id === student.assignedTeacherId);
    
    return {
      course: currentCourse, // This is now a Course object
      teacher: currentTeacher // This is an ExtendedUser object (teacher)
    };
  };

  if (!user || !isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Estado para rastrear si hay cambios pendientes por guardar
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Efecto para detectar cambios en los usuarios
  useEffect(() => {
    const storedUsers = localStorage.getItem('smart-student-users');
    if (storedUsers && users.length > 0) {
      const storedUsersArray = JSON.parse(storedUsers);
      // Comparar usuarios almacenados con los actuales
      const areEqual = JSON.stringify(storedUsersArray) === JSON.stringify(users);
      setHasUnsavedChanges(!areEqual);
    }
  }, [users]);

  // Function to clean up duplicate users
  return (
    <div className="space-y-6">
      {/* Mensaje de advertencia sobre cambios no guardados */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 dark:bg-amber-900/20">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-4 4a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700 dark:text-amber-200">
                <strong>{translate('unsavedChangesMessage')}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{translate('userManagementPageTitle')}</h1>
          <p className="text-muted-foreground">{translate('userManagementPageDescription')}</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white border-0 transition-all duration-200 hover:shadow-lg"
            onClick={() => {
              const confirmed = window.confirm(translate('resetConfirmMessage'));
              
              if (confirmed) {
                const secondConfirm = window.prompt(translate('resetConfirmType'));
                
                if (secondConfirm === translate('resetTypeText')) {
                  try {
                    // Lista de claves a eliminar
                    const keysToRemove = [
                      'smart-student-tasks',
                      'smart-student-task-comments',
                      'smart-student-notifications',
                      'smart-student-evaluations',
                      'smart-student-task-assignments',
                      'smart-student-submissions',
                      'smart-student-grades',
                      'smart-student-teacher-feedback',
                      'smart-student-task-notifications',
                      'notification-counts',
                      'task-notification-counts'
                    ];
                    
                    // Eliminar datos
                    keysToRemove.forEach(key => {
                      localStorage.removeItem(key);
                    });
                    
                    // Reinicializar con arrays vacíos
                    localStorage.setItem('smart-student-tasks', '[]');
                    localStorage.setItem('smart-student-task-comments', '[]');
                    localStorage.setItem('smart-student-notifications', '[]');
                    localStorage.setItem('smart-student-evaluations', '[]');
                    
                    // Disparar eventos para actualizar la UI
                    window.dispatchEvent(new Event('storage'));
                    window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
                    window.dispatchEvent(new CustomEvent('notificationSyncCompleted'));
                    window.dispatchEvent(new CustomEvent('commentsUpdated'));
                    document.dispatchEvent(new Event('commentsUpdated'));
                    document.dispatchEvent(new CustomEvent('notificationsCleared'));
                    
                    toast({
                      title: translate('resetSuccessTitle'),
                      description: translate('resetSuccessDesc'),
                    });
                    
                    // Recargar página después de 2 segundos
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                    
                  } catch (error) {
                    toast({
                      title: translate('resetErrorTitle'),
                      description: translate('resetErrorDesc'),
                      variant: "destructive"
                    });
                  }
                } else {
                  toast({
                    title: translate('resetCancelledTitle'),
                    description: translate('resetCancelledDesc'),
                    variant: "destructive"
                  });
                }
              }
            }}
          >
            🗑️ {translate('resetCompleteButton')}
          </Button>
          <Button 
            className={`transition-all duration-200 hover:shadow-lg text-white border-0 ${hasUnsavedChanges ? 'bg-amber-600 hover:bg-amber-700 animate-pulse' : 'bg-teal-600 hover:bg-teal-700'}`}
            onClick={() => {
              syncAllChanges();
              setHasUnsavedChanges(false);
            }}
          >
            {hasUnsavedChanges ? `¡${translate('saveChangesButton')}!` : translate('saveChangesButton')}
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all duration-200 hover:shadow-lg"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {translate('userManagementCreateUser')}
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Administradores Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-red-600" />
            {translate('userManagementAdministrators')}
          </h2>
          <div className="grid gap-4">
            {users.filter(u => u.role === 'admin').map((userData) => (
              <Card key={userData.id}> {/* Use ID for key */}
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-red-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {userData.displayName}
                          </p>
                          <Badge variant={getRoleBadgeVariant(userData.role)} className={getRoleBadgeCustomClass(userData.role)}>
                            {getRoleDisplayName(userData.role)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">@{userData.username}</p>
                        {userData.email && (
                          <p className="text-xs text-muted-foreground">{userData.email}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          <BookOpen className="w-3 h-3 inline mr-1" />
                          {translate('accessToAllCourses')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(userData)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                       {userData.id !== 'admin' && ( // Check against ID 'admin'
                        <Button
                          variant="outline"
                          size="sm"
                           onClick={() => handleDeleteUser(userData.id)} // Pass ID
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Profesores Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            {translate('userManagementTeachers')}
          </h2>
          <div className="grid gap-4">
            {users.filter(u => u.role === 'teacher').map((userData) => {
              const assignedStudents = getStudentsForTeacher(userData); // Already updated to use ID
              const availableStudents = getAvailableStudentsForTeacher(userData); // Already updated
              const studentsInOtherCourses = getStudentsInOtherCourses(userData); // Already updated
              const isExpanded = expandedTeachers[userData.id] || false; // Use ID for expanded state key

              return (
                <Card key={userData.id}> {/* Use ID for key */}
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {userData.displayName}
                            </p>
                            <Badge variant={getRoleBadgeVariant(userData.role)} className={getRoleBadgeCustomClass(userData.role)}>
                              {getRoleDisplayName(userData.role)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">@{userData.username}</p>
                          {userData.email && (
                            <p className="text-xs text-muted-foreground">{userData.email}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-xs text-muted-foreground">
                              <BookOpen className="w-3 h-3 inline mr-1" />
                              {/* Display course names by mapping IDs to names from 'courses' state */}
                              {(userData.activeCourses || []).map(courseId => courses.find(c => c.id === courseId)?.name || courseId).join(', ')}
                            </p>
                            {userData.teachingSubjects && userData.teachingSubjects.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-muted-foreground">📚</span>
                                <div className="flex flex-wrap gap-1">
                                  {userData.teachingSubjects.map((subject) => (
                                    <Badge 
                                      key={subject} 
                                      variant="outline" 
                                      className={`text-xs px-1.5 py-0.5 h-5 font-medium ${getSubjectColors(subject)}`}
                                    >
                                      {getSubjectAbbreviation(subject)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-blue-600">
                              <Users className="w-3 h-3 inline mr-1" />
                              {assignedStudents.length} {translate('userManagementAssignedStudents')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedTeachers(prev => ({ // Use user ID for key in expandedTeachers
                            ...prev,
                            [userData.id]: !isExpanded
                          }))}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(userData)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(userData.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Teacher View - Students by Course */}
                    {isExpanded && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-4">
                          {userData.activeCourses.map(courseId => {
                            const course = courses.find(c => c.id === courseId);
                            if (!course) return null;
                            
                            // Only show students assigned to THIS specific teacher for this course
                            const studentsInThisCourse = assignedStudents.filter(student => 
                              student.activeCourses.includes(courseId) && 
                              student.assignedTeacherId === userData.id
                            );

                            return (
                              <div key={courseId} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-sm text-foreground flex items-center">
                                      <BookOpen className="w-4 h-4 mr-2" />
                                      {course.name} - {userData.displayName}
                                    </h4>
                                    <Badge variant="outline" className="ml-2">
                                      {studentsInThisCourse.length} {translate('userManagementStudentsCount')}
                                    </Badge>
                                  </div>
                                  
                                  {/* Mostrar asignaturas específicas para este curso */}
                                  {(() => {
                                    const subjectsForCourse = getTeacherSubjectsForCourse(userData, courseId);
                                    return subjectsForCourse.length > 0 && (
                                      <div className="flex items-center space-x-1">
                                        <div className="flex flex-wrap gap-1">
                                          {subjectsForCourse.map((subject) => (
                                            <Badge 
                                              key={subject} 
                                              variant="outline" 
                                              className={`text-xs px-2 py-1 h-6 font-medium ${getSubjectColors(subject)}`}
                                            >
                                              {getSubjectAbbreviation(subject)}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Current students in this course with this teacher */}
                                {studentsInThisCourse.length > 0 ? (
                                  <div className="space-y-2 mb-3">
                                    {studentsInThisCourse.map(student => (
                                      <div key={student.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border">
                                        <div>
                                          <span className="text-sm font-medium">{student.displayName}</span>
                                          <span className="text-xs text-muted-foreground ml-2">@{student.username}</span>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeStudentFromTeacher(student.id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <UserMinus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground mb-3">{translate('userManagementNoStudentsAssigned')}</p>
                                )}

                                {/* Add available students (not assigned to any teacher) */}
                                {(() => {
                                  const availableStudentsForCourse = availableStudents.filter(student => 
                                    student.activeCourses.includes(courseId)
                                  );
                                  return availableStudentsForCourse.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <p className="text-xs text-muted-foreground mb-2">{translate('userManagementAvailableStudents')}</p>
                                      <div className="flex gap-2 flex-wrap">
                                        {availableStudentsForCourse.map(student => (                                        <Button
                                          key={student.id}
                                          variant="outline"
                                          size="sm"
                                          onClick={() => addStudentToTeacher(student.id, userData.id, courseId)}
                                          className="text-green-600 hover:text-green-700"
                                        >
                                          <UserPlus className="w-3 h-3 mr-1" />
                                          {student.displayName}
                                        </Button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Transfer students from other teachers */}
                                {(() => {
                                  const studentsInOtherCoursesForCourse = studentsInOtherCourses.filter(student => 
                                    student.activeCourses.includes(courseId)
                                  );
                                  return studentsInOtherCoursesForCourse.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-yellow-200">
                                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
                                        {translate('transferStudentFrom')}
                                      </p>
                                      <div className="flex gap-2 flex-wrap">
                                        {studentsInOtherCoursesForCourse.map(student => {
                                          const currentAssignment = getStudentCurrentAssignment(student.id);
                                          return (                                          <Button
                                            key={student.id}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addStudentToTeacher(student.id, userData.id, courseId)}
                                            className="text-orange-600 hover:text-orange-700 border-orange-200"
                                            title={`${translate('transferFrom')} ${translate('teacherTitle')} ${currentAssignment?.teacher?.displayName} - ${currentAssignment?.course?.name}`}
                                          >
                                            <UserPlus className="w-3 h-3 mr-1" />
                                            {student.displayName}
                                            <span className="text-xs ml-1 opacity-70">
                                              ({translate('teacherTitle')} {currentAssignment?.teacher?.displayName})
                                            </span>
                                          </Button>
                                          );
                                        })}
                                      </div>
                                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 italic">
                                        {translate('studentWillBeRemoved')}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Estudiantes Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-600" />
            {translate('userManagementStudents')}
          </h2>
          <div className="grid gap-4">
            {users.filter(u => u.role === 'student').map((userData) => {
              const currentAssignment = getStudentCurrentAssignment(userData.id);

              return (
                <Card key={userData.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {userData.displayName}
                            </p>
                            <Badge variant={getRoleBadgeVariant(userData.role)} className={getRoleBadgeCustomClass(userData.role)}>
                              {getRoleDisplayName(userData.role)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">@{userData.username}</p>
                          {userData.email && (
                            <p className="text-xs text-muted-foreground">{userData.email}</p>
                          )}
                          <div className="mt-1">
                            {currentAssignment ? (
                              <>
                                <div className="flex items-center space-x-4">
                                  <p className="text-xs text-muted-foreground">
                                    <BookOpen className="w-3 h-3 inline mr-1" />
                                    {currentAssignment.course?.name || translate('courseNotFound')}
                                  </p>
                                  {currentAssignment.teacher && (
                                    <p className="text-xs text-blue-600">
                                      <Users className="w-3 h-3 inline mr-1" />
                                      {translate('teacherTitle')} {currentAssignment.teacher.displayName}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {currentAssignment.course?.name && getSubjectsForCourse(currentAssignment.course.name).map(subject => (
                                    <Badge 
                                      key={`student-${userData.id}-${subject}`} 
                                      variant="outline"
                                      className={`text-xs px-2 py-0.5 h-5 font-medium ${getSubjectColors(subject)}`}
                                      title={subject}
                                    >
                                      {getSubjectAbbreviation(subject)}
                                    </Badge>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-yellow-600">
                                <BookOpen className="w-3 h-3 inline mr-1" />
                                {translate('noCourseAssigned')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(userData)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(userData.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create/Edit User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? translate('editUser') : translate('createNewUser')}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? translate('editUserDescription') : translate('createUserDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                {translate('userLabel')}
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="col-span-3"
                disabled={!!editingUser}
                placeholder={translate('usernamePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayName" className="text-right">
                {translate('nameLabel')}
              </Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="col-span-3"
                placeholder={translate('fullNamePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                {translate('emailLabel')}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
                placeholder={translate('emailPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {translate('passwordLabel')}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="col-span-3"
                placeholder={translate('passwordPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                {translate('roleLabel')}
              </Label>
              <Select value={formData.role} onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={translate('selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{translate('studentOption')}</SelectItem>
                  <SelectItem value="teacher">{translate('teacherOption')}</SelectItem>
                  <SelectItem value="admin">{translate('adminOption')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role !== 'admin' && (
              <>
                
                {/* Course selection for teachers - STEP 1 */}
                {formData.role === 'teacher' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacherCourse" className="text-right">
                      {translate('mainCourseLabel')}
                    </Label>
                    <Select 
                      value={formData.selectedCourseId ? courses.find(c => c.id === formData.selectedCourseId)?.name || '' : ''} 
                      onValueChange={(value) => handleCourseSelection(value)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={translate('selectCourseFirst')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCourses.map(course => (
                          <SelectItem key={course} value={course}>
                            {course}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Subject selection for teachers - STEP 2 (only show after course selection) */}
                {formData.role === 'teacher' && formData.selectedCourseId && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">
                      {translate('subjectsLabel')}
                    </Label>
                    <div className="col-span-3 space-y-2">
                      <p className="text-xs text-muted-foreground mb-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                        {translate('availableSubjectsFor')} <strong>{formData.selectedCourseId ? courses.find(c => c.id === formData.selectedCourseId)?.name : ''}</strong>
                      </p>
                      {formData.selectedCourseId && getSubjectsForSpecificCourse(courses.find(c => c.id === formData.selectedCourseId)?.name || '').map((subject) => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={subject}
                            checked={formData.teachingSubjects?.includes(subject) || false}
                            onCheckedChange={(checked) => handleSubjectToggle(subject, checked as boolean)}
                          />
                          <Label htmlFor={subject} className="text-sm">
                            {subject}
                          </Label>
                        </div>
                      ))}
                      
                      {/* Additional courses with independent course-subject assignments */}
                      <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-muted-foreground">
                            {translate('additionalCoursesSubjects')}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCourseAssignment}
                            className="h-7 px-2 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {translate('courseLabel')}
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          {(formData.courseSubjectAssignments || []).map((assignment) => (
                            <div key={assignment.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                              <div className="flex items-start gap-2 mb-2">
                                <div className="flex-1">
                                  <Select 
                                    value={assignment.courseName} 
                                    onValueChange={(courseName) => {
                                      const courseId = courses.find(c => c.name === courseName)?.id || '';
                                      updateCourseAssignment(assignment.id, courseId, courseName);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder={translate('selectCourseForm')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableCourses
                                        .filter(course => {
                                          // Filter out the main course and already selected courses
                                          const mainCourseName = courses.find(c => c.id === formData.selectedCourseId)?.name;
                                          const selectedCourses = (formData.courseSubjectAssignments || [])
                                            .filter(a => a.id !== assignment.id)
                                            .map(a => a.courseName);
                                          return course !== mainCourseName && !selectedCourses.includes(course);
                                        })
                                        .map(course => (
                                          <SelectItem key={course} value={course}>
                                            {course}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCourseAssignment(assignment.id)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {assignment.courseName && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {translate('subjectsFor')} {assignment.courseName}:
                                  </p>
                                  <div className="grid grid-cols-1 gap-1">
                                    {getSubjectsForSpecificCourse(assignment.courseName).map((subject) => (
                                      <div key={subject} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`${assignment.id}-${subject}`}
                                          checked={assignment.subjects.includes(subject)}
                                          onCheckedChange={(checked) => toggleSubjectInAssignment(assignment.id, subject, checked as boolean)}
                                        />
                                        <Label htmlFor={`${assignment.id}-${subject}`} className="text-xs">
                                          {subject}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Traditional course selection for students and admins */}
                {formData.role !== 'teacher' && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">
                      {translate('coursesLabel')}
                    </Label>
                    <div className="col-span-3 space-y-2">
                      {formData.role === 'student' && (
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                          {formData.activeCourseIds.length > 0 ? (
                            <>
                              <p className="text-xs text-muted-foreground w-full mb-1">
                                {translate('userManagementStudentSubjects')}:
                              </p>
                              {formData.activeCourseIds.flatMap(course =>
                                getSubjectsForCourse(course).map(subject => (
                                  <Badge 
                                    key={`${course}-${subject}`} 
                                    variant="outline"
                                    className={`text-xs px-2 py-1 h-5 font-medium ${getSubjectColors(subject)}`}
                                    title={subject}
                                  >
                                    {getSubjectAbbreviation(subject)}
                                  </Badge>
                                ))
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {translate('userManagementStudentOneCourseInfo')}
                            </p>
                          )}
                        </div>
                      )}
                      {availableCourses.map((course) => {
                        const courseId = courses.find(c => c.name === course)?.id;
                        return (
                          <div key={course} className="flex items-center space-x-2">
                            <Checkbox
                              id={course}
                              checked={courseId ? formData.activeCourseIds.includes(courseId) : false}
                              onCheckedChange={(checked) => handleCourseToggle(course, checked as boolean)}
                            />
                            <Label htmlFor={course} className="text-sm">
                              {course}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Teacher selection for students */}
                {formData.role === 'student' && formData.activeCourseIds.length > 0 && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignedTeacher" className="text-right">
                      {translate('teacherLabel')}
                    </Label>
                    <Select 
                      value={formData.assignedTeacherId || ''} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTeacherId: value }))}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={translate('selectTeacher')} />
                      </SelectTrigger>
                      <SelectContent>
                        {getTeachersForCourse(formData.activeCourseIds[0]).map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.displayName} - {courses.find(c => c.id === formData.activeCourseIds[0])?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {translate('cancelButton')}
            </Button>
            <Button onClick={handleSaveUser}>
              {editingUser ? translate('updateButton') : translate('createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
