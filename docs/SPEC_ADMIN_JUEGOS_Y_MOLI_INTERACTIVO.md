# Especificación Técnica: Disponibilidad de Juegos, Seguimiento Ocular de Moli y Mensajería en Secciones

## 1. Resumen de Entendimiento (Understanding Summary)
* **Objetivo:**
  1. Incorporar en el panel de **Parámetros del Administrador** el control para habilitar o deshabilitar temporalmente los minijuegos del Centro de Prácticas (*Árbol Correcto*, *Moleculares*, *Veredicto*, *Duelo contra la Mascota IA*).
  2. Implementar seguimiento ocular del cursor en **Moli** durante las partidas activas en minijuegos lógicos, regresando a su posición neutral al terminar o salir.
  3. Dotar a **Moli** de una presencia reactiva y pedagógica en la pestaña **Secciones**, emitiendo saludos y consejos según el perfil (Estudiante/Profesor), y reaccionando a acciones clave (marcar tareas `[✓]`, crear secciones y asignar tareas).
* **Motivación:** Empoderar al administrador con control sobre las actividades prácticas, enriquecer la inmersión del estudiante en los juegos cuando la mascota no realiza otras animaciones, y dinamizar la interacción en el aula virtual.
* **Usuarios destino:**
  * **Administrador:** Panel de control de disponibilidad con tarjetas visuales e interruptores directos.
  * **Profesor:** Visualización de disponibilidad de juegos y acompañamiento pedagógico de Moli al gestionar grupos.
  * **Estudiante:** Advertencia visual limpia en juegos inhabilitados, dinamismo de Moli durante el juego y motivación al resolver tareas To-Do.
* **Restricciones Clave:**
  * Estricta prohibición de emojis: se emplean iconos vectoriales SVG limpios y tipografía técnica.
  * Estética gamificada coherente tipo Duolingo: tarjetas redondeadas, feedback táctil y badges con contraste adecuado.
  * 100% offline, persistencia local sincronizada en `localStorage` (`logica_db_settings`).
  * Rendimiento garantizado a 60 FPS sin desbordamiento del SVG ni fugas de memoria por eventos de ratón.

---

## 2. Supuestos y Riesgos (Assumptions & Risks)

### Supuestos
1. **Persistencia Centralizada:** La lista de juegos inactivos se almacena en `DEFAULT_SETTINGS.disabledGames: []` dentro de `logica_db_settings`.
2. **Recomendación Adaptativa:** Si la Red Neuronal sugiere un minijuego que fue inhabilitado por el administrador, el lobby sugerirá el siguiente juego activo con prioridad de aprendizaje.
3. **Ciclo de Vida del Mouse:** El escuchador `window.addEventListener('mousemove')` solo existe mientras `isGamePlaying === true` en partidas lógicas, desacoplándose inmediatamente al salir o en la pantalla de resumen.
4. **Respeto a la Actitud de Duelo:** En el *Duelo contra la Mascota IA*, Moli mantiene su mirada fija de batalla (*battle*) sin seguir el cursor.

### Riesgos y Mitigaciones
* **Riesgo:** Consumo excesivo de CPU al calcular vectores en cada píxel de movimiento del mouse.
  * *Mitigación:* Se encapsula la actualización en `window.requestAnimationFrame`, asegurando que solo se dibuje un fotograma por ciclo de refresco del monitor.
* **Riesgo:** Desbordamiento visual de las pupilas fuera del visor OLED de Moli.
  * *Mitigación:* Se implementa un cálculo trigonométrico con acotamiento estricto (*clamping*) de radio máximo (7px en horizontal, 5px en vertical).

---

## 3. Registro de Decisiones (Decision Log)

