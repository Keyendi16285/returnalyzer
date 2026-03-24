import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from typing import List
from sqlalchemy.orm import selectinload

# These imports assume 'database.py' and 'models/' are inside the 'app' folder
from .database import get_session
from .models.cases import CaseEntry, Defendant, Plaintiff

app = FastAPI(title="Returnalyzer API")

# 1. CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. API ROUTES

@app.get("/api/cases", response_model=List[dict])
def get_returnalyzer_data(session: Session = Depends(get_session)):
    # Fetch all CaseEntry records from the DB
    statement = select(CaseEntry).options(selectinload(CaseEntry.defendants))
    results = session.exec(statement).all()
    
    return [
        {
            # Existing Data from CaseEntry model
            "name": r.case_name,
            "number": r.case_number or "N/A",
            "location": f"{r.state} / {r.county}",
            "defendants": r.current_number_of_defendants,
            "status": r.litigation_status_id,
            "discovery_ok": r.discovery_ok or "No",
            
            # --- FORMULATIONS ---
            
            # 1. Casewide Settlement (Settled)
            "casewide_settled": sum(
                d.settlement_amount for d in r.defendants 
                if d.settlement_status == "Settled" and d.settlement_amount is not None
            ),
            
            # 2. Casewide Settlement (In Discussion)
            "casewide_discussion": sum(
                d.settlement_amount for d in r.defendants 
                if d.settlement_status == "In Discussion" and d.settlement_amount is not None
            ),
            
            # 3. Lit Status Raw: $5000 if Discovery OK is "Yes", else $0
            "discovery_raw": 5000.0 if r.discovery_ok == "Yes" else 0.0,
            
            # Formulation Placeholders
            "lit_status_raw": 0.0,
            "sum_case_values": 0.0,   
            "sum_d_lit": "--", 
            "sum_d_discovery": "--",
            "gross_value": 0.0, 
            "costs": r.filing_fee_amount or 0.0, 
            "net_value": 0.0 
        } for r in results
    ]
    
@app.get("/api/defendants", response_model=List[dict])
def get_all_defendants(session: Session = Depends(get_session)):
    # We join with CaseEntry to get Case Name and Case # for the table
    statement = select(Defendant, CaseEntry).join(CaseEntry)
    results = session.exec(statement).all()
    
    return [
        {
            "name": d.name,
            "number": d.number,
            "case_name": c.case_name,
            "case_number": c.case_number or "N/A",
            "location": f"{c.state} / {c.county}",
            "litigation_status": d.litigation_status_id,
            "service_status": d.service_status,
            "settlement_status": d.settlement_status,
            "discovery_status": d.discovery_status,
            "settlement_amount": d.settlement_amount or 0.0,
            
            # --- NEW UPDATE: Discovery Status Value logic ---
            "disc_val": 5000.0 if d.discovery_status == "Discovery Received" else 0.0,
            
            #PLACEHOLDERS for future formulations
            "lit_val": "--", 
            # "disc_val": "--"
        } for d, c in results
    ]

# 3. STATIC FILES & HTML SERVING
STATIC_PATH = "/app/app/static"
CASES_HTML_PATH = os.path.join(STATIC_PATH, "cases.html")
DEFENDANTS_HTML_PATH = os.path.join(STATIC_PATH, "defendants.html")

# Mount the static directory
if os.path.exists(STATIC_PATH):
    app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")

# Serve the Cases page
@app.get("/cases")
async def serve_cases_page():
    if os.path.exists(CASES_HTML_PATH):
        return FileResponse(CASES_HTML_PATH)
    return {"error": "cases.html not found"}

# Serve the Defendants page
@app.get("/defendants")
async def serve_defendants_page():
    if os.path.exists(DEFENDANTS_HTML_PATH):
        return FileResponse(DEFENDANTS_HTML_PATH)
    return {"error": "defendants.html not found"}

# Root redirect to the cases page
@app.get("/")
async def root():
    if os.path.exists(CASES_HTML_PATH):
        return FileResponse(CASES_HTML_PATH)
    return {"message": "Welcome to Returnalyzer API. Visit /cases or /defendants for the UI."}