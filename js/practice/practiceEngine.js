/**
 * practiceEngine.js - Motor Lógico y Generador de Desafíos del Centro de Prácticas
 * Controla el ciclo de vida de los 4 minijuegos, temporizadores precisos por dificultad,
 * puntuaciones y generación determinista de ejercicios.
 */

import { FBFParser, OPERATORS, NOTATION_MODES, NOTATION_SYMBOLS } from '../logic/ast.js';
import { TruthTableEngine } from '../logic/truthTable.js';
import { RandomGenerators, ATOMIC_BANK } from '../logic/generators.js';
import { NaturalLanguageTranslator } from '../logic/naturalLanguage.js';
import { studentModel } from '../ml/studentModel.js';

export const GAME_DIFFICULTIES = {
  tree: {
    facil: { timeSec: 120, maxDepth: 1, label: 'Fácil (2 min)' },
    normal: { timeSec: 90, maxDepth: 2, label: 'Normal (1:30 min)' },
    dificil: { timeSec: 30, maxDepth: 3, label: 'Difícil (30 seg)' }
  },
  molecular: {
    facil: { timeSec: 300, maxDepth: 1, label: 'Fácil (5 min)' },
    normal: { timeSec: 150, maxDepth: 2, label: 'Normal (2:30 min)' },
    dificil: { timeSec: 90, maxDepth: 3, label: 'Difícil (1:30 min)' }
  },
  verdict: {
    facil: { timeSec: 120, maxDepth: 1, label: 'Fácil (2 min)' },
    normal: { timeSec: 90, maxDepth: 2, label: 'Normal (1:30 min)' },
    dificil: { timeSec: 45, maxDepth: 3, label: 'Difícil (45 seg)' }
  },
  duel: {
    facil: { timeSec: 120, maxDepth: 1, label: 'Fácil (2 min)' },
    normal: { timeSec: 90, maxDepth: 2, label: 'Normal (1:30 min)' },
    dificil: { timeSec: 60, maxDepth: 2, label: 'Difícil (1 min)' }
  }
};

export class PracticeEngine {
  constructor(options = {}) {
    this.onTick = options.onTick || null;
    this.onGameOver = options.onGameOver || null;
    this.onScoreUpdate = options.onScoreUpdate || null;
    this.mascotController = options.mascotController || null;

    this.activeGameId = null;
    this.activeDifficulty = 'normal';
    this.isPlaying = false;
    this.timeRemaining = 0;
    this.timerInterval = null;

    // Métricas de partida
    this.score = 0;
    this.botScore = 0; // Para el duelo
    this.totalAttempts = 0;
    this.correctAnswers = 0;
    this.currentChallenge = null;
    this.challengeStartTime = 0;
  }

