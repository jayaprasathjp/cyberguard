# 🛡️ CyberGuard — Digital Public Safety Intelligence Platform

**AI-powered intelligence platform that equips law enforcement, financial institutions, and citizens with proactive tools to detect, disrupt, and respond to digital fraud, counterfeit currency, and organised scam networks — shifting from reactive case investigation to predictive threat neutralisation.**

> Theme: Smart Cities · Public Safety · Digital Trust · Geospatial Law Enforcement

---

## 📌 Problem Context

India registered **1.14 million cybercrime complaints in 2023** (up 60% from 2022). "Digital arrest" scams — where fraudsters impersonate CBI/ED/Customs officers and hold victims hostage over video calls — defrauded citizens of **₹1,776 crore in the first nine months of 2024** alone. Meanwhile, high-quality **Fake Indian Currency Notes (FICN)** continue to defeat manual detection.

What law enforcement lacks is not evidence *after* the fact — it is **intelligence before mass victimisation** and reliable tools to detect threats **at the point of contact**. CyberGuard converges four intelligence streams into a single console:

1. **Communication intelligence** — scam call / message classification
2. **Physical security** — counterfeit currency screening
3. **Financial network intelligence** — fraud ring graph analysis
4. **Geospatial intelligence** — crime hotspot mapping & patrol prioritisation

---

## ✨ Modules

| Module | What it does | Status |
| --- | --- | --- |
| **Scam Detection** | Real-time NLP classifier for digital-arrest & fraud patterns in call transcripts / messages. Produces a risk score, indicator breakdown, recommended actions and auto-generates an MHA/I4C alert for high-risk cases. | ✅ Live |
| **Currency Scanner** | Computer-vision screening of Indian banknote photos — estimates denomination from dominant colour, checks geometry and microprint sharpness, and reports per-feature security checks. | ✅ Live |
| **Fraud Network** | Graph-AI view that maps scammers, money mules, accounts, devices and victims into detected rings with court-ready intelligence packages (kingpins, cross-jurisdiction flags, tamper-evident evidence hash). | ✅ Live |
| **Geo Command** | Geospatial command centre mapping fraud/counterfeit/cybercrime incidents across Indian cities into ranked hotspots for patrol prioritisation. | ✅ Live |

---

## 🧠 How the AI works

CyberGuard uses a **hybrid heuristic + optional LLM** approach so the platform is reliable and fully functional **offline**, while remaining upgradeable.

### Scam Detection
- **Weighted-heuristic classifier** tuned for Indian digital-arrest patterns: authority impersonation (CBI/ED/Customs/TRAI), digital-arrest isolation tactics, threat/coercion, financial pressure, urgency and identity harvesting.
- A **cross-signal amplifier** boosts confidence when impersonation + threat + money demands co-occur (the classic scam combo).
- **Optional LLM refinement**: if a `GEMINI_API_KEY` is present, a Gemini pass blends its verdict with the heuristic score using constrained/structured output. Without a key, heuristics run alone.

### Currency Scanner
- Extracts **genuine signals** from an ordinary photo: dominant colour → denomination (Mahatma Gandhi New series colour map), aspect-ratio geometry, and edge-energy as a microprint-sharpness proxy.
- Features requiring hardware (security thread, serial font, UV response) are clearly marked **`[simulated]`** and derived deterministically from the image hash — stable, never randomly flipping — and weighted lower in the authenticity score.

### Fraud Network
- Builds a deterministic multi-ring network, then derives analytics: **connected-component ring detection**, **degree-centrality** kingpin identification, cross-jurisdiction flagging, and a **SHA-256 evidence hash** per ring for auditability.

### Geo Command
- Aggregates incidents per city into hotspots with a blended **risk score** (volume × severity) and a **patrol-priority ranking**.

---

## 🏗️ Architecture

