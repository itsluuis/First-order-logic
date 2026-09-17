# Software de Lógica Simbólica: Proposiciones Moleculares & FBF

Aplicación web interactiva desarrollada para la cátedra de **Lógica Simbólica (Semestre 4 - Universidad José Antonio Páez)**. Permite construir proposiciones moleculares a partir de proposiciones atómicas y conectivos lógicos, obtener la **Fórmula Bien Formada (FBF)** correspondiente, realizar el **proceso inverso** determinista (de FBF a lenguaje natural), generar expresiones y proposiciones aleatorias de forma integrada, evaluar tablas de verdad completas y gestionar perfiles de acceso.

---

## 🌟 Características Principales

### 1. Perfiles de Acceso Simplificados y Sin Errores
El sistema cuenta con 3 perfiles dedicados para evitar confusiones y garantizar la seguridad:
- 🎓 **Estudiante**: Acceso directo para práctica, construcción visual, proceso inverso y tablas de verdad.
- 👨‍🏫 **Profesor**: Acceso pedagógico con todas las herramientas analíticas.
- 🛡️ **Administrador**: Requiere contraseña (`1234`). Tiene acceso exclusivo a la pestaña de **⚙️ Parámetros** para configurar políticas de la plataforma (ej. notación obligatoria).
- **Protección de Navegación**: Al cerrar sesión desde la pestaña de parámetros, el sistema restablece automáticamente la vista activa al **Constructor Visual**, impidiendo accesos indebidos de perfiles no autorizados.

### 2. Constructor Visual de Proposiciones Moleculares (Proceso Directo)
- **Definición de Proposiciones Atómicas**: Permite asignar enunciados en lenguaje natural para variables básicas ($p, q, r, s, t...$) y añadir nuevas variables dinámicamente.
- **🎲 Atómicas Aleatorias**: Botón integrado que genera enunciados en español de forma aleatoria considerando exactamente cuántas variables activas hay en pantalla.
- **Ensamble Visual Interactivo**: Lienzo de tokens con botones para insertar variables, negación ($\neg$), conjunción ($\land$), disyunción ($\lor$), condicional ($\to$), bicondicional ($\leftrightarrow$) y paréntesis.
- **🎲 Molecular Aleatoria**: Genera automáticamente proposiciones moleculares aleatorias complejas y anidadas (ej. $p \land (\neg s \to t)$ o $s \to (\neg s \land ((p \lor t) \lor (t \land s)))$), cargando los tokens en el lienzo y actualizando la traducción al instante.
- **✕ Limpieza Rápida**: Botón para limpiar todo el lienzo de la proposición de un solo clic, además de botones individuales para vaciar el texto de cualquier proposición atómica rápidamente.
- **Visualización Simultánea**: Genera en tiempo real tanto la **Fórmula Bien Formada (FBF)** con paréntesis balanceados como la **Proposición Molecular en Lenguaje Natural** en español.

### 3. Proceso Inverso Determinista (FBF $\to$ Proposiciones Moleculares)
- Admite el ingreso o pegado de cualquier FBF mediante teclado físico o virtual auxiliar.
- **🎲 Generar FBF Aleatoria**: Crea de inmediato una FBF válida con paréntesis balanceados y la analiza en pantalla.
- **Analizador Léxico y Sintáctico (AST)**: Identifica y extrae las variables atómicas presentes ($p, q, r...$).
- **🎲 Generar Atómicas Aleatorias**: Permite autocompletar enunciados para las variables detectadas con un solo clic, o bien escribirlos manualmente para mantener el principio de determinismo y predictibilidad.
- **Reconstrucción Automática**: Ensambla y formatea la proposición molecular en español respetando la precedencia formal de operadores.

### 4. Herramientas Pedagógicas de Análisis Lógico
- **Tabla de Verdad Exhaustiva**:
  - Calcula automáticamente todas las $2^n$ combinaciones de verdad.
  - Muestra columnas intermedias de evaluación paso a paso para fórmulas de hasta 6 proposiciones atómicas. Cuando se operan más de 6 proposiciones, la tabla visual se sustituye por un aviso pedagógico indicando este límite, manteniendo siempre visible el cálculo del diagnóstico formal.
  - Diagnóstico formal automático: **TAUTOLOGÍA**, **CONTRADICCIÓN** o **CONTINGENCIA**.
- **Árbol Sintáctico Jerárquico**:
  - Representación gráfica en árbol que desglosa el conectivo principal, los operadores secundarios y las proposiciones atómicas.
- **Doble Notación Lógica con Bloqueo de Administrador**:
  - **Notación Estándar**: $\neg, \land, \lor, \to, \leftrightarrow$
  - **Notación Alternativa**: $\sim, \&, \lor, \supset, \equiv$
  - El administrador puede permitir libre elección o forzar una notación obligatoria desde la pestaña de Parámetros.

---

## 🚀 Tecnologías Utilizadas

- **HTML5 Semántico**: Estructura modular y accesible.
- **CSS3 Moderno & Glassmorphism**: Paleta tecnológica oscura/clara, efectos translúcidos con `backdrop-filter`, microinteracciones y diseño 100% responsivo.
- **JavaScript Moderno (ES6+ Modules)**:
  - `storage.js`: Capa de perfiles fijos y persistencia local de configuración.
  - `ast.js`: Tokenizador, analizador léxico/sintáctico y Árbol de Sintaxis Abstracta (AST).
  - `truthTable.js`: Evaluador booleano de $2^n$ combinaciones y clasificador formal.
  - `naturalLanguage.js`: Traductor determinista entre AST y español.
  - `generators.js`: Generador de proposiciones atómicas según variables activas, serialización de AST a tokens y FBFs.
  - `app.js`: Coordinador de eventos, vistas y navegación segura.

---

## 💻 Instrucciones de Uso y Ejecución

### Opción 1: Ejecución Directa en el Navegador
Abre el archivo `index.html` en tu navegador web preferido (Google Chrome, Mozilla Firefox, Microsoft Edge, etc.).

### Opción 2: Ejecución mediante Servidor Local
```bash
# Con Python
python -m http.server 8080

# O con Node.js (npx)
npx serve .
```
Luego accede a `http://localhost:8080` en tu navegador.

---

## 🔑 Credenciales de Acceso

| Perfil | Contraseña | Privilegios |
| :--- | :--- | :--- |
| **Estudiante** | *(No requerida)* | Constructor visual, proceso inverso, generadores aleatorios y tablas de verdad. |
| **Profesor** | *(No requerida)* | Todas las herramientas pedagógicas y analíticas del estudiante. |
| **Administrador** | `1234` | Todo lo anterior más acceso exclusivo a la pestaña de **⚙️ Parámetros** para fijar políticas de notación. |

---

## 👤 Autor

- **Luis Carlos** ([@itsluuis](https://github.com/itsluuis))
- Cátedra de Lógica Simbólica - Universidad José Antonio Páez
