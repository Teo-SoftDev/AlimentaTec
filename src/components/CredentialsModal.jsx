import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { Banner, btnOutline, btnPrimary } from "./ui.jsx";

export const API_BASE = (import.meta.env?.VITE_API_BASE_URL || (typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "/api/v1")).replace(/\/+$/, "");

// Credenciales mostradas UNA sola vez (A02). En el sistema solo queda su hash SHA-256.
export default function CredentialsModal({ open, creds, title = "Credenciales del dispositivo", onClose }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState("");
  useEffect(() => { if (open) { setSaved(false); setCopied(""); } }, [open]);
  if (!creds) return null;
  const rows = [
    ["API HTTPS (sensores)", `POST ${API_BASE}/telemetry`],
    ["Cabecera X-Device-Id", creds.serial],
    ["API key (Bearer)", creds.password],
    ["Broker MQTT", "mqtts://broker.alimentatec.net:8883"],
    ["Client ID", creds.clientId],
    ["Usuario MQTT", creds.username],
    ["Tópicos permitidos", creds.topic],
  ];
  const copy = async (k, v) => { try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(""), 1500); } catch { /* ignorar */ } };
  return (
    <Modal open={open} title={title} onClose={() => saved && onClose()} persistent={!saved} size="lg">
      <div className="space-y-4">
        <Banner tone="warn" icon="key">Estas credenciales se muestran <strong>una sola vez</strong>. En el sistema solo se conserva su huella (hash); si las pierde, rótelas desde la ficha del dispositivo.</Banner>
        <dl className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <dt className="w-40 text-label-md font-label-md text-secondary shrink-0">{k}</dt>
              <dd className="flex-1 min-w-0 font-mono text-xs bg-surface-container-low border border-outline-variant rounded px-2 py-1.5 break-all">{v}</dd>
              <button type="button" className={btnOutline} onClick={() => copy(k, v)} aria-label={`Copiar ${k}`}>{copied === k ? "✓" : "Copiar"}</button>
            </div>
          ))}
        </dl>
        <p className="text-label-sm text-secondary">Prueba rápida: <code className="font-mono">node tools/sensor-simulator/simulate.mjs --url {API_BASE} --device {creds.serial} --key &lt;API key&gt;</code></p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-4 w-4 rounded text-primary" />He guardado las credenciales en un lugar seguro</label>
        <div className="flex justify-end"><button className={btnPrimary} disabled={!saved} onClick={onClose}>Finalizar</button></div>
      </div>
    </Modal>
  );
}
