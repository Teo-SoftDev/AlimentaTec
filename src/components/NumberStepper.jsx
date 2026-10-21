import React from "react";

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

// Control numérico con límites duros (min/max) — evita negativos/desbordes en cliente.
// Modo nuevo: value/onChange/min/max/step/decimals/unit. (Modo legado: onIncrement/onDecrement/formattedValue.)
export default function NumberStepper({ value, onChange, min = 0, max = Infinity, step = 1, decimals = 0, unit = "", editable = false, disabled = false, ariaLabel, onDecrement, onIncrement, formattedValue }) {
  const legacy = onChange === undefined;
  const clamp = (v) => (Number.isFinite(v) ? Math.min(max, Math.max(min, round(v, decimals))) : min);
  const dec = () => (legacy ? onDecrement?.() : onChange(clamp(value - step)));
  const inc = () => (legacy ? onIncrement?.() : onChange(clamp(value + step)));
  const display = formattedValue ?? `${Number(value).toFixed(decimals)}${unit ? " " + unit : ""}`;
  const btn = "w-10 h-10 border border-outline-variant rounded bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-2" role="group" aria-label={ariaLabel}>
      <button type="button" onClick={dec} disabled={disabled || (!legacy && value <= min)} className={btn} aria-label="Disminuir">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">remove</span>
      </button>
      {editable && !legacy ? (
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={Number.isFinite(max) ? max : undefined}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value === "" ? NaN : parseFloat(e.target.value))}
          onBlur={() => onChange(clamp(value))}
          className="flex-1 min-w-0 h-10 border border-outline-variant rounded bg-white text-center font-mono font-bold text-label-lg focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
      ) : (
        <output aria-live="polite" className="flex-1 h-10 border border-outline-variant rounded bg-white flex items-center justify-center font-mono font-bold text-label-lg">
          {display}
        </output>
      )}
      <button type="button" onClick={inc} disabled={disabled || (!legacy && value >= max)} className={btn} aria-label="Aumentar">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
      </button>
    </div>
  );
}
