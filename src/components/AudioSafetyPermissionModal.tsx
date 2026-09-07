import React from "react";
import { Shield, Mic, Lock, BellRing, Check, X, AlertTriangle } from "lucide-react";

interface AudioSafetyPermissionModalProps {
  isOpen: boolean;
  onAllow: (useRealMic: boolean) => void;
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
              Enable Audio Safety Shield?
            </h3>
            <p className="text-xs text-slate-400">
              Trip started • Automatic emergency protection
            </p>
          </div>
        </div>

        {/* Quick Customer-Friendly Summary */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
          <p className="leading-relaxed">
            Your trip is monitored for verbal distress and emergency sounds to automatically alert emergency services if needed.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-300">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Encrypted ephemeral memory only. Never stored or shared.</span>
          </div>
        </div>

        {/* Permission Buttons */}
        <div className="space-y-2 pt-1">
          <button
            id="allow-live-mic-btn"
            onClick={() => onAllow(true)}
            className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Mic className="w-4 h-4 text-slate-950" />
            <span>Enable Audio Shield (Microphone)</span>
          </button>

          <button
            id="allow-simulated-audio-btn"
            onClick={() => onAllow(false)}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Use Interactive Simulator (Demo Mode)</span>
          </button>

          <button
            id="decline-audio-btn"
            onClick={onDecline}
            className="w-full py-1.5 text-slate-500 hover:text-slate-400 text-xs font-medium text-center transition-colors block"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};
