# Abhi AI (SaferRide) — ride safety prototype for Pakistan

A ride-hailing app that listens to the cabin during a trip, scores the chance that
something is wrong, and escalates to an SOS. It also shows **real** road routes for
Islamabad and is being built toward recommending the *safer* one.

Everything here runs on your own machine. Nothing sends audio to a cloud service.

---

## Status: what is true today

Read this first. It tells you what works and what is not built yet.

| Feature | State | Notes |
|---|---|---|
| Booking flow, driver selection, fares (PKR) | Works | Islamabad locations |
| Live map with real streets | Works | OpenStreetMap tiles + Esri satellite, Leaflet |
| Real road routes between two points | Works | OSRM public router; 1 or 2 routes per pair, never invented |
| Route **safety ranking** | **Not built yet** | Cards read **"Not rated yet"** on purpose. See below |
| Live audio monitoring during a trip | Works | Needs the AI Engine running on port 5004 |
| Danger gauge, threat levels, AI dashboard | Works | Driven by real classification output |
| Auto-SOS after sustained danger | Works | 7 s at maximum level, then popup + dial |
| Manual SOS, emergency contacts, passcode lock | Works | Contacts hidden from the driver |
| Route deviation alert | Works | 150 m corridor around the chosen route |
| AI coaching text (Gemini) | Optional | Needs `GEMINI_API_KEY`; app works without it |

**Why the routes are not ranked yet.** An earlier version showed a "Safe / Moderate /
Less Safe" badge computed as `75 - km*1.5 - minutes*0.3`, plus a bonus for being first
in the router's list. That number measured *efficiency*, not safety, so it was deleted
rather than dressed up. The replacement is being built from OpenStreetMap evidence and
will report three separate things per route: a score, a **coverage percentage** (how
much of the route we actually have data for), and warnings such as long empty stretches.
Until then, no badge is shown. Design record: `route_safety_design.md`.

---

## Architecture

```
saferide-ai/                 Rider app  - React + TypeScript + Express, port 5008
  src/components/            LiveMap, booking flow, gauge, SOS modals
  server.ts                  Express API: /api/routes, /api/check-deviation,
                             /api/analyze-audio proxy, /api/emergency/dispatch
  audio-safety-ai/           AI engine snapshot, port 5004  (see the note below)
```

| System | Tech | Port | Job |
|---|---|---|---|
| **Rider App** | TypeScript, React, Vite, Express, Leaflet | 5008 | Booking, routes, danger gauge, SOS |
| **AI Engine** | Python, Flask, TensorFlow (YAMNet), scikit-learn | 5004 | Classify 3-second audio chunks, score danger 0-100 |

The app posts a 3-second chunk to the engine; the engine returns a score with a
per-signal breakdown; the gauge and the SOS cascade act on that.

> **Known repository gap.** The `audio-safety-ai/` folder committed here is an **older
> snapshot** of the engine being developed. Measured today: `server.py` has 521 lines
> committed vs 726 in the live development copy, the live `keyword_matcher.py` is missing
> from this snapshot entirely, and the `sfx_training/` clips are no longer in the repo at
> all. Clone this repo and the **rider app** is complete; the engine you get is not the
> one currently in use. Syncing that folder is an open task.

---

## Running it

### Easiest path: the desktop launchers (Windows)

`Open SaferRide.bat` -> `launch_saferide.ps1` starts the AI engine if it is not already
answering, then starts (or reuses) the rider app, then opens the browser. Double-clicking
it is safe: a service that already answers gets reused, not stacked. `Open Audio Safety.bat`
starts the engine alone.

Those scripts live beside the engine folder and contain one hardcoded absolute path to
the app folder. If the project moves, that single line has to change.

### Manual path

```powershell
# 1. AI Engine  (Python 3.12; tested with it)
cd audio-safety-ai
pip install -r requirements.txt
$env:TF_CPP_MIN_LOG_LEVEL = "3"
python server.py                       # http://localhost:5004

# 2. Rider App  (Node v24; tested with v24.19.0)
npm install
$env:NODE_OPTIONS = "--max-old-space-size=1024"   # 4 GB machines need this
npm run dev                            # http://localhost:5008
```

First audio chunk takes ~25 s while YAMNet loads. After that it is fast.
Map tiles and route geometry come from the internet; with no connection the map area
stays grey but the trip, the gauge and SOS all still work.

