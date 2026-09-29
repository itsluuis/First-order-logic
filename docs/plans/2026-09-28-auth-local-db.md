# Plan de Implementación: Base de Datos Local y Autenticación Multiusuario Offline

> **Feature:** Autenticación local multiusuario (Estudiantes y Profesores) con base de datos en localStorage y preparación para sistema de secciones.
> **Meta:** Permitir el registro e inicio de sesión independiente para Estudiantes (con PIN de 3 dígitos) y Profesores, manteniendo el perfil del Administrador y aislando las métricas de IA de cada alumno.

---

### Tareas de Implementación

#### Tarea 1: Servicios de Base de Datos Local en `js/storage.js`
- **Archivos:** `js/storage.js`
- **Acciones:**
  - Agregar claves de almacenamiento: `USERS: 'logica_db_users'`.
  - Crear métodos CRUD para usuarios:
    - `getUsers()`
    - `findUser(role, username)`
    - `registerUser({ username, role, pin, password })` con validación estricta de PIN de 3 dígitos (`/^\d{3}$/`).
    - `authenticate(role, username, credential)`
  - Mantener retrocompatibilidad con login de Administrador (`1234`).
  - Actualizar `getCurrentSession()` y `logout()`.

#### Tarea 2: Aislamiento de Métricas del Alumno en `js/ml/studentModel.js`
- **Archivos:** `js/ml/studentModel.js`
- **Acciones:**
  - Modificar `_loadProfile()` y `saveProfile()` para consultar la sesión activa de `StorageService`.
  - Guardar bajo `logica_student_ml_profile_<userId>` si el usuario logueado es estudiante.
  - Asegurar método `resetProfileForUser()` o reinicialización limpia al cambiar de sesión.

#### Tarea 3: Estructura HTML y Estilos en `index.html` y `css/style.css`
- **Archivos:** `index.html`, `css/style.css`
- **Acciones:**
  - Actualizar `#auth-modal`:
    - Sub-pestañas: `[ Iniciar Sesión ]` / `[ Registrarse ]` (visibles para Estudiante y Profesor).
    - Campo de Nombre de Usuario (`#login-username`).
    - Campo de Credencial dinámico (`#login-credential`) con soporte de `inputmode="numeric" maxlength="3"` para estudiantes.
    - Campo de Confirmación de Credencial (`#register-confirm-group`, `#register-confirm-credential`).
    - Área de alertas y feedback visual (`#auth-alert-message`).
  - Estilos modernos acordes al tema oscuro (glassmorphism, animaciones sutiles, estados activos).

#### Tarea 4: Controlador de Autenticación en `js/app.js`
- **Archivos:** `js/app.js`
- **Acciones:**
  - Manejar el estado `AppState.authMode` (`'login'` | `'register'`).
  - Actualizar `updateProfileFormUI()` para renderizar campos según rol y modo activo.
  - Validar formulario en `submit`:
    - Si es Estudiante: verificar PIN de exactamente 3 dígitos numéricos.
    - Si es Registro: verificar no existencia del nombre en ese rol y coincidencia de confirmación.
    - Si es Login: verificar credenciales contra `dbService`.
  - Al cerrar sesión, limpiar el perfil del estudiante en memoria.

#### Tarea 5: Verificación Integral
- **Acciones:**
  - Test de validación de PIN (menos de 3 dígitos, letras, exactamente 3 dígitos).
  - Test de prevención de duplicados en registro.
  - Test de inicio de sesión exitoso y persistencia de sesión.
  - Test de aislamiento de estadísticas de IA entre alumnos.
  - Test de funcionamiento sin conexión.

#### Tarea 6: Control de Versiones y Despliegue
- **Acciones:**
  - `git add .`
  - `git commit -m "feat(auth): base de datos local y login de estudiantes y profesores"`
  - `git push origin main`
