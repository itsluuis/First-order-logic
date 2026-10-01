# Especificación Técnica: Sistema de Persistencia y Reutilización de Elementos Lógicos (Atómicas, FBF y Moleculares)

## 1. Resumen de Entendimiento (Understanding Summary)
* **Objetivo:**
  1. Permitir a los usuarios guardar y reutilizar **Proposiciones Atómicas**, **Fórmulas Bien Formadas (FBF)** y **Proposiciones Moleculares en Lenguaje Natural** (vinculadas a su FBF).
  2. Implementar botones contextuales **"Guardar [n]"** y **"Agregar [n]"** en las secciones correspondientes del **Constructor Visual** y del **Proceso Inverso**.
  3. Desplegar un menú emergente tipo popover al presionar **"Agregar [n]"** que liste los elementos guardados, permitiendo su inserción directa o en una posición/variable específica (en el caso de atómicas), así como la eliminación individual con ícono de papelera.
* **Motivación:** Corrección prioritaria surgida en la evaluación académica del proyecto (Semestre 4 - Universidad José Antonio Páez) para evitar la reescritura manual repetitiva y agilizar el flujo de trabajo tanto directo como inverso.
* **Usuarios destino:** Estudiantes y Profesores en sesiones autenticadas individuales (almacenamiento aislado por `userId`).
* **Límites de Capacidad y Cuotas:**
  * **15** Proposiciones Atómicas.
  * **20** Fórmulas Bien Formadas (FBF).
  * **15** Proposiciones Moleculares en Lenguaje Natural (+ su FBF generadora).
* **Regla lógica estricta:** Es válido guardar una FBF sin proposición molecular en lenguaje natural; pero **no se puede** guardar una proposición molecular en lenguaje natural sin su FBF correspondiente.
* **Bidireccionalidad:** Toda FBF, atómica o proposición molecular guardada en el Constructor Visual puede utilizarse de inmediato en el Proceso Inverso y viceversa.
* **No-objetivos (Fase 1):** No incluye sincronización en la nube ni el módulo avanzado de historial/consulta general que se abordará en la siguiente fase.

---

## 2. Supuestos y Riesgos (Assumptions & Risks)

### Supuestos
1. **Persistencia Local Segura:** Almacenamiento 100% cliente en `localStorage` bajo clave prefijada por usuario: `logica_saved_items_${userId}`.
2. **Sesión Obligatoria:** Dado que no existe modo invitado en la plataforma, todo guardado está garantizado de asociarse a un `userId` existente.
3. **Validación Sintáctica:** Las FBF se validan mediante `FBFParser.parse()` antes de ser guardadas para evitar corromper la biblioteca del estudiante con fórmulas no válidas.

### Riesgos y Mitigaciones
* **Riesgo:** El usuario alcanza el tope de cuota (ej. 15 atómicas) y no sabe por qué no puede guardar más.
  * *Mitigación:* Se implementa un flujo en dos tiempos:
    1. **Aviso explícito e inmediato:** Se notifica claramente que se alcanzó el límite máximo de elementos permitidos en esa categoría (ej. *"Límite alcanzado: Ya tienes 15/15 proposiciones atómicas guardadas"*).
    2. **Call to Action (CTA) interactivo:** A renglón seguido se le pregunta: *"¿Deseas revisar tu lista y eliminar alguna para hacer espacio?"*, y si el usuario responde afirmativamente, se abre directamente el menú en modo de gestión/borrado.
* **Riesgo:** Cargar una FBF en el Constructor Visual que contenga variables aún no definidas en la columna de atómicas.
  * *Mitigación:* El importador analiza los símbolos de la FBF y genera automáticamente en `AppState.builderAtomics` las variables faltantes para que el usuario pueda asignarles texto.
* **Riesgo:** Inyección de código malicioso o rotura de estilos en cadenas en español.
  * *Mitigación:* Sanitización estricta de cadenas de texto antes de la inyección en el DOM mediante `escapeHtml` y `textContent`.

