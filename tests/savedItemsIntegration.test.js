import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock localStorage for Node environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new LocalStorageMock();

const { savedItemsStorage } = await import('../js/savedItemsStorage.js');

describe('Saved Items Integration & Quality Policy', () => {
  const userId = 'est_integration_user';

  beforeEach(() => {
    localStorage.clear();
  });

  it('Verifies index.html contains all 12 save and add picker buttons in their respective sections', () => {
    const htmlPath = path.resolve('index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    const expectedButtonIds = [
      'btn-save-atomic-builder',
      'btn-open-atomic-builder-picker',
      'btn-save-fbf-builder',
      'btn-open-fbf-builder-picker',
      'btn-save-molecular-builder',
      'btn-open-molecular-builder-picker',
      'btn-save-fbf-inverse',
      'btn-open-fbf-inverse-picker',
      'btn-save-atomic-inverse',
      'btn-open-atomic-inverse-picker',
      'btn-save-molecular-inverse',
      'btn-open-molecular-inverse-picker'
    ];

    expectedButtonIds.forEach(btnId => {
      assert.match(
        html,
        new RegExp(`id="${btnId}"`),
        `index.html must contain button with id="${btnId}"`
      );
    });
  });

  it('Verifies all new JS and CSS files comply with zero emojis policy', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;
    const targetFiles = [
      'js/savedItemsStorage.js',
      'js/savedItemsPopover.js',
      'js/feedbackEffects.js',
      'js/app.js',
      'css/style.css',
      'index.html'
    ];

    for (const relPath of targetFiles) {
      const fullPath = path.resolve(relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const matches = content.match(emojiRegex);
      assert.equal(
        matches,
        null,
        `${relPath} must have zero emojis, found: ${matches ? matches.join(', ') : 'none'}`
      );
    }
  });

  it('Ensures cross-tab persistence: items saved in one section are accessible for another', () => {
    // 1. Guardar FBF como si estuviera en Constructor Visual
    const fbfSave = savedItemsStorage.saveItem(userId, 'fbf', { formula: '(p ∧ q) → r' });
    assert.equal(fbfSave.success, true);

    // 2. Comprobar que Proceso Inverso puede leer la misma FBF
    const fbfItems = savedItemsStorage.getItems(userId, 'fbf');
    assert.equal(fbfItems.length, 1);
    assert.equal(fbfItems[0].formula, '(p ∧ q) → r');

    // 3. Guardar Atómica en Proceso Inverso
    const atomicSave = savedItemsStorage.saveItem(userId, 'atomics', { text: 'salgo a caminar' });
    assert.equal(atomicSave.success, true);

    // 4. Comprobar que Constructor Visual puede leerla
    const atomics = savedItemsStorage.getItems(userId, 'atomics');
    assert.equal(atomics.length, 1);
    assert.equal(atomics[0].text, 'salgo a caminar');

    // 5. Guardar Molecular
    const molSave = savedItemsStorage.saveItem(userId, 'molecules', {
      sentence: 'Si salgo a caminar entonces respiro aire fresco',
      fbf: 'p → q'
    });
    assert.equal(molSave.success, true);

    const molecules = savedItemsStorage.getItems(userId, 'molecules');
    assert.equal(molecules.length, 1);
    assert.equal(molecules[0].fbf, 'p → q');
  });

  it('Verifies quota management prevents overflow and enables clean deletion', () => {
    // Llenar FBF al tope (20)
    for (let i = 1; i <= 20; i++) {
      savedItemsStorage.saveItem(userId, 'fbf', { formula: `p${i} ∧ q` });
    }

    assert.equal(savedItemsStorage.isQuotaFull(userId, 'fbf'), true);
    const overflow = savedItemsStorage.saveItem(userId, 'fbf', { formula: 'r ∨ s' });
    assert.equal(overflow.success, false);
    assert.equal(overflow.reason, 'quota_full');

    // Eliminar una FBF y verificar que permite volver a guardar
    const all = savedItemsStorage.getItems(userId, 'fbf');
    const delRes = savedItemsStorage.deleteItem(userId, 'fbf', all[0].id);
    assert.equal(delRes.success, true);
    assert.equal(savedItemsStorage.isQuotaFull(userId, 'fbf'), false);

    const reAdd = savedItemsStorage.saveItem(userId, 'fbf', { formula: 'r ∨ s' });
    assert.equal(reAdd.success, true);
  });

  it('Verifies flash feedback duration is 1 second and only buttons flash on save or add', () => {
    const cssPath = path.resolve('css/style.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    assert.match(
      css,
      /\.action-success-fadeout\s*\{[^}]*transition:[^}]*1s/s,
      'css/style.css .action-success-fadeout must have 1s transition duration'
    );
    assert.doesNotMatch(
      css,
      /\.action-success-fadeout\s*\{[^}]*0\.8s/s,
      'css/style.css .action-success-fadeout must not use 0.8s transition'
    );

    const appJsPath = path.resolve('js/app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf-8');

    // Ensure no inputs, canvas, outputs are targeted by triggerSuccessFeedback in app.js
    assert.doesNotMatch(
      appJs,
      /triggerSuccessFeedback\s*\(\s*(input|inp|outputEl|sentenceEl|inverseInp|atomicInp|document\.getElementById\(['"]builder-canvas['"]\))\s*\)/,
      'js/app.js must not trigger flash feedback on inputs, outputs, or canvas elements'
    );

    const popoverJsPath = path.resolve('js/savedItemsPopover.js');
    const popoverJs = fs.readFileSync(popoverJsPath, 'utf-8');

    // Ensure rows are not targeted in savedItemsPopover.js
    assert.doesNotMatch(
      popoverJs,
      /triggerSuccessFeedback\s*\(\s*row\s*\)/,
      'js/savedItemsPopover.js must not trigger flash feedback on entire rows'
    );
  });
});

