import React, { useState } from "react";

export default function ToggleSwitch({ defaultChecked = true, label, onChange }) {
  const [checked, setChecked] = useState(defaultChecked);

  function handleChange(e) {
    setChecked(e.target.checked);
    onChange?.(e.target.checked);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="sr-only switch-checkbox"
        />
        <div className="w-9 h-5 bg-outline-variant rounded-full switch-track transition-colors relative">
          <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 switch-thumb transition-transform shadow-sm"></div>
        </div>
      </label>
      {label && <span className="text-label-sm font-label-sm text-on-surface">{label}</span>}
    </div>
  );
}
