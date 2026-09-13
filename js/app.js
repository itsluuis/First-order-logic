/**
 * app.js - Controlador Principal de la Aplicación de Lógica Simbólica
 * Orquesta la interfaz, navegación, estados de sesión, constructor visual,
 * proceso inverso, generadores aleatorios, tablas de verdad y árbol sintáctico.
 */

import { dbService } from './storage.js';
import { FBFParser, NOTATION_MODES, NOTATION_SYMBOLS, OPERATORS } from './logic/ast.js';
import { TruthTableEngine } from './logic/truthTable.js';
import { NaturalLanguageTranslator } from './logic/naturalLanguage.js';
import { RandomGenerators } from './logic/generators.js';

// Estado global de la aplicación
const AppState = {
  currentUser: null,
  currentNotation: NOTATION_MODES.STANDARD,
  theme: 'dark',

  // Estado del Constructor Visual
  builderAtomics: [
    { name: 'p', text: 'estudio para el examen' },
    { name: 'q', text: 'apruebo la materia de lógica' },
    { name: 'r', text: 'obtengo la beca universitaria' }
  ],
  builderTokens: [], // Array de objetos { type: 'var'|'op'|'paren', value: 'p'|'AND'|'(' }

  // Estado del Proceso Inverso
  inverseAst: null,
  inverseVars: [],
  inverseVarMap: {}
};

// =============================================================================
// UTILIDADES: NOTIFICACIONES TOAST
// =============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4200);
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
}

function initNotationEvents() {
  const notationSelect = document.getElementById('notation-select');
  notationSelect?.addEventListener('change', (e) => {
    AppState.currentNotation = e.target.value;
    updateNotationUI();
  });
}

// =============================================================================
// GESTIÓN DE AUTENTICACIÓN Y SESIONES
// =============================================================================
function initAuth() {
  const authModal = document.getElementById('auth-modal');
  const session = dbService.getCurrentSession();

  if (session) {
    loginSuccess(session);
  } else {
    openAuthModal('login');
  }

  // Pestañas del modal de autenticación
  const authTabBtns = document.querySelectorAll('[data-auth-mode]');
  authTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      authTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-auth-mode');
      showAuthSubform(mode);
    });
  });

  // Formulario Login
  document.getElementById('form-login')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const userVal = document.getElementById('login-username').value;
    const passVal = document.getElementById('login-password').value;

    const res = dbService.login(userVal, passVal);
    if (res.success) {
      showToast(`¡Bienvenido de nuevo, ${res.session.username}!`, 'success');
      loginSuccess(res.session);
      authModal.classList.remove('active');
    } else {
      showToast(res.message, 'error');
    }
  });

  // Formulario Registro (Crear Perfil con validación de capacidad)
  document.getElementById('form-register')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const userVal = document.getElementById('register-username').value;
    const passVal = document.getElementById('register-password').value;
    const confirmVal = document.getElementById('register-confirm-password').value;

    if (passVal !== confirmVal) {
      showToast('Las contraseñas no coinciden. Verifíquelas.', 'error');
      return;
    }

    const res = dbService.registerUser(userVal, passVal);
    if (res.success) {
      showToast('Perfil creado con éxito. Ahora puedes iniciar sesión.', 'success');
      // Limpiar campos y pasar a login
      document.getElementById('form-register').reset();
      openAuthModal('login');
    } else {
      showToast(res.message, 'error');
      if (res.isCapacityError) {
        document.getElementById('register-capacity-warning')?.classList.remove('hidden');
      }
    }
  });

  // Formulario Eliminar Perfil
  document.getElementById('form-delete-profile')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetUser = document.getElementById('delete-user-select').value;
    const passVal = document.getElementById('delete-user-password').value;

    if (!targetUser) {
      showToast('Por favor selecciona un perfil para eliminar.', 'error');
      return;
    }

    const res = dbService.deleteUser(targetUser, passVal);
    if (res.success) {
      showToast(res.message, 'success');
      document.getElementById('form-delete-profile').reset();
      updateDeleteUserSelect();
      updateAdminDashboard();
      openAuthModal('login');
    } else {
      showToast(res.message, 'error');
    }
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    dbService.logout();
    AppState.currentUser = null;
    showToast('Has cerrado la sesión correctamente.', 'info');
    openAuthModal('login');
  });
}

function openAuthModal(mode = 'login') {
  const authModal = document.getElementById('auth-modal');
  authModal?.classList.add('active');

  const authTabBtns = document.querySelectorAll('[data-auth-mode]');
  authTabBtns.forEach(b => {
    if (b.getAttribute('data-auth-mode') === mode) b.classList.add('active');
    else b.classList.remove('active');
  });

  showAuthSubform(mode);
  updateAuthCapacityNotice();
  updateDeleteUserSelect();
}

