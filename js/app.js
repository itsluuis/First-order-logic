/**
 * app.js - Controlador Principal de la Aplicación de Lógica Simbólica
 * Gestiona los 3 perfiles (Admin, Profesor, Estudiante), navegación segura,
 * constructor visual, proceso inverso, generadores aleatorios integrados,
 * tablas de verdad y árbol sintáctico.
 */

import { dbService, PROFILES } from './storage.js';
import { FBFParser, NOTATION_MODES, NOTATION_SYMBOLS, OPERATORS } from './logic/ast.js';
import { TruthTableEngine } from './logic/truthTable.js';
import { NaturalLanguageTranslator } from './logic/naturalLanguage.js';
import { RandomGenerators } from './logic/generators.js';

// Estado global de la aplicación
const AppState = {
  currentUser: null,
  selectedProfileId: 'estudiante',
  currentNotation: NOTATION_MODES.STANDARD,
  theme: 'dark',

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
  }, 4000);
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
// GESTIÓN DE AUTENTICACIÓN SIMPLIFICADA (ADMIN, PROFESOR, ESTUDIANTE)
// =============================================================================
function initAuth() {
  const authModal = document.getElementById('auth-modal');
  const session = dbService.getCurrentSession();

  if (session) {
    loginSuccess(session);
  } else {
    openAuthModal();
  }

  // Selección de tarjetas de perfil
  const profileCards = document.querySelectorAll('.profile-card');
  profileCards.forEach(card => {
    card.addEventListener('click', () => {
      profileCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      AppState.selectedProfileId = card.getAttribute('data-profile-id');
      updateProfileFormUI();
    });
  });

  // Formulario de login
  document.getElementById('form-login')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const profileId = AppState.selectedProfileId;
    const passwordInput = document.getElementById('login-password');
    const password = passwordInput ? passwordInput.value : '';

    const res = dbService.login(profileId, password);
    if (res.success) {
      showToast(`¡Bienvenido, ${res.session.username}!`, 'success');
      loginSuccess(res.session);
      authModal.classList.remove('active');
      if (passwordInput) passwordInput.value = '';
    } else {
      showToast(res.message, 'error');
    }
  });

  // Botón de Cerrar Sesión (con corrección para resetear a Constructor Visual)
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    dbService.logout();
    AppState.currentUser = null;

    // SOLUCIÓN AL BUG REPORTADO: Al cerrar sesión, automáticamente cambiar al constructor visual
    switchTab('tab-builder');

    // Ocultar pestaña de administración de inmediato
    document.getElementById('tab-nav-admin')?.classList.add('hidden');

    showToast('Has cerrado sesión correctamente.', 'info');
    openAuthModal();
  });
}

function openAuthModal() {
  const authModal = document.getElementById('auth-modal');
  authModal?.classList.add('active');
  updateProfileFormUI();
}

function updateProfileFormUI() {
  const profileId = AppState.selectedProfileId;
  const passGroup = document.getElementById('admin-password-group');
  const passInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('btn-submit-login');

  const profile = Object.values(PROFILES).find(p => p.id === profileId);
  const profileName = profile ? profile.name : 'Usuario';

  if (profileId === 'admin') {
    passGroup?.classList.remove('hidden');
    if (passInput) {
      passInput.required = true;
      passInput.focus();
    }
    if (submitBtn) submitBtn.textContent = `Ingresar al Sistema como ${profileName}`;
  } else {
    passGroup?.classList.add('hidden');
    if (passInput) {
      passInput.required = false;
      passInput.value = '';
    }
    if (submitBtn) submitBtn.textContent = `Ingresar al Sistema como ${profileName}`;
  }
}

function loginSuccess(session) {
  AppState.currentUser = session;
  document.getElementById('auth-modal')?.classList.remove('active');

  // Actualizar Header
  document.getElementById('current-username').textContent = session.username;
  const roleBadge = document.getElementById('current-user-role');
  const avatar = document.getElementById('current-user-avatar');

  avatar.textContent = session.icon || '👤';

  if (session.role === 'admin') {
    roleBadge.textContent = 'ADMINISTRADOR';
    roleBadge.className = 'badge badge-admin';
    document.getElementById('tab-nav-admin')?.classList.remove('hidden');
    updateAdminSettingsUI();
  } else {
    // Si no es admin, garantizar que NO quede en la pestaña de administración
    document.getElementById('tab-nav-admin')?.classList.add('hidden');
    const currentActiveTab = document.querySelector('.nav-tab.active');
    if (currentActiveTab && currentActiveTab.getAttribute('data-tab') === 'tab-admin') {
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
      <button class="btn-clear-inline btn-clear-atomic-field" data-var="${item.name}" title="Limpiar enunciado de ${item.name}">✕</button>
      ${index > 1 ? `<button class="btn-clear-inline btn-remove-atomic" data-index="${index}" title="Eliminar variable" style="color: var(--accent-rose);">🗑️</button>` : ''}
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

  // Listeners para botón '✕' de limpiar campo individual
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
        Haz clic en los botones inferiores o en "🎲 Molecular Aleatoria" para ensamblar la proposición molecular...
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
      <button class="btn-clear-inline btn-clear-inverse-single" data-var="${v}" title="Limpiar enunciado de ${v}">✕</button>
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
  initTruthTableAndTree();
});
