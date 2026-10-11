import React, { useState, useEffect, useRef } from "react";
import { LifeBuoy, PhoneCall, ShieldCheck, Clock, Pause, Play } from "lucide-react";

interface SosPromptModalProps {
  isOpen: boolean;
  onConfirmSos: () => void;
  onCancel: () => void;
  riskCount: number;
  emergencyNumber: string;
}

/** Seconds the rider gets to answer before the emergency window opens by
 *  itself.  Named so it can be changed once, honestly, instead of in two
 *  places (it used to be the literal 25 twice). */
const AUTO_SOS_SECONDS = 25;

export const SosPromptModal: React.FC<SosPromptModalProps> = ({
  isOpen,
  onConfirmSos,
  onCancel,
  // riskCount is intentionally not shown: App.tsx passes a fixed 3, so any
  // number printed here would be invented rather than measured.
  emergencyNumber,
}) => {
  const [countdown, setCountdown] = useState(AUTO_SOS_SECONDS);
  const [isPaused, setIsPaused] = useState(false);

  // The callback is kept in a ref ON PURPOSE.  App.tsx hands down a brand new
  // function object on every render, and the ride re-renders every ~3 seconds as
  // each audio chunk arrives.  Listing it as a dependency used to tear down and
  // rebuild this 1-second interval on every chunk, so the countdown advanced one
  // step per chunk instead of one per second and never reliably reached zero -
  // the card appeared and nothing followed.  The interval now depends only on
  // what it genuinely uses.
  const confirmRef = useRef(onConfirmSos);
  useEffect(() => {
    confirmRef.current = onConfirmSos;
  }, [onConfirmSos]);
  const dispatchedRef = useRef(false);

  // The tick only counts down.  Dispatching happens in its own effect below,
  // because calling another component's state update from inside a state updater
  // is a side effect React may run twice (<StrictMode> is on) or drop.
  useEffect(() => {
    if (!isOpen) {
      setCountdown(AUTO_SOS_SECONDS);
      setIsPaused(false);
      dispatchedRef.current = false;
      return;
    }

    if (isPaused) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPaused]);

  // Exactly once, when the countdown truly reaches zero: open the emergency
  // window, the same one the rider's manual SOS button opens.
  useEffect(() => {
    if (isOpen && !isPaused && countdown === 0 && !dispatchedRef.current) {
      dispatchedRef.current = true;
      confirmRef.current();
    }
  }, [isOpen, isPaused, countdown]);

  if (!isOpen) return null;

  return (
    <div
      id="sos-prompt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-3xl p-6 shadow-2xl text-white space-y-5 relative">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              Safety check
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              Is everything alright?
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              The ride monitor has been alarmed for the last minute.
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
                  The emergency screen opens in{" "}
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
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow transition-all"
          >
            <ShieldCheck className="w-5 h-5 text-white" />
            <span>I am safe</span>
          </button>

          {/* Emergency SOS Call */}
          <button
            id="sos-confirm-yes-btn"
            onClick={onConfirmSos}
            className="w-full py-3 px-4 bg-transparent hover:bg-rose-950/50 text-rose-300 border border-rose-500/50 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <PhoneCall className="w-4 h-4 text-rose-300" />
            <span>Call Police {emergencyNumber}</span>
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400">
          "I am safe" closes this. The audio monitor keeps listening.
        </p>
      </div>
    </div>
  );
};
