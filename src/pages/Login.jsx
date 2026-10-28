import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { traducirErrorAuth } from "../utils/authErrors.js";
import { AppError } from "../utils/errors.js";
import { validate, loginSchema, emailSchema } from "../utils/validation.js";
import { attemptsLeft, getLockRemainingMs, MAX_ATTEMPTS } from "../utils/lockout.js";
import { ALLOWED_PATHS } from "../utils/constants.js";
import { homeFor } from "../utils/permissions.js";
import PasswordField from "../components/PasswordField.jsx";
import { Banner, inputCls } from "../components/ui.jsx";

const fmt = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

export default function Login() {
  const { user, role, rolReady, iniciarSesion, recuperarContrasena } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Evita open-redirect: solo rutas internas conocidas.
  const from = ALLOWED_PATHS.includes(location.state?.from) && (role !== "cuidador" || ["/cuidador", "/dashboard"].includes(location.state.from)) ? location.state.from : homeFor(role);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recordar, setRecordar] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [lockMs, setLockMs] = useState(getLockRemainingMs());

  useEffect(() => {
    const t = setInterval(() => setLockMs(getLockRemainingMs()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (user && rolReady) navigate(from, { replace: true });
  }, [user, rolReady, navigate, from]);

  const locked = lockMs > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setInfo("");
    if (locked) return;
    const v = validate(loginSchema, { email, password });
    if (!v.ok) return setError(Object.values(v.errors)[0]);
    setCargando(true);
    try {
      await iniciarSesion(v.data.email, v.data.password, recordar);
      setPassword("");
    } catch (err) {
      if (err instanceof AppError && err.code === "locked") setError(err.message);
      else {
        const left = attemptsLeft();
        setError(traducirErrorAuth(err) + (err?.code?.startsWith("auth/invalid") || err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found" ? ` Intentos restantes: ${left > 0 ? left : 0} de ${MAX_ATTEMPTS}.` : ""));
      }
      setPassword("");
    } finally {
      setLockMs(getLockRemainingMs());
      setCargando(false);
    }
  }

  async function handleReset() {
    setError(""); setInfo("");
    const v = emailSchema.safeParse(email);
    if (!v.success) return setError("Ingrese su correo en el campo superior para recuperar la contraseña.");
    await recuperarContrasena(v.data);
    setInfo("Si el correo está registrado, recibirá instrucciones para restablecer su contraseña.");
  }

  const features = [
    { icon: "shield_lock", t: "Acceso por roles", d: "Administrador, Operador y Auditor con permisos separados." },
    { icon: "lock", t: "Comunicaciones cifradas", d: "HTTPS/WSS y telemetría firmada por dispositivo." },
    { icon: "fact_check", t: "Auditoría inalterable", d: "Cada acción crítica queda registrada con cadena de integridad." },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-surface">
      <header className="w-full bg-surface-container-lowest border-b border-surface-container-high px-6 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-on-primary font-bold text-xs">AT</div>
        <span className="text-lg text-primary font-bold tracking-tight">AlimentaTec</span>
        <span className="text-outline-variant text-sm">/</span>
        <span className="text-sm text-secondary">Portal de Acceso Industrial</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-sm overflow-hidden">
          <section className="lg:col-span-5 bg-surface-container-low border-b lg:border-b-0 lg:border-r border-surface-container-high p-8 lg:p-10 space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(#004349 1px, transparent 1px)", backgroundSize: "16px 16px" }}></div>
            <div className="relative space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-secondary-container/60 text-primary text-xs font-semibold">
                <span className="material-symbols-outlined text-base" aria-hidden="true">sensors</span> Telemetría v2.4
              </div>
              <h1 className="text-4xl text-primary font-bold tracking-tight">AlimentaTec IoT</h1>
              <p className="text-sm text-secondary leading-relaxed">Automatización y nutrición de precisión para entornos acuícolas. Supervisión continua de biorreactores y dosificadores.</p>
            </div>
            <ul className="relative space-y-3">
              {features.map((f) => (
                <li key={f.t} className="flex gap-3 bg-surface-container-lowest p-3 rounded-lg border border-surface-container-high">
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">{f.icon}</span>
                  <div><div className="text-sm font-semibold text-on-surface">{f.t}</div><div className="text-xs text-secondary">{f.d}</div></div>
                </li>
              ))}
            </ul>
          </section>

          <section className="lg:col-span-7 p-8 lg:p-12">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl text-on-surface font-bold tracking-tight">Ingreso de Operador</h2>
                <p className="text-sm text-secondary">Ingrese sus credenciales para acceder al panel de dosificación y actuadores.</p>
              </div>

              {locked && <Banner tone="error" icon="lock_clock">Acceso bloqueado por {MAX_ATTEMPTS} intentos fallidos. Podrá reintentar en <strong>{fmt(lockMs)}</strong>.</Banner>}
              {error && !locked && <Banner tone="error">{error}</Banner>}
              {info && <Banner tone="success">{info}</Banner>}

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div className="space-y-1.5">
                  <label className="block text-sm text-on-surface font-semibold" htmlFor="operator-id">Correo institucional</label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary"><span className="material-symbols-outlined text-xl" aria-hidden="true">badge</span></div>
                    <input id="operator-id" name="email" type="email" required maxLength={254} autoComplete="username" placeholder="operador@alimentatec.bio" value={email} onChange={(e) => setEmail(e.target.value)} disabled={locked} className={`${inputCls} pl-10`} />
                  </div>
                </div>

                <PasswordField id="password" label="Contraseña de seguridad" value={password} onChange={(e) => setPassword(e.target.value)} extra={<button type="button" onClick={handleReset} className="text-xs text-primary hover:underline font-semibold">¿Olvidó su contraseña?</button>} />

                <div className="flex items-center">
                  <input id="remember-me" type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary" />
                  <label className="ml-2.5 text-sm text-on-surface" htmlFor="remember-me">Mantener sesión en este equipo <span className="text-secondary">(solo equipos de confianza)</span></label>
                </div>

                <button type="submit" disabled={cargando || locked} className="w-full h-11 bg-primary-container text-on-primary hover:bg-primary font-semibold text-sm rounded transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                  <span>{cargando ? "Verificando credenciales…" : locked ? "Acceso bloqueado" : "Iniciar sesión"}</span>
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">login</span>
                </button>
              </form>

              <p className="text-center text-sm text-secondary">¿No tiene cuenta? <Link to="/register" className="text-primary font-semibold hover:underline">Regístrese aquí</Link></p>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full bg-surface-container-lowest border-t border-surface-container-high px-6 py-3 text-center text-secondary text-xs">© AlimentaTec S.A. · Sistemas de Dosificación Automatizada</footer>
    </div>
  );
}
