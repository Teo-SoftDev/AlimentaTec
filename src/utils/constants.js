// src/utils/constants.js
export const PONDS = [
  { id: "AQ-01", name: "Estanque AQ-01", species: "Salmón del Atlántico" },
  { id: "AQ-04", name: "Estanque AQ-04", species: "Trucha Arcoíris" },
  { id: "AQ-06", name: "Estanque AQ-06", species: "Tilapia Nilótica" },
  { id: "AQ-09", name: "Estanque AQ-09", species: "Lubina" },
];
export const POND_IDS = PONDS.map((p) => p.id);
export const pondName = (id) => PONDS.find((p) => p.id === id)?.name || id;

// Rutas internas permitidas como destino tras el login (evita open-redirect).
export const ALLOWED_PATHS = [
  "/dashboard", "/monitoreo", "/dispositivos", "/animales", "/horarios", "/dosificacion", "/historial", "/reportes", "/cuidador", "/simulador",
];

export const EVENT_TYPES = {
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  schedule_change: "Cambio de horario",
  schedule_delete: "Horario eliminado",
  dispense_manual: "Dispensación manual",
  dispense_test: "Prueba de descarga",
  toggle_auto: "Auto-alimentación",
  emergency_stop: "Parada de emergencia",
  device_add: "Dispositivo agregado",
  device_update: "Dispositivo modificado",
  device_revoke: "Dispositivo revocado",
  device_delete: "Dispositivo eliminado",
  dosing_change: "Cambio de dosificación",
  batch_save: "Lote guardado",
  batch_delete: "Lote eliminado",
  report_export: "Exportación de reporte",
  telemetry_rejected: "Telemetría rechazada",
  integrity_check: "Verificación de integridad",
  pin_set: "PIN configurado",
  scheduled_feeding: "Alimentación automática",
  scheduled_skipped: "Alimentación omitida",
  sim_offline: "Simulador sin conexión",
  sim_online: "Simulador reconectado",
  sim_sync: "Sincronización tras desconexión",
  device_credentials_rotated: "Credenciales rotadas",
  api_auth_failed: "API: fallo de autenticación",
  api_rate_limited: "API: límite de tasa",
  api_invalid_payload: "API: payload inválido",
  api_forbidden_device_type: "API: dispositivo no autorizado",
  api_pond_mismatch: "API: estanque no coincide",
  api_device_offline: "API: sensor sin conexión",
};
export const eventLabel = (t) => EVENT_TYPES[t] || t;

export const SENSOR_LABELS = { oxygen: "Oxígeno disuelto (mg/L)", temperature: "Temperatura (°C)", ph: "pH", turbidity: "Turbidez (NTU)" };
// Lectura de referencia para evaluar condiciones en el editor de horarios.
export const SENSOR_SNAPSHOT = { oxygen: 7.1, temperature: 16.4, ph: 7.4, turbidity: 1.8 };
