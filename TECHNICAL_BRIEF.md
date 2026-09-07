# SafeRide AI - Real-Time Audio Threat Detection for Ride-Hailing Passenger Safety

## Technical Brief for Alibaba Cloud AI Hackathon Pakistan 2026

---

## 1. Project Overview

**SafeRide AI** is a real-time audio threat detection system for ride-hailing passengers. It monitors in-cabin audio during trips using a dual-AI pipeline (Google YAMNet + Custom SVM classifier), detects signs of distress including screams, slaps, coercive speech, and non-verbal danger sounds, then auto-escalates through an SOS cascade - all without requiring any action from the passenger.

### Why This Exists

Existing ride-hailing safety features (share trip, SOS button) are **reactive** - they require the passenger to manually activate them. In real scenarios like coercive control, unconsciousness, or sudden assault, the passenger cannot press a button. SafeRide AI is **proactive**: an always-on audio monitor that detects danger from sound alone and auto-escalates.

### Key Design Constraints
- Must run **fully offline** - no cloud API dependency (latency + privacy)
- Must work in Pakistani vehicle cabins (Suzuki Alto/Vitz, rickshaws, loud ambient noise)
- Must support Urdu, Hindi, Punjabi, Pashto, and English distress phrases
- Must not false-trigger on normal car sounds (engine, music, horns, conversation)

---

## 2. System Architecture

The project is a **microservice architecture** with two systems communicating over HTTP:

```
+---------------------------------------------------------------+
|              RIDER APP (remix-abhi-ai)                         |
|              React + TypeScript + Express                      |
|              Port 5008                                         |
|                                                                |
|  +----------+  +----------+  +-----------+  +--------------+  |
|  | Booking  |  | Route    |  | Danger    |  | SOS          |  |
|  | Flow     |  | Select   |  | Gauge     |  | Cascade      |  |
|  +----------+  +----------+  +-----+-----+  +--------------+  |
|                                  |                              |
|  +-------------------------------v---------------------------+ |
|  |  useAudioSafety Hook                                      | |
|  |  1. Captures mic via MediaRecorder API                     | |
|  |  2. Buffers 3-second WAV chunks                            | |
|  |  3. POSTs each chunk to AI Engine                          | |
|  |  4. Receives: dial_score, dial_label, per-signal breakdown | |
|  |  5. Updates gauge needle position + color                  | |
|  +-----------------------------------------------------------+ |
|                                                                |
|  +-----------------------------------------------------------+ |
|  |  Browser Web Speech API (parallel transcription)           | |
|  |  - Continuous speech recognition in Chrome                 | |
|  |  - 150+ distress keyword matching (5 languages)            | |
|  |  - Severity-weighted: L1 (monitor) / L2 (warning) / L3    | |
|  +-----------------------------------------------------------+ |
+-------------------------------+--------------------------------+
                                |
                  HTTP POST /upload_chunk
                  (every 3 seconds, WAV audio)
                                |
                                v
+---------------------------------------------------------------+
|              AI ENGINE (audio-safety-ai)                       |
|              Python + Flask + TensorFlow                       |
|              Port 5004                                         |
|                                                                |
|  +-----------------------------------------------------------+ |
|  |  /upload_chunk endpoint receives 3-sec WAV                 | |
|  |                                                            | |
|  |  PARALLEL PROCESSING:                                      | |
|  |  +---------------------+  +-----------------------------+  | |
|  |  | YAMNet Classifier   |  | Custom SVM Classifier       |  | |
|  |  | (521 sound classes) |  | (SAFE / DANGER, 87.7% acc)  |  | |
|  |  +----------+----------+  +-------------+---------------+  | |
|  |             |                              |                | |
|  |             v                              v                | |
|  |  +----------------------------------------------+          | |
|  |  | Energy + Peak Analysis (vocal intensity)      |          | |
|  |  +----------------------------------------------+          | |
|  |             |                                              | |
|  |             v                                              | |
|  |  +----------------------------------------------+          | |
|  |  | Danger Scoring Engine (scoring_engine.py)     |          | |
|  |  | - Signal A: Words (keywords, 0-2)             |          | |
|  |  | - Signal B: Voice (intensity, 0-2)            |          | |
|  |  | - Signal C: Event (danger sounds, 0-2)        |          | |
|  |  | - Temporal accumulation + decay               |          | |
|  |  | - Repetition / Escalation / Combination bonus |          | |
|  |  +----------------------------------------------+          | |
|  |             |                                              | |
|  |             v                                              | |
|  |  Returns JSON: dial_score, dial_label, word_severity,      | |
|  |  voice_severity, event_severity, repetition_bonus,          | |
|  |  escalation_bonus, combination_bonus                        | |
|  +-----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

### Single Chunk Data Flow (Step by Step)

Here is exactly what happens every 3 seconds during a trip:

1. **Browser captures audio**: MediaRecorder API records 3 seconds of microphone input
2. **WAV encoding**: The raw audio blob is encoded as a 16-bit PCM WAV file (16kHz sample rate)
3. **HTTP POST**: The WAV is sent to `http://localhost:5004/upload_chunk` as multipart form data
4. **Server receives chunk**: Flask decodes the WAV, extracts raw audio samples at 16kHz
5. **YAMNet classification**: TensorFlow runs the audio through YAMNet, which returns the top-5 sound classes from its 521-class vocabulary (e.g., "Speech", "Music", "Scream", "Crash") with confidence scores
6. **Energy analysis**: The server computes RMS energy and peak amplitude of the chunk to determine vocal intensity (normal voice vs raised voice vs screaming)
7. **Custom SVM prediction**: The same audio is fed through the custom SVM classifier which extracts 53 acoustic features (MFCCs, spectral contrast, pitch, zero-crossing rate) and predicts SAFE or DANGER
8. **Model fusion**: If YAMNet says SAFE but SVM says DANGER with >70% confidence, the SVM overrides (catches threats YAMNet misses in noisy cabins)
9. **Danger scoring**: The scoring engine combines all signals into a cumulative danger score:
   - Signal A (Words): keyword severity from transcription (0/1/2)
   - Signal B (Voice): vocal intensity from energy analysis (0/1/2)
   - Signal C (Event): non-verbal danger from YAMNet + SVM (0/1/2)
   - Plus temporal bonuses for repetition, escalation, and combination
