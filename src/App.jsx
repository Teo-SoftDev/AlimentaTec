import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Monitoring from "./pages/Monitoring.jsx";
import Devices from "./pages/Devices.jsx";
import Animals from "./pages/Animals.jsx";
import Schedules from "./pages/Schedules.jsx";
import Dosing from "./pages/Dosing.jsx";
import History from "./pages/History.jsx";
import Reports from "./pages/Reports.jsx";

// Cada vista protegida declara el permiso requerido (A01). Cualquier ruta
// desconocida redirige al inicio: no hay rutas huérfanas expuestas.
const guard = (permission, el) => <ProtectedRoute permission={permission}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={guard("view", <Dashboard />)} />
        <Route path="/monitoreo" element={guard("view", <Monitoring />)} />
        <Route path="/dispositivos" element={guard("view", <Devices />)} />
        <Route path="/animales" element={guard("view", <Animals />)} />
        <Route path="/horarios" element={guard("view", <Schedules />)} />
        <Route path="/dosificacion" element={guard("view", <Dosing />)} />
        <Route path="/historial" element={guard("audit:view", <History />)} />
        <Route path="/reportes" element={guard("view", <Reports />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
