/**
 * mascotView.js - Renderizado Visual de la Mascota Robótica OLED (SVG + CSS)
 * Basado fielmente en la referencia visual de pantalla tipo píldora/visor con ojos vectoriales
 * dinámicos y expresivos (^ ^, X X, > <, _ _, etc.) y globo de diálogo contextual.
 */

export class MascotView {
  constructor(containerId = 'mascot-global-widget') {
    this.container = document.getElementById(containerId);
    this.currentExpression = 'idle';
    this.isBubbleOpen = false;
    this.blinkTimer = null;
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
      <!-- Globo de Diálogo Flotante -->
      <div id="mascot-speech-bubble" class="mascot-speech-bubble hidden">
        <div class="mascot-bubble-header">
          <div class="mascot-bubble-title">
            <span class="mascot-status-dot"></span>
            <strong>Boleano</strong>
            <span class="mascot-role-tag">Tutor IA</span>
          </div>
          <button id="mascot-bubble-close-btn" class="mascot-bubble-close" title="Cerrar">✕</button>
        </div>
        <div id="mascot-bubble-body" class="mascot-bubble-content">
          ¡Hola! Soy <strong>Boleano</strong>. Haz clic sobre mí en cualquier momento si tienes dudas o necesitas una explicación lógica.
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

    // Eventos
    const visor = document.getElementById('mascot-visor');
    visor?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onMascotClick) this.onMascotClick();
    });

    const closeBtn = document.getElementById('mascot-bubble-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideSpeechBubble();
      if (this.onBubbleClose) this.onBubbleClose();
    });

    // Renderizar expresión inicial
    this.setExpression('idle');
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
    visor.className = `mascot-visor expr-${expr}`;

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
   * Muestra el globo de diálogo con contenido HTML o texto
   */
  showSpeechBubble(contentHtml) {
    const bubble = document.getElementById('mascot-speech-bubble');
    const body = document.getElementById('mascot-bubble-body');
    if (!bubble || !body) return;

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
  }

  /**
   * Cierra el globo de diálogo
   */
  hideSpeechBubble() {
    const bubble = document.getElementById('mascot-speech-bubble');
    if (!bubble) return;

    bubble.classList.add('hidden');
    this.isBubbleOpen = false;

    if (this.currentExpression === 'happy' || this.currentExpression === 'wink') {
      this.setExpression('idle');
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