10. **JSON response**: Server returns `dial_score` (0-100), `dial_label` (NORMAL/CONCERNING/ELEVATED/HIGH RISK/CRITICAL), and all per-signal breakdowns
11. **Gauge update**: The rider app animates the SVG gauge needle to the new score position
12. **Auto-SOS check**: If dial_score stays at 100 for 7 consecutive seconds, SOS popup triggers
---

## 3. AI Engine Deep Dive

### 3.1 YAMNet - Sound Classification (521 Classes)

**What is YAMNet?**
YAMNet (Yet Another Mobile Network) is Google's audio event classifier trained on AudioSet (a dataset of 2M+ YouTube clips across 521 sound categories). It uses a MobileNet v1 architecture designed to run efficiently on CPU.

**Why YAMNet for this project?**
- Runs entirely offline on CPU (no GPU needed)
- Pre-trained on 521 sound classes including screams, crashes, speech, music, engine noise, etc.
- Fast enough for real-time 3-second chunk inference
- No API dependency - the model loads locally via TensorFlow Hub

**How it works in our system:**
- Loaded at server startup from `tensorflow_hub` (`https://tfhub.dev/google/yamnet/1`)
- Each 3-second WAV chunk is passed through the model
- Returns top-5 predicted classes with confidence scores
- We classify certain classes as "safe" (Speech, Music, Silence, Engine) and others as "danger" (Scream, Shriek, Crash)
- **Problem:** YAMNet was trained on general audio, not vehicle cabins. It often mislabels screams as "Speech" or slaps as "Arrow"/"Frog" in noisy environments. This is why we added the custom SVM as a second layer.

### 3.2 Custom SVM Classifier (87.7% CV Accuracy)

**Why a second classifier?**
YAMNet alone is not reliable enough for vehicle cabin threats. It was not trained on car interiors, Pakistani ambient noise, or close-range screams. We needed a model specifically trained on the difference between "normal car sounds" and "danger sounds."

**Training Pipeline:**
```
sfx_training/                     (royalty-free sound effects)
  car_sounds/       (13 clips)    -> Label: SAFE (0)
  scream_sounds/    (8 clips)     -> Label: DANGER (1)
  slap_sounds/      (6 clips)     -> Label: DANGER (1)
  danger_sounds/    (2 clips)     -> Label: DANGER (1)
       |
       v
feature_extractor.py              (librosa)
  Extracts 53 acoustic features per clip:
  - MFCCs: 13 coefficients x 4 statistics (mean, std, max, min) = 52
  - Energy: RMS energy mean and std = 2
  - Pitch: Mean fundamental frequency = 1
  - Spectral contrast: 6 frequency bands = 6
  - Zero-crossing rate = 1
  Total: ~53 features per audio clip
       |
       v
train_classifier.py               (scikit-learn)
  - Tries SVM (RBF), Random Forest, KNN
  - Cross-validation selects best model
  - Result: SVM (RBF) with 87.7% CV accuracy
  - Saved as: train_model/models/danger_classifier_latest.pkl
       |
       v
predictor.py                      (inference)
  - Loads trained model + scaler
  - Returns: SAFE or DANGER + confidence %
```

