/**
 * mascotController.js - Coordinador Global de la Mascota Inteligente "Moli"
 * Inspecciona el contexto activo de la aplicación para ofrecer explicaciones pedagógicas
 * precisas, reaccionar emocionalmente y emitir diagnósticos basados en la Red Neuronal.
 * Libre de emojis en favor de un diseño técnico profesional.
 */

import { MascotView } from './mascotView.js';
import { studentModel } from '../ml/studentModel.js';

export class MascotController {
  constructor(appContextGetter) {
    this.getAppContext = appContextGetter;
    this.view = new MascotView('mascot-global-widget');
    this.activeGameContext = null;

    this._bindEvents();
  }

  _bindEvents() {
    this.view.onMascotClick = () => {
      this.handleMascotClick();
    };

    this.view.onBubbleClose = () => {
      this.view.setExpression('idle');
    };
  }

  dockTo(targetElement) {
    this.view.dockTo(targetElement);
  }

  undock() {
    this.view.undock();
  }

  /**
   * Gestiona el clic del usuario sobre la mascota según la pestaña o minijuego activo
   */
  handleMascotClick() {
    if (this.view.isBubbleOpen && !this.view.isQuickRemark) {
      this.view.hideSpeechBubble();
      return;
    }

    const explanationHtml = this.generateContextualExplanation();
    this.view.showSpeechBubble(explanationHtml);
  }

  /**
   * Genera el texto pedagógico contextualizado
   */
  generateContextualExplanation() {
    if (this.activeGameContext && this.activeGameContext.isPlaying) {
      return this._generateGameHint(this.activeGameContext);
    }

    const context = this.getAppContext ? this.getAppContext() : {};
    const activeTab = context.activeTab || 'tab-builder';

    switch (activeTab) {
      case 'tab-builder':
        return this._explainBuilderTab(context);
      case 'tab-inverse':
        return this._explainInverseTab(context);
      case 'tab-truthtable':
        return this._explainTruthTableTab(context);
      case 'tab-practice':
        return this._explainPracticeLobby();
      case 'tab-admin':
        return `
          <p><strong>Panel de Parámetros:</strong></p>
          <p>Aquí el administrador puede fijar una notación lógica obligatoria (ej. estándar <em>∧, ∨, →</em> o alternativa <em>&, ∨, ⊃</em>) para todos los usuarios.</p>
        `;
      case 'tab-sections':
        return this._explainSectionsTab(context);
      default:
        return `<p>Selecciona una pestaña o ingresa al <strong>Centro de Prácticas</strong> para ejercitar tu mente lógica.</p>`;
    }
  }

  _explainBuilderTab(context) {
    const tokens = context.tokens || [];
    if (tokens.length === 0) {
      return `
        <p><strong>Constructor Visual:</strong></p>
        <p>Estás en el lienzo de construcción. Puedes definir enunciados para <em>p, q, r...</em> y tocar los conectivos lógicos abajo para ensamblar tu fórmula.</p>
        <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.4rem;">Tip: Puedes generar proposiciones atómicas aleatorias con el botón Atómicas Aleatorias.</p>
      `;
    }

    const fbfText = context.fbf || '';
    const mainOp = context.mainOp || null;
    let mainOpDesc = 'un conectivo principal';

    if (mainOp === '→' || mainOp === '⊃') mainOpDesc = 'un <strong>Condicional (→)</strong>: solo es falso si el antecedente es V y el consecuente es F.';
    else if (mainOp === '↔' || mainOp === '≡') mainOpDesc = 'un <strong>Bicondicional (↔)</strong>: es verdadero solo si ambas partes tienen el mismo valor de verdad.';
    else if (mainOp === '∧' || mainOp === '&') mainOpDesc = 'una <strong>Conjunción (∧)</strong>: requiere que ambas proposiciones sean simultáneamente verdaderas.';
    else if (mainOp === '∨') mainOpDesc = 'una <strong>Disyunción (∨)</strong>: es verdadera si al menos una de las partes se cumple.';
    else if (mainOp === '¬' || mainOp === '~') mainOpDesc = 'una <strong>Negación (¬)</strong>: invierte el valor de verdad de la fórmula.';

    return `
      <p><strong>Fórmula en Construcción:</strong></p>
      <div style="background: rgba(0,0,0,0.25); padding: 0.4rem 0.6rem; border-radius: 6px; font-family: monospace; margin: 0.4rem 0;">
        ${fbfText || 'Fórmula activa'}
      </div>
      <p>Tu expresión lógica se rige por ${mainOpDesc}</p>
      <p style="font-size: 0.8rem; margin-top: 0.4rem;">Haz clic en la pestaña de <em>Tabla de Verdad</em> para verificar si es Tautología.</p>
    `;
  }

