import React, { useState } from "react";

export default function PillToggle({ checked, defaultChecked = true, onChange, disabled = false, label }) {
  const [inner, setInner] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const value = isControlled ? checked : inner;

  function toggle() {
    const next = !value;
    if (!isControlled) setInner(next);
    onChange?.(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={toggle}
      className={`w-10 h-6 rounded-full p-1 transition-colors flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
        value ? "bg-primary-container justify-end" : "bg-surface-container-highest justify-start"
      }`}
    >
      <span className="w-4 h-4 bg-white rounded-full block shadow-sm"></span>
    </button>
  );
}
