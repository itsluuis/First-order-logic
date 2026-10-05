/**
 * app.js - Controlador Principal de la Aplicación de Lógica Simbólica
 * Gestiona los 3 perfiles (Admin, Profesor, Estudiante), navegación segura,
 * constructor visual, proceso inverso, generadores aleatorios integrados,
 * tablas de verdad y árbol sintáctico.
 */

import { dbService, PROFILES } from './storage.js';
import { sectionsDB } from './sectionsStorage.js';
import { FBFParser, NOTATION_MODES, NOTATION_SYMBOLS, OPERATORS } from './logic/ast.js';
import { TruthTableEngine } from './logic/truthTable.js';
import { NaturalLanguageTranslator } from './logic/naturalLanguage.js';
import { RandomGenerators } from './logic/generators.js';
import { AllOperationsEngine } from './logic/allOperations.js';
import { MascotController } from './mascot/mascotController.js';
import { PracticeEngine } from './practice/practiceEngine.js';
import { PracticeView } from './practice/practiceView.js';
import { studentModel } from './ml/studentModel.js';
import { ICONS } from './icons.js';
import { savedItemsStorage, SAVED_LIMITS } from './savedItemsStorage.js';
import { savedItemsPopover } from './savedItemsPopover.js';
import { triggerSuccessFeedback } from './feedbackEffects.js';

// Estado global de la aplicación
const AppState = {
  currentUser: null,
  selectedProfileId: 'estudiante',
  authMode: 'login',
  currentSectionId: null,
  currentNotation: NOTATION_MODES.STANDARD,
  theme: 'dark',
  activeTab: 'tab-builder',

  // Estado del Constructor Visual
  builderAtomics: [
    { name: 'p', text: 'estudio para el examen' },
    { name: 'q', text: 'apruebo la materia de lógica' },
    { name: 'r', text: 'obtengo una calificación sobresaliente' }
  ],
  builderTokens: [], // Array de { type: 'var'|'op'|'paren', value: string }

  // Estado del Proceso Inverso
  inverseAst: null,
  inverseVars: [],
  inverseVarMap: {}
};

// =============================================================================
// UTILIDADES: NOTIFICACIONES TOAST
// =============================================================================
function showToast(message, type = 'info') {
  // Notificaciones toast desactivadas permanentemente a solicitud del usuario
  return;
}

// =============================================================================
// MODAL DE CONFIRMACIÓN EN LA WEB (Reemplaza diálogos nativos del navegador)
// =============================================================================
function showConfirmDialog({
  title = '¿Confirmar acción?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  danger = true
} = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const btnAccept = document.getElementById('btn-confirm-accept');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const iconContainer = document.getElementById('confirm-modal-icon');

    if (!modal) {
      resolve(true);
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (btnAccept) {
      btnAccept.textContent = confirmText;
      btnAccept.className = danger ? 'btn btn-danger' : 'btn btn-primary';
    }
    if (btnCancel) btnCancel.textContent = cancelText;

    if (iconContainer) {
      iconContainer.innerHTML = danger
        ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
        : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      iconContainer.className = danger ? 'confirm-modal-icon confirm-icon-danger' : 'confirm-modal-icon confirm-icon-info';
    }

    modal.classList.add('active');

    function cleanup(result) {
      modal.classList.remove('active');
      btnAccept?.removeEventListener('click', onAccept);
      btnCancel?.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeyDown);
      modal.removeEventListener('click', onBackdrop);
      resolve(result);
    }

    function onAccept() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        cleanup(true);
      }
    }
    function onBackdrop(e) {
      if (e.target === modal) cleanup(false);
    }

    btnAccept?.addEventListener('click', onAccept);
    btnCancel?.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
    modal.addEventListener('click', onBackdrop);
  });
}

// =============================================================================
// GESTIÓN DE TEMAS (DARK / LIGHT)
// =============================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('logica_theme') || 'dark';
  setTheme(savedTheme);

  document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
    const nextTheme = AppState.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });
}

function setTheme(theme) {
  AppState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('logica_theme', theme);
}

// =============================================================================
// GESTIÓN DE NOTACIÓN DE CONECTIVOS Y POLÍTICAS DE ADMIN
// =============================================================================
function updateNotationUI() {
  const settings = dbService.getSettings();
  const notationSelect = document.getElementById('notation-select');
  const lockedBadge = document.getElementById('notation-locked-badge');

  if (settings.forcedNotation && settings.forcedNotation !== 'none') {
    AppState.currentNotation = settings.forcedNotation;
    if (notationSelect) {
      notationSelect.value = settings.forcedNotation;
      // Solo el administrador puede modificar la notación si está fijada
      notationSelect.disabled = (AppState.currentUser?.role !== 'admin');
    }
    lockedBadge?.classList.remove('hidden');
  } else {
    if (notationSelect) {
      notationSelect.disabled = false;
      notationSelect.value = AppState.currentNotation;
    }
    lockedBadge?.classList.add('hidden');
  }

  // Actualizar indicadores visuales de notación en la barra superior y opciones
  const notationBadge = document.getElementById('notation-indicator-badge');
  if (notationBadge) {
    notationBadge.textContent = AppState.currentNotation === 'alternative' ? 'Alternativa' : 'Estándar';
  }
  const optStd = document.getElementById('opt-notation-standard');
  const optAlt = document.getElementById('opt-notation-alternative');
  if (optStd && optAlt) {
    optStd.classList.toggle('active', AppState.currentNotation === 'standard');
    optAlt.classList.toggle('active', AppState.currentNotation === 'alternative');
  }

  // Actualizar símbolos visuales en teclados
  const symbols = NOTATION_SYMBOLS[AppState.currentNotation];
  document.querySelectorAll('[data-sym]').forEach(el => {
    const op = el.getAttribute('data-sym');
    if (symbols[op]) {
      el.textContent = symbols[op];
    }
  });

  // Re-evaluar display del constructor si hay tokens
  updateBuilderDisplay();

  // Refrescar paneles de todas las operaciones si están visibles
  const builderOpsSection = document.getElementById('builder-all-operations-section');
  if (builderOpsSection && !builderOpsSection.classList.contains('hidden')) {
    document.getElementById('btn-calc-all-builder')?.click();
  }
  const inverseOpsSection = document.getElementById('inverse-all-operations-section');
  if (inverseOpsSection && !inverseOpsSection.classList.contains('hidden')) {
    document.getElementById('btn-calc-all-inverse')?.click();
  }
}

function initNotationEvents() {
  const notationSelect = document.getElementById('notation-select');
  notationSelect?.addEventListener('change', (e) => {
    AppState.currentNotation = e.target.value;
    updateNotationUI();
  });

  // Eventos para las opciones del popover de Notación
  document.getElementById('opt-notation-standard')?.addEventListener('click', () => {
    const settings = dbService.getSettings();
    if (settings.forcedNotation && settings.forcedNotation !== 'none' && AppState.currentUser?.role !== 'admin') {
      showToast('La notación está fijada por el Administrador.', 'warning');
      return;
    }
    if (notationSelect) {
      notationSelect.value = 'standard';
      notationSelect.dispatchEvent(new Event('change'));
    }
    document.getElementById('popover-notation')?.classList.add('hidden');
  });

  document.getElementById('opt-notation-alternative')?.addEventListener('click', () => {
    const settings = dbService.getSettings();
    if (settings.forcedNotation && settings.forcedNotation !== 'none' && AppState.currentUser?.role !== 'admin') {
      showToast('La notación está fijada por el Administrador.', 'warning');
      return;
    }
    if (notationSelect) {
      notationSelect.value = 'alternative';
      notationSelect.dispatchEvent(new Event('change'));
    }
    document.getElementById('popover-notation')?.classList.add('hidden');
  });
}

function initTopbarPopovers() {
  const btnNotation = document.getElementById('btn-topbar-notation');
  const popoverNotation = document.getElementById('popover-notation');
  const btnUser = document.getElementById('btn-topbar-user');
  const popoverUser = document.getElementById('popover-user');

  btnNotation?.addEventListener('click', (e) => {
    e.stopPropagation();
    popoverUser?.classList.add('hidden');
    popoverNotation?.classList.toggle('hidden');
  });

  btnUser?.addEventListener('click', (e) => {
    e.stopPropagation();
    popoverNotation?.classList.add('hidden');
    popoverUser?.classList.toggle('hidden');
  });

  // Cerrar popovers al hacer click fuera
  document.addEventListener('click', (e) => {
    if (popoverNotation && !popoverNotation.contains(e.target) && !btnNotation?.contains(e.target)) {
      popoverNotation.classList.add('hidden');
    }
    if (popoverUser && !popoverUser.contains(e.target) && !btnUser?.contains(e.target)) {
      popoverUser.classList.add('hidden');
    }
  });

  // Cerrar popovers al presionar la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      popoverNotation?.classList.add('hidden');
      popoverUser?.classList.add('hidden');
    }
  });

  // Al pulsar Cerrar Sesión en el popover
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    popoverUser?.classList.add('hidden');
  });
}

// =============================================================================
// =============================================================================
// GESTIÓN DE AUTENTICACIÓN MULTIUSUARIO LOCAL (ADMIN, PROFESOR, ESTUDIANTE)
// =============================================================================
function initAuth() {
  const authModal = document.getElementById('auth-modal');
  AppState.authMode = 'login'; // 'login' | 'register'

  const session = dbService.getCurrentSession();
  if (session) {
    loginSuccess(session);
  } else {
    openAuthModal();
  }

  // Selección de tarjetas de perfil (Estudiante, Profesor, Administrador)
  const profileCards = document.querySelectorAll('.profile-card');
  profileCards.forEach(card => {
    card.addEventListener('click', () => {
      profileCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      AppState.selectedProfileId = card.getAttribute('data-profile-id');
      hideAuthAlert();
      updateProfileFormUI();
    });
  });

  // Conmutador de modo (Iniciar Sesión / Registrarse)
  const modeTabs = document.querySelectorAll('.auth-mode-tab');
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      AppState.authMode = tab.getAttribute('data-mode') || 'login';
      hideAuthAlert();
      updateProfileFormUI();
    });
  });

  // Envío del formulario de autenticación
  document.getElementById('form-login')?.addEventListener('submit', (e) => {
    e.preventDefault();
    hideAuthAlert();

    const role = AppState.selectedProfileId;
    const mode = AppState.authMode;

    // Caso 1: Administrador
    if (role === 'admin') {
      const passwordInput = document.getElementById('login-password');
      const password = passwordInput ? passwordInput.value : '';
      const res = dbService.loginUser('admin', 'Administrador', password);

      if (res.success) {
        showToast('¡Bienvenido, Administrador!', 'success');
        loginSuccess(res.session);
        if (passwordInput) passwordInput.value = '';
      } else {
        showAuthAlert(res.message, 'error');
        showToast(res.message, 'error');
      }
      return;
    }

    // Caso 2: Estudiante o Profesor
    const usernameInput = document.getElementById('auth-username');
    const credentialInput = document.getElementById('auth-credential');
    const confirmInput = document.getElementById('auth-confirm-credential');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const credential = credentialInput ? credentialInput.value.trim() : '';
    const confirmVal = confirmInput ? confirmInput.value.trim() : '';

    // Validaciones básicas de campos
    if (!username) {
      showAuthAlert('Por favor introduce tu nombre.', 'error');
      usernameInput?.focus();
      return;
    }

    if (!credential) {
      const err = role === 'estudiante' ? 'Por favor introduce tu PIN de 3 dígitos.' : 'Por favor introduce tu contraseña.';
      showAuthAlert(err, 'error');
      credentialInput?.focus();
      return;
    }

    // Validación estricta de 3 dígitos para el estudiante
    if (role === 'estudiante') {
      if (!/^\d{3}$/.test(credential)) {
        showAuthAlert('El PIN de estudiante debe contener exactamente 3 dígitos numéricos (ej. 123).', 'error');
        credentialInput?.focus();
        return;
      }
    } else if (role === 'profesor' && mode === 'register') {
      if (credential.length < 4) {
        showAuthAlert('La contraseña del profesor debe tener al menos 4 caracteres.', 'error');
        credentialInput?.focus();
        return;
      }
    }

    // MODO: REGISTRO
    if (mode === 'register') {
      if (credential !== confirmVal) {
        showAuthAlert('Las contraseñas / PIN no coinciden. Por favor verifícalos.', 'error');
        confirmInput?.focus();
        return;
      }

      const res = dbService.registerUser({
        username,
        role,
        pin: role === 'estudiante' ? credential : '',
        password: role === 'profesor' ? credential : ''
      });

      if (res.success) {
        showToast(`¡Cuenta creada con éxito! Bienvenido, ${res.session.username}.`, 'success');
        loginSuccess(res.session);
        resetAuthForm();
      } else {
        showAuthAlert(res.message, 'error');
        showToast(res.message, 'error');
      }
      return;
    }

    // MODO: INICIAR SESIÓN
    const res = dbService.loginUser(role, username, credential);
    if (res.success) {
      showToast(`¡Bienvenido de vuelta, ${res.session.username}!`, 'success');
      loginSuccess(res.session);
      resetAuthForm();
    } else {
      showAuthAlert(res.message, 'error');
      showToast(res.message, 'error');
    }
  });

  // Botón de Cerrar Sesión
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    dbService.logout();
    AppState.currentUser = null;
    AppState.currentSectionId = null;
    AppState.selectedProfileId = 'estudiante';
    AppState.authMode = 'login';

    // Recargar modelo neuronal para limpiar memoria de la sesión anterior
    studentModel.reloadForCurrentUser();

    // Restaurar visibilidad estándar de pestañas
    document.querySelectorAll('#main-nav-tabs .nav-tab').forEach(t => {
      if (t.id === 'tab-nav-admin') {
        t.classList.add('hidden');
      } else {
        t.classList.remove('hidden');
      }
    });

    // Resetear a pestaña principal (Constructor Visual)
    switchTab('tab-builder');

    showToast('Has cerrado sesión correctamente.', 'info');
    openAuthModal();
  });
}

