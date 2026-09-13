/**
 * storage.js - Capa de Persistencia Local y Configuración (DBService)
 * Gestiona los 3 perfiles del sistema (Administrador, Profesor, Estudiante),
 * sesiones activas y parámetros globales de la aplicación.
 */

const DB_KEYS = {
  SESSION: 'logica_db_session',
  SETTINGS: 'logica_db_settings'
};

export const PROFILES = {
  ADMIN: {
    id: 'admin',
    name: 'Administrador',
    role: 'admin',
    requiresPassword: true,
    password: '1234',
    icon: '🛡️',
    description: 'Acceso total y configuración de parámetros del sistema.'
  },
  PROFESOR: {
    id: 'profesor',
    name: 'Profesor',
    role: 'profesor',
    requiresPassword: false,
    icon: '👨‍🏫',
    description: 'Uso de herramientas lógicas, constructor visual y tablas de verdad.'
  },
  ESTUDIANTE: {
    id: 'estudiante',
    name: 'Estudiante',
    role: 'estudiante',
    requiresPassword: false,
    icon: '🎓',
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
  }

  // --- AUTENTICACIÓN SIMPLIFICADA POR PERFIL ---
  login(profileId, password = '') {
    const profile = Object.values(PROFILES).find(p => p.id === profileId);
    if (!profile) {
      return { success: false, message: 'Perfil no reconocido.' };
    }

    // Si es administrador, validar contraseña obligatoriamente
    if (profile.requiresPassword) {
      if (password !== profile.password) {
        return { success: false, message: 'Contraseña incorrecta para el perfil de Administrador.' };
      }
    }

    const session = {
      profileId: profile.id,
      username: profile.name,
      role: profile.role,
      icon: profile.icon,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
    return { success: true, session };
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
