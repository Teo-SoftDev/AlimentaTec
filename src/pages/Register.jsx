import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { traducirErrorAuth } from "../utils/authErrors.js";
import { validate, registerSchema } from "../utils/validation.js";
import { checkRegistrationRate, formatRetry } from "../utils/rateLimiter.js";
import PasswordField from "../components/PasswordField.jsx";
import { Banner, Field, inputCls } from "../components/ui.jsx";

export default function Register() {
  const { registrarse } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setErrors({});
    const v = validate(registerSchema, form);
    if (!v.ok) return setErrors(v.errors);
    const rate = checkRegistrationRate("register");
    if (!rate.allowed) return setError(`Demasiados intentos de registro. Reintente en ${formatRetry(rate.retryAfterMs)}.`);
    setCargando(true);
    try {
      await registrarse(v.data.nombre, v.data.email, v.data.password);
      setOk(true);
      setTimeout(() => navigate("/dashboard"), 1800);
    } catch (err) {
      setError(traducirErrorAuth(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-surface">
      <header className="w-full bg-surface-container-lowest border-b border-surface-container-high px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-on-primary font-bold text-xs">AT</div>
          <span className="text-lg text-primary font-bold tracking-tight">AlimentaTec</span>
        </div>
        <Link to="/" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span> Volver al inicio de sesión</Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-xl bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-sm p-8 lg:p-10 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl text-on-surface font-bold tracking-tight">Crear cuenta</h1>
            <p className="text-sm text-secondary">Las cuentas nuevas se crean con rol de <strong>solo lectura (Auditor)</strong>. Un administrador asignará los permisos de operación.</p>
          </div>
          {error && <Banner tone="error">{error}</Banner>}
          {ok && <Banner tone="success">Cuenta creada. Revise su correo para verificarlo. Redirigiendo…</Banner>}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <Field label="Nombre completo" htmlFor="full-name" error={errors.nombre} required>
              <input id="full-name" autoComplete="name" maxLength={80} className={inputCls} value={form.nombre} onChange={set("nombre")} placeholder="Ej: María Vargas" />
            </Field>
            <Field label="Correo institucional" htmlFor="reg-email" error={errors.email} required>
              <input id="reg-email" type="email" autoComplete="email" maxLength={254} className={inputCls} value={form.email} onChange={set("email")} placeholder="operador@alimentatec.bio" />
            </Field>
            <PasswordField id="password" label="Contraseña" autoComplete="new-password" placeholder="Mín. 12 caracteres" value={form.password} onChange={set("password")} showPolicy error={errors.password} />
            <PasswordField id="confirm-password" label="Confirmar contraseña" autoComplete="new-password" placeholder="Repita la contraseña" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
            <div>
              <div className="flex items-start gap-2">
                <input id="terms" type="checkbox" checked={form.terms} onChange={set("terms")} className="h-4 w-4 mt-0.5 rounded border-outline-variant text-primary focus:ring-primary" />
                <label htmlFor="terms" className="text-sm text-on-surface">Acepto la política de uso de datos industriales y el reglamento interno de acceso.</label>
              </div>
              {errors.terms && <p role="alert" className="text-label-sm font-label-sm text-error mt-1">{errors.terms}</p>}
            </div>
            <button type="submit" disabled={cargando || ok} className="w-full h-11 bg-primary-container text-on-primary hover:bg-primary font-semibold text-sm rounded transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60">
              {cargando ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>
        </div>
      </main>
      <footer className="w-full bg-surface-container-lowest border-t border-surface-container-high px-6 py-3 text-center text-secondary text-xs">© AlimentaTec S.A.</footer>
    </div>
  );
}