function openAuthModal() {
  const authModal = document.getElementById('auth-modal');
  authModal?.classList.add('active');
  hideAuthAlert();
  resetAuthForm();

  // Sincronizar tarjetas de selección de perfil visualmente
  const profileCards = document.querySelectorAll('.profile-card');
  profileCards.forEach(card => {
    if (card.getAttribute('data-profile-id') === AppState.selectedProfileId) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Sincronizar botones de modo (Iniciar Sesión / Registrarse)
  const modeTabs = document.querySelectorAll('.auth-mode-tab');
  modeTabs.forEach(t => {
    if (t.getAttribute('data-mode') === (AppState.authMode || 'login')) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  updateProfileFormUI();
}

function showAuthAlert(msg, type = 'error') {
  const alertEl = document.getElementById('auth-alert');
  if (!alertEl) return;
  alertEl.textContent = msg;
  alertEl.className = `auth-alert auth-alert-${type}`;
  alertEl.classList.remove('hidden');
}

function hideAuthAlert() {
  const alertEl = document.getElementById('auth-alert');
  if (alertEl) {
    alertEl.textContent = '';
    alertEl.className = 'auth-alert hidden';
  }
}

function resetAuthForm() {
  const uInput = document.getElementById('auth-username');
  const cInput = document.getElementById('auth-credential');
  const cfInput = document.getElementById('auth-confirm-credential');
  const pInput = document.getElementById('login-password');
  if (uInput) uInput.value = '';
  if (cInput) cInput.value = '';
  if (cfInput) cfInput.value = '';
  if (pInput) pInput.value = '';
  hideAuthAlert();
}

function updateProfileFormUI() {
  const profileId = AppState.selectedProfileId;
  const mode = AppState.authMode || 'login';

  const modeTabs = document.getElementById('auth-mode-tabs');
  const userFields = document.getElementById('user-fields-group');
  const adminFields = document.getElementById('admin-password-group');
  const confirmGroup = document.getElementById('auth-confirm-group');
  const submitBtn = document.getElementById('btn-submit-login');

  const usernameLabel = document.getElementById('auth-username-label');
  const usernameInput = document.getElementById('auth-username');
  const credentialLabel = document.getElementById('auth-credential-label');
  const credentialInput = document.getElementById('auth-credential');
  const credentialHint = document.getElementById('auth-credential-hint');
  const confirmLabel = document.getElementById('auth-confirm-label');
  const confirmInput = document.getElementById('auth-confirm-credential');
  const adminPass = document.getElementById('login-password');

  const profile = Object.values(PROFILES).find(p => p.id === profileId);
  const profileName = profile ? profile.name : 'Usuario';

  // Si es Administrador
  if (profileId === 'admin') {
    modeTabs?.classList.add('hidden');
    userFields?.classList.add('hidden');
    adminFields?.classList.remove('hidden');

    if (adminPass) {
      adminPass.required = true;
      adminPass.disabled = false;
      adminPass.focus();
    }
    if (usernameInput) usernameInput.disabled = true;
    if (credentialInput) credentialInput.disabled = true;
    if (confirmInput) {
      confirmInput.required = false;
      confirmInput.disabled = true;
    }
    if (submitBtn) submitBtn.textContent = 'Ingresar como Administrador';
    return;
  }

  // Si es Estudiante o Profesor
  modeTabs?.classList.remove('hidden');
  userFields?.classList.remove('hidden');
  adminFields?.classList.add('hidden');

  // Asegurar que el campo de contraseña de administrador NUNCA quede requerido ni activo en perfiles de usuario
  if (adminPass) {
    adminPass.required = false;
    adminPass.disabled = true;
    adminPass.value = '';
  }
  if (usernameInput) usernameInput.disabled = false;
  if (credentialInput) credentialInput.disabled = false;

  // Ajustes según Estudiante vs Profesor
  if (profileId === 'estudiante') {
    if (usernameLabel) usernameLabel.textContent = 'Nombre del Estudiante:';
    if (usernameInput) usernameInput.placeholder = 'Introduce tu nombre (ej. Lucas)';

    if (credentialLabel) credentialLabel.textContent = 'PIN de 3 Dígitos:';
    if (credentialInput) {
      credentialInput.type = 'password';
      credentialInput.inputMode = 'numeric';
      credentialInput.maxLength = 3;
      credentialInput.className = 'form-input pin-input';
      credentialInput.placeholder = '● ● ●';
    }
    if (credentialHint) {
      credentialHint.textContent = 'La contraseña debe contener exactamente 3 dígitos numéricos.';
      credentialHint.classList.remove('hidden');
    }
    if (confirmLabel) confirmLabel.textContent = 'Confirmar PIN de 3 Dígitos:';
    if (confirmInput) {
      confirmInput.type = 'password';
      confirmInput.inputMode = 'numeric';
      confirmInput.maxLength = 3;
      confirmInput.className = 'form-input pin-input';
      confirmInput.placeholder = '● ● ●';
    }
  } else {
    // Profesor
    if (usernameLabel) usernameLabel.textContent = 'Nombre del Profesor:';
    if (usernameInput) usernameInput.placeholder = 'Introduce tu nombre (ej. Prof. García)';

    if (credentialLabel) credentialLabel.textContent = 'Contraseña:';
    if (credentialInput) {
      credentialInput.type = 'password';
      credentialInput.inputMode = 'text';
      credentialInput.maxLength = 50;
      credentialInput.className = 'form-input';
      credentialInput.placeholder = 'Introduce tu contraseña';
    }
    if (credentialHint) {
      credentialHint.textContent = 'Mínimo 4 caracteres.';
      credentialHint.classList.remove('hidden');
    }
    if (confirmLabel) confirmLabel.textContent = 'Confirmar Contraseña:';
    if (confirmInput) {
      confirmInput.type = 'password';
      confirmInput.inputMode = 'text';
      confirmInput.maxLength = 50;
      confirmInput.className = 'form-input';
      confirmInput.placeholder = 'Repite tu contraseña';
    }
  }

  // Ajustes según Modo (Iniciar Sesión vs Registrarse)
  if (mode === 'register') {
    confirmGroup?.classList.remove('hidden');
    if (confirmInput) {
      confirmInput.required = true;
      confirmInput.disabled = false;
    }
    if (submitBtn) submitBtn.textContent = `Crear Cuenta e Ingresar como ${profileName}`;
  } else {
    confirmGroup?.classList.add('hidden');
    if (confirmInput) {
      confirmInput.required = false;
      confirmInput.disabled = true;
      confirmInput.value = '';
    }
    if (submitBtn) submitBtn.textContent = `Ingresar al Sistema como ${profileName}`;
  }
}

function loginSuccess(session) {
  AppState.currentUser = session;
  document.getElementById('auth-modal')?.classList.remove('active');

  // Recargar el modelo neuronal de IA con las métricas personales del estudiante activo
  studentModel.reloadForCurrentUser();

  // Actualizar Header
  document.getElementById('current-username').textContent = session.username;
  const roleBadge = document.getElementById('current-user-role');
  const avatar = document.getElementById('current-user-avatar');

  if (avatar) avatar.innerHTML = ICONS[session.icon] || ICONS.user;

  if (session.role === 'admin') {
    roleBadge.textContent = 'ADMINISTRADOR';
    roleBadge.className = 'badge badge-admin';

    // REQUISITO ESTRICTO: Para el Administrador la ÚNICA pestaña visible es la de Parámetros
    document.querySelectorAll('#main-nav-tabs .nav-tab').forEach(t => {
      if (t.id === 'tab-nav-admin') {
        t.classList.remove('hidden');
      } else {
        t.classList.add('hidden');
      }
    });

    switchTab('tab-admin');
    updateAdminSettingsUI();
  } else {
    // Si no es admin, mostrar todas las pestañas estándar y ocultar la de administración
    document.querySelectorAll('#main-nav-tabs .nav-tab').forEach(t => {
      if (t.id === 'tab-nav-admin') {
        t.classList.add('hidden');
      } else {
        t.classList.remove('hidden');
      }
    });

    const currentActiveTab = document.querySelector('.nav-tab.active');
    if (!currentActiveTab || currentActiveTab.getAttribute('data-tab') === 'tab-admin') {
      switchTab('tab-builder');
    }

    if (session.role === 'profesor') {
      roleBadge.textContent = 'PROFESOR';
      roleBadge.className = 'badge badge-profesor';
    } else {
      roleBadge.textContent = 'ESTUDIANTE';
      roleBadge.className = 'badge badge-user';
    }
  }

  updateNotationUI();
}

// =============================================================================
// PARÁMETROS DEL SISTEMA (ADMINISTRADOR)
// =============================================================================
function updateAdminSettingsUI() {
  const settings = dbService.getSettings();
  const notSelect = document.getElementById('admin-notation-lock-select');
  if (notSelect) {
    notSelect.value = settings.forcedNotation || 'none';
  }

  // 1. Poblar selector de Usuarios (Estudiantes y Profesores)
  const userSelect = document.getElementById('admin-user-select');
  if (userSelect) {
    userSelect.innerHTML = '<option value="">-- Selecciona un usuario --</option>';
    const users = dbService.getUsers();
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      const roleText = u.role === 'profesor' ? 'Profesor' : 'Estudiante';
      opt.textContent = `[${roleText}] ${u.username}`;
      userSelect.appendChild(opt);
    });
  }

  // 2. Poblar selector de Secciones
  const secSelect = document.getElementById('admin-section-select');
  if (secSelect) {
    secSelect.innerHTML = '<option value="">-- Selecciona una sección --</option>';
    const sections = sectionsDB.getSections();
    sections.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      const taskCount = Array.isArray(s.tasks) ? s.tasks.length : 0;
      opt.textContent = `${s.name} (${s.professorName}) - ${taskCount} tareas`;
      secSelect.appendChild(opt);
    });
  }

  // 3. Renderizar tarjetas de gestión de minijuegos
  renderAdminMinigamesUI();
}

const ADMIN_GAMES_METADATA = [
  {
    id: 'tree',
    name: 'Árbol Correcto',
    desc: 'Deducción de FBF a partir del árbol sintáctico.',
    icon: ICONS.tree
  },
  {
    id: 'molecular',
    name: 'Moleculares',
    desc: 'Construcción formal de proposiciones cotidianas con tokens.',
    icon: ICONS.puzzle
  },
  {
    id: 'verdict',
    name: 'Veredicto',
    desc: 'Clasificación veloz de FBF en Tautología, Contradicción o Contingencia.',
    icon: ICONS.scale
  },
  {
    id: 'duel',
    name: 'Duelo contra la Mascota IA',
    desc: 'Competencia en tiempo real contra Moli evaluando verdad o falsedad.',
    icon: ICONS.bolt
  }
];

