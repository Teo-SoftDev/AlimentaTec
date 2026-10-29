// src/simulator/runtime.js — Motor del simulador de alimentación programada.
// · Evalúa periódicamente los horarios (tick) con un reloj virtual (velocidad x1/x60/x720).
// · Cada ocurrencia tiene un ID determinista: nunca se ejecuta dos veces (ni entre pestañas ni tras reconectar).
// · Modo offline: "local" (la tolva ejecuta con su reloj interno y sincroniza luego) o "defer"
//   (se encolan y se ejecutan en cascada al volver la red). Sin duplicar porciones.
// · Todo acceso externo pasa por `io` (Firestore, auditoría, almacenamiento) → 100 % testeable.
import { decideDose, occurrencesBetween, nextOccurrence } from "./occurrences.js";

const DEFAULTS = { catchUpMs: 6 * 3600_000, cascadeGapMs: 2000, runMsMax: 12_000, runMsMin: 1500, lateMs: 120_000, heartbeatMs: 4000, seenMax: 500 };

export class FeedingSimulator {
  constructor({ io, now = Date.now, config = {} }) {
    this.io = io;
    this.now = now;
    this.cfg = { ...DEFAULTS, ...config };
    this.enabled = false;
    this.online = true;
    this.behavior = "local"; // 'local' | 'defer'
    this.speed = 1;
    this.base = now();
    this.vBase = this.base;
    this.schedules = [];
    this.lastTickMs = null;
    this.queue = [];
    this.deferred = [];
    this.outbox = this._load("outbox", []);
    this.seen = new Set(this._load("seen", []));
    this.running = [];
    this.recent = [];
    this.stats = { executed: 0, skipped: 0, late: 0, duplicatesAvoided: 0, synced: 0 };
    this.draining = false;
    this.lastBeat = 0;
    this.listeners = new Set();
  }

  /* ---------- reloj virtual ---------- */
  vnow() { return this.vBase + (this.now() - this.base) * this.speed; }
  setSpeed(s) {
    const v = s === 1 ? this.now() : this.vnow();
    this.base = this.now();
    this.vBase = v;
    this.speed = s;
    this.lastTickMs = v;
    this._emit();
  }
  get prefix() { return this.speed > 1 ? "x" : ""; }

  /* ---------- persistencia ligera ---------- */
  _load(k, d) { try { return JSON.parse(this.io.storage.get(`at_sim_${k}`)) ?? d; } catch { return d; } }
  _save(k, v) { try { this.io.storage.set(`at_sim_${k}`, JSON.stringify(v)); } catch { /* ignorar */ } }
  _persistSeen() { this._save("seen", [...this.seen].slice(-this.cfg.seenMax)); }

  /* ---------- observadores ---------- */
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { const s = this.snapshot(); this.listeners.forEach((fn) => fn(s)); }
  snapshot() {
    return {
      enabled: this.enabled, online: this.online, behavior: this.behavior, speed: this.speed,
      running: this.running.map((r) => ({ ...r })), outbox: this.outbox.length, deferred: this.deferred.length,
      queued: this.queue.length, stats: { ...this.stats }, recent: [...this.recent], lastTickMs: this.lastTickMs,
      next: nextOccurrence(this.schedules, this.vnow()), virtualNow: this.vnow(),
    };
  }

  setSchedules(list) { this.schedules = list || []; this._emit(); }
  setBehavior(b) { this.behavior = b === "defer" ? "defer" : "local"; this._emit(); }

  /* ---------- ciclo de vida ---------- */
  start() {
    if (this.enabled) return;
    this.enabled = true;
    const now = this.vnow();
    const persisted = this.speed === 1 ? Number(this._load("last_tick", 0)) : 0;
    // Recuperación: si la app estuvo cerrada, se ejecutan en cascada las ocurrencias perdidas (ventana acotada).
    this.lastTickMs = persisted > 0 ? Math.max(persisted, now - this.cfg.catchUpMs) : now;
    this._emit();
  }
  stop() { this.enabled = false; this._beat(true); this._emit(); }

