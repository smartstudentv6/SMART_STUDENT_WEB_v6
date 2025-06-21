# Sistema de Edición y Eliminación de Tareas

## Funcionalidades Implementadas

### 1. Edición de Tareas

Los profesores pueden editar tareas que ya han creado mediante el botón "Editar" disponible en cada tarea.

#### Características:
- **Acceso**: Solo profesores pueden editar tareas que han creado
- **Diálogo de edición**: Reutiliza el formulario de creación con datos pre-cargados
- **Campos editables**:
  - Título de la tarea
  - Descripción
  - Materia
  - Curso asignado
  - Tipo de asignación (curso completo o estudiantes específicos)
  - Fecha límite
  - Prioridad
  - Archivos adjuntos (se pueden agregar nuevos)
  - Tipo de tarea (estándar o evaluación)
  - Configuración de evaluación (si aplica)

#### Validaciones:
- Todos los campos obligatorios deben completarse
- Si se asigna a estudiantes específicos, debe seleccionar al menos uno
- Las evaluaciones deben tener al menos una pregunta
- Validación de tipos y tamaños de archivos adjuntos

### 2. Eliminación de Tareas

Los profesores pueden eliminar tareas mediante el botón "Eliminar" con confirmación de seguridad.

#### Características:
- **Confirmación**: Requiere confirmación del usuario antes de eliminar
- **Eliminación completa**: 
  - Elimina la tarea
  - Elimina todos los comentarios asociados
  - Actualiza el localStorage
- **Feedback**: Notificación de éxito con el título de la tarea eliminada

#### Proceso de eliminación:
1. Click en botón "Eliminar"
2. Aparece diálogo de confirmación con:
   - Título de la tarea a eliminar
   - Advertencia sobre la irreversibilidad de la acción
   - Información sobre eliminación de comentarios asociados
3. Confirmación del usuario
4. Eliminación y notificación de éxito

### 3. Interfaz de Usuario

#### Botones de Acción:
- **Botón Editar**: 
  - Icono: Edit2 (lápiz)
  - Color: Azul (variant="outline")
  - Disponible solo para profesores en sus propias tareas

- **Botón Eliminar**:
  - Icono: Trash2 (papelera)
  - Color: Rojo con hover effects
  - Disponible solo para profesores en sus propias tareas

#### Ubicación:
Los botones se encuentran en la esquina superior derecha de cada card de tarea, junto al botón de "Ver detalles".

### 4. Traducciones

Soporte completo para español e inglés:

#### Español:
- `tasksEditButton`: "Editar"
- `tasksDeleteButton`: "Eliminar"
- `tasksEditDialogTitle`: "Editar Tarea"
- `tasksDeleteConfirmTitle`: "¿Estás seguro de que quieres eliminar la tarea \"{{title}}\"?"
- `tasksDeleteConfirmMessage`: "Esta acción no se puede deshacer y también eliminará todos los comentarios asociados."
- `tasksDeleteSuccess`: "Tarea eliminada"
- `tasksDeleteSuccessMessage`: "La tarea \"{{title}}\" ha sido eliminada exitosamente."
- `tasksEditNote`: "Nota: Para editar preguntas detalladamente, guarda primero y luego edita nuevamente."

#### Inglés:
- `tasksEditButton`: "Edit"
- `tasksDeleteButton`: "Delete"
- `tasksEditDialogTitle`: "Edit Task"
- `tasksDeleteConfirmTitle`: "Are you sure you want to delete the task \"{{title}}\"?"
- `tasksDeleteConfirmMessage`: "This action cannot be undone and will also delete all associated comments."
- `tasksDeleteSuccess`: "Task deleted"
- `tasksDeleteSuccessMessage`: "The task \"{{title}}\" has been successfully deleted."
- `tasksEditNote`: "Note: To edit questions in detail, save first and then edit again."

### 5. Consideraciones Técnicas

#### Seguridad:
- Solo los profesores que crearon la tarea pueden editarla o eliminarla
- Validación del rol del usuario antes de mostrar los botones
- Confirmación obligatoria para eliminación

#### Persistencia:
- Todos los cambios se guardan en localStorage
- Actualización inmediata de la interfaz después de operaciones
- Manejo consistente del estado de la aplicación

#### Limitaciones de Edición:
- Para evaluaciones con preguntas complejas, se recomienda guardar primero y luego editar nuevamente para acceso completo a la edición de preguntas
- Los archivos adjuntos existentes no se pueden eliminar individualmente (solo agregar nuevos)

## Flujo de Uso

### Para Editar una Tarea:
1. Profesor accede a la página de tareas
2. Identifica la tarea a editar
3. Click en botón "Editar"
4. Modifica los campos necesarios en el diálogo
5. Agrega archivos adicionales si es necesario
6. Click en "Guardar Cambios"
7. Confirmación de éxito

### Para Eliminar una Tarea:
1. Profesor accede a la página de tareas
2. Identifica la tarea a eliminar
3. Click en botón "Eliminar"
4. Lee el mensaje de confirmación
5. Confirma la eliminación
6. Recibe notificación de éxito

## Estado de Implementación

✅ **Completado**:
- Funcionalidad de edición completa
- Funcionalidad de eliminación completa
- Interfaz de usuario con botones apropiados
- Validaciones y confirmaciones
- Traducciones ES/EN
- Manejo de errores
- Feedback del usuario

🔄 **Mejoras Futuras**:
- Edición granular de archivos adjuntos
- Historial de cambios en tareas
- Edición más detallada de preguntas de evaluación
- Confirmación adicional para tareas con entregas de estudiantes