| # | Decisión | Alternativas consideradas | Razón de la elección |
|---|---|---|---|
| **D10** | **Arquitectura modular desacoplada por servicios** | Lógica centralizada monolítica en `app.js` | Mantiene el código ordenado, mantenible y testeable unitariamente. |
| **D11** | **Cuadrícula de 4 tarjetas con botones directos en Admin** | Selector desplegable único | Aprovecha el espacio de la pestaña de Parámetros y permite auditar el estado de todos los juegos de un vistazo. |
| **D12** | **Seguimiento ocular en juegos lógicos y mirada fija en Duelo** | Seguimiento en todos los juegos | Preserva la inmersión y la personalidad competitiva de Moli durante el combate. |
| **D13** | **Mensajes contextuales al hacer clic + micro-reacciones reactivas** | Solo clics o solo banners estáticos | Hace sentir a Moli como un tutor vivo en el aula sin ser invasivo. |
| **D14** | **Cero emojis en toda la interfaz y diálogos** | Usar emojis estándar | Cumplimiento estricto de las directrices del proyecto; se emplean SVG y estilos tipográficos. |
| **D15** | **Estética gamificada consistente tipo Duolingo** | Diseño neutro o genérico | Mantiene la coherencia visual, modernidad y dinamismo del software educativo. |

---

## 4. Diseño Técnico Detallado

### 4.1. Módulo de Disponibilidad de Juegos

#### A. Persistencia en `js/storage.js`:
```javascript
const DEFAULT_SETTINGS = {
  forcedNotation: 'none',
  theme: 'dark',
  disabledGames: [] // ['tree', 'molecular', 'verdict', 'duel']
};

class StorageService {
  getDisabledGames() {
    return this.getSettings().disabledGames || [];
  }

  isGameDisabled(gameId) {
    return this.getDisabledGames().includes(gameId);
  }

  toggleGameDisabled(gameId, forceState = null) {
    const current = this.getDisabledGames();
    let updated;
    const shouldDisable = (forceState !== null) ? forceState : !current.includes(gameId);

    if (shouldDisable && !current.includes(gameId)) {
      updated = [...current, gameId];
    } else if (!shouldDisable && current.includes(gameId)) {
      updated = current.filter(id => id !== gameId);
    } else {
      updated = current;
    }

    this.updateSettings({ disabledGames: updated });
    return { success: true, disabled: shouldDisable, disabledGames: updated };
  }
}
```

#### B. Interfaz en Administrador (`index.html` & `js/app.js`):
* En `#tab-admin`, bloque:
  * Título: *Disponibilidad del Centro de Prácticas*.
  * Cuadrícula con 4 tarjetas estilo Duolingo (`minigame-admin-card`):
    * Icono SVG del juego (`ICONS.tree`, `ICONS.puzzle`, `ICONS.scale`, `ICONS.bolt`).
    * Nombre y breve descripción.
    * Badge de estado: `Activo` (verde esmeralda) o `Deshabilitado` (rojo).
    * Botón conmutador con relieve táctil: *"Deshabilitar"* / *"Habilitar"*.

#### C. Interfaz en Centro de Prácticas (`js/practice/practiceView.js`):
* Si `isGameDisabled(gameId)` es verdadero:
  * La tarjeta `.minigame-card` adopta la clase `.minigame-card-disabled` (borde rojo sutil, fondo atenuado).
  * El botón `.btn-play-game` se deshabilita (`disabled`), adquiere clase `.btn-disabled-game` en gris y muestra el texto *"No disponible"*.
  * El desplegable de dificultad se deshabilita.
  * Debajo del botón se inserta un mensaje de alerta estilizado con icono SVG:
    ```html
    <div class="game-unavailable-banner">
      <span class="game-unavailable-icon"><!-- SVG candado o advertencia --></span>
      <span>Este juego no está disponible en este momento.</span>
    </div>
    ```

---

### 4.2. Seguimiento Ocular de Moli (`js/mascot/mascotView.js`)

* **Estado interno:**
  * `this.isMouseTracking = false;`
  * `this._boundHandleMouseMove = this._handleMouseMove.bind(this);`
  * `this._rafId = null;`
