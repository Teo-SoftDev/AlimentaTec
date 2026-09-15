# AlimentaTec — App React con Login y Registro (Firebase)

Proyecto React (Vite + Tailwind + React Router) con autenticación por correo/contraseña usando Firebase.

## Estructura

```
AlimentaTec/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx                  # Rutas: /, /register, /dashboard (protegida)
    ├── index.css
    ├── firebase.js               # Inicialización de Firebase (tu config ya está puesta)
    ├── context/AuthContext.jsx   # Estado global de sesión + acciones (login/registro/logout)
    ├── components/
    │   ├── ProtectedRoute.jsx    # Redirige a "/" si no hay sesión
    │   └── PasswordField.jsx     # Input de contraseña con mostrar/ocultar
    ├── pages/
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   ├── Dashboard.jsx
    │   ├── Monitoring.jsx        # /monitoreo — Telemetría y Consumo en Tiempo Real
    │   ├── Devices.jsx           # /dispositivos — Gestión de Dispositivos y Dispensadores IoT
    │   ├── Animals.jsx           # /animales — Registro y Ficha Nutricional de Animales
    │   ├── Schedules.jsx         # /horarios — Programación Cronológica de Alimentación
    │   ├── Dosing.jsx            # /dosificacion — Configuración de Porciones y Calibración
    │   └── History.jsx           # /historial — Historial y Auditoría de Alimentación
    └── utils/authErrors.js       # Traduce errores de Firebase Auth al español
```

Todas las páginas internas comparten el mismo layout (`components/AppLayout.jsx`): barra superior, menú lateral y navegación inferior en móvil, siguiendo el patrón visual que definiste. El ítem activo del menú lateral cambia según la página.

## 1. Instalar dependencias

```bash
cd AlimentaTec
npm install
```

## 2. Habilitar el proveedor de correo/contraseña en Firebase (obligatorio)

1. Abre la [consola de Firebase](https://console.firebase.google.com/) → proyecto `alimentatec-2aae9`.
2. Ve a **Authentication → Sign-in method**.
3. Habilita **Correo electrónico/contraseña**.
4. Guarda.

Sin este paso verás el error "El inicio de sesión con correo y contraseña no está habilitado en este proyecto."

## 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173`.

## 4. Compilar para producción

```bash
npm run build
npm run preview   # para previsualizar el build
```

## 5. Desplegar en Firebase Hosting (opcional)

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase init hosting   # carpeta pública = "dist", configúralo como single-page app (SPA)
firebase deploy
```

## Rutas

| Ruta            | Página                                            | Protegida |
|-----------------|----------------------------------------------------|-----------|
| `/`             | Login                                              | No        |
| `/register`     | Registro de operador                               | No        |
| `/dashboard`    | Panel de ejemplo con accesos rápidos               | Sí        |
| `/monitoreo`    | Telemetría y Consumo en Tiempo Real                | Sí        |
| `/dispositivos` | Gestión de Dispositivos y Dispensadores IoT        | Sí        |
| `/animales`     | Registro y Expediente Nutricional de Animales      | Sí        |
| `/horarios`     | Programación Cronológica de Alimentación           | Sí        |
| `/dosificacion` | Configuración de Porciones y Calibración de Ración | Sí        |
| `/historial`    | Historial y Auditoría de Alimentación              | Sí        |

Todas las rutas del menú lateral ya están conectadas — no quedan enlaces "#" sin implementar.

## Flujo implementado

- **`/` (Login)** — `signInWithEmailAndPassword`. El checkbox "Recordar credenciales" cambia la persistencia entre `browserLocalPersistence` y `browserSessionPersistence`.
- **`/register` (Registro)** — `createUserWithEmailAndPassword` + `updateProfile` para guardar el nombre del operador. Valida contraseña mínima de 8 caracteres, coincidencia de contraseñas y aceptación de términos.
- **`/dashboard`** — ruta protegida con `ProtectedRoute`, que usa `onAuthStateChanged` (a través de `AuthContext`) para redirigir al login si no hay sesión. Incluye botón de cerrar sesión.
- Todos los errores de Firebase Auth se muestran traducidos al español (`utils/authErrors.js`).

## Notas

- La `apiKey` en `firebase.js` es pública por diseño del SDK web de Firebase; la seguridad real se controla con las reglas de Firestore/Storage/Auth, no ocultando esta clave.
- Antes de producción, considera: verificación de correo (`sendEmailVerification`), reglas de Firestore/Storage por UID, y App Check.
