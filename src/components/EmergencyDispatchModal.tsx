import React, { useState } from "react";
import {
  AlertOctagon,
  ShieldAlert,
  PhoneCall,
  MapPin,
  Car,
  FileText,
  Clock,
  CheckCircle2,
  X,
  Volume2,
  Lock,
} from "lucide-react";
import { IncidentReport } from "../types";

interface EmergencyDispatchModalProps {
  report: IncidentReport | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelEmergency: (pin: string) => boolean;
}

export const EmergencyDispatchModal: React.FC<EmergencyDispatchModalProps> = ({
  report,
  isOpen,
  onClose,
  onCancelEmergency,
}) => {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  if (!isOpen || !report) return null;

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onCancelEmergency(pinInput);
    if (success) {
      setIsCancelled(true);
      setTimeout(() => {
        setIsCancelled(false);
        setPinInput("");
        onClose();
      }, 1200);
    } else {
      setPinError(true);
    }
  };

  return (
    <div
      id="emergency-dispatch-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-red-500/80 max-w-xl w-full rounded-2xl p-6 shadow-2xl shadow-red-500/20 text-white space-y-5">
        {/* Urgent Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-500 flex items-center justify-center animate-pulse">
              <AlertOctagon className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
                  Automated Police & 911 Alert
                </span>
                <span className="text-xs text-red-300 font-mono">
                  {report.incidentId}
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-white mt-0.5 tracking-tight">
                {report.category === "DIRECT_DISTRESS_KEYWORD"
                  ? "Rider Distress Plea Detected: Emergency Stop Required"
                  : report.category === "VERBAL_ABUSE"
                  ? "Severe Verbal Abuse & Harassment Pattern Detected"
                  : "Critical Threat Incident Alert"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Dispatch Transmission Banner */}
        <div className="p-3.5 bg-red-950/70 rounded-xl border border-red-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-red-200 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-red-400 animate-bounce" />
              Connected to Local Emergency Responders & Abhi 24/7 Security
            </span>
            <span className="text-[11px] font-mono text-red-300">
              Unit: {report.dispatchUnit || "SFPD-DISTRICT-1"}
            </span>
          </div>
          <p className="text-xs text-red-200/90 leading-relaxed">
            {report.summary}
          </p>
        </div>

        {/* Incident Dossier Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Location & GPS */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase text-[10px]">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Live Vehicle Telemetry
            </div>
            <p className="text-white font-medium truncate">
              {report.gpsCoordinates.address}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              GPS: {report.gpsCoordinates.lat.toFixed(4)}, {report.gpsCoordinates.lng.toFixed(4)}
            </p>
          </div>

          {/* Vehicle & Driver */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase text-[10px]">
              <Car className="w-3.5 h-3.5 text-cyan-400" />
              Vehicle & Driver Record
            </div>
            <p className="text-white font-medium truncate">
              {report.vehicleDetails.driverName} • {report.vehicleDetails.vehicle}
            </p>
            <p className="text-[10px] text-cyan-300 font-mono font-bold">
              PLATE: {report.vehicleDetails.plate}
            </p>
          </div>
        </div>

        {/* Flagged Audio Transcript Excerpt */}
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-red-400" />
              Flagged In-Cabin Audio Snippet:
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {report.timestamp}
            </span>
          </div>
          <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs italic text-red-300">
            "{report.transcriptSnippet}"
          </div>
          {report.detectedKeywords.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
              <span>Detected Danger Keywords:</span>
              {report.detectedKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-800"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Security Actions Taken */}
        <div className="space-y-1 text-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            Automated Abhi AI Response Actions:
          </span>
          <div className="space-y-1">
            {report.actionsTaken.map((act, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-300 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{act}</span>
              </div>
            ))}
          </div>
        </div>

        {/* False Alarm Cancellation with PIN */}
        <div className="pt-2 border-t border-slate-800">
          {isCancelled ? (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-center text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>False alarm verified with PIN. Alert cancelled.</span>
            </div>
          ) : (
            <form onSubmit={handleCancel} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300 font-medium flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  Are you safe? Cancel false alarm with Rider Safety PIN:
                </label>
                <span className="text-[10px] text-slate-400 font-mono">(Demo PIN: 4321)</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Enter 4-digit PIN (4321)"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors"
                >
                  Cancel Alert
                </button>
              </div>
              {pinError && (
                <p className="text-[11px] text-red-400">
                  Incorrect PIN. Please enter your 4-digit safety PIN (demo: 4321).
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
