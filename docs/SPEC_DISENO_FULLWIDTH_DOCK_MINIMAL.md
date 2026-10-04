# Especificación de Diseño: Interfaz Full Width, Dock Lateral Derecho y Encabezado Minimalista Neo-Pop

**Fecha:** 4 de Octubre de 2026  
**Estado:** Aprobado  
**Enfoque de Diseño:** Enfoque 1 (Shell Fluido con Dock Fijo y Barra Minimalista Neo-Pop Gamificada)

---

## 1. Resumen de Entendimiento (Understanding Summary)

* **Objetivo:** Rediseñar la disposición espacial y navegación del Software de Lógica Simbólica para maximizar el área de trabajo en resoluciones de escritorio y portátiles, logrando una estética limpia, moderna y sin gradientes, manteniendo estrictamente el estilo gamificado tipo Duolingo (Neo-Pop 3D).
* **Alcance:**
  1. **Ancho Completo (Full Width):** La interfaz utiliza el 100% del ancho del viewport (`width: 100%`), eliminando el contenedor centrado fijo (`max-width: 1360px`).
  2. **Excepción de Centrado:** Módulos de resumen y retroalimentación (como *"Resumen de tu Desempeño"* en Centro de Prácticas) mantienen su ancho acotado y centrado (`max-width: 680px; margin: 0 auto;`).
  3. **Dock Lateral Derecho:** La barra de navegación por pestañas (`.nav-tabs`) se reubica verticalmente en el borde derecho (`100vh`), junto a la barra de scroll nativa. Muestra únicamente los iconos de cada módulo (sin texto) escalados proporcionalmente (`22px`), con tooltips explicativos y microinteracciones táctiles 3D.
  4. **Botón de Tema:** `#btn-toggle-theme` se mueve a la esquina inferior izquierda fija (`bottom: 1.5rem; left: 1.5rem`).
  5. **Encabezado Minimalista:** Se elimina la caja contenedora gruesa del header actual. En su lugar se dispone una línea superior fluida:
     * A la izquierda: Logo plano (`∧∨`) en color sólido (`var(--pop-blue)`).
     * Enlaces de texto interactivo:
       * **"Notación"**: Despliega un popover neo-pop sólido con las opciones *Estándar* y *Alternativa*.
       * **"[Nombre del Usuario]"**: Despliega un popover neo-pop sólido con el texto "¿Desea cerrar sesión?" y el botón `#btn-logout` ("Cerrar sesión").
  6. **Cero Gradientes:** Eliminación radical de todos los gradientes (`linear-gradient`, `radial-gradient`, `bg-glow`), empleando colores planos, contrastes de alta visibilidad y sombras 3D táctiles.
  7. **Cero Emojis:** Política estricta de 0 emojis en todo el código y assets.

---

## 2. Supuestos y Restricciones (Assumptions & Constraints)

1. **Margen de Seguridad:** El contenedor principal `.app-container` incorpora un margen derecho de `76px` para que el dock fijo no solape ningún control ni contenido.
2. **Cierre de Popovers:** Los menús emergentes de Notación y Usuario se cierran automáticamente al hacer clic fuera o presionar `Escape`.
3. **Compatibilidad con Tests:** Se mantiene la integración y nombres de IDs clave (`notation-select`, `btn-logout`, `tab-builder`, etc.) para garantizar que los 37 tests unitarios y de integración sigan pasando al 100%.
4. **No-Objetivos (Non-Goals):** La optimización específica para iPad/móvil queda descartada por instrucción explícita del usuario.

---

## 3. Registro de Decisiones (Decision Log)

| Decisión | Alternativas Consideradas | Justificación |
| :--- | :--- | :--- |
| **Dock Fijo a la Derecha (72px)** | Barra flotante superpuesta / Subgrid de 2 columnas | Permite que el scrollbar del navegador quede en el borde exterior derecho y el contenido fluya libremente sin solapes. |
| **Ancho Completo con Excepción** | Estirar todas las secciones al 100% | Las tarjetas de resultados (Centro de Prácticas) lucen dispersas si se extienden a pantallas ultra-wide; centrarlas preserva la legibilidad y estética Duolingo. |
| **Encabezado Minimalista de Texto** | Mantener selector nativo en barra / Barra lateral de usuario | Crea una interfaz despejada, moderna y limpia, delegando las acciones secundarias a popovers interactivos. |
| **Cero Gradientes** | Mantener gradientes sutiles en botones | El usuario solicitó eliminar todo tipo de gradiente de la web para una apariencia sólida y nítida. |
| **Exclusión de iPad** | Optimización de modal con scroll dinámico | El usuario decidió expresamente no priorizar ni adaptar para iPad. |

---

## 4. Diseño Técnico de Componentes

### 4.1. Layout Shell (`css/style.css`)
```css
/* Eliminación de Gradientes y Patrones de Fondo */
:root {
  --bg-pattern: none;
}
.bg-glow-container {
  display: none !important;
}

/* Ancho Completo */
.app-container {
  max-width: none;
  width: 100%;
  margin: 0;
  padding: 1.25rem 2rem 3.5rem 2rem;
  margin-right: 76px;
  box-sizing: border-box;
}

/* Excepción Centrada para Resultados */
.practice-results-card,
.practice-stats-grid {
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}
```

### 4.2. Dock Lateral Derecho (`.nav-tabs`)
```css
.nav-tabs {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 72px;
  height: 100vh;
  z-index: 80;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 0;
  background: var(--bg-card);
  border-left: 2.5px solid var(--border-color);
  border-radius: 0;
  box-shadow: -4px 0 0 var(--border-3d-shadow);
  margin-bottom: 0;
}

.nav-tab {
  width: 48px;
  height: 48px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  flex: none;
}

.nav-tab.active {
  background: var(--bg-card);
  color: var(--pop-blue);
  border-color: var(--pop-blue);
  box-shadow: 0 4px 0 var(--pop-blue-shadow);
  transform: translateX(-2px);
}
```

### 4.3. Botón de Modo Claro / Oscuro
```css
#btn-toggle-theme {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  z-index: 90;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 0 var(--border-3d-shadow);
}
```

### 4.4. Encabezado Minimalista y Popovers
```html
<header class="app-header-minimal">
  <div class="topbar-left">
    <div class="brand-icon-solid">∧∨</div>
    <div class="topbar-menu-group">
      <button id="btn-topbar-notation" class="topbar-text-btn" type="button">
        Notación
        <span id="notation-indicator-badge" class="badge-subtle">Estándar</span>
      </button>
      <!-- Popover de Notación -->
      <div id="popover-notation" class="neo-popover hidden">...</div>

      <button id="btn-topbar-user" class="topbar-text-btn" type="button">
        <span id="topbar-username">Invitado</span>
        <span id="topbar-user-role" class="badge-role">Estudiante</span>
      </button>
      <!-- Popover de Usuario -->
      <div id="popover-user" class="neo-popover hidden">
        <p class="popover-question">¿Desea cerrar sesión?</p>
        <button id="btn-logout" class="btn btn-danger btn-sm" type="button">Cerrar sesión</button>
      </div>
    </div>
  </div>
</header>
```
