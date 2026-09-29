# Especificación Técnica: Sistema de Secciones (To-Do List) y Reestructuración de Administrador

## 1. Resumen de Entendimiento (Understanding Summary)
* **Objetivo:**
  1. Reestructurar el perfil de **Administrador** para que únicamente tenga acceso a la pestaña de **Parámetros**, incorporando módulos interactivos para eliminar estudiantes, profesores y secciones locales.
  2. Implementar una nueva base de datos local independiente (`js/sectionsStorage.js`) y una nueva pestaña **"Secciones"** para **Profesores** y **Estudiantes**.
* **Motivación:** Brindar a los profesores una herramienta ágil y desconectada (100% offline) para gestionar grupos de clase y asignar tareas To-Do a sus alumnos, al tiempo que se centraliza el control de datos en el Administrador.
* **Usuarios destino:**
  * **Administrador:** Acceso exclusivo a la consola de parámetros y borrado selectivo de cuentas y secciones.
  * **Profesor:** Creación de secciones, asignación de estudiantes, creación de tareas To-Do y monitoreo del avance de cumplimiento.
  * **Estudiante:** Acceso a sus secciones asignadas, visualización de tareas pendientes y marcado de cumplimiento simple mediante casillas de verificación.
* **Restricciones clave:**
  * Base de datos de secciones completamente desacoplada en su propio archivo (`js/sectionsStorage.js`) con clave independiente `logica_db_sections`.
  * La tarjeta de sección es un elemento clickeable en toda su superficie para entrar (sin botones redundantes), mostrando solo el Nombre y el contador *"X Tareas"*.
  * Para los estudiantes, el marcado de tareas se realiza mediante una casilla de verificación simple `[✓]`.
  * Al marcar la tarea, desaparece de inmediato para ese alumno; al completarla el 100% de los alumnos de la sección, se auto-elimina definitivamente de la base de datos.
  * Eliminación en cascada limpia desde el panel de Administrador.

---

## 2. Supuestos y Riesgos (Assumptions & Risks)

### Supuestos
1. **Persistencia 100% Offline:** Todo se almacena de forma síncrona en `localStorage` bajo dos bases de datos locales separadas: `logica_db_users` (usuarios) y `logica_db_sections` (secciones y tareas).
2. **Pertenencia múltiple:** Los estudiantes pueden estar inscritos en más de una sección a la vez.
3. **Confirmación de borrado:** El Administrador siempre recibe un diálogo de confirmación antes de eliminar usuarios o secciones para prevenir accidentes.

### Riesgos y Mitigaciones
* **Riesgo:** Un profesor crea una tarea en una sección que aún no tiene alumnos inscritos.
  * *Mitigación:* Se valida que la sección tenga al menos 1 alumno antes de agregar tareas, o no se auto-elimina hasta que haya al menos un alumno que la marque.
* **Riesgo:** Un alumno es eliminado por el Administrador mientras tiene tareas asignadas.
  * *Mitigación:* Al borrar a un estudiante, se le desvincula de las listas `studentIds` y `completedByStudentIds` de todas las secciones, recalculando si las tareas ya alcanzaron el 100% de los alumnos restantes.

---

## 3. Registro de Decisiones (Decision Log)

