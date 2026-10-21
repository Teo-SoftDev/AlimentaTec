import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AccessDenied from "./AccessDenied.jsx";
import { Spinner } from "./ui.jsx";

// A01: autenticación + verificación de rol/permiso ANTES de renderizar la vista.
export default function ProtectedRoute({ children, permission = "view" }) {
  const { user, cargandoSesion, rolReady, can, profile } = useAuth();
  const location = useLocation();

  if (cargandoSesion || (user && !rolReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner label="Verificando sesión y permisos…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (profile?.disabled) return <AccessDenied disabled />;
  if (!can(permission)) return <AccessDenied />;
  return children;
}
