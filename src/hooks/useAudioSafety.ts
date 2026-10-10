import { useState, useRef, useCallback, useEffect } from "react";

const AUDIO_SERVER = "http://localhost:5004";

// The engine's dial runs 0..13, where 13 == CRITICAL (see scoring_engine
// DIAL_LEVELS: NORMAL 0, CONCERNING 2, ELEVATED 5, HIGH RISK 9, CRITICAL 13).
// The gauge is drawn as a percentage of THAT scale, not an invented one.
const DIAL_FULL_SCALE = 13;

interface AudioSafetyResult {
  status: string;
  confidence: number;
  sound_name: string;
  dial_score: number;
  dial_label: string;
  dial_level: number;
  word_severity: number;
  voice_severity: number;
  event_severity: number;
  event_type: string;
  transcript: string;
  keywords: string[];
  risk_level: number;
  custom_label?: string;
  custom_confidence?: number;
}

interface UseAudioSafetyReturn {
  isMonitoring: boolean;
  distressScore: number;
  dialLabel: string;
  lastResult: AudioSafetyResult | null;
  transcript: string;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  /** Rolling live loudness (0..1) for the waveform box; newest value last.
      Declared here because the hook returns it - without this line the
      production build fails type checking. */
  getAudioLevels: () => number[];
}

export function useAudioSafety(
  onThreatUpdate: (threatLevel: string, distressScore: number) => void
): UseAudioSafetyReturn {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [distressScore, setDistressScore] = useState(0);
  const [dialLabel, setDialLabel] = useState("NORMAL");
  const [lastResult, setLastResult] = useState<AudioSafetyResult | null>(null);
  const [transcript, setTranscript] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  // Rolling live loudness (0..1) for the waveform box.  Newest at the end.
  const levelsRef = useRef<number[]>(new Array(28).fill(0));
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunkBufRef = useRef<Float32Array[]>([]);
  const chunkIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const journeyIdRef = useRef("");
  const monitoringRef = useRef(false);

  const sendChunk = useCallback(async (wavBlob: Blob, idx: number) => {
    if (!monitoringRef.current) return;
    const form = new FormData();
    form.append("audio", wavBlob, `chunk_${idx}.wav`);
    form.append("journey_id", journeyIdRef.current);
    form.append("chunk_index", String(idx));

    try {
      const res = await fetch(`${AUDIO_SERVER}/upload_chunk`, { method: "POST", body: form });
      const data: AudioSafetyResult = await res.json();
      if (!monitoringRef.current) return;

      setLastResult(data);
      setDialLabel(data.dial_label || "NORMAL");

      const score = Math.min(100, (data.dial_score / DIAL_FULL_SCALE) * 100);
      setDistressScore(score);

      if (data.transcript) {
        setTranscript((prev) => prev + " " + data.transcript);
      }

      // Threat level follows the BRAIN's own dial label, so the app and the
      // engine can never disagree.  The old code divided by 10 (so the gauge
      // read CRITICAL at dial 8, which the engine calls HIGH RISK) and treated
      // status === "DANGER" as an emergency -- the legacy whole-file
      // classifier flags engine/road noise as DANGER at ~90%, which fired a
      // fake SOS while the dial sat at 0.  Evidence must come from the dial.
      const level = (data.dial_label || "NORMAL").trim().toUpperCase();
      if (level === "CRITICAL" || level === "HIGH RISK") {
        onThreatUpdate("CRITICAL_SOS", score);
      } else if (level === "ELEVATED") {
        onThreatUpdate("ELEVATED", score);
      } else if (level === "CONCERNING") {
        onThreatUpdate("MONITORING", score);
      } else {
        onThreatUpdate("NORMAL", score);
      }
    } catch (err) {
      console.warn("[AudioSafety] Chunk upload failed:", err);
    }
  }, [onThreatUpdate]);

  const floatToWav = useCallback((samples: Float32Array, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  }, []);

  const startMonitoring = useCallback(async () => {
    if (monitoringRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      chunkBufRef.current = [];
      monitoringRef.current = true;
      chunkIdxRef.current = 0;
      journeyIdRef.current = new Date().toISOString().replace(/[:.\-T]/g, "").slice(0, 14);

      await fetch(`${AUDIO_SERVER}/start_session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journey_id: journeyIdRef.current }),
      });
      // This app deliberately does NOT call /toggle_recording: audio is
      // analysed in 3-second chunks and nothing is stored here.  Journey
      // recording is a separate opt-in feature of the analysis dashboard,
      // used only to collect training samples.

      processor.onaudioprocess = (e) => {
        if (!monitoringRef.current) return;
        const data = new Float32Array(e.inputBuffer.getChannelData(0));
        chunkBufRef.current.push(new Float32Array(data));
        // Same buffer, sliced finer, gives a smooth display.  Pure maths on
        // audio we already hold - no extra node, no second mic, no risk to capture.
        const SLICE = 4;
        const step = Math.max(1, Math.floor(data.length / SLICE));
        for (let s = 0; s + step <= data.length; s += step) {
          let peak = 0;
          for (let i = s; i < s + step; i++) {
            const v = Math.abs(data[i]);
            if (v > peak) peak = v;
          }
          levelsRef.current.push(Math.min(1, peak * 2.2));
        }
        if (levelsRef.current.length > 28) {
          levelsRef.current.splice(0, levelsRef.current.length - 28);
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      timerRef.current = setInterval(() => {
        if (!monitoringRef.current || chunkBufRef.current.length === 0) return;
        const totalLen = chunkBufRef.current.reduce((sum, buf) => sum + buf.length, 0);
        const merged = new Float32Array(totalLen);
        let offset = 0;
        for (const buf of chunkBufRef.current) {
          merged.set(buf, offset);
          offset += buf.length;
        }
        chunkBufRef.current = [];
        const wav = floatToWav(merged, ctx.sampleRate);
        sendChunk(wav, chunkIdxRef.current++);
      }, 3000);

      setIsMonitoring(true);
    } catch (err) {
      console.error("[AudioSafety] Failed to start monitoring:", err);
    }
  }, [floatToWav, sendChunk]);

  const stopMonitoring = useCallback(() => {
    monitoringRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }

    if (journeyIdRef.current) {
      fetch(`${AUDIO_SERVER}/stop_session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journey_id: journeyIdRef.current }),
      }).catch(() => {});
    }
    setIsMonitoring(false);
  }, []);

  useEffect(() => {
    return () => { stopMonitoring(); };
  }, [stopMonitoring]);

  const getAudioLevels = useCallback(() => levelsRef.current, []);

  return { isMonitoring, distressScore, dialLabel, lastResult, transcript, startMonitoring, stopMonitoring, getAudioLevels };
}
