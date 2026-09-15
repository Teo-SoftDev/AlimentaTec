import React from "react";

export default function NumberStepper({ onDecrement, onIncrement, formattedValue }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDecrement}
        className="w-10 h-10 border border-outline-variant rounded bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[18px]">remove</span>
      </button>
      <div className="flex-1 h-10 border border-outline-variant rounded bg-white flex items-center justify-center font-mono font-bold text-label-lg">
        {formattedValue}
      </div>
      <button
        type="button"
        onClick={onIncrement}
        className="w-10 h-10 border border-outline-variant rounded bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
      </button>
    </div>
  );
}
