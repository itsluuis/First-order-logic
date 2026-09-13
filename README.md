# Software de Lógica Simbólica: Proposiciones Moleculares & FBF

Aplicación web interactiva desarrollada para la cátedra de **Lógica Simbólica (Semestre 4 - Universidad José Antonio Páez)**. Permite construir proposiciones moleculares a partir de proposiciones atómicas y conectivos lógicos, obtener la **Fórmula Bien Formada (FBF)** correspondiente, realizar el **proceso inverso** determinista (de FBF a lenguaje natural), generar expresiones y proposiciones aleatorias, evaluar tablas de verdad completas y gestionar accesos con control estricto de aforo.

---

## 🌟 Características Principales

### 1. Constructor Visual de Proposiciones Moleculares (Proceso Directo)
- **Definición de Proposiciones Atómicas**: Permite asignar enunciados en lenguaje natural para variables básicas ($p, q, r, s, t...$) y añadir nuevas variables dinámicamente.
- **Ensamble Visual Interactivo**: Lienzo de tokens con botones para insertar variables, negación ($\neg$), conjunción ($\land$), disyunción ($\lor$), condicional ($\to$), bicondicional ($\leftrightarrow$) y paréntesis.
- **Visualización Simultánea**: Genera en tiempo real tanto la **Fórmula Bien Formada (FBF)** con paréntesis balanceados como la **Proposición Molecular en Lenguaje Natural** en español.

### 2. Proceso Inverso Determinista (FBF $\to$ Proposiciones Moleculares)
- Admite el ingreso o pegado de cualquier FBF mediante teclado físico o virtual auxiliar.
- **Analizador Léxico y Sintáctico (AST)**: Valida la gramática formal y el equilibrio de paréntesis, identificando las variables atómicas únicas presentes en la fórmula.
- **Mapeo Explícito del Usuario**: Siguiendo el principio de **determinismo y predictibilidad**, solicita al usuario definir el enunciado específico en lenguaje natural para cada variable detectada.
- **Reconstrucción Automática**: Ensambla y formatea la proposición molecular en español respetando la precedencia de operadores.

### 3. Generadores Aleatorios
- **Generador de Proposiciones Moleculares**: Produce oraciones compuestas coherentes en español combinando enunciados atómicos y conectivos lógicos cotidianos.
- **Generador de Fórmulas Bien Formadas (FBF)**: Crea expresiones lógicas válidas con paréntesis perfectamente balanceados, con soporte para complejidades simple, media o larga/anidada (ej. $s \to (\neg s \land ((p \lor t) \lor (t \land s)))$).
- Enlace directo para cargar la fórmula generada en el Proceso Inverso o en la Tabla de Verdad con un solo clic.

### 4. Herramientas Pedagógicas de Análisis Lógico
- **Tabla de Verdad Exhaustiva**:
  - Calcula automáticamente todas las $2^n$ filas de combinaciones de verdad.
  - Muestra columnas intermedias de evaluación paso a paso.
  - Diagnóstico formal automático: **TAUTOLOGÍA**, **CONTRADICCIÓN** o **CONTINGENCIA**.
- **Árbol Sintáctico Jerárquico**:
  - Representación gráfica en árbol que desglosa el conectivo principal, los operadores secundarios y las proposiciones atómicas.
- **Doble Notación Lógica con Bloqueo de Administrador**:
  - **Notación Estándar**: $\neg, \land, \lor, \to, \leftrightarrow$
  - **Notación Alternativa**: $\sim, \&, \lor, \supset, \equiv$
  - El administrador puede permitir libre elección o forzar una notación obligatoria para todo el sistema.

### 5. Control de Acceso, Aforo y Seguridad de Administrador
- **Perfil de Administrador Precargado**:
  - **Usuario**: `admin`
  - **Contraseña**: `1234`
  - **Protección Absoluta**: Inmune a eliminación por diseño tanto en la interfaz como en el código fuente.
- **Control de Capacidad Máxima (Aforo)**:
  - El administrador puede fijar y modificar el límite máximo de perfiles en la base de datos local.
  - Si se alcanza la capacidad máxima, el registro bloquea nuevos usuarios con el mensaje:
    > *"Ya se ha alcanzado la capacidad máxima de usuarios y deberá esperar a que se libere un espacio para crear el suyo."*
- **Eliminación Segura de Perfiles**:
  - Pestaña en el Login que permite dar de baja perfiles regulares seleccionando el usuario e introduciendo su contraseña personal.
- **Persistencia Local (`DBService`)**:
  - Arquitectura desacoplada en base de datos local persistente (`localStorage`), lista para incorporar futuras funciones de guardado.

---

## 🚀 Tecnologías Utilizadas

- **HTML5 Semántico**: Estructura modular y accesible.
- **CSS3 Moderno & Glassmorphism**: Paleta tecnológica oscura/clara, efectos translúcidos con `backdrop-filter`, microinteracciones y diseño 100% responsivo.
- **JavaScript Moderno (ES6+ Modules)**:
  - `storage.js`: Capa de base de datos local y gestión de usuarios.
  - `ast.js`: Tokenizador, analizador léxico/sintáctico y Árbol de Sintaxis Abstracta.
  - `truthTable.js`: Evaluador booleano de $2^n$ combinaciones y clasificador formal.
  - `naturalLanguage.js`: Traductor determinista entre AST y español.
  - `generators.js`: Generador de expresiones y proposiciones aleatorias.
  - `app.js`: Coordinador de eventos e interfaz de usuario.

---

## 💻 Instrucciones de Uso y Ejecución

### Opción 1: Ejecución Directa en el Navegador
No requiere instalación de librerías externas ni servidores de bases de datos adicionales:
1. Clona o descarga el repositorio.
2. Abre el archivo `index.html` en tu navegador web preferido (Google Chrome, Mozilla Firefox, Microsoft Edge, etc.).

### Opción 2: Ejecución mediante Servidor Local
Para un entorno de desarrollo óptimo con módulos ES6:
```bash
# Con Python
python -m http.server 8080

# O con Node.js (npx)
npx serve .
```
Luego accede a `http://localhost:8080` en tu navegador.

---

## 🔑 Credenciales Iniciales

| Rol | Usuario | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | `1234` | Control de aforo, fijación de políticas de notación, vista de usuarios registrados (inmune a borrado). |
| **Estudiante / Usuario** | *(Crear en pantalla)* | *(Definida por usuario)* | Constructor visual, proceso inverso, generadores aleatorios y tablas de verdad. |

---

## 📁 Estructura del Proyecto

```text
├── index.html                  # Interfaz principal SPA y modales
├── README.md                   # Documentación oficial del proyecto
├── css/
│   └── style.css               # Sistema de diseño, temas oscuro/claro y glassmorphism
└── js/
    ├── app.js                  # Controlador general y eventos de la UI
    ├── storage.js              # Capa de Base de Datos Local y seguridad
    └── logic/
        ├── ast.js              # Parser léxico/sintáctico para FBF (AST)
        ├── generators.js       # Generadores aleatorios de FBF y lenguaje natural
        ├── naturalLanguage.js  # Traductor determinista a español
        └── truthTable.js       # Generador de tablas de verdad y árbol sintáctico
```

---

## 👤 Autor

- **Luis Carlos** ([@itsluuis](https://github.com/itsluuis))
- Cátedra de Lógica Simbólica - Universidad José Antonio Páez
