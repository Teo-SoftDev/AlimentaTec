import React, { useEffect, useId, useRef } from "react";

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

// Modal accesible: role=dialog, aria-modal, foco atrapado, ESC, restaura foco.
export default function Modal({ open, title, onClose, children, size = "md", persistent = false }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const el = ref.current;
    const focusables = () => el?.querySelectorAll('input,select,textarea,button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])') || [];
    (focusables()[0] || el)?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !persistent) onClose?.();
      if (e.key === "Tab") {
        const f = Array.from(focusables());
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && !persistent && onClose?.()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`w-full ${SIZES[size]} max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container-high outline-none`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-container-high">
          <h2 id={titleId} className="text-headline-sm font-headline-sm text-on-surface">{title}</h2>
          {!persistent && (
            <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 rounded text-secondary hover:bg-surface-container">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          )}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
