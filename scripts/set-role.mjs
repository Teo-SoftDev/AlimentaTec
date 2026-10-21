// Asigna un rol (custom claim + documento users/{uid}) a un usuario existente.
// Uso:  GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/set-role.mjs correo@dominio.com admin
// (Descargue la clave de servicio desde Firebase Console → Configuración del proyecto →
//  Cuentas de servicio. NUNCA la suba al repositorio: ya está en .gitignore.)
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [email, role] = process.argv.slice(2);
if (!email || !["admin", "operador", "auditor"].includes(role)) {
  console.error("Uso: node scripts/set-role.mjs <correo> <admin|operador|auditor>");
  process.exit(1);
}
initializeApp({ credential: applicationDefault() });
const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { role });
await getFirestore().doc(`users/${user.uid}`).set(
  { uid: user.uid, email: user.email, displayName: user.displayName || "", role, disabled: false, updatedAt: FieldValue.serverTimestamp() },
  { merge: true }
);
console.log(`✔ ${email} ahora es "${role}". Debe volver a iniciar sesión para refrescar su token.`);
