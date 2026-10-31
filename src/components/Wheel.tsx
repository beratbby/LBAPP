"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { spinWheel, type SpinResult } from "@/lib/actions/punishments";

const COLORS = [
  { fill: "#e11d48", text: "#fff" },
  { fill: "#ffe4ec", text: "#9f1239" },
  { fill: "#9f1239", text: "#fff" },
  { fill: "#fda4af", text: "#3b1020" },
  { fill: "#f472b6", text: "#fff" },
  { fill: "#fff6f1", text: "#9f1239" },
];

const R = 100;

function point(angleDeg: number, radius = R) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [R + radius * Math.cos(a), R + radius * Math.sin(a)];
}

function short(s: string) {
  return s.length > 16 ? s.slice(0, 15) + "…" : s;
}

export function Wheel({
  assignedId,
  candidates,
  canSpin,
}: {
  assignedId: number;
  candidates: { id: number; title: string }[];
  canSpin: boolean;
}) {
  const router = useRouter();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Extract<SpinResult, { ok: true }> | null>(null);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const n = Math.max(candidates.length, 1);
  const seg = 360 / n;

  async function spin() {
    setError(null);
    setSpinning(true);
    const res = await spinWheel(assignedId);
    if (!res.ok) {
      setError(res.error);
      setSpinning(false);
      return;
    }
    const idx = Math.max(0, candidates.findIndex((c) => c.id === res.punishmentId));
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const target = 360 - (idx * seg + seg / 2) + jitter;
    const current = rotation % 360;
    setResult(res);
    setRotation(rotation + 360 * 6 + ((target - current + 360) % 360));
  }

  function finish() {
    if (!result) return;
    setSpinning(false);
    setShown(true);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-[280px]">
        {/* Zeiger */}
        <div className="absolute top-[-6px] left-1/2 z-10 -translate-x-1/2 text-3xl drop-shadow" aria-hidden>
          💘
        </div>
        <svg viewBox="0 0 200 200" className="w-full drop-shadow-xl">
          <g
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "100px 100px",
              transition: spinning ? "transform 5.5s cubic-bezier(0.15, 0.7, 0.1, 1)" : "none",
            }}
            onTransitionEnd={finish}
          >
            {candidates.length <= 1 ? (
              <circle cx={R} cy={R} r={R} fill={COLORS[0].fill} />
            ) : (
              candidates.map((c, i) => {
                const [x0, y0] = point(i * seg);
                const [x1, y1] = point((i + 1) * seg);
                const color = COLORS[i % COLORS.length];
                return (
                  <path
                    key={c.id}
                    d={`M${R} ${R} L${x0} ${y0} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`}
                    fill={color.fill}
                    stroke="#fff"
                    strokeWidth="1"
                  />
                );
              })
            )}
            {candidates.map((c, i) => {
              const mid = i * seg + seg / 2;
              const color = candidates.length <= 1 ? COLORS[0] : COLORS[i % COLORS.length];
              return (
                <text
                  key={c.id}
                  x={R}
                  y={R}
                  fill={color.text}
                  fontSize={n > 6 ? 7 : 8.5}
                  fontWeight={800}
                  textAnchor="end"
                  dominantBaseline="middle"
                  transform={`rotate(${mid - 90} ${R} ${R}) translate(${R - 10} 0)`}
                >
                  {short(c.title)}
                </text>
              );
            })}
          </g>
          <circle cx={R} cy={R} r="14" fill="#fff" stroke="#e11d48" strokeWidth="3" />
          <text x={R} y={R + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12">
            💔
          </text>
        </svg>
      </div>

      {error && <p className="text-sm font-semibold text-red-700">💔 {error}</p>}

      {!shown && canSpin && (
        <button type="button" onClick={spin} disabled={spinning} className="btn btn-primary text-base">
          {spinning ? "Das Schicksal dreht sich…" : "🎡 Rad drehen"}
        </button>
      )}
      {!canSpin && !shown && (
        <p className="text-center text-sm text-wine-soft">Nur der Verurteilte darf am Rad drehen.</p>
      )}

      {shown && result && (
        <div className="relative w-full overflow-visible">
          <div className="heart-burst pointer-events-none absolute inset-x-0 bottom-0 h-0" aria-hidden>
            {["💘", "💖", "💔", "🌹", "💕", "💗", "💞", "🥀"].map((h, i) => (
              <span key={i} style={{ left: `${8 + i * 11}%`, animationDelay: `${i * 0.12}s`, fontSize: 22 + (i % 3) * 6 }}>
                {h}
              </span>
            ))}
          </div>
          <div className="rounded-3xl border-2 border-rose bg-blush/70 p-4 text-center">
            <p className="text-xs font-bold tracking-widest text-rose-dark uppercase">Das Schicksal hat entschieden</p>
            <p className="mt-1 font-script text-2xl text-rose-dark">{result.title}</p>
            <p className="mt-1 text-sm">{result.description}</p>
            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={() => startTransition(() => router.refresh())}
            >
              Akzeptiert 🫡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
