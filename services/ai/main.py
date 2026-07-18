from fastapi import FastAPI
from typing import List
from pydantic import BaseModel
from sklearn.ensemble import RandomForestClassifier
import numpy as np

app = FastAPI(title="TenderLens AI Service")


class TenderSignal(BaseModel):
    value_cr: float
    emd_lakh: float
    margin_percent: float
    department_win_rate: float
    competitor_discount: float
    pq_gap_count: int


class PdfSummaryRequest(BaseModel):
    text: str


class DashboardTender(BaseModel):
    id: str
    value_cr: float
    emd_lakh: float
    margin_percent: float
    ai_score: int
    risk: str
    status: str
    win_probability: int
    pq_gap_count: int
    competitor_estimate_cr: float = 0


class DashboardRequest(BaseModel):
    tenders: List[DashboardTender]


def train_demo_model() -> RandomForestClassifier:
    x = np.array(
        [
            [42, 18, 14, 78, 7, 1],
            [118, 62, 9, 61, 5, 0],
            [27, 10, 12, 58, 9, 1],
            [64, 35, 16, 84, 6, 0],
            [86, 44, 13, 72, 5, 1],
            [33, 14, 7, 42, 11, 1],
        ]
    )
    y = np.array([1, 1, 0, 1, 1, 0])
    model = RandomForestClassifier(n_estimators=80, random_state=42)
    model.fit(x, y)
    return model


MODEL = train_demo_model()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict-win")
def predict_win(signal: TenderSignal):
    features = np.array(
        [[
            signal.value_cr,
            signal.emd_lakh,
            signal.margin_percent,
            signal.department_win_rate,
            signal.competitor_discount,
            signal.pq_gap_count,
        ]]
    )
    probability = MODEL.predict_proba(features)[0][1]
    return {"win_probability": round(float(probability) * 100, 2)}


@app.post("/summarize-pdf")
def summarize_pdf(request: PdfSummaryRequest):
    text = request.text[:4000]
    gaps = []
    if "ISO" not in text.upper():
        gaps.append("ISO certificate not detected")
    if "EMD" not in text.upper():
        gaps.append("EMD clause not detected")
    return {
        "summary": "Tender document parsed for deadline, EMD, PQ criteria, scope and delivery obligations.",
        "key_clauses": ["Eligibility", "EMD/PBG", "Scope of work", "SLA and LD"],
        "document_gaps": gaps,
    }


@app.post("/dashboard-insights")
def dashboard_insights(request: DashboardRequest):
    predictions = []
    for tender in request.tenders:
        signal = TenderSignal(
            value_cr=tender.value_cr,
            emd_lakh=tender.emd_lakh,
            margin_percent=tender.margin_percent,
            department_win_rate=tender.win_probability,
            competitor_discount=max(0, min(18, 100 - ((tender.competitor_estimate_cr / tender.value_cr) * 100))) if tender.value_cr > 0 and tender.competitor_estimate_cr > 0 else 7,
            pq_gap_count=tender.pq_gap_count,
        )
        probability = MODEL.predict_proba(np.array([[
            signal.value_cr,
            signal.emd_lakh,
            signal.margin_percent,
            signal.department_win_rate,
            signal.competitor_discount,
            signal.pq_gap_count,
        ]]))[0][1]
        risk_penalty = 22 if tender.risk.lower() == "high" else 10 if tender.risk.lower() == "medium" else 2
        deadline_penalty = 16 if tender.status.lower() == "closing" else 45 if tender.status.lower() == "closed" else 0
        win_probability = max(5, min(94, (probability * 100 * 0.55) + (tender.ai_score * 0.45) - risk_penalty - deadline_penalty))
        discount = 0.965 if tender.risk.lower() == "high" else 0.978 if tender.risk.lower() == "medium" else 0.988
        predictions.append({
            "tender_id": tender.id,
            "win_probability": round(float(win_probability), 2),
            "price_band_low_cr": round(max(0, tender.value_cr * (discount - 0.028)), 2),
            "price_band_high_cr": round(max(0, tender.value_cr * discount), 2),
            "risk_score": round(min(100, max(5, risk_penalty * 2 + tender.pq_gap_count * 9 + deadline_penalty)), 2),
        })
    return {
        "model": "random_forest_demo_v2",
        "features": ["value", "emd", "margin", "historical_win", "competitor_discount", "pq_gap"],
        "predictions": predictions,
    }
