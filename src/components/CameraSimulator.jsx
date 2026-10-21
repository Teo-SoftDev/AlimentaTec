import React, { useEffect, useRef } from "react";

// Simulador de cámara submarina: frames generados localmente en <canvas>
// (sin streams externos ni imágenes remotas → superficie de ataque mínima).
export default function CameraSimulator({ feeding = false, className = "" }) {
  const ref = useRef(null);
  const feedRef = useRef(feeding);
  feedRef.current = feeding;

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    const W = (c.width = 640), H = (c.height = 360);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const fish = Array.from({ length: 16 }, () => ({ x: Math.random() * W, y: 90 + Math.random() * 220, vx: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.9), s: 0.7 + Math.random() * 0.7, ph: Math.random() * 6 }));
    let pellets = [], raf, t = 0;

    function frame() {
      t += 1;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#2a8d97"); g.addColorStop(1, "#06262b");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(100 + i * 140 + Math.sin(t / 60 + i) * 10, 0); ctx.lineTo(160 + i * 140, 0); ctx.lineTo(90 + i * 140, H); ctx.lineTo(30 + i * 140, H); ctx.fill(); }
      if (feedRef.current && t % 3 === 0) pellets.push({ x: 220 + Math.random() * 200, y: 0, v: 1.2 + Math.random() });
      ctx.fillStyle = "#e9c46a";
      pellets = pellets.filter((p) => {
        p.y += p.v; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill();
        return p.y < H && !fish.some((f) => Math.hypot(f.x - p.x, f.y - p.y) < 14 * f.s);
      });
      fish.forEach((f) => {
        const target = feedRef.current && pellets.length ? pellets[0] : null;
        if (target) f.vx += Math.sign(target.x - f.x) * 0.05;
        f.vx = Math.max(-2.4, Math.min(2.4, f.vx));
        f.x += f.vx; f.y += Math.sin(t / 20 + f.ph) * 0.4 + (target ? Math.sign(target.y - f.y) * 0.3 : 0);
        if (f.x < -30) f.x = W + 30; if (f.x > W + 30) f.x = -30;
        const d = Math.sign(f.vx) || 1;
        ctx.save(); ctx.translate(f.x, f.y); ctx.scale(d * f.s, f.s);
        ctx.fillStyle = "rgba(231,238,242,0.9)";
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-26, -7 + Math.sin(t / 5 + f.ph) * 3); ctx.lineTo(-26, 7 + Math.sin(t / 5 + f.ph) * 3); ctx.fill();
        ctx.fillStyle = "#06262b"; ctx.beginPath(); ctx.arc(9, -2, 1.5, 0, 7); ctx.fill();
        ctx.restore();
      });
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    frame();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} role="img" aria-label="Simulación de cámara submarina del estanque" className={`w-full h-full object-cover ${className}`} />;
}
