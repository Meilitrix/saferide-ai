import React, { useState } from "react";
import { AlertOctagon, PhoneCall, Shield, ShieldAlert, MapPin, Maximize2 } from "lucide-react";
import { DangerGauge } from "./DangerGauge";
import { AudioWaveBox } from "./AudioWaveBox";
import {
  ThreatLevel,
  IncidentReport,
  LocationItem,
  DriverProfile,
  EmergencyContact,
  DeviationAlert,
} from "../types";

interface AudioSafetyResult {
  status: string;
  confidence: number;
  sound_name: string;
  dial_score: number;
  dial_label: string;
  dial_level: number;
  word_severity: number;
  voice_severity: number;
  event_severity: number;
  event_type: string;
  transcript: string;
  keywords: string[];
  risk_level: number;
  custom_label?: string;
  custom_confidence?: number;
}

interface AudioSafetyMonitorProps {
  threatLevel: ThreatLevel;
  distressScore: number;
  onTriggerSos: () => void;
  onTriggerEmergencyDispatch: (report: IncidentReport) => void;
  pickup: LocationItem;
  dropoff: LocationItem;
  driver: DriverProfile;
  emergencyNumber: string;
  emergencyContacts: EmergencyContact[];
  onOpenEmergencyContacts: () => void;
  deviationAlert: DeviationAlert;
  onDeviationAcknowledge: () => void;
  onDeviationHelp: () => void;
  dialLabel?: string;
  lastResult?: AudioSafetyResult | null;
  transcript?: string;
  isAudioMonitoring?: boolean;
  onOpenDashboard?: () => void;
  getAudioLevels?: () => number[];
}

// Same palette as the dial, so the strip and the needle agree.
const WAVE_COLOR: Record<string, string> = {
  NORMAL: "#10b981",
  CONCERNING: "#84CC16",
  ELEVATED: "#EAB308",
  "HIGH RISK": "#F97316",
  CRITICAL: "#EF4444",
};

const STATUS_MAP: Record<ThreatLevel, { text: string; color: string; bg: string; border: string }> = {
  NORMAL: { text: "All clear", color: "text-emerald-400", bg: "bg-emerald-950/60", border: "border-emerald-800/60" },
  MONITORING: { text: "Hearing something", color: "text-amber-400", bg: "bg-amber-950/40", border: "border-amber-800/50" },
  ELEVATED: { text: "Elevated risk — SOS may trigger", color: "text-orange-400", bg: "bg-orange-950/60", border: "border-orange-700/60" },
  CRITICAL_SOS: { text: "EMERGENCY SOS", color: "text-red-400", bg: "bg-red-950/70", border: "border-red-600" },
};

