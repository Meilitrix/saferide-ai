import { useState, useRef, useCallback, useEffect } from "react";

const AUDIO_SERVER = "http://localhost:5004";

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

      const score = Math.min(100, (data.dial_score / 10) * 100);
      setDistressScore(score);

      if (data.transcript) {
        setTranscript((prev) => prev + " " + data.transcript);
      }

      if (data.dial_score >= 7 || data.status === "DANGER") {
        onThreatUpdate("CRITICAL_SOS", score);
      } else if (data.dial_score >= 4) {
        onThreatUpdate("ELEVATED", score);
      } else if (data.dial_score >= 2) {
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
      await fetch(`${AUDIO_SERVER}/toggle_recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording: true }),
      });

      processor.onaudioprocess = (e) => {
        if (!monitoringRef.current) return;
        const data = new Float32Array(e.inputBuffer.getChannelData(0));
        chunkBufRef.current.push(new Float32Array(data));
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

  return { isMonitoring, distressScore, dialLabel, lastResult, transcript, startMonitoring, stopMonitoring };
}
