// src/simulator/SimulatorContext.jsx
// Ejecuta el motor de alimentación programada en este navegador (si el usuario lo activa) y
// sincroniza el estado con la UI de TODOS los usuarios mediante listeners de Firestore.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useCollection } from "../hooks/useCollection.js";
import { writeAudit } from "../services/audit.js";
import { DEMO_SCHEDULES, POND_READINGS } from "../utils/demoData.js";
import { pondName } from "../utils/constants.js";
import { FeedingSimulator } from "./runtime.js";

const SimulatorContext = createContext(null);
const LS_ENABLED = "at_sim_enabled";
const LS_BEHAVIOR = "at_sim_behavior";

const storage = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignorar */ } },
};

export function SimulatorProvider({ children }) {
  const { user, rolReady, can, actor } = useAuth();
  const { toast } = useToast();
  const logged = !!user && rolReady;
  const canControl = logged && can("simulator:control");

  const schedulesQ = useCollection("schedules", { limitN: 200, fallback: DEMO_SCHEDULES, enabled: canControl });
  const pondQ = useCollection("pondStatus", { limitN: 20, enabled: logged });
  const eventsQ = useCollection("feedingEvents", { orderByField: "executedAtMs", direction: "desc", limitN: 40, enabled: logged });

  const readingsRef = useRef({});
  readingsRef.current = useMemo(() => {
    const out = {};
    for (const [pond, r] of Object.entries(POND_READINGS)) out[pond] = { ...r };
    for (const p of pondQ.items) for (const [m, v] of Object.entries(p.metrics || {})) (out[p.id] ||= {})[m] = v.value; // datos reales de la API
    return out;
  }, [pondQ.items]);

  const simRef = useRef(null);
  if (!simRef.current) {
    const io = {
      storage,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      getReadings: (pond) => readingsRef.current[pond] || {},
      eventExists: async (id) => (await getDoc(doc(db, "feedingEvents", id))).exists(),
      createEvent: async (ev) => {
        const ref = doc(db, "feedingEvents", ev.occurrenceId);
        if ((await getDoc(ref)).exists()) return "exists";
        try {
          await setDoc(ref, { ...ev, hostUid: actor()?.uid, ts: serverTimestamp() });
          return "created";
        } catch (e) {
          if (e?.code === "permission-denied" && (await getDoc(ref)).exists()) return "exists"; // otro host ganó la carrera
          throw e;
        }
      },
      updateEvent: (id, patch) => updateDoc(doc(db, "feedingEvents", id), patch),
      audit: (type, target, details, severity) => writeAudit({ actor: actor(), type, target, details, severity }),
      writeState: (s) => setDoc(doc(db, "simulatorState", "main"), { ...s, hostUid: actor()?.uid, hostEmail: actor()?.email || "", ts: serverTimestamp() }),
    };
    simRef.current = new FeedingSimulator({ io });
    simRef.current.setBehavior(storage.get(LS_BEHAVIOR) || "local");
  }
  const sim = simRef.current;

  const [snap, setSnap] = useState(() => sim.snapshot());
  const [simOnline, setSimOnline] = useState(true);
  const [hostState, setHostState] = useState(null);
  const [browserOnline, setBrowserOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => sim.subscribe(setSnap), [sim]);
  useEffect(() => { sim.setSchedules(schedulesQ.items.filter((s) => s.pondId)); }, [sim, schedulesQ.items]);

  // Estado del anfitrión en tiempo real (visible para todos los roles).
  useEffect(() => {
    if (!logged) return undefined;
    return onSnapshot(doc(db, "simulatorState", "main"), (s) => setHostState(s.exists() ? s.data() : null), () => setHostState(null));
  }, [logged]);

  useEffect(() => {
    const on = () => setBrowserOnline(true), off = () => setBrowserOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  useEffect(() => { sim.setOnline(simOnline && browserOnline).catch(() => {}); }, [sim, simOnline, browserOnline]);

  // Reloj del motor.
  useEffect(() => {
    if (!snap.enabled) return undefined;
    const t = setInterval(() => sim.tick().catch(() => {}), 1000);
    return () => clearInterval(t);
  }, [sim, snap.enabled]);

  const start = useCallback(() => { if (!canControl) return; storage.set(LS_ENABLED, "1"); sim.start(); }, [sim, canControl]);
  const stop = useCallback(() => { storage.set(LS_ENABLED, "0"); sim.stop(); }, [sim]);
  // Por defecto el simulador queda activo; solo se detiene si el usuario lo pide.
  useEffect(() => { if (canControl && storage.get(LS_ENABLED) !== "0") sim.start(); if (!logged) sim.stop(); }, [sim, canControl, logged]);

  const runNow = useCallback((schedule) => (canControl ? sim.runNow(schedule) : Promise.resolve({ started: false, reason: "forbidden" })), [sim, canControl]);
  const setBehavior = useCallback((b) => { storage.set(LS_BEHAVIOR, b); sim.setBehavior(b); }, [sim]);
  const setSpeed = useCallback((s) => sim.setSpeed(s), [sim]);

  // Avisos en pantalla cuando CUALQUIER equipo ejecuta (o se omite) una alimentación.
  const seen = useRef(null);
  useEffect(() => {
    if (eventsQ.loading) return;
    if (seen.current === null) { seen.current = new Set(eventsQ.items.map((e) => e.id)); return; }
    for (const e of eventsQ.items) {
      if (seen.current.has(e.id)) continue;
      seen.current.add(e.id);
      if (e.simulated) continue;
      const where = pondName(e.pondId);
      if (e.status === "running") toast({ tone: "ok", icon: "restaurant", title: "Alimentación automática en marcha", message: `${where}: se están dispensando ${e.doseKg} kg.`, key: `feed-${e.id}`, duration: 7000 });
      else if (e.status === "skipped") toast({ tone: "warn", title: "Se omitió una alimentación", message: `${where}: ${e.reason || "condición de seguridad"}.`, key: `skip-${e.id}`, steps: [{ icon: "visibility", text: "Revise el estanque" }, { icon: "call", text: "Avise al supervisor si es necesario" }] });
    }
  }, [eventsQ.items, eventsQ.loading, toast]);

  const value = useMemo(
    () => ({ snap, events: eventsQ.items, eventsLoading: eventsQ.loading, hostState, simOnline, setSimOnline, browserOnline, canControl, isHost: snap.enabled, start, stop, runNow, setBehavior, setSpeed, schedules: schedulesQ.items, schedulesDemo: schedulesQ.isDemo }),
    [snap, eventsQ.items, eventsQ.loading, hostState, simOnline, browserOnline, canControl, start, stop, runNow, setBehavior, setSpeed, schedulesQ.items, schedulesQ.isDemo]
  );
  return <SimulatorContext.Provider value={value}>{children}</SimulatorContext.Provider>;
}

export function useSimulator() {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error("useSimulator debe usarse dentro de <SimulatorProvider>");
  return ctx;
}
