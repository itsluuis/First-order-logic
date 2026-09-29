# Plan de Implementación: Sistema de Secciones (To-Do List) y Reestructuración de Administrador

> **Feature:** Sistema de Secciones con To-Do list colaborativa y Reestructuración del perfil Administrador con centro de borrado y aislamiento de navegación.
> **Metas:**
> 1. Crear la base de datos independiente `js/sectionsStorage.js` (`sectionsDB`) para gestionar secciones y tareas.
> 2. Reestructurar el panel de Administrador para que SOLO vea la pestaña de "Parámetros", con módulos para eliminar usuarios y secciones.
> 3. Construir la pestaña "Secciones" para Profesores y Estudiantes con tarjetas clickeables y To-Do list con casillas simples `[✓]`.

---

### Tareas de Implementación

#### Tarea 1: Base de Datos Independiente `js/sectionsStorage.js`
- **Archivo:** `js/sectionsStorage.js`
- **Acciones:**
  - Crear clase `SectionsStorageService` con clave `logica_db_sections`.
  - Implementar métodos de CRUD: `createSection`, `getSections`, `getSectionsForProfessor`, `getSectionsForStudent`, `deleteSection`, `deleteSectionsByProfessor`, `removeStudentFromAllSections`, `addStudentToSection`, `removeStudentFromSection`.
  - Implementar lógica To-Do: `addTask`, `deleteTask`, `markTaskCompleted` (con auto-eliminación al 100% de cumplimiento).
  - Exportar singleton `sectionsDB`.

#### Tarea 2: Métodos de Borrado y Cascada en `js/storage.js`
- **Archivo:** `js/storage.js`
- **Acciones:**
  - Agregar método `deleteUser(userId)`.
  - Integrar limpieza de clave de IA (`logica_student_ml_profile_<userId>`).

#### Tarea 3: Marcado HTML en `index.html`
- **Archivo:** `index.html`
- **Acciones:**
  - Agregar botón de navegación `#tab-nav-sections` en el header.
  - Agregar vista `#tab-sections` con sub-vista de lista de secciones (`#sections-list-view`), vista de detalle de sección (`#section-detail-view`) y modal para crear sección (`#modal-create-section`).
  - Agregar en `#tab-admin` los módulos de Gestión de Usuarios y Gestión de Secciones.

#### Tarea 4: Estilos en `css/style.css`
- **Archivo:** `css/style.css`
- **Acciones:**
  - Estilos para tarjetas de sección clickeables (`.section-card`), badges de tareas, vista To-Do list con casillas `[✓]`, barras de progreso y paneles de gestión.

#### Tarea 5: Lógica del Controlador en `js/app.js`
- **Archivo:** `js/app.js`
- **Acciones:**
  - Aislar navegación de Administrador (ocultar todas las demás pestañas, auto-activar `tab-admin`).
  - Lógica de eliminación de usuarios y secciones en el panel de Administrador.
  - Renderizado dinámico de la pestaña de Secciones para Profesor y Estudiante.
  - Click en tarjeta para abrir sección, creación de tareas, marcado con checkbox y auto-eliminación.

#### Tarea 6: Pruebas Automatizadas y Verificación
- **Acciones:**
  - Script de pruebas unitarias en Node.js para `sectionsStorage.js`.
  - Verificación de borrado en cascada y auto-eliminación al 100%.

#### Tarea 7: Git Commit y Push
- **Acciones:**
  - `git add .`
  - `git commit -m "feat(sections): implement independent sections database, to-do task list and admin refactor"`
  - `git push origin main`
