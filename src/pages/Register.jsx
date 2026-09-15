import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { traducirErrorAuth } from "../utils/authErrors.js";
import PasswordField from "../components/PasswordField.jsx";

const MODULOS = [
  { value: "acuatico", label: "Acuático", icon: "pool" },
  { value: "terrestre", label: "Terrestre", icon: "pets" },
  { value: "ambos", label: "Ambos", icon: "hub" },
];

export default function Register() {
  const { registrarse } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modulo, setModulo] = useState("acuatico");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setExito("");

    if (!nombre.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Complete todos los campos para continuar.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden. Verifíquelas.");
      return;
    }
    if (!aceptaTerminos) {
      setError("Debe aceptar la política de uso de datos y el reglamento interno.");
      return;
    }

    setCargando(true);
    try {
      await registrarse(nombre.trim(), email.trim(), password);
      setExito("Cuenta creada correctamente. Redirigiendo al panel…");
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (err) {
      console.error("Error de registro:", err);
      setError(traducirErrorAuth(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="h-full flex flex-col justify-between">
      <header className="w-full bg-surface-container-lowest border-b border-surface-container-high px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-on-primary font-bold text-xs tracking-wider">
            AT
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg text-primary font-bold tracking-tight">AlimentaTec</span>
            <span className="text-outline-variant text-sm">/</span>
            <span className="text-sm text-secondary">Portal de Acceso Industrial</span>
          </div>
        </div>
        <Link to="/" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-lg">arrow_back</span> Volver al inicio de sesión
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-xl bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-sm overflow-hidden">
          <div className="p-8 lg:p-10 space-y-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-secondary-container/60 text-primary text-xs font-semibold">
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>Nuevo Operador</span>
              </div>
              <h1 className="text-2xl text-on-surface font-bold tracking-tight pt-2">Crear Cuenta de Operador</h1>
              <p className="text-sm text-secondary">
                Complete sus datos para solicitar acceso al panel de dosificación y actuadores de AlimentaTec.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-error bg-error-container px-3 py-2.5 text-sm text-on-error-container"
              >
                <span className="material-symbols-outlined text-lg shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}
            {exito && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-lg border border-success bg-success-container px-3 py-2.5 text-sm text-success"
              >
                <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
                <span>{exito}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <label className="block text-sm text-on-surface font-semibold" htmlFor="full-name">
                  Nombre Completo
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                    <span className="material-symbols-outlined text-xl">badge</span>
                  </div>
                  <input
                    id="full-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Ej: María Vargas"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-on-surface font-semibold" htmlFor="operator-id">
                  Correo Institucional
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                    <span className="material-symbols-outlined text-xl">mail</span>
                  </div>
                  <input
                    id="operator-id"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="operador@alimentatec.bio"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PasswordField
                  id="password"
                  label="Contraseña"
                  placeholder="Mín. 8 caracteres"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordField
                  id="confirm-password"
                  label="Confirmar Contraseña"
                  placeholder="Repita la contraseña"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-on-surface font-semibold">Módulo Principal de Trabajo</label>
                <div className="grid grid-cols-3 gap-2">
                  {MODULOS.map((m) => {
                    const activo = modulo === m.value;
                    return (
                      <label
                        key={m.value}
                        className={`relative flex flex-col items-center justify-center p-2.5 bg-surface-container-lowest rounded cursor-pointer transition-all hover:bg-surface-container-low ${
                          activo ? "border-2 border-primary" : "border border-outline-variant"
                        }`}
                      >
                        <input
                          type="radio"
                          name="target_module"
                          value={m.value}
                          checked={activo}
                          onChange={() => setModulo(m.value)}
                          className="sr-only"
                        />
                        <span
                          className={`material-symbols-outlined text-xl mb-1 ${
                            activo ? "text-primary" : "text-secondary"
                          }`}
                        >
                          {m.icon}
                        </span>
                        <span
                          className={`text-xs font-semibold ${activo ? "text-primary font-bold" : "text-secondary"}`}
                        >
                          {m.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  id="accept-terms"
                  type="checkbox"
                  required
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0 bg-surface-container-lowest"
                />
                <label className="text-sm text-on-surface" htmlFor="accept-terms">
                  Acepto la política de uso de datos industriales y el reglamento interno de acceso de AlimentaTec.
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full h-11 bg-primary-container text-on-primary hover:bg-primary active:scale-[0.99] font-semibold text-sm rounded transition-all duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span>{cargando ? "Creando cuenta…" : "Crear Cuenta de Operador"}</span>
                  <span className="material-symbols-outlined text-xl">how_to_reg</span>
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-secondary">
              ¿Ya tiene una cuenta?{" "}
              <Link to="/" className="text-primary font-semibold hover:underline">
                Inicie sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full bg-surface-container-lowest border-t border-surface-container-high px-6 py-3 shrink-0 text-center text-secondary text-xs">
        © 2024 AlimentaTec S.A. Todos los derechos reservados. Sistemas de Dosificación Automatizada.
      </footer>
    </div>
  );
}
