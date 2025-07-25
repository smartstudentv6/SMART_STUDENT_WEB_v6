"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { 
  Megaphone,
  Plus,
  Send,
  Filter,
  Search,
  Users,
  Calendar,
  Eye,
  Edit3,
  Trash2,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Tipos de datos
interface Student {
  username: string;
  displayName: string;
  activeCourses: string[];
  assignedTeachers?: Record<string, string>;
  email?: string;
}

interface Communication {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'reminder' | 'urgent' | 'general';
  priority: 'low' | 'medium' | 'high';
  teacherUsername: string;
  teacherName: string;
  targetCourses: string[];
  targetSubjects: string[];
  targetStudents: string[];
  createdAt: string;
  scheduledFor?: string;
  isScheduled: boolean;
  status: 'draft' | 'sent' | 'scheduled';
  readBy: string[];
  attachments?: string[];
}

interface CommunicationStats {
  total: number;
  sent: number;
  draft: number;
  scheduled: number;
  totalReads: number;
}

const communicationTypes = {
  announcement: { label: 'Anuncio', icon: Megaphone, color: 'blue' },
  reminder: { label: 'Recordatorio', icon: Clock, color: 'yellow' },
  urgent: { label: 'Urgente', icon: AlertCircle, color: 'red' },
  general: { label: 'General', icon: Info, color: 'gray' }
};

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800'
};

