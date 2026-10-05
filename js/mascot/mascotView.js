/**
 * mascotView.js - Renderizado Visual de la Mascota Robótica OLED "Moli" (SVG + CSS)
 * Basado fielmente en la referencia visual de pantalla tipo píldora/visor con ojos vectoriales
 * dinámicos y expresivos (^ ^, X X, mirada escéptica de foto, vacilando izq/der, zzz y despertar),
 * desplazamiento/vuelo en pantalla al acoplar/desacoplar, auto-cierre a 4 segundos y docking dinámico.
 */

export class MascotView {
  constructor(containerId = 'mascot-global-widget') {
    this.container = document.getElementById(containerId);
    this.currentExpression = 'idle';
    this.isBubbleOpen = false;
    this.isQuickRemark = false;
    this.isGamePlaying = false;
    this.lastElaborateActionTime = Date.now();
    this.idleTimer = null;
    this.activeIdleActionTimer = null;
    this.currentIdleRoutineId = 0;
    this.autoCloseTimer = null;
    this.closeTransitionTimer = null;
    this.onMascotClick = null;
    this.onBubbleClose = null;

    // Estado del seguimiento de mirada con el cursor
    this.isMouseTracking = false;
    this._boundHandleMouseMove = this._handleMouseMove.bind(this);
    this._mouseRafId = null;
    this._targetEyeX = 0;
    this._targetEyeY = 0;

    this._initDOM();
    this._startIdleCycle();
  }

  /**
   * Define si el usuario esta realizando activamente un ejercicio o minijuego
   */
  setGamePlaying(isPlaying) {
    this.isGamePlaying = Boolean(isPlaying);
    if (this.isGamePlaying) {
      this._cancelActiveIdleAction();
      this.hideSpeechBubble(true);
    } else {
      this.stopMouseTracking();
    }
  }

