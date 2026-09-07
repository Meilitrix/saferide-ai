import React, { useState } from "react";
import {
  MapPin,
  Car,
  ChevronRight,
  Radar,
  Phone,
  X,
  Shield,
  Clock,
  Navigation,
  Search,
} from "lucide-react";
import {
  LocationItem,
  RideStatus,
  DriverProfile,
  RouteOption,
} from "../types";
import {
  POPULAR_LOCATIONS,
  AVAILABLE_PAKISTANI_DRIVERS,
} from "../data/rideData";

interface PassengerBookingFlowProps {
  rideStatus: RideStatus;
  setRideStatus: (status: RideStatus) => void;
  pickup: LocationItem;
  setPickup: (loc: LocationItem) => void;
  dropoff: LocationItem;
  setDropoff: (loc: LocationItem) => void;
  selectedDriver: DriverProfile;
  setSelectedDriver: (driver: DriverProfile) => void;
  onConfirmRide: () => void;
  onSelectDriverAndProceed: (driver: DriverProfile) => void;
  onStartTrip: () => void;
  onCancelRide: () => void;
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
}

export const PassengerBookingFlow: React.FC<PassengerBookingFlowProps> = ({
  rideStatus,
  setRideStatus,
  pickup,
  setPickup,
  dropoff,
  setDropoff,
  selectedDriver,
  setSelectedDriver,
  onConfirmRide,
  onSelectDriverAndProceed,
  onStartTrip,
  onCancelRide,
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  const [activeSearchField, setActiveSearchField] = useState<"pickup" | "dropoff" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [driverGenderFilter, setDriverGenderFilter] = useState<"all" | "female">("all");

  const filteredLocations = POPULAR_LOCATIONS.filter(
    (loc) =>
      loc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableDriversList = AVAILABLE_PAKISTANI_DRIVERS.filter((drv) => {
    if (driverGenderFilter === "female") return drv.isFemaleDriver;
    return true;
  });

  const handleSelectRouteAndContinue = () => {
    if (!selectedRouteId && routes.length > 0) {
      onSelectRoute(routes[0].id);
    }
    setRideStatus("SEARCHING_DRIVER");
  };

  return (
    <div
      id="passenger-booking-panel"
      className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-100 flex flex-col"
    >
      {/* Top Header */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            {rideStatus === "SELECTING_DESTINATION" || rideStatus === "ROUTE_SELECTION"
              ? "Set Route"
              : rideStatus === "SEARCHING_DRIVER" || rideStatus === "CHOOSING_DRIVER"
              ? "Captains Nearby"
              : "Captain Arriving"}
          </span>
        </div>

        {(rideStatus === "ROUTE_SELECTION" || rideStatus === "SEARCHING_DRIVER" || rideStatus === "CHOOSING_DRIVER") && (
          <button
            onClick={() => {
              if (rideStatus === "SEARCHING_DRIVER" || rideStatus === "CHOOSING_DRIVER") setRideStatus("ROUTE_SELECTION");
              else setRideStatus("SELECTING_DESTINATION");
            }}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Change
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* STEP 1: PICK LOCATIONS                                         */}
      {/* ============================================================== */}
      {rideStatus === "SELECTING_DESTINATION" && (
        <div className="p-4 space-y-3.5">
          {/* Route Input */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
            {/* Pickup */}
            <div
              onClick={() => {
                setActiveSearchField("pickup");
                setSearchQuery("");
              }}
              className={`p-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
                activeSearchField === "pickup" ? "bg-slate-800" : "hover:bg-slate-900"
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Pickup</span>
                <p className="text-xs font-bold text-white truncate">{pickup.title}</p>
                <p className="text-[10px] text-slate-400 truncate">{pickup.subtitle}</p>
              </div>
            </div>

            <div className="h-px bg-slate-800 ml-6" />

            {/* Dropoff */}
            <div
              onClick={() => {
                setActiveSearchField("dropoff");
                setSearchQuery("");
              }}
              className={`p-2.5 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
                activeSearchField === "dropoff" ? "bg-slate-800" : "hover:bg-slate-900"
              }`}
            >
              <div className="w-3 h-3 rounded-sm bg-rose-500 ring-4 ring-rose-500/20 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Where to?</span>
                <p className="text-xs font-bold text-white truncate">{dropoff.title}</p>
                <p className="text-[10px] text-slate-400 truncate">{dropoff.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Location Search */}
          {activeSearchField && (
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search in ${pickup.city}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {filteredLocations.slice(0, 5).map((loc) => (
                  <div
                    key={loc.id}
                    onClick={() => {
                      if (activeSearchField === "pickup") setPickup(loc);
                      else setDropoff(loc);
                      setActiveSearchField(null);
                    }}
                    className="p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 cursor-pointer flex items-center gap-2.5 border border-slate-800/60 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">{loc.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{loc.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue to Route Selection */}
          <button
            onClick={() => setRideStatus("ROUTE_SELECTION")}
            className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <span>See Routes</span>
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 2: ROUTE SELECTION                                        */}
      {/* ============================================================== */}
      {rideStatus === "ROUTE_SELECTION" && (
        <div className="p-4 space-y-3.5">
          {/* Safety note */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All routes monitored by AI + Police 15</span>
          </div>

          {/* Route list */}
          {routes.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Choose your route
              </span>
              {routes.map((route) => (
                <div
                  key={route.id}
                  onClick={() => onSelectRoute(route.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedRouteId === route.id
                      ? "bg-cyan-950/40 border-cyan-400 shadow-sm"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      route.safetyLevel === "safe"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : route.safetyLevel === "moderate"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-red-500/15 text-red-400 border border-red-500/30"
                    }`}>
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{route.summary}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {route.durationMin} min
                        </span>
                        <span className="text-[11px] text-slate-400">{route.distanceKm} km</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      route.safetyLevel === "safe"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : route.safetyLevel === "moderate"
                        ? "bg-amber-950 text-amber-300 border border-amber-800"
                        : "bg-red-950 text-red-300 border border-red-800"
                    }`}>
                      {route.safetyLevel === "safe" ? "Safe" : route.safetyLevel === "moderate" ? "Moderate" : "Less safe"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              <div className="animate-pulse">Loading routes...</div>
            </div>
          )}

          {/* Continue to find captains */}
          <button
            onClick={handleSelectRouteAndContinue}
            disabled={routes.length === 0}
            className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Radar className="w-4 h-4 text-slate-950" />
            <span>Find Captains</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 3: CHOOSE CAPTAIN                                         */}
      {/* ============================================================== */}
      {(rideStatus === "SEARCHING_DRIVER" || rideStatus === "CHOOSING_DRIVER") && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radar className="w-4 h-4 text-cyan-400 animate-spin" />
              <h3 className="text-xs font-bold text-white">Nearby Captains</h3>
            </div>
            <span className="text-xs text-slate-400">{availableDriversList.length} available</span>
          </div>

          {/* Filter */}
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setDriverGenderFilter("all")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                driverGenderFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All ({AVAILABLE_PAKISTANI_DRIVERS.length})
            </button>
            <button
              onClick={() => setDriverGenderFilter("female")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                driverGenderFilter === "female"
                  ? "bg-rose-950 text-rose-300 border border-rose-600"
                  : "text-rose-400 hover:text-rose-300"
              }`}
            >
              Khwateen
            </button>
          </div>

          {/* Driver List */}
          <div className="space-y-2 no-scrollbar">
            {availableDriversList.map((driver) => (
              <div
                key={driver.id}
                className={`p-3 rounded-xl border transition-all ${
                  driver.isFemaleDriver
                    ? "bg-slate-950/70 border-rose-900/60"
                    : "bg-slate-950/70 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={driver.photoUrl}
                      alt={driver.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white truncate">{driver.name}</span>
                        <span className="text-amber-400 text-[10px] font-bold">★ {driver.rating}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {driver.carModel} · <span className="font-mono text-slate-300">{driver.licensePlate}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-white">Rs. {driver.fareOfferPkr}</div>
                      <div className="text-[10px] text-slate-400">{driver.etaMinutes} min</div>
                    </div>
                    <button
                      onClick={() => onSelectDriverAndProceed(driver)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 4: CAPTAIN ARRIVING                                       */}
      {/* ============================================================== */}
      {rideStatus === "DRIVER_ASSIGNED" && (
        <div className="p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">
              Arriving in {selectedDriver.etaMinutes} min
            </span>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {selectedDriver.licensePlate}
            </span>
          </div>

          {/* Driver Card */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center gap-3">
            <img
              src={selectedDriver.photoUrl}
              alt={selectedDriver.name}
              className="w-11 h-11 rounded-xl object-cover border border-slate-700"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">{selectedDriver.name}</span>
                <span className="text-[11px] font-bold text-amber-400">★ {selectedDriver.rating}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {selectedDriver.carModel} · {selectedDriver.carColor}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onCancelRide}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onStartTrip}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Car className="w-4 h-4 text-slate-950" />
              <span>Start Trip</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
