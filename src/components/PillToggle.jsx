import React, { useState } from "react";

export default function PillToggle({ defaultChecked = true, onChange }) {
  const [checked, setChecked] = useState(defaultChecked);

  function toggle() {
    const next = !checked;
    setChecked(next);
    onChange?.(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={toggle}
      className={`w-10 h-6 rounded-full p-1 transition-colors flex items-center focus:outline-none ${
        checked ? "bg-primary-container justify-end" : "bg-surface-container-highest justify-start"
      }`}
    >
      <span className="w-4 h-4 bg-white rounded-full block shadow-sm"></span>
    </button>
  );
}
