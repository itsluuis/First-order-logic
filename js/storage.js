/**
 * storage.js - Capa de Persistencia Local y Configuración (DBService)
 * Gestiona los 3 perfiles del sistema (Administrador, Profesor, Estudiante),
 * sesiones activas y parámetros globales de la aplicación.
 */

const DB_KEYS = {
  SESSION: 'logica_db_session',
  SETTINGS: 'logica_db_settings',
  USERS: 'logica_db_users'
};

export const PROFILES = {
  ADMIN: {
    id: 'admin',
    name: 'Administrador',
    role: 'admin',
    requiresPassword: true,
    password: '1234',
    icon: 'shield',
    description: 'Acceso total y configuración de parámetros del sistema.'
  },
  PROFESOR: {
    id: 'profesor',
    name: 'Profesor',
    role: 'profesor',
    requiresPassword: true,
    icon: 'teacher',
    description: 'Uso de herramientas lógicas, constructor visual y tablas de verdad.'
  },
  ESTUDIANTE: {
    id: 'estudiante',
    name: 'Estudiante',
    role: 'estudiante',
    requiresPassword: true,
    icon: 'student',
    description: 'Práctica con proposiciones moleculares, FBF y análisis sintáctico.'
  }
};

const DEFAULT_SETTINGS = {
  forcedNotation: 'none', // 'none', 'standard', 'alternative'
  theme: 'dark'
};

export class StorageService {
  constructor() {
    this.initDatabase();
  }

