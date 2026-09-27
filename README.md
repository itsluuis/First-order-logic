# Software de Lógica Simbólica: Proposiciones Moleculares & FBF

Aplicación web interactiva desarrollada para la cátedra de **Lógica Simbólica (Semestre 4 - Universidad José Antonio Páez)**. Permite construir proposiciones moleculares a partir de proposiciones atómicas y conectivos lógicos, obtener la **Fórmula Bien Formada (FBF)** correspondiente, realizar el **proceso inverso** determinista (de FBF a lenguaje natural), generar expresiones y proposiciones aleatorias de forma integrada, evaluar tablas de verdad completas, competir en un centro de prácticas gamificado con motor de Machine Learning local y contar con la tutoría de **Moli**, la mascota robótica OLED.

---

## Características Principales

### 1. Perfiles de Acceso Simplificados y Seguros
El sistema cuenta con 3 perfiles dedicados para evitar confusiones y garantizar la seguridad:
- **Estudiante**: Acceso directo para práctica, construcción visual, proceso inverso, tablas de verdad y centro de desafíos.
- **Profesor**: Acceso pedagógico completo con todas las herramientas analíticas.
- **Administrador**: Requiere contraseña (`1234`). Posee acceso exclusivo a la pestaña de **Parámetros** para configurar políticas globales de la plataforma (ej. forzar una notación obligatoria).
- **Protección de Navegación**: Al cerrar sesión desde la pestaña de parámetros, el sistema restablece automáticamente la vista activa al **Constructor Visual**, impidiendo accesos indebidos de perfiles no autorizados.

### 2. Constructor Visual de Proposiciones Moleculares (Proceso Directo)
- **Definición de Proposiciones Atómicas**: Asigna enunciados en lenguaje natural para variables básicas ($p, q, r, s, t...$) y añade nuevas variables dinámicamente con limpieza rápida individual.
- **Atómicas Aleatorias**: Genera enunciados coherentes en español considerando el número exacto de variables activas en pantalla.
- **Ensamble Visual Interactivo**: Lienzo de tokens con botones ergonómicos para insertar variables, negación ($\neg$), conjunción ($\land$), disyunción ($\lor$), condicional ($\to$), bicondicional ($\leftrightarrow$) y paréntesis.
- **Molecular Aleatoria**: Genera automáticamente proposiciones moleculares aleatorias complejas y anidadas (ej. $p \land (\neg s \to t)$ o $s \to (\neg s \land ((p \lor t) \lor (t \land s)))$), cargando los tokens en el lienzo y actualizando la traducción al instante.
- **Limpieza Rápida**: Botón para limpiar todo el lienzo de la proposición de un solo clic, además de botones individuales para vaciar el texto de cualquier proposición atómica rápidamente.
- **Visualización Simultánea**: Genera en tiempo real tanto la **Fórmula Bien Formada (FBF)** con paréntesis balanceados como la **Proposición Molecular en Lenguaje Natural** en español.

### 3. Proceso Inverso Determinista (FBF a Proposiciones Moleculares)
- Admite el ingreso o pegado de cualquier FBF mediante teclado físico o virtual auxiliar.
- **Generar FBF Aleatoria**: Crea de inmediato una FBF sintácticamente válida con paréntesis balanceados y la analiza en pantalla.
- **Analizador Léxico y Sintáctico (AST)**: Identifica y extrae las variables atómicas presentes ($p, q, r...$).
- **Generar Atómicas Aleatorias**: Permite autocompletar enunciados para las variables detectadas con un solo clic, o bien escribirlos manualmente para mantener el principio de determinismo y predictibilidad.
- **Reconstrucción Automática**: Ensambla y formatea la proposición molecular en español respetando la precedencia formal de operadores.

### 4. Herramientas Pedagógicas de Análisis Lógico
- **Tabla de Verdad Exhaustiva**:
  - Calcula automáticamente todas las $2^n$ combinaciones de verdad.
  - Muestra columnas intermedias de evaluación paso a paso para fórmulas de hasta 6 proposiciones atómicas. Cuando se operan más de 6 proposiciones, la tabla visual se sustituye por un aviso pedagógico indicando este límite, manteniendo siempre visible el cálculo del diagnóstico formal.
  - Diagnóstico formal automático: **TAUTOLOGÍA**, **CONTRADICCIÓN** o **CONTINGENCIA**.
