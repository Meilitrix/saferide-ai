"""
safety_agent.py — Agentic AI Safety System
===========================================
Transforms the fixed-threshold ML pipeline into an adaptive agent that:
  • Learns per-ride baselines (what's "normal" for THIS car)
  • Maintains context across chunks (not independent processing)
  • Detects patterns (escalation, silence-after-distress, coercion)
  • Scores anomalies relative to the ride's baseline (not fixed thresholds)

Architecture:
  Signal Detection Layer (YAMNet + energy/pitch) → SafetyAgent → Adaptive Danger Score
"""

import threading
import numpy as np
from collections import deque
from typing import Dict, List, Optional, Tuple


# ══════════════════════════════════════════════════════════════════════
#  BASELINE LEARNER — learns "normal" for this specific ride
# ══════════════════════════════════════════════════════════════════════

class BaselineLearner:
    """
    Learns what "normal" means for THIS ride in the first 60 seconds.
    After baseline is established, detects anomalies relative to it.
    """
    
    def __init__(self, baseline_duration_chunks=20):  # 20 chunks × 3s = 60 seconds
        self.baseline_duration_chunks = baseline_duration_chunks
        self.baseline_chunks = []
        self.is_established = False
        
        # Learned baseline statistics
        self.baseline_energy_mean = 0.0
        self.baseline_energy_std = 0.0
        self.baseline_peak_mean = 0.0
        self.baseline_peak_std = 0.0
        self.baseline_yamnet_distribution = {}  # which sounds are "normal" for this ride
        
    def add_chunk(self, energy: float, peak: float, yamnet_top_name: str):
        """Add a chunk to the baseline learning phase."""
        if self.is_established:
            return
        
        self.baseline_chunks.append({
            "energy": energy,
            "peak": peak,
            "yamnet_top_name": yamnet_top_name
        })
        
        # Check if baseline period is complete
        if len(self.baseline_chunks) >= self.baseline_duration_chunks:
            self._establish_baseline()
    
    def _establish_baseline(self):
        """Calculate baseline statistics from the learning phase."""
        energies = [c["energy"] for c in self.baseline_chunks]
        peaks = [c["peak"] for c in self.baseline_chunks]
        
        self.baseline_energy_mean = np.mean(energies)
        self.baseline_energy_std = max(np.std(energies), 0.001)  # avoid division by zero
        self.baseline_peak_mean = np.mean(peaks)
        self.baseline_peak_std = max(np.std(peaks), 0.001)
        
        # Learn which YAMNet classes are "normal" for this ride
        yamnet_counts = {}
        for c in self.baseline_chunks:
            name = c["yamnet_top_name"]
            yamnet_counts[name] = yamnet_counts.get(name, 0) + 1
        
        # Classes that appear >10% of the time are "normal"
        total = len(self.baseline_chunks)
        self.baseline_yamnet_distribution = {
            name: count/total 
            for name, count in yamnet_counts.items() 
            if count / total > 0.10
        }
        
        self.is_established = True
        print(f"[Agent] Baseline established: energy={self.baseline_energy_mean:.4f}±{self.baseline_energy_std:.4f}, "
              f"peak={self.baseline_peak_mean:.3f}±{self.baseline_peak_std:.3f}, "
              f"normal sounds: {list(self.baseline_yamnet_distribution.keys())}")
    
    def get_anomaly_score(self, energy: float, peak: float, yamnet_top_name: str) -> Dict:
        """
        Calculate how anomalous this chunk is relative to the learned baseline.
        Returns z-scores and anomaly indicators.
        """
        if not self.is_established:
            # During baseline learning, return neutral scores
            return {
                "energy_zscore": 0.0,
                "peak_zscore": 0.0,
                "is_unusual_sound": False,
                "anomaly_score": 0.0
            }
        
        # Calculate z-scores (how many standard deviations from baseline)
        energy_zscore = (energy - self.baseline_energy_mean) / self.baseline_energy_std
        peak_zscore = (peak - self.baseline_peak_mean) / self.baseline_peak_std
        
        # Check if this sound is unusual for this ride
        is_unusual_sound = (
            yamnet_top_name not in self.baseline_yamnet_distribution and
            yamnet_top_name not in ["Speech", "Silence", "Noise"]  # always normal
        )
        
        # Overall anomaly score (0-1 scale)
        # Higher = more anomalous
        energy_anomaly = max(0, energy_zscore - 2.0) / 3.0  # z>2 starts counting, z>5 is max
        peak_anomaly = max(0, peak_zscore - 2.0) / 3.0
        sound_anomaly = 1.0 if is_unusual_sound else 0.0
        
        anomaly_score = np.clip(
            0.4 * energy_anomaly + 0.3 * peak_anomaly + 0.3 * sound_anomaly,
            0.0, 1.0
        )
        
        return {
            "energy_zscore": float(energy_zscore),
            "peak_zscore": float(peak_zscore),
            "is_unusual_sound": is_unusual_sound,
            "anomaly_score": float(anomaly_score)
        }
    
    def get_progress(self) -> float:
        """Return baseline learning progress (0.0 to 1.0)."""
        if self.is_established:
            return 1.0
        return len(self.baseline_chunks) / self.baseline_duration_chunks