function renderAdminMinigamesUI() {
  const container = document.getElementById('admin-minigames-container');
  if (!container) return;

  const disabledGames = dbService.getDisabledGames();

  container.innerHTML = ADMIN_GAMES_METADATA.map(g => {
    const isDisabled = disabledGames.includes(g.id);
    const statusText = isDisabled ? 'Deshabilitado' : 'Activo';
    const statusClass = isDisabled ? 'badge-game-disabled' : 'badge-game-active';
    const btnText = isDisabled ? 'Habilitar Juego' : 'Deshabilitar Juego';
    const btnClass = isDisabled ? 'btn-primary' : 'btn-secondary';

    return `
      <div class="minigame-admin-card${isDisabled ? ' is-disabled' : ''}" data-admin-game-id="${g.id}">
        <div class="minigame-admin-header">
          <div class="minigame-admin-title-row">
            <span class="admin-game-icon">${g.icon}</span>
            <h4 class="minigame-admin-name">${g.name}</h4>
          </div>
          <span class="badge-game-status ${statusClass}">${statusText}</span>
        </div>
        <p class="minigame-admin-desc">${g.desc}</p>
        <div class="minigame-admin-footer">
          <span class="minigame-vis-label">
            <span class="minigame-vis-dot ${isDisabled ? 'disabled' : 'active'}"></span>
            ${isDisabled ? 'Bloqueado' : 'Disponible'}
          </span>
          <button type="button" class="btn ${btnClass} btn-toggle-admin-game" data-game-id="${g.id}">
            ${btnText}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-toggle-admin-game').forEach(btn => {
    btn.addEventListener('click', () => {
      const gameId = btn.getAttribute('data-game-id');
      dbService.toggleGameDisabled(gameId);

      renderAdminMinigamesUI();
      // Si el Centro de Practicas esta instanciado, actualizar su lobby
      if (typeof practiceView !== 'undefined' && practiceView) {
        practiceView.renderLobby(studentModel.getRecommendation());
      }
    });
  });
}

function initAdminEvents() {
  document.getElementById('btn-admin-save-notation')?.addEventListener('click', () => {
    const notation = document.getElementById('admin-notation-lock-select').value;
    const res = dbService.setForcedNotation(notation);
    if (res.success) {
      showToast(res.message, 'success');
      updateNotationUI();
    } else {
      showToast(res.message, 'error');
    }
  });

  // Eliminar usuario seleccionado
  document.getElementById('btn-admin-delete-user')?.addEventListener('click', async () => {
    const userSelect = document.getElementById('admin-user-select');
    const userId = userSelect ? userSelect.value : '';
    if (!userId) {
      showToast('Por favor selecciona un usuario a eliminar.', 'info');
      return;
    }

    const user = dbService.findUserById(userId);
    const userName = user ? user.username : 'este usuario';
    const isProf = user && user.role === 'profesor';

    const confirmMsg = isProf
      ? `¿Estás seguro de eliminar al profesor "${userName}"? Esto también eliminará en cascada todas sus secciones creadas y sus tareas.`
      : `¿Estás seguro de eliminar al estudiante "${userName}"? Se desvinculará de todas sus secciones y se limpiará su perfil.`;

    const confirmed = await showConfirmDialog({
      title: isProf ? '¿Eliminar Profesor?' : '¿Eliminar Estudiante?',
      message: confirmMsg,
      confirmText: 'Eliminar Usuario',
      cancelText: 'Cancelar',
      danger: true
    });

    if (!confirmed) return;

    const res = dbService.deleteUser(userId);
    if (res.success) {
      if (isProf) {
        sectionsDB.deleteSectionsByProfessor(userId);
      } else {
        sectionsDB.removeStudentFromAllSections(userId);
      }

      showToast(`Usuario "${userName}" eliminado correctamente.`, 'success');
      updateAdminSettingsUI();
    } else {
      showToast(res.message || 'Error al eliminar usuario.', 'error');
    }
  });

  // Eliminar sección seleccionada
  document.getElementById('btn-admin-delete-section')?.addEventListener('click', async () => {
    const secSelect = document.getElementById('admin-section-select');
    const sectionId = secSelect ? secSelect.value : '';
    if (!sectionId) {
      showToast('Por favor selecciona una sección a eliminar.', 'info');
      return;
    }

    const section = sectionsDB.getSectionById(sectionId);
    const secName = section ? section.name : 'esta sección';

    const confirmed = await showConfirmDialog({
      title: '¿Eliminar Sección?',
      message: `¿Estás seguro de eliminar permanentemente la sección "${secName}" y todas sus tareas asignadas?`,
      confirmText: 'Eliminar Sección',
      cancelText: 'Cancelar',
      danger: true
    });

    if (!confirmed) return;

    const res = sectionsDB.deleteSection(sectionId);
    if (res.success) {
      showToast(`Sección "${secName}" eliminada correctamente.`, 'success');
      updateAdminSettingsUI();
    } else {
      showToast('Error al eliminar sección.', 'error');
    }
  });
}

// =============================================================================
// SISTEMA DE NAVEGACIÓN ENTRE PESTAÑAS
// =============================================================================
function switchTab(tabId) {
  AppState.activeTab = tabId;
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(t => {
    if (t.getAttribute('data-tab') === tabId) t.classList.add('active');
    else t.classList.remove('active');
  });

  const sections = document.querySelectorAll('.tab-content');
  sections.forEach(s => {
    if (s.id === tabId) s.classList.remove('hidden');
    else s.classList.add('hidden');
  });

  if (tabId === 'tab-sections') {
    renderSectionsList();

    if (mascotController) {
      const user = AppState.currentUser;
      if (user && user.role === 'profesor') {
        mascotController.sayQuickRemark('Bienvenido, Profesor. Listo para revisar el progreso de sus secciones.', 3500);
      } else if (user && user.role === 'estudiante') {
        const studentId = user.userId || user.id;
        let pending = 0;
        const studentSections = sectionsDB.getSectionsForStudent(studentId);
        studentSections.forEach(s => {
          if (Array.isArray(s.tasks)) {
            pending += s.tasks.filter(t => !t.completedByStudentIds.includes(studentId)).length;
          }
        });

        if (pending > 0) {
          mascotController.sayQuickRemark(`¡Hola! Tienes ${pending} tarea${pending > 1 ? 's' : ''} pendiente${pending > 1 ? 's' : ''} esperándote en tus secciones.`, 3500);
        } else {
          mascotController.view.setExpression('happy');
          mascotController.sayQuickRemark('¡Todo al día por aquí! Excelente constancia con la lógica simbólica.', 3500);
          setTimeout(() => {
            if (mascotController.view.currentExpression === 'happy') {
              mascotController.view.setExpression('idle');
            }
          }, 3500);
        }
      }
    }
  }

  if (tabId === 'tab-practice' && practiceView && practiceEngine && !practiceEngine.isPlaying) {
    practiceView.renderLobby(studentModel.getRecommendation());
    const slot = document.getElementById('mascot-dock-slot');
    if (slot && mascotController) mascotController.dockTo(slot);
  } else if (tabId !== 'tab-practice' && mascotController) {
    mascotController.undock();
  }

  // Si el globo de la mascota está abierto, refrescar el contexto suavemente
  if (mascotController && mascotController.view.isBubbleOpen) {
    mascotController.view.showSpeechBubble(mascotController.generateContextualExplanation());
  }
}

function initTabs() {
  const tabs = document.querySelectorAll('#main-nav-tabs .nav-tab');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const tabId = t.getAttribute('data-tab');
      // Seguridad: Solo admin puede entrar a tab-admin
      if (tabId === 'tab-admin' && AppState.currentUser?.role !== 'admin') {
        showToast('Acceso restringido: únicamente disponible para el Administrador.', 'error');
        return;
      }
      switchTab(tabId);
    });
  });
}

// =============================================================================
// CONSTRUCTOR VISUAL DE PROPOSICIONES MOLECULARES (PROCESO DIRECTO)
// =============================================================================
function renderAtomicDefinitions() {
  const container = document.getElementById('atomic-definitions-container');
  const quickVarsContainer = document.getElementById('builder-quick-vars');
  if (!container || !quickVarsContainer) return;

  container.innerHTML = '';
  quickVarsContainer.innerHTML = '';

  AppState.builderAtomics.forEach((item, index) => {
    // Fila de definición en la columna izquierda
    const card = document.createElement('div');
    card.className = 'atomic-item-card';
    card.innerHTML = `
      <span class="atomic-var-badge">${item.name}</span>
      <input type="text" class="form-input atomic-text-input" id="atomic-input-${item.name}" data-var="${item.name}" value="${item.text}" placeholder="Enunciado de ${item.name}..." style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
      <button class="btn-clear-inline btn-clear-atomic-field" data-var="${item.name}" title="Limpiar enunciado de ${item.name}">${ICONS.close}</button>
      ${index > 1 ? `<button class="btn-clear-inline btn-remove-atomic" data-index="${index}" title="Eliminar variable" style="color: var(--accent-rose); display: inline-flex; align-items: center; justify-content: center;">${ICONS.trash}</button>` : ''}
    `;
    container.appendChild(card);

    // Botón rápido en el teclado del constructor
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.style.padding = '0.4rem 0.8rem';
    btn.style.fontSize = '0.9rem';
    btn.style.fontFamily = 'var(--font-mono)';
    btn.innerHTML = `+ Proposición <strong>${item.name}</strong>`;
    btn.addEventListener('click', () => addBuilderToken({ type: 'var', value: item.name }));
    quickVarsContainer.appendChild(btn);
  });

  // Listeners para escribir enunciados
  container.querySelectorAll('.atomic-text-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const v = e.target.getAttribute('data-var');
      const item = AppState.builderAtomics.find(a => a.name === v);
      if (item) {
        item.text = e.target.value;
        updateBuilderDisplay();
      }
    });
  });

  // Listeners para botón de limpiar campo individual
  container.querySelectorAll('.btn-clear-atomic-field').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-var');
      const item = AppState.builderAtomics.find(a => a.name === v);
      const input = document.getElementById(`atomic-input-${v}`);
      if (item && input) {
        item.text = '';
        input.value = '';
        input.focus();
        updateBuilderDisplay();
      }
    });
  });

  // Listeners para remover variable extra
  container.querySelectorAll('.btn-remove-atomic').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      AppState.builderAtomics.splice(idx, 1);
      renderAtomicDefinitions();
      updateBuilderDisplay();
    });
  });
}

function addBuilderToken(token) {
  AppState.builderTokens.push(token);
  updateBuilderDisplay();
}

function clearBuilderCanvas() {
  AppState.builderTokens = [];
  updateBuilderDisplay();
  showToast('Lienzo de proposición molecular limpiado.', 'info');
}

function updateBuilderDisplay() {
  const canvas = document.getElementById('builder-canvas');
  const fbfOutput = document.getElementById('builder-fbf-output');
  const sentenceOutput = document.getElementById('builder-sentence-output');
  const symbols = NOTATION_SYMBOLS[AppState.currentNotation];

  if (!canvas) return;

  if (AppState.builderTokens.length === 0) {
    canvas.innerHTML = `
      <span id="canvas-placeholder" class="text-muted" style="font-size: 0.9rem;">
        Haz clic en los botones inferiores o en "Molecular Aleatoria" para ensamblar la proposición molecular...
      </span>
    `;
    fbfOutput.textContent = '--';
    sentenceOutput.textContent = 'Define las proposiciones y conecta los elementos para visualizar la oración completa.';
    return;
  }

  // Renderizar tokens en el lienzo
  canvas.innerHTML = '';
  AppState.builderTokens.forEach((tok, idx) => {
    const el = document.createElement('div');
    el.className = `builder-token token-${tok.type}`;

    let label = tok.value;
    if (tok.type === 'op') {
      label = symbols[tok.value] || tok.value;
    }

    el.innerHTML = `
      <span>${label}</span>
      <span class="token-remove" title="Quitar este elemento">×</span>
    `;

    el.querySelector('.token-remove').addEventListener('click', () => {
      AppState.builderTokens.splice(idx, 1);
      updateBuilderDisplay();
    });

    canvas.appendChild(el);
  });

  // Ensamblar cadena de texto para el parser
  let rawFormulaStr = '';
  AppState.builderTokens.forEach(tok => {
    if (tok.type === 'var') {
      rawFormulaStr += tok.value;
    } else if (tok.type === 'op') {
      rawFormulaStr += ` ${symbols[tok.value] || tok.value} `;
    } else if (tok.type === 'paren') {
      rawFormulaStr += tok.value;
    }
  });

  fbfOutput.textContent = rawFormulaStr;

  // Intentar parsear formalmente para construir lenguaje natural
  try {
    const ast = FBFParser.parse(rawFormulaStr);
    const varMap = {};
    AppState.builderAtomics.forEach(a => {
      varMap[a.name] = a.text;
    });

    const naturalSpanish = NaturalLanguageTranslator.toSpanish(ast, varMap);
    sentenceOutput.textContent = NaturalLanguageTranslator.formatCompleteSentence(naturalSpanish);
    sentenceOutput.classList.remove('text-muted');
    sentenceOutput.style.color = 'var(--text-primary)';
  } catch (err) {
    sentenceOutput.textContent = `Construyendo proposición molecular... (${err.message})`;
    sentenceOutput.classList.add('text-muted');
  }
}

function initVisualBuilder() {
  renderAtomicDefinitions();

  // Botón para añadir nueva variable atómica
  document.getElementById('btn-add-atomic')?.addEventListener('click', (e) => {
    const letters = ['p', 'q', 'r', 's', 't', 'u', 'w', 'x', 'y', 'z'];
    const used = AppState.builderAtomics.map(a => a.name);
    const nextLetter = letters.find(l => !used.includes(l));

    if (!nextLetter) {
      showToast('Has alcanzado el número máximo de variables atómicas simultáneas.', 'error');
      return;
    }

    AppState.builderAtomics.push({
      name: nextLetter,
      text: ''
    });

    renderAtomicDefinitions();
    triggerSuccessFeedback(e.currentTarget);
    showToast(`Variable [${nextLetter}] añadida exitosamente.`, 'info');
  });

  // BOTÓN NUEVO: Generar aleatoriamente proposiciones atómicas según cuántas variables haya disponibles
  document.getElementById('btn-randomize-atomics-builder')?.addEventListener('click', () => {
    const vars = AppState.builderAtomics.map(a => a.name);
    const generated = RandomGenerators.generateAtomicStatements(vars);

    AppState.builderAtomics.forEach(a => {
      if (generated[a.name]) {
        a.text = generated[a.name];
      }
    });

    renderAtomicDefinitions();
    updateBuilderDisplay();
    showToast(`Se generaron aleatoriamente ${vars.length} proposiciones atómicas para las variables activas.`, 'success');
  });

  // BOTÓN NUEVO: Generar proposición molecular aleatoria compleja (con tokens y conectivos válidos)
  document.getElementById('btn-random-molecular-builder')?.addEventListener('click', () => {
    const availableVars = AppState.builderAtomics.map(a => a.name);
    // Generar FBF aleatoria con profundidad 2-4
    const res = RandomGenerators.generateFBF('random', AppState.currentNotation, availableVars);
    const tokens = RandomGenerators.astToTokens(res.ast);

    AppState.builderTokens = tokens;
    updateBuilderDisplay();
    showToast('Proposición molecular aleatoria generada exitosamente en el lienzo.', 'success');
  });

  // Botones de Limpieza Rápida de la proposición molecular
  document.getElementById('btn-clear-canvas')?.addEventListener('click', clearBuilderCanvas);
  document.getElementById('btn-quick-clear-formula')?.addEventListener('click', clearBuilderCanvas);

  // Deshacer último token
  document.getElementById('btn-undo-token')?.addEventListener('click', () => {
    if (AppState.builderTokens.length > 0) {
      AppState.builderTokens.pop();
      updateBuilderDisplay();
    }
  });

  // Botones de conectivos y paréntesis
  document.querySelectorAll('.symbol-keyboard button[data-insert-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-insert-type');
      if (type === 'op') {
        const op = btn.getAttribute('data-op');
        addBuilderToken({ type: 'op', value: op });
      } else if (type === 'paren') {
        const paren = btn.getAttribute('data-paren');
        addBuilderToken({ type: 'paren', value: paren });
      }
    });
  });

  // Enviar fórmula construida a Tabla de Verdad
  document.getElementById('btn-send-to-truth')?.addEventListener('click', () => {
    const fbfText = document.getElementById('builder-fbf-output').textContent.trim();
    if (!fbfText || fbfText === '--') {
      showToast('Construye primero una fórmula válida antes de enviarla.', 'error');
      return;
    }
    const truthInput = document.getElementById('truth-fbf-input');
    if (truthInput) truthInput.value = fbfText;
    switchTab('tab-truthtable');
    document.getElementById('btn-generate-truth-table')?.click();
  });

  // Botón para Calcular Todas las Operaciones Posibles en el Constructor Visual
  document.getElementById('btn-calc-all-builder')?.addEventListener('click', (e) => {
    triggerSuccessFeedback(e.currentTarget);
    const vars = AppState.builderAtomics.map(a => a.name);
    const varMap = {};
    AppState.builderAtomics.forEach(a => {
      varMap[a.name] = a.text;
    });

    renderAllOperationsPanel(
      'builder-all-operations-section',
      'builder-all-ops-count',
      'builder-all-ops-grid',
      vars,
      varMap,
      (op) => {
        AppState.builderTokens = [
          { type: 'var', value: op.leftVar },
          { type: 'op', value: op.operator },
          { type: 'var', value: op.rightVar }
        ];
        updateBuilderDisplay();
        document.getElementById('builder-canvas')?.scrollIntoView({ behavior: 'smooth' });
      }
    );
  });

  document.getElementById('btn-close-all-ops-builder')?.addEventListener('click', () => {
    document.getElementById('builder-all-operations-section')?.classList.add('hidden');
  });
}

// =============================================================================
// PROCESO INVERSO: DE FBF A PROPOSICIONES MOLECULARES
// =============================================================================
function initInverseProcess() {
  // Teclado virtual del proceso inverso
  document.querySelectorAll('.inverse-sym-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const char = btn.getAttribute('data-insert');
      const input = document.getElementById('inverse-fbf-input');
      if (input) {
        const start = input.selectionStart || input.value.length;
        const end = input.selectionEnd || input.value.length;
        const val = input.value;
        input.value = val.substring(0, start) + char + val.substring(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + char.length;
      }
    });
  });

  // Botón Limpiar campo input FBF
  document.getElementById('btn-clear-inverse-input')?.addEventListener('click', () => {
    const input = document.getElementById('inverse-fbf-input');
    if (input) {
      input.value = '';
      input.focus();
    }
  });

  // BOTÓN NUEVO: Generar FBF aleatoria en el Proceso Inverso
  document.getElementById('btn-random-inverse-fbf')?.addEventListener('click', () => {
    const res = RandomGenerators.generateFBF('random', AppState.currentNotation, ['p', 'q', 'r', 's', 't']);
    const input = document.getElementById('inverse-fbf-input');
    if (input) {
      input.value = res.fbfString;
      // Analizar automáticamente
      document.getElementById('btn-parse-inverse')?.click();
      showToast('FBF aleatoria con paréntesis balanceados generada.', 'success');
    }
  });

  // Analizar FBF ingresada
  document.getElementById('btn-parse-inverse')?.addEventListener('click', () => {
    const inputVal = document.getElementById('inverse-fbf-input').value.trim();
    if (!inputVal) {
      showToast('Por favor introduce una fórmula para analizar.', 'error');
      return;
    }

    try {
      const ast = FBFParser.parse(inputVal);
      const vars = FBFParser.getVariables(ast);

      if (vars.length === 0) {
        showToast('La fórmula no contiene variables atómicas.', 'error');
        return;
      }

      AppState.inverseAst = ast;
      AppState.inverseVars = vars;
      AppState.inverseVarMap = {};

      renderInverseVarInputs(vars);
      document.getElementById('inverse-variables-section')?.classList.remove('hidden');
      document.getElementById('inverse-result-box')?.classList.add('hidden');
      showToast(`FBF sintácticamente válida. Se detectaron las variables: ${vars.join(', ')}.`, 'success');
    } catch (err) {
      showToast(`Error de sintaxis en FBF: ${err.message}`, 'error');
      document.getElementById('inverse-variables-section')?.classList.add('hidden');
      document.getElementById('inverse-result-box')?.classList.add('hidden');
    }
  });

  // BOTÓN NUEVO: Generar atómicas aleatorias para las variables detectadas en el proceso inverso
  document.getElementById('btn-randomize-inverse-vars')?.addEventListener('click', () => {
    if (!AppState.inverseVars || AppState.inverseVars.length === 0) return;

    const generated = RandomGenerators.generateAtomicStatements(AppState.inverseVars);
    AppState.inverseVars.forEach(v => {
      const input = document.getElementById(`inverse-var-input-${v}`);
      if (input && generated[v]) {
        input.value = generated[v];
        AppState.inverseVarMap[v] = generated[v];
      }
    });

    // Reconstruir automáticamente
    document.getElementById('btn-generate-inverse-sentence')?.click();
    showToast('Proposiciones atómicas generadas aleatoriamente.', 'success');
  });

  // Reconstruir proposición molecular
  document.getElementById('btn-generate-inverse-sentence')?.addEventListener('click', () => {
    if (!AppState.inverseAst) return;

    let allFilled = true;
    AppState.inverseVars.forEach(v => {
      const input = document.getElementById(`inverse-var-input-${v}`);
      const val = input ? input.value.trim() : '';
      if (!val) allFilled = false;
      AppState.inverseVarMap[v] = val || `[proposición ${v}]`;
    });

    const sentenceRaw = NaturalLanguageTranslator.toSpanish(AppState.inverseAst, AppState.inverseVarMap);
    const finalSentence = NaturalLanguageTranslator.formatCompleteSentence(sentenceRaw);

    const resultBox = document.getElementById('inverse-result-box');
    const resultText = document.getElementById('inverse-result-sentence');

    if (resultBox && resultText) {
      resultText.textContent = finalSentence;
      resultBox.classList.remove('hidden');
      resultBox.scrollIntoView({ behavior: 'smooth' });
    }

    if (!allFilled) {
      showToast('Reconstrucción generada con variables pendientes.', 'info');
    } else {
      showToast('¡Proposición molecular en español reconstruida con éxito!', 'success');
    }
  });

  // Botón Limpiar Resultado Inverso
  document.getElementById('btn-clear-inverse-result')?.addEventListener('click', () => {
    document.getElementById('inverse-result-box')?.classList.add('hidden');
  });

  // Enviar FBF inversa a Tabla de Verdad
  document.getElementById('btn-send-inverse-to-truth')?.addEventListener('click', () => {
    const inputVal = document.getElementById('inverse-fbf-input').value.trim();
    if (!inputVal) return;
    const truthInput = document.getElementById('truth-fbf-input');
    if (truthInput) truthInput.value = inputVal;
    switchTab('tab-truthtable');
    document.getElementById('btn-generate-truth-table')?.click();
  });

  // Botón para Calcular Todas las Operaciones Posibles en el Proceso Inverso
  document.getElementById('btn-calc-all-inverse')?.addEventListener('click', (e) => {
    triggerSuccessFeedback(e.currentTarget);
    let vars = AppState.inverseVars;
    if (!vars || vars.length === 0) {
      const existingInputs = document.querySelectorAll('#inverse-var-inputs-list input[id^="inverse-var-input-"]');
      if (existingInputs.length > 0) {
        vars = Array.from(existingInputs).map(inp => inp.id.replace('inverse-var-input-', ''));
      }
    }

    const varMap = {};
    if (vars && vars.length > 0) {
      vars.forEach(v => {
        const inp = document.getElementById(`inverse-var-input-${v}`);
        varMap[v] = (inp && inp.value.trim()) || AppState.inverseVarMap[v] || `[proposición ${v}]`;
      });
    }

    renderAllOperationsPanel(
      'inverse-all-operations-section',
      'inverse-all-ops-count',
      'inverse-all-ops-grid',
      vars || [],
      varMap,
      (op) => {
        const input = document.getElementById('inverse-fbf-input');
        if (input) {
          input.value = op.fbf;
          document.getElementById('btn-parse-inverse')?.click();
          input.scrollIntoView({ behavior: 'smooth' });
        }
      }
    );
  });

  document.getElementById('btn-close-all-ops-inverse')?.addEventListener('click', () => {
    document.getElementById('inverse-all-operations-section')?.classList.add('hidden');
  });
}

function renderInverseVarInputs(vars) {
  const container = document.getElementById('inverse-var-inputs-list');
  if (!container) return;
  container.innerHTML = '';

  vars.forEach(v => {
    const div = document.createElement('div');
    div.className = 'atomic-item-card';
    div.innerHTML = `
      <span class="atomic-var-badge">${v}</span>
      <input type="text" id="inverse-var-input-${v}" class="form-input" placeholder="Escribe el enunciado en español para la proposición ${v}..." style="font-size: 0.95rem;">
      <button class="btn-clear-inline btn-clear-inverse-single" data-var="${v}" title="Limpiar enunciado de ${v}">${ICONS.close}</button>
    `;
    container.appendChild(div);

    div.querySelector('.btn-clear-inverse-single').addEventListener('click', () => {
      const input = document.getElementById(`inverse-var-input-${v}`);
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  });
}

// =============================================================================
// TODAS LAS OPERACIONES POSIBLES (CONSTRUCTOR Y PROCESO INVERSO)
// =============================================================================
function renderAllOperationsPanel(containerId, countId, gridId, variables, variableMap, onLoadFormula) {
  const container = document.getElementById(containerId);
  const countEl = document.getElementById(countId);
  const gridEl = document.getElementById(gridId);
  if (!container || !gridEl) return;

  if (!variables || variables.length < 2) {
    container.classList.remove('hidden');
    if (countEl) countEl.textContent = '0';
    gridEl.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-secondary); background: var(--bg-card); border: 2px dashed var(--border-color); border-radius: var(--radius-md);">
        <p style="font-size: 1.05rem; font-weight: 700; color: var(--pop-yellow); margin-bottom: 0.5rem;">
          Se requieren al menos 2 proposiciones atómicas
        </p>
        <p style="font-size: 0.88rem; margin: 0; line-height: 1.5;">
          Para calcular las operaciones combinatorias binarias necesitas tener registradas al menos dos variables (ej. p y q). Agrega o define otra variable para comenzar.
        </p>
      </div>
    `;
    container.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const operations = AllOperationsEngine.generateAllPairwiseOperations(
    variables,
    variableMap,
    AppState.currentNotation
  );

  if (countEl) countEl.textContent = operations.length;
  gridEl.innerHTML = '';

  const fragment = document.createDocumentFragment();

  operations.forEach(op => {
    const card = document.createElement('div');
    card.className = 'all-ops-card';

    let opBadgeClass = 'badge-and';
    if (op.operator === OPERATORS.OR) opBadgeClass = 'badge-or';
    else if (op.operator === OPERATORS.IMPLIES) opBadgeClass = 'badge-implies';
    else if (op.operator === OPERATORS.IFF) opBadgeClass = 'badge-iff';

    let truthBadgeClass = 'badge-contingency';
    if (op.truthDiagnosis === 'Tautología') truthBadgeClass = 'badge-tautology';
    else if (op.truthDiagnosis === 'Contradicción') truthBadgeClass = 'badge-contradiction';

    const safeSpanish = NaturalLanguageTranslator.formatCompleteSentence(op.spanishText);

    card.innerHTML = `
      <div>
        <div class="all-ops-header">
          <span class="all-ops-fbf-badge ${opBadgeClass}">${op.opLabel}</span>
          <span class="all-ops-truth-badge ${truthBadgeClass}">${op.truthDiagnosis}</span>
        </div>
        <div class="all-ops-formula">${op.fbf}</div>
        <div class="all-ops-spanish">"${safeSpanish}"</div>
      </div>
      <div class="all-ops-actions">
        <button class="btn btn-secondary btn-sm btn-op-load" title="Cargar esta fórmula">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          Cargar
        </button>
        <button class="btn btn-primary btn-sm btn-op-truth" title="Ver en Tabla de Verdad">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="12" y1="3" x2="12" y2="21"></line></svg>
          Tabla
        </button>
      </div>
    `;

    card.querySelector('.btn-op-load').addEventListener('click', (e) => {
      triggerSuccessFeedback(e.currentTarget);
      onLoadFormula(op);
    });

    card.querySelector('.btn-op-truth').addEventListener('click', () => {
      const truthInput = document.getElementById('truth-fbf-input');
      if (truthInput) truthInput.value = op.fbf;
      switchTab('tab-truthtable');
      document.getElementById('btn-generate-truth-table')?.click();
    });

    fragment.appendChild(card);
  });

  gridEl.appendChild(fragment);
  container.classList.remove('hidden');
  container.scrollIntoView({ behavior: 'smooth' });
}

// =============================================================================
// TABLA DE VERDAD Y ÁRBOL SINTÁCTICO
// =============================================================================
function initTruthTableAndTree() {
  document.getElementById('btn-clear-truth-input')?.addEventListener('click', () => {
    const input = document.getElementById('truth-fbf-input');
    if (input) {
      input.value = '';
      input.focus();
    }
  });

  document.getElementById('btn-generate-truth-table')?.addEventListener('click', () => {
    const inputVal = document.getElementById('truth-fbf-input').value.trim();
    if (!inputVal) {
      showToast('Por favor introduce una fórmula para evaluar.', 'error');
      return;
    }

    try {
      const ast = FBFParser.parse(inputVal);
      const tableData = TruthTableEngine.generate(ast, AppState.currentNotation);

      renderTruthTable(tableData);
      renderSyntaxTree(ast);

      document.getElementById('truth-results-container')?.classList.remove('hidden');
      showToast(`Evaluación completada: ${tableData.classification}`, 'success');
    } catch (err) {
      showToast(`Error al evaluar fórmula: ${err.message}`, 'error');
      document.getElementById('truth-results-container')?.classList.add('hidden');
    }
  });
}

function renderTruthTable(data) {
  const table = document.getElementById('rendered-truth-table');
  const tableWrapper = document.getElementById('truth-table-wrapper') || table?.parentElement;
  const banner = document.getElementById('truth-classification-banner');
  const title = document.getElementById('truth-class-title');
  const desc = document.getElementById('truth-class-desc');
  const limitMsg = document.getElementById('truth-table-limit-message');
  const limitText = document.getElementById('truth-table-limit-text');

  if (!table || !banner) return;

  // Actualizar diagnóstico formal (siempre visible y calculado con exactitud)
  banner.className = `truth-classification-banner banner-${data.classification.toLowerCase()}`;
  title.textContent = `DIAGNÓSTICO FORMAL: ${data.classification}`;
  desc.textContent = data.description;

  // Evaluar si se está trabajando con más de 6 proposiciones
  if (data.variables && data.variables.length > 6) {
    // Ocultar la tabla y mostrar en su lugar el mensaje de error solicitado
    if (tableWrapper) tableWrapper.classList.add('hidden');
    table.innerHTML = '';
    if (limitMsg) {
      if (limitText) {
        limitText.textContent = 'La tabla solo puede aparecer cuando se estan operando 6 o menos preposiciones.';
      }
      limitMsg.classList.remove('hidden');
    }
    return;
  }

  // Si son 6 o menos proposiciones, ocultar el aviso de error y mostrar la tabla de verdad
  if (limitMsg) limitMsg.classList.add('hidden');
  if (tableWrapper) tableWrapper.classList.remove('hidden');

  let theadHTML = '<thead><tr><th>#</th>';
  data.variables.forEach(v => {
    theadHTML += `<th>${v}</th>`;
  });
  data.intermediateColumns.forEach(c => {
    theadHTML += `<th>${c}</th>`;
  });
  theadHTML += `<th class="col-main">${data.fullExprStr} (Resultado)</th></tr></thead>`;

  let tbodyHTML = '<tbody>';
  data.rows.forEach(r => {
    tbodyHTML += `<tr><td><strong>${r.rowIndex}</strong></td>`;

    r.varValues.forEach(v => {
      const cls = v.val === 'V' ? 'val-v' : 'val-f';
      tbodyHTML += `<td class="${cls}">${v.val}</td>`;
    });

    r.intermediateValues.forEach(iv => {
      const cls = iv.val === 'V' ? 'val-v' : 'val-f';
      tbodyHTML += `<td class="${cls}">${iv.val}</td>`;
    });

    const finalCls = r.finalResult === 'V' ? 'val-v' : 'val-f';
    tbodyHTML += `<td class="${finalCls}" style="font-weight: 800; font-size: 1.1rem;">${r.finalResult}</td></tr>`;
  });
  tbodyHTML += '</tbody>';

  table.innerHTML = theadHTML + tbodyHTML;
}

function renderSyntaxTree(ast) {
  const container = document.getElementById('syntax-tree-rendered');
  if (!container) return;

  const treeData = FBFParser.toTreeData(ast, AppState.currentNotation);
  container.innerHTML = `<ul>${buildTreeHtml(treeData)}</ul>`;
}

function buildTreeHtml(node) {
  if (!node) return '';

  const isOp = node.type === 'binary' || node.type === 'unary';
  const nodeClass = isOp ? 'tree-node node-op' : 'tree-node node-var';

  let html = `<li><div class="${nodeClass}" title="${node.description}">${node.label}</div>`;

  if (node.children && node.children.length > 0) {
    html += '<ul>';
    node.children.forEach(child => {
      html += buildTreeHtml(child);
    });
    html += '</ul>';
  }

  html += '</li>';
  return html;
}

// =============================================================================
// COORDINACIÓN DEL CENTRO DE PRÁCTICAS Y MASCOTA ROBÓTICA
// =============================================================================
let practiceEngine = null;
let practiceView = null;
let mascotController = null;
let isWaitingDuelResponse = false;

function loadChallengeToView(challenge) {
  if (!challenge) return;

  if (challenge.type === 'tree') {
    practiceView.renderTreeChallenge(challenge);
  } else if (challenge.type === 'molecular') {
    practiceView.renderMolecularChallenge(challenge);
  } else if (challenge.type === 'verdict') {
    practiceView.renderVerdictChallenge(challenge);
  } else if (challenge.type === 'duel') {
    practiceView.renderDuelChallenge(challenge);
    startDuelMascotTurn(challenge);
  }
}

function startDuelMascotTurn(challenge) {
  isWaitingDuelResponse = true;
  mascotController.react('thinking');
  practiceView.updateDuelMascotBanner('Moli está evaluando mentalmente la fórmula...');

  studentModel.simulateMascotDecision(challenge.expectedTruthValue, practiceEngine.activeDifficulty)
    .then(mascotResult => {
      if (isWaitingDuelResponse && practiceEngine.isPlaying && practiceEngine.currentChallenge === challenge) {
        isWaitingDuelResponse = false;
        const answerText = mascotResult.answer ? 'VERDADERO' : 'FALSO';

        if (mascotResult.isCorrect) {
          practiceView.updateDuelMascotBanner(`Moli respondió ${answerText} y ¡ha acertado!`, true);
          practiceEngine.recordMascotDuelPoint();
          showToast(`Moli acertó (${answerText})`, 'info');
          setTimeout(() => {
            if (practiceEngine.isPlaying) {
              loadChallengeToView(practiceEngine.nextChallenge());
            }
          }, 1200);
        } else {
          practiceView.updateDuelMascotBanner(`Moli respondió ${answerText} y ¡ha fallado! Tu turno...`, true);
          mascotController.react('dizzy');
          showToast(`¡Moli se equivocó! Tienes la oportunidad de responder`, 'info');
          isWaitingDuelResponse = true; // El jugador todavía puede responder
        }
      }
    });
}

function handleDuelPlayerAnswer(playerVal) {
  if (!isWaitingDuelResponse && practiceEngine.activeGameId === 'duel') {
    return;
  }

  isWaitingDuelResponse = false;
  const res = practiceEngine.evaluateDuelPlayerAnswer(playerVal);
  if (res.isCorrect) {
    showToast('¡Acertaste antes que la IA!', 'success');
  } else {
    showToast('Valor de verdad incorrecto', 'error');
  }

  setTimeout(() => {
    if (practiceEngine.isPlaying) {
      loadChallengeToView(practiceEngine.nextChallenge());
    }
  }, 600);
}

function initPracticeAndMascot() {
  mascotController = new MascotController(() => {
    let currentFbf = '';
    let mainOp = null;
    try {
      const fbfOutput = document.getElementById('builder-fbf-output');
      if (fbfOutput && fbfOutput.textContent !== '--') {
        currentFbf = fbfOutput.textContent.trim();
        const ast = FBFParser.parse(currentFbf, AppState.currentNotation);
        if (ast && ast.type === 'binary') mainOp = ast.op;
        else if (ast && ast.type === 'unary') mainOp = ast.op;
      }
    } catch (_) {}

    let pendingTasksCount = 0;
    if (AppState.currentUser && AppState.currentUser.role === 'estudiante') {
      const stId = AppState.currentUser.userId || AppState.currentUser.id;
      const studentSections = sectionsDB.getSectionsForStudent(stId);
      studentSections.forEach(s => {
        if (Array.isArray(s.tasks)) {
          pendingTasksCount += s.tasks.filter(t => !t.completedByStudentIds.includes(stId)).length;
        }
      });
    }

    return {
      activeTab: AppState.activeTab || 'tab-builder',
      currentUser: AppState.currentUser,
      tokens: AppState.builderTokens,
      fbf: currentFbf,
      mainOp: mainOp,
      pendingTasksCount: pendingTasksCount
    };
  });

  practiceView = new PracticeView('practice-center-container');

  practiceEngine = new PracticeEngine({
    mascotController: mascotController,
    onTick: (seconds) => {
      practiceView.updateTimerDisplay(seconds);
    },
    onScoreUpdate: (scores) => {
      practiceView.updateScore(scores);
    },
    onGameOver: (summary) => {
      isWaitingDuelResponse = false;
      practiceView.renderSummary(summary);
    }
  });

  practiceView.onLobbyRendered = () => {
    const slot = document.getElementById('mascot-dock-slot');
    if (slot) mascotController.dockTo(slot);
  };

  practiceView.onSummaryRendered = () => {
    const slot = document.getElementById('mascot-dock-slot');
    if (slot) mascotController.dockTo(slot);
  };

  practiceView.onArenaRendered = () => {
    mascotController.undock();
  };

  const getGameTitle = (gameId) => {
    const titles = {
      tree: 'Árbol Correcto',
      molecular: 'Moleculares',
      verdict: 'Veredicto',
      duel: 'Duelo contra la Mascota IA'
    };
    return titles[gameId] || 'Minijuego';
  };

  practiceView.onSelectGame = (gameId, difficulty) => {
    mascotController.undock();
    practiceView.renderGameArena(getGameTitle(gameId), gameId === 'duel');
    const challenge = practiceEngine.startGame(gameId, difficulty);
    loadChallengeToView(challenge);
  };

  practiceView.onExitGame = () => {
    isWaitingDuelResponse = false;
    practiceEngine.stopGame();
    practiceView.renderLobby(studentModel.getRecommendation());
    const slot = document.getElementById('mascot-dock-slot');
    if (slot) mascotController.dockTo(slot);
  };

  practiceView.onPlayAgain = (gameId, difficulty) => {
    mascotController.undock();
    practiceView.renderGameArena(getGameTitle(gameId), gameId === 'duel');
    const challenge = practiceEngine.startGame(gameId, difficulty);
    loadChallengeToView(challenge);
  };

  practiceView.onAnswer = (payload) => {
    if (payload.type === 'tree') {
      const res = practiceEngine.evaluateTreeAnswer(payload.selectedFBF);
      if (res.isCorrect) {
        showToast('¡Correcto!', 'success');
        setTimeout(() => {
          if (practiceEngine.isPlaying) {
            loadChallengeToView(practiceEngine.nextChallenge());
          }
        }, 900);
      }
      return res;
    } else if (payload.type === 'molecular') {
      const res = practiceEngine.evaluateMolecularAnswer(payload.tokens);
      if (res.isCorrect) {
        showToast('¡Fórmula Correcta!', 'success');
        setTimeout(() => {
          if (practiceEngine.isPlaying) {
            loadChallengeToView(practiceEngine.nextChallenge());
          }
        }, 900);
      }
      return res;
    } else if (payload.type === 'verdict') {
      const res = practiceEngine.evaluateVerdictAnswer(payload.selectedVerdict);
      if (res.isCorrect) {
        showToast('¡Veredicto Correcto!', 'success');
      } else {
        showToast(`Incorrecto. Era ${res.correctVerdict} (-1 punto)`, 'error');
      }
      setTimeout(() => {
        if (practiceEngine.isPlaying) {
          loadChallengeToView(practiceEngine.nextChallenge());
        }
      }, 900);
      return res;
    } else if (payload.type === 'duel') {
      handleDuelPlayerAnswer(payload.playerValue);
    }
  };

  practiceView.renderLobby(studentModel.getRecommendation());
  if (AppState.activeTab === 'tab-practice') {
    const initialSlot = document.getElementById('mascot-dock-slot');
    if (initialSlot) mascotController.dockTo(initialSlot);
  }

  // Exponer controlador para interactividad y pruebas
  window.mascotController = mascotController;
}

// =============================================================================
// MÓDULO DE SECCIONES ACADÉMICAS Y TO-DO LIST COLABORATIVA
// =============================================================================
function initSectionsModule() {
  const modalCreateSec = document.getElementById('modal-create-section');
  const btnOpenCreateSec = document.getElementById('btn-open-create-section');
  const btnCancelCreateSec = document.getElementById('btn-cancel-create-section');
  const formCreateSec = document.getElementById('form-create-section');
  const btnBackToSections = document.getElementById('btn-back-to-sections');
  const formAddTask = document.getElementById('form-add-task');
  const btnAddStudentAction = document.getElementById('btn-add-student-action');

  // Abrir modal de creación de sección (solo profesor)
  btnOpenCreateSec?.addEventListener('click', () => {
    const nameInput = document.getElementById('create-section-name');
    if (nameInput) nameInput.value = '';

    const container = document.getElementById('create-section-students-container');
    if (container) {
      container.innerHTML = '';
      const students = dbService.getUsers().filter(u => u.role === 'estudiante');
      if (students.length === 0) {
        container.innerHTML = '<span class="text-muted" style="font-size: 0.8rem;">No hay estudiantes registrados aún en el sistema.</span>';
      } else {
        students.forEach(st => {
          const label = document.createElement('label');
          label.className = 'students-checkbox-item';
          label.innerHTML = `
            <input type="checkbox" name="selected_students" value="${st.id}" style="accent-color: var(--accent-cyan); width: 16px; height: 16px;">
            <span>${st.username}</span>
          `;
          container.appendChild(label);
        });
      }
    }

    modalCreateSec?.classList.add('active');
    nameInput?.focus();
  });

  // Cancelar modal de creación
  btnCancelCreateSec?.addEventListener('click', () => {
    modalCreateSec?.classList.remove('active');
  });

  // Formulario crear sección
  formCreateSec?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('create-section-name');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
      showToast('Por favor introduce un nombre para la sección.', 'info');
      return;
    }

    const checkboxes = formCreateSec.querySelectorAll('input[name="selected_students"]:checked');
    const studentIds = Array.from(checkboxes).map(cb => cb.value);

    const currentUser = AppState.currentUser;
    const res = sectionsDB.createSection({
      name,
      professorId: currentUser ? currentUser.userId : '',
      professorName: currentUser ? currentUser.username : 'Profesor',
      studentIds
    });

    if (res.success) {
      showToast(`¡Sección "${res.section.name}" creada con éxito!`, 'success');
      modalCreateSec?.classList.remove('active');
      renderSectionsList();

      if (mascotController) {
        mascotController.view.setExpression('happy');
        mascotController.sayQuickRemark('¡Sección creada con éxito! Ahora puede asignar tareas prácticas a los estudiantes.', 3500);
        setTimeout(() => {
          if (mascotController.view.currentExpression === 'happy') {
            mascotController.view.setExpression('idle');
          }
        }, 3500);
      }
    } else {
      showToast(res.message, 'error');
    }
  });

  // Botón para volver a la lista de secciones
  btnBackToSections?.addEventListener('click', () => {
    AppState.currentSectionId = null;
    document.getElementById('section-detail-view')?.classList.add('hidden');
    document.getElementById('sections-list-view')?.classList.remove('hidden');
    renderSectionsList();
  });

  // Profesor: Agregar nueva tarea To-Do
  formAddTask?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('input-new-task');
    const text = input ? input.value.trim() : '';

    if (!text) {
      showToast('Por favor escribe la descripción de la tarea.', 'info');
      return;
    }

    const res = sectionsDB.addTask(AppState.currentSectionId, text);
    if (res.success) {
      showToast('Tarea asignada a la sección.', 'success');
      if (input) input.value = '';
      openSectionDetail(AppState.currentSectionId);

      if (mascotController) {
        mascotController.sayQuickRemark('Tarea asignada a la sección. Los estudiantes inscritos ya pueden visualizarla.', 3500);
      }
    } else {
      showToast(res.message || 'Error al agregar tarea.', 'error');
    }
  });

  // Profesor: Añadir estudiante a sección existente
  btnAddStudentAction?.addEventListener('click', () => {
    const select = document.getElementById('select-add-student-to-section');
    const studentId = select ? select.value : '';
    if (!studentId) {
      showToast('Selecciona un alumno para añadir.', 'info');
      return;
    }

    const res = sectionsDB.addStudentToSection(AppState.currentSectionId, studentId);
    if (res.success) {
      showToast('Estudiante añadido a la sección.', 'success');
      openSectionDetail(AppState.currentSectionId);
    } else {
      showToast(res.message, 'error');
    }
  });
}

