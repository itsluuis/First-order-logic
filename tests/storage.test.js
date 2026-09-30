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

// Import after mocking localStorage
const { StorageService, PROFILES } = await import('../js/storage.js');
const { SectionsStorageService } = await import('../js/sectionsStorage.js');

describe('StorageService and SectionsStorageService', () => {
  let storage;
  let sectionsStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = new StorageService();
    sectionsStorage = new SectionsStorageService();
  });

  it('allows registering and authenticating a professor', () => {
    const regRes = storage.registerUser({
      username: 'Profesor Carlos',
      role: 'profesor',
      password: 'mypassword123'
    });
    assert.equal(regRes.success, true);
    assert.ok(regRes.user.id);
    assert.equal(regRes.user.role, 'profesor');

    const loginRes = storage.loginUser('profesor', 'Profesor Carlos', 'mypassword123');
    assert.equal(loginRes.success, true);
    assert.equal(loginRes.session.username, 'Profesor Carlos');
  });

  it('allows registering and authenticating a student with 3-digit PIN', () => {
    const regRes = storage.registerUser({
      username: 'Estudiante Maria',
      role: 'estudiante',
      pin: '345'
    });
    assert.equal(regRes.success, true);
    assert.equal(regRes.user.pin, '345');

    const loginRes = storage.loginUser('estudiante', 'Estudiante Maria', '345');
    assert.equal(loginRes.success, true);
    assert.equal(loginRes.session.role, 'estudiante');
  });

  it('allows admin authentication with default password 1234', () => {
    const loginRes = storage.loginUser('admin', 'Administrador', '1234');
    assert.equal(loginRes.success, true);
    assert.equal(loginRes.session.role, 'admin');
  });

  it('deleting a professor removes the user, cascades sections, and permits new student/professor registrations', () => {
    // 1. Register professor and student
    const profRes = storage.registerUser({
      username: 'Profesor Paez',
      role: 'profesor',
      password: 'adminprof123'
    });
    const studRes = storage.registerUser({
      username: 'Alumno Pedro',
      role: 'estudiante',
      pin: '123'
    });

    assert.equal(profRes.success, true);
    assert.equal(studRes.success, true);

    const profId = profRes.user.id;
    const studId = studRes.user.id;

    // 2. Professor creates section with student
    const secRes = sectionsStorage.createSection({
      name: 'Logica A',
      professorId: profId,
      professorName: 'Profesor Paez',
      studentIds: [studId]
    });
    assert.equal(secRes.success, true);
    assert.equal(sectionsStorage.getSectionsForProfessor(profId).length, 1);

    // 3. Admin deletes the professor
    const delRes = storage.deleteUser(profId);
    assert.equal(delRes.success, true);
    sectionsStorage.deleteSectionsByProfessor(profId);

    // Verify professor is gone
    assert.equal(storage.findUserById(profId), undefined);
    assert.equal(storage.loginUser('profesor', 'Profesor Paez', 'adminprof123').success, false);
    assert.equal(sectionsStorage.getSectionsForProfessor(profId).length, 0);

    // 4. Student Pedro can still log in
    const studLogin = storage.loginUser('estudiante', 'Alumno Pedro', '123');
    assert.equal(studLogin.success, true);

    // 5. A new student and a new professor can register and log in without any failure
    const newStud = storage.registerUser({
      username: 'Nuevo Estudiante',
      role: 'estudiante',
      pin: '789'
    });
    assert.equal(newStud.success, true);
    const newStudLogin = storage.loginUser('estudiante', 'Nuevo Estudiante', '789');
    assert.equal(newStudLogin.success, true);

    const newProf = storage.registerUser({
      username: 'Nuevo Profesor',
      role: 'profesor',
      password: 'claveprofesor'
    });
    assert.equal(newProf.success, true);
    const newProfLogin = storage.loginUser('profesor', 'Nuevo Profesor', 'claveprofesor');
    assert.equal(newProfLogin.success, true);
  });
});