# ══════════════════════════════════════════════════════════════════════
#  PATTERN DETECTOR — detects escalation, coercion, recovery patterns
# ══════════════════════════════════════════════════════════════════════

class PatternDetector:
    """
    Detects temporal patterns across chunks:
      • Escalation: severity increasing over consecutive chunks
      • Silence-after-distress: screaming followed by sudden quiet (coercion indicator)
      • Recovery: danger → gradual return to baseline (false alarm resolution)
      • Sustained distress: consecutive high-risk chunks
    """
    
    def __init__(self, context_window=20):
        self.context_window = context_window
        self.history = deque(maxlen=context_window)
        
        # Pattern state
        self.consecutive_distress = 0
        self.last_distress_chunk = -999
        self.silence_after_distress = False
        self.escalation_trend = []
        
    def add_chunk(self, chunk_data: Dict):
        """Add a chunk to the pattern detection history."""
        self.history.append(chunk_data)
        
        # Track consecutive distress
        if chunk_data.get("is_distress", False):
            self.consecutive_distress += 1
            self.last_distress_chunk = len(self.history) - 1
        else:
            self.consecutive_distress = 0
        
        # Detect silence-after-distress pattern
        if len(self.history) >= 2:
            prev = self.history[-2]
            curr = chunk_data
            
            prev_was_distress = prev.get("is_distress", False)
            curr_is_silent = curr.get("energy", 0) < 0.005 and curr.get("peak", 0) < 0.1
            
            self.silence_after_distress = prev_was_distress and curr_is_silent
        
        # Track escalation trend (last 5 chunks)
        if len(self.history) >= 5:
            recent_5 = list(self.history)[-5:]
            energies = [c.get("energy", 0) for c in recent_5]
            # Escalation = monotonically increasing energy
            self.escalation_trend = [
                energies[i] < energies[i+1] 
                for i in range(len(energies)-1)
            ]
    
    def detect_patterns(self) -> Dict:
        """
        Detect and return active patterns.
        Returns dict with pattern flags and severity modifiers.
        """
        patterns = {
            "escalation": False,
            "sustained_distress": False,
            "silence_after_distress": False,
            "recovery": False,
            "pattern_severity_modifier": 0.0
        }
        
        if len(self.history) < 3:
            return patterns
        
        # Pattern 1: Escalation (3+ consecutive increases)
        if len(self.escalation_trend) >= 3:
            if all(self.escalation_trend[-3:]):
                patterns["escalation"] = True
                patterns["pattern_severity_modifier"] += 0.3
        
        # Pattern 2: Sustained distress (3+ consecutive distress chunks)
        if self.consecutive_distress >= 3:
            patterns["sustained_distress"] = True
            patterns["pattern_severity_modifier"] += 0.4
        
        # Pattern 3: Silence after distress (coercion indicator)
        if self.silence_after_distress:
            patterns["silence_after_distress"] = True
            patterns["pattern_severity_modifier"] += 0.5  # high concern
        
        # Pattern 4: Recovery (distress → gradual return to baseline)
        if len(self.history) >= 5:
            recent_5 = list(self.history)[-5:]
            had_distress = any(c.get("is_distress", False) for c in recent_5[:3])
            recent_calm = all(not c.get("is_distress", False) for c in recent_5[-2:])
            
            if had_distress and recent_calm:
                patterns["recovery"] = True
                patterns["pattern_severity_modifier"] -= 0.2  # reduce severity
        
        return patterns


# ══════════════════════════════════════════════════════════════════════
#  SAFETY AGENT — 3-chunk window scoring
# ══════════════════════════════════════════════════════════════════════