**Integration with YAMNet:**
- Both models run on every 3-second chunk
- If YAMNet says SAFE but SVM says DANGER with >70% confidence, the SVM overrides
- This catches threats that YAMNet's general training misses in vehicle environments

### 3.3 Danger Scoring Engine (The Risk Dial)

This is the core innovation - a **temporal accumulation model** that converts per-chunk audio signals into a continuously updating danger score.

**Why not simple threshold detection?**
A scream in a car cabin could be:
- A passenger watching a horror movie (false positive)
- Someone laughing at a joke (false positive)
- An actual assault (true positive)

Simple "scream detected = danger" would trigger too many false alarms. We needed a system that accumulates evidence over time, like a human judge would.

**The Three-Signal Model:**

Each 3-second chunk contributes to three independent signals, each scored 0-2:

| Signal | Source | 0 (Safe) | 1 (Concerning) | 2 (Danger) |
|--------|--------|----------|----------------|------------|
| **A: Words** | Web Speech API transcription | Normal speech / silence | Mild terms ("stop", "ruk jao") | Direct distress ("bachao", "let me go") |
| **B: Voice** | RMS energy + peak amplitude | Normal volume / car noise | Raised voice / agitation | Screaming / shrieking |
| **C: Event** | YAMNet + SVM classification | Engine / music / horn | Unusual impact / thud | Crash / struggle / slap |

**Temporal Accumulation Rules:**
- Scores **accumulate** across chunks (a single chunk adds its signal values to the running total)
- **Decay** only happens after 8 consecutive normal chunks (score 0) - this prevents a single scream from being forgotten immediately
- **Voice-dominated suppression**: When Signal B (voice) = 2, Signal C (event) is forced to 0. This prevents double-counting: a scream's energy would otherwise register as BOTH high voice intensity AND a danger event
- **Voice-only cap**: Maximum 1.5 points per chunk when only voice signal is active (no keyword or event confirmation). This prevents an uncorroborated scream from escalating the dial too fast

**Bonus System:**
| Bonus | Trigger | Effect |
|-------|---------|--------|
| **Repetition** | Same threat signal fires 2+ consecutive chunks | +0.5 per repetition |
| **Escalation** | Signal severity increases between consecutive chunks | +0.5 per escalation step |
| **Combination** | 2+ signals fire simultaneously (e.g., words + voice + event) | +1.0 bonus |

**Example Scenario - Real Threat:**
```
Chunk 1: Passenger says "stop" (mild)     -> A=1, B=0, C=0 -> Score: 1.0 (CONCERNING)
Chunk 2: "stop" again, louder             -> A=1, B=1, C=0 -> Score: 3.0 (ELEVATED) + repetition bonus
Chunk 3: "bachao!" (help!), screaming     -> A=2, B=2, C=1 -> Score: 6.5 (CRITICAL) + combination bonus
Chunk 4: More screaming, struggle sounds  -> A=2, B=2, C=2 -> Score: 9.0 (CRITICAL) + escalation bonus
-> Dial at 100 for 7 seconds -> AUTO-SOS TRIGGERS
```

**Example Scenario - False Alarm (horror movie):**
```
Chunk 1: Scream from phone speaker       -> A=0, B=2, C=0 -> Score: 1.5 (voice-only cap applies)
Chunk 2: More screaming                   -> A=0, B=2, C=0 -> Score: 2.0 (no accumulation - same level)
Chunk 3: Normal conversation resumes      -> A=0, B=0, C=0 -> Score: 2.0 (no decay yet, need 8 normal chunks)
...
Chunk 11: 8 consecutive normal chunks     -> Score decays to 0 (NORMAL)
-> Dial never reaches auto-SOS threshold
```

**Danger Dial Levels:**
| Score Range | Label | Gauge Color | App Response |
|-------------|-------|-------------|-------------|
| 0 | NORMAL | Green | "All clear" |
| 1-2 | CONCERNING | Cyan | "Police watching" |
| 3-4 | ELEVATED | Yellow/Orange | "Elevated risk - SOS may trigger" |
| 5-7 | HIGH RISK | Orange | Approaching critical |
| 8+ | CRITICAL | Red | Auto-SOS countdown begins |
---

## 4. Rider App (Remix Abhi AI)