function renderSectionsList() {
  const listView = document.getElementById('sections-list-view');
  const detailView = document.getElementById('section-detail-view');
  const grid = document.getElementById('sections-grid');
  const emptyState = document.getElementById('sections-empty-state');
  const emptyTitle = document.getElementById('sections-empty-title');
  const emptyDesc = document.getElementById('sections-empty-desc');
  const btnCreate = document.getElementById('btn-open-create-section');

  if (!listView || !grid) return;

  listView.classList.remove('hidden');
  detailView?.classList.add('hidden');
  grid.innerHTML = '';

  const user = AppState.currentUser;
  if (!user) return;

  let sections = [];
  if (user.role === 'profesor') {
    btnCreate?.classList.remove('hidden');
    sections = sectionsDB.getSectionsForProfessor(user.userId);
    if (emptyTitle) emptyTitle.textContent = 'Aún no has creado ninguna sección';
    if (emptyDesc) emptyDesc.textContent = 'Haz clic en "+ Crear Nueva Sección" para organizar a tus estudiantes y asignar tareas.';
  } else {
    // Estudiante
    btnCreate?.classList.add('hidden');
    sections = sectionsDB.getSectionsForStudent(user.userId);
    if (emptyTitle) emptyTitle.textContent = 'No perteneces a ninguna sección todavía';
    if (emptyDesc) emptyDesc.textContent = 'Tu profesor te añadirá a su sección para que puedas ver y completar tus tareas.';
  }

  if (sections.length === 0) {
    emptyState?.classList.remove('hidden');
    grid.classList.add('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  grid.classList.remove('hidden');

  sections.forEach(s => {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.setAttribute('data-section-id', s.id);

    // Conteo de tareas simplificado (REQUISITO: solo decir "X Tareas")
    let count = 0;
    if (user.role === 'profesor') {
      count = Array.isArray(s.tasks) ? s.tasks.length : 0;
    } else {
      count = Array.isArray(s.tasks)
        ? s.tasks.filter(t => !t.completedByStudentIds || !t.completedByStudentIds.includes(user.userId)).length
        : 0;
    }

    const taskText = count === 1 ? '1 Tarea' : `${count} Tareas`;

    card.innerHTML = `
      <div>
        <div class="section-card-title">${s.name}</div>
        <div class="text-muted" style="font-size: 0.82rem;">Prof. ${s.professorName}</div>
      </div>
      <div class="section-card-footer">
        <span class="section-tasks-badge">${taskText}</span>
      </div>
    `;

    // REQUISITO APROBADO: Al clickear sobre la tarjeta se accede a la sección
    card.addEventListener('click', () => {
      openSectionDetail(s.id);
    });

    grid.appendChild(card);
  });
}

function openSectionDetail(sectionId) {
  AppState.currentSectionId = sectionId;
  const section = sectionsDB.getSectionById(sectionId);
  if (!section) {
    showToast('Sección no encontrada.', 'error');
    renderSectionsList();
    return;
  }

  const listView = document.getElementById('sections-list-view');
  const detailView = document.getElementById('section-detail-view');
  const detailName = document.getElementById('section-detail-name');
  const detailProf = document.getElementById('section-detail-prof');
  const detailBadge = document.getElementById('section-detail-badge');
  const profControls = document.getElementById('section-prof-controls');

  listView?.classList.add('hidden');
  detailView?.classList.remove('hidden');

  if (detailName) detailName.textContent = section.name;
  if (detailProf) detailProf.textContent = `Profesor a cargo: ${section.professorName}`;

  const user = AppState.currentUser;
  const isProfessor = user && user.role === 'profesor';

  if (detailBadge) {
    detailBadge.textContent = isProfessor ? 'Vista de Profesor' : 'Vista de Estudiante';
    detailBadge.className = isProfessor ? 'badge badge-profesor' : 'badge badge-user';
  }

  if (isProfessor) {
    profControls?.classList.remove('hidden');

    // 1. Renderizar lista de alumnos inscritos (chips con botón quitar)
    const roster = document.getElementById('section-students-roster');
    if (roster) {
      roster.innerHTML = '';
      if (!section.studentIds || section.studentIds.length === 0) {
        roster.innerHTML = '<span class="text-muted" style="font-size: 0.8rem;">No hay estudiantes inscritos aún.</span>';
      } else {
        section.studentIds.forEach(stId => {
          const stUser = dbService.findUserById(stId);
          const stName = stUser ? stUser.username : 'Estudiante';
          const chip = document.createElement('div');
          chip.className = 'student-chip';
          chip.innerHTML = `
            <span>${stName}</span>
            <button type="button" class="student-chip-btn-remove" title="Quitar de la sección">&times;</button>
          `;
          chip.querySelector('.student-chip-btn-remove')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await showConfirmDialog({
              title: '¿Quitar Alumno?',
              message: `¿Deseas desvincular a "${stName}" de esta sección?`,
              confirmText: 'Quitar Alumno',
              cancelText: 'Cancelar',
              danger: true
            });
            if (confirmed) {
              sectionsDB.removeStudentFromSection(section.id, stId);
              showToast(`"${stName}" removido de la sección.`, 'info');
              openSectionDetail(section.id);
            }
          });
          roster.appendChild(chip);
        });
      }
    }

    // 2. Poblar selector para añadir alumnos registrados que aún no estén en esta sección
    const selectAdd = document.getElementById('select-add-student-to-section');
    if (selectAdd) {
      selectAdd.innerHTML = '<option value="">-- Añadir alumno registrado --</option>';
      const allStudents = dbService.getUsers().filter(u => u.role === 'estudiante');
      const unassigned = allStudents.filter(st => !section.studentIds.includes(st.id));

      unassigned.forEach(st => {
        const opt = document.createElement('option');
        opt.value = st.id;
        opt.textContent = st.username;
        selectAdd.appendChild(opt);
      });
    }

    // 3. Renderizar tareas con progreso interactivo para el profesor
    renderProfessorTasks(section);

  } else {
    // Es Estudiante
    profControls?.classList.add('hidden');
    renderStudentTasks(section, user.userId);
  }
}

