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

const { StorageService } = await import('../js/storage.js');
const { PRACTICE_GAMES } = await import('../js/practice/practiceView.js');

describe('Game Availability Management in StorageService and UI', () => {
  let storage;

  beforeEach(() => {
    localStorage.clear();
    storage = new StorageService();
  });

  it('initializes with empty disabledGames array in settings', () => {
    const settings = storage.getSettings();
    assert.ok(Array.isArray(settings.disabledGames));
    assert.equal(settings.disabledGames.length, 0);
    assert.deepEqual(storage.getDisabledGames(), []);
  });

  it('checks if a game is disabled correctly', () => {
    assert.equal(storage.isGameDisabled('tree'), false);
    assert.equal(storage.isGameDisabled('molecular'), false);
  });

  it('toggles a game disabled status on and off', () => {
    // 1. Disable tree
    const res1 = storage.toggleGameDisabled('tree');
    assert.equal(res1.success, true);
    assert.equal(res1.disabled, true);
    assert.equal(storage.isGameDisabled('tree'), true);
    assert.deepEqual(storage.getDisabledGames(), ['tree']);

    // 2. Disable molecular
    const res2 = storage.toggleGameDisabled('molecular');
    assert.equal(res2.success, true);
    assert.equal(res2.disabled, true);
    assert.equal(storage.isGameDisabled('molecular'), true);
    assert.deepEqual(storage.getDisabledGames(), ['tree', 'molecular']);

    // 3. Re-enable tree
    const res3 = storage.toggleGameDisabled('tree');
    assert.equal(res3.success, true);
    assert.equal(res3.disabled, false);
    assert.equal(storage.isGameDisabled('tree'), false);
    assert.deepEqual(storage.getDisabledGames(), ['molecular']);
  });

  it('supports explicit forceState boolean', () => {
    storage.toggleGameDisabled('verdict', true);
    assert.equal(storage.isGameDisabled('verdict'), true);

    // Call again with true should remain disabled
    storage.toggleGameDisabled('verdict', true);
    assert.equal(storage.isGameDisabled('verdict'), true);

    // Call with false re-enables
    storage.toggleGameDisabled('verdict', false);
    assert.equal(storage.isGameDisabled('verdict'), false);
  });

  it('persists changes into localStorage settings', () => {
    storage.toggleGameDisabled('duel', true);
    const rawSettings = JSON.parse(localStorage.getItem('logica_db_settings'));
    assert.deepEqual(rawSettings.disabledGames, ['duel']);
  });

  it('verifies PRACTICE_GAMES defines all 4 minigames', () => {
    assert.equal(PRACTICE_GAMES.length, 4);
    const ids = PRACTICE_GAMES.map(g => g.id);
    assert.ok(ids.includes('tree'));
    assert.ok(ids.includes('molecular'));
    assert.ok(ids.includes('verdict'));
    assert.ok(ids.includes('duel'));
  });

  it('verifies index.html has the admin minigames container', () => {
    const htmlPath = path.resolve('index.html');
    const content = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(content.includes('id="admin-minigames-container"'));
    assert.ok(content.includes('Disponibilidad del Centro de Prácticas'));
  });

  it('verifies practiceView.js implements disabled styling and banner text', () => {
    const jsPath = path.resolve('js/practice/practiceView.js');
    const content = fs.readFileSync(jsPath, 'utf8');
    assert.ok(content.includes('minigame-card-disabled'));
    assert.ok(content.includes('game-unavailable-banner'));
    assert.ok(content.includes('El juego no está disponible en este momento.'));
  });

  it('verifies zero emojis in touched files', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    const filesToCheck = [
      'tests/gameAvailability.test.js',
      'js/storage.js',
      'js/practice/practiceView.js',
      'css/practice-mascot.css'
    ];
    for (const f of filesToCheck) {
      const content = fs.readFileSync(path.resolve(f), 'utf8');
      assert.equal(emojiRegex.test(content), false, `File ${f} contains emojis!`);
    }
  });
});
