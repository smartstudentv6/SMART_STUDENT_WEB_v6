"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { 
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  Award,
  Clock,
  Target,
  Filter,
  Download,
  Calendar,
  BookOpen,
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Activity,
  Eye,
  FileText,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Tipos de datos
interface Student {
  username: string;
  displayName: string;
  activeCourses: string[];
  assignedTeachers?: Record<string, string>;
  email?: string;
}

interface TaskSubmission {
  id: string;
  taskId: string;
  studentUsername: string;
  content: string;
  submittedAt: string;
  status: 'submitted' | 'reviewed' | 'completed';
  score?: number;
  feedback?: string;
  isLate: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  course: string;
  subject: string;
  teacherUsername: string;
  maxScore: number;
  type: 'assignment' | 'project' | 'exam' | 'quiz';
  status: 'active' | 'completed' | 'cancelled';
}

interface AttendanceRecord {
  id: string;
  studentUsername: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  subject: string;
  course: string;
  teacherUsername: string;
}

interface StudentStatistics {
  username: string;
  displayName: string;
  course: string;
  totalTasks: number;
  completedTasks: number;
  averageScore: number;
  attendanceRate: number;
  lateSubmissions: number;
  participationScore: number;
  lastActivity: string;
}

interface CourseStatistics {
  course: string;
  subject: string;
  totalStudents: number;
  averageScore: number;
  attendanceRate: number;
  taskCompletionRate: number;
  activeStudents: number;
  topPerformers: string[];
  needsAttention: string[];
}

interface PerformanceMetrics {
  totalStudents: number;
  averageGrade: number;
  attendanceRate: number;
  taskCompletionRate: number;
  activeStudents: number;
  improvingStudents: number;
  strugglingStudents: number;
}

