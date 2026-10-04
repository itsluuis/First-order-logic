# Plan de Implementación: Calcular Todas las Operaciones Posibles

## Objetivo
Implementar la funcionalidad de "Calcular Todas las Operaciones Posibles" tanto en el Constructor Visual (Ensamble Molecular) como en el Proceso Inverso, siguiendo el diseño técnico especificado en `docs/SPEC_TODAS_LAS_OPERACIONES.md`.

---

## Tareas

### Tarea 1: Motor Lógico y Pruebas Unitarias TDD
- [x] Crear `js/logic/allOperations.js`:
  - `AllOperationsEngine.generateAllPairwiseOperations(variables, variableMap, notation)`
  - Generación de pares $\binom{N}{2}$
  - Generación de las 5 operaciones (AND, OR, IFF, IMPLIES directo e inverso)
  - Construcción de AST, llamada a `NaturalLanguageTranslator` y evaluación lógica con `TruthTableEngine`
- [x] Crear `tests/allOperations.test.js`:
  - Pruebas de conteo: $N=2 \to 5$, $N=3 \to 15$, $N=4 \to 30$
  - Prueba de direccionalidad del condicional
  - Prueba de diagnóstico de verdad y traducción a español
  - Prueba de cero emojis en archivos nuevos
- [x] Ejecutar `npm test` para validar la lógica pura

### Tarea 2: Estilos CSS para el Panel y Tarjetas
- [x] Modificar `css/style.css`:
  - Clases para `.all-ops-section`, `.all-ops-grid-container`, `.all-ops-card`
  - Badges de conectivos (`.badge-op-and`, `.badge-op-implies`, etc.)
  - Badges de clasificación de verdad (`.badge-truth-contingency`, `.badge-truth-tautology`, `.badge-truth-contradiction`)
  - Scrollbar estilizado y animación fade-in
  - Adaptabilidad responsive (grid auto-fit)

### Tarea 3: Modificación del Marcado HTML
- [x] Modificar `index.html`:
  - Agregar botón `#btn-calc-all-builder` en el card-header del Ensamble Molecular
  - Agregar contenedor `#builder-all-operations-section` al fondo de `#tab-builder`
  - Agregar botón `#btn-calc-all-inverse` en `#inverse-variables-section`
  - Agregar contenedor `#inverse-all-operations-section` al fondo de `#tab-inverse`
  - Garantizar cero emojis en todo el marcado añadido

### Tarea 4: Integración en el Controlador Principal (`app.js`)
- [x] Modificar `js/app.js`:
  - Importar `AllOperationsEngine`
  - Función auxiliar `renderAllOperationsPanel(containerId, variables, variableMap, callbacks)`
  - Event listener de `#btn-calc-all-builder` con scroll suave
  - Event listener de `#btn-calc-all-inverse` con scroll suave
  - Acciones por tarjeta: "Cargar" y "Ver Tabla de Verdad"
  - Re-renderizado al cambiar notación activa

### Tarea 5: Validación y Control de Calidad
- [x] Ejecutar `npm test` (verificar que los 27 tests existentes + nuevos pasen al 100%)
- [x] Verificar política de Cero Emojis y Cero `window.confirm`
- [x] Verificar en navegador que la funcionalidad opere sin errores de consola
