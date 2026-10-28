// Modal de registro seguro de dispositivos (solo Administrador).
// A02: credenciales MQTT/HTTPS aleatorias (CSPRNG), mostradas UNA sola vez; en
// Firestore solo se guarda el HASH SHA-256. A01: permiso + reglas de servidor.
// A03: serial/QR validados con Zod y allowlists. A09: alta auditada.
import React, { useEffect, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase.js";
import Modal from "../components/Modal.jsx";
import CredentialsModal from "../components/CredentialsModal.jsx";
import { Banner, Field, btnOutline, btnPrimary, inputCls } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { sha256Hex, randomToken } from "../utils/crypto.js";
import { friendlyError } from "../utils/errors.js";
import { checkRegistrationRate, formatRetry } from "../utils/rateLimiter.js";
import { DEVICE_TYPES, PROTOCOLS, deviceSchema, qrPayloadSchema, validate } from "../utils/validation.js";
import { PONDS } from "../utils/constants.js";

const EMPTY = { serial: "", name: "", type: "tolva", pondId: PONDS[0].id, protocol: "LoRaWAN", firmware: "1.0.0" };

export default function DevicesRegister({ open, onClose }) {
  const { actor, can, audit } = useAuth();
  const [tab, setTab] = useState("serial");
  const [form, setForm] = useState(EMPTY);
  const [qrText, setQrText] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function stopScan() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }
  useEffect(() => {
    if (!open) {
      stopScan();
      setTab("serial"); setForm(EMPTY); setQrText(""); setErrors({}); setError(""); setCreds(null);
    }
    return stopScan;
  }, [open]);

  async function startScan() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      await new Promise((r) => setTimeout(r, 50));
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const loop = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) { setQrText(codes[0].rawValue.slice(0, 512)); stopScan(); return; }
        } catch { /* seguir intentando */ }
        setTimeout(loop, 300);
      };
      loop();
    } catch {
      stopScan();
      setError("No se pudo acceder a la cámara. Pegue el contenido del código QR manualmente.");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError(""); setErrors({});
    if (!can("devices:write")) return setError("Solo un Administrador puede registrar dispositivos.");

    let data = { ...form };
    if (tab === "qr") {
      const raw = qrText.trim();
      if (!raw || raw.length > 512) return setError("Contenido del QR vacío o demasiado largo.");
      let serial = raw;
      if (raw.startsWith("{")) {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { return setError("El código QR no tiene un formato válido."); }
        const q = qrPayloadSchema.safeParse(parsed);
        if (!q.success) return setError("El código QR no corresponde a un aprovisionamiento válido.");
        serial = q.data.serial;
        data = { ...data, type: q.data.type || data.type, firmware: q.data.fw || data.firmware };
      }
      data.serial = serial;
    }

    const v = validate(deviceSchema, data);
    if (!v.ok) return setErrors(v.errors);
    const a = actor();
    const rate = checkRegistrationRate(a.uid);
    if (!rate.allowed) return setError(`Demasiados registros seguidos. Reintente en ${formatRetry(rate.retryAfterMs)}.`);

    setBusy(true);
    try {
      const d = v.data;
      const ref = doc(db, "devices", d.serial);
      if ((await getDoc(ref)).exists()) return setError("Ya existe un dispositivo con ese serial.");

      const password = randomToken(32);
      const clientId = `at-${randomToken(6)}`;
      const username = `dev_${d.serial.toLowerCase()}`;
      const batch = writeBatch(db);
      batch.set(ref, {
        serial: d.serial, name: d.name, type: d.type, pondId: d.pondId, protocol: d.protocol, firmware: d.firmware,
        status: "offline", clientId, username, createdBy: a.uid, createdAt: serverTimestamp(),
      });
      // El hash vive en una colección aparte que NINGÚN cliente puede leer (solo la API del servidor).
      batch.set(doc(db, "deviceSecrets", d.serial), { credentialHash: await sha256Hex(password), credentialAlgo: "sha256", updatedBy: a.uid, updatedAt: serverTimestamp() });
      await batch.commit();
      audit("device_add", d.serial, { tipo: d.type, pond: d.pondId, protocolo: d.protocol }, "info");
      setCreds({ serial: d.serial, clientId, username, password, topic: `alimentatec/${d.serial}/#` });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (creds) return <CredentialsModal open={open} creds={creds} title="Dispositivo registrado" onClose={onClose} />;

  return (
    <Modal open={open} title="Registrar nuevo dispositivo" onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Banner tone="error">{error}</Banner>}
        <div role="tablist" className="inline-flex bg-surface-container-low p-1 rounded border border-outline-variant">
          {[["serial", "Código serial"], ["qr", "Código QR"]].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`px-3 py-1.5 rounded text-label-md font-label-md ${tab === id ? "bg-primary text-on-primary" : "text-secondary"}`}>{label}</button>
          ))}
        </div>

        {tab === "serial" ? (
          <Field label="Serial único" htmlFor="dev-serial" error={errors.serial} hint="Formato: SN-AQ8832" required>
            <input id="dev-serial" className={`${inputCls} font-mono uppercase`} maxLength={32} value={form.serial} onChange={set("serial")} placeholder="SN-AQ8832" autoComplete="off" />
          </Field>
        ) : (
          <div className="space-y-2">
            {scanning && <video ref={videoRef} muted playsInline className="w-full max-h-56 rounded border border-outline-variant bg-black" />}
            <Field label="Contenido del QR de aprovisionamiento" htmlFor="dev-qr" hint='Ej.: {"v":1,"serial":"SN-AQ8832","type":"tolva","fw":"2.4.11"}' required>
              <textarea id="dev-qr" rows={3} maxLength={512} className="w-full p-2 border border-outline-variant rounded font-mono text-xs focus:border-primary focus:ring-1 focus:ring-primary" value={qrText} onChange={(e) => setQrText(e.target.value)} />
            </Field>
            {canScan && <button type="button" className={btnOutline} onClick={scanning ? stopScan : startScan}><span className="material-symbols-outlined text-base" aria-hidden="true">qr_code_scanner</span>{scanning ? "Detener cámara" : "Escanear con la cámara"}</button>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre" htmlFor="dev-name" error={errors.name} required><input id="dev-name" className={inputCls} maxLength={60} value={form.name} onChange={set("name")} placeholder="AquaFeed Pro-10" /></Field>
          <Field label="Estanque" htmlFor="dev-pond" error={errors.pondId}><select id="dev-pond" className={inputCls} value={form.pondId} onChange={set("pondId")}>{PONDS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Tipo" htmlFor="dev-type" error={errors.type}><select id="dev-type" className={inputCls} value={form.type} onChange={set("type")}>{DEVICE_TYPES.map((t) => <option key={t} value={t}>{t === "tolva" ? "Tolva automática" : "Sensor multiparamétrico"}</option>)}</select></Field>
          <Field label="Protocolo" htmlFor="dev-proto" error={errors.protocol}><select id="dev-proto" className={inputCls} value={form.protocol} onChange={set("protocol")}>{PROTOCOLS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Versión de firmware" htmlFor="dev-fw" error={errors.firmware}><input id="dev-fw" className={`${inputCls} font-mono`} maxLength={10} value={form.firmware} onChange={set("firmware")} /></Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnOutline} onClick={onClose}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Registrando…" : "Registrar y generar credenciales"}</button>
        </div>
      </form>
    </Modal>
  );
}
