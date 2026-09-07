import React, { useState } from "react";
import {
  Shield,
  Car,
  UserCheck,
  Radio,
  Menu,
  X,
  CreditCard,
  Heart,
  Sparkles,
  PhoneCall,
  ChevronRight,
  Home,
} from "lucide-react";
import { RideStatus, ThreatLevel } from "../types";

interface NavbarProps {
  rideStatus: RideStatus;
  threatLevel: ThreatLevel;
  onOpenDriverModal: () => void;
  onResetRide: () => void;
  onGoHome: () => void;
  onOpenPaymentMethods: () => void;
  onOpenEmergencyContacts: () => void;
  onOpenAiFeedback: () => void;
  isAudioMonitoringActive: boolean;
  emergencyContactCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  rideStatus,
  threatLevel,
  onOpenDriverModal,
  onResetRide,
  onGoHome,
  onOpenPaymentMethods,
  onOpenEmergencyContacts,
  onOpenAiFeedback,
  isAudioMonitoringActive,
  emergencyContactCount,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavClick = (callback: () => void) => {
    callback();
    setIsDrawerOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            id="brand-logo"
            onClick={onGoHome}
            className="flex items-center gap-3 cursor-pointer select-none group"
            title="Go to Abhi AI Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-white">
                  Abhi <span className="text-cyan-400">AI</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  RideShield™
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Intelligent Ride Hailing & Active Audio Safety
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Emergency Contacts button in header with counter */}
            <button
              id="header-emergency-contacts-btn"
              onClick={onOpenEmergencyContacts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-950/60 text-red-300 border border-red-800/80 hover:bg-red-900/60 transition-colors"
              title="Manage Emergency SOS Contacts"
            >
              <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400/30" />
              <span className="hidden sm:inline">Emergency SOS:</span>
              <span className="font-bold bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {emergencyContactCount}
              </span>
            </button>

            {/* Live Safety Monitoring Status Indicator */}
            {rideStatus === "IN_TRIP" && (
              <div
                id="nav-safety-pill"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  threatLevel === "CRITICAL_SOS"
                    ? "bg-red-500/20 text-red-300 border-red-500 animate-pulse"
                    : threatLevel === "ELEVATED"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500"
                    : threatLevel === "MONITORING"
                    ? "bg-amber-500/10 text-amber-300 border-amber-600/50"
                    : isAudioMonitoringActive
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                <Radio
                  className={`w-3.5 h-3.5 ${
                    isAudioMonitoringActive ? "text-emerald-400 animate-pulse" : "text-slate-400"
                  }`}
                />
                <span className="hidden md:inline">
                  {threatLevel === "CRITICAL_SOS"
                    ? "SOS Active"
                    : threatLevel === "ELEVATED"
                    ? "Distress Detected"
                    : threatLevel === "MONITORING"
                    ? "Police Monitoring"
                    : isAudioMonitoringActive
                    ? "Monitored"
                    : "Standby"}
                </span>
              </div>
            )}

            {/* Hamburger Menu Toggle Button */}
            <button
              id="hamburger-menu-toggle"
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-bold hidden sm:inline text-slate-200">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Hamburger Drawer */}
      {isDrawerOpen && (
        <div
          id="hamburger-backdrop"
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        >
          <div
            id="hamburger-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-50 animate-in slide-in-from-right duration-200"
          >
            {/* Drawer Header */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Abhi AI Menu</h3>
                    <p className="text-[10px] text-slate-400">RideShield™ Safety Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="space-y-1.5">
                {/* 1. Book a Ride */}
                <button
                  id="drawer-book-ride-btn"
                  onClick={() => handleNavClick(onResetRide)}
                  className="w-full p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-left flex items-center justify-between text-cyan-300 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Car className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">Book a Ride</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                </button>

                {/* 2. Payment Methods */}
                <button
                  id="drawer-payment-methods-btn"
                  onClick={() => handleNavClick(onOpenPaymentMethods)}
                  className="w-full p-3 rounded-xl hover:bg-slate-800/80 text-left flex items-center justify-between text-slate-300 hover:text-white transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">Payment Methods</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                </button>

                {/* 3. Emergency Contacts */}
                <button
                  id="drawer-emergency-contacts-btn"
                  onClick={() => handleNavClick(onOpenEmergencyContacts)}
                  className="w-full p-3 rounded-xl hover:bg-slate-800/80 text-left flex items-center justify-between text-slate-300 hover:text-white transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 transition-colors">
                      <Heart className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">Emergency Contacts</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                </button>

                {/* 4. AI Safety Feedback */}
                <button
                  id="drawer-ai-feedback-btn"
                  onClick={() => handleNavClick(onOpenAiFeedback)}
                  className="w-full p-3 rounded-xl hover:bg-slate-800/80 text-left flex items-center justify-between text-slate-300 hover:text-white transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">Safety Feedback</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                </button>

                {/* 5. Be a Driver */}
                <button
                  id="drawer-be-driver-btn"
                  onClick={() => handleNavClick(onOpenDriverModal)}
                  className="w-full p-3 rounded-xl hover:bg-slate-800/80 text-left flex items-center justify-between text-slate-300 hover:text-white transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-white">Drive & Earn</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Drawer Footer & Direct 15 Link */}
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <a
                href="tel:15"
                className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Punjab Police 15</span>
              </a>
              <div className="text-[10px] text-slate-500 text-center">
                Abhi AI RideShield v2.4 • Pakistan Safe City Network
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
