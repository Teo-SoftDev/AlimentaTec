import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { id: "monitoreo", label: "Monitoreo", icon: "dashboard", path: "/monitoreo" },
  { id: "dispositivos", label: "Dispositivos", icon: "precision_manufacturing", path: "/dispositivos" },
  { id: "animales", label: "Animales", icon: "pets", path: "/animales" },
  { id: "horarios", label: "Horarios", icon: "schedule", path: "/horarios" },
  { id: "dosificacion", label: "Dosificación", icon: "tune", path: "/dosificacion" },
  { id: "historial", label: "Historial", icon: "history", path: "/historial" },
];

function NavLinkItem({ item, active, variant = "sidebar" }) {
  const isActive = item.id === active;

  const sidebarClasses = isActive
    ? "flex items-center gap-3 px-3 py-2 text-primary bg-secondary-container/50 rounded font-semibold border-l-4 border-primary text-label-md font-label-md"
    : "flex items-center gap-3 px-3 py-2 text-secondary rounded hover:bg-surface-container-high transition-colors text-label-md font-label-md";

  const bottomClasses = isActive
    ? "flex flex-col items-center justify-center text-primary font-bold py-1 px-2"
    : "flex flex-col items-center justify-center text-secondary py-1 px-2";

  const iconColor = variant === "sidebar" && isActive ? "text-primary" : "";

  const content =
    variant === "sidebar" ? (
      <>
        <span className={`material-symbols-outlined ${iconColor}`}>{item.icon}</span>
        <span>{item.label}</span>
      </>
    ) : (
      <>
        <span className="material-symbols-outlined">{item.icon}</span>
        <span className="text-label-sm font-label-sm">{item.label}</span>
      </>
    );

  const className = variant === "sidebar" ? sidebarClasses : bottomClasses;

  if (item.path) {
    return (
      <Link to={item.path} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a href="#" onClick={(e) => e.preventDefault()} className={className}>
      {content}
    </a>
  );
}

export default function AppLayout({ active, searchPlaceholder = "Buscar…", children }) {
  const { user, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await cerrarSesion();
    navigate("/");
  }

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen flex flex-col font-body-md text-body-md selection:bg-primary selection:text-on-primary">
      {/* TOP APP BAR */}
      <header className="bg-surface-container-lowest border-b border-surface-container-high shadow-sm flex justify-between items-center w-full px-6 h-16 sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined">water_ph</span>
            </div>
            <span className="text-headline-md font-headline-md text-primary tracking-tight">AlimentaTec</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 h-full">
            <a className="h-full flex items-center px-2 text-label-md font-label-md text-primary border-b-2 border-primary font-semibold" href="#" onClick={(e) => e.preventDefault()}>
              Acuático
            </a>
            <a
              className="h-full flex items-center px-2 text-label-md font-label-md text-secondary hover:text-on-surface transition-colors duration-150"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              Terrestre
            </a>
          </nav>
        </div>

        <div className="hidden sm:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary">search</span>
            <input
              className="w-full pl-9 pr-3 h-9 rounded-lg border border-outline-variant bg-surface text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-transparent transition-all"
              placeholder={searchPlaceholder}
              type="text"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-error hover:bg-red-700 text-on-error px-3 py-1.5 rounded text-label-md font-label-md shadow-sm transition-transform active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">emergency_home</span>
            <span className="hidden lg:inline">Parada de Emergencia</span>
          </button>

          <div className="flex items-center gap-1 border-l border-surface-container-high pl-3">
            <button className="p-2 rounded hover:bg-surface-container text-secondary transition-colors relative" title="Sensores">
              <span className="material-symbols-outlined">sensors</span>
              <span className="w-2 h-2 bg-primary rounded-full absolute top-2 right-2"></span>
            </button>
            <button className="p-2 rounded hover:bg-surface-container text-secondary transition-colors relative" title="Notificaciones">
              <span className="material-symbols-outlined">notifications</span>
              <span className="w-2 h-2 bg-tertiary-container rounded-full absolute top-2 right-2"></span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded hover:bg-surface-container text-secondary transition-colors"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-surface-container-high" title={user?.email || ""}>
            <div className="w-8 h-8 rounded-full border border-outline-variant bg-primary-container text-on-primary flex items-center justify-center text-xs font-bold uppercase">
              {(user?.displayName || user?.email || "O").charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 bg-surface border-r border-surface-container-high h-[calc(100vh-4rem)] sticky top-16 hidden lg:flex flex-col justify-between p-4 shrink-0">
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">precision_manufacturing</span>
              </div>
              <div>
                <h2 className="text-headline-sm font-headline-sm text-primary leading-tight">AlimentaTec IoT</h2>
                <p className="text-label-sm font-label-sm text-secondary">Telemetría v2.4</p>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 bg-primary-container text-on-primary py-2 px-3 rounded text-label-md font-label-md hover:bg-primary transition-colors active:scale-[0.98] shadow-sm">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span>Calibrar Alimentador</span>
            </button>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLinkItem key={item.id} item={item} active={active} variant="sidebar" />
              ))}
            </nav>
          </div>

          <div className="border-t border-surface-container-high pt-4 space-y-1">
            <a
              className="flex items-center gap-3 px-3 py-2 text-secondary rounded hover:bg-surface-container-high transition-colors text-label-md font-label-md"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              <span className="material-symbols-outlined">router</span>
              <span>Diagnóstico Red</span>
            </a>
            <a
              className="flex items-center gap-3 px-3 py-2 text-secondary rounded hover:bg-surface-container-high transition-colors text-label-md font-label-md"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              <span className="material-symbols-outlined">settings</span>
              <span>Ajustes</span>
            </a>
          </div>
        </aside>

        {/* CONTENT CANVAS */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto w-full space-y-6">{children}</div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-surface-container-high shadow-lg px-2 py-1 z-50 flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => (
          <NavLinkItem key={item.id} item={item} active={active} variant="bottom" />
        ))}
      </nav>
    </div>
  );
}
