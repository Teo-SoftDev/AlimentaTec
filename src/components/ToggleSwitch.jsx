import React, { useState } from "react";

// Controlado (checked/onChange) o no controlado (defaultChecked).
export default function ToggleSwitch({ checked, defaultChecked = false, onChange, label, disabled = false, id }) {
  const [inner, setInner] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const value = isControlled ? checked : inner;

  function handle(e) {
    if (!isControlled) setInner(e.target.checked);
    onChange?.(e.target.checked);
  }

  return (
    <div className="flex items-center gap-2">
      <label className={`relative inline-flex items-center ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
        <input id={id} type="checkbox" role="switch" checked={value} onChange={handle} disabled={disabled} className="sr-only switch-checkbox" aria-label={label} />
        <div className="w-9 h-5 bg-outline-variant rounded-full switch-track transition-colors relative">
          <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 switch-thumb transition-transform shadow-sm"></div>
        </div>
      </label>
      {label && <span className="text-label-sm font-label-sm text-on-surface">{label}</span>}
    </div>
  );
}
