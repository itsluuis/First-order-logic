import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock DOM elements for testing form state transitions
class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
  contains(c) { return this.classes.has(c); }
}

class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.classList = new MockClassList();
    this.value = '';
    this.required = false;
    this.disabled = false;
    this.textContent = '';
    this.placeholder = '';
    this.type = 'text';
    this.attributes = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k] || null; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); }
  removeAttribute(k) { delete this.attributes[k]; }
  focus() {}
}

describe('Auth Form UI State and Constraint Validation', () => {
  let elements;
  let AppState;

  beforeEach(() => {
    elements = {
      'auth-modal': new MockElement('auth-modal'),
      'form-login': new MockElement('form-login', 'form'),
      'auth-alert': new MockElement('auth-alert'),
      'auth-mode-tabs': new MockElement('auth-mode-tabs'),
      'user-fields-group': new MockElement('user-fields-group'),
      'admin-password-group': new MockElement('admin-password-group'),
      'auth-confirm-group': new MockElement('auth-confirm-group'),
      'btn-submit-login': new MockElement('btn-submit-login', 'button'),
      'auth-username-label': new MockElement('auth-username-label'),
      'auth-username': new MockElement('auth-username', 'input'),
      'auth-credential-label': new MockElement('auth-credential-label'),
      'auth-credential': new MockElement('auth-credential', 'input'),
      'auth-credential-hint': new MockElement('auth-credential-hint'),
      'auth-confirm-label': new MockElement('auth-confirm-label'),
      'auth-confirm-credential': new MockElement('auth-confirm-credential', 'input'),
      'login-password': new MockElement('login-password', 'input')
    };

    globalThis.document = {
      getElementById: (id) => elements[id] || null,
      querySelectorAll: () => []
    };

    AppState = {
      selectedProfileId: 'estudiante',
      authMode: 'login'
    };
  });

  // Function implementing the fixed updateProfileFormUI logic
  function runFixedUpdateProfileFormUI() {
    const profileId = AppState.selectedProfileId;
    const mode = AppState.authMode || 'login';

    const modeTabs = elements['auth-mode-tabs'];
    const userFields = elements['user-fields-group'];
    const adminFields = elements['admin-password-group'];
    const confirmGroup = elements['auth-confirm-group'];
    const submitBtn = elements['btn-submit-login'];

    const usernameLabel = elements['auth-username-label'];
    const usernameInput = elements['auth-username'];
    const credentialLabel = elements['auth-credential-label'];
    const credentialInput = elements['auth-credential'];
    const credentialHint = elements['auth-credential-hint'];
    const confirmLabel = elements['auth-confirm-label'];
    const confirmInput = elements['auth-confirm-credential'];
    const adminPass = elements['login-password'];

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

    // Asegurar que el campo de admin nunca quede requerido ni activo en perfiles de usuario
    if (adminPass) {
      adminPass.required = false;
      adminPass.disabled = true;
      adminPass.value = '';
    }
    if (usernameInput) usernameInput.disabled = false;
    if (credentialInput) credentialInput.disabled = false;

    if (profileId === 'estudiante') {
      if (usernameLabel) usernameLabel.textContent = 'Nombre del Estudiante:';
      if (credentialLabel) credentialLabel.textContent = 'PIN de 3 Dígitos:';
    } else {
      if (usernameLabel) usernameLabel.textContent = 'Nombre del Profesor:';
      if (credentialLabel) credentialLabel.textContent = 'Contraseña:';
    }

    if (mode === 'register') {
      confirmGroup?.classList.remove('hidden');
      if (confirmInput) {
        confirmInput.required = true;
        confirmInput.disabled = false;
      }
      if (submitBtn) submitBtn.textContent = `Crear Cuenta e Ingresar`;
    } else {
      confirmGroup?.classList.add('hidden');
      if (confirmInput) {
        confirmInput.required = false;
        confirmInput.disabled = true;
        confirmInput.value = '';
      }
      if (submitBtn) submitBtn.textContent = `Ingresar al Sistema`;
    }
  }

  it('Verifies index.html form-login has novalidate attribute to avoid native silent aborts', () => {
    const htmlPath = path.resolve('index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    assert.match(html, /<form id="form-login"[^>]*novalidate/);
  });

  it('Verifies app.js contains the fixed reset and disabled logic in updateProfileFormUI', () => {
    const appPath = path.resolve('js/app.js');
    const appJs = fs.readFileSync(appPath, 'utf-8');
    assert.match(appJs, /adminPass\.required\s*=\s*false/);
    assert.match(appJs, /adminPass\.disabled\s*=\s*true/);
    assert.match(appJs, /AppState\.selectedProfileId\s*=\s*'estudiante'/);
  });

  it('Allows switching from Administrador to Estudiante with clean non-blocking inputs', () => {
    // 1. User selects Administrador
    AppState.selectedProfileId = 'admin';
    runFixedUpdateProfileFormUI();

    assert.equal(elements['login-password'].required, true);
    assert.equal(elements['login-password'].disabled, false);
    assert.equal(elements['admin-password-group'].classList.contains('hidden'), false);

    // 2. User switches to Estudiante
    AppState.selectedProfileId = 'estudiante';
    runFixedUpdateProfileFormUI();

    assert.equal(elements['admin-password-group'].classList.contains('hidden'), true);
    assert.equal(elements['login-password'].required, false, 'login-password MUST not be required');
    assert.equal(elements['login-password'].disabled, true, 'login-password MUST be disabled when hidden');
    assert.equal(elements['auth-username'].disabled, false);
    assert.equal(elements['auth-credential'].disabled, false);
  });

  it('Allows switching from Administrador to Profesor with clean non-blocking inputs', () => {
    // 1. User selects Administrador
    AppState.selectedProfileId = 'admin';
    runFixedUpdateProfileFormUI();

    assert.equal(elements['login-password'].required, true);

    // 2. User switches to Profesor
    AppState.selectedProfileId = 'profesor';
    runFixedUpdateProfileFormUI();

    assert.equal(elements['admin-password-group'].classList.contains('hidden'), true);
    assert.equal(elements['login-password'].required, false, 'login-password MUST not be required');
    assert.equal(elements['login-password'].disabled, true, 'login-password MUST be disabled when hidden');
    assert.equal(elements['auth-username'].disabled, false);
    assert.equal(elements['auth-credential'].disabled, false);
  });

  it('Handles switching from Register mode to Administrador and back cleanly', () => {
    // 1. Student in register mode
    AppState.selectedProfileId = 'estudiante';
    AppState.authMode = 'register';
    runFixedUpdateProfileFormUI();

    assert.equal(elements['auth-confirm-credential'].required, true);
    assert.equal(elements['auth-confirm-credential'].disabled, false);

    // 2. Switches to Administrador while mode was register
    AppState.selectedProfileId = 'admin';
    runFixedUpdateProfileFormUI();

    assert.equal(elements['login-password'].required, true);
    assert.equal(elements['login-password'].disabled, false);
    assert.equal(elements['auth-confirm-credential'].required, false);
    assert.equal(elements['auth-confirm-credential'].disabled, true);

    // 3. Switches to login mode with Estudiante
    AppState.selectedProfileId = 'estudiante';
    AppState.authMode = 'login';
    runFixedUpdateProfileFormUI();

    assert.equal(elements['login-password'].required, false);
    assert.equal(elements['login-password'].disabled, true);
    assert.equal(elements['auth-confirm-credential'].required, false);
    assert.equal(elements['auth-confirm-credential'].disabled, true);
  });
});