  async setOnline(flag) {
    if (flag === this.online) return;
    this.online = flag;
    this._emit();
    if (!flag) { this._enqueueAudit("sim_offline", "simulador", { comportamiento: this.behavior }, "warning"); return; }
    const pending = this.outbox.length;
    await this.flush();
    const moved = this.deferred.length;
    this.queue.push(...this.deferred.splice(0));
    this._enqueueAudit("sim_online", "simulador", { pendientes: pending, diferidas: moved });
    await this.flush();
    await this.drain();
    if (pending || moved) await this._audit("sim_sync", "simulador", { eventosSincronizados: pending, ejecutadasEnCascada: moved, duplicadosEvitados: this.stats.duplicatesAvoided });
    this._emit();
  }

  /* ---------- tick ---------- */
  async tick() {
    if (!this.enabled) return;
    const now = this.vnow();
    const due = occurrencesBetween(this.schedules, this.lastTickMs, now, { prefix: this.prefix });
    this.lastTickMs = now;
    if (this.speed === 1) this._save("last_tick", now);
    for (const occ of due) {
      if (this.seen.has(occ.id)) { this.stats.duplicatesAvoided++; continue; }
      this.seen.add(occ.id);
      (!this.online && this.behavior === "defer" ? this.deferred : this.queue).push(occ);
    }
    if (due.length) this._persistSeen();
    await this.drain();
    if (this.online) await this.flush();
    await this._beat(false);
    this._emit();
  }

  /** Ejecuta un horario ahora mismo (prueba). Se marca como simulado y no consume el horario real del día. */
  async runNow(schedule) {
    const at = new Date(this.vnow());
    const hhmm = `${String(at.getHours()).padStart(2, "0")}${String(at.getMinutes()).padStart(2, "0")}`;
    const [occ] = occurrencesBetween([{ ...schedule, enabled: true, days: ["D", "L", "M", "X", "J", "V", "S"], time: `${hhmm.slice(0, 2)}:${hhmm.slice(2)}` }], this.vnow() - 1, this.vnow() + 61_000, { prefix: "x" });
    if (!occ) return { started: false, reason: "invalid" };
    const id = `x${schedule.id}_${occ.id.slice(occ.id.indexOf("_") + 1)}`.replace(/^xx/, "x");
    const test = { ...occ, id, scheduleName: schedule.name, atMs: this.vnow(), test: true };
    if (this.seen.has(id) || this.running.some((r) => r.id === id)) return { started: false, reason: "duplicate" };
    this.seen.add(id);
    this._persistSeen();
    this.queue.push(test);
    this.drain().then(() => this._emit());
    return { started: true, id };
  }

