import React, { useState } from "react";
import { UserCheck, ShieldCheck, Car, CheckCircle2, X, Sparkles, Clock, AlertCircle } from "lucide-react";

interface DriverRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriverRegistrationModal: React.FC<DriverRegistrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setEmail("");
        onClose();
      }, 1500);
    }
  };

  return (
    <div
      id="driver-registration-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Partner Program
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Register as an Abhi AI Driver
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice of focus */}
        <div className="p-3.5 bg-cyan-950/40 rounded-xl border border-cyan-800/60 text-xs text-cyan-200 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-cyan-300">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Driver Registration Opening in Q3
          </div>
          <p className="text-slate-300 leading-relaxed">
            We are currently showcasing the Passenger Booking Experience and Live In-Cabin Audio Safety Shield. Driver onboarding applications will launch in our next phase.
          </p>
        </div>

        {/* Driver Partner Requirements Preview */}
        <div className="space-y-2 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Driver Partner Standards:
          </span>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full background check & certified safety clearance</span>
            </div>
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>2018 or newer 4-door vehicle with valid insurance</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Abhi AI In-Cabin Safety Protocol training</span>
            </div>
          </div>
        </div>

        {/* Early Access Waitlist Form */}
        {submitted ? (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Thank you! We'll notify you when driver registration opens.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2 pt-2">
            <label className="text-xs text-slate-400 block">
              Join the Driver Partner Early Notification List:
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition-colors"
              >
                Notify Me
              </button>
            </div>
          </form>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
        >
          Return to Passenger Booking
        </button>
      </div>
    </div>
  );
};