* **Métodos:**
  * `startMouseTracking()`: Activa el flag y suscribe `window.addEventListener('mousemove', this._boundHandleMouseMove)`.
  * `stopMouseTracking()`: Cancela `_rafId`, remueve el listener de `window`, y resetea suavemente las transformaciones de `<g id="mascot-left-eye">` y `<g id="mascot-right-eye">` a `translate(0, 0)`.
  * `_handleMouseMove(e)`:
    * Obtiene el rectángulo del visor `this.visor.getBoundingClientRect()`.
    * Calcula el centro `(cx, cy)`.
    * Determina el vector hacia `(e.clientX, e.clientY)`.
    * Calcula el desplazamiento con límite elíptico seguro:
      $$\text{dx} = \cos(\theta) \cdot \min(\text{dist} \times 0.04, 7)$$
      $$\text{dy} = \sin(\theta) \cdot \min(\text{dist} \times 0.04, 4.5)$$
    * Programa la actualización con `requestAnimationFrame` aplicando:
      ```javascript
      leftEye.style.transform = `translate(${dx}px, ${dy}px)`;
      rightEye.style.transform = `translate(${dx}px, ${dy}px)`;
      ```
* **Coordinación en `js/mascot/mascotController.js`:**
  * En `notifyGameStart(gameId)`: Si `gameId !== 'duel'`, invoca `this.view.startMouseTracking()`. Si es `'duel'`, asegura que esté detenido y coloca la expresión de combate `battle`.
  * En `notifyGameExit()` y `notifyGameOver()`: Invoca `this.view.stopMouseTracking()`.

---

### 4.3. Presencia y Mensajería Viva en Secciones

#### A. Tutoría Contextual al Clic (`mascotController.js`):
* En `generateContextualExplanation()`:
  * Caso `tab-sections`:
    * Si el usuario es **Profesor**:
      *"Aquí puede crear secciones para sus grupos de clase, inscribir estudiantes y asignar tareas prácticas To-Do para monitorear el dominio de la lógica simbólica."*
    * Si el usuario es **Estudiante**:
      Consulta `sectionsDB.getSectionsForStudent(user.userId)`:
      - Si tiene tareas pendientes: *"Tienes [N] tarea(s) pendiente(s) en tus secciones de clase. Complétalas para consolidar lo aprendido en clase."*
      - Si no tiene pendientes: *"¡Estás completamente al día con tus secciones! No tienes tareas pendientes por resolver."*

#### B. Saludos Reactivos al Entrar a la Pestaña (`app.js`):
* Al hacer `switchTab('tab-sections')`:
  * Si es **Estudiante**:
    * Con tareas pendientes: `mascot.sayQuickRemark('¡Hola! Tienes [N] tareas pendientes esperándote en tus secciones.', 3500)`.
    * Al día: Moli cambia a `happy` y dice: `mascot.sayQuickRemark('¡Todo al día por aquí! Excelente constancia con la lógica simbólica.', 3500)`.
  * Si es **Profesor**:
    * `mascot.sayQuickRemark('Bienvenido, Profesor. Listo para revisar el progreso de sus secciones.', 3500)`.

#### C. Micro-Reacciones a Acciones:
* Al marcar tarea `[✓]`: Moli sonríe (`happy` o `wink`) y emite:
  * *"¡Una menos! Gran trabajo resolviendo esta tarea."* o *"¡Misión cumplida! Tu avance quedó registrado."*
* Al crear sección o agregar tarea (Profesor):
  * *"¡Sección creada con éxito! Ahora puede asignar tareas prácticas."*
  * *"Tarea asignada a la sección. Los estudiantes ya pueden visualizarla."*

---

## 5. Estrategia de Pruebas Unitarias
1. **Pruebas de Almacenamiento (`tests/gameSettings.test.js`):**
   * Inicialización con `disabledGames: []`.
   * Deshabilitar y volver a habilitar juegos, verificando persistencia en `localStorage`.
2. **Pruebas de Renderizado en Centro de Prácticas:**
   * Validar que con un juego deshabilitado, la tarjeta contenga `.minigame-card-disabled`, el botón esté inhabilitado y el mensaje esté presente.
3. **Pruebas de Ciclo de Vida de Moli:**
   * Validar que `startMouseTracking` y `stopMouseTracking` añadan y retiren el event listener de `window`.
   * Validar que en Duelo no se active el seguimiento ocular.
4. **Pruebas de Mensajería en Secciones:**
   * Validar las cadenas de texto contextuales para Profesor y Estudiante según tareas pendientes.
