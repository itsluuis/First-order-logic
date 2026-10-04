# Especificación Técnica: Función de Cálculo de Todas las Operaciones Posibles

## 1. Resumen de Entendimiento (Understanding Summary)
* **Objetivo**: Integrar la función y botón "Calcular Todas las Operaciones Posibles" tanto en el Constructor Visual / Ensamble Molecular (Pestaña 1) como en el Proceso Inverso (Pestaña 2).
* **Motivación**: Permitir una exploración exhaustiva de todas las combinaciones binarias posibles entre las proposiciones atómicas cargadas en el sistema, adaptando la experiencia de la función `all_possible_operations` de la Calculadora de Conjuntos al dominio de la lógica proposicional.
* **Destinatarios**: Estudiantes y docentes del curso de Lógica Simbólica de la Universidad José Antonio Páez para la entrega final de la cátedra.
* **Comportamiento**:
  * Para $N \ge 2$ variables atómicas activas ($p, q, r, \dots$), se generan todas las combinaciones por pares no ordenadas.
  * Por cada par $\{A, B\}$, se evalúan las 5 operaciones binarias fundamentales:
    1. Conjunción: $A \land B$ (1)
    2. Disyunción: $A \lor B$ (1)
    3. Bicondicional: $A \leftrightarrow B$ (1)
    4. Condicional directo: $A \to B$ (1)
    5. Condicional inverso: $B \to A$ (1, respetando la no-conmutatividad del condicional)
  * Total de operaciones generadas: $\binom{N}{2} \times 5$. Para 4 variables, genera 30 operaciones.
* **Resultados al fondo**: En ambas pestañas se renderiza un contenedor con scroll y tarjetas interactivas que detallan la FBF, la oración en español y su clasificación lógica, con botones para cargarla o enviarla a la tabla de verdad.

---

## 2. Suposiciones y Requisitos No Funcionales (NFR)
* **Rendimiento**: La computación de hasta 50 operaciones con 4 filas de verdad toma $< 3\text{ ms}$ en JavaScript. La manipulación del DOM se realiza con `DocumentFragment` en una sola operación atómica.
* **Restricción de Emojis**: Cero emojis en archivos HTML, JS y CSS. Uso estricto de iconos SVG y símbolos formales.
* **Validación mínima**: Se requiere un mínimo de 2 variables atómicas. Si hay menos, se muestra una alerta o mensaje informativo accesible sin bloquear la interfaz.
* **Respaldo de lenguaje natural**: Si una proposición no tiene texto asignado, se utiliza `[proposición X]` para evitar fallos en la traducción.
* **Sincronización de notación**: Soporte para notación estándar ($\land, \lor, \to, \leftrightarrow$) y alternativa ($\&, \lor, \supset, \equiv$).

---

## 3. Registro de Decisiones (Decision Log)

| ID | Decisión | Alternativas Evaluadas | Justificación |
|---|---|---|---|
| **DEC-001** | Operaciones binarias por pares con condicional bidireccional ($A \to B$ y $B \to A$) | Permutaciones totales ($N \times (N-1) \times 4$) vs. Combinaciones directas fijas | El condicional no es conmutativo, mientras que la conjunción, disyunción y bicondicional sí lo son. Este balance ofrece precisión matemática sin redundancia innecesaria. |
| **DEC-002** | Panel de tarjetas interactivas al fondo con scroll suave | Cuadro de texto plano estilo log / consola | Mejora drásticamente la usabilidad y la estética (Neopop/Glassmorphism) y permite acciones directas (cargar en lienzo o ver tabla de verdad). |
| **DEC-003** | Módulo lógico puro dedicado `js/logic/allOperations.js` | Funciones inline en `app.js` vs. Web Worker | Provee máxima testabilidad unitaria en `node --test`, alta reutilización entre pestañas y evita sobrecargar `app.js`. |

---

## 4. Diseño Arquitectónico y Estructura de Datos

### 4.1 Módulo `js/logic/allOperations.js`
Exporta la clase `AllOperationsEngine` con métodos estáticos:
```javascript
export class AllOperationsEngine {
  static generateAllPairwiseOperations(variables, variableMap = {}, notation = 'standard') {
    // 1. Validar variables.length >= 2
    // 2. Generar pares combinatorios
    // 3. Crear FBF, AST, traducción en español y clasificación de verdad
    // 4. Retornar array de objetos de operación
  }
}
```

Cada objeto de operación contiene:
```javascript
{
  id: "op-p-q-AND",
  operator: "AND",
  opLabel: "Conjunción",
  leftVar: "p",
  rightVar: "q",
  fbf: "p ∧ q",
  spanishText: "Estudio para el examen y apruebo la materia",
  truthDiagnosis: "Contingencia", // "Tautología" | "Contingencia" | "Contradicción"
  truthValues: [true, false, false, false]
}
```

### 4.2 Interfaz de Usuario y Contenedores
* **Constructor Visual**:
  * Botón `#btn-calc-all-builder` en la botonera de acciones del Ensamble Molecular.
  * Contenedor `#builder-all-operations-section` al fondo del tab `#tab-builder`.
* **Proceso Inverso**:
  * Botón `#btn-calc-all-inverse` en la sección de variables detectadas.
  * Contenedor `#inverse-all-operations-section` al fondo del tab `#tab-inverse`.
* **Grid de Tarjetas**:
  * Estilizado con CSS responsive, badges de colores según diagnóstico lógico y conectivo.
  * Botón "Cargar en Lienzo / Entrada" y botón "Ver Tabla de Verdad".

---

## 5. Estrategia de Pruebas (Test-Driven Development)
Archivo de prueba: `tests/allOperations.test.js`
* Conteo exacto de combinaciones ($N=2 \to 5$, $N=3 \to 15$, $N=4 \to 30$, $N=5 \to 50$).
* Bidireccionalidad en condicionales y unicidad en conmutativos.
* Diagnóstico lógico verificado contra `TruthTableEngine`.
* Traducción al español validada contra `NaturalLanguageTranslator`.
* Validación de cero emojis y presencia de controles en `index.html`.
