# Guardrails de Seguridad y Políticas de Ejecución del Agente

Este repositorio implementa controles y barreras de seguridad estrictas (Sandboxing & Guardrails) para garantizar la integridad del dispositivo, la privacidad del usuario y la ejecución segura de herramientas y código.

---

## 1. Barreras de Permisos y Protección del Host

1. **Aislamiento de Directorio (Workspace Boundary)**:
   - Las operaciones de lectura y modificación están limitadas estrictamente al directorio del espacio de trabajo del proyecto (`First-order-logic`).
   - Queda terminantemente prohibido acceder, inspeccionar o leer directorios del usuario o del sistema operativo (`%USERPROFILE%`, `~/.ssh`, `~/.aws`, `~/.config`, documentos personales, perfiles de navegadores, registros del sistema o credenciales).

2. **Prohibición de Comandos Peligrosos y Malware**:
   - Queda terminantemente prohibida la ejecución o descarga de binarios desconocidos, scripts maliciosos, ejecutables (`.exe`, `.bat`, `.ps1`, `.vbs`, `.sh`) externos no verificados.
   - Prohibido cualquier comando destructivo o de escalado de privilegios (`format`, `rmdir /s /q C:\`, manipulación del registro de Windows, o alteración de políticas de seguridad del sistema).
   - Prohibida la apertura de sockets de escucha no autorizados o conexiones remotas hacia servidores externos no confiables.

3. **Prevención de Exfiltración de Datos**:
   - Cero telemetría: la aplicación y sus herramientas funcionan 100% de manera local y offline.
   - Ninguna información del usuario, del dispositivo, del hardware ni de sus credenciales puede ser recopilada, procesada ni transmitida fuera del entorno local.

---

## 2. Seguridad en el Código de la Aplicación

1. **Aislamiento en Navegador (CSP)**:
   - Se aplica una directiva estricta de `Content-Security-Policy` (`connect-src 'none'; object-src 'none'; base-uri 'self';`).
   - Bloqueo total de conexiones de red no autorizadas desde la aplicación web.

2. **Sanitización y Cero Inyección**:
   - Todo dato ingresado por el usuario (fórmulas, proposiciones atómicas, oraciones en lenguaje natural, nombres de usuario) es tratado como texto no confiable y escapado antes de cualquier manipulación en el DOM (`escapeHtml`).
   - No se utiliza `eval()` ni constructores dinámicos tipo `new Function(...)` para interpretar entradas de usuario.

3. **Persistencia Local Segura**:
   - Los datos de sesión y perfiles se almacenan de forma aislada en `localStorage` con claves sanitizadas y límites de cuota estrictos para prevenir desbordamientos o ataques de denegación de servicio por almacenamiento.
