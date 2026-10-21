import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import {
  MapPin,
  Car,
  Clock,
  Gauge,
  RotateCcw,
  Layers,
  ZoomIn,
  ZoomOut,
  Shield,
  Navigation,
} from "lucide-react";
import { LocationItem, RideStatus, ThreatLevel, DriverProfile, RouteOption } from "../types";
import { NEARBY_DRIVERS_MAP } from "../data/rideData";

interface LiveMapProps {
  pickup: LocationItem;
  dropoff: LocationItem;
  rideStatus: RideStatus;
  threatLevel: ThreatLevel;
  tripProgress: number;
  selectedDriver?: DriverProfile;
  isAudioMonitoring: boolean;
  routes: RouteOption[];
  selectedRouteId: string | null;
  deviationPosition: { lat: number; lng: number } | null;
}

// Free tile sources - no API key, no watermark:
// OSM standard = normal street map (inDrive-style), Esri = satellite imagery.
// CARTO basemaps were dropped: they now stamp "API KEY REQUIRED" over tiles.
type MapTheme = "osm" | "satellite";
const TILE_URLS: Record<MapTheme, string> = {
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

export const LiveMap: React.FC<LiveMapProps> = ({
  pickup,
  dropoff,
  rideStatus,
  threatLevel,
  tripProgress,
  selectedDriver,
  isAudioMonitoring,
  routes,
  selectedRouteId,
  deviationPosition,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const routePolylinesRef = useRef<L.Polyline[]>([]);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const nearbyMarkersRef = useRef<L.Marker[]>([]);
  const deviationMarkerRef = useRef<L.Marker | null>(null);

  const [mapTheme, setMapTheme] = useState<MapTheme>("osm");
  const [nearbyDrivers, setNearbyDrivers] = useState(NEARBY_DRIVERS_MAP);

  // Use selected route geometry or fallback to straight line
  const activeRoute = useMemo(() => {
    if (routes.length === 0) return null;
    return routes.find((r) => r.id === selectedRouteId) || routes[0];
  }, [routes, selectedRouteId]);

  const routeCoordinates = useMemo<[number, number][]>(() => {
    if (activeRoute && activeRoute.geometry.length > 0) return activeRoute.geometry;
    // No fake straight line between pins any more: until a real OSRM route
    // arrives, the car simply waits at the pickup point.
    return [
      [pickup.lat, pickup.lng],
      [pickup.lat, pickup.lng],
    ];
  }, [activeRoute, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  // Interpolate along route according to progress percentage
  const getPositionAlongRoute = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    const totalSegments = routeCoordinates.length - 1;
    const progressPerSegment = 100 / totalSegments;
    const segmentIndex = Math.min(Math.floor(clamped / progressPerSegment), totalSegments - 1);
    const segmentProgress = (clamped % progressPerSegment) / progressPerSegment;

    const p1 = routeCoordinates[segmentIndex];
    const p2 = routeCoordinates[segmentIndex + 1] || p1;

    const lat = p1[0] + (p2[0] - p1[0]) * segmentProgress;
    const lng = p1[1] + (p2[1] - p1[1]) * segmentProgress;

    const dLat = p2[0] - p1[0];
    const dLng = p2[1] - p1[1];
    const angleDeg = (Math.atan2(dLng, dLat) * 180) / Math.PI;

    return { lat, lng, angle: angleDeg };
  };

  const currentCarPos = getPositionAlongRoute(
    rideStatus === "IN_TRIP" ? tripProgress : rideStatus === "DRIVER_ASSIGNED" ? 15 : 0
  );

  // Nearby driver drift
  useEffect(() => {
    if (rideStatus === "IN_TRIP") return;
    const interval = setInterval(() => {
      setNearbyDrivers((prev) =>
        prev.map((d) => ({
          ...d,
          lat: d.lat + (Math.random() - 0.5) * 0.0003,
          lng: d.lng + (Math.random() - 0.5) * 0.0003,
          heading: (d.heading + (Math.random() - 0.5) * 20) % 360,
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [rideStatus]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const centerLat = (pickup.lat + dropoff.lat) / 2;
    const centerLng = (pickup.lng + dropoff.lng) / 2;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    const tileLayer = L.tileLayer(TILE_URLS[mapTheme], {
      maxZoom: 19,
      subdomains: "abc",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update tile layer on theme change
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(TILE_URLS[mapTheme]);
  }, [mapTheme]);

  // Render route polylines (selected = solid, alternatives = faded)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear old route lines
    routePolylinesRef.current.forEach((p) => p.remove());
    routePolylinesRef.current = [];

        // Paths are back (2026-10-21) but structurally honest: App only ever
    // passes routes that belong to the CURRENT pickup/dropoff pair, so a
    // line can never depict someone else's journey. No data = no lines,
    // just the two pins framed in view.
    if (routes.length === 0) {
      if (pickup && dropoff) {
        map.fitBounds(
          [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]] as L.LatLngExpression[],
          { padding: [60, 60] }
        );
      }
      return;
    }

    // Draw alternative routes first (faded)
    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId || (!selectedRouteId && route.id === routes[0].id);
      if (isSelected) return; // draw selected last so it's on top

      const line = L.polyline(route.geometry, {
        color: route.color || "#475569",
        weight: 4,
        opacity: 0.4,
        dashArray: "8, 8",
      }).addTo(map);
      routePolylinesRef.current.push(line);
    });

    // Draw selected route (solid, colored by threat)
    const selected = routes.find((r) => r.id === selectedRouteId) || routes[0];
    const routeColor =
      threatLevel === "CRITICAL_SOS" ? "#ef4444" : threatLevel === "ELEVATED" ? "#f59e0b" : "#0284c7";

    const selectedLine = L.polyline(selected.geometry, {
      color: routeColor,
      weight: 5,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);
    routePolylinesRef.current.push(selectedLine);

    // Fit bounds
    map.fitBounds(selectedLine.getBounds(), { padding: [50, 50] });
  }, [routes, selectedRouteId, threatLevel, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  // Pickup / Dropoff markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    pickupMarkerRef.current?.remove();
    const pickupHtml = `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="background:#059669;color:white;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;border:1.5px solid white;box-shadow:0 4px 6px -1px rgba(0,0,0,0.5);white-space:nowrap;margin-bottom:2px;">
          PICKUP: ${pickup.title.split(",")[0]}
        </div>
        <div style="width:16px;height:16px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 0 10px #10b981;"></div>
      </div>`;
    pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], {
      icon: L.divIcon({ className: "custom-pickup-pin", html: pickupHtml, iconSize: [120, 36], iconAnchor: [60, 36] }),
    }).addTo(map);

    dropoffMarkerRef.current?.remove();
    const dropoffHtml = `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="background:#dc2626;color:white;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;border:1.5px solid white;box-shadow:0 4px 6px -1px rgba(0,0,0,0.5);white-space:nowrap;margin-bottom:2px;">
          DROPOFF: ${dropoff.title.split(",")[0]}
        </div>
        <div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 10px #ef4444;"></div>
      </div>`;
    dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], {
      icon: L.divIcon({ className: "custom-dropoff-pin", html: dropoffHtml, iconSize: [120, 36], iconAnchor: [60, 36] }),
    }).addTo(map);
  }, [pickup, dropoff]);

  // Nearby driver markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    nearbyMarkersRef.current.forEach((m) => m.remove());
    nearbyMarkersRef.current = [];

    if (rideStatus !== "IN_TRIP") {
      nearbyDrivers.forEach((driver) => {
        const isFem = driver.isFemale;
        const color = isFem ? "#e11d48" : "#0284c7";
        const iconHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="transform:rotate(${driver.heading}deg);width:26px;height:26px;border-radius:50%;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 6px rgba(0,0,0,0.4);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            <div style="background:rgba(15,23,42,0.9);color:${isFem ? "#fecdd3" : "#bae6fd"};font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;border:1px solid ${color};white-space:nowrap;margin-top:2px;">
              ${isFem ? "🌸 " : ""}${driver.name.split(" ")[0]}
            </div>
          </div>`;
        const marker = L.marker([driver.lat, driver.lng], {
          icon: L.divIcon({ className: "nearby-driver-icon", html: iconHtml, iconSize: [70, 44], iconAnchor: [35, 22] }),
        }).addTo(map);
        nearbyMarkersRef.current.push(marker);
      });
    }
  }, [nearbyDrivers, rideStatus]);

  // Active car marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (rideStatus === "IN_TRIP" || rideStatus === "DRIVER_ASSIGNED") {
      const isFem = selectedDriver?.isFemaleDriver;
      const isCritical = threatLevel === "CRITICAL_SOS";
      const carColor = isCritical ? "#ef4444" : isFem ? "#e11d48" : "#0284c7";

      const carHtml = `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
          <div style="position:absolute;width:${isCritical ? "40" : "34"}px;height:${isCritical ? "40" : "34"}px;border-radius:50%;background:${isCritical ? "rgba(239,68,68,0.4)" : "rgba(6,182,212,0.35)"};animation:${isCritical ? "ping" : "pulse"} 1.5s infinite;"></div>
          <div style="transform:rotate(${currentCarPos.angle}deg);width:32px;height:32px;border-radius:50%;background:${carColor};border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.6);z-index:10;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
        </div>`;

      const carIcon = L.divIcon({ className: "active-car-icon", html: carHtml, iconSize: [44, 44], iconAnchor: [22, 22] });

      if (!carMarkerRef.current) {
        carMarkerRef.current = L.marker([currentCarPos.lat, currentCarPos.lng], { icon: carIcon, zIndexOffset: 1000 }).addTo(map);
      } else {
        carMarkerRef.current.setLatLng([currentCarPos.lat, currentCarPos.lng]);
        carMarkerRef.current.setIcon(carIcon);
      }

      if (rideStatus === "IN_TRIP") {
        map.panTo([currentCarPos.lat, currentCarPos.lng], { animate: true, duration: 0.8 });
      }
    } else {
      carMarkerRef.current?.remove();
      carMarkerRef.current = null;
    }
  }, [currentCarPos.lat, currentCarPos.lng, currentCarPos.angle, rideStatus, threatLevel, selectedDriver]);

  // Deviation marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    deviationMarkerRef.current?.remove();
    deviationMarkerRef.current = null;

    if (deviationPosition) {
      const devHtml = `
        <div style="width:20px;height:20px;border-radius:50%;background:#f59e0b;border:3px solid white;box-shadow:0 0 12px #f59e0b;animation:pulse 1s infinite;"></div>`;
      deviationMarkerRef.current = L.marker([deviationPosition.lat, deviationPosition.lng], {
        icon: L.divIcon({ className: "deviation-marker", html: devHtml, iconSize: [20, 20], iconAnchor: [10, 10] }),
      }).addTo(map);
    }
  }, [deviationPosition]);

  // Recenter
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !routePolylinesRef.current.length) return;
    if (rideStatus === "IN_TRIP") {
      mapInstanceRef.current.setView([currentCarPos.lat, currentCarPos.lng], 15);
    } else {
      const line = routePolylinesRef.current[routePolylinesRef.current.length - 1];
      if (line) mapInstanceRef.current.fitBounds(line.getBounds(), { padding: [50, 50] });
    }
  };

  // HUD stats
  const routeDist = activeRoute?.distanceKm ?? 7.8;
  const remainingKm = Math.max(0.3, Number((routeDist * (1 - tripProgress / 100)).toFixed(1)));
  const remainingMinutes = Math.max(1, Math.ceil((activeRoute?.durationMin ?? 15) * (1 - tripProgress / 100)));
  // Average speed derived from this route's real distance and drive time.
  // Labelled "avg" so nobody reads it as a GPS-measured speed - the car
  // marker is an animation, so an instantaneous speed would be a lie.
  const durMin = Math.max(1, activeRoute?.durationMin ?? 15);
  const avgKmH = rideStatus === "IN_TRIP" ? Math.round((routeDist / durMin) * 60) : 0;

  return (
    <div className="relative w-full h-[300px] sm:h-[350px] lg:h-[400px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2 text-xs flex items-center gap-3 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-black text-white uppercase tracking-wider text-[11px]">
              {pickup.city}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              <strong>{remainingMinutes} min</strong> ({remainingKm} km)
            </span>
          </div>
          {rideStatus === "IN_TRIP" && (
            <>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>{avgKmH} km/h avg</span>
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs shadow-xl pointer-events-auto">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-white font-bold text-[11px]">Police 15</span>
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl flex flex-col gap-1">
          <button
            onClick={() => setMapTheme((c) => (c === "osm" ? "satellite" : "osm"))}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
            title="Map style"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={handleRecenter}
            className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
            title="Recenter"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl flex flex-col gap-1">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
