import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { Banner, btnOutline, btnPrimary, inputCls } from "./ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { friendlyError } from "../utils/errors.js";

const LOCK_KEY = "at_pin_lock";
const MAX_TRIES = 3;

// A04: doble paso (PIN de 6 dígitos) para acciones de alto impacto.
export default function PinDialog({ open, reason, onVerified, onCancel }) {
  const { hasPin, setPin, verifyPin } = useAuth();
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    setPinValue(""); setConfirm(""); setError(""); setTries(0);
    setLockedUntil(+sessionStorage.getItem(LOCK_KEY) || 0);
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const locked = lockedUntil > now;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(pin)) return setError("El PIN debe tener exactamente 6 dígitos.");
    setBusy(true);
    try {
      if (!hasPin) {
        if (pin !== confirm) return setError("Los PIN no coinciden.");
        await setPin(pin);
        onVerified();
      } else if (await verifyPin(pin)) {
        sessionStorage.removeItem(LOCK_KEY);
        onVerified();
      } else {
        const n = tries + 1;
        setTries(n);
        setPinValue("");
        if (n >= MAX_TRIES) {
          const until = Date.now() + 60_000;
          sessionStorage.setItem(LOCK_KEY, String(until));
          setLockedUntil(until);
          setError("Demasiados intentos. Verificación bloqueada por 60 s.");
        } else setError(`PIN incorrecto. Intentos restantes: ${MAX_TRIES - n}.`);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={hasPin ? "Confirmación con PIN de seguridad" : "Cree su PIN de seguridad"} onClose={onCancel} size="sm">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-secondary">
          {hasPin ? reason || "Esta acción requiere un segundo paso de verificación." : "Para autorizar acciones de alto impacto cree un PIN de 6 dígitos. Se guarda cifrado (PBKDF2), nunca en texto plano."}
        </p>
        {error && <Banner tone="error">{error}</Banner>}
        {locked && <Banner tone="warn">Bloqueado. Reintente en {Math.ceil((lockedUntil - now) / 1000)} s.</Banner>}
        <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} aria-label="PIN de 6 dígitos" placeholder="••••••" className={`${inputCls} text-center tracking-[0.5em] font-mono`} value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))} disabled={locked || busy} />
        {!hasPin && (
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} aria-label="Confirmar PIN" placeholder="Confirmar PIN" className={`${inputCls} text-center tracking-[0.5em] font-mono`} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} disabled={busy} />
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnOutline} onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="submit" className={btnPrimary} disabled={locked || busy}>{hasPin ? "Verificar" : "Guardar PIN"}</button>
        </div>
      </form>
    </Modal>
  );
}