### Demo shortcut

`http://localhost:5008?stage=trip` jumps straight into a running ride instead of
clicking through booking. Stages: `landing`, `select`, `routes`, `searching`,
`choosing`, `assigned`, `trip`.

---

## How the audio scoring works

Three signals combine into a 0-100 dial across five levels:
`NORMAL -> CONCERNING -> ELEVATED -> HIGH RISK -> CRITICAL_SOS`.

- **Words** - distress keywords in Urdu / Hindi / English / Punjabi / Pashto, matched
  against browser transcription (Web Speech API, client-side).
- **Voice** - vocal intensity and pitch behaviour from the audio energy.
- **Events** - non-verbal danger sounds (scream, slap, impact) from YAMNet, a
  journey-trained chunk classifier (`danger_classifier_chunks.pkl` - the one that feeds
  the dial) and an older whole-file SVM (`danger_classifier_latest.pkl`). The engine's
  startup banner names all three.

### Measured performance of the custom chunk classifier

From `chunk_model_report.json`, evaluated chunk-by-chunk on human-labelled ride audio:

| Metric | Value | What it means |
|---|---|---|
| Chunk accuracy | 62.2% | Right on about 3 in 5 chunks |
| Danger recall | **9.2%** | Of 109 danger chunks it caught 10 and **missed 99** |
| Danger precision | 100% | Everything it did call danger was real |
| Safe false-alarm rate | 0% | Called nothing dangerous on safe audio |

Honest reading: this model is currently built to **avoid false alarms at the cost of
missing most danger**. That is a deliberate prototype trade-off, not a finished safety
system, and it should be presented that way.

---

## Data and privacy

- Ride audio is recorded **locally** by the engine: `_audio_chunks/` (3-second pieces)
  and `saved_journeys/` (full take audio). On the development machine that is about
  2.4 GB across ~8,900 chunks.
- **None of it is committed.** `.gitignore` excludes `*.wav`, `saved_journeys/`,
  `_audio_chunks/`, model weights (`*.pkl`, `*.h5`) and `.env`. Verified against the
  repository index, not assumed.
- No audio is uploaded to any third party. Inference is local; the only optional
  network call for AI text is Gemini, unconfigured in this build.
- The sample clips under `sfx_training/` are **not published in this repository** - they
  are gitignored and were removed from tracking. They stay on the development machine
  because the training and evaluation scripts read them by path (`train_classifier.py`,
  `predictor.py`, `eval_chunk_model.py`, `test_dial_behaviours.py`). The running app does
  not need them.
- Licensing for that clip set is still unresolved: several match Freesound's
  `id__user__title` pattern and require attribution, and at least four appear to be
  self-recorded. Do not describe them as "royalty-free" without checking.
- Emergency contacts are passcode-protected and never shown to the driver role.

---

## What is deliberately NOT in this prototype

- No real payments, no driver app, no dispatch backend.
- No crime statistics, no live traffic, no police data - and no claim of them.
- No safety score is shown for a route until real map evidence supports it.
- Missing map data is displayed as missing, never as "unsafe".

---

## Maps and routing stack (and why it is free)

| Layer | Source | Note |
|---|---|---|
| Street tiles | OpenStreetMap (standard) / Esri World Imagery | No API key required |
| Route geometry & times | OSRM public demo server | Shared and rate-limited; 12 s timeout, one automatic retry, response cache |
| Places & road attributes | OpenStreetMap via Overpass API | Planned for the safety layer |

The data is free and community-maintained; the public servers are free but shared, which
is why the app caches responses and tolerates failure instead of inventing substitutes.
Long-term plan is a self-hosted OSRM + Overpass on a Pakistan extract.

---

## Further reading

- `route_safety_design.md` - the route-safety design record: what was chosen, what was
  dropped, and the measured map-data coverage for Islamabad.
- `TECHNICAL_BRIEF.md`, `PROJECT_ANALYSIS.md` - earlier write-ups. **They predate the
  current state** (they still describe three safety-ranked routes and an older engine);
  treat this README as the accurate one until they are revised.

## Requirements

Node v24, Python 3.12, Chrome (Web Speech API + microphone). The Windows launcher scripts
assume absolute install paths for Node and Python.

## License

MIT