- **Árbol Sintáctico Jerárquico**:
  - Representación gráfica con ramas conectadas en CSS (`.tree`) que desglosa el conectivo principal en la raíz, los operadores secundarios y las proposiciones atómicas terminales.
- **Doble Notación Lógica con Bloqueo de Administrador**:
  - **Notación Estándar**: $\neg, \land, \lor, \to, \leftrightarrow$
  - **Notación Alternativa**: $\sim, \&, \lor, \supset, \equiv$
  - El administrador puede permitir libre elección o forzar una notación obligatoria desde la pestaña de Parámetros.

### 5. Centro de Prácticas Global (Gamificación con 4 Minijuegos)
Pestaña interactiva con menú de tarjetas Bento/Glassmorphism con efectos de hover/zoom, selector de dificultades (Fácil, Normal, Difícil) y temporizador en tiempo real:
- **Árbol Correcto:** Identifica la FBF generada por el árbol sintáctico jerárquico entre 4 opciones. Si fallas, la opción errónea se atenúa para permitir seguir deduciendo hasta acertar o expirar el tiempo. Tiempos: Fácil (2:00 min), Normal (1:30 min), Difícil (0:30 min).
- **Moleculares:** Lee enunciados en lenguaje natural y construye la FBF utilizando una paleta interactiva de bloques y tokens. Tiempos: Fácil (5:00 min), Normal (2:30 min), Difícil (1:30 min).
- **Veredicto:** Deduce a toda velocidad si la fórmula es Tautología, Contradicción o Contingencia. Acierto: +1 punto. Fallo: -1 punto (tope inferior en 0) y salta de inmediato a la siguiente. Tiempos: Fácil (2:00 min), Normal (1:30 min), Difícil (0:45 min).
- **Duelo contra Moli (IA):** Compite contra Moli evaluando si una fórmula es Verdadera o Falsa bajo asignaciones atómicas dadas. La IA evalúa la fórmula en tiempo real, simula tiempo de reflexión y comete fallos controlados según la dificultad elegida. Tiempos: Fácil (2:00 min), Normal (1:30 min), Difícil (1:00 min).
- **Mecanismos Anti-Spam y Variabilidad de Rondas:**
  - Bloqueo inmediato al seleccionar respuesta para evitar sumas duplicadas de puntos.
  - Pausa de cooldown visual (900 ms) entre ejercicios para diferenciar claramente cada ronda.
  - Buffer de historial (`lastFBFs`) que garantiza no repetir fórmulas de las 2 rondas previas.
  - Rotación obligatoria (`lastCorrectOptionIndex`): la opción correcta nunca se ubica en la misma posición de la ronda anterior.
- **Pantalla de Resumen Final:** Desglose detallado de puntuación, precisión porcentual, comparativa contra la IA en Duelo y diagnósticos emitidos por la Red Neuronal.

### 6. Mascota Robótica OLED ("Moli") & Tutor Inteligente
- **Visor Robótico OLED (174px × 90px):** Diseño tipo pantalla/cápsula con ojos vectoriales SVG expresivos y luz de neón cian/esmeralda.
- **Desplazamiento Fluido en Pantalla (Animación FLIP):** Al acceder al Centro de Prácticas o a la Pantalla de Resumen, Moli se desplaza suavemente en vuelo robótico (`cubic-bezier(0.25, 1.25, 0.5, 1)`) desde la esquina inferior derecha para acoplarse en la ranura dedicada (`#mascot-dock-slot`). Al salir o iniciar una partida, vuela de vuelta a su posición flotante.
- **Máquina de Estados de Animaciones Ociosas (Idle State Machine):**
  - **Pestañeo Natural:** Parpadeos simples y dobles espontáneos.
  - **Mirada Curiosa (Vacilando):** Desplaza sus ojos a la izquierda, sostiene la mirada, la pasa a la derecha y regresa al centro.
  - **Cara Escéptica / Inquisitiva:** Expresión asimétrica inspirada en el diseño de referencia (ojo izquierdo entrecerrado con ceja descendente y ojo derecho atento con ceja oblicua alzada en *smirk* analítico con leve inclinación del visor).
  - **Modo Siesta ("zzz") y Despertar:** Ojos adormilados con letras luminosas `z z Z` flotantes que ascienden, culminando en un despertar sobresaltado (ojos abiertos de par en par con brinco elástico) antes de retomar el reposo alerta.
