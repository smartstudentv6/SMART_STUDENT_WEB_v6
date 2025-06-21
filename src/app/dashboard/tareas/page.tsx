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
import { ClipboardList, Plus, Calendar, User, Users, MessageSquare, Eye, Send, Edit2, Reply, Trash2, Check, X } from 'lucide-react';
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
  replyToId?: string; // ID of comment this is replying to
  editedAt?: string; // timestamp of last edit
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

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

    // Validar que si se asigna a estudiantes específicos, haya al menos uno seleccionado
    if (formData.assignedTo === 'student' && formData.assignedStudents.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un estudiante para asignar la tarea.",
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

    // Determinar cuántos estudiantes se asignaron
    const assignedCount = formData.assignedTo === 'course' 
      ? getStudentsForCourse(formData.course).length 
      : formData.assignedStudents.length;

    toast({
      title: "Tarea creada",
      description: `Tarea "${formData.title}" asignada a ${assignedCount} estudiante(s).`,
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
      isSubmission: isSubmission,
      replyToId: replyingToId || undefined
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
    setReplyingToId(null);

    toast({
      title: isSubmission ? "Tarea enviada" : replyingToId ? "Respuesta agregada" : "Comentario agregado",
      description: isSubmission ? "Tu tarea ha sido enviada al profesor." : 
                   replyingToId ? "Tu respuesta ha sido agregada." : "Comentario agregado exitosamente.",
    });
  };

  const handleEditComment = (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setEditingCommentId(commentId);
      setEditingCommentText(comment.comment);
    }
  };

  const handleSaveEditComment = () => {
    if (!editingCommentText.trim() || !editingCommentId) return;

    const updatedComments = comments.map(comment => 
      comment.id === editingCommentId 
        ? { ...comment, comment: editingCommentText, editedAt: new Date().toISOString() }
        : comment
    );
    saveComments(updatedComments);

    setEditingCommentId(null);
    setEditingCommentText('');

    toast({
      title: "Comentario actualizado",
      description: "Tu comentario ha sido actualizado exitosamente.",
    });
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    const updatedComments = comments.filter(comment => comment.id !== commentId);
    saveComments(updatedComments);

    toast({
      title: "Comentario eliminado",
      description: "El comentario ha sido eliminado.",
    });
  };

  const handleReplyToComment = (commentId: string) => {
    setReplyingToId(commentId);
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setNewComment(`@${comment.studentName} `);
    }
  };

  const canEditComment = (comment: TaskComment) => {
    if (comment.studentUsername !== user?.username) return false;
    const commentTime = new Date(comment.timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - commentTime.getTime()) / (1000 * 60);
    return diffMinutes <= 5; // Allow editing for 5 minutes
  };

  const canDeleteComment = (comment: TaskComment) => {
    return comment.studentUsername === user?.username || user?.role === 'teacher';
  };

  const getTaskComments = (taskId: string) => {
    return comments
      .filter(comment => comment.taskId === taskId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getCommentReplies = (commentId: string, taskId: string) => {
    return comments.filter(comment => 
      comment.taskId === taskId && comment.replyToId === commentId
    );
  };

  const getMainComments = (taskId: string) => {
    return comments.filter(comment => 
      comment.taskId === taskId && !comment.replyToId
    );
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
            
            {/* Primero el curso */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="course" className="text-right">Curso *</Label>
              <Select 
                value={formData.course} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  course: value,
                  // Reset student selection when course changes
                  assignedStudents: []
                }))}
              >
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
            
            {/* Luego la asignatura */}
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
              <Label className="text-right">Asignar a</Label>
              <Select 
                value={formData.assignedTo} 
                onValueChange={(value: 'course' | 'student') => setFormData(prev => ({ 
                  ...prev, 
                  assignedTo: value,
                  // Reset student selection when assignment type changes
                  assignedStudents: []
                }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Todo el curso</SelectItem>
                  <SelectItem value="student">Estudiantes específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Mostrar selector de estudiantes específicos cuando se selecciona esa opción */}
            {formData.assignedTo === 'student' && formData.course && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Estudiantes *</Label>
                <div className="col-span-3 space-y-2">
                  <div className="text-sm text-muted-foreground mb-2">
                    Selecciona los estudiantes de {formData.course}:
                  </div>
                  <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                    {getStudentsForCourse(formData.course).map((student: any) => (
                      <div key={student.username} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          id={`student-${student.username}`}
                          checked={formData.assignedStudents.includes(student.username)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                assignedStudents: [...prev.assignedStudents, student.username]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                assignedStudents: prev.assignedStudents.filter(s => s !== student.username)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <label 
                          htmlFor={`student-${student.username}`}
                          className="text-sm cursor-pointer"
                        >
                          {student.displayName}
                        </label>
                      </div>
                    ))}
                    {getStudentsForCourse(formData.course).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No hay estudiantes en este curso
                      </div>
                    )}
                  </div>
                  {formData.assignedStudents.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {formData.assignedStudents.length} estudiante(s) seleccionado(s)
                    </div>
                  )}
                </div>
              </div>
            )}
            
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
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {getMainComments(selectedTask.id).map(comment => (
                    <div key={comment.id} className="space-y-2">
                      {/* Main Comment */}
                      <div className={`p-4 rounded-lg border-l-4 ${
                        comment.isSubmission 
                          ? 'bg-green-50 border-l-green-500 dark:bg-green-900/10' 
                          : 'bg-muted border-l-blue-500'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {comment.studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-sm">{comment.studentName}</span>
                              {comment.editedAt && (
                                <span className="text-xs text-muted-foreground ml-2">{translate('tasksCommentEdited')}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {comment.isSubmission && (
                              <Badge variant="secondary" className="text-xs">
                                Entrega
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.timestamp)}
                            </span>
                            <div className="flex space-x-1">
                              {canEditComment(comment) && editingCommentId !== comment.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditComment(comment.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                              {user?.role === 'student' && comment.studentUsername !== user.username && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReplyToComment(comment.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Reply className="w-3 h-3" />
                                </Button>
                              )}
                              {canDeleteComment(comment) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="text-sm"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={handleSaveEditComment} disabled={!editingCommentText.trim()}>
                                <Check className="w-3 h-3 mr-1" />
                                {translate('tasksCommentSave')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                <X className="w-3 h-3 mr-1" />
                                {translate('tasksCommentCancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm">{comment.comment}</p>
                        )}
                      </div>
                      
                      {/* Replies */}
                      {getCommentReplies(comment.id, selectedTask.id).map(reply => (
                        <div key={reply.id} className="ml-8 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border-l-2 border-l-gray-300">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                {reply.studentName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-medium text-sm">{reply.studentName}</span>
                                {reply.editedAt && (
                                  <span className="text-xs text-muted-foreground ml-2">{translate('tasksCommentEdited')}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(reply.timestamp)}
                              </span>
                              {canDeleteComment(reply) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{reply.comment}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {getMainComments(selectedTask.id).length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {translate('tasksCommentNoComments')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {(user?.role === 'student' || user?.role === 'teacher') && (
                <div className="space-y-3">
                  <Separator />
                  
                  {replyingToId && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Reply className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            {translate('tasksCommentReplyTo')} {comments.find(c => c.id === replyingToId)?.studentName}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingToId(null);
                            setNewComment('');
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="newComment">
                      {replyingToId ? translate('tasksCommentAddReply') : 
                       isSubmission ? 'Entregar tarea' : 'Agregar comentario'}
                    </Label>
                    <Textarea
                      id="newComment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        replyingToId ? 'Escribe tu respuesta...' :
                        isSubmission ? 'Describe tu entrega...' : 'Escribe un comentario...'
                      }
                      className="mt-1"
                      rows={3}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center space-x-4">
                        {!replyingToId && user?.role === 'student' && (
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
                        )}
                        <div className="text-xs text-muted-foreground">
                          {newComment.length}/500 {translate('tasksCommentCharacterLimit')}
                        </div>
                      </div>
                      <Button 
                        onClick={handleAddComment} 
                        disabled={!newComment.trim() || newComment.length > 500}
                        size="sm"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {replyingToId ? 'Responder' : 
                         isSubmission ? 'Entregar' : 'Comentar'}
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