  initDatabase() {
    if (!localStorage.getItem(DB_KEYS.SETTINGS)) {
      localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(DB_KEYS.USERS)) {
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify([]));
    }
  }

  // --- GESTIÓN DE USUARIOS LOCALES ---
  getUsers() {
    try {
      const data = localStorage.getItem(DB_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error al leer usuarios de localStorage:', e);
      return [];
    }
  }

  saveUsers(users) {
    try {
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
      return true;
    } catch (e) {
      console.error('Error al guardar usuarios en localStorage:', e);
      return false;
    }
  }

  normalizeUsername(username) {
    return (username || '').trim().toLowerCase();
  }

  findUser(role, username) {
    const normalized = this.normalizeUsername(username);
    const users = this.getUsers();
    return users.find(u => u.role === role && u.normalizedUsername === normalized);
  }

  findUserById(userId) {
    const users = this.getUsers();
    return users.find(u => u.id === userId);
  }

  /**
   * Elimina un usuario por su ID y realiza la limpieza de sus datos asociados
   */
  deleteUser(userId) {
    const user = this.findUserById(userId);
    if (!user) return { success: false, message: 'Usuario no encontrado.' };

    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);

    // Limpiar perfil ML si era estudiante
    if (user.role === 'estudiante') {
      try {
        localStorage.removeItem(`logica_student_ml_profile_${userId}`);
      } catch (e) {
        console.warn('Error al limpiar perfil ML de estudiante:', e);
      }
    }

    return { success: true, deletedUser: user };
  }

  /**
   * Valida estrictamente que un PIN contenga exactamente 3 dígitos numéricos
   */
  isValidStudentPin(pin) {
    return /^\d{3}$/.test(String(pin || '').trim());
  }

  /**
   * Registra un nuevo usuario en la base de datos local
   */
  registerUser({ username, role, pin = '', password = '' }) {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername || cleanUsername.length < 2) {
      return { success: false, message: 'El nombre debe tener al menos 2 caracteres.' };
    }

    if (role !== 'estudiante' && role !== 'profesor') {
      return { success: false, message: 'Rol de usuario inválido para registro.' };
    }

    // Verificar si ya existe un usuario con el mismo nombre y rol
    const existing = this.findUser(role, cleanUsername);
    if (existing) {
      return {
        success: false,
        message: `El usuario "${cleanUsername}" ya está registrado como ${role}. Por favor inicia sesión o usa otro nombre.`
      };
    }

    // Validaciones según rol
    if (role === 'estudiante') {
      const cleanPin = String(pin || '').trim();
      if (!this.isValidStudentPin(cleanPin)) {
        return {
          success: false,
          message: 'La contraseña de estudiante debe ser un PIN de exactamente 3 dígitos numéricos (ej. 123).'
        };
      }
    } else if (role === 'profesor') {
      if (!password || password.length < 4) {
        return {
          success: false,
          message: 'La contraseña del profesor debe tener al menos 4 caracteres.'
        };
      }
    }

    const newUser = {
      id: `${role === 'estudiante' ? 'est' : 'prof'}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      normalizedUsername: this.normalizeUsername(cleanUsername),
      role,
      pin: role === 'estudiante' ? String(pin).trim() : undefined,
      password: role === 'profesor' ? password : undefined,
      createdAt: new Date().toISOString(),
      sectionId: null, // Preparado para el futuro sistema de secciones
      createdSections: role === 'profesor' ? [] : undefined
    };

    const users = this.getUsers();
    users.push(newUser);
    this.saveUsers(users);

    // Auto login al registrarse exitosamente
    const session = {
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role,
      icon: newUser.role === 'profesor' ? 'teacher' : 'student',
      sectionId: newUser.sectionId,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));

    return { success: true, user: newUser, session };
  }

  /**
   * Autenticación multiusuario (Admin, Estudiante con PIN 3 dígitos, Profesor)
   */
  loginUser(role, username, credential = '') {
    // 1. Acceso de Administrador
    if (role === 'admin') {
      if (credential !== PROFILES.ADMIN.password) {
        return { success: false, message: 'Contraseña incorrecta para el perfil de Administrador.' };
      }
      const adminSession = {
        userId: 'admin_root',
        username: 'Administrador',
        role: 'admin',
        icon: 'shield',
        loginTime: new Date().toISOString()
      };
      localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(adminSession));
      return { success: true, session: adminSession };
    }

    // 2. Acceso de Estudiante o Profesor
    const cleanUsername = (username || '').trim();
    if (!cleanUsername) {
      return { success: false, message: 'Por favor ingresa tu nombre de usuario.' };
    }

    const user = this.findUser(role, cleanUsername);
    if (!user) {
      return {
        success: false,
        message: `No se encontró al ${role === 'profesor' ? 'profesor' : 'estudiante'} "${cleanUsername}". Verifica el nombre o crea una cuenta en "Registrarse".`
      };
    }

    if (role === 'estudiante') {
      const cleanPin = String(credential || '').trim();
      if (!this.isValidStudentPin(cleanPin)) {
        return { success: false, message: 'El PIN de estudiante debe tener exactamente 3 dígitos numéricos.' };
      }
      if (user.pin !== cleanPin) {
        return { success: false, message: 'PIN de 3 dígitos incorrecto.' };
      }
    } else if (role === 'profesor') {
      if (user.password !== credential) {
        return { success: false, message: 'Contraseña de profesor incorrecta.' };
      }
    }

    const session = {
      userId: user.id,
      username: user.username,
      role: user.role,
      icon: user.role === 'profesor' ? 'teacher' : 'student',
      sectionId: user.sectionId || null,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
    return { success: true, session };
  }

  // Compatibilidad hacia atrás con llamada anterior
  login(profileId, password = '') {
    if (profileId === 'admin') {
      return this.loginUser('admin', 'Administrador', password);
    }
    return { success: false, message: 'Usa loginUser(role, username, credential) para estudiante o profesor.' };
  }

  getCurrentSession() {
    try {
      const session = localStorage.getItem(DB_KEYS.SESSION);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  }

  logout() {
    localStorage.removeItem(DB_KEYS.SESSION);
  }

  // --- GESTIÓN DE PARÁMETROS (SOLO ADMINISTRADOR) ---
  getSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem(DB_KEYS.SETTINGS) || '{}');
      return { ...DEFAULT_SETTINGS, ...settings };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  updateSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  setForcedNotation(notation) {
    this.updateSettings({ forcedNotation: notation });
    return { success: true, message: 'Política de notación actualizada correctamente.' };
  }
}

export const dbService = new StorageService();

