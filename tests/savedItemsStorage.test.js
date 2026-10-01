import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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

const { SavedItemsService, SAVED_LIMITS } = await import('../js/savedItemsStorage.js');

describe('SavedItemsService - Persistencia y Cuotas', () => {
  let service;
  const user1 = 'est_user1';
  const user2 = 'prof_user2';

  beforeEach(() => {
    localStorage.clear();
    service = new SavedItemsService();
  });

  it('defines the correct category quotas', () => {
    assert.equal(SAVED_LIMITS.atomics, 15);
    assert.equal(SAVED_LIMITS.fbf, 20);
    assert.equal(SAVED_LIMITS.molecules, 15);
  });

  it('initializes empty collections for a user', () => {
    const atomics = service.getItems(user1, 'atomics');
    const fbf = service.getItems(user1, 'fbf');
    const molecules = service.getItems(user1, 'molecules');

    assert.deepEqual(atomics, []);
    assert.deepEqual(fbf, []);
    assert.deepEqual(molecules, []);
    assert.equal(service.isQuotaFull(user1, 'atomics'), false);
  });

  it('saves an atomic proposition and prevents empty entries', () => {
    const emptyRes = service.saveItem(user1, 'atomics', { text: '   ' });
    assert.equal(emptyRes.success, false);
    assert.equal(emptyRes.reason, 'empty');

    const res = service.saveItem(user1, 'atomics', { text: 'llueve por la tarde' });
    assert.equal(res.success, true);
    assert.equal(res.item.text, 'llueve por la tarde');
    assert.ok(res.item.id);

    const items = service.getItems(user1, 'atomics');
    assert.equal(items.length, 1);
    assert.equal(items[0].text, 'llueve por la tarde');
  });

  it('enforces atomic proposition quota of 15', () => {
    for (let i = 1; i <= 15; i++) {
      const res = service.saveItem(user1, 'atomics', { text: `Proposición atómica ${i}` });
      assert.equal(res.success, true);
    }

    assert.equal(service.isQuotaFull(user1, 'atomics'), true);
    const quotaInfo = service.getQuotaInfo(user1, 'atomics');
    assert.equal(quotaInfo.current, 15);
    assert.equal(quotaInfo.max, 15);

    // 16th item should fail with quota_full
    const overflowRes = service.saveItem(user1, 'atomics', { text: 'Proposición 16' });
    assert.equal(overflowRes.success, false);
    assert.equal(overflowRes.reason, 'quota_full');
    assert.equal(overflowRes.max, 15);
  });

  it('enforces FBF quota of 20 and prevents empty formula', () => {
    const emptyRes = service.saveItem(user1, 'fbf', { formula: '' });
    assert.equal(emptyRes.success, false);
    assert.equal(emptyRes.reason, 'empty');

    for (let i = 1; i <= 20; i++) {
      const res = service.saveItem(user1, 'fbf', { formula: `(p${i} ∧ q)` });
      assert.equal(res.success, true);
    }

    assert.equal(service.isQuotaFull(user1, 'fbf'), true);
    const overflowRes = service.saveItem(user1, 'fbf', { formula: '(r → s)' });
    assert.equal(overflowRes.success, false);
    assert.equal(overflowRes.reason, 'quota_full');
    assert.equal(overflowRes.max, 20);
  });

  it('enforces molecular proposition rule: cannot save without an FBF and respects quota of 15', () => {
    // Missing FBF
    const invalidRes = service.saveItem(user1, 'molecules', { sentence: 'Si llueve me mojo', fbf: '' });
    assert.equal(invalidRes.success, false);
    assert.equal(invalidRes.reason, 'missing_fbf');

    // Missing sentence
    const invalidRes2 = service.saveItem(user1, 'molecules', { sentence: '', fbf: 'p → q' });
    assert.equal(invalidRes2.success, false);
    assert.equal(invalidRes2.reason, 'empty');

    // Valid save
    const validRes = service.saveItem(user1, 'molecules', { sentence: 'Si llueve entonces me mojo', fbf: 'p → q' });
    assert.equal(validRes.success, true);
    assert.equal(validRes.item.sentence, 'Si llueve entonces me mojo');
    assert.equal(validRes.item.fbf, 'p → q');

    // Fill up to 15
    for (let i = 2; i <= 15; i++) {
      const res = service.saveItem(user1, 'molecules', { sentence: `Oración ${i}`, fbf: `p${i} ∧ q` });
      assert.equal(res.success, true);
    }

    assert.equal(service.isQuotaFull(user1, 'molecules'), true);
    const overflowRes = service.saveItem(user1, 'molecules', { sentence: 'Oración 16', fbf: 'r ∨ s' });
    assert.equal(overflowRes.success, false);
    assert.equal(overflowRes.reason, 'quota_full');
    assert.equal(overflowRes.max, 15);
  });

  it('deletes an item by ID and frees up quota space', () => {
    const res1 = service.saveItem(user1, 'atomics', { text: 'Texto 1' });
    const res2 = service.saveItem(user1, 'atomics', { text: 'Texto 2' });

    assert.equal(service.getItems(user1, 'atomics').length, 2);

    const delRes = service.deleteItem(user1, 'atomics', res1.item.id);
    assert.equal(delRes.success, true);

    const remaining = service.getItems(user1, 'atomics');
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, res2.item.id);
  });

  it('isolates saved items strictly between users', () => {
    service.saveItem(user1, 'atomics', { text: 'Item de User 1' });
    service.saveItem(user2, 'atomics', { text: 'Item de User 2' });

    const user1Items = service.getItems(user1, 'atomics');
    const user2Items = service.getItems(user2, 'atomics');

    assert.equal(user1Items.length, 1);
    assert.equal(user1Items[0].text, 'Item de User 1');

    assert.equal(user2Items.length, 1);
    assert.equal(user2Items[0].text, 'Item de User 2');
  });
});