export const AudioSafetyMonitor: React.FC<AudioSafetyMonitorProps> = ({
  threatLevel,
  distressScore,
  onTriggerSos,
  onTriggerEmergencyDispatch,
  pickup,
  driver,
  emergencyNumber,
  emergencyContacts,
  onOpenEmergencyContacts,
  deviationAlert,
  onDeviationAcknowledge,
  onDeviationHelp,
  dialLabel,
  lastResult,
  transcript,
  isAudioMonitoring,
  getAudioLevels,
  onOpenDashboard,
}) => {
  const [slideConfirm, setSlideConfirm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const status = STATUS_MAP[threatLevel];

  const handleSosPress = () => {
    if (!slideConfirm) {
      setSlideConfirm(true);
      setTimeout(() => setSlideConfirm(false), 5000);
      return;
    }
    setSlideConfirm(false);
    onTriggerSos();
  };

  const handleManualSOS = () => {
    onTriggerEmergencyDispatch({
      incidentId: `INC-PAK-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString(),
      isoTime: new Date().toISOString(),
      severity: "CRITICAL_SOS",
      category: "DIRECT_DISTRESS_KEYWORD",
      summary: `Rider pressed SOS. Alerting ${emergencyNumber} and ${emergencyContacts.length} contacts.`,
      detectedKeywords: ["manual_sos"],
      transcriptSnippet: "RIDER ACTIVATED SOS",
      riderTone: "Emergency",
      driverTone: "Unknown",
      backgroundAcoustic: "UNKNOWN",
      distressScore: 100,
      gpsCoordinates: { lat: pickup.lat, lng: pickup.lng, address: `${pickup.title}, ${pickup.city}` },
      vehicleDetails: { driverName: driver.name, vehicle: driver.carModel, plate: driver.licensePlate, riderName: "Passenger", driverPhone: driver.phone },
      emergencyDispatched: true,
      dispatchUnit: `POLICE ${emergencyNumber} / RESCUE 1122`,
      dialedNumber: emergencyNumber,
      actionsTaken: ["SOS button pressed by rider", `Alert sent to ${emergencyNumber}`, `Notified ${emergencyContacts.length} emergency contacts`],
    });
  };

  return (
    <div className="space-y-3">
      {/* Route Deviation Banner */}
      {deviationAlert.isActive && !deviationAlert.acknowledged && (
        <div className="p-4 bg-amber-950/80 border border-amber-500 rounded-2xl animate-fadeIn space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-amber-100">Route changed</h3>
              <p className="text-xs text-amber-300/80">The vehicle is {deviationAlert.deviationMeters}m off the planned route.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onDeviationAcknowledge} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors">
              I'm fine
            </button>
            <button onClick={onDeviationHelp} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition-colors">
              Help me
            </button>
          </div>
        </div>
      )}

      {/* Danger Gauge - Always visible when monitoring */}
      {isAudioMonitoring && (
        <div className="relative">
          <DangerGauge
            score={distressScore}
            label={dialLabel || threatLevel}
            dialScore={lastResult?.dial_score}
            onClick={onOpenDashboard}
            isExpanded={showDetails}
          />
          <AudioWaveBox
            getLevels={getAudioLevels}
            active={!!isAudioMonitoring}
            color={(WAVE_COLOR[(dialLabel || "NORMAL").trim().toUpperCase()] || "#10b981")}
          />
          {/* Open Dashboard Button */}
          {onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-400 rounded-lg transition-colors"
              title="Open full AI dashboard"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* AI Analysis Details (expanded when tapped) */}
      {isAudioMonitoring && showDetails && lastResult && (
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AI Analysis</span>
            <button onClick={() => setShowDetails(false)} className="text-[10px] text-slate-500 hover:text-white">Hide</button>
          </div>

          {/* 3 Signal Bars */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Words</div>
              <div className="text-lg font-black" style={{ color: (lastResult.word_severity ?? 0) >= 2 ? "#ef4444" : (lastResult.word_severity ?? 0) >= 1 ? "#eab308" : "#22c55e" }}>
                {lastResult.word_severity ?? 0}
              </div>
            </div>
            <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Voice</div>
              <div className="text-lg font-black" style={{ color: (lastResult.voice_severity ?? 0) >= 2 ? "#ef4444" : (lastResult.voice_severity ?? 0) >= 1 ? "#eab308" : "#22c55e" }}>
                {lastResult.voice_severity ?? 0}
              </div>
            </div>
            <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Event</div>
              <div className="text-lg font-black" style={{ color: (lastResult.event_severity ?? 0) >= 2 ? "#ef4444" : (lastResult.event_severity ?? 0) >= 1 ? "#eab308" : "#22c55e" }}>
                {lastResult.event_severity ?? 0}
              </div>
            </div>
          </div>

          {/* Sound detected + transcript */}
          {lastResult.sound_name && lastResult.sound_name !== "silence" && (
            <div className="text-[10px] text-slate-400">
              <span className="text-slate-500">Sound:</span>{" "}
              <span className="text-cyan-300 font-semibold">{lastResult.sound_name}</span>
            </div>
          )}
          {transcript && transcript.trim().length > 0 && (
            <div className="text-[10px] text-slate-400 truncate">
              <span className="text-slate-500">Heard:</span>{" "}
              <span className="text-white">{transcript.slice(-120)}</span>
            </div>
          )}

        </div>
      )}

      {/* Toggle details when monitoring */}
      {isAudioMonitoring && !showDetails && (
        <button
          onClick={() => setShowDetails(true)}
          className="w-full py-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          Show AI analysis
        </button>
      )}

      {/* Safety Status Bar */}
      <div className={`p-4 rounded-2xl border ${status.bg} ${status.border} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {threatLevel === "NORMAL" || threatLevel === "MONITORING" ? (
            <Shield className={`w-6 h-6 ${threatLevel === "MONITORING" ? "text-amber-400" : "text-emerald-400"}`} />
          ) : (
            <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse" />
          )}
          <div>
            <span className={`text-sm font-black ${status.color}`}>{status.text}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {threatLevel === "NORMAL" ? "Audio monitored" : threatLevel === "MONITORING" ? "Heard something" : threatLevel === "ELEVATED" ? "SOS may trigger if risk increases" : "Emergency services alerted"}
            </p>
          </div>
        </div>
      </div>

      {/* SOS Button */}
      {threatLevel !== "CRITICAL_SOS" && (
        <div className="space-y-2">
          {slideConfirm ? (
            <div className="flex gap-2">
              <button onClick={handleManualSOS} className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 animate-pulse">
                <PhoneCall className="w-5 h-5" />
                Confirm: Dial {emergencyNumber}
              </button>
              <button onClick={() => setSlideConfirm(false)} className="px-4 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-2xl border border-slate-700">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={handleSosPress} className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all">
              <AlertOctagon className="w-5 h-5" />
              SOS
            </button>
          )}
        </div>
      )}
    </div>
  );
};
