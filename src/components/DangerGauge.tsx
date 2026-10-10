import React from "react";

interface DangerGaugeProps {
  score: number;
  label: string;
  dialScore?: number;
  onClick?: () => void;
  isExpanded?: boolean;
}

/*
 * This is the Audio Safety engine's OWN Danger Dial, ported directly from
 * audio-safety-ai/index.html (the "dial-container" markup + setGauge()).
 * Same arc geometry, same colour gradient, same needle maths, same level
 * words — so the rider screen and the engine screen are literally the same
 * instrument. Nothing is re-scaled or renamed here.
 */

const LEVEL_COLORS: Record<string, string> = {
  NORMAL: "#22C55E",
  CONCERNING: "#84CC16",
  ELEVATED: "#EAB308",
  "HIGH RISK": "#F97316",
  CRITICAL: "#EF4444",
};

// The app's own threat vocabulary mapped onto the engine's dial vocabulary.
const AS_DIAL_WORD: Record<string, string> = {
  MONITORING: "CONCERNING",
  CRITICAL_SOS: "CRITICAL",
};

const CONTAINER_BORDER: Record<string, string> = {
  NORMAL: "border-emerald-500/25",
  CONCERNING: "border-lime-500/40",
  ELEVATED: "border-yellow-500/40",
  "HIGH RISK": "border-orange-500/70 bg-orange-500/5",
  CRITICAL: "border-red-500 bg-red-500/10 animate-pulse",
};

export const DangerGauge: React.FC<DangerGaugeProps> = ({
  label,
  dialScore = 0,
  onClick,
}) => {
  const raw = (label || "NORMAL").trim().toUpperCase();
  const level = AS_DIAL_WORD[raw] || raw;
  const color = LEVEL_COLORS[level] || "#22C55E";

  // Engine behaviour: dial 10 = full sweep (index.html setGauge), so both
  // screens move identically. A forced CRITICAL (manual SOS) still needs the
  // needle to agree with the word, so it gets a minimum sweep.
  let pct = Math.min(100, (dialScore / 10) * 100);
  if (level === "CRITICAL" && pct < 85) pct = 100;
  if (level === "HIGH RISK" && pct < 65) pct = 75;

  const needleAngle = -90 + (pct / 100) * 180;
  const dashOffset = 251.2 - (251.2 * pct) / 100;

  return (
    <div
      onClick={onClick}
      className={
        "bg-slate-900/80 backdrop-blur-md border rounded-2xl p-4 w-full transition-colors cursor-pointer " +
        (CONTAINER_BORDER[level] || "border-slate-800")
      }
    >
      <div className="flex justify-center">
        <svg viewBox="0 0 200 110" style={{ width: 220, height: 120 }}>
          <defs>
            <linearGradient id="abhiGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#06b6d4" />
              <stop offset="55%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth={14}
            strokeLinecap="round"
          />
          {/* Coloured arc - fills with the score */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#abhiGaugeGrad)"
            strokeWidth={12}
            strokeDasharray={251.2}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }}
          />
          {/* Tick marks */}
          <line x1={20} y1={100} x2={30} y2={100} stroke="#475569" strokeWidth={2} />
          <line x1={44} y1={56} x2={52} y2={62} stroke="#475569" strokeWidth={2} />
          <line x1={100} y1={20} x2={100} y2={30} stroke="#475569" strokeWidth={2} />
          <line x1={156} y1={56} x2={148} y2={62} stroke="#475569" strokeWidth={2} />
          <line x1={180} y1={100} x2={170} y2={100} stroke="#475569" strokeWidth={2} />
          {/* Needle */}
          <g
            style={{
              transform: "rotate(" + needleAngle + "deg)",
              transformOrigin: "100px 100px",
              transition: "transform .6s cubic-bezier(.4,0,.2,1)",
            }}
          >
            <line
              x1={100}
              y1={100}
              x2={100}
              y2={30}
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={100} cy={100} r={6} fill="#06b6d4" stroke="#ffffff" strokeWidth={2} />
          </g>
        </svg>
      </div>

      <div className="flex flex-col items-center gap-0.5 mt-1">
        <span className="text-sm font-black tracking-[2px] uppercase" style={{ color }}>
          {level}
        </span>
        <span className="text-[11px] text-slate-400">Score: {dialScore.toFixed(1)}</span>
      </div>
    </div>
  );
};
