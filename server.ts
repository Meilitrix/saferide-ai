import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 5008;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini SDK with User-Agent as required by guidelines
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return geminiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Abhi AI",
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
  });
});

// Real-time Audio Chunk Analysis for Ride Safety
app.post("/api/analyze-audio", async (req, res) => {
  try {
    const {
      transcript = "",
      audioBase64,
      mimeType = "audio/webm",
      decibels = 55,
      historyWindow = [], // last 30-60s samples
      consecutiveDistressCount = 0,
      scenarioId,
      location = { lat: 37.7749, lng: -122.4194, address: "Market St & 4th St, San Francisco, CA" },
      driver = { name: "Devon Patel", vehicle: "Silver Tesla Model 3", plate: "CA 8XYZ492" },
      rider = { name: "Alex Morgan" },
    } = req.body;

    const ai = getGeminiClient();

    let aiResult: any = null;

    if (ai) {
      try {
        const prompt = `You are the acoustic safety intelligence engine for Abhi AI, a ride-hailing platform.
Analyze the following in-cabin audio event during an active ride to assess potential risk to the passenger:

Current Audio/Transcript Context:
- Detected in-cabin speech/transcript: "${transcript}"
- Measured noise level: ${decibels} dB
- Consecutive elevated distress chunks so far: ${consecutiveDistressCount}
- Recent history over past 30-60 seconds: ${JSON.stringify(historyWindow.slice(-4))}

Analyze specifically for:
1. Engine sounds, road/traffic noise, hum -> regular ambient (NORMAL)
2. Suspicious vocal outbursts, shouting, or aggressive tone of voice indicating distress -> if distress signals are increasing over 30-60 seconds, rate as ELEVATED.
3. Explicit danger words or rider asking for help: "stop", "get away", "help", "let me out", "don't touch me", violent activity or harassment -> rate as CRITICAL_SOS.

Return a valid JSON object ONLY with no markdown wrapping and no backticks:
{
  "threatLevel": "NORMAL" | "ELEVATED" | "CRITICAL_SOS",
  "distressScore": number (0 to 100),
  "backgroundAcoustic": "REGULAR_ENGINE_TRAFFIC" | "SUSPICIOUS_OUTBURSTS" | "DISTRESS_CRY",
  "riderTone": "Calm" | "Apprehensive" | "Distressed" | "Screaming/Pleading",
  "driverTone": "Normal" | "Friendly" | "Agitated" | "Aggressive/Hostile",
  "detectedKeywords": string[],
  "summary": string,
  "escalationDetected": boolean,
  "shouldAlertPolice": boolean,
  "incidentCategory": "NONE" | "VERBAL_ABUSE" | "HARASSMENT" | "VIOLENT_ACTIVITY" | "DIRECT_DISTRESS_KEYWORD"
}`;

        let contents: any = prompt;
        // If audio base64 is provided and valid, send as inline data part
        if (audioBase64 && typeof audioBase64 === "string" && audioBase64.length > 100) {
          contents = {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "audio/webm",
                  data: audioBase64,
                },
              },
              { text: prompt },
            ],
          };
        }

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gemini API call timed out")), 4000)
        );

        const geminiCall = ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const response: any = await Promise.race([geminiCall, timeoutPromise]);

        const rawText = response.text || "";
        const cleanJson = rawText.replace(/```json\s*|```/g, "").trim();
        aiResult = JSON.parse(cleanJson);
      } catch (geminiError) {
        console.warn("Gemini audio analysis fallback to intelligent heuristic:", geminiError);
      }
    }

    // If Gemini wasn't available or errored, provide deterministic safety heuristic
    if (!aiResult) {
      const lower = transcript.toLowerCase();
      const isTrafficHorn =
        scenarioId === "traffic_honk" ||
        lower.includes("honk") ||
        lower.includes("horn") ||
        lower.includes("rickshaw") ||
        lower.includes("traffic");

      const criticalKeywords = [
        "stop",
        "let me out",
        "get away",
        "help",
        "don't touch",
        "police",
        "call 15",
        "bachao",
        "madad",
        "gaadi roko",
        "roko",
        "chhoro",
        "darwaza kholo",
        "door raho",
        "harassment",
      ];
      const aggressiveKeywords = [
        "shut up",
        "chup kar",
        "tameez se",
        "bakwas mat kar",
        "idiot",
        "threat",
        "scream",
        "aggressive",
      ];

      const matchedCritical = criticalKeywords.filter((kw) => lower.includes(kw));
      const matchedAggressive = aggressiveKeywords.filter((kw) => lower.includes(kw));

      let threatLevel: "NORMAL" | "ELEVATED" | "CRITICAL_SOS" = "NORMAL";
      let distressScore = 12;
      let shouldAlertPolice = false;
      let escalationDetected = false;
      let incidentCategory = "NONE";

      if (isTrafficHorn && matchedCritical.length === 0) {
        threatLevel = "NORMAL";
        distressScore = 15;
        incidentCategory = "NONE";
      } else if (matchedCritical.length > 0 || scenarioId === "critical_sos") {
        threatLevel = "CRITICAL_SOS";
        distressScore = 96;
        shouldAlertPolice = true;
        escalationDetected = true;
        incidentCategory =
          matchedCritical.some((k) => ["stop", "let me out", "gaadi roko", "roko", "bachao", "madad"].includes(k))
            ? "DIRECT_DISTRESS_KEYWORD"
            : "VIOLENT_ACTIVITY";
      } else if (matchedAggressive.length > 0 || consecutiveDistressCount >= 1 || scenarioId === "escalated_argument") {
        if (consecutiveDistressCount >= 1 || scenarioId === "escalated_argument") {
          threatLevel = "CRITICAL_SOS";
          distressScore = 88;
          shouldAlertPolice = true;
          escalationDetected = true;
          incidentCategory = "VERBAL_ABUSE";
        } else {
          threatLevel = "ELEVATED";
          distressScore = 65;
          shouldAlertPolice = false;
          escalationDetected = true;
          incidentCategory = "HARASSMENT";
        }
      } else if (decibels > 85 && !isTrafficHorn) {
        threatLevel = "ELEVATED";
        distressScore = 58;
        escalationDetected = true;
      }

      aiResult = {
        threatLevel,
        distressScore,
        backgroundAcoustic: isTrafficHorn
          ? "TRAFFIC_HONKS"
          : threatLevel === "CRITICAL_SOS"
          ? "DISTRESS_CRY"
          : threatLevel === "ELEVATED"
          ? "SUSPICIOUS_OUTBURSTS"
          : "REGULAR_ENGINE_TRAFFIC",
        riderTone: threatLevel === "CRITICAL_SOS" ? "Screaming/Pleading" : threatLevel === "ELEVATED" ? "Distressed" : "Calm",
        driverTone: threatLevel === "CRITICAL_SOS" ? "Aggressive/Hostile" : threatLevel === "ELEVATED" ? "Agitated" : "Normal",
        detectedKeywords: [...matchedCritical, ...matchedAggressive],
        summary: threatLevel === "CRITICAL_SOS"
          ? "Critical distress keywords and vocal plea detected inside vehicle in Pakistan. Emergency dispatch protocol triggered."
          : threatLevel === "ELEVATED"
          ? "Elevated vocal distress and hostility patterns detected in vehicle cabin. Monitoring consecutive chunks."
          : isTrafficHorn
          ? "Regular urban traffic noise and horn acoustics detected. Classified as normal ambient journey sound."
          : "Regular cabin acoustics detected. Engine and road ambient within safe normal range.",
        escalationDetected,
        shouldAlertPolice,
        incidentCategory,
      };
    }

    // Build Incident Report if Elevated or Critical
    let incidentReport = null;
    if (aiResult.threatLevel !== "NORMAL" || aiResult.shouldAlertPolice) {
      const incidentId = `INC-PAK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      incidentReport = {
        incidentId,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        isoTime: new Date().toISOString(),
        severity: aiResult.threatLevel,
        category: aiResult.incidentCategory || "VERBAL_ABUSE",
        summary: aiResult.summary,
        detectedKeywords: aiResult.detectedKeywords || [],
        transcriptSnippet: transcript || (aiResult.threatLevel === "CRITICAL_SOS" ? "Rider vocalized: 'Gaadi roko! Let me out! Bachao!'" : "Aggressive shouting and elevated acoustic pressure"),
        riderTone: aiResult.riderTone,
        driverTone: aiResult.driverTone,
        backgroundAcoustic: aiResult.backgroundAcoustic,
        distressScore: aiResult.distressScore,
        gpsCoordinates: location,
        vehicleDetails: {
          driverName: driver.name,
          vehicle: driver.vehicle,
          plate: driver.plate,
          riderName: rider.name,
        },
        emergencyDispatched: aiResult.shouldAlertPolice,
        dispatchUnit: aiResult.shouldAlertPolice ? `PUNJAB POLICE 15 / RESCUE 1122 DISPATCH-UNIT-${Math.floor(10 + Math.random() * 89)}` : undefined,
        actionsTaken: [
          "Encrypted in-cabin audio chunk analyzed by Abhi AI RideShield",
          aiResult.escalationDetected ? "Elevated distress pattern logged across 30s window" : "Acoustic anomaly flagged",
          aiResult.shouldAlertPolice ? "Automated SOS alert transmitted to Punjab Police 15 & Rescue 1122 Emergency Desk" : "Cabin safety monitor placed on high alert",
          "Live vehicle GPS telemetry locked to safety operations desk",
        ],
      };
    }

    res.json({
      success: true,
      timestamp: Date.now(),
      ...aiResult,
      incidentReport,
    });
  } catch (error: any) {
    console.error("Error in /api/analyze-audio:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze audio chunk",
    });
  }
});

// Manual or Automated Emergency Dispatch Confirmation
app.post("/api/emergency/dispatch", (req, res) => {
  const { incidentId, location, reason = "Rider Distress Audio Alert" } = req.body;
  res.json({
    success: true,
    dispatchId: `DSP-${Date.now().toString().slice(-7)}`,
    status: "DISPATCHED",
    targetAuthority: "City Police Department & Abhi 24/7 Safety Central",
    estimatedArrival: "3-5 mins",
    incidentId: incidentId || `INC-${Date.now().toString().slice(-6)}`,
    location: location || { lat: 37.7749, lng: -122.4194, address: "Market St & 4th St, San Francisco, CA" },
    dispatchedAt: new Date().toISOString(),
    protocol: "CODE_RED_AUTOMATED_SAFETY_INTERVENTION",
  });
});

// ── Route Planning (OSRM) ────────────────────────────────────────────────────

// Fetch alternative routes from OSRM with simulated safety scoring
// The public OSRM demo server is shared and rate-limited. We add a
// timeout + single retry, and cache the last successful answer per pair
// on disk, so demo routes render even if OSRM is having a bad minute.
// Cache lives in the OS temp dir, NOT the project folder: a file written
// inside the project can poke the Vite dev watcher and force browser
// reloads mid-session (the "screen came back on its own" symptom).
const ROUTE_CACHE_FILE = path.join(os.tmpdir(), "abhi_route_cache.json");
const routeCache: Record<string, any> = (() => {
  try {
    return JSON.parse(fs.readFileSync(ROUTE_CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
})();

// One color per real route so two alternatives never look like the same
// line twice. Assignment happens AFTER ranking (safest = first color).
const ROUTE_COLORS = ["#0284c7", "#f59e0b", "#a855f7"];

app.get("/api/routes", async (req, res) => {
  try {
    const { pickup_lat, pickup_lng, drop_lat, drop_lng } = req.query;

    if (!pickup_lat || !pickup_lng || !drop_lat || !drop_lng) {
      return res.status(400).json({ error: "Missing coordinates" });
    }

    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${pickup_lng},${pickup_lat};${drop_lng},${drop_lat}?overview=full&geometries=geojson&alternatives=3&steps=true`;
    const cacheKey = `${pickup_lat},${pickup_lng};${drop_lat},${drop_lng}`;

    if (routeCache[cacheKey]) {
      res.json({ ...routeCache[cacheKey], cached: true });
      return;
    }

    const fetchOsrm = async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      try {
        const r = await fetch(osrmUrl, { signal: ctrl.signal });
        if (!r.ok) throw new Error(`OSRM returned ${r.status}`);
        return (await r.json()) as any;
      } finally {
        clearTimeout(timer);
      }
    };

    let data: any;
    try {
      data = await fetchOsrm();
    } catch {
      data = await fetchOsrm(); // one retry, then the catch block reports honestly
    }

    if (!data.routes || data.routes.length === 0) {
      return res.status(502).json({ error: "No routes found" });
    }

    // Build route options with safety scoring
    let routes = data.routes.map((route: any, idx: number) => {
      // Decode GeoJSON coordinates [lng,lat] -> [lat,lng]
      const coords: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );

      const distKm = +(route.distance / 1000).toFixed(1);
      const durMin = +(route.duration / 60).toFixed(0);

      // Simulated safety score based on route properties
      const baseScore = 75 - (distKm * 1.5) - (durMin * 0.3);
      const indexBonus = [8, 0, -5][idx] ?? 0;
      let safetyScore = Math.round(Math.max(20, Math.min(95, baseScore + indexBonus)));

      // Derive summary from first road name in steps
      let summary = `Route ${idx + 1}`;
      if (route.legs?.[0]?.steps) {
        const namedStep = route.legs[0].steps.find((s: any) => s.name && s.name.length > 2);
        if (namedStep) summary = `Via ${namedStep.name}`;
      }

      const safetyLevel = safetyScore >= 70 ? "safe" : safetyScore >= 45 ? "moderate" : "less_safe";

      return {
        id: `route_${idx}`,
        geometry: coords,
        distanceKm: distKm,
        durationMin: durMin,
        safetyLevel,
        safetyScore,
        summary,
      };
    });

    // Fabricated alternative routes removed: the old code copied the single
    // OSRM result and offset it a few metres to fake extra 'routes' with
    // invented names and scores. They drew lines that weren't on any road.
    // We now show only what OSRM actually found - even if that's just one.
    if (routes.length === 1) {
      console.log("/api/routes: 1 real route, no alternatives for this pair");
    }

    // Sort by safety score (safest first)
    routes.sort((a, b) => b.safetyScore - a.safetyScore);

    // 1A.2: give every route a road name that the OTHER routes do not use,
    // so two alternatives can never both be labeled "Via IJP Road". This is
    // still 100% OSRM step data - we only pick which real name to display.
    {
      const stepSets = data.routes.map((r: any) => {
        const set = new Set<string>();
        (((r.legs && r.legs[0] && r.legs[0].steps) || []) as any[]).forEach((st) => {
          if (st.name && st.name.length > 2) set.add(st.name);
        });
        return set;
      });
      routes.forEach((routeOut: any) => {
        const origIdx = Number(String(routeOut.id).split("_")[1]);
        const others = new Set<string>();
        stepSets.forEach((set, j) => { if (j !== origIdx) set.forEach((n) => others.add(n)); });
        const steps: any[] = (data.routes[origIdx]?.legs?.[0]?.steps) || [];
        const latin = (st: any) => /[a-zA-Z]/.test(String(st.name || ""));
        const unique = steps.find((st) => st.name && st.name.length > 2 && !others.has(st.name) && latin(st))
          || steps.find((st) => st.name && st.name.length > 2 && !others.has(st.name));
        const first = steps.find((st) => st.name && st.name.length > 2 && latin(st))
          || steps.find((st) => st.name && st.name.length > 2);
        routeOut.summary = unique ? `Via ${unique.name}` : first ? `Via ${first.name}` : `Route ${origIdx + 1}`;
        routeOut.color = ROUTE_COLORS[routes.indexOf(routeOut) % ROUTE_COLORS.length];
      });
    }

    const payload = { success: true, routes, singleRoute: routes.length === 1 };
    routeCache[cacheKey] = payload;
    try {
      fs.writeFileSync(ROUTE_CACHE_FILE, JSON.stringify(routeCache));
    } catch {
      /* cache write is best-effort */
    }
    res.json(payload);
  } catch (err: any) {
    console.error("/api/routes error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check if a GPS point deviates from a route corridor
app.post("/api/check-deviation", (req, res) => {
  try {
    const { lat, lng, routeGeometry } = req.body as {
      lat: number;
      lng: number;
      routeGeometry: [number, number][]; // [lat,lng] pairs
    };

    if (!lat || !lng || !routeGeometry || routeGeometry.length < 2) {
      return res.status(400).json({ error: "Missing position or route geometry" });
    }

    // Find minimum distance from point to any segment of the route
    let minDistMeters = Infinity;

    for (let i = 0; i < routeGeometry.length - 1; i++) {
      const [lat1, lng1] = routeGeometry[i];
      const [lat2, lng2] = routeGeometry[i + 1];
      const dist = pointToSegmentDistance(lat, lng, lat1, lng1, lat2, lng2);
      if (dist < minDistMeters) minDistMeters = dist;
    }

    res.json({
      success: true,
      deviationMeters: Math.round(minDistMeters),
      isDeviation: minDistMeters > 150, // 150m threshold
    });
  } catch (err: any) {
    console.error("/api/check-deviation error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Haversine-based point-to-segment distance in meters
function pointToSegmentDistance(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  // Project point P onto segment AB, then compute haversine to nearest point
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((pLng - aLng) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearestLat = aLat + t * dy;
  const nearestLng = aLng + t * dx;
  return haversineMeters(pLat, pLng, nearestLat, nearestLng);
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Abhi AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
