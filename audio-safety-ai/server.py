"""
server.py — Audio Safety AI  |  Unified Flask Backend
======================================================
Single lightweight server.  No Streamlit.  No port conflicts.

Endpoints
---------
GET  /                  → serve the frontend (index.html)
POST /upload_chunk      → receive 3-sec WAV, classify, return result
POST /start_session     → begin a new recording session
POST /stop_session      → end session, combine chunks → saved_journeys/
GET  /journeys          → list saved journey files
GET  /saved_journeys/x  → serve a journey WAV for playback

AI core (yamnet_engine.py, detector.py) is NOT modified.
"""

import os
import io
import sys
import json
import wave
import glob
import time
import base64
import logging
import threading
import numpy as np
from datetime import datetime

from flask import (
    Flask, request, jsonify, send_from_directory, send_file,
)
from flask_cors import CORS

# ── Suppress TensorFlow warnings BEFORE any TF import ──────────────────
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(BASE_DIR, "_audio_chunks")
JOURNEY_DIR = os.path.join(BASE_DIR, "saved_journeys")

for d in (AUDIO_DIR, JOURNEY_DIR):
    os.makedirs(d, exist_ok=True)

# ══════════════════════════════════════════════════════════════════════
#  AI ENGINE — lazy-loaded, thread-safe
# ══════════════════════════════════════════════════════════════════════

# Confidence threshold for DANGER classification
CONFIDENCE_THRESHOLD = 0.80

# ── Smoothing buffer state (for binary SAFE/DANGER) ──
_buffer_lock = threading.Lock()
_buffer_history = []       # list of "SAFE" / "DANGER"
BUFFER_SIZE = 3
REQUIRED_CONSECUTIVE = 2   # 2 × 3-sec chunks ≈ 4-6 seconds

# ── Rolling risk buffer (for the gauge, levels 0-4) ──
_risk_lock = threading.Lock()
_risk_history = []         # list of float risk scores (0-4)
RISK_BUFFER_SIZE = 5       # rolling window of last 5 chunks


def _smooth_add(status):
    """Add a detection result to the smoothing buffer."""
    global _buffer_history
    with _buffer_lock:
        _buffer_history.append(status)
        _buffer_history = _buffer_history[-BUFFER_SIZE:]


def _smooth_stable():
    """Return the smoothed status (DANGER only if 2 consecutive)."""
    with _buffer_lock:
        if len(_buffer_history) < REQUIRED_CONSECUTIVE:
            return "SAFE"
        recent = _buffer_history[-REQUIRED_CONSECUTIVE:]
        return "DANGER" if all(s == "DANGER" for s in recent) else "SAFE"


def _buffer_clear():
    global _buffer_history
    with _buffer_lock:
        _buffer_history = []


# ── Risk buffer (rolling window for gauge) ──

def _risk_add(score):
    """Add a risk score (0-4) to the rolling buffer."""
    global _risk_history
    with _risk_lock:
        _risk_history.append(score)
        _risk_history = _risk_history[-RISK_BUFFER_SIZE:]


def _risk_level():
    """Return the smoothed risk level (0-4) from the rolling buffer."""
    with _risk_lock:
        if not _risk_history:
            return 0
        avg = sum(_risk_history) / len(_risk_history)
        return min(4, round(avg))


def _risk_clear():
    global _risk_history
    with _risk_lock:
        _risk_history = []


from safety_agent import SafetyAgent

# Lazy-load YAMNet on first request
_classify_fn = None


def _get_classify():
    global _classify_fn
    if _classify_fn is None:
        from yamnet_engine import classify_audio
        _classify_fn = classify_audio
        print("[AI] YAMNet loaded.")
    return _classify_fn


# -- Custom Danger Classifier (trained on sfx_training) --
_custom_predictor = None


def _get_custom_predictor():
    global _custom_predictor
    if _custom_predictor is None:
        try:
            sys.path.insert(0, os.path.join(BASE_DIR, "train_model"))
            from predictor import DangerPredictor
            _custom_predictor = DangerPredictor()
            if _custom_predictor.is_loaded:
                print("[AI] Custom danger classifier loaded (trained on sfx_training).")
            else:
                print("[AI] Custom classifier not available — run train_model/train_classifier.py first.")
                _custom_predictor = None
        except Exception as e:
            print(f"[AI] Custom classifier failed to load: {e}")
            _custom_predictor = None
    return _custom_predictor


