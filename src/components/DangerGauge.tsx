import React from "react";

interface DangerGaugeProps {
  score: number;
  label: string;
  dialScore?: number;
  onClick?: () => void;
  isExpanded?: boolean;
}

// The engine owns the level NAMES; this gauge only owns the colors.
// Levels come from scoring_engine.DIAL_LEVELS via the dial_label field.
const LEVEL_COLORS: Record<string, { arc: string; text: string }> = {
  NORMAL: { arc: "#22c55e", text: "#22c55e" },
  CONCERNING: { arc: "#06b6d4", text: "#06b6d4" },
  ELEVATED: { arc: "#eab308", text: "#eab308" },
  "HIGH RISK": { arc: "#f97316", text: "#f97316" },
  CRITICAL: { arc: "#ef4444", text: "#ef4444" },
};

const getGaugeStyle = (label: string, score: number) => {
  const known = LEVEL_COLORS[label.trim().toUpperCase()];
  if (known) return { ...known, label: label.trim().toUpperCase() };
  // Fallback for non-engine labels (e.g. a manual SOS): thresholds expressed
  // as a share of the engine's full dial range, where 13 == 100%.
  if (score >= 100) return { arc: "#ef4444", text: "#ef4444", label: "CRITICAL" };
  if (score >= 69) return { arc: "#f97316", text: "#f97316", label: "HIGH RISK" };
  if (score >= 38) return { arc: "#eab308", text: "#eab308", label: "ELEVATED" };
  if (score >= 15) return { arc: "#06b6d4", text: "#06b6d4", label: "CONCERNING" };
  return { arc: "#22c55e", text: "#22c55e", label: "NORMAL" };
};

export const DangerGauge: React.FC<DangerGaugeProps> = ({ score, label, dialScore, onClick, isExpanded }) => {
  const colors = getGaugeStyle(label, score);
  const needleAngle = -90 + (Math.min(100, Math.max(0, score)) / 100) * 180;
  const arcPercent = Math.min(100, Math.max(0, score)) / 100;
  const arcLength = 125.6;
  const dashOffset = arcLength - arcLength * arcPercent;

  return (
    <div
      onClick={onClick}
      className={`relative p-3 rounded-2xl border border-slate-700/50 bg-slate-900/80 transition-all ${
        onClick ? "cursor-pointer hover:bg-slate-800/80" : ""
      } ${isExpanded ? "ring-1 ring-cyan-500/30" : ""}`}
    >
      <svg viewBox="0 0 200 120" className="w-full max-w-[220px] mx-auto">
        <path d="M 20 100 A 40 40 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" transform="translate(0, -10)" />
        <path d="M 20 100 A 40 40 0 0 1 180 100" fill="none" stroke={colors.arc} strokeWidth="12" strokeLinecap="round" strokeDasharray={arcLength} strokeDashoffset={dashOffset} transform="translate(0, -10)" style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }} />
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = (-90 + (tick / 100) * 180) * (Math.PI / 180);
          const x1 = 100 + 52 * Math.cos(angle);
          const y1 = 90 + 52 * Math.sin(angle);
          const x2 = 100 + 58 * Math.cos(angle);
          const y2 = 90 + 58 * Math.sin(angle);
          return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="2" strokeLinecap="round" />;
        })}
        <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: "100px 90px", transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}>
          <line x1="100" y1="90" x2="100" y2="38" stroke="#f1f5f9" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="90" r="5" fill={colors.arc} stroke="#f1f5f9" strokeWidth="2" />
        </g>
      </svg>
      <div className="text-center -mt-2">
        <span className="text-lg font-black tracking-wider" style={{ color: colors.text }}>{colors.label}</span>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
          DIAL: {typeof dialScore === "number" ? dialScore.toFixed(1) : ((score * 13) / 100).toFixed(1)} / 13
        </div>
      </div>
      {onClick && (
        <div className="text-[9px] text-slate-600 text-center mt-1">{isExpanded ? "Tap to collapse" : "Tap for details"}</div>
      )}
    </div>
  );
};
