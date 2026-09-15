// src/firebase.js
// Inicialización centralizada de Firebase para toda la app.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Configuración de tu proyecto (alimentatec-2aae9)
const firebaseConfig = {
  apiKey: "AIzaSyCYnDrJKVFCfN3awMIMlHIsNBguJNn30hU",
  authDomain: "alimentatec-2aae9.firebaseapp.com",
  projectId: "alimentatec-2aae9",
  storageBucket: "alimentatec-2aae9.firebasestorage.app",
  messagingSenderId: "1076595969739",
  appId: "1:1076595969739:web:61a1a4c9859f4f4abd954e",
  measurementId: "G-60X4151J76",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Analytics solo si el navegador lo soporta (evita errores en SSR/testing)
isSupported().then((supported) => {
  if (supported) getAnalytics(app);
});