function showAuthSubform(mode) {
  document.getElementById('form-login')?.classList.add('hidden');
  document.getElementById('form-register')?.classList.add('hidden');
  document.getElementById('form-delete-profile')?.classList.add('hidden');

  if (mode === 'login') {
    document.getElementById('form-login')?.classList.remove('hidden');
  } else if (mode === 'register') {
    document.getElementById('form-register')?.classList.remove('hidden');
    updateAuthCapacityNotice();
  } else if (mode === 'delete') {
    document.getElementById('form-delete-profile')?.classList.remove('hidden');
    updateDeleteUserSelect();
  }
}

function updateAuthCapacityNotice() {
  const current = dbService.getUserCount();
  const settings = dbService.getSettings();
  const max = settings.maxUsers;
  const isFull = dbService.isCapacityReached();

  const statusEl = document.getElementById('register-capacity-status');
  const warningEl = document.getElementById('register-capacity-warning');
  const submitBtn = document.getElementById('btn-submit-register');

  if (statusEl) {
    statusEl.textContent = `Aforo actual del sistema: ${current} de ${max} perfiles registrados.`;
  }

  if (isFull) {
    warningEl?.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;
  } else {
    warningEl?.classList.add('hidden');
    if (submitBtn) submitBtn.disabled = false;
  }
}

function updateDeleteUserSelect() {
  const select = document.getElementById('delete-user-select');
  if (!select) return;

  const users = dbService.getUsers();
  // Filtrar admin: el admin jamás se muestra en la lista de eliminables
  const deletableUsers = users.filter(u => u.username.toLowerCase() !== 'admin');

  select.innerHTML = '';

  if (deletableUsers.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No hay usuarios regulares registrados para eliminar';
    select.appendChild(opt);
    select.disabled = true;
  } else {
    select.disabled = false;
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Seleccione el usuario a eliminar --';
    select.appendChild(defaultOpt);

    deletableUsers.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.username;
      opt.textContent = `${u.username} (creado el ${new Date(u.createdAt).toLocaleDateString()})`;
      select.appendChild(opt);
    });
  }
}

function loginSuccess(session) {
  AppState.currentUser = session;
  document.getElementById('auth-modal')?.classList.remove('active');

  // Actualizar Header
  document.getElementById('current-username').textContent = session.username;
  const roleBadge = document.getElementById('current-user-role');
  const avatar = document.getElementById('current-user-avatar');

  if (session.role === 'admin') {
    roleBadge.textContent = 'ADMIN';
    roleBadge.className = 'badge badge-admin';
    avatar.textContent = '🛡️';

    // Mostrar opciones de admin
    document.getElementById('tab-nav-admin')?.classList.remove('hidden');
    document.getElementById('admin-summary-banner')?.classList.remove('hidden');
    updateAdminDashboard();
  } else {
    roleBadge.textContent = 'ESTUDIANTE';
    roleBadge.className = 'badge badge-user';
    avatar.textContent = '🎓';

    // Ocultar opciones de admin
    document.getElementById('tab-nav-admin')?.classList.add('hidden');
    document.getElementById('admin-summary-banner')?.classList.add('hidden');
  }

  updateNotationUI();
}

