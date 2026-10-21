import React from "react";

export const inputCls =
  "w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all disabled:opacity-60 disabled:bg-surface-container-low disabled:cursor-not-allowed";

const TONES = {
  error: "border-error bg-error-container text-on-error-container",
  warn: "border-amber-300 bg-amber-50 text-amber-900",
  info: "border-outline-variant bg-surface-container-low text-on-surface",
  success: "border-success bg-success-container text-success",
};
const TONE_ICONS = { error: "error", warn: "warning", info: "info", success: "check_circle" };

export function Banner({ tone = "info", icon, children, className = "" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${TONES[tone]} ${className}`}
    >
      <span className="material-symbols-outlined text-lg shrink-0" aria-hidden="true">{icon || TONE_ICONS[tone]}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function DemoBadge({ show = true }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-container text-on-secondary-fixed text-label-sm font-label-sm">
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">science</span>
      Datos de demostración
    </span>
  );
}

export function Field({ label, htmlFor, error, hint, required, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm text-on-surface font-semibold">
          {label} {required && <span className="text-error" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-label-sm font-label-sm text-secondary">{hint}</p>}
      {error && (
        <p role="alert" className="text-label-sm font-label-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Card({ children, className = "", as: Tag = "section", ...rest }) {
  return (
    <Tag className={`bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-sm ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container-high">
      <div>
        {eyebrow && <div className="text-label-sm font-label-sm text-secondary mb-1 flex items-center gap-2 flex-wrap">{eyebrow}</div>}
        <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">{title}</h1>
        {subtitle && <p className="text-body-md font-body-md text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export function KpiCard({ label, value, unit, icon, iconClass = "text-primary", hint, barPct, barClass = "bg-primary", valueClass = "text-on-surface" }) {
  return (
    <div className="bg-surface-container-lowest p-4 rounded-lg border border-surface-container-high shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between text-secondary">
        <span className="text-label-sm font-label-sm">{label}</span>
        {icon && <span className={`material-symbols-outlined ${iconClass}`} aria-hidden="true">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-data-metric font-data-metric ${valueClass}`}>{value}</span>
        {unit && <span className="text-label-sm font-label-sm text-secondary">{unit}</span>}
      </div>
      {hint && <p className="text-body-sm font-body-sm text-secondary mt-1">{hint}</p>}
      {barPct != null && (
        <div className="mt-3 w-full bg-surface-container h-1 rounded-full overflow-hidden" aria-hidden="true">
          <div className={`${barClass} h-full rounded-full`} style={{ width: `${Math.max(0, Math.min(100, barPct))}%` }}></div>
        </div>
      )}
    </div>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-container text-on-primary hover:bg-primary rounded text-label-md font-label-md font-semibold shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
export const btnOutline =
  "inline-flex items-center justify-center gap-2 px-3 py-2 border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container rounded text-label-md font-label-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 px-4 py-2 bg-error text-on-error hover:bg-red-700 rounded text-label-md font-label-md font-semibold shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed";

export function Spinner({ label = "Cargando…" }) {
  return (
    <div className="flex items-center gap-2 text-secondary text-sm" role="status">
      <span className="material-symbols-outlined animate-spin text-lg" aria-hidden="true">progress_activity</span>
      {label}
    </div>
  );
}
