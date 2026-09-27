# Especificación Técnica: Centro de Prácticas Global, Mascota Reactiva y Motor de Machine Learning

**Proyecto:** Software de Lógica Simbólica (Semestre 4 - Universidad José Antonio Páez)  
**Autor:** Luis Carlos ([@itsluuis](https://github.com/itsluuis))  
**Estado:** Validado y Aprobado tras fase de Brainstorming  

---

## 1. Resumen de Entendimiento (Understanding Summary)

* **Qué se va a construir:**
  1. **Centro de Prácticas Global:** Nueva pestaña principal con menú interactivo de minijuegos (efecto *hover/zoom*, descripciones emergentes y selección de dificultad: Fácil, Normal, Difícil).
  2. **4 Minijuegos Lógicos Didácticos:**
     - **Minijuego 1 - Árbol Correcto:** Identificar la FBF correspondiente a un árbol sintáctico generado aleatoriamente. Al fallar, la opción se atenúa en gris y permite seguir probando hasta acertar o expirar el tiempo. Tiempos: Fácil (2:00 min), Normal (1:30 min), Difícil (0:30 min).
     - **Minijuego 2 - Moleculares:** Construir la FBF mediante bloques/tokens a partir de un enunciado en lenguaje natural. Muestra avisos pedagógicos de corrección hasta acertar. Tiempos: Fácil (5:00 min), Normal (2:30 min), Difícil (1:30 min).
     - **Minijuego 3 - Veredicto:** Clasificar fórmulas como Tautología, Contradicción o Contingencia. Acierto: +1 punto. Fallo: -1 punto (tope mínimo 0) y avance inmediato.
     - **Minijuego 4 - Duelo Rápido contra la Mascota IA:** Competencia a contrarreloj de evaluación booleana (V o F) de fórmulas simples. La mascota compite con velocidad y tasa de error calibradas según la dificultad elegida.
  3. **Reglas Globales de Gamificación:** Sin títulos de "Ronda N", botón visible de salida en todo momento ("← Salir al Menú") y pantalla final de resumen con estadísticas detalladas y opciones de reintento.
  4. **Mascota Reactiva Global (SVG/CSS):** Basada en el concepto de visor OLED digital (tipo Baymax/EVE), con ojos vectoriales animados (`idle`, `happy`, `dizzy/sad`, `thinking`, `sleepy`). Funciona como widget persistente en toda la aplicación para ofrecer explicaciones contextuales al hacer clic.
  5. **Motor de Machine Learning (100% Local en Navegador):** Red neuronal en JavaScript (`Brain.js`) que aprende de los patrones de error por conectivo ($\neg, \land, \lor, \to, \leftrightarrow$), calibra la IA en el Duelo y genera recomendaciones personalizadas de estudio.

---

## 2. Suposiciones Base (Assumptions)

1. **Arquitectura 100% Client-Side:** No requiere conexión a internet, servidores backend ni claves API externas; ideal para defensas académicas offline.
2. **Persistencia Local:** Los pesos entrenados del modelo de ML y las estadísticas se guardan en el `localStorage` del navegador bajo el perfil del estudiante.
3. **Desacoplamiento:** El centro de prácticas y la mascota consumen las utilidades existentes (`ast.js`, `truthTable.js`, `generators.js`, `naturalLanguage.js`) sin modificar su lógica fundamental.

---

## 3. Bitácora de Decisiones (Decision Log)

| # | Decisión | Alternativas Evaluadas | Razón de la Elección |
|---|---|---|---|
| **1** | Enfoque de Machine Learning | API Externa vs. Heurística simple vs. Red Neuronal Local en JS | `Brain.js` local permite mostrar a los evaluadores una red neuronal supervisada real sin depender de conexión a internet ni costos de API. |
| **2** | 4to Minijuego | Impostor Lógico vs. Equivalencias vs. Duelo contra Mascota IA | El duelo directo humaniza la IA, motiva al estudiante y demuestra aprendizaje adaptativo con margen de error configurable. |
| **3** | Estilo Visual de Mascota | Orbe Abstracto vs. Búho Glassmorphism vs. Visor Robótico OLED SVG | La referencia del usuario (ojos vectoriales dinámicos) es ultra nítida, ligera, reactiva y se adapta al diseño dark glassmorphism. |
| **4** | Presencia de la Mascota | Exclusiva del Centro de Prácticas vs. Persistente Globalmente | Persistente en toda la web para que el usuario pueda cliquearla en cualquier pestaña y recibir explicaciones pedagógicas contextuales. |
| **5** | Arquitectura Técnica | Monolito en `app.js` vs. Canvas Arcade vs. Módulos ES6 Desacoplados | Módulos ES6 garantizan código ordenado, mantenible y escalable. |

---

## 4. Diseño Técnico Detallado

### 4.1 Estructura de Archivos
```text
js/
├── mascot/
│   ├── mascotView.js        # Renderizado SVG del visor, animaciones de ojos y globo de diálogo
│   └── mascotController.js  # Gestor de emociones y generador de explicaciones contextuales
├── practice/
│   ├── practiceView.js      # Tarjetas interactivas con zoom/hover, tableros y pantalla de resumen
│   └── practiceEngine.js    # Temporizadores, puntajes, control de dificultad y validación
└── ml/
    ├── brain.min.js         # Motor local de redes neuronales (~30KB)
    └── studentModel.js      # Red neuronal que mapea errores por conectivo a diagnósticos y destrezas
```

### 4.2 Máquina de Estados de la Mascota
* `idle`: Parpadeo espontáneo cada 3-5 s con ojos de cápsula.
* `happy`: Ojos `^ ^` o `> <` con salto sutil al acertar una respuesta.
* `dizzy` / `error`: Ojos `X X` al fallar o penalizar en el juego.
* `thinking`: Ojos entrecerrados y cejas anguladas al procesar el duelo.
* `sleepy`: Curvas inferiores `_ _` tras inactividad prolongada.

### 4.3 Sistema de Explicaciones Contextuales
* **Constructor Visual:** Explica la jerarquía de operadores y balance de paréntesis del lienzo actual.
* **Proceso Inverso:** Detalla la traducción estructurada de la FBF a lenguaje natural.
* **Tablas de Verdad:** Argumenta por qué el resultado formal es Tautología, Contradicción o Contingencia.
* **Centro de Prácticas:** Proporciona pistas lógicas sin desvelar la respuesta directa.

### 4.4 Red Neuronal y Recomendaciones Pedagógicas
* **Entradas:** Vector normalizado de errores por conectivo $[\text{err}_\neg, \text{err}_\land, \text{err}_\lor, \text{err}_\to, \text{err}_\leftrightarrow, \text{tiempo\_prom}, \text{puntaje}]$.
* **Salidas:** Nivel de destreza estimado (Principiante / Intermedio / Avanzado) y área específica a reforzar.
* **Recomendación Dinámica:** Mensaje personalizado en el resumen (ej. *"Tienes debilidad en condicionales $(\to)$. Practica Árbol Correcto en Normal"*).

---

## 5. Casos Límite y Casos de Prueba (Edge Cases & Test Suite)

1. **Puntajes Mínimos:** En *Veredicto*, garantizar `Math.max(0, score - 1)`.
2. **Fin de Tiempo Estricto:** Al llegar a `00:00`, congelar eventos de respuesta y pasar a la pantalla de resumen sin clics residuales.
3. **Anti-Spam:** Limitador de tasa (*throttle*) para evitar animaciones solapadas en la mascota.
4. **Prueba Específica de Salida con Globo Activo:** Abrir el globo de diálogo de la mascota pidiendo consejo durante un minijuego activo y presionar inmediatamente "← Salir al Menú". Verificar que el globo se cierre o adapte limpiamente al menú de prácticas sin lanzar excepciones ni dejar timers colgados en segundo plano.