// =============================================================================
// PANEL DE ADMINISTRACIÓN
// =============================================================================
function updateAdminDashboard() {
  const current = dbService.getUserCount();
  const settings = dbService.getSettings();
  const max = settings.maxUsers;

  // Banner superior
  document.getElementById('admin-count-current').textContent = current;
  document.getElementById('admin-count-max').textContent = max;
  const pct = Math.min(100, Math.round((current / max) * 100));
  const bar = document.getElementById('admin-capacity-bar');
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.style.background = pct >= 100 ? 'var(--accent-rose)' : 'var(--gradient-primary)';
  }

  // Inputs del panel de administración
  const capInput = document.getElementById('admin-input-capacity');
  if (capInput) capInput.value = max;

  const notSelect = document.getElementById('admin-notation-lock-select');
  if (notSelect) notSelect.value = settings.forcedNotation || 'none';

  // Tabla de usuarios
  const tbody = document.getElementById('admin-users-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    const users = dbService.getUsers();
    users.forEach(u => {
      const tr = document.createElement('tr');
      const isAdmin = u.username.toLowerCase() === 'admin';
      tr.innerHTML = `
        <td><strong>${u.username}</strong></td>
        <td>
          <span class="badge ${isAdmin ? 'badge-admin' : 'badge-user'}">
            ${isAdmin ? 'Administrador' : 'Estudiante'}
          </span>
        </td>
        <td>${new Date(u.createdAt).toLocaleString()}</td>
        <td>
          ${isAdmin
            ? '<span class="text-emerald">🔒 Protegido contra eliminación</span>'
            : '<span class="text-muted">Activo (Eliminable desde Login con contraseña)</span>'
          }
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function initAdminEvents() {
  // Ir rápido a la pestaña de administración desde el banner
  document.getElementById('btn-quick-admin-tab')?.addEventListener('click', () => {
    switchTab('tab-admin');
  });

  // Guardar nueva capacidad
  document.getElementById('btn-admin-save-capacity')?.addEventListener('click', () => {
    const limit = document.getElementById('admin-input-capacity').value;
    const res = dbService.setMaxUsers(limit);
    if (res.success) {
      showToast(res.message, 'success');
      updateAdminDashboard();
    } else {
      showToast(res.message, 'error');
    }
  });

  // Guardar regla de notación
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
}

// =============================================================================
// SISTEMA DE NAVEGACIÓN ENTRE PESTAÑAS
// =============================================================================
function switchTab(tabId) {
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
}

function initTabs() {
  const tabs = document.querySelectorAll('#main-nav-tabs .nav-tab');
  tabs.forEach(t => {
    t.addEventListener('click', () => {
      const tabId = t.getAttribute('data-tab');
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
      <input type="text" class="form-input atomic-text-input" data-var="${item.name}" value="${item.text}" placeholder="Enunciado de ${item.name}..." style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">
      ${index > 1 ? `<button class="btn btn-icon btn-remove-atomic" data-index="${index}" title="Eliminar variable" style="width: 32px; height: 32px; font-size: 0.9rem;">✕</button>` : ''}
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

  // Listeners para cambio de texto de enunciados
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

  // Listeners para remover atómica
  container.querySelectorAll('.btn-remove-atomic').forEach(btn => {
    btn.addEventListener('click', (e) => {
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

function updateBuilderDisplay() {
  const canvas = document.getElementById('builder-canvas');
  const fbfOutput = document.getElementById('builder-fbf-output');
  const sentenceOutput = document.getElementById('builder-sentence-output');
  const symbols = NOTATION_SYMBOLS[AppState.currentNotation];

  if (!canvas) return;

  if (AppState.builderTokens.length === 0) {
    canvas.innerHTML = `
      <span id="canvas-placeholder" class="text-muted" style="font-size: 0.9rem;">
        Haz clic en las variables y conectivos inferiores para comenzar a ensamblar la proposición molecular...
      </span>
    `;
    fbfOutput.textContent = '--';
    sentenceOutput.textContent = 'Define las proposiciones y conecta los elementos para visualizar la oración completa.';
    return;
  }

  // Render tokens en lienzo
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

  // Ensamblar cadena para el parser
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
    // Mapear variables atómicas
    const varMap = {};
    AppState.builderAtomics.forEach(a => {
      varMap[a.name] = a.text;
    });

    const naturalSpanish = NaturalLanguageTranslator.toSpanish(ast, varMap);
    sentenceOutput.textContent = NaturalLanguageTranslator.formatCompleteSentence(naturalSpanish);
    sentenceOutput.classList.remove('text-muted');
    sentenceOutput.style.color = 'var(--text-primary)';
  } catch (err) {
    // Si aún está a medio armar (ej. terminó en un operador), mostrar guía en proceso
    sentenceOutput.textContent = `Construyendo proposición molecular... (${err.message})`;
    sentenceOutput.classList.add('text-muted');
  }
}

function initVisualBuilder() {
  renderAtomicDefinitions();

  // Botón para añadir nueva variable atómica
  document.getElementById('btn-add-atomic')?.addEventListener('click', () => {
    const letters = ['p', 'q', 'r', 's', 't', 'u', 'w', 'x', 'y', 'z'];
    const used = AppState.builderAtomics.map(a => a.name);
    const nextLetter = letters.find(l => !used.includes(l));

    if (!nextLetter) {
      showToast('Has alcanzado el número máximo de variables atómicas simultáneas.', 'error');
      return;
    }

    AppState.builderAtomics.push({
      name: nextLetter,
      text: `nueva proposición para ${nextLetter}`
    });

    renderAtomicDefinitions();
    showToast(`Variable [${nextLetter}] añadida exitosamente.`, 'info');
  });

  // Deshacer último token
  document.getElementById('btn-undo-token')?.addEventListener('click', () => {
    if (AppState.builderTokens.length > 0) {
      AppState.builderTokens.pop();
      updateBuilderDisplay();
    }
  });

  // Limpiar lienzo
  document.getElementById('btn-clear-canvas')?.addEventListener('click', () => {
    AppState.builderTokens = [];
    updateBuilderDisplay();
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
}

// =============================================================================
// PROCESO INVERSO: DE FBF A PROPOSICIONES MOLECULARES (DETERMINISTA)
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

  // Reconstruir proposición molecular
  document.getElementById('btn-generate-inverse-sentence')?.addEventListener('click', () => {
    if (!AppState.inverseAst) return;

    // Recolectar valores ingresados por el usuario para cada variable
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
      showToast('Reconstrucción generada. Para mayor precisión determinista, completa todos los enunciados.', 'info');
    } else {
      showToast('¡Proposición molecular en español reconstruida con éxito!', 'success');
    }
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
    `;
    container.appendChild(div);
  });
}

