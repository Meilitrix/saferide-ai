import React from "react";
import { Shield, Mic, Lock, BellRing, Check, X, AlertTriangle } from "lucide-react";

interface AudioSafetyPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDecline: () => void;
}

export const AudioSafetyPermissionModal: React.FC<AudioSafetyPermissionModalProps> = ({
  isOpen,
  onAllow,
  onDecline,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="audio-permission-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-5 shadow-2xl space-y-4 text-white">
        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Turn on Audio Safety?
            </h3>
            <p className="text-xs text-slate-400">
              We'll listen for screams, crashes and calls for help
            </p>
          </div>
        </div>

        {/* Quick Customer-Friendly Summary */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
          <p className="leading-relaxed">
            If a distress sound is detected, this trip can be escalated to emergency services automatically.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-300">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Audio is analysed in 3-second pieces and is not stored or uploaded.</span>
          </div>
        </div>

        {/* Permission Buttons */}
        <div className="space-y-2 pt-1">
          <button
            id="allow-live-mic-btn"
            onClick={() => onAllow()}
            className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Mic className="w-4 h-4 text-slate-950" />
            <span>Enable Audio Safety</span>
          </button>

          <button
            id="decline-audio-btn"
            onClick={onDecline}
            className="w-full py-1.5 text-slate-500 hover:text-slate-400 text-xs font-medium text-center transition-colors block"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};
