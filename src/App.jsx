import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { SimulatorProvider } from "./simulator/SimulatorContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { homeFor } from "./utils/permissions.js";
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
import Caretaker from "./pages/Caretaker.jsx";
import Simulator from "./pages/Simulator.jsx";

// Cada vista protegida declara el permiso requerido (A01). Cualquier ruta
// desconocida redirige al inicio: no hay rutas huérfanas expuestas.
const guard = (permission, el) => <ProtectedRoute permission={permission}>{el}</ProtectedRoute>;

// El cuidador siempre aterriza en su vista simplificada.
function RoleHome() {
  const { role } = useAuth();
  return role === "cuidador" ? <Navigate to={homeFor(role)} replace /> : <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SimulatorProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={guard("view", <RoleHome />)} />
            <Route path="/cuidador" element={guard("caretaker:view", <Caretaker />)} />
            <Route path="/monitoreo" element={guard("advanced:view", <Monitoring />)} />
            <Route path="/dispositivos" element={guard("advanced:view", <Devices />)} />
            <Route path="/animales" element={guard("advanced:view", <Animals />)} />
            <Route path="/horarios" element={guard("advanced:view", <Schedules />)} />
            <Route path="/dosificacion" element={guard("advanced:view", <Dosing />)} />
            <Route path="/simulador" element={guard("simulator:view", <Simulator />)} />
            <Route path="/historial" element={guard("audit:view", <History />)} />
            <Route path="/reportes" element={guard("advanced:view", <Reports />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SimulatorProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
