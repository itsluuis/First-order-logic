/**
 * mascotView.js - Renderizado Visual de la Mascota Robótica OLED (SVG + CSS)
 * Basado fielmente en la referencia visual de pantalla tipo píldora/visor con ojos vectoriales
 * dinámicos y expresivos (^ ^, X X, > <, _ _, etc.), auto-cierre a 4 segundos y docking dinámico.
 */

export class MascotView {
  constructor(containerId = 'mascot-global-widget') {
    this.container = document.getElementById(containerId);
    this.currentExpression = 'idle';
    this.isBubbleOpen = false;
    this.blinkTimer = null;
    this.autoCloseTimer = null;
    this.onMascotClick = null;
    this.onBubbleClose = null;

    this._initDOM();
    this._startBlinking();
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
        <div class="mascot-bubble-header">
          <div class="mascot-bubble-title">
            <span class="mascot-status-dot"></span>
            <strong>Boleano</strong>
            <span class="mascot-role-tag">Tutor IA</span>
          </div>
        </div>
        <div id="mascot-bubble-body" class="mascot-bubble-content">
          Soy <strong>Boleano</strong>. Haz clic sobre mí en cualquier momento si tienes dudas o necesitas una explicación lógica.
        </div>
      </div>

      <!-- Cuerpo del Visor Robótico OLED -->
      <div id="mascot-visor" class="mascot-visor" title="Haz clic para pedir una explicación a Boleano">
        <div class="mascot-screen-glow"></div>
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
   * Acopla la mascota dentro de un contenedor específico (Centro de Prácticas o Resumen)
   */
  dockTo(targetElement) {
    if (!targetElement || !this.visor) return;
    targetElement.innerHTML = '';
    targetElement.appendChild(this.visor);
    this.visor.classList.add('docked');
  }

  /**
   * Regresa la mascota a su contenedor flotante en la esquina inferior derecha
   */
  undock() {
    if (!this.container || !this.visor) return;
    if (this.visor.parentElement !== this.container) {
      this.container.appendChild(this.visor);
      this.visor.classList.remove('docked');
    }
  }

  /**
   * Cambia la expresión facial de la mascota
   * @param {string} expr - 'idle' | 'happy' | 'dizzy' | 'thinking' | 'sleepy' | 'battle' | 'wink'
   */
  setExpression(expr) {
    this.currentExpression = expr;
    const leftEye = document.getElementById('mascot-left-eye');
    const rightEye = document.getElementById('mascot-right-eye');
    const visor = document.getElementById('mascot-visor');

    if (!leftEye || !rightEye || !visor) return;

    // Resetear clases de animación
    const isDocked = visor.classList.contains('docked');
    visor.className = `mascot-visor expr-${expr}${isDocked ? ' docked' : ''}`;

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

      case 'thinking': // Cejas inclinadas con ojos rectangulares concentrados (fila 2 de referencia)
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

      case 'sleepy': // Líneas inferiores semicerradas _ _
        leftEye.innerHTML = `<path d="M 32,48 Q 50,62 68,48" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>`;
        rightEye.innerHTML = `<path d="M 92,48 Q 110,62 128,48" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>`;
        break;

      case 'wink': // Guiño ; )
        leftEye.innerHTML = `<rect x="38" y="24" width="24" height="42" rx="10" fill="currentColor"/>`;
        rightEye.innerHTML = `<path d="M 90,52 Q 110,22 130,52" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"/>`;
        break;

      case 'idle':
      default: // Ojos estándar tipo píldoras verticales con esquinas suaves
        leftEye.innerHTML = `<rect class="eye-pill" x="38" y="22" width="24" height="44" rx="10" fill="currentColor"/>`;
        rightEye.innerHTML = `<rect class="eye-pill" x="98" y="22" width="24" height="44" rx="10" fill="currentColor"/>`;
        break;
    }
  }

  /**
   * Animación de pestañeo espontáneo
   */
  _startBlinking() {
    const triggerBlink = () => {
      if (this.currentExpression === 'idle') {
        const svg = document.getElementById('mascot-eyes-svg');
        if (svg) {
          svg.classList.add('blinking');
          setTimeout(() => {
            svg.classList.remove('blinking');
          }, 180);
        }
      }
      const nextTime = Math.random() * 3500 + 2500;
      this.blinkTimer = setTimeout(triggerBlink, nextTime);
    };

    this.blinkTimer = setTimeout(triggerBlink, 3000);
  }

  /**
   * Muestra el globo de diálogo con auto-cierre exacto a los 4 segundos
   */
  showSpeechBubble(contentHtml) {
    const bubble = document.getElementById('mascot-speech-bubble');
    const body = document.getElementById('mascot-bubble-body');
    if (!bubble || !body) return;

    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }

    body.innerHTML = contentHtml;
    bubble.classList.remove('hidden');
    this.isBubbleOpen = true;

    // Sonreír brevemente al abrir el globo
    if (this.currentExpression === 'idle') {
      this.setExpression('happy');
      setTimeout(() => {
        if (this.isBubbleOpen && this.currentExpression === 'happy') {
          this.setExpression('idle');
        }
      }, 1200);
    }

    // Auto-cierre estricto a los 4 segundos
    this.autoCloseTimer = setTimeout(() => {
      this.hideSpeechBubble();
    }, 4000);
  }

  /**
   * Cierra el globo de diálogo
   */
  hideSpeechBubble() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }

    const bubble = document.getElementById('mascot-speech-bubble');
    if (!bubble) return;

    bubble.classList.add('hidden');
    this.isBubbleOpen = false;

    if (this.currentExpression === 'happy' || this.currentExpression === 'wink') {
      this.setExpression('idle');
    }

    if (this.onBubbleClose) {
      this.onBubbleClose();
    }
  }

  toggleSpeechBubble(contentHtml) {
    if (this.isBubbleOpen) {
      this.hideSpeechBubble();
    } else {
      this.showSpeechBubble(contentHtml);
    }
  }
}
