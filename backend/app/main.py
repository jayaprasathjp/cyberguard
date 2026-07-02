from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="CyberGuard API")

# Configure CORS for dev environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeCallRequest(BaseModel):
    text: str

class ScanCurrencyRequest(BaseModel):
    image_url: str

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/analyze-call")
def analyze_call(req: AnalyzeCallRequest):
    # Stub for NLP scam detection
    return {"status": "success", "analysis": "Stub analysis for: " + req.text}

@app.get("/api/fraud-network")
def get_fraud_network():
    # Stub to fetch the graph data
    return {"nodes": [], "edges": []}

@app.post("/api/scan-currency")
def scan_currency(req: ScanCurrencyRequest):
    # Stub for image upload scanning
    return {"status": "success", "scan_result": "Stub scan result for: " + req.image_url}
