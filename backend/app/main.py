from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .schemas import AnalyzeCallRequest, AnalyzeCallResponse, ScanCurrencyResponse
from .schemas import FraudNetworkResponse, GeoIntelResponse
from .scam_detection import analyze_scam
from .currency_detection import analyze_currency
from .fraud_network import build_fraud_network
from .geo_intel import build_geo_intel

app = FastAPI(title="CyberGuard API", version="1.0.0")

# Configure CORS for dev environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "CyberGuard Digital Public Safety Intelligence"}


@app.post("/api/analyze-call", response_model=AnalyzeCallResponse)
def analyze_call(req: AnalyzeCallRequest):
    """Detect digital-arrest / cyber-fraud patterns in a transcript or message."""
    return analyze_scam(req.text, req.channel)


@app.post("/api/scan-currency", response_model=ScanCurrencyResponse)
async def scan_currency(file: UploadFile = File(...)):
    """Screen an uploaded banknote image for counterfeit indicators."""
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image file.")
    try:
        return analyze_currency(data)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - surface a clean client error
        raise HTTPException(status_code=422, detail=f"Could not process image: {exc}")


@app.get("/api/fraud-network", response_model=FraudNetworkResponse)
def get_fraud_network():
    """Return the fraud network graph with detected rings and intelligence packages."""
    return build_fraud_network()


@app.get("/api/geo-intel", response_model=GeoIntelResponse)
def get_geo_intel():
    """Return geospatial fraud/counterfeit incidents with ranked hotspots."""
    return build_geo_intel()
