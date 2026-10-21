import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../utils/permissions.js";

export default function AccessDenied({ disabled = false }) {
  const { role, cerrarSesion } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div role="alert" className="max-w-md w-full bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-sm p-8 text-center space-y-3">
        <span className="material-symbols-outlined text-error text-5xl" aria-hidden="true">lock</span>
        <h1 className="text-xl font-bold text-on-surface">Acceso restringido</h1>
        <p className="text-sm text-secondary">
          {disabled ? "Su cuenta está deshabilitada. Contacte al administrador del sistema." : `Su rol actual (${ROLE_LABELS[role]}) no tiene permiso para ver este módulo.`}
        </p>
        <div className="flex justify-center gap-2 pt-2">
          {!disabled && <Link to="/dashboard" className="px-4 py-2 rounded bg-primary-container text-on-primary text-sm font-semibold hover:bg-primary">Ir al resumen</Link>}
          <button onClick={() => cerrarSesion("access_denied")} className="px-4 py-2 rounded border border-outline-variant text-sm text-on-surface hover:bg-surface-container">Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}
