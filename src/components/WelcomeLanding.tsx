import React from "react";
import {
  Car,
  UserCheck,
  ChevronRight,
  ArrowRight,
  Heart,
  Shield,
  MapPin,
} from "lucide-react";

interface WelcomeLandingProps {
  onBookRide: () => void;
  onBeADriver: () => void;
  onOpenEmergencyContacts: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({
  onBookRide,
  onBeADriver,
  onOpenEmergencyContacts,
}) => {
  return (
    <div
      id="welcome-landing-page"
      className="w-full max-w-4xl mx-auto py-4 sm:py-8 space-y-6 animate-fadeIn"
    >
      {/* Sleek Header */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Where to?
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Fast rides, fair fares, and active safety
        </p>
      </div>

      {/* Two Action Cards: Book a Ride vs Drive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Book a Ride */}
        <div
          id="book-a-ride-card"
          onClick={onBookRide}
          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
              <span>Start</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">Ride</h2>
            <p className="text-xs text-slate-400 mt-0.5">Find nearby drivers</p>
          </div>
        </div>

        {/* Become a Driver */}
        <div
          id="be-a-driver-card"
          onClick={onBeADriver}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <span>Register</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">Drive</h2>
            <p className="text-xs text-slate-400 mt-0.5">Join as a driver</p>
          </div>
        </div>
      </div>

      {/* Quick Emergency Contacts link */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            <Heart className="w-4 h-4" />
          </div>
          <span className="font-semibold text-white">Emergency SOS Contacts</span>
        </div>

        <button
          onClick={onOpenEmergencyContacts}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors shrink-0"
        >
          Manage
        </button>
      </div>
    </div>
  );
};
