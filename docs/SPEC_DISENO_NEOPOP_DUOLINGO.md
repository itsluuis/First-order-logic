# Especificación de Diseño: Neo-Pop Gamificado & Esencia Duolingo
**Software de Lógica Simbólica | Proposiciones Moleculares & FBF**
*Universidad José Antonio Páez — Semestre 4*

---

## 1. Resumen de Comprensión (Understanding Summary)
* **Objetivo:** Transformar la identidad visual del software educativo de Lógica Simbólica en una experiencia **Neo-Pop Gamificada**, fusionando la satisfacción táctil y amigable de **Duolingo** con la energía visual y tipográfica del **Maximalismo**.
* **Público:** Estudiantes de Semestre 4 de Ingeniería/Computación en la cátedra de Lógica Simbólica, profesores tutores y administradores.
* **Restricción Crítica:** **Cero alteración de lógica JavaScript.** No se modificarán los motores de parsing (AST), generadores deterministas, evaluador de tablas de verdad, base de datos local offline (`localStorage`), red neuronal multicapa (MLP) ni los IDs/selectores del DOM existentes.
* **Tecnología:** **100% CSS Natural (Vanilla CSS Moderno)** sin compiladores, sin Node build steps y sin librerías externas para garantizar operación offline total.

---

## 2. Registro de Decisiones (Decision Log)

| ID | Decisión | Alternativas | Justificación |
|---|---|---|---|
| **D1** | **Dirección Estética:** Neo-Pop Gamificado | Cyber-Maximalismo Arcade, Editorial Bold & Toy | Máxima empatía pedagógica, diversión interactiva y micro-recompensas visuales continuas. |
| **D2** | **Alcance:** Rediseño Visual Integral Global | Solo Práctica, Por fases | Experiencia de usuario coherente y armónica en todas las pestañas y modales del sistema. |
| **D3** | **Tema:** Soporte Dual (Dark & Light Neo-Pop) | Solo Light Duolingo, Solo Dark | Modo oscuro inmersivo tipo noche arcade y modo claro nítido estilo Duolingo clásico. |
| **D4** | **Tecnología:** CSS Natural (Vanilla Moderno) | Tailwind CSS (CLI / CDN) | Preserva el funcionamiento 100% offline, evita dependencias y protege los templates JS existentes. |
| **D5** | **Arquitectura:** Tokens Semánticos 3D | Brutalismo plano, Skin superficial | Permite física táctil de extrusión 3D (`translateY(3px)` + compresión de sombra) en todos los controles. |
| **D6** | **Regla Visual:** 100% Libre de Emojis | Uso casual de emojis | Se emplean exclusivamente vectores SVG técnicos y limpios (`js/icons.js`) para mantener profesionalismo. |
| **D7** | **Identidad Web:** Favicon Vectorial SVG | Icono genérico o PNG | Cápsula 3D con `∧∨` en gradiente para total consistencia desde la pestaña del navegador. |

---

## 3. Tokens de Diseño y Sistema de Color

### Paleta Semántica
* **Verde Éxito / Verdadero ($V$):** Base `#58CC02` &bull; Sombra 3D `#46A302` &bull; Fondo suave `rgba(88, 204, 2, 0.12)`
* **Azul Eléctrico / Variables Atómicas ($p, q, r$):** Base `#1CB0F6` &bull; Sombra 3D `#1899D6` &bull; Fondo suave `rgba(28, 176, 246, 0.12)`
* **Naranja Foxy / Conectivos Operadores ($\neg, \land, \lor, \to, \leftrightarrow$):** Base `#FF9600` &bull; Sombra 3D `#E58600` &bull; Fondo suave `rgba(255, 150, 0, 0.12)`
* **Rojo Coral / Falso ($F$) / Contradicción:** Base `#FF4B4B` &bull; Sombra 3D `#EA2B2B` &bull; Fondo suave `rgba(255, 75, 75, 0.12)`
* **Púrpura Mágico / Proposiciones Moleculares:** Base `#CE82FF` &bull; Sombra 3D `#A559D9` &bull; Fondo suave `rgba(206, 130, 255, 0.12)`
* **Amarillo Corona / Contingencia & Rachas:** Base `#FFC800` &bull; Sombra 3D `#E5A500` &bull; Fondo suave `rgba(255, 200, 0, 0.12)`