- **Tutor Contextual con Auto-cierre de 4 Segundos:** Al hacer clic sobre Moli en cualquier pantalla, despliega un globo de diálogo que analiza didácticamente el contexto actual. El globo se auto-cierra con precisión tras **4 segundos exactos** y se posiciona inteligentemente sobre Moli tanto en modo flotante como cuando está acoplado.

### 7. Motor de Machine Learning (Red Neuronal Perceptrón Multicapa)
- **Implementación Local Nativa (`ml/neuralNet.js`):** Red Neuronal Multicapa (MLP) construida enteramente en JavaScript moderno vanilla, sin librerías externas ni dependencias de red.
- **Modelado Cognitivo del Estudiante (`ml/studentModel.js`):**
  - Evalúa y registra el desempeño del estudiante por conectivo lógico individual ($\neg, \land, \lor, \to, \leftrightarrow$).
  - Calcula tiempos de respuesta y tasas de error.
  - Calibra dinámicamente la velocidad y comportamiento de Moli en el modo Duelo.
  - Emite sugerencias y diagnósticos pedagógicos personalizados en el Lobby y en el Resumen final.

### 8. Diseño e Identidad Visual 100% Libre de Emojis
- Se sustituyeron todos los emojis por un catálogo integral de iconos vectoriales SVG limpios, técnicos y modernos (`js/icons.js`).
- Estética Glassmorphism refinada, tipografía técnica, transiciones suaves y microinteracciones de nivel profesional.

---

## Arquitectura de Software

```
proposiciones moleculares/
├── index.html                   # Interfaz semántica principal y modales
├── README.md                    # Documentación general del proyecto
├── css/
│   ├── style.css                # Estilos globales, diseño del sistema y árbol sintáctico (.tree)
│   └── practice-mascot.css      # Estilos del Centro de Prácticas, animaciones OLED y Moli
├── js/
│   ├── app.js                   # Controlador principal, navegación segura y coordinación
│   ├── icons.js                 # Biblioteca de iconos vectoriales SVG
│   ├── storage.js               # Capa de persistencia local y perfiles de usuario
│   ├── logic/
│   │   ├── ast.js               # Tokenizador, parser formal y árbol sintáctico (AST)
│   │   ├── generators.js        # Generadores deterministas de fórmulas y atómicas
│   │   ├── naturalLanguage.js   # Traductor determinista AST <-> lenguaje natural
│   │   └── truthTable.js        # Motor evaluador de tablas de verdad y clasificador
│   ├── mascot/
│   │   ├── mascotController.js  # Coordinador pedagógico y estados de Moli
│   │   └── mascotView.js        # Renderizado SVG del visor OLED, vuelo FLIP y animaciones
│   ├── ml/
│   │   ├── neuralNet.js         # Red Neuronal Artificial (MLP) en JS nativo
│   │   └── studentModel.js      # Extractor de métricas y generador de recomendaciones
│   └── practice/
│       ├── practiceEngine.js    # Motor lógico de los 4 minijuegos, cooldowns y anti-spam
│       └── practiceView.js      # Renderizado de arenas de juego, lobby y resumen
└── docs/
    └── SPEC_PRACTICAS_Y_ML.md   # Especificación técnica detallada del sistema
```

---

## Instrucciones de Uso y Ejecución

### Opción 1: Ejecución Directa en el Navegador
Abre directamente el archivo `index.html` en cualquier navegador web moderno (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari, Brave).

### Opción 2: Servidor Local
Para una experiencia óptima con módulos ES6:
```bash
# Con Python
python -m http.server 8080

# O con Node.js (npx)
npx serve .
```
Luego navega a `http://localhost:8080` en tu explorador.

---

## Credenciales de Acceso

| Perfil | Contraseña | Privilegios |
| :--- | :--- | :--- |
| **Estudiante** | *(No requerida)* | Constructor visual, proceso inverso, tablas de verdad, centro de prácticas y duelos contra Moli. |
| **Profesor** | *(No requerida)* | Todas las herramientas pedagógicas y analíticas del estudiante. |
| **Administrador** | `1234` | Todo lo anterior más acceso exclusivo a la pestaña de **Parámetros** para fijar políticas de notación. |

---

## Autor

- **Luis Carlos** ([@itsluuis](https://github.com/itsluuis))
- Cátedra de Lógica Simbólica - Universidad José Antonio Páez
