import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../utils/permissions.js";
import { sanitizeText } from "../utils/sanitize.js";
import { friendlyError } from "../utils/errors.js";
import { sendCommand } from "../services/commands.js";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { Banner } from "./ui.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Resumen", icon: "space_dashboard", path: "/dashboard" },
  { id: "monitoreo", label: "Monitoreo", icon: "dashboard", path: "/monitoreo" },
  { id: "dispositivos", label: "Dispositivos", icon: "precision_manufacturing", path: "/dispositivos" },
  { id: "animales", label: "Animales", icon: "pets", path: "/animales" },
  { id: "horarios", label: "Horarios", icon: "schedule", path: "/horarios" },
  { id: "dosificacion", label: "Dosificación", icon: "tune", path: "/dosificacion" },
  { id: "historial", label: "Historial", icon: "history", path: "/historial" },
  { id: "reportes", label: "Reportes", icon: "assessment", path: "/reportes" },
];

const ROLE_BADGE = {
  admin: "bg-primary text-on-primary",
  operador: "bg-secondary-container text-on-secondary-fixed",
  auditor: "bg-surface-container-high text-on-surface-variant",
};

function NavItem({ item, active, variant }) {
  const isActive = item.id === active;
  const cls =
    variant === "sidebar"
      ? isActive
        ? "flex items-center gap-3 px-3 py-2 text-primary bg-secondary-container/50 rounded font-semibold border-l-4 border-primary text-label-md font-label-md"
        : "flex items-center gap-3 px-3 py-2 text-secondary rounded hover:bg-surface-container-high transition-colors text-label-md font-label-md"
      : `flex flex-col items-center justify-center min-w-[76px] py-1 px-2 ${isActive ? "text-primary font-bold" : "text-secondary"}`;
  return (
    <Link to={item.path} className={cls} aria-current={isActive ? "page" : undefined}>
      <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
      <span className={variant === "sidebar" ? "" : "text-label-sm font-label-sm"}>{item.label}</span>
    </Link>
  );
}

export default function AppLayout({ active, searchPlaceholder = "Buscar en el historial…", children }) {
  const { user, role, can, cerrarSesion, actor, profileError } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [confirmStop, setConfirmStop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  async function logout() {
    await cerrarSesion("manual");
    navigate("/");
  }

  function onSearch(e) {
    e.preventDefault();
    const term = sanitizeText(q).slice(0, 80);
    navigate(term ? `/historial?q=${encodeURIComponent(term)}` : "/historial");
  }

  async function emergencyStop() {
    setBusy(true);
    try {
      await sendCommand({ actor: actor(), command: { type: "emergency_stop", deviceId: "ALL" } });
      setNotice({ tone: "success", text: "Parada de emergencia enviada a todos los dispensadores y registrada en auditoría." });
    } catch (e) {
      setNotice({ tone: "error", text: friendlyError(e) });
    } finally {
      setBusy(false);
      setConfirmStop(false);
    }
  }

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen flex flex-col font-body-md text-body-md selection:bg-primary selection:text-on-primary">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:bg-white focus:text-primary focus:px-3 focus:py-2 focus:rounded">
        Saltar al contenido
      </a>

      <header className="bg-surface-container-lowest border-b border-surface-container-high shadow-sm flex justify-between items-center w-full px-4 sm:px-6 h-16 sticky top-0 z-40 gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm">
            <span className="material-symbols-outlined" aria-hidden="true">water_ph</span>
          </div>
          <span className="text-headline-md font-headline-md text-primary tracking-tight hidden sm:inline">AlimentaTec</span>
        </div>

        <form onSubmit={onSearch} role="search" className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary" aria-hidden="true">search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} aria-label="Buscar en el historial" placeholder={searchPlaceholder} className="w-full pl-9 pr-3 h-9 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-transparent" />
          </div>
        </form>

        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setConfirmStop(true)} disabled={!can("command")} title={can("command") ? "Detener todos los dispensadores" : "Su rol no permite esta acción"} className="flex items-center gap-2 bg-error hover:bg-red-700 text-on-error px-3 py-1.5 rounded text-label-md font-label-md shadow-sm transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">emergency_home</span>
            <span className="hidden lg:inline">Parada de Emergencia</span>
          </button>
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-surface-container-high">
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-label-md font-label-md text-on-surface max-w-[160px] truncate">{user?.displayName || user?.email}</div>
              <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${ROLE_BADGE[role]}`}>{ROLE_LABELS[role]}</span>
            </div>
            <button type="button" onClick={logout} className="p-2 rounded hover:bg-surface-container text-secondary transition-colors" aria-label="Cerrar sesión" title="Cerrar sesión">
              <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside aria-label="Navegación principal" className="w-64 bg-surface border-r border-surface-container-high h-[calc(100vh-4rem)] sticky top-16 hidden lg:flex flex-col justify-between p-4 shrink-0">
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined" aria-hidden="true">precision_manufacturing</span>
              </div>
              <div>
                <h2 className="text-headline-sm font-headline-sm text-primary leading-tight">AlimentaTec IoT</h2>
                <p className="text-label-sm font-label-sm text-secondary">Telemetría v2.4</p>
              </div>
            </div>
            <Link to="/dosificacion" className="w-full flex items-center justify-center gap-2 bg-primary-container text-on-primary py-2 px-3 rounded text-label-md font-label-md hover:bg-primary transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">tune</span>
              <span>Calibrar Alimentador</span>
            </Link>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => <NavItem key={item.id} item={item} active={active} variant="sidebar" />)}
            </nav>
          </div>
          <p className="text-label-sm font-label-sm text-secondary px-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary" aria-hidden="true">verified_user</span>
            Sesión cifrada · TLS
          </p>
        </aside>

        <main id="contenido" tabIndex={-1} className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {profileError && <Banner tone="warn">{profileError} Se aplican permisos de solo lectura.</Banner>}
            {role === "auditor" && <Banner tone="info" icon="visibility">Su cuenta tiene rol <strong>Auditor</strong> (solo lectura). Un administrador debe asignarle el rol de Operador para enviar comandos.</Banner>}
            {notice && (
              <div className="flex items-start gap-2">
                <Banner tone={notice.tone} className="flex-1">{notice.text}</Banner>
                <button onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="p-1 text-secondary"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      <nav aria-label="Navegación móvil" className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-surface-container-high shadow-lg px-1 z-50 flex overflow-x-auto h-16 items-center">
        {NAV_ITEMS.map((item) => <NavItem key={item.id} item={item} active={active} variant="bottom" />)}
      </nav>

      <ConfirmDialog open={confirmStop} danger busy={busy} title="¿Ejecutar parada de emergencia?" message="Se enviará una orden de detención inmediata a TODOS los dispensadores. La acción queda registrada en la auditoría." confirmLabel="Detener todo" onConfirm={emergencyStop} onCancel={() => setConfirmStop(false)} />
    </div>
  );
}