### Superficies y Contraste Dual
* **Modo Claro (Duolingo Day):**
  * Fondo general: `#F7F9FA`
  * Tarjetas: `#FFFFFF` con borde `2px solid #E5E5E5` y base 3D de `4px` (`#D8DFE3`)
  * Texto primario: `#202F36` &bull; Texto secundario: `#4B4B4B` &bull; Texto atenuado: `#777777`
* **Modo Oscuro (Neo-Pop Night):**
  * Fondo general: `#0B0F19` con patrón sutil de símbolos lógicos flotantes en baja opacidad
  * Tarjetas: `#161F30` con borde `2px solid #2A384F` y base 3D de `4px` (`#101724`)
  * Texto primario: `#F8FAFC` &bull; Texto secundario: `#94A3B8` &bull; Texto atenuado: `#64748B`

### Radios y Métricas Ergonómicas
* **Botones e Inputs:** `border-radius: 16px`
* **Píldoras y Badges:** `border-radius: 9999px`
* **Tarjetas y Modales:** `border-radius: 24px` a `28px`
* **Física de Pulsación:** Reposo `box-shadow: 0 4px 0 ...` $\to$ Activo `translateY(3px)` con `box-shadow: 0 1px 0 ...`

---

## 4. Componentes Clave

### A. Acceso al Sistema (Login & Registro)
* Tarjeta central estilo onboarding táctil.
* Selector de 3 perfiles (Estudiante, Profesor, Administrador) con estado activo destacado en azul Duolingo y borde 3D.
* Píldora deslizante para alternar entre "Iniciar Sesión" y "Registrarse".
* Campo de PIN de 3 dígitos con espaciado amplio y glifos `● ● ●`.
* Botón de envío verde `#58CC02` con extrusión 3D completa de 5px.

### B. Header y Navegación
* Logotipo `∧∨` en píldora con extrusión 3D y gradiente cian-esmeralda.
* Favicon vectorial SVG sincronizado en `<head>`.
* Pestañas principales `.nav-tab` que se transforman en cápsulas con base sólida 3D de 4px al estar activas.

### C. Constructor Visual
* **Tokens de Fórmula (Fichas 3D Magnéticas):**
  * Variables en azul `#1CB0F6` con sombra `#1899D6`.
  * Conectivos en naranja `#FF9600` con sombra `#E58600`.
  * Paréntesis en tono índigo/gris perla.
* **Teclado de Conectivos:** Teclas físicas cuadrangulares con símbolo prominente, etiqueta descriptiva y pulsación mecánica táctil.
* **Caja de Resultados:** Contenedores con marco de alto contraste y tipografía nítida para la FBF y la oración en lenguaje natural.

### D. Centro de Prácticas & Mascota Moli
* **Lobby Bento:** Tarjetas 3D para los 4 minijuegos con esquinas pronunciadas y acentos cromáticos individuales.
* **Sesión de Juego:** Barra de temporizador con relieve glossy y opciones `.p-option-btn` con feedback inmediato (Verde correcto / Rojo error).
* **Moli Tutor:** Carcasa 3D para el visor OLED y globos de diálogo con diseño de bocadillo de cómic pop.

### E. Tabla de Verdad y Árbol Sintáctico
* Celdas $V$ y $F$ representadas como píldoras táctiles con relieve.
* Insignia gigante 3D para el diagnóstico formal (Tautología / Contradicción / Contingencia).
* Árbol sintáctico con ramas limpias y nodos en fichas circulares elevadas.