| # | Decisión | Alternativas consideradas | Razón de la elección |
|---|---|---|---|
| **D1 - D5** | Arquitectura base local, PIN de 3 dígitos y aislamiento de IA | IndexedDB / Cloud | Validadas en la fase anterior ([SPEC_AUTH_LOCAL_DB.md](file:///c:/Users/HP/Documents/Universidad%20Paez%20(Clases)/Semestre%204/Logica%20Simbolica/proposiciones%20moleculares/docs/SPEC_AUTH_LOCAL_DB.md)). |
| **D6** | Base de datos de secciones en archivo separado `sectionsStorage.js` | Embeber secciones en `storage.js` | Requisito explícito del usuario para mantener la información estrictamente separada. |
| **D7** | Auto-resolución de tareas al 100% de cumplimiento | Conservar tareas completadas en historial | Mantiene el sistema limpio, liviano y enfocado en la To-Do list activa. |
| **D8** | Tarjetas de sección clickeables y minimalistas | Añadir botones "Entrar", fechas y conteo de alumnos | Solicitado por el usuario para una interfaz despejada; basta con clickear la tarjeta. |
| **D9** | Cumplimiento mediante casilla de verificación simple `[✓]` | Botones complejos de envío o validadores automáticos | Mantiene el flujo de trabajo ágil e intuitivo para el estudiante en el aula. |

---

## 4. Diseño Técnico Detallado

### 4.1. Base de Datos de Secciones (`js/sectionsStorage.js`)
Clave de almacenamiento: `logica_db_sections`.

```typescript
interface Section {
  id: string;               // Ej: "sec_a92f"
  name: string;             // Ej: "Lógica Simbólica 01"
  professorId: string;      // ID del creador
  professorName: string;    // Nombre para mostrar
  studentIds: string[];     // IDs de alumnos asignados
  createdAt: string;        // Fecha ISO
  tasks: Task[];
}

interface Task {
  id: string;                      // Ej: "task_41b2"
  text: string;                    // Contenido de la tarea
  createdAt: string;               // Fecha ISO
  completedByStudentIds: string[]; // IDs de alumnos que la marcaron
}
```

#### API de `SectionsStorageService` (`sectionsDB`):
* `getSections()`: Obtiene todas las secciones.
* `getSectionsForProfessor(profId)`: Filtra por `professorId`.
* `getSectionsForStudent(studentId)`: Filtra donde `studentIds.includes(studentId)`.
* `createSection(name, professorId, professorName, studentIds)`: Valida nombre y registra.
* `deleteSection(sectionId)`: Elimina la sección.
* `deleteSectionsByProfessor(profId)`: Elimina en cascada todas las secciones del profesor.
* `removeStudentFromAllSections(studentId)`: Desvincula al alumno y recalcula tareas completadas.
* `addStudentToSection(sectionId, studentId)`: Añade alumno a la sección.
* `removeStudentFromSection(sectionId, studentId)`: Quita alumno de la sección.
* `addTask(sectionId, text)`: Añade tarea a la sección.
* `deleteTask(sectionId, taskId)`: Borra una tarea manualmente.
* `markTaskCompleted(sectionId, taskId, studentId)`: Marca la tarea para el estudiante. Si `completedByStudentIds.length >= studentIds.length`, elimina la tarea automáticamente de la sección.

---

### 4.2. Reestructuración del Administrador
* **Navegación:** Al ingresar como Admin, `app.js` añade la clase `hidden` a `#tab-nav-builder`, `#tab-nav-inverse`, `#tab-nav-practice` y `#tab-nav-sections`. La única pestaña disponible es `#tab-nav-admin` ("Parámetros").
* **Panel de Parámetros:**
  1. *Forzar Notación:* (módulo actual preservado).
  2. *Gestión de Usuarios:* Lista desplegable de usuarios registrados (Estudiantes y Profesores) + Botón *"Eliminar Usuario"*. Con confirmación y borrado en cascada.
  3. *Gestión de Secciones:* Lista desplegable de secciones activas + Botón *"Eliminar Sección"*. Con confirmación.

---

### 4.3. Interfaz de Secciones (Profesor)
* Pestaña `#tab-sections` en navbar.
* **Vista Principal:**
  * Botón *"Crear Nueva Sección"* (abre modal para ingresar Nombre y marcar casillas de los estudiantes registrados).
  * Cuadrícula de tarjetas de sección clickeables con: **Nombre de la Sección** y etiqueta de **"X Tareas"**. Al hacer clic en la tarjeta, abre la vista de detalle.
* **Vista Detalle de Sección:**
  * Encabezado con título de la sección y botón *"Volver"*.
  * **Módulo To-Do:** Campo de texto (*"Escribe la tarea..."*) + Botón *"Agregar Tarea"*.
  * **Lista de tareas activas:** Texto de la tarea, indicador desplegable (*"X de Y completaron"*, mostrando quiénes completaron en verde y quiénes faltan en gris) y botón de eliminar tarea.
  * **Módulo de Alumnos:** Lista de alumnos con opción de remover, y selector para agregar nuevos alumnos.

---

### 4.4. Interfaz de Secciones (Estudiante)
* Pestaña `#tab-sections` en navbar.
* **Vista Principal:**
  * Tarjetas clickeables de las secciones a las que pertenece, mostrando **Nombre de la Sección** y contador de **"X Tareas"** pendientes para él.
* **Vista Detalle de Sección (To-Do List):**
  * Lista de tareas activas aún no completadas por este estudiante.
  * Cada tarea cuenta con una casilla de verificación `[ ]`.
  * Al marcarla, se tilda `[✓]`, se muestra una animación de éxito con toast *"¡Tarea completada!"* y la tarea se oculta para ese alumno.
  * Si era el último alumno pendiente de la sección, la tarea se elimina automáticamente de la sección.
  * Si no hay pendientes: mensaje de éxito *"¡Estás al día! No tienes tareas pendientes"*.

---

## 5. Estrategia de Pruebas
1. Iniciar sesión como Admin -> Validar que SOLO se ve la pestaña "Parámetros".
2. Como Profesor -> Crear sección "Sección A" seleccionando 2 alumnos registrados (Alumno 1 y Alumno 2).
3. Como Profesor -> Crear tarea "Práctica de Negación".
4. Como Alumno 1 -> Entrar a "Secciones", clickear la tarjeta, marcar la casilla `[✓]`. Validar que desaparece para Alumno 1.
5. Como Profesor -> Entrar y validar que el indicador muestra *"1 de 2 completaron"*.
6. Como Alumno 2 -> Entrar y marcar la casilla `[✓]`. Validar que la tarea desaparece y ahora la sección no tiene tareas pendientes (se auto-eliminó al 100%).
7. Como Admin -> Probar eliminación de un estudiante y eliminación de una sección con confirmación.