// =============================================================================
// GENERADORES ALEATORIOS
// =============================================================================
function initGenerators() {
  // Botón 1: Proposición molecular aleatoria en lenguaje natural
  document.getElementById('btn-random-molecular-sentence')?.addEventListener('click', () => {
    const sentence = RandomGenerators.generateMolecularProposition();
    const box = document.getElementById('random-sentence-display-box');
    const output = document.getElementById('random-sentence-output');

    if (box && output) {
      output.textContent = sentence;
      box.classList.remove('hidden');
      showToast('Proposición molecular aleatoria generada.', 'success');
    }
  });

  // Botón 2: Fórmula Bien Formada (FBF) aleatoria
  document.getElementById('btn-random-fbf')?.addEventListener('click', () => {
    const complexity = document.getElementById('random-fbf-complexity')?.value || 'random';
    const result = RandomGenerators.generateFBF(complexity, AppState.currentNotation);

    const box = document.getElementById('random-fbf-display-box');
    const output = document.getElementById('random-fbf-output');

    if (box && output) {
      output.textContent = result.fbfString;
      box.classList.remove('hidden');
      showToast('FBF aleatoria con paréntesis balanceados generada.', 'success');
    }
  });

  // Cargar FBF aleatoria en Proceso Inverso
  document.getElementById('btn-load-random-fbf-inverse')?.addEventListener('click', () => {
    const fbf = document.getElementById('random-fbf-output').textContent.trim();
    if (!fbf || fbf === '--') return;
    const invInput = document.getElementById('inverse-fbf-input');
    if (invInput) invInput.value = fbf;
    switchTab('tab-inverse');
    document.getElementById('btn-parse-inverse')?.click();
  });

  // Cargar FBF aleatoria en Tabla de Verdad
  document.getElementById('btn-load-random-fbf-truth')?.addEventListener('click', () => {
    const fbf = document.getElementById('random-fbf-output').textContent.trim();
    if (!fbf || fbf === '--') return;
    const truthInput = document.getElementById('truth-fbf-input');
    if (truthInput) truthInput.value = fbf;
    switchTab('tab-truthtable');
    document.getElementById('btn-generate-truth-table')?.click();
  });
}

// =============================================================================
// TABLA DE VERDAD Y ÁRBOL SINTÁCTICO
// =============================================================================
function initTruthTableAndTree() {
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
      showToast(`Evaluación completada exitosamente: ${tableData.classification}`, 'success');
    } catch (err) {
      showToast(`Error al evaluar fórmula: ${err.message}`, 'error');
      document.getElementById('truth-results-container')?.classList.add('hidden');
    }
  });
}

function renderTruthTable(data) {
  const table = document.getElementById('rendered-truth-table');
  const banner = document.getElementById('truth-classification-banner');
  const title = document.getElementById('truth-class-title');
  const desc = document.getElementById('truth-class-desc');

  if (!table) return;

  // Actualizar banner de diagnóstico
  banner.className = `truth-classification-banner banner-${data.classification.toLowerCase()}`;
  title.textContent = `DIAGNÓSTICO FORMAL: ${data.classification}`;
  desc.textContent = data.description;

  // Construir encabezado
  let theadHTML = '<thead><tr><th>#</th>';
  data.variables.forEach(v => {
    theadHTML += `<th>${v}</th>`;
  });
  data.intermediateColumns.forEach(c => {
    theadHTML += `<th>${c}</th>`;
  });
  theadHTML += `<th class="col-main">${data.fullExprStr} (Resultado)</th></tr></thead>`;

  // Construir cuerpo de filas
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
    tbodyHTML += `<td class="${finalCls}" style="font-weight: 800; font-size: 1.1rem; background: rgba(56, 189, 248, 0.08);">${r.finalResult}</td></tr>`;
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
// INICIALIZACIÓN GLOBAL DE LA APLICACIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  initTabs();
  initNotationEvents();
  initAdminEvents();
  initVisualBuilder();
  initInverseProcess();
  initGenerators();
  initTruthTableAndTree();
});