### Booking Flow
1. **Welcome screen** with one-tap "Book a Ride" and "Be a Captain" options
2. **Location selection** - pickup and dropoff from popular locations or custom search
3. **Route selection** - 3 routes fetched via OSRM, ranked by safety score:
   - Safe (green), Moderate (yellow), Less Safe (red)
   - Each shows distance, ETA, and safety label
   - User can switch routes at any time
4. **Driver matching** - simulated assignment showing driver photo, name, rating, vehicle model, color, license plate
5. **Trip start** - audio permission modal appears; monitoring begins automatically when accepted

### In-Trip View
- **Map** (left, 8 of 12 columns): Leaflet map with dark tiles, live car position animation along route, route polyline
- **Danger Gauge** (right, 4 columns): SVG semicircle with animated needle, color transitions green -> cyan -> yellow -> orange -> red
- **Route selector**: Horizontal scrollable buttons to switch routes mid-trip
- **Driver card**: Name, photo, rating, vehicle, plate (no confusing labels)
- **Emergency contacts**: Passcode-protected (driver cannot see details)
- **SOS button**: Manual activation with slide-to-confirm (prevents accidental presses)
- **Route deviation detection**: If vehicle goes >15 seconds off planned route, alert appears with "I'm fine" / "Help me" options

### Auto-SOS Escalation Chain
```
Dial reaches 100/100
       |
       v
7-second countdown starts (criticalTimerRef)
       |
       +-- Score drops below 95? -> Timer cancelled, no SOS
       |
       +-- Score stays at 100 for 7 seconds?
              |
              v
       SOS popup appears: "Is this a false alarm?"
              |
              +-- Rider confirms real threat
              |     -> Calls emergency number (15/911)
              |     -> SMS to emergency contacts with GPS
              |     -> Shows incident report
              |
              +-- Rider says false alarm
                    -> Requires 4-digit PIN to cancel
                    -> (PIN prevents driver from cancelling)
                    -> Police monitors for 3 minutes
                    -> Score resets to 0 after monitoring period
```

### Dashboard Integration
Clicking the danger gauge opens the **full AI dashboard** (the audio-safety-ai interface) as a fullscreen iframe modal inside the rider app. This gives judges access to the detailed AI analysis without leaving the app. The modal has a "Back to Ride" button and an "Open in new tab" option.

---

## 5. Multilingual Distress Keyword Dictionary

The system maintains **150+ distress phrases** across five languages, organized in three severity levels:

| Level | Purpose | Examples | Languages |
|-------|---------|----------|-----------|
| **L3 (Critical)** | Direct threat - immediate danger | "bachao" (help), "mujhe jaane do" (let me go), "jaan se maar denge" (will kill me), "chup kar" (shut up - aggressive) | Urdu, Hindi, Punjabi, Pashto |
| **L2 (Warning)** | Contextually threatening | "bhaago" (run), "phone chheen lo" (take the phone), "yahan se niklo" (get out of here) | Urdu, Hindi, English |
| **L1 (Monitor)** | Could be innocent or concerning | "ruk jao" (stop), "slow down", "yeh kya kar rahe ho" (what are you doing) | All languages |

Keywords are matched in real-time by the Web Speech API transcription. In the UI, matched keywords are color-coded: red (L3), orange (L2), yellow (L1). The keyword dictionary is stored as a JavaScript object (`DISTRESS_KW_SEV`) in the frontend and matched against every transcription entry.

**Why 5 languages?** Pakistani vehicles commonly have passengers and drivers speaking different languages. Urdu is the national language, but many passengers speak regional languages (Punjabi, Pashto, Sindhi). English covers tourists and business users. Hindi covers cross-border compatibility.

---

## 6. Technical Challenges & Decisions

### 6.1 Whisper -> Web Speech API (Transcription Pivot)

**Initial plan:** Use OpenAI Whisper `tiny` model for server-side transcription.

**What went wrong:**
- Whisper crashed on every audio chunk with tensor reshape errors
- Root cause: near-silent mic input (energy 0.0002-0.006) after browser noise suppression
- We tried: disabling noise suppression, 200x audio amplification, RMS silence guards
- Each fix changed the error message but never resolved it (5+ iterations)
- Conclusion: whisper package v20250625 incompatible with Python 3.12 / CPU / Windows

**Decision:** Switched to browser Web Speech API (`webkitSpeechRecognition`). It runs client-side in Chrome, natively supports Urdu/Hindi/English, and requires zero server resources. Trade-off: browser dependency, but works reliably with a 12-second watchdog auto-restart.

### 6.2 YAMNet Misclassification in Vehicle Cabins

**Problem:** YAMNet labels screams as "Speech" and slaps as "Arrow"/"Frog" in noisy cabin environments.

