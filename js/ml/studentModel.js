/**
 * studentModel.js - Perfil de Aprendizaje del Estudiante y Motor de IA
 * Utiliza la Red Neuronal Artificial (MLP) para:
 * 1. Clasificar debilidades del alumno por conectivo lógico (¬, ∧, ∨, →, ↔)
 * 2. Predecir áreas críticas de refuerzo y sugerir el minijuego óptimo
 * 3. Gobernar el comportamiento y velocidad del Duelo contra la Mascota IA
 */

import { NeuralNetwork } from './neuralNet.js';

const STORAGE_KEY = 'logica_student_ml_profile';

export class StudentModel {
  constructor() {
    this.network = new NeuralNetwork({
      inputSize: 7,
      hiddenSizes: [10, 8],
      outputSize: 4,
      learningRate: 0.18,
      momentum: 0.12
    });

    this.profile = this._loadProfile();
    this._ensureBaseTraining();
  }

  /**
   * Carga o inicializa el perfil histórico del estudiante
   */
  _loadProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.netWeights) {
          this.network.fromJSON(parsed.netWeights);
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Error al cargar perfil ML, inicializando nuevo:', e);
    }

    return {
      connectiveStats: {
        not: { total: 4, errors: 1 },
        and: { total: 4, errors: 1 },
        or: { total: 4, errors: 1 },
        cond: { total: 6, errors: 3 },
        bicond: { total: 4, errors: 2 }
      },
      gameStats: {
        tree: { played: 0, correct: 0, highscore: 0 },
        molecular: { played: 0, correct: 0, highscore: 0 },
        verdict: { played: 0, correct: 0, highscore: 0 },
        duel: { played: 0, wins: 0, losses: 0, highscore: 0 }
      },
      totalAnswers: 10,
      totalCorrect: 6,
      avgResponseTimeMs: 4500,
      lastRecommendation: null
    };
  }

  /**
   * Guarda el perfil y los pesos de la red en localStorage
   */
  save() {
    try {
      this.profile.netWeights = this.network.toJSON();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.error('Error guardando perfil ML:', e);
    }
  }

  /**
   * Entrena la red neuronal con datos base representativos de la lógica formal
   */
  _ensureBaseTraining() {
    // Si ya tiene pesos entrenados guardados, no reentrena desde cero
    if (this.profile.netWeights) return;

    // Dataset pedagógico supervisado:
    // Input: [err_not, err_and, err_or, err_cond, err_bicond, norm_time, accuracy]
    // Output: [recomendar_arbol, recomendar_moleculares, recomendar_veredicto, nivel_avanzado_duelo]
    const baseDataset = [
      // Falla mucho en condicional y bicondicional, tiempo medio -> Reforzar Árbol y Precedencia
      { input: [0.1, 0.2, 0.2, 0.8, 0.9, 0.6, 0.4], output: [0.95, 0.3, 0.2, 0.1] },
      // Falla en traducción molecular y conectivos básicos -> Reforzar Moleculares
      { input: [0.7, 0.6, 0.6, 0.3, 0.2, 0.7, 0.4], output: [0.2, 0.95, 0.3, 0.1] },
      // Falla en valores de verdad y tablas -> Reforzar Veredicto
      { input: [0.2, 0.3, 0.2, 0.6, 0.7, 0.5, 0.5], output: [0.2, 0.2, 0.95, 0.2] },
      // Gran precisión y rapidez -> Desafío Duelo Avanzado
      { input: [0.05, 0.05, 0.05, 0.1, 0.1, 0.2, 0.95], output: [0.1, 0.1, 0.2, 0.95] },
      // Principiante equilibrado con dudas generales -> Reforzar Árbol Básico
      { input: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], output: [0.8, 0.5, 0.6, 0.2] }
    ];

    this.network.train(baseDataset, 300);
    this.save();
  }

  /**
   * Registra un resultado de un ejercicio para actualizar el modelo
   * @param {Object} details { gameId, isCorrect, connectivesPresent: ['cond', 'and'], responseTimeMs }
   */
  recordExercise(details) {
    const { gameId, isCorrect, connectivesPresent = [], responseTimeMs = 4000 } = details;

    this.profile.totalAnswers++;
    if (isCorrect) this.profile.totalCorrect++;

    // Actualizar tiempo medio
    this.profile.avgResponseTimeMs = (this.profile.avgResponseTimeMs * 0.8) + (responseTimeMs * 0.2);

    // Actualizar estadísticas por conectivo
    connectivesPresent.forEach(conn => {
      const key = this._normalizeConnectiveKey(conn);
      if (this.profile.connectiveStats[key]) {
        this.profile.connectiveStats[key].total++;
        if (!isCorrect) {
          this.profile.connectiveStats[key].errors++;
        }
      }
    });

    // Actualizar estadísticas de juego
    if (this.profile.gameStats[gameId]) {
      this.profile.gameStats[gameId].played++;
      if (isCorrect) this.profile.gameStats[gameId].correct++;
    }

    // Pequeño reentrenamiento incremental cada 3 ejercicios
    if (this.profile.totalAnswers % 3 === 0) {
      this._trainIncremental();
    }

    this.save();
  }

  _normalizeConnectiveKey(conn) {
    if (conn === '¬' || conn === '~' || conn === 'not') return 'not';
    if (conn === '∧' || conn === '&' || conn === 'and') return 'and';
    if (conn === '∨' || conn === '|' || conn === 'or') return 'or';
    if (conn === '→' || conn === '⊃' || conn === 'cond') return 'cond';
    if (conn === '↔' || conn === '≡' || conn === 'bicond') return 'bicond';
    return 'and';
  }

  /**
   * Reentrena la red con los datos acumulados del alumno
   */
  _trainIncremental() {
    const currentVector = this._extractFeatureVector();
    const target = this._computeTargetVector(currentVector);

    this.network.train([{ input: currentVector, output: target }], 50);
  }

  /**
   * Extrae el vector de características normalizado [0, 1]
   */
  _extractFeatureVector() {
    const cStats = this.profile.connectiveStats;
    const calcErrRatio = (item) => item.total > 0 ? item.errors / item.total : 0.3;

    const errNot = calcErrRatio(cStats.not);
    const errAnd = calcErrRatio(cStats.and);
    const errOr = calcErrRatio(cStats.or);
    const errCond = calcErrRatio(cStats.cond);
    const errBicond = calcErrRatio(cStats.bicond);

    // Tiempo normalizado (0 = muy rápido <= 1.5s, 1 = lento >= 10s)
    const normTime = Math.min(1, Math.max(0, (this.profile.avgResponseTimeMs - 1500) / 8500));

    // Precisión general
    const accuracy = this.profile.totalAnswers > 0 
      ? this.profile.totalCorrect / this.profile.totalAnswers 
      : 0.5;

    return [errNot, errAnd, errOr, errCond, errBicond, normTime, accuracy];
  }

  /**
   * Genera el vector objetivo según las mayores debilidades empíricas
   */
  _computeTargetVector(features) {
    const [errNot, errAnd, errOr, errCond, errBicond, , accuracy] = features;
    const maxConnError = Math.max(errNot, errAnd, errOr, errCond, errBicond);

    if (accuracy >= 0.85) {
      return [0.1, 0.1, 0.2, 0.95]; // Listo para duelo avanzado
    } else if (errCond >= 0.5 || errBicond >= 0.5) {
      return [0.9, 0.3, 0.3, 0.1]; // Reforzar árbol y jerarquía
    } else if (errNot >= 0.5 || errAnd >= 0.5) {
      return [0.3, 0.9, 0.3, 0.1]; // Reforzar moleculares
    } else {
      return [0.2, 0.3, 0.9, 0.2]; // Reforzar veredicto
    }
  }

  /**
   * Genera el diagnóstico y recomendación inteligente de la Mascota
   */
  getRecommendation() {
    const features = this._extractFeatureVector();
    const predictions = this.network.predict(features);

    // Identificar conectivo más débil
    const cStats = this.profile.connectiveStats;
    let worstConnective = 'cond';
    let highestRatio = -1;

    for (const [key, val] of Object.entries(cStats)) {
      const ratio = val.total > 0 ? (val.errors / val.total) : 0;
      if (ratio > highestRatio) {
        highestRatio = ratio;
        worstConnective = key;
      }
    }

    const connNames = {
      not: 'la negación (¬)',
      and: 'la conjunción (∧)',
      or: 'la disyunción (∨)',
      cond: 'el condicional (→)',
      bicond: 'el bicondicional (↔)'
    };

    // Índice de predicción más alto
    let maxIdx = 0;
    let maxVal = predictions[0];
    for (let i = 1; i < predictions.length; i++) {
      if (predictions[i] > maxVal) {
        maxVal = predictions[i];
        maxIdx = i;
      }
    }

    let recommendation = {};

    switch (maxIdx) {
      case 0: // Árbol
        recommendation = {
          gameId: 'tree',
          gameTitle: 'Árbol Correcto',
          difficulty: highestRatio > 0.6 ? 'facil' : 'normal',
          message: `He analizado tus patrones con mi red neuronal: detecto que sueles tener dudas con ${connNames[worstConnective]}. Te recomiendo jugar **Árbol Correcto** para dominar la jerarquía y el conectivo principal.`
        };
        break;
      case 1: // Moleculares
        recommendation = {
          gameId: 'molecular',
          gameTitle: 'Moleculares',
          difficulty: 'normal',
          message: `Tu comprensión de árboles es buena, pero noto margen de mejora al formalizar oraciones en lenguaje natural. ¡Practica en **Moleculares** armando fórmulas bien formadas!`
        };
        break;
      case 2: // Veredicto
        recommendation = {
          gameId: 'verdict',
          gameTitle: 'Veredicto',
          difficulty: highestRatio > 0.5 ? 'facil' : 'normal',
          message: `Tu debilidad actual está en deducir rápidamente si una fórmula es contingencia o tautología. Entrena en **Veredicto** para agilizar tu cálculo mental de tablas.`
        };
        break;
      case 3: // Duelo IA
      default:
        recommendation = {
          gameId: 'duel',
          gameTitle: 'Duelo Rápido contra la Mascota IA',
          difficulty: 'dificil',
          message: `¡Excelente rendimiento general! Tu precisión supera el 85%. ¿Te atreves a desafiarme en un **Duelo Rápido** en modo Difícil? ¡Prometo no ponértelo fácil!`
        };
        break;
    }

    this.profile.lastRecommendation = recommendation;
    return recommendation;
  }

  /**
   * Simula la decisión de la Mascota IA en el Minijuego 4 (Duelo)
   * @param {boolean} actualTruthValue - El valor real de la fórmula (true/false)
   * @param {string} difficulty - 'facil' | 'normal' | 'dificil'
   * @returns {Promise<{ answer: boolean, timeMs: number }>}
   */
  async simulateMascotDecision(actualTruthValue, difficulty = 'normal') {
    let accuracyRate = 0.70;
    let minTime = 2200;
    let maxTime = 3800;

    if (difficulty === 'facil') {
      accuracyRate = 0.58; // Se equivoca ~42% de las veces
      minTime = 3200;
      maxTime = 4800;
    } else if (difficulty === 'dificil') {
      accuracyRate = 0.92; // Casi infalible
      minTime = 1100;
      maxTime = 2000;
    }

    const decisionTime = Math.floor(Math.random() * (maxTime - minTime)) + minTime;
    const willBeCorrect = Math.random() < accuracyRate;
    const mascotAnswer = willBeCorrect ? actualTruthValue : !actualTruthValue;

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          answer: mascotAnswer,
          isCorrect: mascotAnswer === actualTruthValue,
          timeMs: decisionTime
        });
      }, decisionTime);
    });
  }
}

// Instancia singleton para toda la aplicación
export const studentModel = new StudentModel();
