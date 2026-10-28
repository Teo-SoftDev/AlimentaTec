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
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/set-role.mjs usted@empresa.com admin   # roles: admin | operador | auditor | cuidador
   ```
   (o edite `users/{uid}.role` desde la consola). Cierre sesión y vuelva a entrar.
   Desde ahí el admin promueve a otros con el mismo script.
5. Recomendado en producción: **App Check** (reCAPTCHA v3) → `VITE_APPCHECK_SITE_KEY` en `.env.local`
   y *enforcement* en Auth/Firestore. Hosting: `npm run build && firebase deploy --only hosting`
   (aplica los headers de `firebase.json`: CSP, HSTS, X-Frame-Options…).

## Roles y permisos (A01)

| Permiso | Administrador | Operador | Auditor | Cuidador |
|---|:-:|:-:|:-:|:-:|
| Vista simplificada «Modo Cuidador» | ✔ | ✔ | ✔ | ✔ |
| Módulos avanzados e historial | ✔ | ✔ | ✔ | — |
| Comandos (dar de comer, pausar, parada de emergencia) | ✔ | ✔ | — | ✔ |
| Horarios, dosificación, lotes (crear/editar) | ✔ | ✔ | — | — |
| Controlar el simulador de alimentación | ✔ | ✔ | solo ver | — |
| Registrar / rotar / revocar / eliminar dispositivos, eliminar lotes | ✔ | — | — | — |
| Exportar reportes (PDF/CSV) | ✔ | — | ✔ | — |
| Alertas de seguridad | ✔ | — | — | — |

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


## Novedades v3

### 1) API de sensores (`functions/`, Node 20, sin framework)
`POST /api/v1/telemetry` · `POST /api/v1/telemetry/batch` · `POST /api/v1/auth/token` · `GET /api/v1/health`
(contrato completo en `docs/openapi.yaml`). Canal WebSocket opcional (`/api/v1/telemetry/stream`) para Cloud Run.

| Riesgo | Implementación |
|---|---|
| A03 | Zod `.strict()` con rangos físicos, límite de cuerpo 16 KB, `Content-Type` obligatorio, idempotencia por `readingId`. |
| A02/A07 | Autenticación **por dispositivo**: `X-Device-Id` + API key (la mostrada una sola vez al registrar; en Firestore solo su SHA-256 en `deviceSecrets`, ilegible para clientes) o JWT HS256 de 15 min. El secreto del JWT vive en Secret Manager (`JWT_SECRET`), **nunca en el código**. Comparación en tiempo constante, respuesta 401 genérica (no revela si el equipo existe o está revocado), `alg=none` rechazado. Rotación de clave desde *Dispositivos → Rotar clave*. |
| A04 | Límite por dispositivo (30/min; lotes 6/min), por IP (120/min) y bloqueo por fallos de autenticación (10/15 min por IP) → 429 + `Retry-After`. Un dispositivo solo puede reportar de **su** estanque y solo los de tipo *sensor*. |
| A09 | Fallos de autenticación, payloads inválidos, estanque ajeno y límites excedidos se registran en `auditLogs` con la **misma cadena de integridad** (rol `system`, sesión `api-gateway`); fuerza bruta genera `securityAlerts`. Anti-inundación con antirrebote. |

Efectos: actualiza `pondStatus/{estanque}` (alimenta Dashboard, Monitoreo y Modo Cuidador), crea alertas críticas con antirrebote, y un *watchdog* marca sensores sin señal como «Sin conexión».

```bash
cd functions && npm install && npm test          # 14 pruebas (auth, rate limit, JWT, lotes, auditoría…)
STORE=memory node src/server.js                  # API local sin Firebase (clave efímera impresa al arrancar)
# Producción:
firebase functions:secrets:set JWT_SECRET        # openssl rand -hex 32
firebase deploy --only functions,firestore,hosting
gcloud firestore fields ttls update expiresAt --collection-group=telemetry --enable-ttl   # retención 30 días
```

### 2) Simulación de sensores (`tools/sensor-simulator/`, `postman/`)
CLI sin dependencias y colección Postman con modos `normal`, `low-oxygen` (alerta crítica), `high-temp`, `ph-drift`,
`low-level`, `offline` (lote tras pérdida de red), `replay`, `invalid`, `bad-auth`, `burst`. Ver `tools/sensor-simulator/README.md`.

### 3) Modo Cuidador (`/cuidador`, rol `cuidador`)
Lenguaje natural («Agua en buen estado», «Conectado»), semáforos verde/amarillo/rojo con iconos grandes, botones
de 84 px con **confirmación de doble toque** («Dar de comer ahora», «Pausar alimentación»; bloqueado si el agua está en rojo)
y **avisos flotantes** que explican con pasos ilustrados qué hacer ante cada alerta. El cuidador aterriza aquí al iniciar sesión
y no accede a módulos técnicos ni a auditoría (reglas de Firestore incluidas).

### 4) Simulador de alimentación programada (`/simulador`)
Motor de eventos temporales (`src/simulator/`) que cada segundo evalúa los horarios guardados y ejecuta las tolvas:
- **Tiempo real en la UI** para todos los roles vía listeners de `feedingEvents` y `simulatorState` (chip en la cabecera, avisos y tabla).
- **Sin duplicar porciones**: cada ocurrencia tiene ID determinista `<horario>_<fecha>_<hora>`; varios equipos o reconexiones nunca la repiten.
- **Modo offline simulado**: *la tolva ejecuta sola y sincroniza después* o *esperar y ejecutar en cascada al reconectar*; cola persistente, recuperación tras cerrar la app (ventana de 6 h) y reloj acelerado (x60 / x720) para demostraciones.
- **Trazabilidad**: cada evento (ejecutado, omitido por oxígeno bajo, desconexión, sincronización) queda en el Historial con la cadena de integridad.

### Pruebas
`npm test` ejecuta utilidades de seguridad, esquemas Zod + telemetría firmada, motor del simulador y la API (≈ 60 aserciones).

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
