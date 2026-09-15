import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { traducirErrorAuth } from "../utils/authErrors.js";
import PasswordField from "../components/PasswordField.jsx";

export default function Login() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Ingrese su correo institucional y su contraseña.");
      return;
    }

    setCargando(true);
    try {
      await iniciarSesion(email.trim(), password, recordar);
      navigate("/dashboard");
    } catch (err) {
      console.error("Error de autenticación:", err);
      setError(traducirErrorAuth(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="h-full flex flex-col justify-between">
      {/* Header */}
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
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-surface-container rounded border border-outline-variant text-secondary">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-xs font-semibold">MQTT Broker: ONLINE</span>
          <span className="text-outline-variant text-xs">•</span>
          <span className="text-xs font-semibold">TLS v1.3</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-sm overflow-hidden min-h-[660px]">
          {/* Left rail */}
          <section className="lg:col-span-5 bg-surface-container-low border-b lg:border-b-0 lg:border-r border-surface-container-high p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(#004349 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            ></div>
            <div className="relative z-10 space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-secondary-container/60 text-primary text-xs font-semibold">
                  <span className="material-symbols-outlined text-base">sensors</span>
                  <span>Telemetría v2.4</span>
                </div>
                <h1 className="text-4xl text-primary font-bold tracking-tight">AlimentaTec IoT</h1>
                <p className="text-sm text-secondary leading-relaxed">
                  Automatización y nutrición de precisión para entornos acuáticos y terrestres.
                  Supervisión continua de estequiometría y biorreactores de alimentación.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-4 rounded-lg border border-surface-container-high space-y-2">
                <div className="flex items-center justify-between text-secondary">
                  <label className="text-xs uppercase tracking-wide font-semibold text-secondary" htmlFor="station-selector">
                    Estación Asignada
                  </label>
                  <span className="text-xs text-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Autodetectada
                  </span>
                </div>
                <div className="relative">
                  <select
                    id="station-selector"
                    className="w-full h-10 pl-3 pr-8 bg-surface-container-low border border-outline-variant rounded text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                  >
                    <option value="est-sur-1">Cluster Bio-Acuático Sur (Estanque A1 - D4)</option>
                    <option value="est-norte-2">Planta Terrestre Agro-Biotec Norte (Silos 01-12)</option>
                    <option value="est-lab-central">Laboratorio Central I+D (Pruebas de Dieta)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-secondary pointer-events-none text-lg">
                    tune
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="text-secondary text-xs uppercase tracking-wider font-semibold">
                  Estado de Red Bio-Control
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-container-lowest rounded border border-surface-container-high">
                    <div className="flex items-center gap-2 text-secondary mb-1">
                      <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
                      <span className="text-xs">Dispositivos</span>
                    </div>
                    <div className="text-lg text-on-surface font-bold">142 / 144</div>
                    <div className="text-xs text-secondary">Sincronizados</div>
                  </div>
                  <div className="p-3 bg-surface-container-lowest rounded border border-surface-container-high">
                    <div className="flex items-center gap-2 text-secondary mb-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span className="text-xs">Latencia P2P</span>
                    </div>
                    <div className="text-lg text-primary font-bold">18 ms</div>
                    <div className="text-xs text-secondary">Tiempo Real</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-6 border-t border-surface-container-high flex items-center justify-between text-secondary text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-secondary">router</span>
                <span>
                  Gateway ID: <code>GW-BIO-9022</code>
                </span>
              </div>
              <span className="text-xs bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-mono">
                FIRMWARE 2.4.11
              </span>
            </div>
          </section>

          {/* Right form */}
          <section className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-between">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div className="space-y-1 text-left">
                <h2 className="text-2xl text-on-surface font-bold tracking-tight">Ingreso de Operador</h2>
                <p className="text-sm text-secondary">
                  Ingrese sus credenciales criptográficas de planta para acceder al panel de dosificación y actuadores.
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

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                <div className="space-y-1.5">
                  <label className="block text-sm text-on-surface font-semibold" htmlFor="operator-id">
                    Correo Institucional o ID de Operador
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                      <span className="material-symbols-outlined text-xl">badge</span>
                    </div>
                    <input
                      id="operator-id"
                      name="operator-id"
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

                <PasswordField
                  id="password"
                  label="Contraseña de Seguridad"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  extra={
                    <a
                      href="#recuperar"
                      className="text-xs text-primary hover:underline font-semibold focus:outline-none focus:ring-1 focus:ring-primary rounded"
                    >
                      ¿Olvidó su contraseña?
                    </a>
                  }
                />

                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={recordar}
                    onChange={(e) => setRecordar(e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-0 bg-surface-container-lowest"
                  />
                  <label className="ml-2.5 block text-sm text-on-surface" htmlFor="remember-me">
                    Recordar credenciales en este terminal de planta
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={cargando}
                    className="w-full h-11 bg-primary-container text-on-primary hover:bg-primary active:scale-[0.99] font-semibold text-sm rounded transition-all duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>{cargando ? "Verificando credenciales…" : "Iniciar Sesión en Telemetría"}</span>
                    <span className="material-symbols-outlined text-xl">login</span>
                  </button>
                </div>
              </form>

              <p className="text-center text-sm text-secondary">
                ¿No tiene una cuenta de operador?{" "}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Regístrese aquí
                </Link>
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-surface-container-high text-center max-w-md w-full mx-auto">
              <p className="text-xs text-secondary flex items-center justify-center gap-1.5 flex-wrap">
                <span className="material-symbols-outlined text-base text-primary">verified_user</span>
                <span>
                  Conexión encriptada de grado alimentario e industrial bajo norma <strong>ISO/IEC 27001</strong>.
                </span>
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className="w-full bg-surface-container-lowest border-t border-surface-container-high px-6 py-3 shrink-0 flex flex-col sm:flex-row items-center justify-between text-secondary text-xs gap-2">
        <div>© 2024 AlimentaTec S.A. Todos los derechos reservados. Sistemas de Dosificación Automatizada.</div>
        <div className="flex items-center gap-4 text-xs">
          <span className="hover:text-primary cursor-pointer">Protocolo MQTT/WSS</span>
          <span className="text-outline-variant">•</span>
          <span className="hover:text-primary cursor-pointer">Registro de Auditoría</span>
        </div>
      </footer>
    </div>
  );
}
