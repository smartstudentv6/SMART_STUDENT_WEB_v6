// Utilidades para sincronización de datos entre módulos
// Estas funciones ayudan a mantener sincronizados los datos entre diferentes partes de la aplicación

/**
 * Dispara un evento personalizado para notificar que los datos de usuario han sido actualizados
 * Debe ser llamado desde la gestión de usuarios cuando se modifiquen cursos o asignaturas de un profesor
 */
export const notifyUserDataUpdated = () => {
  // Disparar evento personalizado
  const event = new CustomEvent('userDataUpdated', {
    detail: { timestamp: new Date().toISOString() }
  });
  window.dispatchEvent(event);
  console.log('🔄 [DataSync] Evento userDataUpdated disparado');
};

/**
 * Función para obtener datos actualizados del profesor desde localStorage
 * @param username - Username del profesor
 * @returns Datos del profesor o null si no se encuentra
 */
export const getUpdatedTeacherData = (username: string) => {
  try {
    const usersText = localStorage.getItem('smart-student-users');
    if (usersText) {
      const users = JSON.parse(usersText);
      const teacher = users.find((u: any) => u.username === username && u.role === 'teacher');
      if (teacher) {
        return {
          teachingSubjects: teacher.teachingSubjects || [],
          activeCourses: teacher.activeCourses || [],
          teachingAssignments: teacher.teachingAssignments || []
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting updated teacher data:', error);
    return null;
  }
};

/**
 * Función para validar que los cursos y asignaturas del profesor sean válidos
 * @param teacherData - Datos del profesor
 * @returns true si los datos son válidos
 */
export const validateTeacherData = (teacherData: any) => {
  if (!teacherData) return false;
  
  const hasSubjects = Array.isArray(teacherData.teachingSubjects) && teacherData.teachingSubjects.length > 0;
  const hasCourses = Array.isArray(teacherData.activeCourses) && teacherData.activeCourses.length > 0;
  
  return hasSubjects && hasCourses;
};