---

## 3. Registro de Decisiones (Decision Log)

| # | Decisión | Alternativas consideradas | Razón de la elección |
|---|---|---|---|
| **D1** | **Enfoque Popover Contextual** frente a Modal Centrado | Modal flotante `<dialog>` centrado | Mantiene visible el contexto de trabajo en el lienzo/input y agiliza la inserción en 1-2 clics. |
| **D2** | **Cuotas rígidas por categoría (15 atómicas, 20 FBF, 15 moleculares)** | Almacenamiento ilimitado | Evita degradación de rendimiento en `localStorage` y previene saturación visual en el menú desplegable. |
| **D3** | **Biblioteca unificada compartida (Cross-Tab)** | Bibliotecas separadas para Constructor e Inverso | Permite al estudiante verificar el proceso inverso de una fórmula que construyó visualmente y viceversa. |
| **D4** | **Botones limpios y feedback de cuota interno** | Mostrar `(n/15)` en el propio texto del botón | Mantiene una estética limpia y NeoPop moderna en la interfaz principal, ubicando el contador en la cabecera del menú. |
| **D5** | **Inserción dual para atómicas con sobreescritura directa** | Solo autocompletar secuencial / Preguntar si desea sobreescribir | Da libertad de asignar a letras específicas ($p, q, r...$), reemplazando el valor anterior fluidamente sin diálogos molestos. |
| **D6** | **CTA proactivo ante límite de cuota alcanzado** | Solo mostrar toast de error estático | Si se alcanza el límite, se le ofrece al usuario abrir el menú de guardados para seleccionar cuál borrar y hacer espacio. |

---

## 4. Diseño Técnico Detallado

### 4.1. Servicio de Persistencia (`js/savedItemsStorage.js`)
Clave de almacenamiento: `logica_saved_items_${userId}`.

```typescript
interface SavedItemsDB {
  atomics: Array<{
    id: string;          // Ej: "at_abc123"
    text: string;        // Ej: "llueve por la tarde"
    createdAt: string;   // ISO String
  }>;
  fbf: Array<{
    id: string;          // Ej: "fbf_def456"
    formula: string;     // Ej: "(p ∧ q) → ¬r"
    createdAt: string;
  }>;
  molecules: Array<{
    id: string;          // Ej: "mol_ghi789"
    sentence: string;    // Ej: "Si llueve y truena, entonces no salgo"
    fbf: string;         // Ej: "(p ∧ q) → ¬r"
    createdAt: string;
  }>;
}

const QUOTAS = {
  atomics: 15,
  fbf: 20,
  molecules: 15
};
```

**Métodos del Servicio:**
* `getItems(userId, category): Array<Item>`
* `saveItem(userId, category, data): { success: boolean, reason?: 'quota_full'|'invalid'|'empty', item?: Item }`
* `deleteItem(userId, category, itemId): { success: boolean }`
* `isQuotaFull(userId, category): boolean`
* `getCount(userId, category): { current: number, max: number }`

---

### 4.2. Componentes de Interfaz y Popover (`SavedItemsPopover`)

#### Ubicación de Botones en UI:
1. **Constructor Visual:**
   * Cabecera de Proposiciones Atómicas: `Guardar Atómica` y `Agregar Atómica`.
   * Bloque de FBF Resultante: `Guardar FBF` y `Agregar FBF`.
   * Bloque de Proposición Molecular: `Guardar Molecular` y `Agregar Molecular`.
2. **Proceso Inverso:**
   * Input de FBF: `Guardar FBF` y `Agregar FBF`.
   * Asignación de Variables Detectadas: `Guardar Atómica` y `Agregar Atómica`.
   * Resultado Molecular Reconstruido: `Guardar Molecular` y `Agregar Molecular`.

