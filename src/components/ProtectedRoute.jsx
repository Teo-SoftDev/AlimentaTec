import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, cargandoSesion } = useAuth();

  if (cargandoSesion) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="flex items-center gap-2 text-secondary text-sm">
          <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
          Verificando sesión…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