export default function CommunicationsPage() {
  const { translate } = useLanguage();
  const { user } = useAuth();
  
  // Estados principales
  const [selectedView, setSelectedView] = useState<'dashboard' | 'create' | 'manage' | 'analytics'>('dashboard');
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [mySubjects, setMySubjects] = useState<string[]>([]);
  const [myCourses, setMyCourses] = useState<string[]>([]);
  
  // Filtros
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Estados del formulario
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general' as Communication['type'],
    priority: 'medium' as Communication['priority'],
    targetCourses: [] as string[],
    targetSubjects: [] as string[],
    targetStudents: [] as string[],
    isScheduled: false,
    scheduledFor: ''
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (user && user.role === 'teacher') {
      loadTeacherData();
      loadCommunications();
    }
  }, [user]);

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

  const loadCommunications = () => {
    try {
      const stored = localStorage.getItem('smart-student-communications');
      if (stored) {
        const comms = JSON.parse(stored);
        // Filtrar solo los comunicados de este profesor
        const myComms = comms.filter((comm: Communication) => 
          comm.teacherUsername === user?.username
        );
        setCommunications(myComms);
      }
    } catch (error) {
      console.error('Error loading communications:', error);
    }
  };

  const saveCommunication = (communication: Communication) => {
    try {
      const stored = JSON.parse(localStorage.getItem('smart-student-communications') || '[]');
      const existingIndex = stored.findIndex((c: Communication) => c.id === communication.id);

      if (existingIndex >= 0) {
        stored[existingIndex] = communication;
      } else {
        stored.push(communication);
      }

      localStorage.setItem('smart-student-communications', JSON.stringify(stored));
      loadCommunications();
    } catch (error) {
      console.error('Error saving communication:', error);
    }
  };

  const handleCreateCommunication = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert(translate('fillRequiredFields'));
      return;
    }

    const newCommunication: Communication = {
      id: `comm_${Date.now()}_${user?.username}`,
      title: formData.title,
      content: formData.content,
      type: formData.type,
      priority: formData.priority,
      teacherUsername: user?.username || '',
      teacherName: user?.displayName || user?.username || '',
      targetCourses: formData.targetCourses,
      targetSubjects: formData.targetSubjects,
      targetStudents: formData.targetStudents,
      createdAt: new Date().toISOString(),
      scheduledFor: formData.isScheduled ? formData.scheduledFor : undefined,
      isScheduled: formData.isScheduled,
      status: formData.isScheduled ? 'scheduled' : 'sent',
      readBy: []
    };

    saveCommunication(newCommunication);
    resetForm();
    setIsCreateDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'general',
      priority: 'medium',
      targetCourses: [],
      targetSubjects: [],
      targetStudents: [],
      isScheduled: false,
      scheduledFor: ''
    });
    setEditingCommunication(null);
  };

  const handleCourseChange = (course: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      targetCourses: checked 
        ? [...prev.targetCourses, course]
        : prev.targetCourses.filter(c => c !== course)
    }));
  };

  const handleSubjectChange = (subject: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      targetSubjects: checked 
        ? [...prev.targetSubjects, subject]
        : prev.targetSubjects.filter(s => s !== subject)
    }));
  };

  const getTargetStudents = () => {
    return students.filter(student => {
      // Si no hay filtros específicos, incluir todos los estudiantes asignados
      if (formData.targetCourses.length === 0 && formData.targetSubjects.length === 0) {
        return true;
      }
      
      // Filtrar por cursos si están seleccionados
      if (formData.targetCourses.length > 0) {
        const hasMatchingCourse = formData.targetCourses.some(course => 
          student.activeCourses.includes(course)
        );
        if (!hasMatchingCourse) return false;
      }
      
      return true;
    });
  };

  const filteredCommunications = communications.filter(comm => {
    if (filterCourse && filterCourse !== 'all' && !comm.targetCourses.includes(filterCourse)) return false;
    if (filterSubject && filterSubject !== 'all' && !comm.targetSubjects.includes(filterSubject)) return false;
    if (filterType && filterType !== 'all' && comm.type !== filterType) return false;
    if (filterStatus && filterStatus !== 'all' && comm.status !== filterStatus) return false;
    if (searchTerm) {
      return comm.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             comm.content.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const getStats = (): CommunicationStats => {
    return {
      total: communications.length,
      sent: communications.filter(c => c.status === 'sent').length,
      draft: communications.filter(c => c.status === 'draft').length,
      scheduled: communications.filter(c => c.status === 'scheduled').length,
      totalReads: communications.reduce((sum, c) => sum + c.readBy.length, 0)
    };
  };

  if (user?.role !== 'teacher') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Megaphone className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700">{translate('accessRestricted')}</h2>
              <p className="text-gray-500">{translate('teachersOnly')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getStats();
  const targetStudents = getTargetStudents();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            <Megaphone className="inline h-8 w-8 mr-2 text-indigo-600" />
            {translate('communicationsManagement')}
          </h1>
          <p className="text-gray-600 mt-1">
            {translate('communicationsDescription')}
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              {translate('createCommunication')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCommunication ? translate('editCommunication') : translate('createCommunication')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Título */}
              <div>
                <Label htmlFor="title">{translate('communicationTitle')} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={translate('communicationTitlePlaceholder')}
                />
              </div>

              {/* Contenido */}
              <div>
                <Label htmlFor="content">{translate('communicationContent')} *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder={translate('communicationContentPlaceholder')}
                  rows={4}
                />
              </div>

              {/* Tipo y Prioridad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{translate('communicationType')}</Label>
                  <Select value={formData.type} onValueChange={(value: Communication['type']) => 
                    setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(communicationTypes).map(([key, type]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{translate('communicationPriority')}</Label>
                  <Select value={formData.priority} onValueChange={(value: Communication['priority']) => 
                    setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
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

              {/* Cursos objetivo */}
              <div>
                <Label>{translate('targetCourses')}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded p-2">
                  {myCourses.map(course => (
                    <div key={course} className="flex items-center space-x-2">
                      <Checkbox
                        id={`course-${course}`}
                        checked={formData.targetCourses.includes(course)}
                        onCheckedChange={(checked) => 
                          handleCourseChange(course, checked as boolean)}
                      />
                      <Label htmlFor={`course-${course}`} className="text-sm">
                        {course}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asignaturas objetivo */}
              <div>
                <Label>{translate('targetSubjects')}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded p-2">
                  {mySubjects.map(subject => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subject-${subject}`}
                        checked={formData.targetSubjects.includes(subject)}
                        onCheckedChange={(checked) => 
                          handleSubjectChange(subject, checked as boolean)}
                      />
                      <Label htmlFor={`subject-${subject}`} className="text-sm">
                        {subject}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estudiantes objetivo (solo mostrar) */}
              <div>
                <Label>{translate('targetStudents')} ({targetStudents.length})</Label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                  {targetStudents.length === 0 ? (
                    <p className="text-sm text-gray-500">{translate('noStudentsSelected')}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {targetStudents.map(student => (
                        <div key={student.username} className="text-sm text-gray-700">
                          {student.displayName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Programar envío */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule"
                  checked={formData.isScheduled}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isScheduled: checked as boolean }))}
                />
                <Label htmlFor="schedule">{translate('scheduleCommunication')}</Label>
              </div>

              {formData.isScheduled && (
                <div>
                  <Label htmlFor="scheduledFor">{translate('scheduleDate')}</Label>
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                  />
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(false);
                }}>
                  {translate('cancel')}
                </Button>
                <Button onClick={handleCreateCommunication}>
                  <Send className="h-4 w-4 mr-2" />
                  {formData.isScheduled ? translate('schedule') : translate('send')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {[
          { id: 'dashboard', label: translate('dashboardTab'), icon: MessageSquare },
          { id: 'manage', label: translate('manageCommunications'), icon: Edit3 },
          { id: 'analytics', label: translate('analyticsTab'), icon: BarChart3 }
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
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('totalCommunications')}</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('communicationsSent')}</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.sent}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('communicationsScheduled')}</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.scheduled}</p>
                  </div>
                  <div className="p-3 rounded-full bg-yellow-100">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{translate('totalReads')}</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalReads}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <Eye className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comunicados recientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {translate('recentCommunications')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {communications.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">{translate('noCommunications')}</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {translate('createFirstCommunication')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {communications.slice(0, 5).map(comm => {
                    const TypeIcon = communicationTypes[comm.type].icon;
                    return (
                      <div key={comm.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-full",
                              `bg-${communicationTypes[comm.type].color}-100`
                            )}>
                              <TypeIcon className={cn(
                                "h-4 w-4",
                                `text-${communicationTypes[comm.type].color}-600`
                              )} />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{comm.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {comm.content.substring(0, 150)}...
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={priorityColors[comm.priority]}>
                                  {translate(`priority${comm.priority.charAt(0).toUpperCase() + comm.priority.slice(1)}`)}
                                </Badge>
                                <Badge className={statusColors[comm.status]}>
                                  {translate(`status${comm.status.charAt(0).toUpperCase() + comm.status.slice(1)}`)}
                                </Badge>
                                {comm.targetCourses.length > 0 && (
                                  <Badge variant="outline">
                                    <GraduationCap className="h-3 w-3 mr-1" />
                                    {comm.targetCourses.join(', ')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div>{new Date(comm.createdAt).toLocaleDateString()}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Eye className="h-3 w-3" />
                              {comm.readBy.length}
                            </div>
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

      {/* Manage View */}
      {selectedView === 'manage' && (
        <div className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {translate('filters')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={translate('searchCommunications')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder={translate('filterByCourse')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{translate('allCourses')}</SelectItem>
                    {myCourses.map(course => (
                      <SelectItem key={course} value={course}>{course}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder={translate('filterBySubject')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{translate('allSubjects')}</SelectItem>
                    {mySubjects.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder={translate('filterByType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{translate('allTypes')}</SelectItem>
                    {Object.entries(communicationTypes).map(([key, type]) => (
                      <SelectItem key={key} value={key}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={translate('filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{translate('allStatuses')}</SelectItem>
                    <SelectItem value="draft">{translate('statusDraft')}</SelectItem>
                    <SelectItem value="sent">{translate('statusSent')}</SelectItem>
                    <SelectItem value="scheduled">{translate('statusScheduled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lista de comunicados */}
          <Card>
            <CardHeader>
              <CardTitle>{translate('allCommunications')} ({filteredCommunications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCommunications.map(comm => {
                  const TypeIcon = communicationTypes[comm.type].icon;
                  return (
                    <div key={comm.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn(
                            "p-2 rounded-full",
                            `bg-${communicationTypes[comm.type].color}-100`
                          )}>
                            <TypeIcon className={cn(
                              "h-4 w-4",
                              `text-${communicationTypes[comm.type].color}-600`
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{comm.title}</h3>
                              <Badge className={priorityColors[comm.priority]}>
                                {translate(`priority${comm.priority.charAt(0).toUpperCase() + comm.priority.slice(1)}`)}
                              </Badge>
                              <Badge className={statusColors[comm.status]}>
                                {translate(`status${comm.status.charAt(0).toUpperCase() + comm.status.slice(1)}`)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {comm.content.substring(0, 200)}...
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(comm.createdAt).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {getTargetStudents().length} {translate('students')}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {comm.readBy.length} {translate('reads')}
                              </div>
                              {comm.targetCourses.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3" />
                                  {comm.targetCourses.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics View */}
      {selectedView === 'analytics' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {translate('communicationAnalytics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{translate('analyticsComingSoon')}</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {translate('analyticsDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
