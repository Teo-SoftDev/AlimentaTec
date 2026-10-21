// src/firebase.js
// Inicialización centralizada de Firebase (Auth + Firestore + App Check opcional).
// La apiKey web es un identificador público; la protección real está en
// firestore.rules, Authentication y App Check (A01/A05).
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyCYnDrJKVFCfN3awMIMlHIsNBguJNn30hU",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "alimentatec-2aae9.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "alimentatec-2aae9",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "alimentatec-2aae9.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1076595969739",
  appId: env.VITE_FIREBASE_APP_ID || "1:1076595969739:web:61a1a4c9859f4f4abd954e",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-60X4151J76",
};

export const app = initializeApp(firebaseConfig);

// App Check: evita que clientes no autorizados (scripts, bots) usen el backend.
if (env.VITE_APPCHECK_SITE_KEY) {
  if (env.DEV && env.VITE_APPCHECK_DEBUG_TOKEN) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = env.VITE_APPCHECK_DEBUG_TOKEN;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(env.VITE_APPCHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);

isSupported()
  .then((ok) => ok && getAnalytics(app))
  .catch(() => {});
