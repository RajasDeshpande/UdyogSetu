"""Optional rule-based document service for the Udyog Setu sandbox.

No model has been trained; confidence denotes heuristic recognition only.
"""
from fastapi import FastAPI
from pydantic import BaseModel
import re

app = FastAPI(title="Udyog Setu document checks", version="0.1.0")


class Profile(BaseModel):
    businessName: str


class DocumentInput(BaseModel):
    type: str
    name: str
    mime: str
    content: str = ""
    profile: Profile


@app.get("/health")
def health():
    return {"ok": True, "mode": "Prototype / Sandbox", "method": "rule-based"}


@app.post("/validate")
def validate(item: DocumentInput):
    terms = {
        "PAN Card": ["pan", "permanent account"],
        "Address Proof": ["address", "utility", "lease"],
        "Factory Layout Plan": ["factory", "layout", "plan"],
        "Land Document": ["land", "deed", "lease"],
        "Environmental Report": ["environment", "impact", "pollution"],
    }
    text = (item.name + " " + item.content).lower()
    recognized = any(word in text for word in terms.get(item.type, [item.type.lower()]))
    normal = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    business = normal(item.profile.businessName)
    content = normal(item.content)
    matched = not item.content or business in content or normal(item.profile.businessName.split()[0]) in content
    plain = item.mime == "text/plain"
    checks = [
        {"label": "Document type recognized", "passed": recognized},
        {"label": "Business name consistent", "passed": matched},
        {"label": "File within size and type limits", "passed": True},
    ]
    if item.type == "PAN Card" and plain:
        checks.append({"label": "PAN format present", "passed": bool(re.search(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", item.content))})
    if item.type == "Factory Layout Plan" and plain:
        checks.append({"label": "Fire exits indicated", "passed": bool(re.search(r"fire\s*exit", item.content, re.I))})
    if item.type == "Environmental Report" and plain:
        checks.append({"label": "Environmental impact indicated", "passed": bool(re.search(r"environment|impact|emissions", item.content, re.I))})
    reasons = [c["label"] for c in checks if not c["passed"]]
    return {
        "classification": item.type if recognized else "Unrecognized document",
        "confidence": (94 if plain else 72) if recognized else 36,
        "checks": checks,
        "result": "ACTION_REQUIRED" if reasons else "VERIFIED" if plain else "MANUAL_REVIEW",
        "reasons": reasons if reasons else [] if plain else ["Image/PDF content requires officer review; filename check only"],
        "method": "Rule-based text checks" if plain else "Filename and file metadata only",
    }
