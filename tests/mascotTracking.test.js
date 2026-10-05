import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock DOM & Window environment for Node
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
    return { left: 100, top: 100, width: 140, height: 70 };
  }
}

const mockVisor = new MockElement('mascot-visor');
const mockLeftEye = new MockElement('mascot-left-eye');
const mockRightEye = new MockElement('mascot-right-eye');
const mockEyesSvg = new MockElement('mascot-eyes-svg');

globalThis.document = {
  getElementById(id) {
    if (id === 'mascot-visor') return mockVisor;
    if (id === 'mascot-left-eye') return mockLeftEye;
    if (id === 'mascot-right-eye') return mockRightEye;
    if (id === 'mascot-eyes-svg') return mockEyesSvg;
    return new MockElement(id);
  },
  createElement(tag) {
    return new MockElement(tag);
  },
  body: {
    appendChild() {}
  }
};

const windowListeners = new Map();
globalThis.window = {
  addEventListener(event, handler) {
    windowListeners.set(event, handler);
  },
  removeEventListener(event, handler) {
    if (windowListeners.get(event) === handler) {
      windowListeners.delete(event);
    }
  },
  requestAnimationFrame(cb) {
    cb();
    return 1;
  },
  cancelAnimationFrame() {}
};

globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};

const { MascotView } = await import('../js/mascot/mascotView.js');
const { MascotController } = await import('../js/mascot/mascotController.js');

describe('Mascot Mouse Tracking in Games', () => {
  let view;
  let controller;

  beforeEach(() => {
    windowListeners.clear();
    mockLeftEye.style = {};
    mockRightEye.style = {};
    view = new MascotView('mascot-global-widget');
    controller = new MascotController(() => ({ activeTab: 'tab-practice' }));
  });

  afterEach(() => {
    if (view) view.destroy();
    if (controller && controller.view) controller.view.destroy();
  });

  it('provides startMouseTracking and stopMouseTracking methods on MascotView', () => {
    assert.equal(typeof view.startMouseTracking, 'function');
    assert.equal(typeof view.stopMouseTracking, 'function');
  });

  it('subscribes mousemove listener on start and removes it on stop', () => {
    view.startMouseTracking();
    assert.equal(view.isMouseTracking, true);
    assert.ok(windowListeners.has('mousemove'));

    view.stopMouseTracking();
    assert.equal(view.isMouseTracking, false);
    assert.equal(windowListeners.has('mousemove'), false);
    assert.equal(mockLeftEye.style.transform, '');
    assert.equal(mockRightEye.style.transform, '');
  });

  it('calculates eye displacement within clamp boundaries on mouse move', () => {
    view.startMouseTracking();
    const handler = windowListeners.get('mousemove');
    assert.ok(handler);

    // Mouse directly right of visor center (visor center: 100 + 70 = 170, 100 + 35 = 135)
    handler({ clientX: 500, clientY: 135 });
    assert.ok(mockLeftEye.style.transform.includes('translate'));
    assert.ok(mockRightEye.style.transform.includes('translate'));

    // Check bounded translation (horizontal max 7px)
    assert.ok(mockLeftEye.style.transform.includes('7.00px'));

    view.stopMouseTracking();
  });

  it('activates mouse tracking when starting logical games (tree, molecular, verdict)', () => {
    controller.notifyGameStart('tree', 'normal');
    assert.equal(controller.view.isMouseTracking, true);

    controller.notifyGameExit();
    assert.equal(controller.view.isMouseTracking, false);
  });

  it('does NOT activate mouse tracking in duel game, keeping battle expression', () => {
    controller.notifyGameStart('duel', 'dificil');
    assert.equal(controller.view.isMouseTracking, false);
    assert.equal(controller.view.currentExpression, 'battle');

    controller.notifyGameOver({ score: 4, accuracy: 80 });
    assert.equal(controller.view.isMouseTracking, false);
  });

  it('verifies zero emojis in mascot files', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const files = [
      'js/mascot/mascotView.js',
      'js/mascot/mascotController.js',
      'tests/mascotTracking.test.js'
    ];
    for (const f of files) {
      const content = fs.readFileSync(path.resolve(f), 'utf8');
      assert.equal(emojiRegex.test(content), false, `Emoji detected in ${f}`);
    }
  });
});