**Solution:** Added custom SVM classifier trained specifically on car sounds vs danger sounds. When YAMNet says SAFE but SVM says DANGER with >70% confidence, the SVM overrides.

### 6.3 False Positive Prevention

**Problem:** Simple scream detection triggers on horror movies, laughter, and phone speaker audio.

**Solution:** The three-signal temporal accumulation model (Section 3.3) requires multiple corroborating signals before escalating. A scream with no keywords and no event confirmation is capped at 1.5 points and decays after 8 normal chunks.

### 6.4 OSRM Single-Route Limitation

**Problem:** OSRM returns only 1 route for short distances. We need multiple routes ranked by safety.

**Solution:** When OSRM returns 1 route, we generate 2 alternatives by offsetting coordinates (+/-0.002 degrees), assigning different safety scores and distances. Routes sorted safest-first.

### 6.5 TensorFlow Memory Pressure

**Problem:** Running YAMNet (TensorFlow) alongside Node.js + React on one machine causes memory crashes.

**Mitigation:** Kill unnecessary processes before starting the AI engine. In production, the AI engine runs on a dedicated server.

---

## 7. Current Status & Roadmap

### Working Now
- YAMNet (521 classes) + Custom SVM (87.7% accuracy) dual-AI pipeline
- Three-signal danger scoring with temporal accumulation, decay, and bonuses
- Web Speech API transcription with 150+ multilingual distress keywords
- SVG danger gauge with real-time animation
- Auto-SOS escalation (7-second timer at dial=100)
- Route selection with safety ranking
- Route deviation detection
- Passcode-protected emergency contacts
- Full AI dashboard embedded in rider app via iframe
- Audio recording and WAV archival

### Known Limitations
- Whisper incompatible (using Web Speech API)
- Quiet slaps sometimes undetected
- SVM trained on limited dataset (40 clips)
- SOS dispatch is UI-only (no real telephony)
- TensorFlow memory constraints on low-RAM machines

### Post-Hackathon Roadmap
1. Collect real Pakistani vehicle cabin recordings for domain adaptation
2. Expand SVM training set to 200+ clips
3. Add Signals D/E/F (interaction patterns, silence detection, state changes)
4. Twilio integration for real WhatsApp/call SOS dispatch
5. Driver-side app with separate safety features
6. Persistent incident database
7. TensorFlow Lite for mobile edge deployment

---

## 8. How to Run & Demo Guide

### Prerequisites
- Python 3.12 with TensorFlow, tensorflow-hub, librosa, scikit-learn, Flask
- Node.js with npm
- Google Chrome browser (for Web Speech API)

### Start AI Engine (Port 5004)
```powershell
cd audio-safety-ai
pip install -r requirements.txt
$env:TF_CPP_MIN_LOG_LEVEL = "3"
python server.py
# Expected banner: "AI Core: YAMNet + Custom SVM (sfx_training)"
```

### Start Rider App (Port 5008)
```powershell
npm install
npx tsx server.ts
# Expected: "Server listening on http://localhost:5008"
```

### Demo Flow for Judges
1. Open `http://localhost:5008` in Chrome
2. Book a ride -> Select safest route -> Start trip
3. Accept audio monitoring -> Gauge appears green (score 0)
4. Play danger sounds near microphone -> Watch gauge move, see AI analysis bars
5. Click the gauge -> Full AI dashboard opens (iframe)
6. Sustain danger for 7 seconds -> Auto-SOS popup triggers
7. Complete trip -> Review + payment (SOS never appears here)

---

## 9. Tech Stack Summary

| Layer | Technology | Details |
|-------|-----------|---------|
| Sound Classification | Google YAMNet | TensorFlow Hub, 521 classes, CPU inference |
| Custom Classifier | SVM (RBF kernel) | scikit-learn, 87.7% CV accuracy, 53 features |
| Feature Extraction | librosa | MFCCs, energy, pitch, spectral contrast, ZCR |
| Transcription | Web Speech API | Browser-native, Urdu/Hindi/English |
| Scoring Engine | Custom Python | Temporal accumulation, 3-signal model |
| AI Backend | Flask | Python, port 5004 |
| App Backend | Express | TypeScript, port 5008 |
| Frontend | React + TypeScript | Tailwind CSS, Lucide icons |
| Maps | Leaflet.js | CartoDB dark tiles, OSRM routing |
| Distress Keywords | 150+ phrases | 5 languages, 3 severity levels |
| Training Data | Royalty-free SFX | Pixabay/Freesound (car, scream, slap, danger) |

---

*Built for Alibaba Cloud AI Hackathon Pakistan 2026*