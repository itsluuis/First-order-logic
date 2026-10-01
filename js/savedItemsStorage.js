/**
 * savedItemsStorage.js - Servicio de Persistencia para Elementos Logicos Guardados
 * Gestiona de forma desacoplada las proposiciones atomicas, formulas bien formadas (FBF)
 * y proposiciones moleculares en lenguaje natural, con aislamiento por usuario y cuotas estrictas.
 */

export const SAVED_LIMITS = {
  atomics: 15,
  fbf: 20,
  molecules: 15
};

const DB_PREFIX = 'logica_saved_items_';

export class SavedItemsService {
  /**
   * Obtiene la clave de almacenamiento para un usuario especifico
   */
  getStorageKey(userId) {
    const cleanId = (userId || 'default_user').trim();
    return `${DB_PREFIX}${cleanId}`;
  }

  /**
   * Obtiene todas las colecciones del usuario desde localStorage
   */
  getUserData(userId) {
    try {
      const key = this.getStorageKey(userId);
      const data = localStorage.getItem(key);
      if (!data) {
        return { atomics: [], fbf: [], molecules: [] };
      }
      const parsed = JSON.parse(data);
      return {
        atomics: Array.isArray(parsed.atomics) ? parsed.atomics : [],
        fbf: Array.isArray(parsed.fbf) ? parsed.fbf : [],
        molecules: Array.isArray(parsed.molecules) ? parsed.molecules : []
      };
    } catch (e) {
      console.error('Error al leer datos guardados:', e);
      return { atomics: [], fbf: [], molecules: [] };
    }
  }

  /**
   * Persiste todas las colecciones del usuario en localStorage
   */
  saveUserData(userId, data) {
    try {
      const key = this.getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error al guardar datos:', e);
      return false;
    }
  }

  /**
   * Obtiene los elementos guardados de una categoria especifica
   */
  getItems(userId, category) {
    if (!SAVED_LIMITS[category]) return [];
    const data = this.getUserData(userId);
    return data[category] || [];
  }

  /**
   * Comprueba si la cuota de una categoria esta llena
   */
  isQuotaFull(userId, category) {
    const max = SAVED_LIMITS[category] || 0;
    const current = this.getItems(userId, category).length;
    return current >= max;
  }

  /**
   * Obtiene el conteo actual y el maximo de una categoria
   */
  getQuotaInfo(userId, category) {
    const max = SAVED_LIMITS[category] || 0;
    const current = this.getItems(userId, category).length;
    return { current, max };
  }

  /**
   * Guarda un nuevo elemento en una categoria
   */
  saveItem(userId, category, payload) {
    const max = SAVED_LIMITS[category];
    if (!max) {
      return { success: false, reason: 'invalid_category' };
    }

    if (this.isQuotaFull(userId, category)) {
      return { success: false, reason: 'quota_full', max };
    }

    const userData = this.getUserData(userId);
    const nowIso = new Date().toISOString();
    const id = `${category.substring(0, 3)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    if (category === 'atomics') {
      const text = (payload?.text || '').trim();
      if (!text) {
        return { success: false, reason: 'empty' };
      }
      const newItem = { id, text, createdAt: nowIso };
      userData.atomics.unshift(newItem);
      this.saveUserData(userId, userData);
      return { success: true, item: newItem };
    }

    if (category === 'fbf') {
      const formula = (payload?.formula || '').trim();
      if (!formula) {
        return { success: false, reason: 'empty' };
      }
      const newItem = { id, formula, createdAt: nowIso };
      userData.fbf.unshift(newItem);
      this.saveUserData(userId, userData);
      return { success: true, item: newItem };
    }

    if (category === 'molecules') {
      const sentence = (payload?.sentence || '').trim();
      const fbf = (payload?.fbf || '').trim();
      if (!sentence) {
        return { success: false, reason: 'empty' };
      }
      if (!fbf) {
        return { success: false, reason: 'missing_fbf' };
      }
      const newItem = { id, sentence, fbf, createdAt: nowIso };
      userData.molecules.unshift(newItem);
      this.saveUserData(userId, userData);
      return { success: true, item: newItem };
    }

    return { success: false, reason: 'unknown' };
  }

  /**
   * Elimina un elemento por su ID dentro de una categoria
   */
  deleteItem(userId, category, itemId) {
    if (!SAVED_LIMITS[category]) {
      return { success: false, reason: 'invalid_category' };
    }
    const userData = this.getUserData(userId);
    const initialLen = userData[category].length;
    userData[category] = userData[category].filter(it => it.id !== itemId);

    if (userData[category].length !== initialLen) {
      this.saveUserData(userId, userData);
      return { success: true };
    }
    return { success: false, reason: 'not_found' };
  }
}

export const savedItemsStorage = new SavedItemsService();
