// src/context/AuthContext.jsx
// A01 roles/claims · A07 bloqueo por intentos, sesión segura, limpieza de
// tokens, cierre por inactividad · A09 auditoría de sesión.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { can as canRole, ROLES } from "../utils/permissions.js";
import { getLockRemainingMs, registerFailure, registerSuccess } from "../utils/lockout.js";
import { AppError, friendlyError } from "../utils/errors.js";
import { CREDENTIAL_ERROR_CODES } from "../utils/authErrors.js";
import { b64u, pbkdf2Hash, randomBytes, timingSafeEqual } from "../utils/crypto.js";
import { clearSessionData, getSessionId, writeAudit } from "../services/audit.js";

const AuthContext = createContext(null);
const IDLE_MS = 30 * 60 * 1000; // cierre automático por inactividad
const PIN_ITER = 150000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [profile, setProfile] = useState(null);
  const [claimRole, setClaimRole] = useState(null);
  const [rolReady, setRolReady] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setCargandoSesion(false);
        if (!u) {
          setProfile(null);
          setClaimRole(null);
          setRolReady(false);
        }
      }),
    []
  );

  // Perfil (rol) en tiempo real: una revocación o cambio de rol aplica al instante.
  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    setRolReady(false);
    user
      .getIdTokenResult()
      .then((r) => alive && setClaimRole(r.claims.role || null))
      .catch(() => {});
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!alive) return;
        if (snap.exists()) {
          setProfile(snap.data());
          setProfileError(null);
          setRolReady(true);
        } else {
          // Aprovisionamiento con MÍNIMO PRIVILEGIO: todo usuario nuevo es "auditor".
          // Un administrador debe promoverlo (reglas impiden auto-asignarse otro rol).
          setDoc(ref, {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            role: "auditor",
            disabled: false,
            createdAt: serverTimestamp(),
          }).catch(() => {
            if (alive) {
              setProfile(null);
              setRolReady(true);
            }
          });
        }
      },
      (err) => {
        if (!alive) return;
        setProfileError(friendlyError(err, "No se pudo verificar su perfil de acceso."));
        setRolReady(true);
      }
    );
    return () => {
      alive = false;
      unsub();
    };
  }, [user]);

  // Rol efectivo: custom claim (más confiable) > perfil > mínimo privilegio.
  const role = ROLES.includes(claimRole) ? claimRole : ROLES.includes(profile?.role) ? profile.role : "auditor";
  const sessionId = useMemo(() => (user ? getSessionId() : null), [user]);

  const actorRef = useRef(null);
  actorRef.current = user ? { uid: user.uid, email: user.email || "", role, sessionId } : null;

  const audit = useCallback(
    (type, target = "", details = {}, severity = "info") =>
      writeAudit({ actor: actorRef.current, type, target, details, severity }),
    []
  );

  const cerrarSesion = useCallback(
    async (reason = "manual") => {
      try {
        if (actorRef.current) await writeAudit({ actor: actorRef.current, type: "logout", details: { reason } });
      } catch {
        /* no bloquear el cierre */
      }
      clearSessionData(); // sesión, estado de auditoría y cola local
      await signOut(auth);
    },
    []
  );
  const logoutRef = useRef(cerrarSesion);
  logoutRef.current = cerrarSesion;

  // Registro del inicio de sesión (una vez por sesión).
  useEffect(() => {
    if (!user || !rolReady) return;
    try {
      if (sessionStorage.getItem("at_login_logged")) return;
      sessionStorage.setItem("at_login_logged", "1");
    } catch {
      /* ignorar */
    }
    audit("login", "", { verified: user.emailVerified });
  }, [user, rolReady, audit]);

  // Cuenta deshabilitada → expulsar de inmediato.
  useEffect(() => {
    if (profile?.disabled) logoutRef.current("disabled");
  }, [profile]);

  // Cierre automático por inactividad.
  useEffect(() => {
    if (!user) return undefined;
    let t;
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(() => logoutRef.current("idle"), IDLE_MS);
    };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user]);

  const iniciarSesion = useCallback(async (email, password, recordar) => {
    const remaining = getLockRemainingMs();
    if (remaining > 0) throw new AppError("locked", "Acceso bloqueado temporalmente por intentos fallidos.", { remainingMs: remaining });
    // Persistencia de sesión por defecto (se borra al cerrar el navegador).
    await setPersistence(auth, recordar ? browserLocalPersistence : browserSessionPersistence);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      registerSuccess();
      return cred;
    } catch (e) {
      if (CREDENTIAL_ERROR_CODES.includes(e?.code)) registerFailure();
      throw e;
    }
  }, []);

  const registrarse = useCallback(async (nombre, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: nombre });
    sendEmailVerification(cred.user).catch(() => {});
    return cred;
  }, []);

  // Respuesta genérica: no revela si el correo existe.
  const recuperarContrasena = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch {
      /* se ignora a propósito */
    }
  }, []);

  // PIN de seguridad (A04): hash PBKDF2 con sal propia, nunca en claro.
  const hasPin = Boolean(profile?.pinHash && profile?.pinSalt);
  const setPin = useCallback(
    async (pin) => {
      if (!/^\d{6}$/.test(pin)) throw new AppError("invalid", "El PIN debe tener exactamente 6 dígitos.");
      const salt = randomBytes(16);
      const hash = await pbkdf2Hash(pin, salt, PIN_ITER);
      await updateDoc(doc(db, "users", auth.currentUser.uid), { pinSalt: b64u.enc(salt), pinHash: hash, pinIter: PIN_ITER });
      audit("pin_set");
    },
    [audit]
  );
  const verifyPin = useCallback(
    async (pin) => {
      if (!profile?.pinHash) return false;
      const h = await pbkdf2Hash(pin, b64u.dec(profile.pinSalt), profile.pinIter || PIN_ITER);
      return timingSafeEqual(h, profile.pinHash);
    },
    [profile]
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      sessionId,
      cargandoSesion,
      rolReady,
      profileError,
      can: (perm) => canRole(role, perm),
      actor: () => actorRef.current,
      audit,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      recuperarContrasena,
      hasPin,
      setPin,
      verifyPin,
    }),
    [user, profile, role, sessionId, cargandoSesion, rolReady, profileError, audit, iniciarSesion, registrarse, cerrarSesion, recuperarContrasena, hasPin, setPin, verifyPin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