export default function StatisticsPage() {
  const { translate } = useLanguage();
  const { user } = useAuth();
  
  // Estados principales
  const [selectedView, setSelectedView] = useState<'overview' | 'students' | 'courses' | 'performance' | 'reports'>('overview');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  
  // Datos
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [mySubjects, setMySubjects] = useState<string[]>([]);
  const [myCourses, setMyCourses] = useState<string[]>([]);
  
  // Estadísticas calculadas
  const [studentStats, setStudentStats] = useState<StudentStatistics[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStatistics[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (user && user.role === 'teacher') {
      loadTeacherData();
      loadTasksData();
      loadAttendanceData();
      loadSubmissionsData();
    }
  }, [user]);

  // Recalcular estadísticas cuando cambien los filtros o datos
  useEffect(() => {
    if (students.length > 0) {
      calculateStatistics();
    }
  }, [students, tasks, submissions, attendance, selectedCourse, selectedSubject, selectedPeriod]);

  const loadTeacherData = () => {
    try {
      const users = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
      
      // Obtener datos del profesor
      const teacher = users.find((u: any) => u.username === user?.username);
      if (teacher) {
        const courses = teacher.activeCourses || [];
        const subjects = teacher.teachingSubjects || [];
        
        setMyCourses(courses);
        setMySubjects(subjects);
      }

      // Cargar estudiantes asignados al profesor
      const assignedStudents = users.filter((u: any) => {
        if (u.role !== 'student') return false;
        
        // Verificar si el estudiante está asignado a este profesor
        if (u.assignedTeachers) {
          return Object.values(u.assignedTeachers).includes(user?.username);
        }
        return u.assignedTeacher === user?.username;
      });

      setStudents(assignedStudents);
    } catch (error) {
      console.error('Error loading teacher data:', error);
    }
  };

  const loadTasksData = () => {
    try {
      const stored = localStorage.getItem('smart-student-tasks');
      if (stored) {
        const allTasks = JSON.parse(stored);
        // Filtrar solo las tareas de este profesor
        const myTasks = allTasks.filter((task: Task) => 
          task.teacherUsername === user?.username
        );
        setTasks(myTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadSubmissionsData = () => {
    try {
      const stored = localStorage.getItem('smart-student-submissions');
      if (stored) {
        const allSubmissions = JSON.parse(stored);
        setSubmissions(allSubmissions);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const loadAttendanceData = () => {
    try {
      const stored = localStorage.getItem('smart-student-attendance');
      if (stored) {
        const allAttendance = JSON.parse(stored);
        // Filtrar solo los registros de este profesor
        const myAttendance = allAttendance.filter((record: AttendanceRecord) => 
          record.teacherUsername === user?.username
        );
        setAttendance(myAttendance);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const calculateStatistics = () => {
    // Filtrar datos según selecciones
    const filteredStudents = students.filter(student => {
      if (selectedCourse && selectedCourse !== 'all' && !student.activeCourses.includes(selectedCourse)) return false;
      return true;
    });

    const filteredTasks = tasks.filter(task => {
      if (selectedCourse && selectedCourse !== 'all' && task.course !== selectedCourse) return false;
      if (selectedSubject && selectedSubject !== 'all' && task.subject !== selectedSubject) return false;
      return true;
    });

    const filteredAttendance = attendance.filter(record => {
      if (selectedCourse && selectedCourse !== 'all' && record.course !== selectedCourse) return false;
      if (selectedSubject && selectedSubject !== 'all' && record.subject !== selectedSubject) return false;
      return true;
    });

    // Calcular estadísticas por estudiante
    const studentStatistics: StudentStatistics[] = filteredStudents.map(student => {
      const studentTasks = filteredTasks.filter(task => 
        student.activeCourses.includes(task.course)
      );
      
      const studentSubmissions = submissions.filter(sub => 
        sub.studentUsername === student.username &&
        studentTasks.some(task => task.id === sub.taskId)
      );

      const studentAttendance = filteredAttendance.filter(record => 
        record.studentUsername === student.username
      );

      const totalTasks = studentTasks.length;
      const completedTasks = studentSubmissions.filter(sub => sub.status === 'completed').length;
      const scores = studentSubmissions.filter(sub => sub.score !== undefined).map(sub => sub.score!);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const presentRecords = studentAttendance.filter(record => record.status === 'present').length;
      const attendanceRate = studentAttendance.length > 0 ? (presentRecords / studentAttendance.length) * 100 : 0;
      const lateSubmissions = studentSubmissions.filter(sub => sub.isLate).length;

      // Calcular score de participación basado en entregas a tiempo y asistencia
      const participationScore = Math.round(
        (attendanceRate * 0.4) + 
        ((totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0) * 0.4) +
        ((lateSubmissions === 0 && completedTasks > 0) ? 20 : Math.max(0, 20 - (lateSubmissions * 5)))
      );

      return {
        username: student.username,
        displayName: student.displayName,
        course: student.activeCourses[0] || '',
        totalTasks,
        completedTasks,
        averageScore: Math.round(averageScore * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        lateSubmissions,
        participationScore: Math.min(100, participationScore),
        lastActivity: studentSubmissions.length > 0 ? 
          studentSubmissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0].submittedAt :
          new Date().toISOString()
      };
    });

    setStudentStats(studentStatistics);

    // Calcular estadísticas por curso
    const courseStatistics: CourseStatistics[] = [];
    const coursesSet = new Set(filteredTasks.map(task => `${task.course}|${task.subject}`));
    
    coursesSet.forEach(courseSubject => {
      const [course, subject] = courseSubject.split('|');
      const courseStudents = filteredStudents.filter(student => 
        student.activeCourses.includes(course)
      );
      const courseTasks = filteredTasks.filter(task => 
        task.course === course && task.subject === subject
      );
      
      const courseSubmissions = submissions.filter(sub => 
        courseTasks.some(task => task.id === sub.taskId)
      );

      const courseAttendance = filteredAttendance.filter(record => 
        record.course === course && record.subject === subject
      );

      const scores = courseSubmissions.filter(sub => sub.score !== undefined).map(sub => sub.score!);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      
      const presentRecords = courseAttendance.filter(record => record.status === 'present').length;
      const attendanceRate = courseAttendance.length > 0 ? (presentRecords / courseAttendance.length) * 100 : 0;
      
      const totalPossibleSubmissions = courseStudents.length * courseTasks.length;
      const actualSubmissions = courseSubmissions.length;
      const taskCompletionRate = totalPossibleSubmissions > 0 ? (actualSubmissions / totalPossibleSubmissions) * 100 : 0;

      // Identificar estudiantes destacados y que necesitan atención
      const studentScores = courseStudents.map(student => {
        const studentSubs = courseSubmissions.filter(sub => sub.studentUsername === student.username);
        const studentScores = studentSubs.filter(sub => sub.score !== undefined).map(sub => sub.score!);
        const avgScore = studentScores.length > 0 ? studentScores.reduce((a, b) => a + b, 0) / studentScores.length : 0;
        return { username: student.username, displayName: student.displayName, score: avgScore };
      });

      const topPerformers = studentScores
        .filter(s => s.score >= 85)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(s => s.displayName);

      const needsAttention = studentScores
        .filter(s => s.score < 60 && s.score > 0)
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map(s => s.displayName);

      courseStatistics.push({
        course,
        subject,
        totalStudents: courseStudents.length,
        averageScore: Math.round(averageScore * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        taskCompletionRate: Math.round(taskCompletionRate * 100) / 100,
        activeStudents: courseStudents.filter(student => {
          const recentSubmissions = courseSubmissions.filter(sub => 
            sub.studentUsername === student.username &&
            new Date(sub.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          );
          return recentSubmissions.length > 0;
        }).length,
        topPerformers,
        needsAttention
      });
    });

    setCourseStats(courseStatistics);

    // Calcular métricas generales de rendimiento
    const totalStudents = studentStatistics.length;
    const averageGrade = studentStatistics.length > 0 ? 
      studentStatistics.reduce((sum, student) => sum + student.averageScore, 0) / totalStudents : 0;
    const globalAttendanceRate = studentStatistics.length > 0 ? 
      studentStatistics.reduce((sum, student) => sum + student.attendanceRate, 0) / totalStudents : 0;
    const globalTaskCompletionRate = studentStatistics.length > 0 ? 
      studentStatistics.reduce((sum, student) => 
        sum + (student.totalTasks > 0 ? (student.completedTasks / student.totalTasks) * 100 : 0), 0
      ) / totalStudents : 0;
    
    const activeStudents = studentStatistics.filter(student => {
      const lastActivity = new Date(student.lastActivity);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return lastActivity > weekAgo;
    }).length;

    const improvingStudents = studentStatistics.filter(student => 
      student.averageScore >= 70 && student.participationScore >= 75
    ).length;

    const strugglingStudents = studentStatistics.filter(student => 
      student.averageScore < 60 || student.attendanceRate < 70
    ).length;

    setPerformanceMetrics({
      totalStudents,
      averageGrade: Math.round(averageGrade * 100) / 100,
      attendanceRate: Math.round(globalAttendanceRate * 100) / 100,
      taskCompletionRate: Math.round(globalTaskCompletionRate * 100) / 100,
      activeStudents,
      improvingStudents,
      strugglingStudents
    });
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (user?.role !== 'teacher') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700">{translate('accessRestricted')}</h2>
              <p className="text-gray-500">{translate('teachersOnly')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            <TrendingUp className="inline h-8 w-8 mr-2 text-indigo-600" />
            {translate('statisticsManagement')}
          </h1>
          <p className="text-gray-600 mt-1">
            {translate('statisticsDescription')}
          </p>
        </div>
        
        {/* Filtros principales */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={translate('filterByCourse')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translate('allCourses')}</SelectItem>
              {myCourses.map(course => (
                <SelectItem key={course} value={course}>{course}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={translate('filterBySubject')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translate('allSubjects')}</SelectItem>
              {mySubjects.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{translate('thisWeek')}</SelectItem>
              <SelectItem value="month">{translate('thisMonth')}</SelectItem>
              <SelectItem value="quarter">{translate('thisQuarter')}</SelectItem>
              <SelectItem value="year">{translate('thisYear')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {[
          { id: 'overview', label: translate('overviewTab'), icon: BarChart3 },
          { id: 'students', label: translate('studentsTab'), icon: Users },
          { id: 'courses', label: translate('coursesTab'), icon: BookOpen },
          { id: 'performance', label: translate('performanceTab'), icon: Target },
          { id: 'reports', label: translate('reportsTab'), icon: FileText }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={selectedView === tab.id ? 'default' : 'ghost'}
            className={cn(
              "flex items-center gap-2",
              selectedView === tab.id && "bg-indigo-600 text-white"
            )}
            onClick={() => setSelectedView(tab.id as any)}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && performanceMetrics && (
        <div className="space-y-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('totalStudents')}</p>
                    <p className="text-3xl font-bold text-gray-900">{performanceMetrics.totalStudents}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('averageGrade')}</p>
                    <p className="text-3xl font-bold text-gray-900">{performanceMetrics.averageGrade}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('attendanceRate')}</p>
                    <p className="text-3xl font-bold text-gray-900">{performanceMetrics.attendanceRate}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('taskCompletion')}</p>
                    <p className="text-3xl font-bold text-gray-900">{performanceMetrics.taskCompletionRate}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-yellow-100">
                    <Target className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métricas adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('activeStudents')}</p>
                    <p className="text-2xl font-bold text-green-600">{performanceMetrics.activeStudents}</p>
                    <p className="text-xs text-gray-500">{translate('lastWeek')}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('improvingStudents')}</p>
                    <p className="text-2xl font-bold text-blue-600">{performanceMetrics.improvingStudents}</p>
                    <p className="text-xs text-gray-500">{translate('goodPerformance')}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('strugglingStudents')}</p>
                    <p className="text-2xl font-bold text-red-600">{performanceMetrics.strugglingStudents}</p>
                    <p className="text-xs text-gray-500">{translate('needsAttention')}</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de distribución de calificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                {translate('gradeDistribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: translate('excellent'), range: '90-100%', count: studentStats.filter(s => s.averageScore >= 90).length, color: 'bg-green-500' },
                  { label: translate('good'), range: '80-89%', count: studentStats.filter(s => s.averageScore >= 80 && s.averageScore < 90).length, color: 'bg-blue-500' },
                  { label: translate('average'), range: '70-79%', count: studentStats.filter(s => s.averageScore >= 70 && s.averageScore < 80).length, color: 'bg-yellow-500' },
                  { label: translate('needsImprovement'), range: '<70%', count: studentStats.filter(s => s.averageScore < 70).length, color: 'bg-red-500' }
                ].map((grade, index) => (
                  <div key={index} className="text-center">
                    <div className={`w-16 h-16 rounded-full ${grade.color} mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl`}>
                      {grade.count}
                    </div>
                    <p className="font-semibold">{grade.label}</p>
                    <p className="text-sm text-gray-500">{grade.range}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students View */}
      {selectedView === 'students' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {translate('studentStatistics')} ({studentStats.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentStats.map(student => (
                  <div key={student.username} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-gray-700">
                            {student.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{student.displayName}</h3>
                          <p className="text-sm text-gray-500">{student.course}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getPerformanceColor(student.averageScore)}>
                          {student.averageScore}% {translate('average')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{student.completedTasks}/{student.totalTasks}</div>
                        <div className="text-sm text-gray-500">{translate('tasksCompleted')}</div>
                        <Progress value={student.totalTasks > 0 ? (student.completedTasks / student.totalTasks) * 100 : 0} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getAttendanceColor(student.attendanceRate)}`}>
                          {student.attendanceRate}%
                        </div>
                        <div className="text-sm text-gray-500">{translate('attendance')}</div>
                        <Progress value={student.attendanceRate} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{student.participationScore}</div>
                        <div className="text-sm text-gray-500">{translate('participation')}</div>
                        <Progress value={student.participationScore} className="mt-2" />
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{student.lateSubmissions}</div>
                        <div className="text-sm text-gray-500">{translate('lateSubmissions')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Courses View */}
      {selectedView === 'courses' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {translate('courseStatistics')} ({courseStats.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {courseStats.map((course, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{course.course}</h3>
                        <p className="text-gray-600">{course.subject}</p>
                      </div>
                      <Badge variant="outline">
                        {course.totalStudents} {translate('students')}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{course.averageScore}%</div>
                        <div className="text-sm text-gray-500">{translate('averageScore')}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{course.attendanceRate}%</div>
                        <div className="text-sm text-gray-500">{translate('attendance')}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">{course.taskCompletionRate}%</div>
                        <div className="text-sm text-gray-500">{translate('taskCompletion')}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">{course.activeStudents}</div>
                        <div className="text-sm text-gray-500">{translate('activeStudents')}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          {translate('topPerformers')}
                        </h4>
                        {course.topPerformers.length > 0 ? (
                          <ul className="space-y-1">
                            {course.topPerformers.map((student, idx) => (
                              <li key={idx} className="text-sm text-gray-700">• {student}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">{translate('noTopPerformers')}</p>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {translate('needsAttention')}
                        </h4>
                        {course.needsAttention.length > 0 ? (
                          <ul className="space-y-1">
                            {course.needsAttention.map((student, idx) => (
                              <li key={idx} className="text-sm text-gray-700">• {student}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">{translate('noStudentsNeedAttention')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance View */}
      {selectedView === 'performance' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {translate('performanceAnalysis')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{translate('performanceComingSoon')}</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {translate('performanceDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports View */}
      {selectedView === 'reports' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {translate('statisticsReports')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <Download className="h-6 w-6" />
                  <span>{translate('exportStudentReport')}</span>
                </Button>
                
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>{translate('exportCourseReport')}</span>
                </Button>
                
                <Button variant="outline" className="h-24 flex-col gap-2">
                  <TrendingUp className="h-6 w-6" />
                  <span>{translate('exportPerformanceReport')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
