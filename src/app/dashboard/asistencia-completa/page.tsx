"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { 
  Calendar, 
  Users, 
  Check, 
  X, 
  Clock, 
  UserCheck, 
  UserX, 
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Tipos de datos
interface Student {
  username: string;
  displayName: string;
  activeCourses: string[];
  assignedTeachers?: Record<string, string>;
}

interface AttendanceRecord {
  id: string;
  studentUsername: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  subject: string;
  course: string;
  teacherUsername: string;
  notes?: string;
  timestamp: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const statusColors = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  excused: 'bg-blue-100 text-blue-800'
};

const statusIcons = {
  present: Check,
  absent: X,
  late: Clock,
  excused: UserCheck
};

export default function AttendancePage() {
  const { translate } = useLanguage();
  const { user } = useAuth();
  
  // Estados principales
  const [selectedView, setSelectedView] = useState<'dashboard' | 'calendar' | 'students' | 'reports'>('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Datos
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [mySubjects, setMySubjects] = useState<string[]>([]);
  const [myCourses, setMyCourses] = useState<string[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});

  // Función para obtener etiquetas de estado traducidas
  const getStatusLabels = () => ({
    present: translate('present'),
    absent: translate('absent'),
    late: translate('late'),
    excused: translate('excused')
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (user && user.role === 'teacher') {
      loadTeacherData();
      loadAttendanceRecords();
    }
  }, [user]);

  const loadTeacherData = () => {
    try {
      const users = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
      
      // Obtener cursos y materias del profesor
      const teacher = users.find((u: any) => u.username === user?.username);
      if (teacher) {
        const courses = teacher.activeCourses || [];
        const subjects = teacher.teachingSubjects || [];
        
        setMyCourses(courses);
        setMySubjects(subjects);
        
        if (courses.length > 0 && !selectedCourse) {
          setSelectedCourse(courses[0]);
        }
        if (subjects.length > 0 && !selectedSubject) {
          setSelectedSubject(subjects[0]);
        }
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

  const loadAttendanceRecords = () => {
    try {
      const stored = localStorage.getItem('smart-student-attendance');
      if (stored) {
        const records = JSON.parse(stored);
        // Filtrar solo los registros de este profesor
        const myRecords = records.filter((record: AttendanceRecord) => 
          record.teacherUsername === user?.username
        );
        setAttendanceRecords(myRecords);
      }
    } catch (error) {
      console.error('Error loading attendance records:', error);
    }
  };

  const saveAttendanceRecord = (record: AttendanceRecord) => {
    try {
      const stored = JSON.parse(localStorage.getItem('smart-student-attendance') || '[]');
      const existingIndex = stored.findIndex((r: AttendanceRecord) => 
        r.studentUsername === record.studentUsername &&
        r.date === record.date &&
        r.subject === record.subject &&
        r.course === record.course &&
        r.teacherUsername === record.teacherUsername
      );

      if (existingIndex >= 0) {
        stored[existingIndex] = record;
      } else {
        stored.push(record);
      }

      localStorage.setItem('smart-student-attendance', JSON.stringify(stored));
      loadAttendanceRecords();
    } catch (error) {
      console.error('Error saving attendance record:', error);
    }
  };

  const markAttendance = (studentUsername: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const record: AttendanceRecord = {
      id: `${studentUsername}-${selectedDate}-${selectedSubject}-${selectedCourse}`,
      studentUsername,
      date: selectedDate,
      status,
      subject: selectedSubject,
      course: selectedCourse,
      teacherUsername: user?.username || '',
      timestamp: new Date().toISOString()
    };

    saveAttendanceRecord(record);
    
    // Actualizar estado local
    setDailyAttendance(prev => ({
      ...prev,
      [studentUsername]: status
    }));
  };

  const getAttendanceForDate = (date: string) => {
    return attendanceRecords.filter(record => 
      record.date === date &&
      record.course === selectedCourse &&
      record.subject === selectedSubject
    );
  };

  const getStudentAttendanceStats = (studentUsername: string): AttendanceStats => {
    const studentRecords = attendanceRecords.filter(record => 
      record.studentUsername === studentUsername &&
      record.course === selectedCourse &&
      record.subject === selectedSubject
    );

    const stats = {
      present: studentRecords.filter(r => r.status === 'present').length,
      absent: studentRecords.filter(r => r.status === 'absent').length,
      late: studentRecords.filter(r => r.status === 'late').length,
      excused: studentRecords.filter(r => r.status === 'excused').length,
      total: studentRecords.length
    };

    return stats;
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getDateAttendanceStats = (date: Date): AttendanceStats => {
    const dateStr = date.toISOString().split('T')[0];
    const dayRecords = getAttendanceForDate(dateStr);

    return {
      present: dayRecords.filter(r => r.status === 'present').length,
      absent: dayRecords.filter(r => r.status === 'absent').length,
      late: dayRecords.filter(r => r.status === 'late').length,
      excused: dayRecords.filter(r => r.status === 'excused').length,
      total: dayRecords.length
    };
  };

  const filteredStudents = students.filter(student => {
    if (!selectedCourse) return true;
    if (!student.activeCourses.includes(selectedCourse)) return false;
    if (searchTerm) {
      return student.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  // Cargar asistencia del día seleccionado
  useEffect(() => {
    const dayRecords = getAttendanceForDate(selectedDate);
    const dayAttendance: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    
    dayRecords.forEach(record => {
      dayAttendance[record.studentUsername] = record.status;
    });
    
    setDailyAttendance(dayAttendance);
  }, [selectedDate, selectedCourse, selectedSubject, attendanceRecords]);

  if (user?.role !== 'teacher') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <UserX className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700">{translate('accessRestricted')}</h2>
              <p className="text-gray-500">{translate('teachersOnly')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabels = getStatusLabels();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            <UserCheck className="inline h-8 w-8 mr-2 text-indigo-600" />
            {translate('attendanceManagement')}
          </h1>
          <p className="text-gray-600 mt-1">
            {translate('attendanceControl')}
          </p>
        </div>
        
        {/* Filtros principales */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={translate('attendanceSelectCourse')} />
            </SelectTrigger>
            <SelectContent>
              {myCourses.map(course => (
                <SelectItem key={course} value={course}>{course}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={translate('attendanceSelectSubject')} />
            </SelectTrigger>
            <SelectContent>
              {mySubjects.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {[
          { id: 'dashboard', label: translate('dashboardTab'), icon: BarChart3 },
          { id: 'calendar', label: translate('calendarTab'), icon: Calendar },
          { id: 'students', label: translate('studentsTab'), icon: Users },
          { id: 'reports', label: translate('reportsTab'), icon: Download }
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

      {/* Dashboard View */}
      {selectedView === 'dashboard' && (
        <div className="space-y-6">
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                title: translate('attendanceTotalStudents'), 
                value: filteredStudents.length, 
                icon: Users, 
                color: 'blue' 
              },
              { 
                title: translate('presentToday'), 
                value: Object.values(dailyAttendance).filter(status => status === 'present').length, 
                icon: UserCheck, 
                color: 'green' 
              },
              { 
                title: translate('absentToday'), 
                value: Object.values(dailyAttendance).filter(status => status === 'absent').length, 
                icon: UserX, 
                color: 'red' 
              },
              { 
                title: translate('lateToday'), 
                value: Object.values(dailyAttendance).filter(status => status === 'late').length, 
                icon: Clock, 
                color: 'yellow' 
              }
            ].map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={cn(
                      "p-3 rounded-full",
                      stat.color === 'blue' && "bg-blue-100",
                      stat.color === 'green' && "bg-green-100",
                      stat.color === 'red' && "bg-red-100",
                      stat.color === 'yellow' && "bg-yellow-100"
                    )}>
                      <stat.icon className={cn(
                        "h-6 w-6",
                        stat.color === 'blue' && "text-blue-600",
                        stat.color === 'green' && "text-green-600",
                        stat.color === 'red' && "text-red-600",
                        stat.color === 'yellow' && "text-yellow-600"
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Asistencia del día */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {translate('attendanceDate')} - {new Date(selectedDate).toLocaleDateString('es-ES')}
                </CardTitle>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">{translate('noStudentsSelected')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map(student => {
                    const currentStatus = dailyAttendance[student.username];
                    
                    return (
                      <div key={student.username} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-gray-700">
                              {student.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{student.displayName}</p>
                            <p className="text-sm text-gray-500">{student.username}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {currentStatus && (
                            <Badge className={statusColors[currentStatus]}>
                              {statusLabels[currentStatus]}
                            </Badge>
                          )}
                          
                          <div className="flex gap-1">
                            {Object.entries(statusLabels).map(([status, label]) => {
                              const Icon = statusIcons[status as keyof typeof statusIcons];
                              return (
                                <Button
                                  key={status}
                                  size="sm"
                                  variant={currentStatus === status ? "default" : "outline"}
                                  className={cn(
                                    "p-2",
                                    currentStatus === status && status === 'present' && "bg-green-600 hover:bg-green-700",
                                    currentStatus === status && status === 'absent' && "bg-red-600 hover:bg-red-700",
                                    currentStatus === status && status === 'late' && "bg-yellow-600 hover:bg-yellow-700",
                                    currentStatus === status && status === 'excused' && "bg-blue-600 hover:bg-blue-700"
                                  )}
                                  onClick={() => markAttendance(student.username, status as any)}
                                  title={label}
                                >
                                  <Icon className="h-4 w-4" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar View */}
      {selectedView === 'calendar' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {translate('attendanceCalendarTitle')} - {monthNames[selectedMonth]} {selectedYear}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedMonth === 0) {
                        setSelectedMonth(11);
                        setSelectedYear(selectedYear - 1);
                      } else {
                        setSelectedMonth(selectedMonth - 1);
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedMonth === 11) {
                        setSelectedMonth(0);
                        setSelectedYear(selectedYear + 1);
                      } else {
                        setSelectedMonth(selectedMonth + 1);
                      }
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="p-2 text-center font-semibold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((date, index) => {
                  const isCurrentMonth = date.getMonth() === selectedMonth;
                  const isToday = date.toDateString() === new Date().toDateString();
                  const stats = getDateAttendanceStats(date);
                  const hasData = stats.total > 0;
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-2 min-h-16 border rounded cursor-pointer transition-colors",
                        isCurrentMonth ? "bg-white" : "bg-gray-50",
                        isToday && "bg-blue-50 border-blue-200",
                        hasData && "border-indigo-200"
                      )}
                      onClick={() => setSelectedDate(date.toISOString().split('T')[0])}
                    >
                      <div className={cn(
                        "text-sm font-medium",
                        isCurrentMonth ? "text-gray-900" : "text-gray-400",
                        isToday && "text-blue-600"
                      )}>
                        {date.getDate()}
                      </div>
                      {hasData && (
                        <div className="mt-1 space-y-1">
                          <div className="flex gap-1">
                            {stats.present > 0 && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" title={`${stats.present} ${translate('present')}`} />
                            )}
                            {stats.absent > 0 && (
                              <div className="w-2 h-2 bg-red-500 rounded-full" title={`${stats.absent} ${translate('absent')}`} />
                            )}
                            {stats.late > 0 && (
                              <div className="w-2 h-2 bg-yellow-500 rounded-full" title={`${stats.late} ${translate('late')}`} />
                            )}
                            {stats.excused > 0 && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" title={`${stats.excused} ${translate('excused')}`} />
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {stats.total} {translate('records')}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {translate('studentTracking')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={translate('searchStudent')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredStudents.map(student => {
                  const stats = getStudentAttendanceStats(student.username);
                  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                  
                  return (
                    <div key={student.username} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-gray-700">
                              {student.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{student.displayName}</h3>
                            <p className="text-sm text-gray-500">{student.username}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-indigo-600">{attendanceRate}%</div>
                          <div className="text-sm text-gray-500">{translate('attendanceRate')}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(statusLabels).map(([status, label]) => {
                          const count = stats[status as keyof AttendanceStats] as number;
                          const Icon = statusIcons[status as keyof typeof statusIcons];
                          
                          return (
                            <div key={status} className="text-center">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1",
                                status === 'present' && "bg-green-100",
                                status === 'absent' && "bg-red-100",
                                status === 'late' && "bg-yellow-100",
                                status === 'excused' && "bg-blue-100"
                              )}>
                                <Icon className={cn(
                                  "h-5 w-5",
                                  status === 'present' && "text-green-600",
                                  status === 'absent' && "text-red-600",
                                  status === 'late' && "text-yellow-600",
                                  status === 'excused' && "text-blue-600"
                                )} />
                              </div>
                              <div className="font-semibold">{count}</div>
                              <div className="text-xs text-gray-500">{label}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
                <Download className="h-5 w-5" />
                {translate('attendanceReportsTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{translate('reportsComingSoon')}</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {translate('reportsDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