  _explainInverseTab(context) {
    return `
      <p><strong>Proceso Inverso Determinista:</strong></p>
      <p>Este módulo lee cualquier Fórmula Bien Formada (FBF) ingresada y construye un <strong>Árbol de Sintaxis Abstracta (AST)</strong> para descomponerla.</p>
      <p style="font-size: 0.8rem; margin-top: 0.4rem;">A partir del árbol y de los enunciados asignados, traduce fielmente la expresión al lenguaje natural en español respetando la precedencia formal.</p>
    `;
  }

  _explainTruthTableTab(context) {
    const diagnosis = context.diagnosis || document.getElementById('tt-diagnosis-badge')?.textContent || '';
    let diagExplanation = 'Genera la tabla completa de 2<sup>n</sup> combinaciones posibles.';

    if (diagnosis.includes('TAUTOLOGÍA')) {
      diagExplanation = '<strong>Tautología:</strong> En la columna del conectivo principal todos los valores son <strong>V</strong>. La proposición es verdadera bajo cualquier circunstancia.';
    } else if (diagnosis.includes('CONTRADICCIÓN')) {
      diagExplanation = '<strong>Contradicción:</strong> Todos los valores de la columna principal son <strong>F</strong>. Es una fórmula lógicamente imposible de satisfacer.';
    } else if (diagnosis.includes('CONTINGENCIA')) {
      diagExplanation = '<strong>Contingencia:</strong> Hay combinaciones que resultan en <strong>V</strong> y otras en <strong>F</strong>. Su valor depende de la verdad fáctica de las atómicas.';
    }

    return `
      <p><strong>Diagnóstico de la Tabla de Verdad:</strong></p>
      <p>${diagExplanation}</p>
      <p style="font-size: 0.8rem; margin-top: 0.4rem;">Revisa el <em>Árbol Sintáctico</em> abajo para ver cómo se agrupan las subfórmulas paso a paso.</p>
    `;
  }

  _explainPracticeLobby() {
    const rec = studentModel.getRecommendation();
    return `
      <p><strong>Centro de Prácticas:</strong></p>
      <p>${rec.message}</p>
      <div style="margin-top: 0.5rem; padding: 0.4rem; background: rgba(59, 130, 246, 0.15); border-left: 3px solid var(--primary, #3b82f6); border-radius: 4px; font-size: 0.8rem;">
        <strong>Sugerencia de la Red Neuronal:</strong> Juega <em>${rec.gameTitle}</em> en dificultad <em>${rec.difficulty.toUpperCase()}</em>.
      </div>
    `;
  }

  _generateGameHint(gameCtx) {
    switch (gameCtx.gameId) {
      case 'tree':
        return `
          <p><strong>Pista para Árbol Correcto:</strong></p>
          <p>Observa el nodo superior (la raíz del árbol). Ese es el <strong>conectivo principal</strong> que debe separar los dos lados de la fórmula.</p>
        `;
      case 'molecular':
        return `
          <p><strong>Pista para Moleculares:</strong></p>
          <p>Identifica los conectivos clave en la frase: <em>"si... entonces" (→)</em>, <em>"y" (∧)</em>, <em>"o" (∨)</em> o <em>"no" (¬)</em>. Asegúrate de agrupar entre paréntesis si hay más de una operación.</p>
        `;
      case 'verdict':
        return `
          <p><strong>Pista para Veredicto:</strong></p>
          <p>Prueba mentalmente dos casos: uno donde las atómicas sean verdaderas y otro donde sean falsas. Si obtienes resultados distintos, ¡es una <strong>Contingencia</strong>!</p>
        `;
      case 'duel':
        return `
          <p><strong>Pista para el Duelo:</strong></p>
          <p>Evalúa primero los paréntesis interiores y las negaciones para deducir el valor global de la proposición antes de que yo responda.</p>
        `;
      default:
        return `<p>Concéntrate en la precedencia de los operadores para lograr una gran puntuación.</p>`;
    }
  }

  notifyGameStart(gameId, difficulty) {
    this.activeGameContext = { isPlaying: true, gameId, difficulty };
    this.view.setGamePlaying(true);
    this.view.hideSpeechBubble(true);
    if (gameId === 'duel') {
      this.view.stopMouseTracking();
      this.view.setExpression('battle');
    } else {
      this.view.startMouseTracking();
    }
  }

