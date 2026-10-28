import React, { useEffect, useRef, useState } from "react";

// Botón grande con confirmación de DOBLE TOQUE: el primer toque lo "arma" (cambia de color y
// texto, con cuenta atrás visual); el segundo, dentro de la ventana, ejecuta la acción.
const TONES = {
  green: { idle: "bg-green-600 hover:bg-green-700 text-white", armed: "bg-amber-400 text-black ring-4 ring-amber-600" },
  red: { idle: "bg-red-600 hover:bg-red-700 text-white", armed: "bg-amber-400 text-black ring-4 ring-amber-600" },
  blue: { idle: "bg-sky-700 hover:bg-sky-800 text-white", armed: "bg-amber-400 text-black ring-4 ring-amber-600" },
  gray: { idle: "bg-slate-700 hover:bg-slate-800 text-white", armed: "bg-amber-400 text-black ring-4 ring-amber-600" },
};

export default function TapTwiceButton({ icon, label, confirmLabel = "Toque otra vez para confirmar", tone = "green", onConfirm, disabled = false, busy = false, windowMs = 4000, hint }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const t = TONES[tone];

  function press() {
    if (disabled || busy) return;
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), windowMs);
      return;
    }
    clearTimeout(timer.current);
    setArmed(false);
    onConfirm?.();
  }

  return (
    <div className="w-full">
      <button type="button" onClick={press} disabled={disabled || busy} aria-live="polite" className={`relative overflow-hidden w-full min-h-[84px] rounded-2xl px-5 py-4 flex items-center justify-center gap-4 text-2xl font-extrabold shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-primary ${armed ? t.armed : t.idle}`}>
        <span className="material-symbols-outlined" style={{ fontSize: 44 }} aria-hidden="true">{busy ? "progress_activity" : armed ? "touch_app" : icon}</span>
        <span className="text-left leading-tight">{busy ? "Enviando…" : armed ? confirmLabel : label}</span>
        {armed && <span key="bar" className="absolute left-0 bottom-0 h-1.5 bg-black/60" style={{ animation: `tapwindow ${windowMs}ms linear forwards` }}></span>}
      </button>
      {hint && !armed && <p className="text-base text-secondary mt-1.5 px-1">{hint}</p>}
    </div>
  );
}
