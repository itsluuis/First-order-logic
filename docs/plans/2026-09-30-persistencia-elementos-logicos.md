# Persistencia y Reutilización de Elementos Lógicos Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar el sistema de almacenamiento persistente, gestión de cuotas (15 atómicas, 20 FBF, 15 moleculares + FBF) y menús contextuales popover para guardar y reutilizar elementos lógicos en el Constructor Visual y en el Proceso Inverso.

**Architecture:** Capa de almacenamiento desacoplada en `js/savedItemsStorage.js` con persistencia en `localStorage` aislada por `userId`. Capa de presentación con componente reutilizable de popover (`SavedItemsPopover`) e integración bidireccional en las vistas de Constructor Visual y Proceso Inverso. Flujo de límite de cuota en dos tiempos (aviso explícito y posterior Call to Action interactivo). Cumplimiento estricto de la política de cero emojis (usar SVG de `js/icons.js`) y cero `window.confirm` nativos (usar modal de confirmación existente).

**Tech Stack:** Vanilla JavaScript (ES6 Modules), Node.js Native Test Runner (`node:test`, `node:assert/strict`), HTML5 Semántico, CSS3 NeoPop / Glassmorphism.

---

### Task 1: Capa de Persistencia y Cuotas (`js/savedItemsStorage.js`)

**Files:**
- Create: `js/savedItemsStorage.js`
- Test: `tests/savedItemsStorage.test.js`

**Step 1: Write the failing test**
Crear `tests/savedItemsStorage.test.js` con pruebas para:
- Inicialización y aislamiento por `userId`.
- Guardado y recuperación de atómicas (máx 15), FBF (máx 20) y moleculares (máx 15 con FBF obligatoria).
- Rechazo al superar la cuota máxima retornando `{ success: false, reason: 'quota_full', max: ... }`.
- Eliminación de elementos por ID y actualización de conteos.

**Step 2: Run test to verify it fails**
Run: `npm test`
Expected: FAIL con "Cannot find module '../js/savedItemsStorage.js'".

**Step 3: Write minimal implementation**
Crear `js/savedItemsStorage.js` con la clase `SavedItemsService`:
- `QUOTAS = { atomics: 15, fbf: 20, molecules: 15 }`
- Clave de base de datos: `logica_saved_items_${userId}`
- Métodos: `getItems(userId, category)`, `saveItem(userId, category, data)`, `deleteItem(userId, category, itemId)`, `isQuotaFull(userId, category)`, `getQuotaInfo(userId, category)`.

**Step 4: Run test to verify it passes**
Run: `npm test`
Expected: PASS (todas las pruebas unitarias de persistencia pasando exitosamente).

**Step 5: Commit**
```bash
git add js/savedItemsStorage.js tests/savedItemsStorage.test.js
git commit -m "feat: add savedItemsStorage service with quotas and strict validations"
```

---

### Task 2: Componente UI Popover y Estilos (`js/savedItemsPopover.js` y `css/style.css`)

**Files:**
- Create: `js/savedItemsPopover.js`
- Modify: `css/style.css`
- Modify: `js/icons.js` (añadir ícono si falta alguno como bookmark o folder)
- Test: `tests/confirmDialog.test.js` (asegurar cumplimiento de cero emojis)

**Step 1: Write the UI Component contract**
Definir la clase `SavedItemsPopover`:
- Generar el contenedor flotante con cabecera (título y badge de cuota `X / Y`, sin emojis).
- Listar los elementos guardados con:
  - Texto formateado.
  - Botón "Insertar" (inserción directa).
  - Selector de variable para atómicas (menú con botones rápidos $p, q, r, s, t$).
  - Botón de papelera con SVG de `ICONS.trash` para eliminar.
- Eventos de clic fuera (*click outside*) y tecla `Escape` para cierre automático.

**Step 2: Add NeoPop Styles in `css/style.css`**
Agregar clases CSS:
- `.saved-items-popover`, `.saved-popover-header`, `.saved-popover-title`, `.saved-popover-quota`.
- `.saved-items-list`, `.saved-item-row`, `.saved-item-actions`, `.var-selector-dropdown`.
- Diseños coherentes con la paleta oscura, bordes sutiles y sombras elevadas del proyecto.

**Step 3: Run existing tests to verify zero emojis & no regression**
Run: `npm test`
Expected: PASS.

**Step 4: Commit**
```bash
git add js/savedItemsPopover.js css/style.css js/icons.js
git commit -m "feat: add SavedItemsPopover component and NeoPop styling"
```

---

### Task 3: Integración en Constructor Visual (`index.html` y `js/app.js`)

**Files:**
- Modify: `index.html` (agregar botones de Guardar y Agregar en Constructor Visual)
- Modify: `js/app.js` (conectar lógica de guardado, carga y tokenizado al lienzo)

**Step 1: Add HTML Buttons in Constructor Visual**
- En la tarjeta de Proposiciones Atómicas (columna izquierda):
  - Botón `Guardar Atómica` (`#btn-save-atomic-builder`).
  - Botón `Agregar Atómica` (`#btn-open-atomic-builder-picker`).