function renderProfessorTasks(section) {
  const container = document.getElementById('section-tasks-list');
  const emptyState = document.getElementById('section-tasks-empty');
  if (!container) return;

  container.innerHTML = '';
  const tasks = Array.isArray(section.tasks) ? section.tasks : [];

  if (tasks.length === 0) {
    emptyState?.classList.remove('hidden');
    return;
  }
  emptyState?.classList.add('hidden');

  const totalEnrolled = (section.studentIds || []).length;

  tasks.forEach(t => {
    const completedList = Array.isArray(t.completedByStudentIds) ? t.completedByStudentIds : [];
    const completedCount = completedList.length;

    const taskEl = document.createElement('div');
    taskEl.className = 'task-item';

    taskEl.innerHTML = `
      <div class="task-left">
        <span class="task-text">${t.text}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span class="task-progress-pill" title="Clic para ver detalle de alumnos">${completedCount} de ${totalEnrolled} completaron</span>
        <button type="button" class="btn btn-icon btn-delete-task" title="Eliminar tarea" style="color: var(--accent-rose);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;

    // Contenedor expandible de detalle
    const dropdown = document.createElement('div');
    dropdown.className = 'task-progress-dropdown hidden';

    // Generar nombres de completados y pendientes
    const completedNames = completedList.map(id => {
      const u = dbService.findUserById(id);
      return u ? u.username : 'Estudiante';
    });
    const pendingNames = (section.studentIds || []).filter(id => !completedList.includes(id)).map(id => {
      const u = dbService.findUserById(id);
      return u ? u.username : 'Estudiante';
    });

    dropdown.innerHTML = `
      <div><strong class="text-emerald">Completaron (${completedNames.length}):</strong> ${completedNames.length > 0 ? completedNames.join(', ') : 'Ninguno aún'}</div>
      <div><strong class="text-muted">Pendientes (${pendingNames.length}):</strong> ${pendingNames.length > 0 ? pendingNames.join(', ') : 'Ninguno'}</div>
    `;

    taskEl.querySelector('.task-progress-pill')?.addEventListener('click', () => {
      dropdown.classList.toggle('hidden');
    });

    taskEl.querySelector('.btn-delete-task')?.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog({
        title: '¿Eliminar Tarea?',
        message: '¿Deseas eliminar permanentemente esta tarea de la sección?',
        confirmText: 'Eliminar Tarea',
        cancelText: 'Cancelar',
        danger: true
      });
      if (confirmed) {
        sectionsDB.deleteTask(section.id, t.id);
        showToast('Tarea eliminada.', 'info');
        openSectionDetail(section.id);
      }
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(taskEl);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);
  });
}

function renderStudentTasks(section, studentId) {
  const container = document.getElementById('section-tasks-list');
  const emptyState = document.getElementById('section-tasks-empty');
  if (!container) return;

  container.innerHTML = '';
  const allTasks = Array.isArray(section.tasks) ? section.tasks : [];

  // Filtrar solo tareas que este estudiante aún NO ha marcado como realizadas
  const pendingTasks = allTasks.filter(t => {
    return !t.completedByStudentIds || !t.completedByStudentIds.includes(studentId);
  });

  if (pendingTasks.length === 0) {
    emptyState?.classList.remove('hidden');
    return;
  }
  emptyState?.classList.add('hidden');

  pendingTasks.forEach(t => {
    const taskEl = document.createElement('div');
    taskEl.className = 'task-item';

    taskEl.innerHTML = `
      <div class="task-left">
        <button type="button" class="task-checkbox" title="Marcar como realizada" data-task-id="${t.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <span class="task-text">${t.text}</span>
      </div>
    `;

    // REQUISITO APROBADO: Al marcar la casilla, desaparece inmediatamente para el alumno
    const checkboxBtn = taskEl.querySelector('.task-checkbox');
    checkboxBtn?.addEventListener('click', () => {
      checkboxBtn.classList.add('checked');
      taskEl.style.opacity = '0.5';
      taskEl.style.transform = 'scale(0.98)';
      taskEl.style.transition = 'all 0.25s ease';

      setTimeout(() => {
        sectionsDB.markTaskCompleted(section.id, t.id, studentId);
        showToast('¡Tarea completada!', 'success');
        openSectionDetail(section.id);

        if (mascotController) {
          mascotController.celebrateTaskCompletion();
        }
      }, 250);
    });

    container.appendChild(taskEl);
  });
}

// =============================================================================
// GESTIÓN DE ELEMENTOS LÓGICOS GUARDADOS (ATÓMICAS, FBF Y MOLECULARES)
// =============================================================================
function getActiveUserId() {
  return AppState.currentUser?.id || dbService.getCurrentSession()?.userId || 'default_user';
}

function fbfStringToBuilderTokens(formulaStr) {
  try {
    const astTokens = FBFParser.tokenize(formulaStr);
    const builderTokens = [];
    astTokens.forEach(t => {
      if (t.type === 'LPAREN' || t.type === 'RPAREN') {
        builderTokens.push({ type: 'paren', value: t.value });
      } else if (t.type === 'OP' || t.type === 'NOT') {
        builderTokens.push({ type: 'op', value: t.op });
      } else if (t.type === 'VAR') {
        builderTokens.push({ type: 'var', value: t.value.toLowerCase() });
      }
    });
    return builderTokens;
  } catch (e) {
    console.error('Error al tokenizar fórmula:', e);
    return [];
  }
}

function ensureBuilderAtomicsExist(varNames = []) {
  let changed = false;
  varNames.forEach(v => {
    const lower = v.toLowerCase();
    const exists = AppState.builderAtomics.some(a => a.name === lower);
    if (!exists) {
      AppState.builderAtomics.push({ name: lower, text: '' });
      changed = true;
    }
  });
  if (changed) {
    renderAtomicDefinitions();
  }
}

function ensureBuilderAtomicLetter(targetLetter) {
  const alphabet = ['p', 'q', 'r', 's', 't', 'u', 'w', 'x', 'y', 'z'];
  const targetIdx = alphabet.indexOf(targetLetter.toLowerCase());
  if (targetIdx === -1) return;

  let changed = false;
  for (let i = 0; i <= targetIdx; i++) {
    const letter = alphabet[i];
    if (!AppState.builderAtomics.some(a => a.name === letter)) {
      AppState.builderAtomics.push({ name: letter, text: '' });
      changed = true;
    }
  }
  if (changed) {
    renderAtomicDefinitions();
  }
}

async function handleQuotaFullCTA(category, anchorEl) {
  const max = SAVED_LIMITS[category] || 15;
  const catNames = {
    atomics: 'proposiciones atómicas',
    fbf: 'fórmulas bien formadas (FBF)',
    molecules: 'proposiciones moleculares'
  };
  const name = catNames[category] || category;

  // Paso 1: Aviso explícito inmediato
  showToast(`Límite alcanzado: Ya tienes el máximo permitido de ${max} ${name} guardadas.`, 'warning');

  // Paso 2: Call to Action interactivo en diálogo NeoPop
  const wantManage = await showConfirmDialog({
    title: 'Capacidad Máxima Alcanzada',
    message: `Has alcanzado el límite de ${max} ${name}. ¿Deseas revisar tu lista y eliminar alguna para hacer espacio?`,
    confirmText: 'Gestionar Guardados',
    cancelText: 'Cerrar',
    danger: false
  });

  if (wantManage && anchorEl) {
    openSavedItemsPicker(category, anchorEl);
  }
}

function openSavedItemsPicker(category, anchorEl) {
  const userId = getActiveUserId();
  const items = savedItemsStorage.getItems(userId, category);
  const quotaInfo = savedItemsStorage.getQuotaInfo(userId, category);

  const titles = {
    atomics: 'Proposiciones Atómicas Guardadas',
    fbf: 'Fórmulas Bien Formadas (FBF)',
    molecules: 'Proposiciones Moleculares Guardadas'
  };

  savedItemsPopover.open({
    anchorEl,
    category,
    title: titles[category] || 'Elementos Guardados',
    items,
    quotaInfo,
    onInsertDirect: (item) => handleInsertDirect(category, item),
    onInsertAt: category === 'atomics' ? (item, varLetter) => handleInsertAt(item, varLetter) : undefined,
    onDelete: (item) => {
      savedItemsStorage.deleteItem(userId, category, item.id);
      showToast('Elemento eliminado del banco de guardados.', 'info');
      const updatedQuota = savedItemsStorage.getQuotaInfo(userId, category);
      savedItemsPopover.removeItem(item.id, updatedQuota);
    }
  });
}

function handleInsertDirect(category, item) {
  if (category === 'atomics') {
    // Si estamos en la pestaña de Proceso Inverso
    if (AppState.activeTab === 'tab-inverse') {
      if (!AppState.inverseVars || AppState.inverseVars.length === 0) {
        showToast('Primero analiza una FBF en el proceso inverso para detectar variables.', 'info');
        return;
      }
      // Buscar primera variable vacía o con placeholder
      const emptyVar = AppState.inverseVars.find(v => {
        const val = AppState.inverseVarMap[v];
        return !val || val.startsWith('[proposición') || !val.trim();
      });

      const targetVar = emptyVar || AppState.inverseVars[0];
      const input = document.getElementById(`inverse-var-input-${targetVar}`);
      if (input) {
        input.value = item.text;
      }
      triggerSuccessFeedback(document.getElementById('btn-open-atomic-inverse-picker'));
      AppState.inverseVarMap[targetVar] = item.text;
      document.getElementById('btn-generate-inverse-sentence')?.click();
      showToast(`Proposición asignada a la variable ${targetVar}: "${item.text}"`, 'success');
      return;
    }

    // En Constructor Visual: Buscar primer espacio libre o con placeholder en builderAtomics
    const emptyAtomic = AppState.builderAtomics.find(a => !a.text || !a.text.trim() || a.text.startsWith('nueva proposición para '));
    if (emptyAtomic) {
      emptyAtomic.text = item.text;
      const input = document.getElementById(`atomic-input-${emptyAtomic.name}`);
      if (input) {
        input.value = item.text;
      } else {
        renderAtomicDefinitions();
      }
      triggerSuccessFeedback(document.getElementById('btn-open-atomic-builder-picker'));
      updateBuilderDisplay();
      showToast(`Proposición asignada a ${emptyAtomic.name}: "${item.text}"`, 'success');
      return;
    }

    // Si todas tienen texto, buscar la siguiente variable libre
    const alphabet = ['p', 'q', 'r', 's', 't', 'u', 'w', 'x', 'y', 'z'];
    const activeNames = AppState.builderAtomics.map(a => a.name);
    const nextLetter = alphabet.find(l => !activeNames.includes(l));

    if (nextLetter) {
      AppState.builderAtomics.push({ name: nextLetter, text: item.text });
      renderAtomicDefinitions();
      updateBuilderDisplay();
      triggerSuccessFeedback(document.getElementById('btn-open-atomic-builder-picker'));
      showToast(`Nueva variable ${nextLetter} agregada con: "${item.text}"`, 'success');
    } else {
      // Si ya están todas ocupadas, actualizar la primera
      AppState.builderAtomics[0].text = item.text;
      const input = document.getElementById('atomic-input-p');
      if (input) {
        input.value = item.text;
      }
      triggerSuccessFeedback(document.getElementById('btn-open-atomic-builder-picker'));
      updateBuilderDisplay();
      showToast(`Variable p actualizada con: "${item.text}"`, 'success');
    }
  } else if (category === 'fbf') {
    if (AppState.activeTab === 'tab-inverse') {
      const input = document.getElementById('inverse-fbf-input');
      if (input) {
        input.value = item.formula;
        triggerSuccessFeedback(document.getElementById('btn-open-fbf-inverse-picker'));
        document.getElementById('btn-parse-inverse')?.click();
        showToast(`FBF cargada en Proceso Inverso: ${item.formula}`, 'success');
      }
    } else {
      try {
        const ast = FBFParser.parse(item.formula);
        const vars = FBFParser.getVariables(ast);
        ensureBuilderAtomicsExist(vars);
        AppState.builderTokens = fbfStringToBuilderTokens(item.formula);
        updateBuilderDisplay();
        triggerSuccessFeedback(document.getElementById('btn-open-fbf-builder-picker'));
        showToast(`FBF cargada en el lienzo: ${item.formula}`, 'success');
      } catch (err) {
        showToast(`Error al interpretar la FBF guardada: ${err.message}`, 'error');
      }
    }
  } else if (category === 'molecules') {
    if (AppState.activeTab === 'tab-inverse') {
      const input = document.getElementById('inverse-fbf-input');
      if (input) {
        input.value = item.fbf;
        triggerSuccessFeedback(document.getElementById('btn-open-molecular-inverse-picker'));
        document.getElementById('btn-parse-inverse')?.click();
        showToast(`FBF de la molecular cargada para proceso inverso: ${item.fbf}`, 'success');
      }
    } else {
      try {
        const ast = FBFParser.parse(item.fbf);
        const vars = FBFParser.getVariables(ast);
        ensureBuilderAtomicsExist(vars);
        AppState.builderTokens = fbfStringToBuilderTokens(item.fbf);
        updateBuilderDisplay();
        triggerSuccessFeedback(document.getElementById('btn-open-molecular-builder-picker'));
        showToast('Proposición molecular cargada en el constructor.', 'success');
      } catch (err) {
        showToast(`Error al interpretar la FBF de la molecular: ${err.message}`, 'error');
      }
    }
  }
}

function handleInsertAt(item, varLetter) {
  if (AppState.activeTab === 'tab-inverse') {
    if (!AppState.inverseVars.includes(varLetter)) {
      showToast(`La FBF analizada actualmente no incluye la variable "${varLetter}".`, 'error');
      return;
    }
    const input = document.getElementById(`inverse-var-input-${varLetter}`);
    if (input) {
      input.value = item.text;
    }
    triggerSuccessFeedback(document.getElementById('btn-open-atomic-inverse-picker'));
    AppState.inverseVarMap[varLetter] = item.text;
    document.getElementById('btn-generate-inverse-sentence')?.click();
    showToast(`Variable ${varLetter} asignada: "${item.text}"`, 'success');
    return;
  }

  // Constructor Visual
  ensureBuilderAtomicLetter(varLetter);
  const target = AppState.builderAtomics.find(a => a.name === varLetter);
  if (target) {
    target.text = item.text;
    const input = document.getElementById(`atomic-input-${varLetter}`);
    if (input) {
      input.value = item.text;
    }
    triggerSuccessFeedback(document.getElementById('btn-open-atomic-builder-picker'));
    updateBuilderDisplay();
    showToast(`Variable ${varLetter} asignada: "${item.text}"`, 'success');
  }
}

function initSavedItemsFeature() {
  // 1. CONSTRUCTOR VISUAL - Atómicas
  document.getElementById('btn-save-atomic-builder')?.addEventListener('click', async (e) => {
    const userId = getActiveUserId();
    if (savedItemsStorage.isQuotaFull(userId, 'atomics')) {
      await handleQuotaFullCTA('atomics', e.currentTarget);
      return;
    }

    const validAtomics = AppState.builderAtomics
      .filter(a => (a.text || '').trim().length > 0)
      .map(a => ({ letter: a.name, text: a.text.trim() }));

    if (validAtomics.length === 0) {
      showToast('No hay enunciados escritos en las variables atómicas para guardar.', 'info');
      return;
    }

    // Solicita al usuario seleccionar qué letra/proposición atómica desea guardar
    savedItemsPopover.openSaveSelector({
      anchorEl: e.currentTarget,
      title: 'Seleccionar Atómica a Guardar',
      options: validAtomics,
      onSelect: (chosen) => {
        if (savedItemsStorage.isQuotaFull(userId, 'atomics')) {
          handleQuotaFullCTA('atomics', e.currentTarget);
          return;
        }
        const res = savedItemsStorage.saveItem(userId, 'atomics', { text: chosen.text });
        if (res.success) {
          triggerSuccessFeedback(document.getElementById('btn-save-atomic-builder'));
          showToast(`Proposición de la variable ${chosen.letter} guardada con éxito.`, 'success');
        } else if (res.reason === 'quota_full') {
          handleQuotaFullCTA('atomics', e.currentTarget);
        }
      }
    });
  });

  document.getElementById('btn-open-atomic-builder-picker')?.addEventListener('click', (e) => {
    openSavedItemsPicker('atomics', e.currentTarget);
  });

  // 2. CONSTRUCTOR VISUAL - FBF
  document.getElementById('btn-save-fbf-builder')?.addEventListener('click', async (e) => {
    const userId = getActiveUserId();
    const formulaText = document.getElementById('builder-fbf-output')?.textContent.trim();

    if (!formulaText || formulaText === '--') {
      showToast('Construye primero una FBF en el lienzo antes de guardar.', 'error');
      return;
    }

    try {
      FBFParser.parse(formulaText);
    } catch (err) {
      showToast(`La fórmula actual no es sintácticamente válida: ${err.message}`, 'error');
      return;
    }

    if (savedItemsStorage.isQuotaFull(userId, 'fbf')) {
      await handleQuotaFullCTA('fbf', e.currentTarget);
      return;
    }

    const res = savedItemsStorage.saveItem(userId, 'fbf', { formula: formulaText });
    if (res.success) {
      triggerSuccessFeedback(e.currentTarget);
      showToast(`FBF guardada correctamente: ${formulaText}`, 'success');
    } else if (res.reason === 'quota_full') {
      await handleQuotaFullCTA('fbf', e.currentTarget);
    }
  });

  document.getElementById('btn-open-fbf-builder-picker')?.addEventListener('click', (e) => {
    openSavedItemsPicker('fbf', e.currentTarget);
  });

  // 3. CONSTRUCTOR VISUAL - Proposición Molecular
  document.getElementById('btn-save-molecular-builder')?.addEventListener('click', async (e) => {
    const userId = getActiveUserId();
    const fbfText = document.getElementById('builder-fbf-output')?.textContent.trim();
    const sentenceText = document.getElementById('builder-sentence-output')?.textContent.trim();

    if (!fbfText || fbfText === '--') {
      showToast('Debes construir primero una FBF válida para guardar la proposición molecular.', 'error');
      return;
    }

    if (!sentenceText || sentenceText.includes('Define las proposiciones')) {
      showToast('Completa los enunciados atómicos para generar la oración molecular antes de guardar.', 'error');
      return;
    }

    if (savedItemsStorage.isQuotaFull(userId, 'molecules')) {
      await handleQuotaFullCTA('molecules', e.currentTarget);
      return;
    }

    const res = savedItemsStorage.saveItem(userId, 'molecules', { sentence: sentenceText, fbf: fbfText });
    if (res.success) {
      triggerSuccessFeedback(e.currentTarget);
      showToast('Proposición molecular guardada con éxito.', 'success');
    } else if (res.reason === 'quota_full') {
      await handleQuotaFullCTA('molecules', e.currentTarget);
    }
  });

  document.getElementById('btn-open-molecular-builder-picker')?.addEventListener('click', (e) => {
    openSavedItemsPicker('molecules', e.currentTarget);
  });

  // 4. PROCESO INVERSO - FBF
  document.getElementById('btn-save-fbf-inverse')?.addEventListener('click', async (e) => {
    const userId = getActiveUserId();
    const formulaText = document.getElementById('inverse-fbf-input')?.value.trim();

    if (!formulaText) {
      showToast('Introduce primero una FBF para guardar.', 'error');
      return;
    }

    try {
      FBFParser.parse(formulaText);
    } catch (err) {
      showToast(`La fórmula introducida no es válida: ${err.message}`, 'error');
      return;
    }

    if (savedItemsStorage.isQuotaFull(userId, 'fbf')) {
      await handleQuotaFullCTA('fbf', e.currentTarget);
      return;
    }

    const res = savedItemsStorage.saveItem(userId, 'fbf', { formula: formulaText });
    if (res.success) {
      triggerSuccessFeedback(e.currentTarget);
      showToast(`FBF guardada correctamente: ${formulaText}`, 'success');
    } else if (res.reason === 'quota_full') {
      await handleQuotaFullCTA('fbf', e.currentTarget);
    }
  });

  document.getElementById('btn-open-fbf-inverse-picker')?.addEventListener('click', (e) => {
    openSavedItemsPicker('fbf', e.currentTarget);
  });

  // 5. PROCESO INVERSO - Atómicas
  document.getElementById('btn-save-atomic-inverse')?.addEventListener('click', async (e) => {
    const userId = getActiveUserId();
    if (savedItemsStorage.isQuotaFull(userId, 'atomics')) {
      await handleQuotaFullCTA('atomics', e.currentTarget);
      return;
    }

    if (!AppState.inverseVars || AppState.inverseVars.length === 0) {
      showToast('No hay variables detectadas en el proceso inverso.', 'info');
      return;
    }

    const validStatements = [];
    AppState.inverseVars.forEach(v => {
      const input = document.getElementById(`inverse-var-input-${v}`);
      const val = input ? input.value.trim() : '';
      if (val && !val.startsWith('[proposición')) {
        validStatements.push({ letter: v, text: val });
      }
    });

    if (validStatements.length === 0) {
      showToast('No hay enunciados asignados a las variables para guardar.', 'info');
      return;
    }

    // Solicita al usuario seleccionar qué letra/proposición atómica desea guardar
    savedItemsPopover.openSaveSelector({
      anchorEl: e.currentTarget,
      title: 'Seleccionar Atómica a Guardar',
      options: validStatements,
      onSelect: (chosen) => {
        if (savedItemsStorage.isQuotaFull(userId, 'atomics')) {
          handleQuotaFullCTA('atomics', e.currentTarget);
          return;
        }
        const res = savedItemsStorage.saveItem(userId, 'atomics', { text: chosen.text });
        if (res.success) {
          triggerSuccessFeedback(document.getElementById('btn-save-atomic-inverse'));
          showToast(`Proposición de la variable ${chosen.letter} guardada con éxito.`, 'success');
        } else if (res.reason === 'quota_full') {
          handleQuotaFullCTA('atomics', e.currentTarget);
        }
      }
    });
  });

  document.getElementById('btn-open-atomic-inverse-picker')?.addEventListener('click', (e) => {
    openSavedItemsPicker('atomics', e.currentTarget);
  });

  // 6. PROCESO INVERSO - Molecular Reconstruida
  document.getElementById('btn-save-molecular-inverse')?.addEventListener('click', async (e) => {
    const userId = getActiveUserId();
    const sentenceText = document.getElementById('inverse-result-sentence')?.textContent.trim();
    const fbfText = document.getElementById('inverse-fbf-input')?.value.trim();

    if (!fbfText) {
      showToast('Introduce y analiza una FBF válida antes de guardar la proposición molecular.', 'error');
      return;
    }

    if (!sentenceText || sentenceText === '--' || sentenceText.includes('[proposición')) {
      showToast('Reconstruye primero la proposición molecular en español antes de guardarla.', 'error');
      return;
    }

    if (savedItemsStorage.isQuotaFull(userId, 'molecules')) {
      await handleQuotaFullCTA('molecules', e.currentTarget);
      return;
    }

    const res = savedItemsStorage.saveItem(userId, 'molecules', { sentence: sentenceText, fbf: fbfText });
    if (res.success) {
      triggerSuccessFeedback(e.currentTarget);
      showToast('Proposición molecular guardada con éxito.', 'success');
    } else if (res.reason === 'quota_full') {
      await handleQuotaFullCTA('molecules', e.currentTarget);
    }
  });

  document.getElementById('btn-open-molecular-inverse-picker')?.addEventListener('click', (e) => {
    openSavedItemsPicker('molecules', e.currentTarget);
  });
}

// =============================================================================
// INICIALIZACIÓN GLOBAL DE LA APLICACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  initTabs();
  initNotationEvents();
  initTopbarPopovers();
  initAdminEvents();
  initSectionsModule();
  initVisualBuilder();
  initInverseProcess();
  initTruthTableAndTree();
  initPracticeAndMascot();
  initSavedItemsFeature();
});

