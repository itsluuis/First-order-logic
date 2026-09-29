# Especificación Técnica: Base de Datos Local y Autenticación Multiusuario (Offline)

## 1. Resumen de Entendimiento (Understanding Summary)
* **Objetivo:** Implementar un sistema de persistencia y autenticación local multiusuario integrado en el modal de inicio de sesión actual, permitiendo el registro y login independientes para **Estudiantes** y **Profesores**, manteniendo el rol y clave fija del **Administrador**.
* **Motivación:** Facilitar el uso compartido del software en computadoras de aula o dispositivos personales sin conexión a internet (100% offline), garantizando que cada estudiante tenga su propia curva de aprendizaje y estadísticas aisladas.
* **Usuarios destino:**
  * **Estudiantes:** Acceso rápido y sencillo mediante su nombre y un PIN de exactamente 3 dígitos numéricos.
  * **Profesores:** Acceso mediante nombre y contraseña estándar para herramientas analíticas y pedagógicas.
  * **Administrador:** Acceso con credenciales maestras (`1234`) para configuración global.
* **Restricciones clave:**
  * Cero dependencias externas y funcionamiento offline continuo sin Wi-Fi.
  * Conservación del diseño visual con selector de tarjetas (Admin, Profesor, Estudiante).
  * Validación estricta del PIN de 3 dígitos para alumnos.
  * Validación de unicidad de nombre de usuario en el registro local.
  * Aislamiento estricto de las estadísticas y modelo neuronal de IA por ID de usuario.
  * Arquitectura preparada para vincularse sin fricciones con el futuro sistema de secciones del profesor.

---

## 2. Supuestos y Riesgos (Assumptions & Risks)

### Supuestos
1. **Motor de Almacenamiento:** Uso de `localStorage` mediante `StorageService`, proporcionando acceso síncrono ultra rápido (<5 ms) y compatibilidad universal en todos los navegadores modernos.
2. **Escala:** Diseñado para gestionar entre 1 y 200 perfiles en un mismo equipo sin penalización de rendimiento ni superar el límite de cuota local (~5 MB).
3. **Persistencia del Administrador:** El perfil de administrador continúa gobernando los parámetros globales (ej. forzar notación de conectivos) y mantiene su clave por defecto `1234`.

### Riesgos y Mitigaciones
* **Riesgo:** Pérdida de datos si el usuario limpia manualmente la caché o datos del navegador.
  * *Mitigación:* Estructura modular que facilitará a futuro la exportación o respaldo en archivo JSON descargable.
* **Riesgo:** Dos estudiantes con el mismo nombre de pila en la misma máquina.
  * *Mitigación:* Validación descriptiva de duplicados indicando al alumno ingresar un apellido o inicial (ej. "Carlos R.").

---

## 3. Registro de Decisiones (Decision Log)

| # | Decisión | Alternativas consideradas | Razón de la elección |
|---|---|---|---|
| **D1** | Conservar tarjetas iniciales de perfil (Admin, Profesor, Estudiante) | Reemplazar por un formulario único genérico | Mantiene la estética visual del proyecto y facilita la navegación intuitiva. |
| **D2** | Sub-vista con pestañas "Iniciar Sesión" y "Registrarse" | Modal separado o registro silencioso automático | Otorga control explícito al usuario y previene registros involuntarios. |
| **D3** | PIN de 3 dígitos con validación estricta para estudiantes | Contraseña alfanumérica libre | Cumple el requisito explícito del usuario (`solo 3 dijitos`) y agiliza el acceso de los alumnos. |
| **D4** | Aislamiento de perfil de IA/Progreso por ID único de alumno | Estadísticas compartidas globales en `localStorage` | Permite que cada estudiante conserve sus propias debilidades lógicas y récord en minijuegos. |
| **D5** | Elección del Enfoque 1 (Modular Normalizado con IDs únicos) | Enfoque 2 (IndexedDB) / Enfoque 3 (Monolítico) | Es ligero, síncrono, 100% offline y sienta las bases relacionales (`userId`, `sectionId`) para el futuro sistema de secciones. |

---

## 4. Diseño Técnico Detallado

### 4.1. Modelo de Datos y Esquemas

#### Colección de Usuarios (`logica_db_users`)
Almacenada bajo la clave `logica_db_users` en `localStorage`:
```typescript
interface User {
  id: string;                 // Prefijo 'est_' o 'prof_' seguido de ID único
  username: string;           // Nombre para mostrar (ej. "Santiago")
  normalizedUsername: string; // Nombre normalizado en minúsculas para comparaciones ("santiago")
  role: 'estudiante' | 'profesor';
  pin?: string;               // PIN de 3 dígitos (solo para estudiante)
  password?: string;          // Contraseña (solo para profesor)
  createdAt: string;          // Fecha ISO
  sectionId: string | null;   // Preparado para el futuro sistema de secciones
  createdSections?: string[]; // Lista de IDs de secciones (solo profesores)
}
```

#### Sesión Activa (`logica_db_session`)
```typescript
interface Session {
  userId: string;
  username: string;
  role: 'admin' | 'profesor' | 'estudiante';
  icon: string;
  loginTime: string;
}
```

#### Aislamiento de Métricas de Estudiante
* Clave: `logica_student_ml_profile_<userId>`
* Al iniciar sesión un estudiante, `StudentModel` carga la clave específica de dicho usuario. Si no existe, genera el perfil base para ese alumno.

---

### 4.2. Flujo y Componentes de Interfaz

1. **Selector de Perfiles:**
   * Al hacer clic en **Estudiante** o **Profesor**, se despliegan las sub-pestañas:
     * `[ Iniciar Sesión ]`
     * `[ Registrarse ]`
   * Al hacer clic en **Administrador**, se muestra directamente el campo de contraseña maestra (`1234`).
2. **Formulario de Iniciar Sesión:**
   * Nombre de usuario (input de texto).
   * PIN de 3 dígitos (para estudiante: `inputmode="numeric" maxlength="3"`) o Contraseña (para profesor).
   * Botón: *"Ingresar al Sistema"*.
3. **Formulario de Registro:**
   * Nombre de usuario (input de texto).
   * PIN de 3 dígitos (estudiante) o Contraseña (profesor).
   * Confirmación de PIN / Contraseña.
   * Botón: *"Crear Cuenta e Ingresar"*.
   * Validación en vivo que impide el registro si `normalizedUsername` ya existe en ese rol.

---

### 4.3. Validaciones y Casos Borde
* **Normalización de Nombres:** Limpieza con `.trim()` y comparación con `.toLowerCase()`.
* **Restricción de PIN:** Regex `/^\d{3}$/`. Se rechaza cualquier valor con caracteres no numéricos o longitud distinta de 3.
* **Cierre de Sesión:** Reinicio de la sesión activa y descarga de la memoria del perfil del estudiante en `AppState` para evitar contaminación entre sesiones compartidas en el mismo ordenador.

---

## 5. Estrategia de Pruebas
1. Registro de alumno con PIN inválido (ej. "12", "12a", "1234") -> Bloqueo con alerta explicativa.
2. Registro de alumno con PIN válido de 3 dígitos (ej. "482") -> Creación exitosa e inicio de sesión.
3. Intento de registro duplicado -> Detección de colisión.
4. Cierre de sesión y login de un segundo alumno -> Confirmación de perfil de IA aislado.
5. Recarga (F5) en modo offline -> Persistencia intacta de sesión y datos.
