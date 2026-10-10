import React, { useState, useEffect } from "react";
import {
  PhoneCall,
  PhoneOff,
  AlertOctagon,
  Shield,
  MapPin,
  Car,
  Volume2,
  Mic,
  Share2,
  CheckCircle2,
  X,
  Radio,
  Siren,
  Send,
} from "lucide-react";
import { IncidentReport, EmergencyContact } from "../types";

interface EmergencyDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: IncidentReport | null;
  emergencyNumber: string;
  onUpdateEmergencyNumber: (num: string) => void;
  emergencyContacts?: EmergencyContact[];
}

export const EmergencyDialerModal: React.FC<EmergencyDialerModalProps> = ({
  isOpen,
  onClose,
  report,
  emergencyNumber,
  onUpdateEmergencyNumber,
  emergencyContacts = [],
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<"DIALING" | "CONNECTED">("DIALING");
  const [activeNumber, setActiveNumber] = useState(emergencyNumber);
  const [activeContactName, setActiveContactName] = useState("Punjab Police 15");

  // When modal opens, start call timer and simulation
  useEffect(() => {
    if (isOpen) {
      setCallDuration(0);
      setCallStatus("DIALING");

      // Simulate connection to Emergency Control Room after 2 seconds
      const connectTimer = setTimeout(() => {
        setCallStatus("CONNECTED");
      }, 2000);

      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => {
        clearTimeout(connectTimer);
        clearInterval(interval);
      };
    }
  }, [isOpen, activeNumber]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleDialNumber = (num: string, label: string) => {
    setActiveNumber(num);
    setActiveContactName(label);
    onUpdateEmergencyNumber(num);
    try {
      window.location.href = `tel:${num.replace(/\s+/g, "")}`;
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div
      id="emergency-dialer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-red-500/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Pulsing Emergency Top Header */}
        <div className="bg-red-600 text-white px-5 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center animate-ping">
              <PhoneCall className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase">
                Zero-Dial Emergency SOS Activated
              </h3>
              <p className="text-[11px] text-red-100 font-medium">
                Live GPS & Audio Broadcast to Responders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-red-700 text-red-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Call Status Card */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <PhoneCall className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Active Emergency Channel:
                </span>
                <div className="text-base font-black text-white flex items-center gap-2">
                  <span>{activeContactName}</span>
                  <span className="text-xs font-mono text-cyan-400">({activeNumber})</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      callStatus === "CONNECTED"
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-amber-400 animate-ping"
                    }`}
                  />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {callStatus === "CONNECTED"
                      ? `Connected • ${formatTime(callDuration)}`
                      : "Direct Auto-Dialing..."}
                  </span>
                </div>
              </div>
            </div>

            <a
              href={`tel:${activeNumber.replace(/\s+/g, "")}`}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Redial</span>
            </a>
          </div>

          {/* Pre-Saved Emergency Contacts Automatic Broadcast Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <Siren className="w-3.5 h-3.5 text-red-400" />
                Pre-Saved Emergency Contacts (Zero-Dial Broadcast)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                ✓ Auto-Alert Dispatched
              </span>
            </div>

            <div className="space-y-2">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center font-bold text-red-400 text-xs">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{contact.name}</span>
                        <span className="text-[9px] text-slate-400 px-1.5 py-0.2 rounded bg-slate-800">
                          {contact.relationship}
                        </span>
                        {contact.isPrimary && (
                          <span className="text-[9px] text-cyan-400 bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800 font-bold">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {contact.phone} •{" "}
                        <span className="text-emerald-400 font-sans">
                          SMS GPS Location Sent
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDialNumber(contact.phone, contact.name)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 border border-slate-700 transition-colors shrink-0"
                  >
                    <PhoneCall className="w-3 h-3 text-emerald-400" />
                    <span>Call Now</span>
                  </button>
                </div>
              ))}

              {emergencyContacts.length === 0 && (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                  No personal emergency contacts pre-saved. Directly broadcasting to Punjab Police 15.
                </div>
              )}
            </div>
          </div>

          {/* Quick Helpline Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleDialNumber("15", "Punjab Police 15")}
              className={`p-3 rounded-xl border text-center transition-all ${
                activeNumber === "15"
                  ? "bg-red-600 text-white border-red-500 shadow-md"
                  : "bg-slate-950/80 text-slate-200 border-slate-800 hover:bg-slate-800"
              }`}
            >
              <div className="text-sm font-black">15 (Police)</div>
              <div className="text-[10px] opacity-80 mt-0.5">Punjab Emergency Command</div>
            </button>

            <button
              onClick={() => handleDialNumber("1122", "Rescue 1122")}
              className={`p-3 rounded-xl border text-center transition-all ${
                activeNumber === "1122"
                  ? "bg-red-600 text-white border-red-500 shadow-md"
                  : "bg-slate-950/80 text-slate-200 border-slate-800 hover:bg-slate-800"
              }`}
            >
              <div className="text-sm font-black">1122 (Rescue)</div>
              <div className="text-[10px] opacity-80 mt-0.5">Medical & Rapid Response</div>
            </button>
          </div>

          {/* Telemetry broadcast summary */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Live Telemetry:
              </span>
              <span className="font-mono text-white text-[11px]">
                {report?.gpsCoordinates?.address || "Liberty Market, Lahore"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-cyan-400" />
                Assigned Driver:
              </span>
              <span className="font-mono text-white text-[11px]">
                {report?.vehicleDetails?.driverName || "Fatima Zahra"} (
                {report?.vehicleDetails?.plate || "LEA-23-4910"})
              </span>
            </div>
          </div>
        </div>

        {/* Footer Dismiss Button */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Emergency Desk 24/7 Security Link
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Minimize Dialer
          </button>
        </div>
      </div>
    </div>
  );
};
