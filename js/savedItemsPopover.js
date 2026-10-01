/**
 * savedItemsPopover.js - Componente UI Reutilizable de Popover Contextual NeoPop
 * Despliega el banco de guardados (atomicas, FBF, moleculares) con selector de letra,
 * contador de cuota interno y eliminacion con icono vectorial (cero emojis).
 */

import { ICONS } from './icons.js';
import { triggerSuccessFeedback } from './feedbackEffects.js';

export class SavedItemsPopover {
  constructor() {
    this.activePopover = null;
    this.currentOptions = null;
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Abre o actualiza el popover contextual
   */
  open(options) {
    this.close();
    this.currentOptions = options;

    const {
      anchorEl,
      category,
      title = 'Elementos Guardados',
      items = [],
      quotaInfo = { current: 0, max: 15 },
      onInsertDirect,
      onInsertAt,
      onDelete
    } = options;

    if (!anchorEl) return;

    const popover = document.createElement('div');
    popover.className = 'saved-items-popover neo-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', title);

    // Encabezado con titulo, cuota interna y boton cerrar
    const header = document.createElement('div');
    header.className = 'saved-popover-header';
    header.innerHTML = `
      <div class="saved-popover-title-row">
        <span class="saved-popover-icon">${ICONS.folder}</span>
        <span class="saved-popover-title">${this.escapeHtml(title)}</span>
      </div>
      <div class="saved-popover-header-actions">
        <span class="saved-popover-quota badge" title="Uso de capacidad">${quotaInfo.current} / ${quotaInfo.max}</span>
        <button class="btn-clear-inline btn-close-popover" title="Cerrar ventana">${ICONS.close}</button>
      </div>
    `;
    popover.appendChild(header);

    // Contenedor de lista
    const list = document.createElement('div');
    list.className = 'saved-items-list';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'saved-popover-empty';
      empty.innerHTML = `
        <p class="text-muted" style="margin: 0; font-size: 0.85rem;">
          No tienes elementos guardados en esta categoria.
        </p>
      `;
      list.appendChild(empty);
    } else {
      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'saved-item-row';
        row.setAttribute('data-id', item.id);

        let contentHtml = '';
        if (category === 'atomics') {
          contentHtml = `<div class="saved-item-text" title="${this.escapeHtml(item.text)}">${this.escapeHtml(item.text)}</div>`;
        } else if (category === 'fbf') {
          contentHtml = `<div class="saved-item-text formula-text" style="font-family: var(--font-mono); color: var(--accent-cyan);" title="${this.escapeHtml(item.formula)}">${this.escapeHtml(item.formula)}</div>`;
        } else if (category === 'molecules') {
          contentHtml = `
            <div class="saved-item-molecule-col">
              <div class="saved-item-text" title="${this.escapeHtml(item.sentence)}">${this.escapeHtml(item.sentence)}</div>
              <div class="saved-item-fbf-sub" style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-purple);">${this.escapeHtml(item.fbf)}</div>
            </div>
          `;
        }

        row.innerHTML = `
          ${contentHtml}
          <div class="saved-item-actions">
            <button class="btn btn-xs btn-primary btn-insert-direct" title="Insertar en primer espacio disponible">
              Insertar
            </button>
            ${category === 'atomics' && onInsertAt ? `
              <div class="saved-item-var-pills" title="Asignar a letra especifica">
                <button class="btn-var-pill" data-var="p">p</button>
                <button class="btn-var-pill" data-var="q">q</button>
                <button class="btn-var-pill" data-var="r">r</button>
                <button class="btn-var-pill" data-var="s">s</button>
                <button class="btn-var-pill" data-var="t">t</button>
              </div>
            ` : ''}
            <button class="btn-clear-inline btn-delete-saved" title="Eliminar de guardados" style="color: var(--accent-rose);">
              ${ICONS.trash}
            </button>
          </div>
        `;

        // Eventos de los botones de la fila
        const btnInsertDirect = row.querySelector('.btn-insert-direct');
        if (btnInsertDirect && onInsertDirect) {
          btnInsertDirect.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerSuccessFeedback(row);
            setTimeout(() => {
              onInsertDirect(item);
              this.close();
            }, 120);
          });
        }

        row.querySelectorAll('.btn-var-pill').forEach(pill => {
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const varLetter = pill.getAttribute('data-var');
            triggerSuccessFeedback(pill);
            setTimeout(() => {
              if (onInsertAt) {
                onInsertAt(item, varLetter);
                this.close();
              }
            }, 120);
          });
        });

        const btnDelete = row.querySelector('.btn-delete-saved');
        if (btnDelete && onDelete) {
          btnDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            onDelete(item);
          });
        }

        list.appendChild(row);
      });
    }

    popover.appendChild(list);
    document.body.appendChild(popover);
    this.activePopover = popover;

    // Posicionamiento dinamico en viewport (Fixed)
    this.positionPopover(anchorEl, popover);

    // Boton cerrar
    popover.querySelector('.btn-close-popover')?.addEventListener('click', () => this.close());

    // Listeners globales para cerrar al hacer clic afuera o pulsar Escape
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleKeyDown);
    }, 10);
  }

  /**
   * Abre un popover para seleccionar cual letra/proposicion atomica se desea guardar
   */
  openSaveSelector({ anchorEl, title = 'Seleccionar Proposicion a Guardar', options = [], onSelect }) {
    this.close();

    if (!anchorEl) return;

    const popover = document.createElement('div');
    popover.className = 'saved-items-popover neo-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', title);

    const header = document.createElement('div');
    header.className = 'saved-popover-header';
    header.innerHTML = `
      <div class="saved-popover-title-row">
        <span class="saved-popover-icon">${ICONS.save}</span>
        <span class="saved-popover-title">${this.escapeHtml(title)}</span>
      </div>
      <div class="saved-popover-header-actions">
        <button class="btn-clear-inline btn-close-popover" title="Cerrar ventana">${ICONS.close}</button>
      </div>
    `;
    popover.appendChild(header);

    const list = document.createElement('div');
    list.className = 'saved-items-list';

    if (options.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'saved-popover-empty';
      empty.innerHTML = `
        <p class="text-muted" style="margin: 0; font-size: 0.85rem;">
          No hay enunciados escritos para guardar.
        </p>
      `;
      list.appendChild(empty);
    } else {
      options.forEach(opt => {
        const row = document.createElement('div');
        row.className = 'saved-item-row saved-select-row';
        row.innerHTML = `
          <div class="saved-select-content">
            <span class="atomic-var-badge">${this.escapeHtml(opt.letter)}</span>
            <span class="saved-item-text" title="${this.escapeHtml(opt.text)}">"${this.escapeHtml(opt.text)}"</span>
          </div>
          <button class="btn btn-xs btn-primary btn-save-chosen" title="Guardar proposicion de ${this.escapeHtml(opt.letter)}">
            Guardar
          </button>
        `;

        row.querySelector('.btn-save-chosen')?.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerSuccessFeedback(row);
          setTimeout(() => {
            this.close();
            if (onSelect) onSelect(opt);
          }, 120);
        });

        list.appendChild(row);
      });
    }

    popover.appendChild(list);
    document.body.appendChild(popover);
    this.activePopover = popover;

    this.positionPopover(anchorEl, popover);

    popover.querySelector('.btn-close-popover')?.addEventListener('click', () => this.close());

    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('keydown', this.handleKeyDown);
    }, 10);
  }

  /**
   * Calcula coordenadas para anclar el popover al elemento disparador
   */
  positionPopover(anchorEl, popover) {
    const rect = anchorEl.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();

    let top = rect.bottom + 8;
    let left = rect.left;

    // Evitar que se desborde por la derecha
    if (left + popoverRect.width > window.innerWidth - 12) {
      left = window.innerWidth - popoverRect.width - 12;
    }
    if (left < 12) left = 12;

    // Si se desborda por abajo, mostrar hacia arriba
    if (top + popoverRect.height > window.innerHeight - 12) {
      top = rect.top - popoverRect.height - 8;
    }
    if (top < 12) top = 12;

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  handleOutsideClick(e) {
    if (!this.activePopover) return;
    if (!this.activePopover.contains(e.target) && !e.target.closest('.saved-picker-trigger')) {
      this.close();
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  close() {
    if (this.activePopover) {
      document.removeEventListener('click', this.handleOutsideClick);
      document.removeEventListener('keydown', this.handleKeyDown);
      this.activePopover.remove();
      this.activePopover = null;
      this.currentOptions = null;
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const savedItemsPopover = new SavedItemsPopover();
