// Servicio de sincronización automática para notificaciones
// Este archivo debe ser incluido en el sistema principal

class NotificationSyncService {
    constructor() {
        this.isEnabled = false;
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.syncIntervalMs = 60000; // 1 minuto
        this.debugMode = false;
        
        // Estadísticas de sincronización
        this.stats = {
            totalSyncs: 0,
            ghostsRemoved: 0,
            notificationsCreated: 0,
            lastSyncDuration: 0,
            errors: []
        };
        
        this.bindEvents();
    }

    // Inicializar el servicio
    enable() {
        if (this.isEnabled) return;
        
        this.isEnabled = true;
        this.startAutoSync();
        this.log('🔄 Servicio de sincronización automática activado');
    }

    // Desactivar el servicio
    disable() {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        this.stopAutoSync();
        this.log('⏸️ Servicio de sincronización automática desactivado');
    }

    // Configurar intervalo de sincronización
    setInterval(milliseconds) {
        this.syncIntervalMs = milliseconds;
        if (this.isEnabled) {
            this.stopAutoSync();
            this.startAutoSync();
        }
        this.log(`⏰ Intervalo de sincronización actualizado a ${milliseconds}ms`);
    }

    // Activar/desactivar modo debug
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`🐛 Modo debug ${enabled ? 'activado' : 'desactivado'}`);
    }

    // Iniciar sincronización automática
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            this.performSync();
        }, this.syncIntervalMs);
        
        // Realizar sincronización inmediata
        this.performSync();
    }

    // Detener sincronización automática
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Realizar sincronización completa
    async performSync() {
        const startTime = Date.now();
        
        try {
            this.log('🔄 Iniciando sincronización automática...');
            
            const syncResult = await this.syncNotifications();
            
            this.stats.totalSyncs++;
            this.stats.ghostsRemoved += syncResult.ghostsRemoved;
            this.stats.notificationsCreated += syncResult.notificationsCreated;
            this.stats.lastSyncDuration = Date.now() - startTime;
            this.lastSyncTime = new Date();
            
            if (syncResult.hasChanges) {
                this.log(`✅ Sincronización completada: ${syncResult.ghostsRemoved} fantasmas eliminados, ${syncResult.notificationsCreated} notificaciones creadas`);
                
                // Disparar evento de actualización
                window.dispatchEvent(new CustomEvent('taskNotificationsUpdated'));
            } else {
                this.log('✅ Sistema sincronizado - no se requirieron cambios');
            }
            
        } catch (error) {
            this.stats.errors.push({
                timestamp: new Date().toISOString(),
                error: error.message,
                stack: error.stack
            });
            
            this.log(`❌ Error en sincronización: ${error.message}`, 'error');
        }
    }

    // Sincronizar notificaciones
    async syncNotifications() {
        const result = {
            hasChanges: false,
            ghostsRemoved: 0,
            notificationsCreated: 0,
            commentsRemoved: 0
        };

        // Cargar datos
        const tasks = this.loadTasks();
        const notifications = this.loadNotifications();
        const comments = this.loadComments();
        const users = this.loadUsers();

        // Paso 1: Eliminar notificaciones fantasma
        const validNotifications = [];
        for (const notification of notifications) {
            const taskExists = tasks.some(task => task.id === notification.taskId);
            
            if (!taskExists) {
                this.log(`👻 Eliminando notificación fantasma: ${notification.taskTitle} (TaskId: ${notification.taskId})`, 'warning');
                result.ghostsRemoved++;
                result.hasChanges = true;
            } else {
                validNotifications.push(notification);
            }
        }

        // Paso 2: Crear notificaciones faltantes
        for (const task of tasks) {
            const hasNewTaskNotification = validNotifications.some(notification => 
                notification.taskId === task.id && notification.type === 'new_task'
            );
            
            if (!hasNewTaskNotification) {
                const studentsInCourse = this.getStudentsInCourse(task.course, users);
                
                if (studentsInCourse.length > 0) {
                    const newNotification = {
                        id: `auto_sync_${task.id}_${Date.now()}`,
                        type: 'new_task',
                        taskId: task.id,
                        taskTitle: task.title,
                        targetUserRole: 'student',
                        targetUsernames: studentsInCourse,
                        fromUsername: task.assignedBy,
                        fromDisplayName: task.assignedByName,
                        course: task.course,
                        subject: task.subject,
                        timestamp: task.createdAt || new Date().toISOString(),
                        read: false,
                        readBy: [],
                        taskType: task.taskType || 'assignment'
                    };
                    
                    validNotifications.push(newNotification);
                    result.notificationsCreated++;
                    result.hasChanges = true;
                    
                    this.log(`➕ Creada notificación faltante: ${task.title}`, 'success');
                }
            }
        }

        // Paso 3: Limpiar comentarios huérfanos
        const validComments = [];
        for (const comment of comments) {
            const taskExists = tasks.some(task => task.id === comment.taskId);
            
            if (!taskExists) {
                this.log(`💬 Eliminando comentario huérfano: ${comment.comment.substring(0, 50)}... (TaskId: ${comment.taskId})`, 'warning');
                result.commentsRemoved++;
                result.hasChanges = true;
            } else {
                validComments.push(comment);
            }
        }

        // Guardar cambios si hubo modificaciones
        if (result.hasChanges) {
            this.saveNotifications(validNotifications);
            this.saveComments(validComments);
            
            // Disparar evento para que la UI se actualice
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('notificationSyncCompleted', {
                    detail: {
                        ghostsRemoved: result.ghostsRemoved,
                        notificationsCreated: result.notificationsCreated,
                        commentsRemoved: result.commentsRemoved
                    }
                }));
            }
        }

        return result;
    }

    // Verificar consistencia del sistema
    checkConsistency() {
        const tasks = this.loadTasks();
        const notifications = this.loadNotifications();
        const comments = this.loadComments();
        
        const issues = {
            ghostNotifications: [],
            orphanTasks: [],
            orphanComments: [],
            duplicateNotifications: []
        };

        // Detectar notificaciones fantasma
        for (const notification of notifications) {
            const taskExists = tasks.some(task => task.id === notification.taskId);
            if (!taskExists) {
                issues.ghostNotifications.push(notification);
            }
        }

        // Detectar tareas huérfanas (sin notificaciones)
        for (const task of tasks) {
            const hasNotification = notifications.some(notification => 
                notification.taskId === task.id && notification.type === 'new_task'
            );
            if (!hasNotification) {
                issues.orphanTasks.push(task);
            }
        }

        // Detectar comentarios huérfanos
        for (const comment of comments) {
            const taskExists = tasks.some(task => task.id === comment.taskId);
            if (!taskExists) {
                issues.orphanComments.push(comment);
            }
        }

        // Detectar notificaciones duplicadas
        const notificationMap = new Map();
        for (const notification of notifications) {
            const key = `${notification.type}_${notification.taskId}`;
            if (notificationMap.has(key)) {
                issues.duplicateNotifications.push(notification);
            } else {
                notificationMap.set(key, notification);
            }
        }

        return issues;
    }

    // Generar reporte de estado
    generateStatusReport() {
        const tasks = this.loadTasks();
        const notifications = this.loadNotifications();
        const comments = this.loadComments();
        const issues = this.checkConsistency();
        
        const report = {
            timestamp: new Date().toISOString(),
            isEnabled: this.isEnabled,
            lastSyncTime: this.lastSyncTime,
            syncInterval: this.syncIntervalMs,
            stats: { ...this.stats },
            data: {
                tasksCount: tasks.length,
                notificationsCount: notifications.length,
                commentsCount: comments.length
            },
            issues: {
                ghostNotifications: issues.ghostNotifications.length,
                orphanTasks: issues.orphanTasks.length,
                orphanComments: issues.orphanComments.length,
                duplicateNotifications: issues.duplicateNotifications.length
            },
            healthScore: this.calculateHealthScore(tasks.length + notifications.length + comments.length, 
                                                  issues.ghostNotifications.length + issues.orphanTasks.length + issues.orphanComments.length)
        };

        return report;
    }

    // Calcular score de salud del sistema
    calculateHealthScore(totalItems, problemItems) {
        if (totalItems === 0) return 100;
        return Math.max(0, Math.round((1 - problemItems / totalItems) * 100));
    }

    // Obtener estudiantes de un curso
    getStudentsInCourse(course, users) {
        const students = [];
        
        Object.values(users).forEach(user => {
            if (user.role === 'student' && user.activeCourses && user.activeCourses.includes(course)) {
                students.push(user.username);
            }
        });
        
        return students;
    }

    // Métodos de carga de datos
    loadTasks() {
        try {
            return JSON.parse(localStorage.getItem('smart-student-tasks') || '[]');
        } catch (error) {
            this.log('❌ Error cargando tareas: ' + error.message, 'error');
            return [];
        }
    }

    loadNotifications() {
        try {
            return JSON.parse(localStorage.getItem('smart-student-task-notifications') || '[]');
        } catch (error) {
            this.log('❌ Error cargando notificaciones: ' + error.message, 'error');
            return [];
        }
    }

    loadComments() {
        try {
            return JSON.parse(localStorage.getItem('smart-student-task-comments') || '[]');
        } catch (error) {
            this.log('❌ Error cargando comentarios: ' + error.message, 'error');
            return [];
        }
    }

    loadUsers() {
        try {
            return JSON.parse(localStorage.getItem('smart-student-users') || '{}');
        } catch (error) {
            this.log('❌ Error cargando usuarios: ' + error.message, 'error');
            return {};
        }
    }

    // Métodos de guardado de datos
    saveNotifications(notifications) {
        try {
            localStorage.setItem('smart-student-task-notifications', JSON.stringify(notifications));
        } catch (error) {
            this.log('❌ Error guardando notificaciones: ' + error.message, 'error');
        }
    }

    saveComments(comments) {
        try {
            localStorage.setItem('smart-student-task-comments', JSON.stringify(comments));
        } catch (error) {
            this.log('❌ Error guardando comentarios: ' + error.message, 'error');
        }
    }

    // Vincular eventos del sistema
    bindEvents() {
        // Escuchar cambios en tareas
        window.addEventListener('storage', (e) => {
            if (e.key === 'smart-student-tasks' && this.isEnabled) {
                this.log('📋 Cambios detectados en tareas, programando sincronización...');
                // Sincronizar después de un breve retraso
                setTimeout(() => this.performSync(), 2000);
            }
        });

        // Escuchar cuando se crea una nueva tarea
        window.addEventListener('taskCreated', (e) => {
            if (this.isEnabled) {
                this.log('➕ Nueva tarea creada, sincronizando...');
                setTimeout(() => this.performSync(), 1000);
            }
        });

        // Escuchar cuando se elimina una tarea
        window.addEventListener('taskDeleted', (e) => {
            if (this.isEnabled) {
                this.log('🗑️ Tarea eliminada, sincronizando...');
                setTimeout(() => this.performSync(), 1000);
            }
        });
    }

    // Método de logging
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = '[NotificationSync]';
        
        if (this.debugMode || level === 'error') {
            const logMethod = level === 'error' ? console.error : 
                            level === 'warning' ? console.warn : console.log;
            logMethod(`${prefix} [${timestamp}] ${message}`);
        }
    }

    // Método para limpiar estadísticas
    clearStats() {
        this.stats = {
            totalSyncs: 0,
            ghostsRemoved: 0,
            notificationsCreated: 0,
            lastSyncDuration: 0,
            errors: []
        };
    }

    // Método para obtener estadísticas
    getStats() {
        return {
            ...this.stats,
            isEnabled: this.isEnabled,
            lastSyncTime: this.lastSyncTime,
            syncInterval: this.syncIntervalMs
        };
    }

    // Método para forzar sincronización inmediata
    forcSync() {
        this.log('🔄 Sincronización forzada iniciada...');
        return this.performSync();
    }

    // Método para reiniciar el servicio
    restart() {
        this.disable();
        setTimeout(() => {
            this.enable();
        }, 1000);
    }
}

// Crear instancia global del servicio
window.NotificationSyncService = new NotificationSyncService();

// Función de inicialización para el sistema principal
function initializeNotificationSync() {
    const syncService = window.NotificationSyncService;
    
    // Activar el servicio por defecto
    syncService.enable();
    
    // Configurar intervalo de sincronización (1 minuto)
    syncService.setInterval(60000);
    
    // Activar modo debug en desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        syncService.setDebugMode(true);
    }
    
    // Exponer funciones útiles globalmente
    window.debugNotificationSync = function() {
        const report = syncService.generateStatusReport();
        console.log('🔍 Reporte de sincronización:', report);
        return report;
    };
    
    window.forceNotificationSync = function() {
        return syncService.forcSync();
    };
    
    window.toggleNotificationSync = function() {
        if (syncService.isEnabled) {
            syncService.disable();
        } else {
            syncService.enable();
        }
        return syncService.isEnabled;
    };
    
    console.log('🔄 NotificationSyncService inicializado');
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotificationSync);
} else {
    initializeNotificationSync();
}

// Exportar para uso en módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSyncService;
}

// Exportar para uso en módulos ES6 también
if (typeof window !== 'undefined') {
    window.NotificationSyncService = NotificationSyncService;
}
