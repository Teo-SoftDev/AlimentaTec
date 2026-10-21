// src/utils/authErrors.js — Errores de Firebase Auth → mensajes en español.
// A07: los fallos de credenciales usan UN solo mensaje genérico para no
// revelar si el correo existe (evita enumeración de usuarios).
const GENERIC_CREDENTIALS = "Correo o contraseña incorrectos.";

const MENSAJES = {
  "auth/invalid-email": "El correo ingresado no tiene un formato válido.",
  "auth/user-disabled": "Esta cuenta ha sido deshabilitada. Contacte al administrador.",
  "auth/user-not-found": GENERIC_CREDENTIALS,
  "auth/wrong-password": GENERIC_CREDENTIALS,
  "auth/invalid-credential": GENERIC_CREDENTIALS,
  "auth/invalid-login-credentials": GENERIC_CREDENTIALS,
  "auth/email-already-in-use": "No fue posible crear la cuenta con esos datos.",
  "auth/weak-password": "La contraseña no cumple la política de seguridad.",
  "auth/too-many-requests": "Demasiados intentos. Espere unos minutos antes de reintentar.",
  "auth/network-request-failed": "No se pudo conectar con el servidor. Verifique su red.",
  "auth/operation-not-allowed": "El acceso con correo y contraseña no está habilitado. Contacte al administrador.",
  "auth/requires-recent-login": "Por seguridad, vuelva a iniciar sesión para continuar.",
};

export const CREDENTIAL_ERROR_CODES = [
  "auth/user-not-found", "auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials",
];

export function traducirErrorAuth(error) {
  return MENSAJES[error?.code] || "Ocurrió un error inesperado. Intente nuevamente en unos momentos.";
}
