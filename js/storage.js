/**
 * storage.js - Capa de Base de Datos Local y Persistencia (DBService)
 * Gestiona usuarios, sesiones, aforo y configuraciones del sistema con persistencia en localStorage.
 */

const DB_KEYS = {
  USERS: 'logica_db_users',
  SESSION: 'logica_db_session',
  SETTINGS: 'logica_db_settings',
  SAVED_ITEMS: 'logica_db_saved_items'
};

// Configuración por defecto
const DEFAULT_SETTINGS = {
  maxUsers: 5, // Capacidad máxima por defecto
  forcedNotation: 'none', // 'none' (libre para el usuario), 'standard', 'alternative'
  theme: 'dark'
};

// Usuario administrador inicial por defecto
const DEFAULT_ADMIN = {
  username: 'admin',
  password: '1234',
  role: 'admin',
  createdAt: new Date().toISOString()
};

export class StorageService {
  constructor() {
    this.initDatabase();
  }

  initDatabase() {
    // Inicializar usuarios si no existen
    if (!localStorage.getItem(DB_KEYS.USERS)) {
      const initialUsers = [DEFAULT_ADMIN];
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(initialUsers));
    } else {
      // Garantizar que el admin siempre exista
      const users = this.getUsers();
      const adminExists = users.some(u => u.username.toLowerCase() === 'admin');
      if (!adminExists) {
        users.unshift(DEFAULT_ADMIN);
        this.saveUsers(users);
      }
    }

    // Inicializar configuración
    if (!localStorage.getItem(DB_KEYS.SETTINGS)) {
      localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }

    // Inicializar almacén para futuras funciones de guardado
    if (!localStorage.getItem(DB_KEYS.SAVED_ITEMS)) {
      localStorage.setItem(DB_KEYS.SAVED_ITEMS, JSON.stringify([]));
    }
  }

  // --- GESTIÓN DE USUARIOS ---
  getUsers() {
    try {
      const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
      return users;
    } catch (e) {
      console.error('Error al leer usuarios de DB:', e);
      return [DEFAULT_ADMIN];
    }
  }

  saveUsers(users) {
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  }

  getUserCount() {
    return this.getUsers().length;
  }

  // Comprobar si se ha alcanzado la capacidad máxima de usuarios
  isCapacityReached() {
    const settings = this.getSettings();
    if (settings.maxUsers === null || settings.maxUsers === undefined || settings.maxUsers <= 0) {
      return false; // Ilimitado si es <= 0 o null
    }
    const currentCount = this.getUserCount();
    return currentCount >= settings.maxUsers;
  }

  // Registrar nuevo usuario validando aforo
  registerUser(username, password) {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      return { success: false, message: 'Usuario y contraseña son requeridos.' };
    }

    if (cleanUsername.toLowerCase() === 'admin') {
      return { success: false, message: 'El nombre de usuario "admin" está reservado.' };
    }

    if (this.isCapacityReached()) {
      return {
        success: false,
        isCapacityError: true,
        message: 'Ya se ha alcanzado la capacidad máxima de usuarios y deberá esperar a que se libere un espacio para crear el suyo.'
      };
    }

    const users = this.getUsers();
    const existing = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (existing) {
      return { success: false, message: 'El nombre de usuario ya se encuentra registrado.' };
    }

    const newUser = {
      username: cleanUsername,
      password: password,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);
    return { success: true, user: newUser, message: 'Usuario registrado exitosamente.' };
  }

  // Autenticar usuario
  login(username, password) {
    const cleanUsername = username.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === cleanUsername && u.password === password);

    if (!user) {
      return { success: false, message: 'Credenciales inválidas. Verifique su usuario y contraseña.' };
    }

    const session = {
      username: user.username,
      role: user.role,
      loginTime: new Date().toISOString()
    };

    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(session));
    return { success: true, session };
  }

  // Obtener sesión activa
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

  // Eliminar usuario con validación de contraseña y protección total del admin
  deleteUser(username, password) {
    const cleanUsername = username.trim().toLowerCase();

    // REGLA CRÍTICA: El perfil de administrador no se puede borrar por nada del mundo
    if (cleanUsername === 'admin') {
      return {
        success: false,
        message: '¡ACCESO DENEGADO! Por motivos de seguridad y estabilidad del sistema, el perfil de Administrador no se puede borrar bajo ninguna circunstancia.'
      };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === cleanUsername);

    if (userIndex === -1) {
      return { success: false, message: 'El perfil seleccionado no existe.' };
    }

    const targetUser = users[userIndex];
    if (targetUser.password !== password) {
      return { success: false, message: 'Contraseña incorrecta para el perfil seleccionado. No se pudo eliminar.' };
    }

    // Proceder a eliminar
    users.splice(userIndex, 1);
    this.saveUsers(users);

    // Si el usuario eliminado era el de la sesión actual, cerrar sesión
    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.username.toLowerCase() === cleanUsername) {
      this.logout();
    }

    return {
      success: true,
      message: `El perfil "${targetUser.username}" fue eliminado exitosamente. Se ha liberado 1 espacio en el sistema.`
    };
  }

  // --- GESTIÓN DE CONFIGURACIÓN (ADMIN) ---
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

  setMaxUsers(limit) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return { success: false, message: 'El límite debe ser un número entero mayor o igual a 1.' };
    }

    const currentUsersCount = this.getUserCount();
    if (parsedLimit < currentUsersCount) {
      return {
        success: false,
        message: `No se puede fijar el límite en ${parsedLimit} porque actualmente hay ${currentUsersCount} usuarios registrados. Elimine usuarios primero.`
      };
    }

    this.updateSettings({ maxUsers: parsedLimit });
    return {
      success: true,
      message: `Capacidad máxima de usuarios fijada exitosamente en ${parsedLimit}.`
    };
  }

  setForcedNotation(notation) {
    // notation: 'none', 'standard', 'alternative'
    this.updateSettings({ forcedNotation: notation });
    return { success: true, message: 'Regla de notación actualizada correctamente.' };
  }

  // --- FUTURAS FUNCIONES DE GUARDADO (BASE DE DATOS LOCAL) ---
  getSavedItems() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEYS.SAVED_ITEMS) || '[]');
    } catch (e) {
      return [];
    }
  }

  saveItem(item) {
    const items = this.getSavedItems();
    const newItem = {
      id: 'item_' + Date.now(),
      createdAt: new Date().toISOString(),
      ...item
    };
    items.push(newItem);
    localStorage.setItem(DB_KEYS.SAVED_ITEMS, JSON.stringify(items));
    return newItem;
  }
}

export const dbService = new StorageService();