- En la tarjeta de Ensamble / FBF Resultante:
  - Botón `Guardar FBF` (`#btn-save-fbf-builder`).
  - Botón `Agregar FBF` (`#btn-open-fbf-builder-picker`).
- En la sección de Proposición Molecular Resultante:
  - Botón `Guardar Molecular` (`#btn-save-molecular-builder`).
  - Botón `Agregar Molecular` (`#btn-open-molecular-builder-picker`).

**Step 2: Implement Handlers in `js/app.js`**
- **Guardar Atómica:** Si hay múltiples variables con texto, permitir guardar todas o la seleccionada.
- **Agregar Atómica:**
  - Inserción directa: Ocupa la primera vacía; si todas están llenas, agrega nueva variable (`+ Variable`).
  - En letra específica: Reemplaza directamente el contenido de esa variable y refresca la vista.
- **Guardar FBF:** Guarda la fórmula del resultado tras verificar que no esté vacía ni con errores.
- **Agregar FBF:** Tokeniza la fórmula en `builderTokens`, crea automáticamente las variables requeridas en `builderAtomics` y refresca el lienzo.
- **Guardar Molecular:** Guarda el texto en lenguaje natural + la FBF generadora.

**Step 3: Run test suite**
Run: `npm test`
Expected: PASS.

**Step 4: Commit**
```bash
git add index.html js/app.js
git commit -m "feat: integrate saved items and popover into visual builder"
```

---

### Task 4: Integración en Proceso Inverso (`index.html` y `js/app.js`)

**Files:**
- Modify: `index.html` (agregar botones de Guardar y Agregar en Proceso Inverso)
- Modify: `js/app.js` (conectar lógica en Proceso Inverso y enlace bidireccional)

**Step 1: Add HTML Buttons in Proceso Inverso**
- Junto al input de FBF:
  - Botón `Guardar FBF` (`#btn-save-fbf-inverse`).
  - Botón `Agregar FBF` (`#btn-open-fbf-inverse-picker`).
- En la sección de Variables Detectadas:
  - Botón `Guardar Atómica` (`#btn-save-atomic-inverse`).
  - Botón `Agregar Atómica` (`#btn-open-atomic-inverse-picker`).
- En el resultado de Proposición Molecular Reconstruida:
  - Botón `Guardar Molecular` (`#btn-save-molecular-inverse`).
  - Botón `Agregar Molecular` (`#btn-open-molecular-inverse-picker`).

**Step 2: Implement Handlers in `js/app.js`**
- Conectar botones con la misma instancia compartida de `savedItemsService`.
- Al agregar FBF en Proceso Inverso: rellena `#inverse-fbf-input` y dispara `#btn-parse-inverse`.
- Al agregar Atómica: rellena el input de la variable detectada (directo o específico con sobreescritura).
- Al agregar Molecular: carga la FBF asociada y el texto en el resultado.

**Step 3: Run test suite**
Run: `npm test`
Expected: PASS.

**Step 4: Commit**
```bash
git add index.html js/app.js
git commit -m "feat: integrate saved items and popover into inverse process"
```

---

### Task 5: Flujo de Cuota Llena con Aviso Explícito y Call to Action Interactivo

**Files:**
- Modify: `js/app.js`
- Test: `tests/savedItemsStorage.test.js`

**Step 1: Implement Quota Full Flow**
En la función controladora de guardado (`handleSaveItem`):
1. Verificar si `savedItemsStorage.isQuotaFull(userId, category)`.
2. Si está llena:
   - **Paso 1 (Aviso explícito):** Disparar toast de advertencia: *"Límite alcanzado: Ya tienes el máximo permitido de [15/20] elementos guardados en esta categoría."*
   - **Paso 2 (CTA interactivo):** Invocar el diálogo de confirmación NeoPop (`openConfirmModal`):
     - Título: *"Capacidad Máxima Alcanzada"*
     - Mensaje: *"¿Deseas revisar tu lista y eliminar alguna proposición para hacer espacio?"*
     - Botón confirmar: *"Gestionar Guardados"*
     - Botón cancelar: *"Cerrar"*
   - Al confirmar: Desplegar de inmediato el popover de esa categoría enfocado en la eliminación de elementos.

**Step 2: Run test suite**
Run: `npm test`
Expected: PASS.

**Step 3: Commit**
```bash
git add js/app.js
git commit -m "feat: implement explicit quota limit warning with interactive CTA"
```

---

### Task 6: Verificación E2E, Pruebas de Regresión y Cierre

**Files:**
- Create/Modify: `tests/savedItemsIntegration.test.js`
- Verify: Todas las pruebas unitarias y de integración existentes.

**Step 1: Write integration tests**
Probar flujos completos simulados en Node test runner:
- Guardar en Constructor -> Cargar en Proceso Inverso.
- Reemplazo de variable atómica con contenido previo.
- Verificación estricta de la política de cero emojis en todos los archivos modificados.
- Verificación de ausencia de `window.confirm`.

**Step 2: Run full test suite**
Run: `npm test`
Expected: PASS con 100% de pruebas exitosas.

**Step 3: Commit**
```bash
git add tests/
git commit -m "test: add integration test suite for cross-tab saved items"
```
