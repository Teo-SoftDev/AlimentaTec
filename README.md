# AlimentaTec — Plataforma IoT de alimentación acuícola (React + Firebase)

Vite · React 18 · Tailwind · React Router · Firebase Auth + Firestore · Zod · jsPDF.
Implementa el PDF de ingeniería: roles, OWASP Top 10, y los módulos nuevos
**Registro seguro de dispositivos** y **Reportes ejecutivos**.

## Puesta en marcha

```bash
npm install
npm run dev            # http://localhost:5173
```

### Pasos obligatorios en Firebase (una sola vez)
1. **Authentication → Sign-in method →** habilitar *Correo electrónico/contraseña*
   (y, en *Settings → Password policy*, exigir complejidad también del lado servidor).
2. **Firestore Database →** crear la base de datos (modo producción).
3. Publicar reglas: `firebase deploy --only firestore:rules` (archivo `firestore.rules`).
   **Sin las reglas, la app no podrá leer/escribir datos.**
4. **Crear el primer administrador.** Toda cuenta nueva nace como *Auditor* (solo lectura) y **no puede
   auto-asignarse otro rol** (lo impiden las reglas). Regístrese en la app y luego:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/set-role.mjs usted@empresa.com admin
   ```
   (o edite `users/{uid}.role` desde la consola). Cierre sesión y vuelva a entrar.
   Desde ahí el admin promueve a otros con el mismo script.
5. Recomendado en producción: **App Check** (reCAPTCHA v3) → `VITE_APPCHECK_SITE_KEY` en `.env.local`
   y *enforcement* en Auth/Firestore. Hosting: `npm run build && firebase deploy --only hosting`
   (aplica los headers de `firebase.json`: CSP, HSTS, X-Frame-Options…).

## Roles y permisos (A01)

| Permiso | Administrador | Operador | Auditor |
|---|:-:|:-:|:-:|
| Ver módulos / historial | ✔ | ✔ | ✔ |
| Comandos (dispensar, auto-alimentación, parada de emergencia) | ✔ | ✔ | — |
| Horarios, dosificación, lotes (crear/editar) | ✔ | ✔ | — |
| Registrar / revocar / eliminar dispositivos, eliminar lotes | ✔ | — | — |
| Exportar reportes (PDF/CSV) | ✔ | — | ✔ |
| Alertas de seguridad | ✔ | — | — |

El rol viene del *custom claim* `role` (si existe) o de `users/{uid}`; `ProtectedRoute` valida sesión,
cuenta habilitada y permiso **antes** de renderizar, y `firestore.rules` replica la misma matriz.
Cualquier ruta desconocida redirige al inicio (sin rutas huérfanas).

## Mitigaciones OWASP implementadas

| Riesgo | Dónde / cómo |
|---|---|
| **A01** Control de acceso | `ProtectedRoute` + `utils/permissions.js` + `firestore.rules` (deny-by-default, admin-only en alta/baja de dispositivos, rol sin auto-asignación). Perfil en tiempo real: revocar o deshabilitar expulsa la sesión al instante. |
| **A02** Criptografía | `DevicesRegister`: credenciales MQTT/HTTPS con CSPRNG, mostradas **una vez**, en Firestore solo el hash SHA-256. PIN con PBKDF2 (150 k it.). Sin secretos en cliente. Headers HSTS/CSP. |
| **A03** Inyección | Zod (allowlists/enums/regex/rangos) en login, registro, dispositivos, QR, lotes, horarios, dosificación, comandos, reportes e historial (`utils/validation.js`). Los caracteres peligrosos se **rechazan**. CSV con neutralización de *formula injection*. Consultas Firestore parametrizadas con valores ya validados. |
| **A04** Diseño inseguro | Rate limiting de comandos (≥10 s entre comandos, 5/10 min por equipo, 20/10 min global; la parada de emergencia queda exenta pero auditada). **PIN de 6 dígitos** para pruebas de descarga masivas (>1 ración o >1 kg). Telemetría **firmada ECDSA P-256**: se rechazan paquetes con firma inválida, repetidos (replay), con reloj fuera de ±30 s, de dispositivos no registrados o con valores imposibles. |
| **A05** Configuración | Errores de red/Firebase traducidos a mensajes amigables (`utils/errors.js`), sin trazas. El login no expone datos operativos. Sin imágenes ni streams remotos (cámara simulada en `<canvas>`). |
| **A07** Autenticación | Política de contraseña de 12+ car. con medidor (`PasswordField`), bloqueo tras **5 intentos fallidos** (5→10→20→30 min, `utils/lockout.js`), mensaje único de credenciales (sin enumeración), recuperación con respuesta genérica, sesión por defecto *solo de pestaña*, **cierre por inactividad (30 min)**, limpieza de tokens/estado al cerrar sesión, verificación de correo. |
| **A09** Logging | `auditLogs` **append-only** (las reglas prohíben update/delete a todos los roles): marca de tiempo del servidor, UID, rol, **ID de sesión** y cadena de integridad (seq + hash). *Historial → Verificar integridad* detecta registros modificados, borrados o cadena rota y genera una **alerta de seguridad** para el admin. Se auditan logins, comandos, cambios de horario/dosificación/lotes, altas/bajas de dispositivos, exportaciones y rechazos de telemetría. |

## Estructura

```
src/
  firebase.js · App.jsx · main.jsx · index.css
  context/AuthContext.jsx        rol/claims, bloqueo, inactividad, PIN, auditoría
  components/                    AppLayout, ProtectedRoute, AccessDenied, PasswordField,
                                 NumberStepper, ToggleSwitch, PillToggle, Modal, ConfirmDialog,
                                 PinDialog, LineChart, CameraSimulator, ui
  pages/                         Login, Register, Dashboard, Monitoring, Devices, DevicesRegister,
                                 Animals, Schedules, Dosing, History, Reports
  services/                      audit.js (cadena + alertas) · commands.js (permiso+Zod+rate limit)
  hooks/useCollection.js         listeners en tiempo real con fallback de demostración
  utils/                         validation, permissions, rateLimiter, lockout, crypto, telemetry,
                                 auditChain, csv, sanitize, errors, thresholds, constants, demoData
firestore.rules · firebase.json · scripts/set-role.mjs · .env.example
```

## Limitaciones (por transparencia)

- **Rate limiting, bloqueo de login y verificación de telemetría corren en el navegador**: sirven de primera
  barrera y UX, pero un atacante con acceso directo a la API los saltaría. Para producción replique
  los límites en el backend (Cloud Functions/broker MQTT). Las reglas ya acotan tipo, tamaño, autoría y rol.
- **IP del operador**: el navegador no puede conocerla de forma fiable; el registro guarda *ID de sesión* + UID.
  Para estampar la IP use una Cloud Function *callable* que escriba la auditoría (`request.rawRequest.ip`).
- **La alerta por intento de borrado directo** (p. ej. con la consola del navegador) la bloquean las reglas;
  para notificarla en tiempo real hace falta un trigger/monitor de Cloud Logging. La verificación de integridad
  sí detecta alteraciones o borrados hechos con privilegios de servidor.
- Los datos marcados **«de demostración»** (dispositivos, lotes, horarios, producción, alertas) aparecen solo
  mientras la colección está vacía. La **telemetría, la cámara y la celda de carga son simuladas**; en producción
  los paquetes llegarían del broker MQTT con la misma verificación de firma.
- Revise la CSP de `firebase.json` al activar App Check o nuevos servicios de Google.