```
┌───────────────────────────────┐         ┌──────────────────────────────┐
│         Frontend (React)       │  HTTP   │        Backend (FastAPI)      │
│                                │ ──────► │                              │
│  • Scam Detector               │  JSON   │  /api/analyze-call           │
│  • Currency Scanner            │         │  /api/scan-currency          │
│  • Fraud Network (force graph) │ ◄────── │  /api/fraud-network          │
│  • Geo Command (SVG map)       │         │  /api/geo-intel              │
│                                │         │  /api/health                 │
└───────────────────────────────┘         └──────────────┬───────────────┘
       Vite · React 19 · Tailwind v4                      │
                                             ┌────────────┴─────────────┐
                                             │  scam_detection.py        │
                                             │  currency_detection.py    │
                                             │  fraud_network.py         │
                                             │  geo_intel.py             │
                                             │  (+ optional Gemini LLM)  │
                                             └───────────────────────────┘
```

The graph and map visualisations are **hand-rolled SVG** (a custom force-directed simulation and a lat/lng projection) — no charting libraries — so the whole app runs offline with zero external services.

---

## 🧰 Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite
- Tailwind CSS v4 (glassmorphism design system, mobile-first responsive layout with a bottom tab bar)

**Backend**
- Python + FastAPI
- Pydantic (typed request/response models)
- Pillow (image analysis)
- *(optional)* `langchain-google-genai` for the Gemini LLM refinement pass

---

## 📂 Project Structure

```
cyberguard/
├── package.json                 # root dev scripts (runs frontend + backend)
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI routes
│       ├── schemas.py           # Pydantic models
│       ├── scam_detection.py    # digital-arrest NLP engine
│       ├── currency_detection.py# counterfeit CV screening
│       ├── fraud_network.py     # graph intelligence
│       └── geo_intel.py         # geospatial hotspots
└── frontend/
    ├── index.html
    └── src/
        ├── main.tsx             # React entry
        ├── App.tsx              # dashboard shell + navigation
        ├── api.ts               # typed API client
        ├── index.css            # design system
        └── components/
            ├── ScamDetector.tsx
            ├── CurrencyScanner.tsx
            ├── FraudNetwork.tsx
            └── GeoCommand.tsx
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+

### 1. Backend setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Frontend setup
```powershell
cd frontend
npm install
```

### 3. Run both (from the project root)
```powershell
npm install          # installs "concurrently" for the dev script
npm run dev
```

This starts:
- **Frontend** → http://localhost:5173
- **Backend** → http://localhost:8000 (API docs at http://localhost:8000/docs)

You can also run each side individually with `npm run dev:frontend` / `npm run dev:backend`.

### (Optional) Enable the LLM refinement
```powershell
$env:GEMINI_API_KEY = "your-key-here"   # then start the backend
```
Without a key the platform runs fully offline on heuristics.

---

## 🔌 API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET`  | `/api/health` | Service health check |
| `POST` | `/api/analyze-call` | Scam classification. Body: `{ "text": "...", "channel": "call" }` |
| `POST` | `/api/scan-currency` | Counterfeit screening. `multipart/form-data` with an image `file` |
| `GET`  | `/api/fraud-network` | Fraud graph, detected rings & intelligence packages |
| `GET`  | `/api/geo-intel` | Geospatial incidents & ranked hotspots |

---

## 🎯 Evaluation Alignment

- **Counterfeit detection** across denominations via colour/geometry/sharpness signals.
- **Digital-arrest detection** with precision-oriented weighted indicators and cross-signal confirmation.
- **Fraud network lead time** surfaced per ring for pre-victimisation intervention.
- **Low false positives** for citizen-facing scam checks (banded risk scoring, no alerts below threshold).
- **Auditability** via deterministic, hash-stamped evidence packages.

---

## ⚠️ Disclaimer

This is a **prototype** built for a hackathon. The currency scanner's hardware-dependent checks (security thread, serial, UV) are simulated and **must not** be used for legal or financial decisions without proper forensic verification. Fraud-network and geospatial datasets are synthetic and for demonstration only.
