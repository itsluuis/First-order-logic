/**
 * practiceView.js - Renderizado y Coordinación de la Interfaz del Centro de Prácticas
 * Gestiona el menú interactivo con hover/zoom, renderizado de árbol jerárquico (.tree),
 * temporizador visual, bloqueo anti-spam con cooldown, y docking de la Mascota OLED.
 * Libre de emojis en favor de iconos vectoriales SVG.
 */

import { GAME_DIFFICULTIES } from './practiceEngine.js';
import { ICONS } from '../icons.js';

export class PracticeView {
  constructor(containerId = 'practice-center-container') {
    this.container = document.getElementById(containerId);
    this.onSelectGame = null;
    this.onExitGame = null;
    this.onAnswer = null;
    this.onPlayAgain = null;
    this.onLobbyRendered = null;
    this.onSummaryRendered = null;
    this.onArenaRendered = null;

    // Estado del canvas de tokens para Moleculares
    this.molecularTokens = [];
    // Bloqueo anti-spam y cooldown entre ejercicios
    this.isLocked = false;
  }

  /**
   * Renderiza el Lobby (Menú de Selección de Minijuegos)
   */
  renderLobby(recommendation = null) {
    if (!this.container) return;
    this.isLocked = false;

    let recBannerHtml = '';
    if (recommendation) {
      recBannerHtml = `
        <div class="practice-rec-card">
          <div id="mascot-dock-slot" class="mascot-dock-slot"></div>
          <div class="practice-rec-content">
            <div class="practice-rec-badge">Diagnóstico de la Red Neuronal</div>
            <p>${recommendation.message}</p>
          </div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="practice-lobby">
        <div class="practice-header">
          <div>
            <h2 class="practice-title">Centro de Prácticas Global</h2>
            <p class="practice-subtitle">Pon a prueba tu agilidad mental y lógica simbólica con 4 minijuegos interactivos.</p>
          </div>
        </div>

        ${recBannerHtml}

        <div class="minigames-grid">
          <!-- Minijuego 1: Árbol Correcto -->
          <div class="minigame-card" data-game-id="tree">
            <div class="minigame-icon-svg">${ICONS.tree}</div>
            <h3 class="minigame-title">Árbol Correcto</h3>
            <p class="minigame-desc">Analiza el árbol sintáctico generado aleatoriamente y deduce a qué Fórmula Bien Formada corresponde entre 4 opciones.</p>
            <div class="minigame-footer">
              <label class="diff-label">Dificultad:</label>
              <select class="diff-select" id="diff-tree">
                <option value="facil">Fácil (2 min)</option>
                <option value="normal" selected>Normal (1:30 min)</option>
                <option value="dificil">Difícil (30 seg)</option>
              </select>
              <button class="btn btn-primary btn-play-game" data-game="tree">
                <span class="btn-icon-slot">${ICONS.play}</span> Jugar
              </button>
            </div>
          </div>

          <!-- Minijuego 2: Moleculares -->
          <div class="minigame-card" data-game-id="molecular">
            <div class="minigame-icon-svg">${ICONS.puzzle}</div>
            <h3 class="minigame-title">Moleculares</h3>
            <p class="minigame-desc">Lee una proposición molecular en lenguaje cotidiano y construye su fórmula formal exacta usando bloques de tokens interactivos.</p>
            <div class="minigame-footer">
              <label class="diff-label">Dificultad:</label>
              <select class="diff-select" id="diff-molecular">
                <option value="facil">Fácil (5 min)</option>
                <option value="normal" selected>Normal (2:30 min)</option>
                <option value="dificil">Difícil (1:30 min)</option>
              </select>
              <button class="btn btn-primary btn-play-game" data-game="molecular">
                <span class="btn-icon-slot">${ICONS.play}</span> Jugar
              </button>
            </div>
          </div>

          <!-- Minijuego 3: Veredicto -->
          <div class="minigame-card" data-game-id="verdict">
            <div class="minigame-icon-svg">${ICONS.scale}</div>
            <h3 class="minigame-title">Veredicto</h3>
            <p class="minigame-desc">Observa la fórmula lógica y decide a toda velocidad: ¿es Tautología, Contradicción o Contingencia? Los fallos penalizan.</p>
            <div class="minigame-footer">
              <label class="diff-label">Dificultad:</label>
              <select class="diff-select" id="diff-verdict">
                <option value="facil">Fácil (2 min)</option>
                <option value="normal" selected>Normal (1:30 min)</option>
                <option value="dificil">Difícil (45 seg)</option>
              </select>
              <button class="btn btn-primary btn-play-game" data-game="verdict">
                <span class="btn-icon-slot">${ICONS.play}</span> Jugar
              </button>
            </div>
          </div>

          <!-- Minijuego 4: Duelo contra la Mascota IA -->
          <div class="minigame-card duel-card" data-game-id="duel">
            <div class="minigame-icon-svg">${ICONS.bolt}</div>
            <h3 class="minigame-title">Duelo contra la Mascota IA</h3>
            <p class="minigame-desc">Compite en tiempo real contra Boleano evaluando si una fórmula es Verdadera o Falsa. La IA evalúa la fórmula y comete fallos controlados.</p>
            <div class="minigame-footer">
              <label class="diff-label">Dificultad:</label>
              <select class="diff-select" id="diff-duel">
                <option value="facil">Fácil (2 min)</option>
                <option value="normal" selected>Normal (1:30 min)</option>
                <option value="dificil">Difícil (1 min)</option>
              </select>
              <button class="btn btn-primary btn-play-game" data-game="duel">
                <span class="btn-icon-slot">${ICONS.swords}</span> Desafiar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Vincular clics de inicio de juego
    this.container.querySelectorAll('.btn-play-game').forEach(btn => {
      btn.addEventListener('click', () => {
        const gameId = btn.getAttribute('data-game');
        const diffSelect = document.getElementById(`diff-${gameId}`);
        const difficulty = diffSelect ? diffSelect.value : 'normal';

        if (this.onSelectGame) {
          this.onSelectGame(gameId, difficulty);
        }
      });
    });

    if (this.onLobbyRendered) {
      this.onLobbyRendered();
    }
  }

  /**
   * Renderiza el marco de arena activa de juego con barra de estado superior
   */
  renderGameArena(gameTitle, isDuel = false) {
    if (!this.container) return;
    this.isLocked = false;

    const scoreBadge = isDuel 
      ? `<span class="score-pill">Jugador: <strong id="arena-player-score">0</strong></span> <span class="score-pill bot">Boleano: <strong id="arena-bot-score">0</strong></span>`
      : `<span class="score-pill">Aciertos: <strong id="arena-player-score">0</strong></span>`;

    this.container.innerHTML = `
      <div class="game-arena-wrapper">
        <div class="arena-top-bar">
          <button id="btn-arena-exit" class="btn btn-secondary" title="Abandonar partida y volver al menú">
            ← Salir al Menú
          </button>
          
          <div class="arena-title-tag">
            <span>${gameTitle}</span>
          </div>

          <div class="arena-stats-group">
            ${scoreBadge}
            <div id="arena-timer" class="arena-timer-pill" title="Tiempo restante">
              <span class="timer-icon">${ICONS.timer}</span>
              <span id="timer-display">00:00</span>
            </div>
          </div>
        </div>

        <!-- Contenedor del Desafío Específico -->
        <div id="arena-board" class="arena-board"></div>
      </div>
    `;

    document.getElementById('btn-arena-exit')?.addEventListener('click', () => {
      if (this.onExitGame) this.onExitGame();
    });

    if (this.onArenaRendered) {
      this.onArenaRendered();
    }
  }

  /**
   * Actualiza el temporizador en pantalla
   */
  updateTimerDisplay(seconds) {
    const display = document.getElementById('timer-display');
    const timerPill = document.getElementById('arena-timer');
    if (!display) return;

    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    display.textContent = `${m}:${s}`;

    if (seconds <= 10) {
      timerPill?.classList.add('timer-warning');
    } else {
      timerPill?.classList.remove('timer-warning');
    }
  }

  /**
   * Actualiza el marcador
   */
  updateScore(scores) {
    const pScore = document.getElementById('arena-player-score');
    const bScore = document.getElementById('arena-bot-score');
    if (pScore) pScore.textContent = scores.score;
    if (bScore) bScore.textContent = scores.botScore;
  }

  // =========================================================================
  // VISTAS DE CADA DESAFÍO
  // =========================================================================

  /**
   * Renderiza el tablero de Árbol Correcto (con clase .tree para dibujar ramas)
   */
  renderTreeChallenge(challenge) {
    const board = document.getElementById('arena-board');
    if (!board) return;
    this.isLocked = false;

    board.innerHTML = `
      <div class="challenge-card">
        <div class="challenge-prompt">
          Identifica la Fórmula Bien Formada (FBF) que genera este árbol sintáctico:
        </div>

        <div class="tree-display-container">
          <div class="tree">
            <ul>${this._buildTreeHtml(challenge.treeData)}</ul>
          </div>
        </div>

        <div class="options-grid-4" id="tree-options-container">
          ${challenge.options.map((opt, idx) => `
            <button class="btn btn-option" data-fbf="${this._escapeHtml(opt.fbf)}" data-idx="${idx}">
              ${opt.fbf}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    board.querySelectorAll('.btn-option').forEach(btn => {
      btn.addEventListener('click', () => {
        // Bloqueo anti-spam: Si ya se está evaluando la respuesta correcta, ignorar clics adicionales
        if (this.isLocked) return;

        const selectedFBF = btn.getAttribute('data-fbf');
        if (this.onAnswer) {
          const res = this.onAnswer({ type: 'tree', selectedFBF, buttonEl: btn });
          if (res && res.isCorrect) {
            // Activar bloqueo de cooldown de inmediato
            this.isLocked = true;
            btn.classList.add('option-correct');
            board.querySelectorAll('.btn-option').forEach(b => {
              b.disabled = true;
            });
          } else if (res && !res.isCorrect) {
            btn.disabled = true;
            btn.classList.add('option-disabled');
          }
        }
      });
    });
  }

  /**
   * Renderiza el tablero de Moleculares
   */
  renderMolecularChallenge(challenge) {
    const board = document.getElementById('arena-board');
    if (!board) return;
    this.isLocked = false;

    this.molecularTokens = [];

    const varListHtml = Object.entries(challenge.varMap).map(([v, text]) => `
      <div class="var-spec-chip">
        <strong>${v}</strong>: "${text}"
      </div>
    `).join('');

    board.innerHTML = `
      <div class="challenge-card">
        <div class="challenge-prompt">
          Construye la Fórmula Bien Formada (FBF) para la siguiente proposición en lenguaje natural:
        </div>

        <div class="natural-phrase-box">
          "${challenge.naturalText}"
        </div>

        <div class="var-specs-row">
          ${varListHtml}
        </div>

        <!-- Lienzo de tokens armados -->
        <div class="molecular-canvas" id="molecular-canvas-box">
          <span class="placeholder-text" id="canvas-placeholder">Toca los botones inferiores para armar la fórmula...</span>
          <div id="molecular-tokens-list" class="tokens-list"></div>
        </div>

        <div id="molecular-feedback" class="molecular-feedback hidden"></div>

        <!-- Paleta de Bloques -->
        <div class="molecular-palette">
          <div class="palette-group">
            ${challenge.variables.map(v => `
              <button class="btn btn-token-key var-key" data-token-type="var" data-token-val="${v}">
                ${v}
              </button>
            `).join('')}
          </div>

          <div class="palette-divider"></div>

          <div class="palette-group">
            <button class="btn btn-token-key op-key" data-token-type="op" data-token-val="NOT">¬</button>
            <button class="btn btn-token-key op-key" data-token-type="op" data-token-val="AND">∧</button>
            <button class="btn btn-token-key op-key" data-token-type="op" data-token-val="OR">∨</button>
            <button class="btn btn-token-key op-key" data-token-type="op" data-token-val="IMPLIES">→</button>
            <button class="btn btn-token-key op-key" data-token-type="op" data-token-val="IFF">↔</button>
          </div>

          <div class="palette-divider"></div>

          <div class="palette-group">
            <button class="btn btn-token-key paren-key" data-token-type="paren" data-token-val="(">(</button>
            <button class="btn btn-token-key paren-key" data-token-type="paren" data-token-val=")">)</button>
            <button id="btn-token-backspace" class="btn btn-token-action" title="Borrar último">⌫</button>
            <button id="btn-token-clear" class="btn btn-token-action" title="Vaciar lienzo">Limpiar</button>
          </div>

          <div class="palette-divider"></div>

          <button id="btn-verify-molecular" class="btn btn-primary" style="padding: 0.6rem 1.2rem; font-weight: 600;">
            Comprobar Fórmula
          </button>
        </div>
      </div>
    `;

    // Eventos de paleta
    board.querySelectorAll('.btn-token-key').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isLocked) return;
        const type = btn.getAttribute('data-token-type');
        const value = btn.getAttribute('data-token-val');
        this.molecularTokens.push({ type, value });
        this._updateMolecularCanvas();
      });
    });

    document.getElementById('btn-token-backspace')?.addEventListener('click', () => {
      if (this.isLocked) return;
      this.molecularTokens.pop();
      this._updateMolecularCanvas();
    });

    document.getElementById('btn-token-clear')?.addEventListener('click', () => {
      if (this.isLocked) return;
      this.molecularTokens = [];
      this._updateMolecularCanvas();
    });

    document.getElementById('btn-verify-molecular')?.addEventListener('click', () => {
      if (this.isLocked) return;

      if (this.onAnswer) {
        const feedbackEl = document.getElementById('molecular-feedback');
        const res = this.onAnswer({ type: 'molecular', tokens: this.molecularTokens });
        if (res && feedbackEl) {
          feedbackEl.textContent = res.feedback;
          feedbackEl.className = `molecular-feedback ${res.isCorrect ? 'correct' : 'incorrect'}`;
          feedbackEl.classList.remove('hidden');

          if (res.isCorrect) {
            this.isLocked = true;
          }
        }
      }
    });
  }

  _updateMolecularCanvas() {
    const list = document.getElementById('molecular-tokens-list');
    const placeholder = document.getElementById('canvas-placeholder');
    if (!list) return;

    if (this.molecularTokens.length === 0) {
      list.innerHTML = '';
      placeholder?.classList.remove('hidden');
      return;
    }

    placeholder?.classList.add('hidden');
    const symbols = { NOT: '¬', AND: '∧', OR: '∨', IMPLIES: '→', IFF: '↔' };

    list.innerHTML = this.molecularTokens.map((t, idx) => {
      const displayVal = symbols[t.value] || t.value;
      const tClass = t.type === 'var' ? 'token-var' : t.type === 'op' ? 'token-op' : 'token-paren';
      return `<span class="canvas-token ${tClass}">${displayVal}</span>`;
    }).join('');
  }

  /**
   * Renderiza el tablero de Veredicto (sin emojis en los botones)
   */
  renderVerdictChallenge(challenge) {
    const board = document.getElementById('arena-board');
    if (!board) return;
    this.isLocked = false;

    board.innerHTML = `
      <div class="challenge-card">
        <div class="challenge-prompt">
          Determina el veredicto lógico formal de la siguiente fórmula:
        </div>

        <div class="fbf-showcase-box">
          <code>${challenge.fbfString}</code>
        </div>

        <div class="verdict-buttons-row">
          <button class="btn btn-verdict btn-tautology" data-verdict="TAUTOLOGÍA">
            TAUTOLOGÍA
          </button>
          <button class="btn btn-verdict btn-contingency" data-verdict="CONTINGENCIA">
            CONTINGENCIA
          </button>
          <button class="btn btn-verdict btn-contradiction" data-verdict="CONTRADICCIÓN">
            CONTRADICCIÓN
          </button>
        </div>
      </div>
    `;

    board.querySelectorAll('.btn-verdict').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isLocked) return;
        this.isLocked = true;

        const verdict = btn.getAttribute('data-verdict');
        board.querySelectorAll('.btn-verdict').forEach(b => b.disabled = true);

        if (this.onAnswer) {
          this.onAnswer({ type: 'verdict', selectedVerdict: verdict, buttonEl: btn });
        }
      });
    });
  }

  /**
   * Renderiza el tablero de Duelo contra la Mascota IA
   */
  renderDuelChallenge(challenge) {
    const board = document.getElementById('arena-board');
    if (!board) return;
    this.isLocked = false;

    const valuesListHtml = Object.entries(challenge.assignments).map(([v, val]) => `
      <span class="value-chip ${val ? 'val-true' : 'val-false'}">
        ${v} = <strong>${val ? 'V' : 'F'}</strong>
      </span>
    `).join(' ');

    board.innerHTML = `
      <div class="challenge-card">
        <div class="challenge-prompt">
          ¿La proposición es Verdadera o Falsa bajo las siguientes asignaciones?
        </div>

        <div class="duel-assignments-box">
          ${valuesListHtml}
        </div>

        <div class="fbf-showcase-box">
          <code>${challenge.fbfString}</code>
        </div>

        <div id="duel-mascot-status" class="duel-mascot-status">
          Boleano está evaluando mentalmente la fórmula...
        </div>

        <div class="duel-action-row">
          <button class="btn btn-truth-val btn-true" data-truth="true">
            VERDADERO (V)
          </button>
          <button class="btn btn-truth-val btn-false" data-truth="false">
            FALSO (F)
          </button>
        </div>
      </div>
    `;

    board.querySelectorAll('.btn-truth-val').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isLocked) return;
        this.isLocked = true;

        const val = btn.getAttribute('data-truth') === 'true';
        board.querySelectorAll('.btn-truth-val').forEach(b => b.disabled = true);

        if (this.onAnswer) {
          this.onAnswer({ type: 'duel', playerValue: val });
        }
      });
    });
  }

  updateDuelMascotBanner(text, isAlert = false) {
    const statusEl = document.getElementById('duel-mascot-status');
    if (statusEl) {
      statusEl.textContent = text;
      if (isAlert) statusEl.classList.add('status-alert');
      else statusEl.classList.remove('status-alert');
    }
  }

  /**
   * Renderiza la Pantalla de Resumen Final (con espacio dedicado para la mascota)
   */
  renderSummary(summary) {
    if (!this.container) return;
    this.isLocked = false;

    const rec = summary.recommendation || { message: 'Sigue practicando para elevar tu nivel de agilidad lógica.' };
    const duelComparison = summary.gameId === 'duel'
      ? `<div class="duel-result-score">Jugador: <strong>${summary.score}</strong> vs Boleano: <strong>${summary.botScore}</strong></div>`
      : '';

    this.container.innerHTML = `
      <div class="practice-summary-card">
        <div class="summary-badge">Tiempo Agotado</div>
        <h2 class="summary-title">Resumen de tu Desempeño</h2>
        
        <div class="summary-stats-grid">
          <div class="summary-stat-box">
            <span class="stat-num">${summary.score}</span>
            <span class="stat-label">Aciertos Logrados</span>
          </div>
          <div class="summary-stat-box">
            <span class="stat-num">${summary.accuracy}%</span>
            <span class="stat-label">Precisión</span>
          </div>
          <div class="summary-stat-box">
            <span class="stat-num">${summary.totalAttempts}</span>
            <span class="stat-label">Ejercicios Intentados</span>
          </div>
        </div>

        ${duelComparison}

        <!-- Caja de Recomendación con espacio dedicado para la Mascota OLED -->
        <div class="summary-mascot-box">
          <div id="mascot-dock-slot" class="mascot-dock-slot"></div>
          <div class="summary-mascot-message">
            <h4>Análisis de la Red Neuronal</h4>
            <p>${rec.message}</p>
          </div>
        </div>

        <div class="summary-actions">
          <button id="btn-summary-replay" class="btn btn-primary" style="padding: 0.75rem 1.5rem;">
            <span class="btn-icon-slot">${ICONS.replay}</span> Jugar de Nuevo
          </button>
          <button id="btn-summary-lobby" class="btn btn-secondary" style="padding: 0.75rem 1.5rem;">
            <span class="btn-icon-slot">${ICONS.menu}</span> Volver al Menú
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-summary-replay')?.addEventListener('click', () => {
      if (this.onPlayAgain) this.onPlayAgain(summary.gameId, summary.difficulty);
    });

    document.getElementById('btn-summary-lobby')?.addEventListener('click', () => {
      this.renderLobby(summary.recommendation);
    });

    if (this.onSummaryRendered) {
      this.onSummaryRendered();
    }
  }

  // Helper jerárquico para el árbol
  _buildTreeHtml(node) {
    if (!node) return '';
    const isOp = node.type === 'binary' || node.type === 'unary';
    const nodeClass = isOp ? 'tree-node node-op' : 'tree-node node-var';
    let html = `<li><div class="${nodeClass}" title="${node.description || ''}">${node.label}</div>`;
    if (node.children && node.children.length > 0) {
      html += '<ul>';
      node.children.forEach(child => {
        html += this._buildTreeHtml(child);
      });
      html += '</ul>';
    }
    html += '</li>';
    return html;
  }

  _escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
