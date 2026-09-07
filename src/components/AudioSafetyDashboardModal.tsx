import React from "react";
import { X, Maximize2, ArrowLeft } from "lucide-react";

interface AudioSafetyDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSafetyDashboardModal: React.FC<AudioSafetyDashboardModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 animate-fadeIn">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            title="Back to ride"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-bold">Back to Ride</span>
          </button>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-300">
            Audio Safety AI Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open("http://localhost:5004", "_blank")}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Open in new tab"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Iframe with full audio safety dashboard */}
      <iframe
        src="http://localhost:5004"
        className="w-full h-full pt-12 border-0"
        title="Audio Safety AI Dashboard"
        allow="microphone; camera"
      />
    </div>
  );
};
