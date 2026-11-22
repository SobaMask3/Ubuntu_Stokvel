'use client';

import { useEffect, useRef } from 'react';

/** Horizontal progress bar whose leading edge moves like a wave as it fills toward the goal. */
export function WaveBar({ value, goal }: { value: number; goal: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const target = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let shown = 0, t = 0, raf = 0;
    const tok = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

    const rr = (w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r);
      ctx.closePath();
    };

    const draw = () => {
      const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      rr(w, h, 14); ctx.fillStyle = tok('--track'); ctx.fill();
      ctx.save(); ctx.clip();

      const goalPct = targetRef.current;
      if (reduce.matches) shown = goalPct; else { shown += (goalPct - shown) * 0.05; t += 0.035; }
      const X = shown * w, amp = Math.min(9, X * 0.5), full = shown >= 0.999;

      const layer = (offset: number, phase: number, fill: string | CanvasGradient, alpha: number) => {
        if (X <= 0.5) return;
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let y = 0; y <= h; y += 2) {
          const edge = full ? w + 20
            : X + offset + amp * Math.sin((y / h) * Math.PI * 2.2 + t + phase) + amp * 0.45 * Math.sin((y / h) * Math.PI * 4.6 - t * 1.6 + phase);
          ctx.lineTo(Math.max(0, edge), y);
        }
        ctx.lineTo(0, h); ctx.closePath();
        ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1;
      };
      layer(10, 1.9, tok('--accent-2'), 0.45);
      const g = ctx.createLinearGradient(0, 0, Math.max(X, 1), 0);
      g.addColorStop(0, tok('--accent')); g.addColorStop(1, tok('--accent-2'));
      layer(0, 0, g, 1);

      if (X > 0.5) {
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2;
        for (let r = 0; r < 2; r++) {
          ctx.beginPath();
          const base = h * (0.35 + r * 0.3);
          for (let x = 0; x <= X - 12; x += 4) {
            const y = base + 3 * Math.sin(x / 38 - t * 1.4 + r * 2);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct = goal > 0 ? Math.round((value / goal) * 100) : 0;
  return (
    <div className="wave-box" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={value} aria-label={`Saved ${pct}% of the goal`}>
      <canvas id="wave" ref={ref} aria-hidden="true" />
      <span className="goal-flag">{pct}%</span>
    </div>
  );
}