  /* ---------- ejecución en cascada ---------- */
  async drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length) {
        const occ = this.queue.shift();
        await this._execute(occ);
        if (this.queue.length) await this.io.sleep(this.cfg.cascadeGapMs);
      }
    } finally { this.draining = false; }
  }

  async _execute(occ) {
    if (this.online) {
      try { if (await this.io.eventExists(occ.id)) { this.stats.duplicatesAvoided++; return; } } catch { /* seguir: el create idempotente decide */ }
    }
    const delay = this.vnow() - occ.atMs;
    const late = delay > this.cfg.lateMs * Math.max(1, this.speed > 1 ? this.speed / 4 : 1);
    const offlineExec = !this.online;
    const dec = decideDose(occ, this.io.getReadings(occ.pondId));
    const base = {
      occurrenceId: occ.id, scheduleId: occ.scheduleId, scheduleName: occ.scheduleName, pondId: occ.pondId,
      plannedKg: occ.doseKg, doseKg: dec.dose, durationSec: occ.durationSec, mechanism: occ.mechanism,
      late, delayMin: Math.max(0, Math.round(delay / 60000)), scheduledAtMs: occ.atMs, executedAtMs: Math.round(this.vnow()),
      simulated: this.speed > 1 || !!occ.test, offlineExecuted: offlineExec, reason: dec.reason || "",
    };
    if (late) this.stats.late++;

    if (dec.action === "skip") {
      const ev = { ...base, status: "skipped", progress: 0 };
      this.stats.skipped++;
      this._remember(ev);
      await this._send({ kind: "create", event: ev });
      await this._send({ kind: "audit", type: "scheduled_skipped", target: occ.scheduleName, severity: "warning", details: { pond: occ.pondId, motivo: dec.reason, programadoKg: occ.doseKg } });
      return;
    }

    const ev = { ...base, status: "running", progress: 0 };
    const run = { id: occ.id, pondId: occ.pondId, name: occ.scheduleName, doseKg: dec.dose, progress: 0, offline: offlineExec, late };
    this.running.push(run);
    await this._send({ kind: "create", event: ev });
    this._emit();
    await this._beat(true);
    const runMs = Math.max(this.cfg.runMsMin, Math.min(this.cfg.runMsMax, (occ.durationSec * 1000) / (this.speed > 1 ? Math.min(this.speed, 10) : 1)));
    for (const pct of [25, 50, 75, 100]) {
      await this.io.sleep(runMs / 4);
      run.progress = pct;
      this._emit();
      if (pct === 50) await this._send({ kind: "update", id: occ.id, patch: { progress: 50 } });
    }
    this.running = this.running.filter((r) => r.id !== occ.id);
    const done = { ...ev, status: "completed", progress: 100, finishedAtMs: Math.round(this.vnow()) };
    this.stats.executed++;
    this._remember(done);
    await this._send({ kind: "update", id: occ.id, patch: { status: "completed", progress: 100, finishedAtMs: done.finishedAtMs } });
    await this._send({ kind: "audit", type: "scheduled_feeding", target: occ.scheduleName, severity: "info", details: { pond: occ.pondId, programadoKg: occ.doseKg, dosisKg: dec.dose, retrasoMin: base.delayMin, tardio: late, sinConexion: offlineExec, nota: dec.reason } });
    await this._beat(true);
    this._emit();
  }

  _remember(ev) { this.recent = [ev, ...this.recent.filter((e) => e.occurrenceId !== ev.occurrenceId)].slice(0, 25); }

  /* ---------- salida (Firestore) con cola offline ---------- */
  _enqueueAudit(type, target, details, severity = "info") {
    this._send({ kind: "audit", type, target, details, severity }).catch(() => {});
  }
  _audit(type, target, details, severity = "info") { return this._send({ kind: "audit", type, target, details, severity }); }

  async _apply(op) {
    if (op.kind === "create") return (await this.io.createEvent(op.event)) === "exists" ? "exists" : "ok";
    if (op.kind === "update") { await this.io.updateEvent(op.id, op.patch); return "ok"; }
    await this.io.audit(op.type, op.target, op.details, op.severity);
    return "ok";
  }

  async _send(op) {
    if (!this.online) { this.outbox.push(op); this._save("outbox", this.outbox); return; }
    try {
      if ((await this._apply(op)) === "exists") this.stats.duplicatesAvoided++;
    } catch (e) {
      if (e?.code === "permission-denied" && op.kind === "update") return; // otro host ya cerró este evento
      this.outbox.push(op);
      this._save("outbox", this.outbox);
    }
  }

  async flush() {
    if (!this.online) return 0;
    let sent = 0;
    while (this.outbox.length) {
      try {
        const r = await this._apply(this.outbox[0]);
        if (r === "exists") this.stats.duplicatesAvoided++;
      } catch (e) {
        if (!(e?.code === "permission-denied" && this.outbox[0].kind === "update")) break; // sin red real: reintentar luego
      }
      this.outbox.shift();
      sent++;
    }
    this.stats.synced += sent;
    this._save("outbox", this.outbox);
    return sent;
  }

  async _beat(force) {
    const t = this.now();
    if (!this.online || (!force && t - this.lastBeat < this.cfg.heartbeatMs)) return;
    this.lastBeat = t;
    try {
      await this.io.writeState({ enabled: this.enabled, online: this.online, speed: this.speed, behavior: this.behavior, running: this.running.map((r) => ({ id: r.id, pondId: r.pondId, name: r.name, doseKg: r.doseKg })), pendingOutbox: this.outbox.length, lastBeatMs: t });
    } catch { /* el próximo latido reintenta */ }
  }
}
