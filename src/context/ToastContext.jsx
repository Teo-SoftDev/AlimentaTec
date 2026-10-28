// src/context/ToastContext.jsx — Avisos flotantes claros: qué pasó y qué hacer (con iconos).
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { SEMAPHORE } from "../utils/plainLanguage.js";

const ToastContext = createContext(null);
const TONE = { ok: "ok", success: "ok", warn: "warn", warning: "warn", crit: "crit", error: "crit", info: "ok" };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  /** toast({ tone, title, message, steps:[{icon,text}], sticky, key }) — `key` evita avisos repetidos. */
  const toast = useCallback((t) => {
    const tone = TONE[t.tone] || "ok";
    const id = t.key || crypto.randomUUID();
    setToasts((list) => [...list.filter((x) => x.id !== id), { ...t, id, tone }].slice(-4));
    clearTimeout(timers.current.get(id));
    if (!(t.sticky ?? tone === "crit")) timers.current.set(id, setTimeout(() => dismiss(id), t.duration || 9000));
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed z-[80] inset-x-0 top-3 sm:inset-auto sm:right-4 sm:bottom-4 flex flex-col gap-3 items-center sm:items-end px-3 pointer-events-none">
        {toasts.map((t) => {
          const s = SEMAPHORE[t.tone];
          return (
            <div key={t.id} role={t.tone === "crit" ? "alert" : "status"} aria-live={t.tone === "crit" ? "assertive" : "polite"} className={`pointer-events-auto w-full max-w-md rounded-2xl border-2 shadow-xl p-4 ${s.soft}`}>
              <div className="flex items-start gap-3">
                <span className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${s.solid}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 34 }} aria-hidden="true">{t.icon || s.icon}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold leading-snug">{t.title}</p>
                  {t.message && <p className="text-base mt-0.5">{t.message}</p>}
                </div>
              </div>
              {t.steps?.length > 0 && (
                <ol className="mt-3 space-y-2">
                  {t.steps.map((st, i) => (
                    <li key={i} className="flex items-center gap-3 bg-white/80 rounded-xl px-3 py-2">
                      <span className="w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: 28 }} aria-hidden="true">{st.icon}</span>
                      <span className="text-base font-semibold">{st.text}</span>
                    </li>
                  ))}
                </ol>
              )}
              <button type="button" onClick={() => dismiss(t.id)} className="mt-3 w-full min-h-[48px] rounded-xl bg-white/90 border-2 border-current text-base font-bold active:scale-[0.99]">Entendido</button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
