/**
 * feedbackEffects.js - Microinteracciones Neo-Pop estilo Duolingo
 * Proporciona destellos verdes con fade out de 0.8s y rafagas de particulas
 * geometricas ascendentes al guardar o agregar elementos logicos (cero emojis).
 */

const DUOLINGO_COLORS = [
  '#58CC02', // Verde Duolingo
  '#46A302', // Verde sombra
  '#FFC800', // Amarillo corona
  '#1CB0F6', // Azul electrico
  '#FF9600', // Naranja
  '#FFFFFF'  // Destello blanco
];

/**
 * Dispara rafaga de pequenas particulas estilo Duolingo que flotan y desaparecen rapidamente
 */
export function spawnDuolingoParticles(targetEl) {
  if (!targetEl || !(targetEl instanceof HTMLElement)) return;

  const rect = targetEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + 4;

  const container = document.createElement('div');
  container.className = 'duolingo-particle-container';
  container.style.cssText = `
    position: fixed;
    top: ${originY}px;
    left: ${originX}px;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 100000;
  `;

  const particleCount = 10;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'duolingo-particle';

    const color = DUOLINGO_COLORS[i % DUOLINGO_COLORS.length];
    const size = 5 + Math.floor(Math.random() * 5); // 5px a 9px
    const isCircle = Math.random() > 0.4;
    const isDiamond = !isCircle && Math.random() > 0.5;

    // Angulo hacia arriba con dispersion natural
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const distance = 25 + Math.random() * 38; // distancia de vuelo
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const rot = (Math.random() - 0.5) * 360;

    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border-radius: ${isCircle ? '50%' : isDiamond ? '2px' : '3px'};
      top: -${size / 2}px;
      left: -${size / 2}px;
      --tx: ${tx}px;
      --ty: ${ty}px;
      --rot: ${rot}deg;
      animation: duolingoParticleFly 0.55s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
    `;

    container.appendChild(particle);
  }

  document.body.appendChild(container);

  setTimeout(() => {
    container.remove();
  }, 650);
}

/**
 * Pinta de verde el elemento y vuelve a su color normal en un fade out suave de 0.8s
 */
export function triggerSuccessFeedback(targetEl) {
  if (!targetEl || !(targetEl instanceof HTMLElement)) return;

  // 1. Lanzar particulas desde arriba del elemento
  spawnDuolingoParticles(targetEl);

  // 2. Activar destello verde inmediato
  targetEl.classList.remove('action-success-fadeout');
  targetEl.classList.add('action-success-flash');

  // 3. Al siguiente frame, iniciar la transicion suave de vuelta en 0.8 segundos
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      targetEl.classList.remove('action-success-flash');
      targetEl.classList.add('action-success-fadeout');

      setTimeout(() => {
        targetEl.classList.remove('action-success-fadeout');
      }, 820);
    });
  });
}
