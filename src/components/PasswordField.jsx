import React, { useState } from "react";

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = "••••••••••••",
  autoComplete = "current-password",
  extra = null,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm text-on-surface font-semibold" htmlFor={id}>
          {label}
        </label>
        {extra}
      </div>
      <div className="relative rounded-lg shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
          <span className="material-symbols-outlined text-xl">lock</span>
        </div>
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full h-10 pl-10 pr-10 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-150"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-xl">
            {visible ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
    </div>
  );
}
