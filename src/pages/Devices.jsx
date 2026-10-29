import React, { useEffect, useMemo, useState } from "react";
import { deleteDoc, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";
import AppLayout from "../components/AppLayout.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import CredentialsModal from "../components/CredentialsModal.jsx";
import { randomToken, sha256Hex } from "../utils/crypto.js";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import { Banner, Card, DemoBadge, KpiCard, PageHeader, Spinner, btnOutline, btnPrimary, inputCls } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDate, useCollection } from "../hooks/useCollection.js";
import { sendCommand } from "../services/commands.js";
import { RULES_HINT, rulesAreCurrent } from "../utils/rulesProbe.js";
import { writeAudit } from "../services/audit.js";
import { DEMO_DEVICES } from "../utils/demoData.js";
import { friendlyError } from "../utils/errors.js";
import { sanitizeText } from "../utils/sanitize.js";
import { pondName } from "../utils/constants.js";
import DevicesRegister from "./DevicesRegister.jsx";

const STATUS = {
  online: { label: "En línea", cls: "bg-green-50 border-green-200 text-green-800", dot: "bg-green-600" },
  offline: { label: "Sin conexión", cls: "bg-surface-container border-surface-container-high text-secondary", dot: "bg-secondary" },
  revoked: { label: "Revocado", cls: "bg-error-container border-error/20 text-on-error-container", dot: "bg-error" },
};
const rssiLabel = (r) => (r == null ? "—" : r > -70 ? "Excelente" : r > -85 ? "Buena" : "Débil");
const ago = (d) => {
  if (!d) return "—";
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  return m < 1 ? "hace segundos" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
};