# ══════════════════════════════════════════════════════════════════════
#  FLASK APP
# ══════════════════════════════════════════════════════════════════════

app = Flask(__name__)
CORS(app)

# Suppress request logs
log = logging.getLogger("werkzeug")
log.setLevel(logging.WARNING)

# Session state
_session = {
    "status": "idle",         # idle | monitoring | stopped
    "recording": False,       # True only when user explicitly consented to record
    "journey_id": "",
    "total_chunks": 0,
    "agent": None,            # SafetyAgent instance (per-session) — the agentic AI brain
}


# ── Frontend ───────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


# ── Session control ────────────────────────────────────────────────────

@app.route("/start_session", methods=["POST"])
def start_session():
    data = request.get_json(silent=True) or {}
    jid = data.get("journey_id", datetime.now().strftime("%Y%m%d_%H%M%S"))

    # Clean old chunks for this session
    for f in glob.glob(os.path.join(AUDIO_DIR, f"chunk_{jid}_*")):
        os.remove(f)

    _session["status"] = "monitoring"
    _session["recording"] = False        # monitor-only by default
    _session["journey_id"] = jid
    _session["total_chunks"] = 0
    _session["agent"] = SafetyAgent()    # fresh agentic AI per session — learns this ride's baseline
    _buffer_clear()
    _risk_clear()
    print(f"[Agent] New SafetyAgent created for journey {jid} — will learn baseline in first 60s")

    return jsonify({"ok": True, "journey_id": jid})


@app.route("/toggle_recording", methods=["POST"])
def toggle_recording():
    """Enable or disable recording (consent-based). Monitor keeps running."""
    data = request.get_json(silent=True) or {}
    enable = data.get("recording", True)
    _session["recording"] = bool(enable)
    return jsonify({"ok": True, "recording": _session["recording"]})


@app.route("/stop_session", methods=["POST"])
def stop_session():
    jid = _session.get("journey_id", "")
    was_recording = _session.get("recording", False)
    _session["status"] = "stopped"
    _session["recording"] = False

    saved_path = ""
    if was_recording:
        # Combine all chunks into one WAV (user gave consent)
        saved_path = _combine_journey(jid)
    else:
        # Monitor-only: delete chunks (no consent to save)
        for f in glob.glob(os.path.join(AUDIO_DIR, f"chunk_{jid}_*")):
            os.remove(f)

    return jsonify({
        "ok": True,
        "journey_id": jid,
        "saved_path": saved_path,
        "total_chunks": _session["total_chunks"],
        "was_recording": was_recording,
    })


# ── Audio chunk upload + classification ────────────────────────────────

