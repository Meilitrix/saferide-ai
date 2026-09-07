import React, { useState, useEffect } from "react";
import { AlertOctagon, PhoneCall, ShieldCheck, Clock, Pause, Play } from "lucide-react";

interface SosPromptModalProps {
  isOpen: boolean;
  onConfirmSos: () => void;
  onCancel: () => void;
  riskCount: number;
  emergencyNumber: string;
}

export const SosPromptModal: React.FC<SosPromptModalProps> = ({
  isOpen,
  onConfirmSos,
  onCancel,
  riskCount,
  emergencyNumber,
}) => {
  const [countdown, setCountdown] = useState(25);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-countdown timer
  useEffect(() => {
    if (!isOpen) {
      setCountdown(25);
      setIsPaused(false);
      return;
    }

    if (isPaused) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirmSos();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, onConfirmSos]);

  if (!isOpen) return null;

  return (
    <div
      id="sos-prompt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="bg-slate-900 border border-red-500/70 max-w-md w-full rounded-3xl p-6 shadow-2xl text-white space-y-5 relative">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="text-[11px] font-semibold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/80">
              Safety Check Triggered
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              Is everything alright?
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {riskCount} risk patterns were detected in the last 60 seconds.
            </p>
          </div>
        </div>

        {/* Countdown & Pause Box */}
        <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className={`w-4 h-4 ${isPaused ? "text-amber-400" : "text-cyan-400 animate-pulse"}`} />
            <span>
              {isPaused ? (
                <span className="text-amber-300 font-medium">Timer paused</span>
              ) : (
                <>
                  Auto-dialing Police in{" "}
                  <strong className="text-white font-mono text-sm bg-slate-800 px-1.5 py-0.5 rounded">
                    {countdown}s
                  </strong>
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700 transition-colors"
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>
        </div>

        {/* Action Buttons: Cancel (Safe) vs Call SOS */}
        <div className="space-y-2.5 pt-1">
          {/* Prominent CANCEL button requested by user */}
          <button
            id="sos-cancel-safe-btn"
            onClick={onCancel}
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-emerald-500/50 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow transition-all"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Cancel — I am Safe / False Alarm</span>
          </button>

          {/* Emergency SOS Call */}
          <button
            id="sos-confirm-yes-btn"
            onClick={onConfirmSos}
            className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all"
          >
            <PhoneCall className="w-4 h-4 text-white" />
            <span>Call Police {emergencyNumber} (Emergency SOS)</span>
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400">
          Clicking "Cancel" resets the safety monitor back to normal.
        </p>
      </div>
    </div>
  );
};
