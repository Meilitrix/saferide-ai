import React, { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { LiveMap } from "./components/LiveMap";
import { PassengerBookingFlow } from "./components/PassengerBookingFlow";
import { AudioSafetyPermissionModal } from "./components/AudioSafetyPermissionModal";
import { AudioSafetyMonitor } from "./components/AudioSafetyMonitor";
import { SosPromptModal } from "./components/SosPromptModal";
import { EmergencyDialerModal } from "./components/EmergencyDialerModal";
import { EmergencyDispatchModal } from "./components/EmergencyDispatchModal";
import { DriverRegistrationModal } from "./components/DriverRegistrationModal";
import { WelcomeLanding } from "./components/WelcomeLanding";
import { EmergencyContactsModal } from "./components/EmergencyContactsModal";
import { AIFeedbackModal } from "./components/AIFeedbackModal";
import { AudioSafetyDashboardModal } from "./components/AudioSafetyDashboardModal";
import { PaymentMethodsModal } from "./components/PaymentMethodsModal";
import { useAudioSafety } from "./hooks/useAudioSafety";
import {
  RideStatus,
  ThreatLevel,
  LocationItem,
  DriverProfile,
  IncidentReport,
  EmergencyContact,
  PaymentMethod,
  AIFeedbackRecord,
  RouteOption,
  DeviationAlert,
} from "./types";
import {
  POPULAR_LOCATIONS,
  AVAILABLE_PAKISTANI_DRIVERS,
} from "./data/rideData";
import {
  Shield,
  Car,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  PhoneCall,
  Siren,
} from "lucide-react";

const INITIAL_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: "ec_default_1",
    name: "Ammi (Mother)",
    relationship: "Mother",
    phone: "+92 300 8452109",
    isPrimary: true,
    autoCallOnSos: true,
    autoSmsGpsOnSos: true,
  },
  {
    id: "ec_default_2",
    name: "Bhai Tariq",
    relationship: "Brother",
    phone: "+92 333 4912044",
    isPrimary: false,
    autoCallOnSos: true,
    autoSmsGpsOnSos: true,
  },
];