@app.route("/upload_chunk", methods=["POST"])
def upload_chunk():
    """
    Receives a WAV chunk (multipart form or JSON with base64).
    Classifies via YAMNet + smoothing buffer.
    Returns {status, stable_status, confidence, sound_name, speech_info}.
    """
    try:
        jid = request.form.get("journey_id", _session.get("journey_id", "unknown"))
        chunk_idx = request.form.get("chunk_index", "0")
        audio_file = request.files.get("audio")

        if not audio_file:
            return jsonify({"error": "No audio data"}), 400

        # Save chunk to disk (for journey combination later)
        filename = f"chunk_{jid}_{int(chunk_idx):04d}.wav"
        filepath = os.path.join(AUDIO_DIR, filename)
        audio_file.save(filepath)
        _session["total_chunks"] = int(chunk_idx)

        print(f"[Chunk #{chunk_idx}] Received {os.path.getsize(filepath)} bytes")

        # ── Read WAV → proper 16 kHz mono float32 ──
        import librosa
        audio, sr = librosa.load(filepath, sr=16000, mono=True, dtype=np.float32)
        # ── Compute raw audio metrics for the danger scorer ──
        raw_energy = float(np.mean(audio ** 2))
        raw_peak   = float(np.max(np.abs(audio)))

        print(f"  [Audio] sr={sr}, duration={len(audio)/sr:.1f}s, "
              f"samples={len(audio)}, energy={raw_energy:.6f}, peak={raw_peak:.3f}")

        # ── Classify via YAMNet ──
        classify = _get_classify()
        result = classify(audio, sr)

        raw_status = result["status"]
        confidence = result["confidence"]
        sound_name = result["sound_name"]

        # ── Custom classifier (trained model) ──
        custom_result = None
        predictor = _get_custom_predictor()
        if predictor is not None:
            custom_result = predictor.predict(filepath)
            custom_label = custom_result.get("label", "UNKNOWN")
            custom_conf = custom_result.get("confidence", 0)
            print(f"  [Custom] {custom_label} ({custom_conf*100:.0f}%) | "
                  f"probs={custom_result.get('probabilities', {})}")
            # Boost event_severity if custom model says DANGER with high confidence
            if custom_label == "DANGER" and custom_conf > 0.7:
                # Override YAMNet if it missed the danger
                if raw_status == "SAFE":
                    raw_status = "DANGER"
                    confidence = custom_conf
                    sound_name = f"[Custom] {custom_label}"

        # ── Smoothing buffer ──
        _smooth_add(raw_status)
        stable_status = _smooth_stable()

        # ── Apply confidence threshold ──
        if stable_status == "DANGER" and confidence < CONFIDENCE_THRESHOLD:
            stable_status = "SAFE"

        # ── Speech info (transcription handled by Web Speech API in browser) ──
        speech_info = result.get("speech_info", {})
        transcript = speech_info.get("transcript", "")
        keywords = speech_info.get("keywords", [])

        # ── Agentic AI scoring ──
        # Pass RAW audio features to the agent — NO fixed thresholds.
        # The agent decides severity based on what it learned during baseline.
        # Only YAMNet danger classification and distress keywords are pre-computed.
        
        # Word severity from browser transcription (this is reliable — it's text matching)
        kw_risk = speech_info.get("risk_score", 0)
        word_severity = min(3, int(kw_risk))
        frontend_ws = request.form.get("word_severity")
        if frontend_ws is not None:
            try:
                word_severity = max(word_severity, min(3, int(frontend_ws)))
            except (ValueError, TypeError):
                pass

        # Event severity from YAMNet danger classification (this is reliable — trained model)
        event_severity = 0
        if raw_status == "DANGER":
            if confidence > 0.8:
                event_severity = 2  # high-confidence danger sound
            else:
                event_severity = 1  # moderate danger sound
        
        # Voice severity: DO NOT compute from fixed thresholds.
        # Pass 0 and let the agent decide based on its learned baseline.
        # The agent knows what "normal" energy/peak looks like for THIS mic.
        voice_severity = 0  # agent will compute this from baseline

        # Get the SafetyAgent
        agent = _session.get("agent")
        if agent is None:
            agent = SafetyAgent()
            _session["agent"] = agent
            print(f"[Agent] SafetyAgent created for journey {_session.get('journey_id', 'unknown')}")

        # Process chunk — agent computes voice_severity from its learned baseline
        agent_result = agent.process_chunk(
            energy=raw_energy,
            peak=raw_peak,
            yamnet_top_name=sound_name,
            word_severity=word_severity,
            voice_severity=voice_severity,   # 0 — agent overrides from baseline
            event_severity=event_severity
        )
        
        # Get the agent-computed voice severity for the response
        voice_severity = agent_result.get("agent_voice_severity", 0)

        # Map agent result to the response format expected by frontend
        # Determine event_type based on actual YAMNet classification, not just anomaly
        if raw_status == "DANGER":
            event_type = sound_name.lower()  # use actual detected sound (scream, crash, etc.)
        elif voice_severity >= 2:
            event_type = "screaming"
        elif voice_severity >= 1:
            event_type = "raised_voice"
        elif word_severity >= 1:
            event_type = "distress_keywords"
        else:
            event_type = "none"
        
        dial_result = {
            "accumulated_score": agent_result["dial_score"],
            "dial_level": agent_result["dial_level"],
            "dial_label": agent_result["dial_label"],
            "word_severity": word_severity,
            "voice_severity": voice_severity,
            "event_severity": event_severity,
            "chunk_score": agent_result["signal_breakdown"].get("base_signal_score", 0),
            "repetition_bonus": 0,  # agent handles this via patterns
            "escalation_bonus": agent_result["signal_breakdown"].get("pattern_modifier", 0),
            "combination_bonus": 0,  # agent handles this via signal combination
            "event_type": event_type
        }

        # ── Compute chunk risk score (0-4) for the gauge (legacy) ──
        chunk_risk = 0
        if raw_status == "DANGER":
            chunk_risk = max(chunk_risk, 2)
            if confidence > 0.8:
                chunk_risk = max(chunk_risk, 3)
        chunk_risk = max(chunk_risk, kw_risk)
        pitch_info = result.get("pitch_info", {})
        if pitch_info.get("screaming") and pitch_info.get("level", 0) > 0.5:
            chunk_risk = max(chunk_risk, 3)
        if result.get("energy_signal") == "SILENCE":
            chunk_risk = max(chunk_risk, 2)

        _risk_add(chunk_risk)
        risk_level = _risk_level()

        # ── Log result with agent insights ──
        dial_icon = {"NORMAL": "  ", "CONCERNING": "  ",
                     "ELEVATED": "  ", "HIGH RISK": "  ",
                     "CRITICAL": "  "}.get(dial_result["dial_label"], "  ")
        icon = "DANGER" if stable_status == "DANGER" else "OK"
        baseline_status = "learning" if agent_result["baseline_progress"] < 1.0 else "established"
        print(f"  [{icon}] Chunk #{chunk_idx}: {sound_name} -> {stable_status} "
              f"({confidence*100:.0f}%)  |  Dial: {dial_result['dial_label']} "
              f"(score={dial_result['accumulated_score']:.1f})  |  "
              f"Agent: phase={agent_result['ride_phase']}, baseline={baseline_status}, "
              f"anomaly={agent_result['anomaly_score']:.2f}")

        # Log detected patterns
        patterns = agent_result.get("patterns", {})
        active_patterns = [k for k, v in patterns.items() if v and k != "pattern_severity_modifier"]
        if active_patterns:
            print(f"  [PATTERNS] {', '.join(active_patterns)}")

        # ── Alert on stable DANGER ──
        if stable_status == "DANGER":
            print(f"  [DANGER ALERT] {sound_name} ({confidence*100:.0f}%) -- "
                  f"transcript: {transcript}")
        if dial_result["dial_label"] in ("HIGH RISK", "CRITICAL"):
            print(f"  [DIAL ALERT] {dial_result['dial_label']} -- "
                  f"words={dial_result['word_severity']} "
                  f"voice={dial_result['voice_severity']} "
                  f"event={dial_result['event_severity']} "
                  f"anomaly={agent_result['anomaly_score']:.2f}")

        # Add custom model info to response
        custom_response = {}
        if custom_result:
            custom_response = {
                "custom_label": custom_result.get("label", "UNKNOWN"),
                "custom_confidence": custom_result.get("confidence", 0),
                "custom_probabilities": custom_result.get("probabilities", {}),
            }

        return jsonify({
            "status": stable_status,
            "raw_status": raw_status,
            "confidence": confidence,
            "sound_name": sound_name,
            "transcript": transcript,
            "keywords": keywords,
            "chunk_index": int(chunk_idx),
            "risk_level": risk_level,
            "chunk_risk": chunk_risk,
            # -- Danger Dial fields --
            "dial_score": round(dial_result["accumulated_score"], 2),
            "dial_level": dial_result["dial_level"],
            "dial_label": dial_result["dial_label"],
            "word_severity": dial_result["word_severity"],
            "voice_severity": dial_result["voice_severity"],
            "event_severity": dial_result["event_severity"],
            "event_type": dial_result["event_type"],
            "chunk_score": round(dial_result["chunk_score"], 2),
            "repetition_bonus": round(dial_result["repetition_bonus"], 2),
            "escalation_bonus": round(dial_result["escalation_bonus"], 2),
            "combination_bonus": round(dial_result["combination_bonus"], 2),
            # -- Agentic AI fields (new) --
            "anomaly_score": round(agent_result["anomaly_score"], 3),
            "baseline_progress": round(agent_result["baseline_progress"], 2),
            "ride_phase": agent_result["ride_phase"],
            "patterns": agent_result["patterns"],
            "signal_breakdown": agent_result["signal_breakdown"],
            "anomaly_details": agent_result["anomaly_details"],
            # -- Custom classifier fields --
            **custom_response,
        })

    except Exception as e:
        print(f"[ERROR] /upload_chunk failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "status": "SAFE",
            "raw_status": "ERROR",
            "confidence": 0.0,
            "sound_name": "Classification error",
            "transcript": "",
            "keywords": [],
            "chunk_index": int(chunk_idx) if 'chunk_idx' in dir() else 0,
            "risk_level": 0,
            "chunk_risk": 0,
            # ── Danger Dial fields (safe defaults on error) ──
            "dial_score": 0,
            "dial_level": 0,
            "dial_label": "NORMAL",
            "word_severity": 0,
            "voice_severity": 0,
            "event_severity": 0,
            "event_type": "none",
            "chunk_score": 0,
            "repetition_bonus": 0,
            "escalation_bonus": 0,
            "combination_bonus": 0,
            # ── Agentic AI fields (safe defaults on error) ──
            "anomaly_score": 0.0,
            "baseline_progress": 0.0,
            "ride_phase": "normal",
            "patterns": {},
            "signal_breakdown": {},
            "anomaly_details": {},
        })


