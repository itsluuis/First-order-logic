import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock DOM & Storage for Node
class MockElement {
  constructor(id = '') {
    this.id = id;
    this.style = {};
    this.classList = {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    };
  }
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 100, height: 50 };
  }
}

globalThis.document = {
  getElementById(id) {
    return new MockElement(id);
  },
  createElement(tag) {
    return new MockElement(tag);
  },
  body: {
    appendChild() {}
  }
};

globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame(cb) { cb(); return 1; },
  cancelAnimationFrame() {}
};

globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};

const { MascotController } = await import('../js/mascot/mascotController.js');

describe('Mascot Reactive Messaging in Sections', () => {
  let controller;
  let contextState;

  beforeEach(() => {
    contextState = {
      activeTab: 'tab-sections',
      currentUser: { id: 'usr_student', role: 'estudiante', username: 'Lucas' },
      pendingTasksCount: 3
    };
    controller = new MascotController(() => contextState);
  });

  afterEach(() => {
    if (controller && controller.view) controller.view.destroy();
  });

  it('generates explanation for student with pending tasks', () => {
    const text = controller.generateContextualExplanation();
    assert.ok(text.includes('Tus Tareas Académicas'));
    assert.ok(text.includes('3'));
    assert.ok(text.includes('pendiente'));
  });

  it('generates congratulations for student with zero pending tasks', () => {
    contextState.pendingTasksCount = 0;
    const text = controller.generateContextualExplanation();
    assert.ok(text.includes('¡Estás al día!'));
    assert.ok(text.includes('No tienes tareas pendientes'));
  });

  it('generates pedagogical explanation for professor in sections tab', () => {
    contextState.currentUser = { id: 'prof_1', role: 'profesor', username: 'Profesor Carlos' };
    const text = controller.generateContextualExplanation();
    assert.ok(text.includes('Gestión de Secciones Académicas'));
    assert.ok(text.includes('Como profesor'));
    assert.ok(text.includes('matricular estudiantes'));
  });

  it('provides celebrateTaskCompletion with positive reinforcement phrases', () => {
    assert.equal(typeof controller.celebrateTaskCompletion, 'function');
    controller.celebrateTaskCompletion();
    // Validates expression changed to happy or wink
    assert.ok(['happy', 'wink'].includes(controller.view.currentExpression));
  });

  it('provides sayQuickRemark convenience method on MascotController', () => {
    assert.equal(typeof controller.sayQuickRemark, 'function');
  });

  it('verifies zero emojis in mascot files and explanation outputs', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const studentText = controller.generateContextualExplanation();
    assert.equal(emojiRegex.test(studentText), false);

    contextState.currentUser = { id: 'prof_1', role: 'profesor' };
    const profText = controller.generateContextualExplanation();
    assert.equal(emojiRegex.test(profText), false);

    const mascotControllerFile = fs.readFileSync(path.resolve('js/mascot/mascotController.js'), 'utf8');
    assert.equal(emojiRegex.test(mascotControllerFile), false);
  });
});
