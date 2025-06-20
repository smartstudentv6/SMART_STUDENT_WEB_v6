"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, Plus, Calendar, User, Users, MessageSquare, Eye, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  subject: string;
  course: string;
  assignedBy: string; // teacher username
  assignedByName: string; // teacher display name
  assignedTo: 'course' | 'student'; // type of assignment
  assignedStudents?: string[]; // specific students if assignedTo is 'student'
  dueDate: string;
  createdAt: string;
  status: 'pending' | 'submitted' | 'reviewed';
  priority: 'low' | 'medium' | 'high';
}

interface TaskComment {
  id: string;
  taskId: string;
  studentUsername: string;
  studentName: string;
  comment: string;
  timestamp: string;
  isSubmission: boolean; // true if this is the student's submission
}

export default function TareasPage() {
  const { user } = useAuth();
  const { translate } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmission, setIsSubmission] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    course: '',
    assignedTo: 'course' as 'course' | 'student',
    assignedStudents: [] as string[],
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  // Load tasks and comments
  useEffect(() => {
    loadTasks();
    loadComments();
  }, []);

  const loadTasks = () => {
    const storedTasks = localStorage.getItem('smart-student-tasks');
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  };

  const loadComments = () => {
    const storedComments = localStorage.getItem('smart-student-task-comments');
    if (storedComments) {
      setComments(JSON.parse(storedComments));
    }
  };

  const saveTasks = (newTasks: Task[]) => {
    localStorage.setItem('smart-student-tasks', JSON.stringify(newTasks));
    setTasks(newTasks);
  };

  const saveComments = (newComments: TaskComment[]) => {
    localStorage.setItem('smart-student-task-comments', JSON.stringify(newComments));
    setComments(newComments);
  };

  // Get available courses and subjects for teacher
  const getAvailableCourses = () => {
    if (user?.role === 'teacher') {
      return user.activeCourses || [];
    }
    return [];
  };

  const getAvailableSubjects = () => {
    if (user?.role === 'teacher' && user.teachingAssignments) {
      return [...new Set(user.teachingAssignments.map(ta => ta.subject))];
    }
    return ['Matemáticas', 'Lenguaje y Comunicación', 'Ciencias Naturales', 'Historia, Geografía y Ciencias Sociales'];
  };

  // Get students for selected course
  const getStudentsForCourse = (course: string) => {
    const users = JSON.parse(localStorage.getItem('smart-student-users') || '[]');
    return users.filter((u: any) => 
      u.role === 'student' && 
      u.activeCourses && 
      u.activeCourses.includes(course)
    );
  };

  // Filter tasks based on user role
  const getFilteredTasks = () => {
    if (user?.role === 'teacher') {
      // Teachers see tasks they created
      return tasks.filter(task => task.assignedBy === user.username);
    } else if (user?.role === 'student') {
      // Students see tasks assigned to them or their course
      return tasks.filter(task => {
        if (task.assignedTo === 'course') {
          return user.activeCourses?.includes(task.course);
        } else {
          return task.assignedStudents?.includes(user.username);
        }
      });
    }
    return [];
  };

  const handleCreateTask = () => {
    if (!formData.title || !formData.description || !formData.course || !formData.dueDate) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios.",
        variant: 'destructive'
      });
      return;
    }

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: formData.title,
      description: formData.description,
      subject: formData.subject,
      course: formData.course,
      assignedBy: user?.username || '',
      assignedByName: user?.displayName || '',
      assignedTo: formData.assignedTo,
      assignedStudents: formData.assignedTo === 'student' ? formData.assignedStudents : undefined,
      dueDate: formData.dueDate,
      createdAt: new Date().toISOString(),
      status: 'pending',
      priority: formData.priority
    };

    const updatedTasks = [...tasks, newTask];
    saveTasks(updatedTasks);

    toast({
      title: "Tarea creada",
      description: `Tarea "${formData.title}" asignada exitosamente.`,
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      subject: '',
      course: '',
      assignedTo: 'course',
      assignedStudents: [],
      dueDate: '',
      priority: 'medium'
    });
    setShowCreateDialog(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedTask) return;

    const comment: TaskComment = {
      id: `comment_${Date.now()}`,
      taskId: selectedTask.id,
      studentUsername: user?.username || '',
      studentName: user?.displayName || '',
      comment: newComment,
      timestamp: new Date().toISOString(),
      isSubmission: isSubmission
    };

    const updatedComments = [...comments, comment];
    saveComments(updatedComments);

    // Update task status if this is a submission
    if (isSubmission) {
      const updatedTasks = tasks.map(task => 
        task.id === selectedTask.id 
          ? { ...task, status: 'submitted' as const }
          : task
      );
      saveTasks(updatedTasks);
    }

    setNewComment('');
    setIsSubmission(false);

    toast({
      title: isSubmission ? "Tarea enviada" : "Comentario agregado",
      description: isSubmission ? "Tu tarea ha sido enviada al profesor." : "Comentario agregado exitosamente.",
    });
  };

  const getTaskComments = (taskId: string) => {
    return comments.filter(comment => comment.taskId === taskId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'submitted': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'reviewed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <ClipboardList className="w-8 h-8 mr-3 text-indigo-600" />
            {translate('tasksPageTitle')}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'teacher' 
              ? translate('tasksPageSubTeacher')
              : translate('tasksPageSubStudent')
            }
          </p>
        </div>
        
        {user?.role === 'teacher' && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </Button>
        )}
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {user?.role === 'teacher' 
                  ? translate('tasksEmptyTeacher')
                  : translate('tasksEmptyStudent')
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline">{task.subject}</Badge>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status === 'pending' ? 'Pendiente' : 
                         task.status === 'submitted' ? 'Enviada' : 'Revisada'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {task.description}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Vence: {formatDate(task.dueDate)}
                    </span>
                    <span className="flex items-center">
                      {task.assignedTo === 'course' ? (
                        <>
                          <Users className="w-3 h-3 mr-1" />
                          {task.course}
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          {task.assignedStudents?.length} estudiantes
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {getTaskComments(task.id).length} comentarios
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Tarea</DialogTitle>
            <DialogDescription>
              Completa la información para asignar una nueva tarea a tus estudiantes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="col-span-3"
                placeholder="Título de la tarea"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">Descripción *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="Describe la tarea detalladamente..."
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">Asignatura</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona una asignatura" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubjects().map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="course" className="text-right">Curso *</Label>
              <Select value={formData.course} onValueChange={(value) => setFormData(prev => ({ ...prev, course: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un curso" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCourses().map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Asignar a</Label>
              <Select value={formData.assignedTo} onValueChange={(value: 'course' | 'student') => setFormData(prev => ({ ...prev, assignedTo: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Todo el curso</SelectItem>
                  <SelectItem value="student">Estudiantes específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">Fecha límite *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Prioridad</Label>
              <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTask}>
              Crear Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>
              {selectedTask?.assignedByName} • {selectedTask?.course} • {selectedTask?.subject}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Descripción</h4>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              </div>
              
              <div className="flex space-x-4 text-sm">
                <span>
                  <strong>Fecha límite:</strong> {formatDate(selectedTask.dueDate)}
                </span>
                <span>
                  <strong>Estado:</strong> 
                  <Badge className={`ml-1 ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status === 'pending' ? 'Pendiente' : 
                     selectedTask.status === 'submitted' ? 'Enviada' : 'Revisada'}
                  </Badge>
                </span>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Comentarios y Entregas</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {getTaskComments(selectedTask.id).map(comment => (
                    <div key={comment.id} className="bg-muted p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">{comment.studentName}</span>
                        <div className="flex items-center space-x-2">
                          {comment.isSubmission && (
                            <Badge variant="secondary" className="text-xs">Entrega</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </div>
                  ))}
                  
                  {getTaskComments(selectedTask.id).length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No hay comentarios aún
                    </p>
                  )}
                </div>
              </div>
              
              {user?.role === 'student' && (
                <div className="space-y-3">
                  <Separator />
                  <div>
                    <Label htmlFor="newComment">
                      {isSubmission ? 'Entregar tarea' : 'Agregar comentario'}
                    </Label>
                    <Textarea
                      id="newComment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={isSubmission ? 'Describe tu entrega...' : 'Escribe un comentario...'}
                      className="mt-1"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isSubmission"
                          checked={isSubmission}
                          onChange={(e) => setIsSubmission(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="isSubmission" className="text-sm">
                          Marcar como entrega final
                        </Label>
                      </div>
                      <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                        <Send className="w-4 h-4 mr-2" />
                        {isSubmission ? 'Entregar' : 'Comentar'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