export default function Devices() {
  const { actor, can } = useAuth();
  const { items, loading, error, isDemo } = useCollection("devices", { orderByField: "name", limitN: 300, fallback: DEMO_DEVICES });
  const [typeTab, setTypeTab] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [search, setSearch] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // {kind, device}
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [autoState, setAutoState] = useState({});
  const [newCreds, setNewCreds] = useState(null);
  const [rulesOk, setRulesOk] = useState(true);
  useEffect(() => { if (can("devices:write")) rulesAreCurrent().then(setRulesOk); }, [can]);

  const list = useMemo(() => {
    const q = sanitizeText(search).toLowerCase();
    return items.filter((d) => (typeTab === "all" || d.type === typeTab) && (statusF === "all" || d.status === statusF) && (!q || `${d.name} ${d.serial} ${d.pondId}`.toLowerCase().includes(q)));
  }, [items, typeTab, statusF, search]);

  const active = items.filter((d) => d.status !== "revoked");
  const lowHopper = items.filter((d) => d.type === "tolva" && d.hopperPct != null && d.hopperPct < 20).length;

  const flash = (tone, text) => setNotice({ tone, text });

  async function toggleAuto(d, enabled) {
    setAutoState((s) => ({ ...s, [d.id]: enabled }));
    try {
      await sendCommand({ actor: actor(), command: { type: "toggle_auto", deviceId: d.serial, pondId: d.pondId, enabled } });
    } catch (e) {
      setAutoState((s) => ({ ...s, [d.id]: !enabled }));
      flash("error", friendlyError(e));
    }
  }

  async function runConfirm() {
    const { kind, device: d } = confirm;
    setBusy(true);
    try {
      if (kind === "test") {
        await sendCommand({ actor: actor(), command: { type: "dispense_test", deviceId: d.serial, pondId: d.pondId, amountG: 250, rations: 1 } });
        flash("success", `Prueba de 250 g enviada a ${d.name}.`);
      } else if (kind === "revoke") {
        const b = writeBatch(db);
        b.update(doc(db, "devices", d.id), { status: "revoked", revokedAt: serverTimestamp(), revokedBy: actor().uid });
        b.set(doc(db, "deviceSecrets", d.id), { credentialHash: "", credentialAlgo: "sha256", updatedBy: actor().uid, updatedAt: serverTimestamp() });
        await b.commit();
        writeAudit({ actor: actor(), type: "device_revoke", target: d.serial, severity: "warning", details: { pond: d.pondId } });
        flash("success", `Dispositivo ${d.serial} revocado: sus credenciales ya no son válidas.`);
      } else if (kind === "rotate") {
        const password = randomToken(32);
        const b = writeBatch(db);
        b.set(doc(db, "deviceSecrets", d.id), { credentialHash: await sha256Hex(password), credentialAlgo: "sha256", updatedBy: actor().uid, updatedAt: serverTimestamp() });
        b.update(doc(db, "devices", d.id), { rotatedAt: serverTimestamp(), rotatedBy: actor().uid });
        await b.commit();
        writeAudit({ actor: actor(), type: "device_credentials_rotated", target: d.serial, severity: "warning", details: { pond: d.pondId } });
        setNewCreds({ serial: d.serial, clientId: d.clientId || "—", username: d.username || `dev_${d.serial.toLowerCase()}`, password, topic: `alimentatec/${d.serial}/#` });
        flash("success", `Credenciales de ${d.serial} rotadas: la clave anterior ya no funciona.`);
      } else if (kind === "delete") {
        await deleteDoc(doc(db, "devices", d.id));
        writeAudit({ actor: actor(), type: "device_delete", target: d.serial, severity: "warning", details: { pond: d.pondId } });
        flash("success", `Dispositivo ${d.serial} eliminado.`);
      }
    } catch (e) {
      flash("error", friendlyError(e));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const confirmCfg = {
    test: { title: "Enviar prueba de dispensación", msg: (d) => `Se dispensarán 250 g en ${d?.name}. Quedará registrado en la auditoría.`, label: "Enviar prueba", danger: false },
    rotate: { title: "Rotar credenciales", msg: (d) => `Se generará una clave nueva para ${d?.name}. La clave actual dejará de funcionar de inmediato y el equipo deberá reconfigurarse.`, label: "Rotar clave", danger: true },
    revoke: { title: "Revocar dispositivo", msg: (d) => `${d?.name} perderá el acceso al broker de inmediato. Para reutilizarlo deberá registrarlo de nuevo.`, label: "Revocar", danger: true },
    delete: { title: "Eliminar dispositivo", msg: (d) => `Se eliminará ${d?.name} de forma permanente.`, label: "Eliminar", danger: true },
  }[confirm?.kind] || {};

  return (
    <AppLayout active="dispositivos" searchPlaceholder="Buscar en el historial…">
      <PageHeader
        eyebrow={<><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">hub</span> Red IoT distribuida</span><DemoBadge show={isDemo} /></>}
        title="Gestión de Dispositivos y Dispensadores IoT"
        subtitle="Alta, estado, baja y control de tolvas automáticas y sensores multiparamétricos."
        actions={can("devices:write") ? <button className={btnPrimary} onClick={() => setRegisterOpen(true)}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">add_circle</span>Registrar dispositivo</button> : <span className="text-label-sm font-label-sm text-secondary">Solo un Administrador puede registrar dispositivos</span>}
      />
      {!rulesOk && <Banner tone="error" icon="gpp_maybe"><strong>No podrá registrar dispositivos todavía.</strong> {RULES_HINT}</Banner>}
      {error && <Banner tone="warn">{error}</Banner>}
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      {isDemo && <Banner tone="info" icon="science">Mostrando dispositivos de demostración. Registre un dispositivo real y esta lista pasará a mostrar solo los suyos.</Banner>}

      <section aria-label="Resumen" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total dispositivos" icon="devices" value={items.length} unit="unidades" barPct={100} />
        <KpiCard label="En línea" icon="wifi" value={`${items.filter((d) => d.status === "online").length}/${active.length}`} unit="activos" barPct={active.length ? (items.filter((d) => d.status === "online").length / active.length) * 100 : 0} barClass="bg-primary-container" />
        <KpiCard label="Nivel de tolva bajo" icon="warning" iconClass="text-amber-600" value={lowHopper} unit="tolva(s) < 20%" valueClass={lowHopper ? "text-amber-700" : "text-on-surface"} barPct={lowHopper ? 30 : 0} barClass="bg-amber-500" />
        <KpiCard label="Revocados" icon="block" iconClass="text-error" value={items.filter((d) => d.status === "revoked").length} unit="dispositivos" barPct={0} />
      </section>

      <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex items-center bg-surface-container p-1 rounded">
          {[["all", "Todos"], ["tolva", "Tolvas"], ["sensor", "Sensores"]].map(([id, l]) => (
            <button key={id} role="tab" aria-selected={typeTab === id} onClick={() => setTypeTab(id)} className={`px-3 py-1.5 rounded text-label-md font-label-md ${typeTab === id ? "bg-white text-primary shadow-sm font-semibold" : "text-secondary hover:text-on-surface"}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input aria-label="Buscar dispositivo" maxLength={60} className={`${inputCls} w-52`} placeholder="Buscar nombre / serial…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select aria-label="Filtrar por estado" className={`${inputCls} w-40`} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="all">Estado: todos</option><option value="online">En línea</option><option value="offline">Sin conexión</option><option value="revoked">Revocados</option>
          </select>
        </div>
      </Card>

      {loading ? <Spinner /> : (
        <section aria-label="Lista de dispositivos" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {list.length === 0 && <p className="text-sm text-secondary">No hay dispositivos que coincidan con el filtro.</p>}
          {list.map((d) => {
            const st = STATUS[d.status] || STATUS.offline;
            const auto = autoState[d.id] ?? d.autoFeeding ?? false;
            const hop = d.hopperPct;
            const hopLow = hop != null && hop < 20;
            const revoked = d.status === "revoked";
            return (
              <Card key={d.id} as="article" className={`flex flex-col overflow-hidden ${revoked ? "opacity-75" : ""} ${hopLow ? "border-red-200" : ""}`}>
                <div className="p-5 border-b border-surface-container flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary border border-surface-container-high"><span className="material-symbols-outlined" aria-hidden="true">{d.type === "sensor" ? "sensors" : "water_ph"}</span></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><h3 className="text-headline-sm font-headline-sm text-on-surface truncate">{d.name}</h3><span className="text-label-sm font-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary font-mono">{d.serial}</span></div>
                      <p className="text-label-sm font-label-sm text-secondary">{pondName(d.pondId)} • {d.protocol} • FW {d.firmware}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-label-sm font-label-sm shrink-0 ${st.cls}`}><span className={`w-2 h-2 rounded-full ${st.dot}`}></span>{st.label}</span>
                </div>
                <div className="p-5 space-y-4 flex-1">
                  {d.type === "tolva" && hop != null && (
                    <div>
                      <div className="flex justify-between text-label-sm font-label-sm mb-1.5"><span className={hopLow ? "text-error font-bold" : "text-secondary"}>{hopLow ? "Nivel crítico de tolva" : "Nivel de tolva"}</span><span className="font-bold text-on-surface">{hop}%</span></div>
                      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden"><div className={`${hopLow ? "bg-error" : "bg-primary-container"} h-full rounded-full`} style={{ width: `${hop}%` }}></div></div>
                    </div>
                  )}
                  <dl className="grid grid-cols-3 gap-3 p-3 bg-surface-container-low rounded text-body-sm">
                    <div><dt className="text-label-sm font-label-sm text-secondary">Batería</dt><dd className="font-semibold">{d.battery != null ? `${d.battery}%` : "—"}</dd></div>
                    <div><dt className="text-label-sm font-label-sm text-secondary">Señal RSSI</dt><dd className="font-semibold">{d.rssi != null ? `${d.rssi} dBm` : "—"} <span className="text-secondary font-normal">({rssiLabel(d.rssi)})</span></dd></div>
                    <div><dt className="text-label-sm font-label-sm text-secondary">Última conexión</dt><dd className="font-semibold">{ago(toDate(d.lastSeen))}</dd></div>
                  </dl>
                </div>
                <div className="p-4 bg-surface-container-low border-t border-surface-container flex flex-wrap items-center justify-between gap-3">
                  {d.type === "tolva" && !revoked ? <ToggleSwitch label="Auto-alimentación" checked={auto} disabled={!can("command")} onChange={(v) => toggleAuto(d, v)} /> : <span />}
                  <div className="flex flex-wrap items-center gap-2">
                    {d.type === "tolva" && !revoked && <button className={btnOutline} disabled={!can("command")} onClick={() => setConfirm({ kind: "test", device: d })}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">scatter_plot</span>Prueba 250 g</button>}
                    {can("devices:write") && !revoked && <button className={btnOutline} disabled={d._demo} onClick={() => setConfirm({ kind: "rotate", device: d })}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">key</span>Rotar clave</button>}
                    {can("devices:revoke") && !revoked && <button className={btnOutline} disabled={d._demo} onClick={() => setConfirm({ kind: "revoke", device: d })}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">block</span>Revocar</button>}
                    {can("devices:revoke") && revoked && <button className={btnOutline} onClick={() => setConfirm({ kind: "delete", device: d })}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>Eliminar</button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      )}

      <DevicesRegister open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <CredentialsModal open={!!newCreds} creds={newCreds} title="Nuevas credenciales" onClose={() => setNewCreds(null)} />
      <ConfirmDialog open={!!confirm} busy={busy} danger={confirmCfg.danger} title={confirmCfg.title} message={confirmCfg.msg?.(confirm?.device)} confirmLabel={confirmCfg.label} onConfirm={runConfirm} onCancel={() => setConfirm(null)} />
    </AppLayout>
  );
}