  /**
   * Activa el seguimiento de mirada de las pupilas de Moli hacia el cursor
   */
  startMouseTracking() {
    if (this.isMouseTracking) return;
    this.isMouseTracking = true;
    this.setExpression('idle');

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this._boundHandleMouseMove, { passive: true });
    }
  }

  /**
   * Desactiva el seguimiento de mirada y regresa las pupilas al centro
   */
  stopMouseTracking() {
    if (!this.isMouseTracking) return;
    this.isMouseTracking = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this._boundHandleMouseMove);
      if (this._mouseRafId) {
        window.cancelAnimationFrame(this._mouseRafId);
        this._mouseRafId = null;
      }
    }

    const leftEye = document.getElementById('mascot-left-eye');
    const rightEye = document.getElementById('mascot-right-eye');
    if (leftEye) leftEye.style.transform = '';
    if (rightEye) rightEye.style.transform = '';
  }

  _handleMouseMove(e) {
    if (!this.isMouseTracking || !this.visor) return;

    const rect = (this.visor && typeof this.visor.getBoundingClientRect === 'function')
      ? this.visor.getBoundingClientRect()
      : { left: 0, top: 0, width: 140, height: 70 };
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0) {
      this._targetEyeX = 0;
      this._targetEyeY = 0;
    } else {
      // Limite suave eliptico (maximo 7px horizontal, 4.5px vertical)
      const angle = Math.atan2(deltaY, deltaX);
      const intensity = Math.min(distance * 0.04, 1);
      this._targetEyeX = Math.cos(angle) * (7 * intensity);
      this._targetEyeY = Math.sin(angle) * (4.5 * intensity);
    }

    if (!this._mouseRafId && typeof window !== 'undefined') {
      this._mouseRafId = window.requestAnimationFrame(() => {
        this._renderEyePositions();
        this._mouseRafId = null;
      });
    }
  }

  _renderEyePositions() {
    if (!this.isMouseTracking) return;
    const leftEye = document.getElementById('mascot-left-eye');
    const rightEye = document.getElementById('mascot-right-eye');
    const transformStr = `translate(${this._targetEyeX.toFixed(2)}px, ${this._targetEyeY.toFixed(2)}px)`;

    if (leftEye) leftEye.style.transform = transformStr;
    if (rightEye) rightEye.style.transform = transformStr;
  }

  _initDOM() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'mascot-global-widget';
      this.container.className = 'mascot-widget';
      document.body.appendChild(this.container);
    }

    this.container.innerHTML = `
      <!-- Globo de Diálogo Flotante (Auto-cierre a los 4s, sin botón de cierre) -->
      <div id="mascot-speech-bubble" class="mascot-speech-bubble hidden">
        <div id="mascot-bubble-header" class="mascot-bubble-header">
          <div class="mascot-bubble-title">
            <span class="mascot-status-dot"></span>
            <strong>Moli</strong>
            <span class="mascot-role-tag">Tutor IA</span>
          </div>
        </div>
        <div id="mascot-bubble-body" class="mascot-bubble-content">
          Soy <strong>Moli</strong>. Haz clic sobre mí en cualquier momento si tienes dudas o necesitas una explicación lógica.
        </div>
      </div>

      <!-- Cuerpo del Visor Robótico OLED -->
      <div id="mascot-visor" class="mascot-visor" title="Haz clic para pedir una explicación a Moli">
        <div class="mascot-screen-glow"></div>

        <!-- Letras ZZZ flotantes cuando duerme -->
        <div id="mascot-zzz-container" class="mascot-zzz-container hidden">
          <span class="zzz zzz-1">z</span>
          <span class="zzz zzz-2">z</span>
          <span class="zzz zzz-3">Z</span>
        </div>

        <svg id="mascot-eyes-svg" class="mascot-eyes-svg" viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg">
          <g id="mascot-left-eye" class="mascot-eye"></g>
          <g id="mascot-right-eye" class="mascot-eye"></g>
        </svg>
      </div>
    `;

    this.visor = document.getElementById('mascot-visor');

    // Evento de clic en la mascota
    this.visor?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onMascotClick) this.onMascotClick();
    });

    // Renderizar expresión inicial
    this.setExpression('idle');
  }

  /**
   * Acopla la mascota dentro de un contenedor con animación de desplazamiento/vuelo en pantalla
   */
  dockTo(targetElement) {
    if (!targetElement || !this.visor) return;
    if (this.visor.parentElement === targetElement) return;

    // 1. Coordenadas iniciales en viewport
    const firstRect = this.visor.getBoundingClientRect();

    // 2. Mover en el DOM al slot destino
    targetElement.innerHTML = '';
    targetElement.appendChild(this.visor);
    this.visor.classList.add('docked');

    // 3. Coordenadas finales en viewport
    const lastRect = this.visor.getBoundingClientRect();

    // 4. Calcular delta de vuelo (técnica FLIP)
    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;

    if (Math.hypot(deltaX, deltaY) > 8) {
      this.visor.classList.add('gliding');
      this.visor.style.transition = 'none';
      this.visor.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.92)`;
      void this.visor.offsetWidth; // Forzar reflow

      // Vuelo fluido con curva de aceleración robótica
      this.visor.style.transition = 'transform 0.65s cubic-bezier(0.25, 1.25, 0.5, 1)';
      this.visor.style.transform = 'translate(0, 0) scale(1)';

      setTimeout(() => {
        this.visor.classList.remove('gliding');
        this.visor.style.transition = '';
        this.visor.style.transform = '';
      }, 680);
    }
  }

  /**
   * Regresa la mascota a su contenedor flotante con animación de vuelo en pantalla
   */
  undock() {
    if (!this.container || !this.visor) return;
    if (this.visor.parentElement === this.container) return;

    // 1. Coordenadas iniciales desde el slot acoplado
    const firstRect = this.visor.getBoundingClientRect();

    // 2. Mover en el DOM al contenedor flotante global
    this.container.appendChild(this.visor);
    this.visor.classList.remove('docked');

    // 3. Coordenadas finales en esquina inferior derecha
    const lastRect = this.visor.getBoundingClientRect();

    // 4. Calcular delta de vuelo
    const deltaX = firstRect.left - lastRect.left;
    const deltaY = firstRect.top - lastRect.top;

    if (Math.hypot(deltaX, deltaY) > 8) {
      this.visor.classList.add('gliding');
      this.visor.style.transition = 'none';
      this.visor.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.92)`;
      void this.visor.offsetWidth; // Forzar reflow

      this.visor.style.transition = 'transform 0.65s cubic-bezier(0.25, 1.25, 0.5, 1)';
      this.visor.style.transform = 'translate(0, 0) scale(1)';

      setTimeout(() => {
        this.visor.classList.remove('gliding');
        this.visor.style.transition = '';
        this.visor.style.transform = '';
      }, 680);
    }
  }

  /**
   * Cambia la expresión facial de Moli
   * @param {string} expr - 'idle' | 'happy' | 'dizzy' | 'thinking' | 'sleepy' | 'battle' | 'wink' | 'skeptical' | 'look-left' | 'look-right' | 'surprised'
   */
  setExpression(expr) {
    const idleExpressions = ['idle', 'look-left', 'look-right', 'skeptical', 'sleepy', 'surprised'];
    if (!idleExpressions.includes(expr)) {
      this._cancelActiveIdleAction();
    }

    this.currentExpression = expr;
    const leftEye = document.getElementById('mascot-left-eye');
    const rightEye = document.getElementById('mascot-right-eye');
    const visor = document.getElementById('mascot-visor');
    const zzz = document.getElementById('mascot-zzz-container');

    if (!leftEye || !rightEye || !visor) return;

    // Mostrar ZZZ únicamente en modo sleepy
    if (expr === 'sleepy') {
      zzz?.classList.remove('hidden');
    } else {
      zzz?.classList.add('hidden');
    }

    // Resetear clases de animación
    const isDocked = visor.classList.contains('docked');
    const isGliding = visor.classList.contains('gliding');
    visor.className = `mascot-visor expr-${expr}${isDocked ? ' docked' : ''}${isGliding ? ' gliding' : ''}`;

    switch (expr) {
      case 'happy': // Ojos tipo arcos felices: ^ ^
        leftEye.innerHTML = `<path d="M 30,52 Q 50,22 70,52" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>`;
        rightEye.innerHTML = `<path d="M 90,52 Q 110,22 130,52" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>`;
        break;

      case 'excited': // Ojos tipo anime: > <
        leftEye.innerHTML = `<path d="M 32,32 L 64,48 L 32,64" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
        rightEye.innerHTML = `<path d="M 128,32 L 96,48 L 128,64" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
        break;

      case 'dizzy': // Ojos en X X (Fallo/confusión)
        leftEye.innerHTML = `
          <line x1="32" y1="28" x2="68" y2="64" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>
          <line x1="68" y1="28" x2="32" y2="64" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>
        `;
        rightEye.innerHTML = `
          <line x1="92" y1="28" x2="128" y2="64" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>
          <line x1="128" y1="28" x2="92" y2="64" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>
        `;
        break;

      case 'thinking': // Cejas inclinadas con ojos rectangulares concentrados
        leftEye.innerHTML = `
          <line x1="28" y1="24" x2="72" y2="34" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
          <rect x="36" y="38" width="28" height="28" rx="8" fill="currentColor"/>
        `;
        rightEye.innerHTML = `
          <line x1="132" y1="24" x2="88" y2="34" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
          <rect x="96" y="38" width="28" height="28" rx="8" fill="currentColor"/>
        `;
        break;

      case 'battle': // Concentrado y feroz para el Duelo IA
        leftEye.innerHTML = `
          <line x1="26" y1="26" x2="74" y2="38" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
          <rect x="34" y="40" width="32" height="24" rx="6" fill="currentColor"/>
        `;
        rightEye.innerHTML = `
          <line x1="134" y1="26" x2="86" y2="38" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
          <rect x="94" y="40" width="32" height="24" rx="6" fill="currentColor"/>
        `;
        break;

      case 'sleepy': // Ojos adormilados con párpados pesados semicerrados
        leftEye.innerHTML = `<path d="M 32,48 Q 50,60 68,48" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>`;
        rightEye.innerHTML = `<path d="M 92,48 Q 110,60 128,48" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>`;
        break;

      case 'surprised': // Ojos abiertos de par en par (sobresalto al despertar)
        leftEye.innerHTML = `<circle cx="48" cy="42" r="20" fill="currentColor"/>`;
        rightEye.innerHTML = `<circle cx="108" cy="42" r="20" fill="currentColor"/>`;
        break;

      case 'skeptical': // Cara de la foto: ojo izquierdo entrecerrado con ceja en bajada, ojo derecho atento con ceja alzada
        leftEye.innerHTML = `
          <path d="M 22,50 L 66,36" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
          <path d="M 32,44 L 64,36 L 64,52 Q 64,58 56,58 L 40,58 Q 32,58 32,52 Z" fill="currentColor"/>
        `;
        rightEye.innerHTML = `
          <path d="M 94,30 L 138,20" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
          <path d="M 96,30 L 126,24 L 126,52 Q 126,58 120,58 L 102,58 Q 96,58 96,52 Z" fill="currentColor"/>
        `;
        break;

      case 'look-left': // Mira a la izquierda como vacilando/curioseando
        leftEye.innerHTML = `<rect class="eye-pill" x="26" y="22" width="24" height="44" rx="10" fill="currentColor"/>`;
        rightEye.innerHTML = `<rect class="eye-pill" x="86" y="22" width="24" height="44" rx="10" fill="currentColor"/>`;
        break;

      case 'look-right': // Mira a la derecha como vacilando/curioseando
        leftEye.innerHTML = `<rect class="eye-pill" x="50" y="22" width="24" height="44" rx="10" fill="currentColor"/>`;
        rightEye.innerHTML = `<rect class="eye-pill" x="110" y="22" width="24" height="44" rx="10" fill="currentColor"/>`;
        break;

      case 'wink': // Guiño ; )
        leftEye.innerHTML = `<rect x="38" y="24" width="24" height="42" rx="10" fill="currentColor"/>`;
        rightEye.innerHTML = `<path d="M 90,52 Q 110,22 130,52" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>`;
        break;

      case 'idle':
      default: // Ojos estándar tipo píldoras verticales centradas
        leftEye.innerHTML = `<rect class="eye-pill" x="38" y="22" width="24" height="44" rx="10" fill="currentColor"/>`;
        rightEye.innerHTML = `<rect class="eye-pill" x="98" y="22" width="24" height="44" rx="10" fill="currentColor"/>`;
        break;
    }
  }

  /**
   * Pestañeo puntual con reflow forzado para garantizar animación CSS limpia
   */
  _triggerBlink() {
    const svg = document.getElementById('mascot-eyes-svg');
    if (svg && (this.currentExpression === 'idle' || this.currentExpression === 'look-left' || this.currentExpression === 'look-right')) {
      svg.classList.remove('blinking');
      void svg.offsetWidth; // Forzar reflow para reiniciar la animación
      svg.classList.add('blinking');
      setTimeout(() => svg.classList.remove('blinking'), 190);
    }
  }

  /**
   * Máquina de estados ociosa (Idle State Machine)
   * Alterna fluidamente entre parpadeos, vacilar izq/der, cara escéptica de foto, y zzz con despertar.
   * Diseñada con tolerancia a interrupciones, tokens de rutina e inmunidad a pausas involuntarias.
   */
  _startIdleCycle() {
    this._scheduleNextIdle(2500);
  }

  _scheduleNextIdle(delayMs = 3000) {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.idleTimer = setTimeout(() => {
      this._runNextIdle();
    }, delayMs);
    if (this.idleTimer && typeof this.idleTimer.unref === 'function') {
      this.idleTimer.unref();
    }
  }

  destroy() {
    this.stopMouseTracking();
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.activeIdleActionTimer) {
      clearTimeout(this.activeIdleActionTimer);
      this.activeIdleActionTimer = null;
    }
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
    if (this.closeTransitionTimer) {
      clearTimeout(this.closeTransitionTimer);
      this.closeTransitionTimer = null;
    }
  }

  _cancelActiveIdleAction() {
    if (this.activeIdleActionTimer) {
      clearTimeout(this.activeIdleActionTimer);
      this.activeIdleActionTimer = null;
    }
    this.currentIdleRoutineId++;
  }

  _runNextIdle() {
    // Si el globo de diálogo está abierto, posponer y chequear de nuevo
    if (this.isBubbleOpen) {
      this._scheduleNextIdle(2500);
      return;
    }

    // MODO EJERCICIO / JUEGO ACTIVO:
    // Para no distraer al estudiante, se suspenden completamente las animaciones
    // llamativas y los comentarios. Únicamente se permite un pestañeo sutil cada 4 a 7 segundos.
    if (this.isGamePlaying) {
      if (this.currentExpression === 'idle' || this.currentExpression === 'battle') {
        this._triggerBlink();
      }
      this._scheduleNextIdle(Math.random() * 3000 + 4000);
      return;
    }

    // Si la mascota está en una interacción pedagógica activa de juego, posponer
    const activeInteractions = ['battle', 'thinking', 'dizzy'];
    if (activeInteractions.includes(this.currentExpression)) {
      this._scheduleNextIdle(3000);
      return;
    }

    // Normalizar expresión a idle si había quedado en una pose intermedia
    if (this.currentExpression !== 'idle') {
      this.setExpression('idle');
    }

    const routineId = ++this.currentIdleRoutineId;
    const now = Date.now();
    const timeSinceLastAction = now - this.lastElaborateActionTime;
    const canDoElaborateAction = timeSinceLastAction > 25000; // Al menos 25s entre animaciones llamativas

    // La gran mayoría de las veces (78%) o si no ha pasado suficiente tiempo, hacer pestañeo natural
    if (!canDoElaborateAction || Math.random() < 0.78) {
      this._triggerBlink();
      if (Math.random() < 0.35) {
        this.activeIdleActionTimer = setTimeout(() => {
          if (routineId === this.currentIdleRoutineId && this.currentExpression === 'idle') {
            this._triggerBlink();
          }
        }, 260);
      }
      this._scheduleNextIdle(Math.random() * 3000 + 3800);
      return;
    }

    // Acción elaborada ocasional (una cada 25-45 segundos de inactividad)
    this.lastElaborateActionTime = now;
    const rand = Math.random();

    if (rand < 0.38) {
      // Rutina 2: Mirada a la izquierda, luego a la derecha, y regresar al centro
      this.setExpression('look-left');

      this.activeIdleActionTimer = setTimeout(() => {
        if (routineId !== this.currentIdleRoutineId) return;
        this.setExpression('look-right');

        this.activeIdleActionTimer = setTimeout(() => {
          if (routineId !== this.currentIdleRoutineId) return;
          this.setExpression('idle');
          this._triggerBlink();
          this._scheduleNextIdle(Math.random() * 3000 + 3500);
        }, 900);
      }, 900);

      // Fallback de seguridad en caso de desincronización
      this._scheduleNextIdle(4500);

    } else if (rand < 0.74) {
      // Rutina 3: Cara escéptica de la foto (ceja alzada) y comentario curioso espontáneo
      this.setExpression('skeptical');

      const skepticalRemarks = [
        '¿Sigues ahí?',
        '¿Te gustaría practicar?',
        '¿Dudas con las fórmulas? Haz clic en mí',
        'Observando atentamente...'
      ];
      const remark = skepticalRemarks[Math.floor(Math.random() * skepticalRemarks.length)];
      this.sayQuickRemark(`<p style="margin: 0; font-weight: 700; font-size: 0.95rem; line-height: 1.35;">${remark}</p>`, 2400, {
        isCompact: true,
        keepExpression: true
      });

      this.activeIdleActionTimer = setTimeout(() => {
        if (routineId !== this.currentIdleRoutineId) return;
        this.hideSpeechBubble();
        this.setExpression('idle');
        this._triggerBlink();
        this._scheduleNextIdle(Math.random() * 3500 + 3500);
      }, 2500);

      // Fallback de seguridad
      this._scheduleNextIdle(5000);

    } else {
      // Rutina 4: Mostrar zzz con globo botante prolongado (6 segundos) y luego despertar sobresaltado
      this.setExpression('sleepy');
      this.sayQuickRemark('<span class="zzz-bubble-text">Zzz...</span>', 5500, {
        isZzz: true,
        hideHeader: true,
        keepExpression: true
      });

      this.activeIdleActionTimer = setTimeout(() => {
        if (routineId !== this.currentIdleRoutineId) return;
        this.hideSpeechBubble();
        // Despertar sobresaltado
        this.setExpression('surprised');
        const visor = document.getElementById('mascot-visor');
        visor?.classList.add('waking-up');

        this.activeIdleActionTimer = setTimeout(() => {
          visor?.classList.remove('waking-up');
          if (routineId !== this.currentIdleRoutineId) return;
          this.setExpression('idle');
          this._triggerBlink();
          setTimeout(() => {
            if (routineId === this.currentIdleRoutineId) this._triggerBlink();
          }, 240);
          this._scheduleNextIdle(Math.random() * 3500 + 3500);
        }, 750);
      }, 6000);

      // Fallback de seguridad
      this._scheduleNextIdle(8500);
    }
  }

  /**
   * Muestra un comentario espontáneo breve para dar dinamismo a la mascota
   */
  sayQuickRemark(contentHtml, durationMs = 2800, options = {}) {
    this.showSpeechBubble(contentHtml, {
      ...options,
      isQuickRemark: true,
      durationMs
    });
  }

  /**
   * Muestra el globo de diálogo con soporte para variantes espontáneas y auto-cierre
   */
  showSpeechBubble(contentHtml, options = {}) {
    const bubble = document.getElementById('mascot-speech-bubble');
    const body = document.getElementById('mascot-bubble-body');
    const header = document.getElementById('mascot-bubble-header');
    if (!bubble || !body) return;

    this._cancelActiveIdleAction();

    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }

    if (this.closeTransitionTimer) {
      clearTimeout(this.closeTransitionTimer);
      this.closeTransitionTimer = null;
    }

    this.isQuickRemark = Boolean(options.isQuickRemark);
    body.innerHTML = contentHtml;

    // Resetear clases y aplicar modificadores de estilo
    const isDocked = this.visor && this.visor.classList.contains('docked');
    bubble.className = `mascot-speech-bubble${options.isZzz ? ' bubble-zzz' : ''}${options.isCompact ? ' bubble-compact' : ''}${options.isStreak ? ' bubble-streak' : ''}`;

    if (header) {
      if (options.hideHeader) {
        header.classList.add('hidden');
      } else {
        header.classList.remove('hidden');
      }
    }

    // Si la mascota está acoplada en una tarjeta, posicionar el globo justo encima
    if (isDocked) {
      const rect = this.visor.getBoundingClientRect();
      bubble.style.position = 'fixed';
      bubble.style.bottom = `${Math.max(20, window.innerHeight - rect.top + 14)}px`;
      bubble.style.left = `${Math.max(16, rect.left - 40)}px`;
      bubble.style.right = 'auto';
    } else {
      bubble.style.position = '';
      bubble.style.bottom = '';
      bubble.style.left = '';
      bubble.style.right = '';
    }

    bubble.classList.remove('hidden');
    this.isBubbleOpen = true;

    // Sonreír brevemente al abrir el globo si no es Zzz o si se pidió mantener expresión
    if (!options.isZzz && !options.keepExpression) {
      if (this.currentExpression === 'idle' || this.currentExpression === 'sleepy' || this.currentExpression === 'look-left' || this.currentExpression === 'look-right') {
        this.setExpression('happy');
        setTimeout(() => {
          if (this.isBubbleOpen && this.currentExpression === 'happy') {
            this.setExpression('idle');
          }
        }, 1200);
      }
    }

    // Auto-cierre del globo
    const duration = options.durationMs || 4000;
    this.autoCloseTimer = setTimeout(() => {
      this.hideSpeechBubble();
    }, duration);
  }

  /**
   * Cierra el globo de diálogo con transición suave de fade out
   * @param {boolean} immediate - Si es true, oculta instantáneamente sin esperar la animación
   */
  hideSpeechBubble(immediate = false) {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }

    if (this.closeTransitionTimer) {
      clearTimeout(this.closeTransitionTimer);
      this.closeTransitionTimer = null;
    }

    const bubble = document.getElementById('mascot-speech-bubble');
    const header = document.getElementById('mascot-bubble-header');
    if (!bubble) return;

    const finalizeHide = () => {
      bubble.className = 'mascot-speech-bubble hidden';
      bubble.style.position = '';
      bubble.style.bottom = '';
      bubble.style.left = '';
      bubble.style.right = '';
      this.isBubbleOpen = false;
      this.isQuickRemark = false;

      if (header) header.classList.remove('hidden');

      if (this.currentExpression === 'happy' || this.currentExpression === 'wink' || this.currentExpression === 'surprised') {
        this.setExpression('idle');
      }

      if (this.onBubbleClose) {
        this.onBubbleClose();
      }

      // Reactivar el ciclo ocioso de forma garantizada
      this._scheduleNextIdle(2500);
    };

    if (immediate || bubble.classList.contains('hidden')) {
      finalizeHide();
      return;
    }

    // Activar animación de salida (fade out suave)
    bubble.classList.add('closing');
    this.closeTransitionTimer = setTimeout(() => {
      this.closeTransitionTimer = null;
      finalizeHide();
    }, 180);
  }

  toggleSpeechBubble(contentHtml, options = {}) {
    if (this.isBubbleOpen) {
      this.hideSpeechBubble();
    } else {
      this.showSpeechBubble(contentHtml, options);
    }
  }
}