  notifyGameExit() {
    this.activeGameContext = null;
    this.view.stopMouseTracking();
    this.view.setGamePlaying(false);
    this.view.hideSpeechBubble(true);
    this.view.setExpression('idle');

    if (this.view.isBubbleOpen) {
      this.view.showSpeechBubble(this.generateContextualExplanation());
    }
  }

  notifyGameOver(summary) {
    this.activeGameContext = null;
    this.view.stopMouseTracking();
    this.view.setGamePlaying(false);

    if (summary.score > 3 || summary.accuracy >= 75) {
      this.view.setExpression('happy');
    } else {
      this.view.setExpression('dizzy');
      setTimeout(() => {
        if (this.view.currentExpression === 'dizzy') this.view.setExpression('idle');
      }, 2500);
    }
  }

  react(emotion) {
    this.view.setExpression(emotion);
    if (emotion === 'happy' || emotion === 'dizzy' || emotion === 'wink') {
      setTimeout(() => {
        if (this.view.currentExpression === emotion) {
          this.view.setExpression('idle');
        }
      }, 1800);
    }
  }

  /**
   * Celebra una racha de respuestas correctas consecutivas
   */
  celebrateStreak(streak) {
    const compliments = [
      '¡Bien hecho!',
      '¡Parece que lo entiendes!',
      '¡Destroza esos ejercicios!',
      '¡Eres el mejor!',
      '¡Racha imparable!'
    ];
    const phrase = compliments[Math.floor(Math.random() * compliments.length)];
    this.view.setExpression('happy');
    this.view.sayQuickRemark(`
      <div style="text-align: center;">
        <span style="font-size: 0.78rem; text-transform: uppercase; font-weight: 800; color: var(--pop-green); letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
          Racha de ${streak} Aciertos
        </span>
        <strong style="font-size: 1.05rem; color: var(--text-primary); display: block;">
          ${phrase}
        </strong>
      </div>
    `, 3200, { isStreak: true, isCompact: true, keepExpression: true });
  }

  sayQuickRemark(contentHtml, durationMs = 3500, options = {}) {
    this.view.sayQuickRemark(contentHtml, durationMs, options);
  }

  celebrateTaskCompletion() {
    const expressions = ['happy', 'wink'];
    const chosenExpr = expressions[Math.floor(Math.random() * expressions.length)];
    this.view.setExpression(chosenExpr);

    const phrases = [
      '¡Una menos! Gran trabajo resolviendo esta tarea.',
      '¡Misión cumplida! Tu avance quedó registrado con éxito.',
      '¡Excelente deducción! Cada tarea completada refuerza tu lógica.'
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.sayQuickRemark(phrase, 3500);

    setTimeout(() => {
      if (this.view.currentExpression === chosenExpr) {
        this.view.setExpression('idle');
      }
    }, 3500);
  }

  _explainSectionsTab(context) {
    const user = context.currentUser || null;
    const isProf = user && user.role === 'profesor';

    if (isProf) {
      return `
        <p><strong>Gestión de Secciones Académicas:</strong></p>
        <p>Como profesor, aquí puedes crear secciones de clase, matricular estudiantes y asignar tareas tipo To-Do para evaluar el progreso en lógica proposicional.</p>
        <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.4rem;">Tip: Las tareas completadas por el 100% de los estudiantes se depuran automáticamente para mantener el aula despejada.</p>
      `;
    }

    const pendingCount = (typeof context.pendingTasksCount === 'number')
      ? context.pendingTasksCount
      : 0;

    if (pendingCount > 0) {
      return `
        <p><strong>Tus Tareas Académicas:</strong></p>
        <p>Tienes <strong>${pendingCount}</strong> tarea(s) pendiente(s) asignada(s) por tus profesores. Selecciona tu sección y marca las casillas a medida que resuelvas cada ejercicio.</p>
        <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.4rem;">Tip: Resolver los desafíos del Centro de Prácticas te ayudará a completar estas tareas más rápido.</p>
      `;
    }

    return `
      <p><strong>Secciones de Clase:</strong></p>
      <p>¡Estás al día! No tienes tareas pendientes en tus secciones activas. Continúa repasando con el Constructor y las Tablas de Verdad.</p>
      <p class="text-muted" style="font-size: 0.8rem; margin-top: 0.4rem;">Moli monitorea tu constancia para ayudarte a mantenerte al día.</p>
    `;
  }
}