class SafetyAgent:
    """
    3-chunk sliding-window scorer (9 seconds of audio).

    How the dial works:
      • Look at the last 3 chunks (each 3 seconds = 9 s total).
      • Count how many of those 3 chunks contain at least one danger
        signal (word, voice, or event).
      • 0 signal-chunks  → NORMAL
      • 1 signal-chunk   → CONCERNING  (one-off, probably fine)
      • 2 signal-chunks  → ELEVATED    (pattern forming)
      • 3 signal-chunks  → HIGH RISK   (sustained distress)
      • Severity weighting: a chunk with 2+ signal types or severity 2
        counts as 2 signals instead of 1, pushing the dial higher.
      • If signals stop (silence), old chunks fall out of the window
        and the dial drops naturally — no complex decay needed.
      • Pattern modifiers (escalation, recovery) fine-tune within this.
    """

    WINDOW_SIZE = 3  # 3 chunks × 3 seconds = 9 seconds

    DIAL_LEVELS = [
        (1, "CONCERNING"),
        (3, "ELEVATED"),
        (5, "HIGH RISK"),
        (7, "CRITICAL"),
    ]

    def __init__(self):
        self.baseline_learner = BaselineLearner()
        self.pattern_detector = PatternDetector()

        self.ride_phase = "baseline"
        self.chunk_count = 0
        self.dial_score = 0.0
        self.dial_level = 0
        self.dial_label = "NORMAL"

        # Rolling window — stores per-chunk signal summaries
        self.window = []

        self.context = {
            "last_danger_chunk": -999,
            "total_distress_chunks": 0,
            "max_anomaly_score": 0.0,
        }

        # Thread safety for concurrent chunk uploads
        self._lock = threading.Lock()

    # ── main entry point ────────────────────────────────────────────

    def process_chunk(self, energy: float, peak: float,
                      yamnet_top_name: str,
                      word_severity: int = 0,
                      voice_severity: int = 0,
                      event_severity: int = 0) -> Dict:
        with self._lock:
            return self._process_chunk_locked(
                energy, peak, yamnet_top_name,
                word_severity, voice_severity, event_severity)

    def _process_chunk_locked(self, energy, peak, yamnet_top_name,
                              word_severity, voice_severity,
                              event_severity) -> Dict:
        self.chunk_count += 1

        # 1. Learn baseline (first 60 s)
        self.baseline_learner.add_chunk(energy, peak, yamnet_top_name)
        baseline_progress = self.baseline_learner.get_progress()

        # 2. Anomaly score (relative to baseline)
        anomaly = self.baseline_learner.get_anomaly_score(
            energy, peak, yamnet_top_name)
        anomaly_score = anomaly["anomaly_score"]
        energy_zscore = anomaly.get("energy_zscore", 0.0)
        peak_zscore = anomaly.get("peak_zscore", 0.0)

        # 3. Agent computes voice severity from learned baseline
        agent_voice_severity = voice_severity
        if self.baseline_learner.is_established:
            # z-score = how many std deviations above the learned normal
            # Thresholds tuned so that ~2x normal energy = raised voice,
            # ~4x normal energy = screaming-level
            if energy_zscore > 3.5 or peak_zscore > 3.0:
                agent_voice_severity = 2   # screaming-level
            elif energy_zscore > 2.0 or peak_zscore > 2.0:
                agent_voice_severity = 1   # raised voice
            else:
                agent_voice_severity = 0   # normal for this mic
        voice_severity = agent_voice_severity

        # 4. Classify this chunk
        is_distress = (voice_severity >= 2
                       or event_severity >= 2
                       or word_severity >= 2)
        has_signal = (voice_severity >= 1
                      or event_severity >= 1
                      or word_severity >= 1)

        chunk_data = {
            "chunk_index": self.chunk_count,
            "energy": energy,
            "peak": peak,
            "yamnet_top_name": yamnet_top_name,
            "word_severity": word_severity,
            "voice_severity": voice_severity,
            "event_severity": event_severity,
            "anomaly_score": anomaly_score,
            "is_distress": is_distress,
            "has_signal": has_signal,
        }

        # 5. Pattern detection
        self.pattern_detector.add_chunk(chunk_data)
        patterns = self.pattern_detector.detect_patterns()

        # 6. ── 3-CHUNK WINDOW SCORING ──
        signal_chunks = 0  # default for baseline period
        # During baseline learning, dial stays at NORMAL — we're just learning
        if not self.baseline_learner.is_established:
            self.dial_score = 0.0
            self.dial_level = 0
            self.dial_label = "NORMAL"
        else:
            # Add to rolling window
            self.window.append({
                "has_signal": has_signal,
                "signal_count": int(word_severity > 0)
                                + int(voice_severity > 0)
                                + int(event_severity > 0),
                "max_severity": max(word_severity, voice_severity,
                                    event_severity),
                "is_distress": is_distress,
            })
            self.window = self.window[-self.WINDOW_SIZE:]

            # Count signal-chunks in the window
            signal_chunks = sum(1 for c in self.window if c["has_signal"])

            if signal_chunks == 0:
                # No signals in 9 seconds -> dial drops
                self.dial_score = max(0.0, self.dial_score - 1.5)
            else:
                # Base from signal density
                base = signal_chunks          # 1, 2, or 3

                # Severity weight: a chunk with 2+ signal types or severity 2
                heavy = sum(1 for c in self.window
                            if c["signal_count"] >= 2
                            or c["max_severity"] >= 2)

                if heavy >= 2:
                    base += 2
                elif heavy == 1 and signal_chunks >= 2:
                    base += 1

                # Pattern modifiers
                if patterns.get("sustained_distress"):
                    base += 1
                if patterns.get("escalation"):
                    base += 0.5
                if patterns.get("recovery"):
                    base -= 1

                # Smooth: don't drop below current unless signals clear
                self.dial_score = max(self.dial_score, float(base))

            self.dial_score = max(0.0, self.dial_score)

            # Map to dial label
            self.dial_level = 0
            self.dial_label = "NORMAL"
            for threshold, label in self.DIAL_LEVELS:
                if self.dial_score >= threshold:
                    self.dial_level = (self.DIAL_LEVELS
                                       .index((threshold, label)) + 1)
                    self.dial_label = label

        # 8. Ride phase
        self._update_ride_phase(is_distress, anomaly_score, patterns)

        # 9. Context
        if is_distress:
            self.context["last_danger_chunk"] = self.chunk_count
            self.context["total_distress_chunks"] += 1
        self.context["max_anomaly_score"] = max(
            self.context["max_anomaly_score"], anomaly_score)

        base_signal_score = (word_severity + voice_severity
                             + event_severity)
        anomaly_modifier = (1.0 + anomaly_score * 0.5
                            if base_signal_score > 0 else 1.0)

        return {
            "dial_score": round(self.dial_score, 2),
            "dial_level": self.dial_level,
            "dial_label": self.dial_label,

            "anomaly_score": round(anomaly_score, 3),
            "baseline_progress": round(baseline_progress, 2),
            "ride_phase": self.ride_phase,
            "patterns": patterns,

            "signal_breakdown": {
                "word_severity": word_severity,
                "voice_severity": voice_severity,
                "event_severity": event_severity,
                "base_signal_score": base_signal_score,
                "anomaly_modifier": round(anomaly_modifier, 2),
                "pattern_modifier": round(
                    patterns["pattern_severity_modifier"], 2),
                "signal_chunks_in_window": signal_chunks,
                "window_size": len(self.window),
            },

            "anomaly_details": anomaly,
            "agent_voice_severity": agent_voice_severity,
            "chunk_index": self.chunk_count,
            "accumulated_score": round(self.dial_score, 2),
        }

    def _update_ride_phase(self, is_distress, anomaly_score, patterns):
        if self.baseline_learner.is_established:
            if self.ride_phase == "baseline":
                self.ride_phase = "normal"

        if self.ride_phase == "normal":
            if is_distress or anomaly_score > 0.6:
                self.ride_phase = "alert"

        if self.ride_phase == "alert":
            if (patterns.get("sustained_distress")
                    or patterns.get("silence_after_distress")):
                self.ride_phase = "crisis"
            elif (not is_distress and anomaly_score < 0.3
                    and self.chunk_count - self.context["last_danger_chunk"]
                    > 3):
                self.ride_phase = "normal"

        if self.ride_phase == "crisis":
            if (patterns.get("recovery") and anomaly_score < 0.2):
                self.ride_phase = "normal"

    def get_state(self) -> Dict:
        return {
            "ride_phase": self.ride_phase,
            "chunk_count": self.chunk_count,
            "accumulated_score": round(self.dial_score, 2),
            "dial_level": self.dial_level,
            "dial_label": self.dial_label,
            "baseline_established": self.baseline_learner.is_established,
            "baseline_progress": round(self.baseline_learner.get_progress(),
                                       2),
            "context": self.context,
        }

    def reset(self):
        self.__init__()
