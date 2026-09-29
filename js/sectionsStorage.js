/**
 * sectionsStorage.js - Base de Datos Local Independiente para Secciones y Tareas
 * Gestiona de forma desacoplada la creación de secciones por profesores,
 * asignación de alumnos, y la To-Do list colaborativa con auto-resolución al 100%.
 */

const SECTIONS_DB_KEY = 'logica_db_sections';

export class SectionsStorageService {
  constructor() {
    this.initDatabase();
  }

  initDatabase() {
    if (!localStorage.getItem(SECTIONS_DB_KEY)) {
      localStorage.setItem(SECTIONS_DB_KEY, JSON.stringify([]));
    }
  }

  getSections() {
    try {
      const data = localStorage.getItem(SECTIONS_DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error al leer secciones de localStorage:', e);
      return [];
    }
  }

  saveSections(sections) {
    try {
      localStorage.setItem(SECTIONS_DB_KEY, JSON.stringify(sections));
      return true;
    } catch (e) {
      console.error('Error al guardar secciones en localStorage:', e);
      return false;
    }
  }

  getSectionById(sectionId) {
    return this.getSections().find(s => s.id === sectionId) || null;
  }

  getSectionsForProfessor(professorId) {
    return this.getSections().filter(s => s.professorId === professorId);
  }

  getSectionsForStudent(studentId) {
    return this.getSections().filter(s => Array.isArray(s.studentIds) && s.studentIds.includes(studentId));
  }

  /**
   * Crea una nueva sección asociada a un profesor
   */
  createSection({ name, professorId, professorName, studentIds = [] }) {
    const cleanName = (name || '').trim();
    if (!cleanName || cleanName.length < 2) {
      return { success: false, message: 'El nombre de la sección debe tener al menos 2 caracteres.' };
    }

    const newSection = {
      id: `sec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      professorId,
      professorName: professorName || 'Profesor',
      studentIds: Array.from(new Set(studentIds)), // Sin duplicados
      createdAt: new Date().toISOString(),
      tasks: []
    };

    const sections = this.getSections();
    sections.push(newSection);
    this.saveSections(sections);

    return { success: true, section: newSection };
  }

  /**
   * Elimina una sección específica
   */
  deleteSection(sectionId) {
    const sections = this.getSections();
    const updated = sections.filter(s => s.id !== sectionId);
    this.saveSections(updated);
    return { success: true };
  }

  /**
   * Eliminación en cascada: borra todas las secciones de un profesor eliminado
   */
  deleteSectionsByProfessor(professorId) {
    const sections = this.getSections();
    const updated = sections.filter(s => s.professorId !== professorId);
    this.saveSections(updated);
    return { success: true };
  }

  /**
   * Desvincula a un estudiante eliminado de todas las secciones
   */
  removeStudentFromAllSections(studentId) {
    const sections = this.getSections();
    sections.forEach(section => {
      section.studentIds = (section.studentIds || []).filter(id => id !== studentId);
      // Limpiar de tareas y verificar si las tareas se completaron
      if (Array.isArray(section.tasks)) {
        section.tasks.forEach(task => {
          task.completedByStudentIds = (task.completedByStudentIds || []).filter(id => id !== studentId);
        });
        // Si todos los restantes la completaron y hay al menos 1 alumno
        if (section.studentIds.length > 0) {
          section.tasks = section.tasks.filter(task => {
            return !section.studentIds.every(sId => task.completedByStudentIds.includes(sId));
          });
        }
      }
    });
    this.saveSections(sections);
    return { success: true };
  }

  /**
   * Agrega un estudiante a una sección existente
   */
  addStudentToSection(sectionId, studentId) {
    const sections = this.getSections();
    const section = sections.find(s => s.id === sectionId);
    if (!section) return { success: false, message: 'Sección no encontrada.' };

    if (!section.studentIds.includes(studentId)) {
      section.studentIds.push(studentId);
      this.saveSections(sections);
    }
    return { success: true, section };
  }

  /**
   * Quita a un estudiante de una sección
   */
  removeStudentFromSection(sectionId, studentId) {
    const sections = this.getSections();
    const section = sections.find(s => s.id === sectionId);
    if (!section) return { success: false, message: 'Sección no encontrada.' };

    section.studentIds = section.studentIds.filter(id => id !== studentId);
    // Limpiar de tareas existentes
    if (Array.isArray(section.tasks)) {
      section.tasks.forEach(task => {
        task.completedByStudentIds = (task.completedByStudentIds || []).filter(id => id !== studentId);
      });
      // Auto-eliminar tareas que hayan quedado 100% completadas
      if (section.studentIds.length > 0) {
        section.tasks = section.tasks.filter(task => {
          return !section.studentIds.every(sId => task.completedByStudentIds.includes(sId));
        });
      }
    }

    this.saveSections(sections);
    return { success: true, section };
  }

  // --- GESTIÓN DE TAREAS (TO-DO LIST) ---

  /**
   * Añade una tarea a la sección
   */
  addTask(sectionId, text) {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      return { success: false, message: 'El texto de la tarea no puede estar vacío.' };
    }

    const sections = this.getSections();
    const section = sections.find(s => s.id === sectionId);
    if (!section) return { success: false, message: 'Sección no encontrada.' };

    const newTask = {
      id: `task_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      text: cleanText,
      createdAt: new Date().toISOString(),
      completedByStudentIds: []
    };

    if (!Array.isArray(section.tasks)) section.tasks = [];
    section.tasks.push(newTask);
    this.saveSections(sections);

    return { success: true, task: newTask, section };
  }

  /**
   * Elimina una tarea manualmente
   */
  deleteTask(sectionId, taskId) {
    const sections = this.getSections();
    const section = sections.find(s => s.id === sectionId);
    if (!section) return { success: false, message: 'Sección no encontrada.' };

    section.tasks = (section.tasks || []).filter(t => t.id !== taskId);
    this.saveSections(sections);
    return { success: true, section };
  }

  /**
   * Marca una tarea como realizada por un alumno.
   * Si el 100% de los estudiantes inscritos la completaron, la tarea se auto-elimina de la sección.
   */
  markTaskCompleted(sectionId, taskId, studentId) {
    const sections = this.getSections();
    const section = sections.find(s => s.id === sectionId);
    if (!section) return { success: false, message: 'Sección no encontrada.' };

    const task = (section.tasks || []).find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Tarea no encontrada o ya finalizada.' };

    if (!Array.isArray(task.completedByStudentIds)) {
      task.completedByStudentIds = [];
    }

    if (!task.completedByStudentIds.includes(studentId)) {
      task.completedByStudentIds.push(studentId);
    }

    // Comprobar si el 100% de los estudiantes de la sección la completaron
    const enrolledStudents = section.studentIds || [];
    const allCompleted = enrolledStudents.length > 0 &&
      enrolledStudents.every(sId => task.completedByStudentIds.includes(sId));

    if (allCompleted) {
      // Auto-eliminar la tarea completada al 100%
      section.tasks = section.tasks.filter(t => t.id !== taskId);
    }

    this.saveSections(sections);
    return {
      success: true,
      allCompleted,
      section,
      taskId
    };
  }
}

export const sectionsDB = new SectionsStorageService();