#### Estructura del Popover:
```html
<div class="saved-items-popover neo-popover">
  <div class="saved-popover-header">
    <span class="saved-popover-title">Proposiciones Atómicas Guardadas</span>
    <span class="saved-popover-quota badge">4 / 15</span>
  </div>
  <div class="saved-items-list">
    <!-- Fila por cada elemento guardado -->
    <div class="saved-item-row" data-id="...">
      <span class="saved-item-content">"llueve por la tarde"</span>
      <div class="saved-item-actions">
        <!-- Inserción Rápida -->
        <button class="btn btn-xs btn-primary btn-insert-direct" title="Insertar en primer espacio libre">Insertar</button>
        <!-- Selector de Variable (Solo para atómicas) -->
        <div class="var-selector-dropdown">
          <button class="btn btn-xs btn-secondary btn-choose-var">En...</button>
          <!-- Despliega p, q, r, s, t -->
        </div>
        <!-- Papelera -->
        <button class="btn-clear-inline btn-delete-saved" title="Eliminar guardado">🗑️</button>
      </div>
    </div>
  </div>
</div>
```

---

### 4.3. Flujos de Comportamiento

#### Flujo de Inserción de Atómicas:
* **"Insertar" (Directo):**
  1. Si las variables activas están vacías, ocupa la primera ($p$).
  2. Si una ya tiene contenido, busca la siguiente variable vacía activa.
  3. Si todas están ocupadas, agrega una nueva variable ($+ Variable$) y le asigna el enunciado.
* **"En [Letra]" (Específico):**
  1. Si la letra ya está creada, asigna el texto directamente (reemplazando cualquier enunciado anterior).
  2. Si la letra no está aún activa, crea las variables intermedias hasta alcanzarla y le asigna el enunciado.
  3. Actualiza reactivamente el lienzo y la oración generada.

#### Flujo de Inserción de FBF:
* **En Constructor Visual:** Tokeniza la fórmula matemática/lógica mediante un lexer liviano (`tokens = tokenizeFBF(formula)`), puebla `AppState.builderTokens`, asegura que existan las variables necesarias en `builderAtomics` y refresca el lienzo visual.
* **En Proceso Inverso:** Asigna el string al campo `#inverse-fbf-input` y dispara automáticamente el evento de análisis (`#btn-parse-inverse`).

#### Flujo de Cuota Llena y CTA:
1. El usuario presiona `Guardar [n]`.
2. El servicio detecta `isQuotaFull(category) === true`.
3. **Paso 1 (Aviso explícito):** Se muestra un mensaje visual/toast de advertencia comunicando que se alcanzó la cuota:
   > *"Límite alcanzado: Ya tienes el máximo permitido de [15/20] elementos guardados en esta categoría."*
4. **Paso 2 (Call to Action interactivo):** Inmediatamente se presenta el diálogo interactivo NeoPop de confirmación:
   > *"¿Deseas revisar tu lista y eliminar alguna para hacer espacio?"*
5. Si el usuario acepta (**"Sí, gestionar"**), se despliega de inmediato el popover enfocado en modo eliminación para que elija fácilmente cuál borrar. Si cancela, no ocurre ninguna acción obstructiva.

---

## 5. Estrategia de Pruebas (Test Plan)

1. **Pruebas Unitarias (`tests/savedItemsStorage.test.js`):**
   * Validación de cuotas (bloqueo al elemento 16 de atómicas y 21 de FBF).
   * Aislamiento por `userId` (el usuario B no ve lo guardado por el usuario A).
   * Validación de no permitir guardar vacíos o FBF con sintaxis incorrecta.
   * Eliminación y decremento correcto del contador.
2. **Pruebas de Integración y UI:**
   * Inserción secuencial en atómicas (primera vacía, siguiente vacía, creación de nueva variable).
   * Reemplazo limpio al elegir letra específica con contenido previo.
   * Carga bidireccional: Guardar en Constructor Visual -> Abrir en Proceso Inverso.
