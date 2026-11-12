'use client';
import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Semburan emoji kecil dari tengah layar (atau dari elemen yang diklik) saat aksi berhasil. */
export function celebrate(emojis = ['🧀', '🍰', '✨', '🎉', '💛'], from?: { x: number; y: number }) {
  if (reduced()) return;
  const x = from?.x ?? window.innerWidth / 2;
  const y = from?.y ?? window.innerHeight * 0.45;
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('span');
    const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
    const dist = 90 + Math.random() * 130;
    el.className = 'confetti-bit';
    el.textContent = emojis[i % emojis.length];
    el.setAttribute('aria-hidden', 'true');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    el.style.setProperty('--dy', Math.sin(angle) * dist + 60 + 'px');
    el.style.setProperty('--rot', Math.round(Math.random() * 540 - 270) + 'deg');
    el.style.animationDelay = Math.random() * 0.12 + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }
  navigator.vibrate?.(30);
}

/** Angka yang menghitung naik/turun ke nilai barunya, lalu "membal" sedikit. */
export function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const [bump, setBump] = useState(0);
  const from = useRef(0);
  const first = useRef(true);
  useEffect(() => {
    const start = first.current ? 0 : from.current;
    first.current = false;
    if (reduced() || start === value) {
      setShown(value);
      from.current = value;
      return;
    }
    const t0 = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else setBump((b) => b + 1);
    };
    raf = requestAnimationFrame(tick);
    from.current = value;
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span key={bump} className={bump ? 'anim-bump' : 'inline-block'}>{format ? format(shown) : shown}</span>;
}

/** Emoji yang bereaksi saat diketuk. */
export function TapEmoji({ children, className = '', effect = 'anim-spin', idle = '', onTap }: { children: React.ReactNode; className?: string; effect?: string; idle?: string; onTap?: (e: React.MouseEvent) => void }) {
  const [n, setN] = useState(0);
  return (
    <button type="button" aria-label="Cizquake" tabIndex={-1} className={`cursor-pointer select-none ${className}`} onClick={(e) => { setN(n + 1); onTap?.(e); }}>
      <span key={n} className={`inline-block ${n ? effect : idle}`}>{children}</span>
    </button>
  );
}
