# Plan de Implementación: Últimos Elementos Lógicos (Juegos Admin, Ojos Moli y Secciones Vivas)

> **For Claude / Agent:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Implementar el control de disponibilidad de minijuegos para el Administrador, el seguimiento ocular interactivo con el cursor en Moli durante las partidas, y la mensajería reactiva pedagógica en la pestaña Secciones.

**Architecture:** Extensión modular en `storage.js` para persistencia de `disabledGames`, renderizado condicional en `practiceView.js` y panel de administración en `app.js` e `index.html`; motor de seguimiento ocular a 60 FPS acotado dentro de `mascotView.js` con control de ciclo de vida en `mascotController.js`; y ganchos de mensajería reactiva en `app.js` y `mascotController.js`. Cero emojis, estética Duolingo y soporte 100% offline.

**Tech Stack:** JavaScript ES Modules, HTML5, CSS3 Vanilla, LocalStorage API, Node.js Test Runner (`node --test`).

---

## Tareas

### Tarea 1: Persistencia de Disponibilidad de Minijuegos en `storage.js`
**Archivos:**
- Modificar: `js/storage.js`
- Test: `tests/gameAvailability.test.js`

**Paso 1: Escribir el test que falla**
Crear `tests/gameAvailability.test.js` probando:
- `DEFAULT_SETTINGS` contiene `disabledGames: []`.
- `dbService.getDisabledGames()` retorna lista vacía por defecto.
- `dbService.toggleGameDisabled(gameId)` agrega y quita el ID de la lista y persiste en `localStorage`.
- `dbService.isGameDisabled(gameId)` evalúa correctamente.

**Paso 2: Ejecutar test y verificar fallo**
Ejecutar: `node --test tests/gameAvailability.test.js`

**Paso 3: Implementar métodos en `js/storage.js`**
- Agregar `disabledGames: []` a `DEFAULT_SETTINGS`.
- Implementar `getDisabledGames()`, `isGameDisabled(gameId)`, `toggleGameDisabled(gameId, forceState)`.

**Paso 4: Ejecutar test y verificar que pase**
Ejecutar: `node --test tests/gameAvailability.test.js`

---

### Tarea 2: Interfaz en Administrador y Renderizado en Centro de Prácticas
**Archivos:**
- Modificar: `index.html` (agregar bloque de gestión de minijuegos en `#tab-admin`)
- Modificar: `css/style.css` (estilos Duolingo para tarjetas en Admin y tarjetas deshabilitadas en Prácticas)
- Modificar: `js/app.js` (renderizar tarjetas de gestión en Admin y manejar clics)
- Modificar: `js/practice/practiceView.js` (renderizar estado deshabilitado con alerta SVG y botón inactivo)

**Paso 1: Estilos CSS**
- Clases `.minigame-admin-grid`, `.minigame-admin-card`, badges `.badge-active`, `.badge-disabled`.
- Clases `.minigame-card-disabled`, `.btn-disabled-game`, `.game-unavailable-banner`.

**Paso 2: Marcado HTML en `index.html`**
- En `#tab-admin`, insertar la tarjeta "Disponibilidad del Centro de Prácticas" con contenedor `#admin-minigames-list`.

**Paso 3: Lógica en `js/app.js` y `js/practice/practiceView.js`**
- Función `renderAdminMinigames()` en `app.js` que renderiza las 4 tarjetas y conecta los botones de Habilitar/Deshabilitar con toasts informativos.
- En `practiceView.js`, consultar `dbService.isGameDisabled(gameId)`:
  - Si está deshabilitado: agregar clase `.minigame-card-disabled`, deshabilitar selector y botón (`disabled`), mostrar texto "No disponible" y banner explicativo con icono SVG. Bloquear clic de inicio de juego.

**Paso 4: Tests de integración**
- Agregar pruebas en `tests/gameAvailability.test.js` verificando que las tarjetas y botones deshabilitados se configuran correctamente sin emojis.

---

### Tarea 3: Seguimiento Ocular de Moli con el Ratón (Dentro de Partidas)
**Archivos:**
- Modificar: `js/mascot/mascotView.js`
- Modificar: `js/mascot/mascotController.js`
- Test: `tests/mascotTracking.test.js`

**Paso 1: Implementar en `js/mascot/mascotView.js`**
- Métodos `startMouseTracking()` y `stopMouseTracking()`.
- Cálculo de vector con límite seguro (máx. 7px horizontal, 4.5px vertical).
- Sincronización a 60 FPS con `window.requestAnimationFrame`.
- En `stopMouseTracking()`, remover listener de `window` y resetear `transform` a `translate(0, 0)`.

**Paso 2: Integrar en `js/mascot/mascotController.js`**
- En `notifyGameStart(gameId)`:
  - Si `gameId !== 'duel'`: invocar `this.view.startMouseTracking()`.
  - Si `gameId === 'duel'`: asegurar `stopMouseTracking()` y mantener cara de batalla `battle`.
- En `notifyGameExit()` y `notifyGameOver()`: invocar `this.view.stopMouseTracking()`.

**Paso 3: Test unitario en `tests/mascotTracking.test.js`**
- Verificar que `startMouseTracking` y `stopMouseTracking` gestionan el ciclo de vida sin listeners huérfanos.
- Verificar que en el minijuego `duel` no se active el seguimiento ocular.

---

### Tarea 4: Mensajería Viva e Interacciones de Moli en Secciones
**Archivos:**
- Modificar: `js/mascot/mascotController.js`
- Modificar: `js/app.js`
- Test: `tests/mascotSections.test.js`

**Paso 1: Explicaciones por Clic en `mascotController.js`**
- Agregar `case 'tab-sections':` en `generateContextualExplanation()`:
  - Distinguir entre rol `profesor` y `estudiante`.
  - Para estudiante: consultar tareas pendientes con `sectionsDB.getSectionsForStudent()`.

**Paso 2: Ganchos de Reacciones en `app.js`**
- Al cambiar a pestaña `#tab-sections`: emitir saludo contextual con `mascot.sayQuickRemark()`.
- Al marcar tarea `[✓]`: Moli cambia a `happy` o `wink` y dice frase motivacional aleatoria.
- Al crear sección o agregar tarea (Profesor): Moli emite confirmación pedagógica.

**Paso 3: Test unitario en `tests/mascotSections.test.js`**
- Verificar que los textos generados para profesor y estudiante no contienen emojis y reflejan el conteo de tareas.

---

### Tarea 5: Validación General, Control de Calidad y Git Push
- Ejecutar suite completa `npm test` verificando 100% de pruebas pasando.
- Verificar política de Cero Emojis y Cero `window.confirm`.
- Ejecutar git commit con el mensaje exacto solicitado:
  `feat: ultimos elementos logicos`
- Ejecutar git push a la rama remota en First-order-logic.
