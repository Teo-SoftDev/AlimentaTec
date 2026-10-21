import React, { useState } from "react";

// Gráfica SVG interactiva (hover/teclado). series: [{name,color,values,dashed,fmt}]
export default function LineChart({ labels, series, height = 220, ariaLabel, yFormat = (v) => v.toFixed(1), area = true }) {
  const W = 700, H = height;
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const [hover, setHover] = useState(null);
  const n = labels.length;
  const all = series.flatMap((s) => s.values.filter((v) => Number.isFinite(v)));
  let min = all.length ? Math.min(...all) : 0;
  let max = all.length ? Math.max(...all) : 1;
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  min -= span * 0.08; max += span * 0.08;
  const x = (i) => pad.l + (n <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const path = (vals) => {
    let d = "", pen = false;
    vals.forEach((v, i) => {
      if (!Number.isFinite(v)) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  const labelIdx = n <= 6 ? labels.map((_, i) => i) : [0, 1, 2, 3, 4, 5].map((i) => Math.round((i * (n - 1)) / 5));

  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((rel - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const key = (e) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    if (e.key === "Escape") setHover(null);
  };

  if (!n) return <div className="text-sm text-secondary p-4">Sin datos para graficar.</div>;
  const first = series[0];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label={ariaLabel} tabIndex={0} onMouseMove={move} onMouseLeave={() => setHover(null)} onKeyDown={key} onBlur={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e6e8ea" strokeDasharray="4 4" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#545f73">{yFormat(t)}</text>
          </g>
        ))}
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#545f73">{labels[i]}</text>
        ))}
        {area && first && n > 1 && (
          <path d={`${path(first.values)} L${x(n - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`} fill={first.color} opacity="0.1" />
        )}
        {series.map((s) => (
          <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "6 4" : undefined} />
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#6f797a" strokeDasharray="3 3" />
            {series.map((s) => Number.isFinite(s.values[hover]) && <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r="4" fill="#fff" stroke={s.color} strokeWidth="2" />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="absolute top-2 pointer-events-none bg-inverse-surface text-inverse-on-surface text-label-sm font-label-sm rounded px-2 py-1.5 shadow-lg" style={{ left: `${Math.min(75, (x(hover) / W) * 100)}%` }}>
          <div className="font-semibold mb-0.5">{labels[hover]}</div>
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }}></span>
              {s.name}: {Number.isFinite(s.values[hover]) ? (s.fmt ? s.fmt(s.values[hover]) : yFormat(s.values[hover])) : "—"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
