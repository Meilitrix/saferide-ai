import React, { useEffect, useRef, useState } from "react";
import { AudioWaveform } from "lucide-react";

interface AudioWaveBoxProps {
  getLevels?: () => number[];
  active: boolean;
  color: string;
}

const BARS = 22;

/*
 * A small loudness strip.  The dial answers "is something wrong?"; this answers
 * "is it even hearing me?" - so a rider staring at a dial of 0 can see the
 * room's sound moving.  Heights come from the mic buffer the app already reads.
 */
export const AudioWaveBox: React.FC<AudioWaveBoxProps> = ({ getLevels, active, color }) => {
  const [heights, setHeights] = useState<number[]>(new Array(BARS).fill(0));
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!active || !getLevels) {
      setHeights(new Array(BARS).fill(0));
      return;
    }
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const src = getLevels();
      const next = new Array(BARS).fill(0);
      for (let i = 0; i < BARS; i++) {
        const idx = src.length - (BARS - i);
        next[i] = idx >= 0 ? src[idx] : 0;
      }
      setHeights(next);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frame.current);
    };
  }, [active, getLevels]);

  return (
    <div className="mt-2 flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800">
      <AudioWaveform
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: active ? color : "#475569" }}
      />
      <div className="flex items-end gap-[2px] h-6 flex-1">
        {heights.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: active ? Math.max(8, h * 100) + "%" : "8%",
              background: active ? color : "#334155",
              opacity: active ? 0.3 + 0.7 * (i / BARS) : 0.45,
            }}
          />
        ))}
      </div>
      <span className="text-[9px] text-slate-500 whitespace-nowrap">
        {active ? "listening" : "mic off"}
      </span>
    </div>
  );
};
