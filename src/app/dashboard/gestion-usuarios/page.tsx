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
import { Users, Plus, Edit, Trash2, Shield, BookOpen, ChevronDown, ChevronRight, UserPlus, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, UserRole, TeacherSubjectAssignment } from '@/contexts/auth-context';
import { getAllSubjects, getSubjectsForCourse } from '@/lib/books-data';

// Extended User interface with teacher assignment
interface ExtendedUser extends User {
  password: string;
  assignedTeacher?: string; // For students: username of their assigned teacher
  teachingSubjects?: string[]; // For teachers: subjects they teach (simplified version)
}

// Simulate user database management
interface UserFormData {
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  activeCourses: string[];
  password: string;
  assignedTeacher?: string; // For students
  teachingSubjects?: string[]; // For teachers
  selectedCourse?: string; // For dynamic subject loading
}

const availableCourses = [
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
  const { user, isAdmin } = useAuth();
  const { translate } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [expandedTeachers, setExpandedTeachers] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    displayName: '',
    email: '',
    role: 'student',
    activeCourses: [],
    password: '',
    assignedTeacher: undefined,
    teachingSubjects: [],
    selectedCourse: undefined
  });

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

  // Load users from localStorage (simulated database)
  useEffect(() => {
    const loadUsers = () => {
      const storedUsers = localStorage.getItem('smart-student-users');
      if (storedUsers) {
        try {
          setUsers(JSON.parse(storedUsers));
        } catch (error) {
          console.error('Error loading users:', error);
          initializeDefaultUsers();
        }
      } else {
        initializeDefaultUsers();
      }
    };

    const initializeDefaultUsers = () => {
      const defaultUsers: ExtendedUser[] = [
        {
          username: 'admin',
          displayName: 'Administrador del Sistema',
          email: 'admin@smartstudent.com',
          role: 'admin' as UserRole,
          activeCourses: [],
          password: '1234'
        },
        {
          username: 'felipe',
          displayName: 'Felipe Estudiante',
          email: 'felipe@student.com',
          role: 'student' as UserRole,
          activeCourses: ['4to Básico'],
          assignedTeacher: 'jorge', // Felipe is assigned to Jorge
          password: '1234'
        },
        {
          username: 'jorge',
          displayName: 'Jorge Profesor',
          email: 'jorge@teacher.com',
          role: 'teacher' as UserRole,
          activeCourses: ['4to Básico', '5to Básico'],
          teachingSubjects: ['Matemáticas', 'Lenguaje y Comunicación'],
          password: '1234'
        },
        {
          username: 'maria',
          displayName: 'María Estudiante',
          email: 'maria@student.com',
          role: 'student' as UserRole,
          activeCourses: ['1ro Básico'],
          assignedTeacher: 'carlos', // Maria is assigned to Carlos
          password: '1234'
        },
        {
          username: 'carlos',
          displayName: 'Carlos Profesor',
          email: 'carlos@teacher.com',
          role: 'teacher' as UserRole,
          activeCourses: ['1ro Básico', '2do Básico'],
          teachingSubjects: ['Ciencias Naturales', 'Historia, Geografía y Ciencias Sociales', 'Matemáticas', 'Lenguaje y Comunicación'],
          password: '1234'
        },
        // Add another teacher for the same course to demonstrate independence
        {
          username: 'ana',
          displayName: 'Ana Profesora',
          email: 'ana@teacher.com',
          role: 'teacher' as UserRole,
          activeCourses: ['4to Básico'], // Same course as Jorge but independent
          teachingSubjects: ['Matemáticas'],
          password: '1234'
        },
        // Add more students to demonstrate the separation
        {
          username: 'luis',
          displayName: 'Luis Estudiante',
          email: 'luis@student.com',
          role: 'student' as UserRole,
          activeCourses: ['4to Básico'],
          assignedTeacher: 'ana', // Luis is assigned to Ana (different from Felipe who is with Jorge)
          password: '1234'
        },
        {
          username: 'sofia',
          displayName: 'Sofía Estudiante', 
          email: 'sofia@student.com',
          role: 'student' as UserRole,
          activeCourses: [], // No assignment yet
          password: '1234'
        }
      ];
      setUsers(defaultUsers);
      localStorage.setItem('smart-student-users', JSON.stringify(defaultUsers));
    };

    loadUsers();
  }, []);

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
    if (formData.role === 'teacher' && (!formData.teachingSubjects || formData.teachingSubjects.length === 0)) {
      toast({
        title: "Error",
        description: "Los profesores deben tener al menos una asignatura asignada.",
        variant: 'destructive'
      });
      return;
    }

    // Validate student course assignment (only one course allowed)
    if (formData.role === 'student' && formData.activeCourses.length > 1) {
      toast({
        title: "Error",
        description: translate('userManagementStudentOneCourseRule'),
        variant: 'destructive'
      });
      return;
    }

    // Validate student teacher assignment
    if (formData.role === 'student' && formData.activeCourses.length > 0 && !formData.assignedTeacher) {
      toast({
        title: "Error",
        description: translate('userManagementSelectTeacher'),
        variant: 'destructive'
      });
      return;
    }

    let updatedUsers;
    if (editingUser) {
      // Update existing user
      updatedUsers = users.map(u => {
        if (u.username === editingUser.username) {
          return { ...formData };
        }
        return u;
      });
    } else {
      // Create new user
      const newUserData = { ...formData };
      
      // If this is a student being assigned to a course, ensure only one course
      if (newUserData.role === 'student' && newUserData.activeCourses.length > 0) {
        newUserData.activeCourses = [newUserData.activeCourses[0]];
      }
      
      updatedUsers = [...users, newUserData];
    }

    setUsers(updatedUsers);
    localStorage.setItem('smart-student-users', JSON.stringify(updatedUsers));

    toast({
      title: "Éxito",
      description: editingUser ? "Usuario actualizado correctamente." : "Usuario creado correctamente.",
    });

    handleCloseDialog();
  };

  const handleDeleteUser = (username: string) => {
    if (username === 'admin') {
      toast({
        title: "Error",
        description: "No se puede eliminar el usuario administrador.",
        variant: 'destructive'
      });
      return;
    }

    const updatedUsers = users.filter(u => u.username !== username);
    setUsers(updatedUsers);
    localStorage.setItem('smart-student-users', JSON.stringify(updatedUsers));

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
    
    setFormData({
      username: userToEdit.username,
      displayName: userToEdit.displayName,
      email: userToEdit.email || '',
      role: userToEdit.role,
      activeCourses: coursesToSet,
      password: userToEdit.password,
      assignedTeacher: userToEdit.assignedTeacher,
      teachingSubjects: userToEdit.teachingSubjects || [],
      selectedCourse: userToEdit.role === 'teacher' && userToEdit.activeCourses.length > 0 ? userToEdit.activeCourses[0] : undefined
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
      activeCourses: [],
      password: '',
      assignedTeacher: undefined,
      teachingSubjects: [],
      selectedCourse: undefined
    });
  };

  const handleCourseToggle = (course: string, checked: boolean) => {
    if (formData.role === 'student') {
      // Students can only be in ONE course at a time
      if (checked) {
        setFormData(prev => ({
          ...prev,
          activeCourses: [course], // Replace with only this course
          assignedTeacher: undefined // Reset teacher assignment when course changes
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          activeCourses: [], // Remove from all courses
          assignedTeacher: undefined // Remove teacher assignment
        }));
      }
    } else {
      // Teachers can be in multiple courses
      if (checked) {
        setFormData(prev => ({
          ...prev,
          activeCourses: [...prev.activeCourses, course]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          activeCourses: prev.activeCourses.filter(c => c !== course)
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

  const handleCourseSelection = (course: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCourse: course,
      activeCourses: [course], // Auto-select the course
      teachingSubjects: [] // Reset subjects when course changes
    }));
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
      case 'student': return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30';
      default: return '';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Profesor';
      case 'student': return 'Estudiante';
      default: return role;
    }
  };

  // Function to get students assigned to a specific teacher
  const getStudentsForTeacher = (teacherData: ExtendedUser) => {
    if (teacherData.role !== 'teacher') return [];
    
    return users.filter(user => 
      user.role === 'student' && 
      user.assignedTeacher === teacherData.username
    );
  };

  // Function to get available students (those not assigned to any teacher)
  const getAvailableStudentsForTeacher = (teacherData: ExtendedUser) => {
    if (teacherData.role !== 'teacher') return [];
    
    return users.filter(user => 
      user.role === 'student' && 
      !user.assignedTeacher // Only students with no teacher assignment
    );
  };

  // Function to get students assigned to other teachers (for potential transfer)
  const getStudentsInOtherCourses = (teacherData: ExtendedUser) => {
    if (teacherData.role !== 'teacher') return [];
    
    return users.filter(user => 
      user.role === 'student' && 
      user.assignedTeacher && 
      user.assignedTeacher !== teacherData.username
    );
  };

  // Function to add student to specific teacher (removes from other teachers first)
  const addStudentToTeacher = (studentUsername: string, teacherUsername: string, course: string) => {
    const teacher = users.find(u => u.username === teacherUsername && u.role === 'teacher');
    if (!teacher || !teacher.activeCourses.includes(course)) {
      toast({
        title: "Error",
        description: "El profesor no enseña este curso.",
        variant: 'destructive'
      });
      return;
    }

    const updatedUsers = users.map(user => {
      if (user.username === studentUsername && user.role === 'student') {
        // Assign student to specific teacher and course
        return {
          ...user,
          activeCourses: [course], // Student has one course
          assignedTeacher: teacherUsername // Student assigned to specific teacher
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem('smart-student-users', JSON.stringify(updatedUsers));
    
    const student = users.find(u => u.username === studentUsername);
    const hadPreviousTeacher = student?.assignedTeacher;
    
    toast({
      title: "Éxito",
      description: hadPreviousTeacher 
        ? `Estudiante transferido al ${translate('teacherTitle')} ${teacher.displayName} - ${course}` 
        : `Estudiante asignado al ${translate('teacherTitle')} ${teacher.displayName} - ${course}`,
    });
  };

  // Function to remove student from teacher (removes completely)
  const removeStudentFromTeacher = (studentUsername: string) => {
    const updatedUsers = users.map(user => {
      if (user.username === studentUsername && user.role === 'student') {
        return {
          ...user,
          activeCourses: [], // Remove from all courses
          assignedTeacher: undefined // Remove teacher assignment
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem('smart-student-users', JSON.stringify(updatedUsers));
    
    toast({
      title: "Éxito",
      description: "Estudiante removido del profesor",
    });
  };

  // Function to get all teachers that teach a specific course
  const getTeachersForCourse = (course: string) => {
    return users.filter(user => 
      user.role === 'teacher' && 
      user.activeCourses.includes(course)
    );
  };

  // Function to get the current course and teacher for a student
  const getStudentCurrentAssignment = (studentUsername: string) => {
    const student = users.find(u => u.username === studentUsername);
    if (!student || student.role !== 'student' || !student.assignedTeacher || student.activeCourses.length === 0) {
      return null;
    }
    
    const currentCourse = student.activeCourses[0]; // Should only have one course
    const currentTeacher = users.find(u => u.username === student.assignedTeacher);
    
    return {
      course: currentCourse,
      teacher: currentTeacher
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{translate('userManagementPageTitle')}</h1>
          <p className="text-muted-foreground">{translate('userManagementPageDescription')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {translate('userManagementCreateUser')}
        </Button>
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
              <Card key={userData.username}>
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
                          Acceso a todos los cursos
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
                      {userData.username !== 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(userData.username)}
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
              const assignedStudents = getStudentsForTeacher(userData);
              const availableStudents = getAvailableStudentsForTeacher(userData);
              const studentsInOtherCourses = getStudentsInOtherCourses(userData);
              const isExpanded = expandedTeachers[userData.username] || false;

              return (
                <Card key={userData.username}>
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
                              {userData.activeCourses.join(', ')}
                            </p>
                            {userData.teachingSubjects && userData.teachingSubjects.length > 0 && (
                              <p className="text-xs text-purple-600">
                                📚 {userData.teachingSubjects.join(', ')}
                              </p>
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
                          onClick={() => setExpandedTeachers(prev => ({
                            ...prev,
                            [userData.username]: !isExpanded
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
                          onClick={() => handleDeleteUser(userData.username)}
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
                          {userData.activeCourses.map(course => {
                            // Only show students assigned to THIS specific teacher for this course
                            const studentsInThisCourse = assignedStudents.filter(student => 
                              student.activeCourses.includes(course) && 
                              student.assignedTeacher === userData.username
                            );

                            return (
                              <div key={course} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                                <h4 className="font-medium text-sm text-foreground mb-3 flex items-center">
                                  <BookOpen className="w-4 h-4 mr-2" />
                                  {course} - {userData.displayName}
                                  <Badge variant="outline" className="ml-2">
                                    {studentsInThisCourse.length} {translate('userManagementStudentsCount')}
                                  </Badge>
                                </h4>

                                {/* Current students in this course with this teacher */}
                                {studentsInThisCourse.length > 0 ? (
                                  <div className="space-y-2 mb-3">
                                    {studentsInThisCourse.map(student => (
                                      <div key={student.username} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border">
                                        <div>
                                          <span className="text-sm font-medium">{student.displayName}</span>
                                          <span className="text-xs text-muted-foreground ml-2">@{student.username}</span>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeStudentFromTeacher(student.username)}
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
                                {availableStudents.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-muted-foreground mb-2">{translate('userManagementAvailableStudents')}</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {availableStudents.map(student => (
                                        <Button
                                          key={student.username}
                                          variant="outline"
                                          size="sm"
                                          onClick={() => addStudentToTeacher(student.username, userData.username, course)}
                                          className="text-green-600 hover:text-green-700"
                                        >
                                          <UserPlus className="w-3 h-3 mr-1" />
                                          {student.displayName}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Transfer students from other teachers */}
                                {studentsInOtherCourses.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-yellow-200">
                                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
                                      Transferir estudiante desde otro profesor:
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                      {studentsInOtherCourses.map(student => {
                                        const currentAssignment = getStudentCurrentAssignment(student.username);
                                        return (
                                          <Button
                                            key={student.username}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => addStudentToTeacher(student.username, userData.username, course)}
                                            className="text-orange-600 hover:text-orange-700 border-orange-200"
                                            title={`Transferir desde: ${translate('teacherTitle')} ${currentAssignment?.teacher?.displayName} - ${currentAssignment?.course}`}
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
                                      ⚠️ El estudiante será automáticamente removido de su profesor anterior
                                    </p>
                                  </div>
                                )}
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
              const currentAssignment = getStudentCurrentAssignment(userData.username);

              return (
                <Card key={userData.username}>
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
                              <div className="flex items-center space-x-4">
                                <p className="text-xs text-muted-foreground">
                                  <BookOpen className="w-3 h-3 inline mr-1" />
                                  {currentAssignment.course}
                                </p>
                                {currentAssignment.teacher && (
                                  <p className="text-xs text-blue-600">
                                    <Users className="w-3 h-3 inline mr-1" />
                                    {translate('teacherTitle')} {currentAssignment.teacher.displayName}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-yellow-600">
                                <BookOpen className="w-3 h-3 inline mr-1" />
                                Sin curso asignado
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
                          onClick={() => handleDeleteUser(userData.username)}
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
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Modifica la información del usuario.' : 'Completa la información para crear un nuevo usuario.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Usuario *
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="col-span-3"
                disabled={!!editingUser}
                placeholder="nombre_usuario"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayName" className="text-right">
                Nombre *
              </Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="col-span-3"
                placeholder="Nombre Completo"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Contraseña *
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="col-span-3"
                placeholder="Contraseña"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Rol *
              </Label>
              <Select value={formData.role} onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Estudiante</SelectItem>
                  <SelectItem value="teacher">Profesor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role !== 'admin' && (
              <>
                
                {/* Course selection for teachers - STEP 1 */}
                {formData.role === 'teacher' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacherCourse" className="text-right">
                      Curso Principal *
                    </Label>
                    <Select 
                      value={formData.selectedCourse || ''} 
                      onValueChange={(value) => handleCourseSelection(value)}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona primero el curso principal" />
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
                {formData.role === 'teacher' && formData.selectedCourse && (
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">
                      Asignaturas *
                    </Label>
                    <div className="col-span-3 space-y-2">
                      <p className="text-xs text-muted-foreground mb-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                        📚 Asignaturas disponibles para <strong>{formData.selectedCourse}</strong>
                      </p>
                      {getSubjectsForSpecificCourse(formData.selectedCourse).map((subject) => (
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
                      
                      {/* Additional courses option */}
                      <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-muted-foreground mb-2">
                          ¿Enseña en cursos adicionales?
                        </p>
                        <div className="space-y-2">
                          {availableCourses
                            .filter(course => course !== formData.selectedCourse)
                            .map((course) => (
                            <div key={course} className="flex items-center space-x-2">
                              <Checkbox
                                id={`additional-${course}`}
                                checked={formData.activeCourses.includes(course)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      activeCourses: [...prev.activeCourses, course]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      activeCourses: prev.activeCourses.filter(c => c !== course)
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={`additional-${course}`} className="text-xs text-muted-foreground">
                                {course}
                              </Label>
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
                      Cursos
                    </Label>
                    <div className="col-span-3 space-y-2">
                      {formData.role === 'student' && (
                        <p className="text-xs text-muted-foreground mb-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                          {translate('userManagementStudentOneCourseInfo')}
                        </p>
                      )}
                      {availableCourses.map((course) => (
                        <div key={course} className="flex items-center space-x-2">
                          <Checkbox
                            id={course}
                            checked={formData.activeCourses.includes(course)}
                            onCheckedChange={(checked) => handleCourseToggle(course, checked as boolean)}
                          />
                          <Label htmlFor={course} className="text-sm">
                            {course}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Teacher selection for students */}
                {formData.role === 'student' && formData.activeCourses.length > 0 && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="assignedTeacher" className="text-right">
                      Profesor *
                    </Label>
                    <Select 
                      value={formData.assignedTeacher || ''} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTeacher: value }))}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecciona un profesor" />
                      </SelectTrigger>
                      <SelectContent>
                        {getTeachersForCourse(formData.activeCourses[0]).map(teacher => (
                          <SelectItem key={teacher.username} value={teacher.username}>
                            {teacher.displayName} - {formData.activeCourses[0]}
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
              Cancelar
            </Button>
            <Button onClick={handleSaveUser}>
              {editingUser ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
