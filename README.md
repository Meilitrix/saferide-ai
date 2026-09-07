# SafeRide AI — Audio Threat Detection for Ride-Hailing Safety

> Real-time audio threat detection system for ride-hailing passengers in Pakistan. Detects screams, slaps, coercive speech, and danger sounds using a dual-AI pipeline (YAMNet + Custom SVM), then auto-escalates through an SOS cascade — all running fully offline.

## Architecture

This is a **single repository containing two interconnected systems**:

```
remix-abhi-ai/                    <-- Rider App (React + Express)
  audio-safety-ai/                <-- AI Engine (Python + Flask)
```

| System | Tech Stack | Port | Role |
|--------|-----------|------|------|
| **Rider App** | TypeScript, React, Express, Leaflet | 5008 | Booking flow, route selection, danger gauge, SOS dispatch |
| **AI Engine** | Python, Flask, TensorFlow (YAMNet), Custom SVM | 5004 | Audio classification, danger scoring, transcription |

The rider app sends 3-second audio chunks to the AI engine via HTTP. The AI engine returns a danger score (0-100) with per-signal breakdown that drives the in-app danger gauge.

## Quick Start

### 1. AI Engine (Port 5004)

```powershell
cd audio-safety-ai
pip install -r requirements.txt
$env:TF_CPP_MIN_LOG_LEVEL = "3"
python server.py
```

Banner should show: `AI Core: YAMNet + Custom SVM (sfx_training)`

### 2. Rider App (Port 5008)

```powershell
npm install
npx tsx server.ts
```

Open `http://localhost:5008` in Chrome.

### Demo Flow

1. Book a ride -> Select route -> Start trip
2. Allow audio monitoring -> Danger gauge appears (green)
3. Play danger sounds near mic -> Gauge moves, AI analysis shows signal breakdown
4. Click gauge -> Full AI dashboard opens (embedded in rider app)
5. Sustained danger (7s at dial=100) -> Auto-SOS popup triggers
6. Complete trip -> Review + payment

## AI Engine Details

### Dual-AI Pipeline
- **YAMNet** (Google): 521-class audio event classifier via TensorFlow Hub
- **Custom SVM** (scikit-learn): 87.7% CV accuracy on 53 acoustic features (MFCCs, energy, pitch, spectral contrast)
- Both run in parallel on each 3-second chunk

### Danger Scoring
Three-signal weighted model with temporal accumulation:
- **Signal A (Words):** Transcription keywords — 150+ Urdu/Hindi/English/Punjabi/Pashto phrases, severity-weighted L1/L2/L3
- **Signal B (Voice):** Vocal intensity/pitch analysis from audio energy
- **Signal C (Event):** Non-verbal danger sounds from YAMNet classification

Output: dial_score (0-100) across 5 levels: NORMAL -> CONCERNING -> ELEVATED -> HIGH RISK -> CRITICAL

### Transcription
Browser Web Speech API (client-side) for Urdu/Hindi/English. Distress keyword matching runs in real-time with severity-colored display.

## Rider App Features

- **Booking flow:** Location selection, driver matching, fare display
- **Route selection:** 3 routes via OSRM ranked by safety (Safe / Moderate / Less Safe)
- **Live danger gauge:** SVG semicircle with animated needle, color-coded by threat level
- **Auto-SOS:** Triggers when dial stays at 100 for 7 seconds
- **Route deviation detection:** Alerts if vehicle goes off planned route
- **Passcode-protected emergency contacts:** Driver cannot see them
- **AI dashboard iframe:** Full AI analysis accessible by clicking the gauge

## Project Structure

```
remix-abhi-ai/
  src/                          # React frontend source
    components/                 # UI components (LiveMap, AudioSafetyMonitor, etc.)
    hooks/                      # useAudioSafety hook (bridges app <-> AI engine)
  server.ts                     # Express server (port 5008)
  TECHNICAL_BRIEF.md            # Detailed technical write-up for judges
  
  audio-safety-ai/              # AI Engine (Python/Flask)
    server.py                   # Flask server (port 5004)
    yamnet_engine.py            # YAMNet classification engine
    scoring_engine.py           # Danger scoring (3-signal model)
    index.html                  # AI dashboard frontend
    train_model/                # Custom SVM training pipeline
      feature_extractor.py      # 53 acoustic features via librosa
      train_classifier.py       # SVM training from sfx_training clips
      predictor.py              # Inference wrapper
    sfx_training/               # Royalty-free training sounds
    requirements.txt            # Python dependencies
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Sound Classification | Google YAMNet (TensorFlow Hub, 521 classes) |
| Custom Classifier | SVM RBF (scikit-learn, 87.7% CV accuracy) |
| Feature Extraction | librosa (53 acoustic features) |
| Transcription | Browser Web Speech API (Urdu/Hindi/English) |
| Scoring Engine | Custom Python (temporal accumulation, 3-signal model) |
| AI Backend | Flask (Python), port 5004 |
| App Backend | Express (TypeScript), port 5008 |
| Frontend | React, TypeScript, Tailwind CSS, Leaflet Maps |
| Routing | OSRM (Open Source Routing Machine) |
| Training Data | Royalty-free SFX (Pixabay/Freesound) |

## Privacy & Safety

- No personal recordings are stored or transmitted
- All AI inference runs locally (no cloud API dependency)
- Emergency contacts are passcode-protected (invisible to driver)
- Model weights and recorded journeys are gitignored

## License

MIT

---

*Built for Alibaba Cloud AI Hackathon Pakistan 2026*