export default function App() {
  // ── Core ride state ──────────────────────────────────────────────
  const [rideStatus, setRideStatus] = useState<RideStatus>("WELCOME_LANDING");
  const [pickup, setPickup] = useState<LocationItem>(POPULAR_LOCATIONS[0]);
  const [dropoff, setDropoff] = useState<LocationItem>(POPULAR_LOCATIONS[1]);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile>(AVAILABLE_PAKISTANI_DRIVERS[0]);
  const [tripProgress, setTripProgress] = useState(0);

  // ── Route state ──────────────────────────────────────────────────
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [deviationPosition, setDeviationPosition] = useState<{ lat: number; lng: number } | null>(null);

  // ── Safety state ─────────────────────────────────────────────────
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>("NORMAL");
  const [distressScore, setDistressScore] = useState(0);
  const [isAudioPermissionModalOpen, setIsAudioPermissionModalOpen] = useState(false);
  const [isAudioMonitoringActive, setIsAudioMonitoringActive] = useState(false);
  const [latestIncidentReport, setLatestIncidentReport] = useState<IncidentReport | null>(null);

  // -- Audio Safety AI Hook (connects to audio-safety-ai server on port 5004) --
  const handleThreatUpdate = useCallback((newThreat: string, score: number) => {
    setThreatLevel(newThreat as ThreatLevel);
    setDistressScore(score);
  }, []);
  const audioSafety = useAudioSafety(handleThreatUpdate);

  // ── Deviation alert state ────────────────────────────────────────
  const [deviationAlert, setDeviationAlert] = useState<DeviationAlert>({
    isActive: false,
    deviationMeters: 0,
    durationSeconds: 0,
    acknowledged: false,
  });
  const deviationStartRef = useRef<number>(0);

  // ── SOS & Emergency ─────────────────────────────────────────────
  const [isSosPromptOpen, setIsSosPromptOpen] = useState(false);
  const [sosRiskCount, setSosRiskCount] = useState(3);
  const [emergencyNumber, setEmergencyNumber] = useState("15");
  const [isEmergencyDialerOpen, setIsEmergencyDialerOpen] = useState(false);
  const [isEmergencyReportModalOpen, setIsEmergencyReportModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  // ── Modals ───────────────────────────────────────────────────────
  const [isEmergencyContactsModalOpen, setIsEmergencyContactsModalOpen] = useState(false);
  const [isPaymentMethodsModalOpen, setIsPaymentMethodsModalOpen] = useState(false);
  const [isAiFeedbackModalOpen, setIsAiFeedbackModalOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);

  // ── Auto-SOS consecutive critical counter ─────────────────────
  const criticalCountRef = useRef(0);
  const autoSosTriggeredRef = useRef(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
  const [feedbackRecords, setFeedbackRecords] = useState<AIFeedbackRecord[]>([]);

  // ── Emergency contacts (persisted) ───────────────────────────────
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(() => {
    try {
      const saved = localStorage.getItem("abhi_emergency_contacts");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not read emergency contacts", e);
    }
    return INITIAL_EMERGENCY_CONTACTS;
  });

  const handleSaveEmergencyContacts = (newContacts: EmergencyContact[]) => {
    setEmergencyContacts(newContacts);
    try {
      localStorage.setItem("abhi_emergency_contacts", JSON.stringify(newContacts));
    } catch (e) {
      console.warn("Could not save emergency contacts", e);
    }
  };

  // ── Fetch routes when user picks locations ──────────────────────
  const fetchRoutes = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        pickup_lat: String(pickup.lat),
        pickup_lng: String(pickup.lng),
        drop_lat: String(dropoff.lat),
        drop_lng: String(dropoff.lng),
      });
      const res = await fetch(`/api/routes?${params}`);
      const data = await res.json();
      if (data.success && data.routes.length > 0) {
        setRoutes(data.routes);
        const safest = data.routes.reduce((best: RouteOption, r: RouteOption) =>
          r.safetyScore > best.safetyScore ? r : best
        );
        setSelectedRouteId(safest.id);
      }
    } catch (err) {
      console.warn("Route fetch failed:", err);
    }
  }, [pickup, dropoff]);

  // Auto-fetch routes when entering route selection
  useEffect(() => {
    if (rideStatus === "ROUTE_SELECTION" && routes.length === 0) {
      fetchRoutes();
    }
  }, [rideStatus, routes.length, fetchRoutes]);

  // ── Route deviation detection ────────────────────────────────────
  useEffect(() => {
    if (rideStatus !== "IN_TRIP" || routes.length === 0 || !selectedRouteId) return;

    const activeRoute = routes.find((r) => r.id === selectedRouteId);
    if (!activeRoute) return;

    const interval = setInterval(async () => {
      // Compute current car position along route
      const pct = tripProgress;
      const coords = activeRoute.geometry;
      const totalSegs = coords.length - 1;
      const pctPerSeg = 100 / totalSegs;
      const segIdx = Math.min(Math.floor(pct / pctPerSeg), totalSegs - 1);
      const segProg = (pct % pctPerSeg) / pctPerSeg;
      const p1 = coords[segIdx];
      const p2 = coords[segIdx + 1] || p1;
      const carLat = p1[0] + (p2[0] - p1[0]) * segProg;
      const carLng = p1[1] + (p2[1] - p1[1]) * segProg;

      // Simulate occasional deviation (for demo: ~5% chance per check)
      const simDeviation = Math.random() < 0.05;
      const devLat = simDeviation ? carLat + (Math.random() - 0.5) * 0.005 : carLat;
      const devLng = simDeviation ? carLng + (Math.random() - 0.5) * 0.005 : carLng;

      try {
        const res = await fetch("/api/check-deviation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: devLat, lng: devLng, routeGeometry: activeRoute.geometry }),
        });
        const data = await res.json();

        if (data.success && data.isDeviation) {
          setDeviationPosition({ lat: devLat, lng: devLng });
          if (deviationStartRef.current === 0) {
            deviationStartRef.current = Date.now();
          }
          const elapsed = (Date.now() - deviationStartRef.current) / 1000;

          if (elapsed > 15 && !deviationAlert.acknowledged) {
            setDeviationAlert({
              isActive: true,
              deviationMeters: data.deviationMeters,
              durationSeconds: Math.round(elapsed),
              acknowledged: false,
            });
          }

          // Auto-escalate if no response after 30s
          if (elapsed > 30 && !deviationAlert.acknowledged) {
            setThreatLevel("ELEVATED");
            setDistressScore(70);
          }
        } else {
          // Back on route
          setDeviationPosition(null);
          deviationStartRef.current = 0;
          if (deviationAlert.isActive && deviationAlert.acknowledged) {
            setDeviationAlert((prev) => ({ ...prev, isActive: false }));
          }
        }
      } catch {
        // Network error, skip this check
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [rideStatus, routes, selectedRouteId, tripProgress, deviationAlert.acknowledged, deviationAlert.isActive]);

  // ── Trip progress (distance-based when route available) ──────────
  useEffect(() => {
    if (rideStatus !== "IN_TRIP") return;

    const interval = setInterval(() => {
      setTripProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (threatLevel === "NORMAL") setRideStatus("TRIP_COMPLETED");
          return 100;
        }
        return prev + 0.8;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [rideStatus, threatLevel]);

  // ── Deviation handlers ───────────────────────────────────────────
  const handleDeviationAcknowledge = () => {
    setDeviationAlert((prev) => ({ ...prev, acknowledged: true, isActive: false }));
    setDeviationPosition(null);
    deviationStartRef.current = 0;
    // Police monitors for 3 minutes after false alarm
    setThreatLevel("MONITORING");
    setDistressScore(30);
    setTimeout(() => {
      setThreatLevel("NORMAL");
      setDistressScore(0);
    }, 180000); // 3 minutes
  };

  const handleDeviationHelp = () => {
    setDeviationAlert((prev) => ({ ...prev, acknowledged: true, isActive: false }));
    setThreatLevel("CRITICAL_SOS");
    setDistressScore(100);
    handleTriggerSosPrompt(3);
  };

  // ── Ride booking actions ─────────────────────────────────────────
  const handleConfirmRide = () => {
    setRideStatus("SEARCHING_DRIVER");
    setTimeout(() => setRideStatus("CHOOSING_DRIVER"), 1200);
  };

  const handleSelectDriverAndProceed = (driver: DriverProfile) => {
    setSelectedDriver(driver);
    setRideStatus("DRIVER_ASSIGNED");
  };

  const handleStartTrip = () => {
    setRideStatus("IN_TRIP");
    setTripProgress(0);
    setIsAudioPermissionModalOpen(true);
  };

  const handleAllowAudioMonitoring = () => {
    setIsAudioMonitoringActive(true);
    setIsAudioPermissionModalOpen(false);
    audioSafety.startMonitoring();
  };

  const handleDeclineAudioMonitoring = () => {
    setIsAudioMonitoringActive(false);
    setIsAudioPermissionModalOpen(false);
  };

  // ── SOS handlers ─────────────────────────────────────────────────
  const handleTriggerSosPrompt = (riskCount: number) => {
    setSosRiskCount(riskCount);
    setIsSosPromptOpen(true);
    setThreatLevel("CRITICAL_SOS");
    setDistressScore(100);
  };

  const handleConfirmSosFromPrompt = () => {
    setIsSosPromptOpen(false);
    const incident: IncidentReport = {
      incidentId: `INC-PAK-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString(),
      isoTime: new Date().toISOString(),
      severity: "CRITICAL_SOS",
      category: "VOICE_DISTRESS_SCREAM",
      summary: `SOS confirmed. Alerted ${emergencyNumber} and ${emergencyContacts.length} contacts.`,
      detectedKeywords: ["sos_confirmed"],
      transcriptSnippet: "EMERGENCY SOS CONFIRMED",
      riderTone: "Emergency",
      driverTone: "Unknown",
      backgroundAcoustic: "UNKNOWN",
      distressScore: 100,
      gpsCoordinates: { lat: pickup.lat, lng: pickup.lng, address: `${pickup.title}, ${pickup.city}` },
      vehicleDetails: {
        driverName: selectedDriver.name,
        vehicle: selectedDriver.carModel,
        plate: selectedDriver.licensePlate,
        riderName: "Passenger",
        driverPhone: selectedDriver.phone,
      },
      emergencyDispatched: true,
      dispatchUnit: `POLICE ${emergencyNumber} / RESCUE 1122`,
      dialedNumber: emergencyNumber,
      actionsTaken: [
        "SOS confirmed by rider",
        `Alert sent to ${emergencyNumber}`,
        `Notified ${emergencyContacts.length} contacts`,
      ],
    };
    setLatestIncidentReport(incident);
    setIsEmergencyDialerOpen(true);
  };

  const handleCancelSosPrompt = () => {
    setIsSosPromptOpen(false);
    setThreatLevel("NORMAL");
    setDistressScore(0);
  };

  const handleTriggerEmergencyDispatch = (report: IncidentReport) => {
    setLatestIncidentReport(report);
    setThreatLevel("CRITICAL_SOS");
    setDistressScore(100);
    setIsEmergencyDialerOpen(true);
  };

  const handleCancelEmergencyWithPin = (pin: string) => {
    if (pin === "4321") {
      setThreatLevel("NORMAL");
      setDistressScore(0);
      setIsEmergencyDialerOpen(false);
      setIsEmergencyReportModalOpen(false);
      return true;
    }
    return false;
  };

  const handleResetRide = () => {
    setRideStatus("SELECTING_DESTINATION");
    setTripProgress(0);
    setIsAudioMonitoringActive(false);
    audioSafety.stopMonitoring();
    setThreatLevel("NORMAL");
    setDistressScore(0);
    setLatestIncidentReport(null);
    setIsSosPromptOpen(false);
    setIsEmergencyDialerOpen(false);
    setIsEmergencyReportModalOpen(false);
    setRoutes([]);
    setSelectedRouteId(null);
    setDeviationPosition(null);
    setDeviationAlert({ isActive: false, deviationMeters: 0, durationSeconds: 0, acknowledged: false });
    deviationStartRef.current = 0;
  };

  const handleGoHome = () => {
    audioSafety.stopMonitoring();
    setRideStatus('WELCOME_LANDING');
  };

  // ── Auto-SOS: trigger when dial stays at 100 for 7 seconds ─────
  const criticalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (rideStatus !== 'IN_TRIP') return;
    
    // If distress score is at max (100), start the countdown
    if (distressScore >= 95 && !autoSosTriggeredRef.current) {
      console.log('[Auto-SOS] Score at critical, starting 7s countdown...');
      if (!criticalTimerRef.current) {
        criticalTimerRef.current = setTimeout(() => {
          if (distressScore >= 95 && !autoSosTriggeredRef.current) {
            autoSosTriggeredRef.current = true;
            console.log('[Auto-SOS] 7s elapsed at 100 — Triggering SOS!');
            handleTriggerSosPrompt(3);
          }
          criticalTimerRef.current = null;
        }, 7000);
      }
    } else {
      // Score dropped, cancel the timer
      if (criticalTimerRef.current) {
        console.log('[Auto-SOS] Score dropped, canceling countdown');
        clearTimeout(criticalTimerRef.current);
        criticalTimerRef.current = null;
      }
      // Reset auto-trigger flag when score goes back to normal
      if (distressScore < 50) {
        autoSosTriggeredRef.current = false;
      }
    }
    
    return () => {
      if (criticalTimerRef.current) {
        clearTimeout(criticalTimerRef.current);
        criticalTimerRef.current = null;
      }
    };
  }, [distressScore, rideStatus]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar
        rideStatus={rideStatus}
        threatLevel={threatLevel}
        onOpenDriverModal={() => setIsDriverModalOpen(true)}
        onResetRide={handleResetRide}
        onGoHome={handleGoHome}
        onOpenPaymentMethods={() => setIsPaymentMethodsModalOpen(true)}
        onOpenEmergencyContacts={() => setIsEmergencyContactsModalOpen(true)}
        onOpenAiFeedback={() => setIsAiFeedbackModalOpen(true)}
        isAudioMonitoringActive={isAudioMonitoringActive}
        emergencyContactCount={emergencyContacts.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── WELCOME LANDING ────────────────────────────────────── */}
        {rideStatus === "WELCOME_LANDING" && (
          <WelcomeLanding
            onBookRide={() => setRideStatus("SELECTING_DESTINATION")}
            onBeADriver={() => setIsDriverModalOpen(true)}
            onOpenEmergencyContacts={() => setIsEmergencyContactsModalOpen(true)}
          />
        )}

        {/* ── BOOKING FLOW ───────────────────────────────────────── */}
        {rideStatus !== "WELCOME_LANDING" && rideStatus !== "IN_TRIP" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-4">
              <LiveMap
                pickup={pickup}
                dropoff={dropoff}
                rideStatus={rideStatus}
                threatLevel={threatLevel}
                tripProgress={tripProgress}
                selectedDriver={selectedDriver}
                isAudioMonitoring={isAudioMonitoringActive}
                routes={routes}
                selectedRouteId={selectedRouteId}
                deviationPosition={deviationPosition}
              />
            </div>

            <div className="lg:col-span-7 space-y-4">
              <PassengerBookingFlow
                rideStatus={rideStatus}
                setRideStatus={setRideStatus}
                pickup={pickup}
                setPickup={setPickup}
                dropoff={dropoff}
                setDropoff={setDropoff}
                selectedDriver={selectedDriver}
                setSelectedDriver={setSelectedDriver}
                onConfirmRide={handleConfirmRide}
                onSelectDriverAndProceed={handleSelectDriverAndProceed}
                onStartTrip={handleStartTrip}
                onCancelRide={handleResetRide}
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
              />
            </div>
          </div>
        )}

        {/* ── IN-TRIP VIEW ──────────────────────────────────────────── */}
        {rideStatus === "IN_TRIP" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Top row: Map (left) + Gauge (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Map - smaller width */}
              <div className="lg:col-span-8">
                <LiveMap
                  pickup={pickup}
                  dropoff={dropoff}
                  rideStatus={rideStatus}
                  threatLevel={threatLevel}
                  tripProgress={tripProgress}
                  selectedDriver={selectedDriver}
                  isAudioMonitoring={isAudioMonitoringActive}
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  deviationPosition={deviationPosition}
                />
              </div>
              
              {/* Gauge + Safety Monitor - right side */}
              <div className="lg:col-span-4">
                <AudioSafetyMonitor
                  threatLevel={threatLevel}
                  distressScore={distressScore}
                  onTriggerSos={() => handleTriggerSosPrompt(3)}
                  onTriggerEmergencyDispatch={handleTriggerEmergencyDispatch}
                  pickup={pickup}
                  dropoff={dropoff}
                  driver={selectedDriver}
                  emergencyNumber={emergencyNumber}
                  emergencyContacts={emergencyContacts}
                  onOpenEmergencyContacts={() => setIsEmergencyContactsModalOpen(true)}
                  deviationAlert={deviationAlert}
                  onDeviationAcknowledge={handleDeviationAcknowledge}
                  onDeviationHelp={handleDeviationHelp}
                  dialLabel={audioSafety.dialLabel}
          getAudioLevels={audioSafety.getAudioLevels}
                  lastResult={audioSafety.lastResult}
                  transcript={audioSafety.transcript}
                  isAudioMonitoring={isAudioMonitoringActive}
                  onOpenDashboard={() => setIsDashboardModalOpen(true)}
                />
              </div>
            </div>

            {/* Route selector (compact) */}
            {routes.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      selectedRouteId === route.id
                        ? "bg-cyan-950/50 border-cyan-500 text-cyan-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="block">{route.summary}</span>
                    <span className="text-[10px] font-mono opacity-70">
                      {route.distanceKm} km · {route.durationMin} min
                    </span>
                    <span
                      className={`block text-[9px] mt-0.5 ${
                        route.safetyLevel === "safe"
                          ? "text-emerald-400"
                          : route.safetyLevel === "moderate"
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {route.safetyLevel === "safe" ? "Safe" : route.safetyLevel === "moderate" ? "Moderate" : "Less safe"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Compact safety + driver row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Driver card (compact, no call button) */}
              <div className="lg:col-span-5">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedDriver.photoUrl}
                      alt={selectedDriver.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{selectedDriver.name}</h4>
                        <span className="text-xs text-amber-400 font-semibold">★ {selectedDriver.rating}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedDriver.carModel}
                      </p>
                      <div className="text-xs text-cyan-400 font-mono font-bold mt-1">
                        {selectedDriver.licensePlate}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency contacts */}
              <div className="lg:col-span-7">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Siren className="w-4 h-4 text-red-400" />
                      Emergency Contacts
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {emergencyContacts.length} contacts saved. In emergency, SOS auto-alerts them with your GPS location.
                  </p>
                  <button
                    onClick={() => setIsEmergencyContactsModalOpen(true)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/30 transition-colors"
                  >
                    View/Edit Contacts
                  </button>
                </div>
              </div>
            </div>

            {/* End trip button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={() => {
                  setRideStatus("TRIP_COMPLETED");
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                Complete Trip
              </button>
            </div>
          </div>
        )}

        {/* ── TRIP COMPLETED ─────────────────────────────────────── */}
        {rideStatus === "TRIP_COMPLETED" && (
          <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Arrived safely!</h3>
              <p className="text-xs text-slate-300 mt-1">
                {dropoff.title} · Rs. {selectedDriver.fareOfferPkr}
              </p>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 text-xs text-left space-y-2.5">
              <div className="flex justify-between text-slate-300">
                <span>Duration:</span>
                <span className="font-semibold text-white">{Math.round(tripProgress / 6)} mins</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Safety:</span>
                <span className="font-semibold text-emerald-400">Monitored</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Payment:</span>
                <span className="font-semibold text-white capitalize">{selectedPaymentMethod.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Driver:</span>
                <span className="font-semibold text-white">{selectedDriver.name}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setIsAiFeedbackModalOpen(true)}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Feedback
              </button>
              <button
                onClick={handleResetRide}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Book Another
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <AudioSafetyPermissionModal
        isOpen={isAudioPermissionModalOpen}
        onAllow={handleAllowAudioMonitoring}
        onDecline={handleDeclineAudioMonitoring}
      />

      <SosPromptModal
        isOpen={isSosPromptOpen}
        onConfirmSos={handleConfirmSosFromPrompt}
        onCancel={handleCancelSosPrompt}
        riskCount={sosRiskCount}
        emergencyNumber={emergencyNumber}
      />

      <EmergencyDialerModal
        isOpen={isEmergencyDialerOpen}
        onClose={() => setIsEmergencyDialerOpen(false)}
        report={latestIncidentReport}
        emergencyNumber={emergencyNumber}
        onUpdateEmergencyNumber={setEmergencyNumber}
        emergencyContacts={emergencyContacts}
      />

      <EmergencyDispatchModal
        report={latestIncidentReport}
        isOpen={isEmergencyReportModalOpen}
        onClose={() => setIsEmergencyReportModalOpen(false)}
        onCancelEmergency={handleCancelEmergencyWithPin}
      />

      <DriverRegistrationModal isOpen={isDriverModalOpen} onClose={() => setIsDriverModalOpen(false)} />

      <EmergencyContactsModal
        isOpen={isEmergencyContactsModalOpen}
        onClose={() => setIsEmergencyContactsModalOpen(false)}
        contacts={emergencyContacts}
        onSaveContacts={handleSaveEmergencyContacts}
      />

      <PaymentMethodsModal
        isOpen={isPaymentMethodsModalOpen}
        onClose={() => setIsPaymentMethodsModalOpen(false)}
        selectedMethod={selectedPaymentMethod}
        onSelectMethod={setSelectedPaymentMethod}
      />

      <AIFeedbackModal
        isOpen={isAiFeedbackModalOpen}
        onClose={() => setIsAiFeedbackModalOpen(false)}
        onSubmitFeedback={(record) => setFeedbackRecords((prev) => [record, ...prev])}
      />

      <AudioSafetyDashboardModal
        isOpen={isDashboardModalOpen}
        onClose={() => setIsDashboardModalOpen(false)}
      />
    </div>
  );
}