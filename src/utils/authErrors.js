// src/utils/authErrors.js
// Traduce los códigos de error de Firebase Auth a mensajes en español.

const MENSAJES = {
  "auth/invalid-email": "El correo ingresado no tiene un formato válido.",
  "auth/user-disabled": "Esta cuenta de operador ha sido deshabilitada. Contacte al administrador de planta.",
  "auth/user-not-found": "No existe una cuenta de operador con ese correo.",
  "auth/wrong-password": "La contraseña ingresada es incorrecta.",
  "auth/invalid-credential": "Correo o contraseña incorrectos. Verifique sus credenciales.",
  "auth/invalid-login-credentials": "Correo o contraseña incorrectos. Verifique sus credenciales.",
  "auth/email-already-in-use": "Ya existe una cuenta registrada con ese correo institucional.",
  "auth/weak-password": "La contraseña es demasiado débil. Use al menos 8 caracteres, combinando letras y números.",
  "auth/too-many-requests": "Se han detectado demasiados intentos. Espere unos minutos antes de volver a intentar.",
  "auth/network-request-failed": "No se pudo conectar con el servidor de autenticación. Verifique su red.",
  "auth/operation-not-allowed": "El inicio de sesión con correo y contraseña no está habilitado en este proyecto. Contacte al administrador.",
  "auth/missing-password": "Debe ingresar una contraseña.",
};

export function traducirErrorAuth(error) {
  const codigo = error?.code || "";
  return MENSAJES[codigo] || "Ocurrió un error inesperado. Intente nuevamente en unos momentos.";
}
