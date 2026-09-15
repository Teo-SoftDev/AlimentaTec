import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { user, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await cerrarSesion();
    navigate("/");
  }

  return (
    <div className="h-full flex flex-col min-h-screen">
      <header className="w-full bg-surface-container-lowest border-b border-surface-container-high px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-on-primary font-bold text-xs">
            AT
          </div>
          <span className="text-lg text-primary font-bold tracking-tight">AlimentaTec</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-secondary hover:text-on-surface border border-outline-variant rounded px-3 py-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">logout</span> Cerrar sesión
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-sm p-8 text-center space-y-3">
          <span className="material-symbols-outlined text-primary text-5xl">verified_user</span>
          <h1 className="text-xl font-bold text-on-surface">Sesión iniciada correctamente</h1>
          <p className="text-sm text-secondary">
            Bienvenido/a, <strong>{user?.displayName || "Operador de Planta"}</strong>.
          </p>
          <p className="text-sm text-secondary">Correo: {user?.email}</p>
          <p className="text-xs text-secondary pt-2">
            Este es un panel de ejemplo. Aquí puede construir la vista de dosificación y actuadores.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              to="/dispositivos"
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-primary">precision_manufacturing</span>
              <span className="text-sm font-semibold text-on-surface">Dispositivos</span>
            </Link>
            <Link
              to="/animales"
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-primary">pets</span>
              <span className="text-sm font-semibold text-on-surface">Animales</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