  /**
   * Inicia un minijuego
   */
  startGame(gameId, difficulty = 'normal') {
    this.stopGame();

    this.activeGameId = gameId;
    this.activeDifficulty = difficulty;
    this.isPlaying = true;
    this.score = 0;
    this.botScore = 0;
    this.totalAttempts = 0;
    this.correctAnswers = 0;

    const config = GAME_DIFFICULTIES[gameId]?.[difficulty] || { timeSec: 90 };
    this.timeRemaining = config.timeSec;

    if (this.mascotController) {
      this.mascotController.notifyGameStart(gameId, difficulty);
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate({ score: this.score, botScore: this.botScore });
    }

    // Iniciar temporizador
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;

      if (this.onTick) {
        this.onTick(this.timeRemaining);
      }

      if (this.timeRemaining <= 0) {
        this.endGame();
      }
    }, 1000);

    // Cargar primer desafío
    return this.nextChallenge();
  }

  /**
   * Detiene el juego actual y limpia temporizadores
   */
  stopGame() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isPlaying = false;
    this.currentChallenge = null;

    if (this.mascotController) {
      this.mascotController.notifyGameExit();
    }
  }

  /**
   * Finaliza la partida por fin de tiempo
   */
  endGame() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isPlaying = false;

    const accuracy = this.totalAttempts > 0 
      ? Math.round((this.correctAnswers / this.totalAttempts) * 100) 
      : 0;

    const summary = {
      gameId: this.activeGameId,
      difficulty: this.activeDifficulty,
      score: this.score,
      botScore: this.botScore,
      totalAttempts: this.totalAttempts,
      correctAnswers: this.correctAnswers,
      accuracy,
      recommendation: studentModel.getRecommendation()
    };

    if (this.mascotController) {
      this.mascotController.notifyGameOver(summary);
    }

    if (this.onGameOver) {
      this.onGameOver(summary);
    }
  }

  /**
   * Genera el siguiente desafío según el minijuego activo
   */
  nextChallenge() {
    if (!this.isPlaying) return null;

    this.challengeStartTime = Date.now();

    switch (this.activeGameId) {
      case 'tree':
        this.currentChallenge = this._generateTreeChallenge();
        break;
      case 'molecular':
        this.currentChallenge = this._generateMolecularChallenge();
        break;
      case 'verdict':
        this.currentChallenge = this._generateVerdictChallenge();
        break;
      case 'duel':
        this.currentChallenge = this._generateDuelChallenge();
        break;
      default:
        this.currentChallenge = null;
    }

    return this.currentChallenge;
  }

  // =========================================================================
  // JUEGO 1: ÁRBOL CORRECTO
  // =========================================================================
  _generateTreeChallenge() {
    const config = GAME_DIFFICULTIES.tree[this.activeDifficulty];
    const vars = this.activeDifficulty === 'facil' ? ['p', 'q'] : ['p', 'q', 'r'];
    const maxDepth = config.maxDepth;

    // Generar AST objetivo
    const targetAST = RandomGenerators.generateRandomAST(0, maxDepth, vars);
    const correctFBF = FBFParser.toString(targetAST, NOTATION_MODES.STANDARD, false);

    // Extraer conectivos para ML
    const connectivesPresent = this._extractConnectivesFromAST(targetAST);

    // Generar 3 distractores bien formados pero distintos
    const options = [{ fbf: correctFBF, isCorrect: true }];
    const seen = new Set([correctFBF]);

    let safety = 0;
    while (options.length < 4 && safety < 30) {
      safety++;
      const distractorAST = RandomGenerators.generateRandomAST(0, maxDepth, vars);
      const distractorFBF = FBFParser.toString(distractorAST, NOTATION_MODES.STANDARD, false);

      if (!seen.has(distractorFBF)) {
        seen.add(distractorFBF);
        options.push({ fbf: distractorFBF, isCorrect: false });
      }
    }

    // Si faltan distractores por combinatoria, mutar conectivos
    const allSymbols = ['∧', '∨', '→', '↔'];
    while (options.length < 4) {
      const sym = allSymbols[options.length % allSymbols.length];
      const fallbackFBF = `(${vars[0]} ${sym} ${vars[1]})`;
      if (!seen.has(fallbackFBF)) {
        seen.add(fallbackFBF);
        options.push({ fbf: fallbackFBF, isCorrect: false });
      } else {
        options.push({ fbf: `(¬${vars[0]} ${sym} ${vars[1]})`, isCorrect: false });
      }
    }

    // Barajar opciones
    options.sort(() => 0.5 - Math.random());

    return {
      type: 'tree',
      ast: targetAST,
      treeData: FBFParser.toTreeData(targetAST, NOTATION_MODES.STANDARD),
      options,
      correctFBF,
      connectivesPresent
    };
  }

  // =========================================================================
  // JUEGO 2: MOLECULARES (LENGUAJE NATURAL -> FBF CON TOKENS)
  // =========================================================================
  _generateMolecularChallenge() {
    const vars = this.activeDifficulty === 'facil' ? ['p', 'q'] : ['p', 'q', 'r'];
    const maxDepth = this.activeDifficulty === 'facil' ? 1 : (this.activeDifficulty === 'normal' ? 2 : 3);

    const ast = RandomGenerators.generateRandomAST(0, maxDepth, vars);
    const variableNames = FBFParser.getVariables(ast);

    // Asignar enunciados en español deterministas
    const varMap = {};
    const shuffledBank = [...ATOMIC_BANK].sort(() => 0.5 - Math.random());
    variableNames.forEach((v, idx) => {
      varMap[v] = shuffledBank[idx % shuffledBank.length];
    });

    const naturalText = NaturalLanguageTranslator.toSpanish(ast, varMap, true);
    const expectedFBF = FBFParser.toString(ast, NOTATION_MODES.STANDARD, false);
    const connectivesPresent = this._extractConnectivesFromAST(ast);

    return {
      type: 'molecular',
      naturalText,
      expectedFBF,
      ast,
      variables: variableNames,
      varMap,
      connectivesPresent
    };
  }

  // =========================================================================
  // JUEGO 3: VEREDICTO (TAUTOLOGÍA, CONTRADICCIÓN, CONTINGENCIA)
  // =========================================================================
  _generateVerdictChallenge() {
    const vars = this.activeDifficulty === 'facil' ? ['p'] : (this.activeDifficulty === 'normal' ? ['p', 'q'] : ['p', 'q', 'r']);
    const maxDepth = this.activeDifficulty === 'facil' ? 1 : (this.activeDifficulty === 'normal' ? 2 : 3);

    // Crear una fórmula balanceada
    let ast;
    let verdict = 'CONTINGENCIA';

    // Para fácil/normal, a veces inyectar tautologías o contradicciones clásicas
    const dice = Math.random();
    if (dice < 0.35 && vars.length >= 1) {
      // Tautología: (p ∨ ¬p) o (p → p)
      ast = {
        type: 'binary',
        op: OPERATORS.OR,
        left: { type: 'variable', name: vars[0] },
        right: { type: 'unary', op: OPERATORS.NOT, operand: { type: 'variable', name: vars[0] } }
      };
      verdict = 'TAUTOLOGÍA';
    } else if (dice < 0.60 && vars.length >= 1) {
      // Contradicción: (p ∧ ¬p)
      ast = {
        type: 'binary',
        op: OPERATORS.AND,
        left: { type: 'variable', name: vars[0] },
        right: { type: 'unary', op: OPERATORS.NOT, operand: { type: 'variable', name: vars[0] } }
      };
      verdict = 'CONTRADICCIÓN';
    } else {
      ast = RandomGenerators.generateRandomAST(0, maxDepth, vars);
      const res = TruthTableEngine.generate(ast, NOTATION_MODES.STANDARD);
      verdict = res.classification;
    }

    const fbfString = FBFParser.toString(ast, NOTATION_MODES.STANDARD, false);
    const connectivesPresent = this._extractConnectivesFromAST(ast);

    return {
      type: 'verdict',
      fbfString,
      ast,
      correctVerdict: verdict,
      connectivesPresent
    };
  }

  // =========================================================================
  // JUEGO 4: DUELO RÁPIDO CONTRA LA MASCOTA IA
  // =========================================================================
  _generateDuelChallenge() {
    const vars = ['p', 'q'];
    const maxDepth = this.activeDifficulty === 'dificil' ? 2 : 1;

    const ast = RandomGenerators.generateRandomAST(0, maxDepth, vars);
    const usedVars = FBFParser.getVariables(ast);

    // Asignación de valores de verdad aleatorios
    const assignments = {};
    usedVars.forEach(v => {
      assignments[v] = Math.random() < 0.5;
    });

    const expectedTruthValue = TruthTableEngine.evaluate(ast, assignments);
    const fbfString = FBFParser.toString(ast, NOTATION_MODES.STANDARD, false);
    const connectivesPresent = this._extractConnectivesFromAST(ast);

    return {
      type: 'duel',
      fbfString,
      ast,
      assignments,
      expectedTruthValue,
      connectivesPresent
    };
  }

  _extractConnectivesFromAST(node) {
    const found = new Set();
    function walk(n) {
      if (!n) return;
      if (n.type === 'unary') {
        found.add('not');
        walk(n.operand);
      } else if (n.type === 'binary') {
        if (n.op === OPERATORS.AND) found.add('and');
        else if (n.op === OPERATORS.OR) found.add('or');
        else if (n.op === OPERATORS.IMPLIES) found.add('cond');
        else if (n.op === OPERATORS.IFF) found.add('bicond');
        walk(n.left);
        walk(n.right);
      }
    }
    walk(node);
    return Array.from(found);
  }

  // =========================================================================
  // EVALUACIÓN DE RESPUESTAS DEL JUGADOR
  // =========================================================================

  /**
   * Evalúa la respuesta en Árbol Correcto
   */
  evaluateTreeAnswer(selectedFBF) {
    if (!this.isPlaying || !this.currentChallenge) return null;

    this.totalAttempts++;
    const isCorrect = (selectedFBF === this.currentChallenge.correctFBF);
    const responseTimeMs = Date.now() - this.challengeStartTime;

    studentModel.recordExercise({
      gameId: 'tree',
      isCorrect,
      connectivesPresent: this.currentChallenge.connectivesPresent,
      responseTimeMs
    });

    if (isCorrect) {
      this.score++;
      this.correctAnswers++;
      if (this.mascotController) this.mascotController.react('happy');
    } else {
      if (this.mascotController) this.mascotController.react('dizzy');
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate({ score: this.score, botScore: this.botScore });
    }

    return { isCorrect, score: this.score };
  }

  /**
   * Evalúa la fórmula construida en Moleculares
   */
  evaluateMolecularAnswer(builtTokens) {
    if (!this.isPlaying || !this.currentChallenge) return null;

    this.totalAttempts++;
    const responseTimeMs = Date.now() - this.challengeStartTime;

    // Convertir tokens a string y parsear
    let builtFBF = '';
    builtTokens.forEach(t => {
      if (t.type === 'op') {
        builtFBF += ` ${NOTATION_SYMBOLS.standard[t.value] || t.value} `;
      } else {
        builtFBF += t.value;
      }
    });
    builtFBF = builtFBF.replace(/\s+/g, ' ').trim();

    let isCorrect = false;
    let feedback = '';

    try {
      const parsedAst = FBFParser.parse(builtFBF, NOTATION_MODES.STANDARD);
      const targetAst = this.currentChallenge.ast;

      // Comparación lógica evaluando sobre todas las combinaciones posibles
      const vars = Array.from(new Set([...FBFParser.getVariables(parsedAst), ...FBFParser.getVariables(targetAst)]));
      const totalCombos = Math.pow(2, vars.length);
      let matches = true;

      for (let i = 0; i < totalCombos; i++) {
        const values = {};
        vars.forEach((v, idx) => {
          values[v] = Boolean((i >> idx) & 1);
        });

        if (TruthTableEngine.evaluate(parsedAst, values) !== TruthTableEngine.evaluate(targetAst, values)) {
          matches = false;
          break;
        }
      }

      isCorrect = matches;
      feedback = isCorrect ? '¡Fórmula perfectamente equivalente!' : 'La fórmula no coincide lógicamente con la proposición.';
    } catch (err) {
      isCorrect = false;
      feedback = `Sintaxis incompleta: ${err.message}`;
    }

    studentModel.recordExercise({
      gameId: 'molecular',
      isCorrect,
      connectivesPresent: this.currentChallenge.connectivesPresent,
      responseTimeMs
    });

    if (isCorrect) {
      this.score++;
      this.correctAnswers++;
      if (this.mascotController) this.mascotController.react('happy');
    } else {
      if (this.mascotController) this.mascotController.react('dizzy');
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate({ score: this.score, botScore: this.botScore });
    }

    return { isCorrect, feedback, score: this.score };
  }

  /**
   * Evalúa la respuesta en Veredicto (+1 si acierta, -1 si falla con piso en 0)
   */
  evaluateVerdictAnswer(selectedVerdict) {
    if (!this.isPlaying || !this.currentChallenge) return null;

    this.totalAttempts++;
    const isCorrect = (selectedVerdict === this.currentChallenge.correctVerdict);
    const responseTimeMs = Date.now() - this.challengeStartTime;

    studentModel.recordExercise({
      gameId: 'verdict',
      isCorrect,
      connectivesPresent: this.currentChallenge.connectivesPresent,
      responseTimeMs
    });

    if (isCorrect) {
      this.score++;
      this.correctAnswers++;
      if (this.mascotController) this.mascotController.react('happy');
    } else {
      // Restar 1 garantizando que no haya números negativos
      this.score = Math.max(0, this.score - 1);
      if (this.mascotController) this.mascotController.react('dizzy');
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate({ score: this.score, botScore: this.botScore });
    }

    return { isCorrect, correctVerdict: this.currentChallenge.correctVerdict, score: this.score };
  }

  /**
   * Evalúa la respuesta del Jugador en el Duelo
   */
  evaluateDuelPlayerAnswer(playerValue) {
    if (!this.isPlaying || !this.currentChallenge) return null;

    this.totalAttempts++;
    const isCorrect = (playerValue === this.currentChallenge.expectedTruthValue);
    const responseTimeMs = Date.now() - this.challengeStartTime;

    studentModel.recordExercise({
      gameId: 'duel',
      isCorrect,
      connectivesPresent: this.currentChallenge.connectivesPresent,
      responseTimeMs
    });

    if (isCorrect) {
      this.score++;
      this.correctAnswers++;
      if (this.mascotController) this.mascotController.react('happy');
    } else {
      if (this.mascotController) this.mascotController.react('dizzy');
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate({ score: this.score, botScore: this.botScore });
    }

    return { isCorrect, score: this.score, botScore: this.botScore };
  }

  /**
   * Registra punto para la Mascota IA en el Duelo
   */
  recordMascotDuelPoint() {
    this.botScore++;
    if (this.mascotController) this.mascotController.react('happy');
    if (this.onScoreUpdate) {
      this.onScoreUpdate({ score: this.score, botScore: this.botScore });
    }
  }
}