# ── Journey management ─────────────────────────────────────────────────

@app.route("/journeys")
def list_journeys():
    files = []
    for f in sorted(os.listdir(JOURNEY_DIR), reverse=True):
        if f.endswith(".wav"):
            fp = os.path.join(JOURNEY_DIR, f)
            files.append({
                "name": f,
                "size_kb": round(os.path.getsize(fp) / 1024, 1),
                "created": datetime.fromtimestamp(
                    os.path.getctime(fp)
                ).strftime("%Y-%m-%d %H:%M"),
            })
    return jsonify({"journeys": files})


@app.route("/saved_journeys/<path:filename>")
def serve_journey(filename):
    return send_from_directory(JOURNEY_DIR, filename)


@app.route("/journeys/<path:filename>", methods=["DELETE"])
def delete_journey(filename):
    """DELETE — permanently remove a journey WAV file."""
    filepath = os.path.join(JOURNEY_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        print(f"[Journey] Deleted: {filename}")
        return jsonify({"ok": True, "deleted": filename})
    return jsonify({"error": "File not found"}), 404


@app.route("/delete_all_journeys", methods=["POST"])
def delete_all_journeys():
    """DELETE — permanently remove ALL saved journey WAV files."""
    count = 0
    for f in glob.glob(os.path.join(JOURNEY_DIR, "*.wav")):
        try:
            os.remove(f)
            count += 1
        except Exception:
            pass
    # Also clear any pending chunks
    for f in glob.glob(os.path.join(AUDIO_DIR, "chunk_*")):
        try:
            os.remove(f)
        except Exception:
            pass
    print(f"[Journey] Deleted all {count} journeys + pending chunks")
    return jsonify({"ok": True, "deleted_count": count})


# ── Helpers ────────────────────────────────────────────────────────────

def _combine_journey(journey_id):
    """Combine all chunk WAVs for a journey into one continuous file."""
    chunks = sorted(glob.glob(
        os.path.join(AUDIO_DIR, f"chunk_{journey_id}_*.wav")
    ))
    if not chunks:
        return None

    output_path = os.path.join(JOURNEY_DIR, f"{journey_id}.wav")
    all_frames = b""
    sr = 16000

    for c in chunks:
        try:
            with wave.open(c, "rb") as wf:
                sr = wf.getframerate()
                all_frames += wf.readframes(wf.getnframes())
        except Exception:
            continue

    if all_frames:
        with wave.open(output_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(all_frames)
        print(f"[Journey] Saved: {output_path} "
              f"({len(all_frames)/1024:.0f} KB, {len(chunks)} chunks)")
        return output_path
    return None


# ══════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print()
    print("=" * 56)
    print("  AUDIO SAFETY AI — Agentic Safety System")
    print("=" * 56)
    print(f"  Frontend :  http://localhost:5004")
    print(f"  AI Core  :  YAMNet + SafetyAgent (adaptive learning)")
    print(f"  Agent    :  Per-ride baseline + pattern detection")
    print(f"  Baseline :  First 60s learns 'normal' for THIS car")
    print(f"  Patterns :  Escalation, coercion, recovery detection")
    print(f"  Scoring  :  Anomaly-based (relative to baseline)")
    print(f"  Storage  :  {JOURNEY_DIR}")
    print("=" * 56)
    print()

    # Pre-load AI models in background so chunks return immediately
    from yamnet_engine import preload_models
    preload_thread = threading.Thread(target=preload_models, daemon=True)
    preload_thread.start()

    app.run(host="0.0.0.0", port=5004, debug=False, threaded=True)
