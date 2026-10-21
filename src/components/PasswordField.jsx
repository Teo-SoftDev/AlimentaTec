import React, { useState } from "react";
import { PASSWORD_RULES, getPasswordStrength } from "../utils/validation.js";

// A07: campo de contraseña con mostrar/ocultar y, opcionalmente, política visible.
export default function PasswordField({ id, label, value, onChange, placeholder = "••••••••••••", autoComplete = "current-password", extra = null, showPolicy = false, error }) {
  const [visible, setVisible] = useState(false);
  const strength = getPasswordStrength(value);
  const bar = strength <= 2 ? "bg-error" : strength <= 4 ? "bg-amber-500" : "bg-success";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm text-on-surface font-semibold" htmlFor={id}>{label}</label>
        {extra}
      </div>
      <div className="relative rounded-lg shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
          <span className="material-symbols-outlined text-xl" aria-hidden="true">lock</span>
        </div>
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          required
          maxLength={128}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          className="w-full h-10 pl-10 pr-10 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-150"
        />
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-xl" aria-hidden="true">{visible ? "visibility_off" : "visibility"}</span>
        </button>
      </div>
      {error && <p role="alert" className="text-label-sm font-label-sm text-error">{error}</p>}
      {showPolicy && (
        <div className="pt-1 space-y-2" aria-live="polite">
          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden" aria-hidden="true">
            <div className={`h-full ${bar} transition-all`} style={{ width: `${(strength / PASSWORD_RULES.length) * 100}%` }}></div>
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {PASSWORD_RULES.map((r) => {
              const ok = r.test(value || "");
              return (
                <li key={r.id} className={`text-label-sm font-label-sm flex items-center gap-1 ${ok ? "text-success" : "text-secondary"}`}>
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{ok ? "check_circle" : "radio_button_unchecked"}</span>
                  {r.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
