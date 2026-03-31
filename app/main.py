import os
from fastapi import FastAPI, Depends, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlmodel import Session, select, SQLModel  
from typing import List
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from .utils.security import hash_password, verify_password, create_access_token, decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    # This will throw a 401 if the token is fake or expired
    user = decode_access_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Session")
    return user

# Pydantic model for updating driver values
class DriverUpdate(BaseModel):
    value: float

# These imports assume 'database.py' and 'models/' are inside the 'app' folder
from .database import get_session
from .models.cases import CaseEntry, Defendant, Plaintiff, CaseDriver
from contextlib import asynccontextmanager

# --- LIFESPAN EVENT ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs when the app starts
    from .database import engine # Ensure engine is imported
    SQLModel.metadata.create_all(engine) # Creates the CaseDriver table if it doesn't exist
    with Session(engine) as session:
        seed_drivers(session)
    yield

app = FastAPI(title="Returnalyzer API", lifespan=lifespan)

# 1. CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SEEDING LOGIC ---
def seed_drivers(session: Session):
    # Check if we already have drivers to avoid duplicates
    existing = session.exec(select(CaseDriver)).first()
    if existing:
        return

    drivers_data = [
        # Case Values
        {"name": "raw_initial_a", "label": "Raw Initial case value (A)", "value": 2000.0, "category": "Case Values"},
        {"name": "multiple_initial_a", "label": "Multiple initial case value (A)", "value": 3000.0, "category": "Case Values"},
        {"name": "per_def_initial_a", "label": "Per Defendant Initial case value (A)", "value": 600.0, "category": "Case Values"},
        {"name": "full_case_disc_b", "label": "Full Case Discovery Value (B)", "value": 5000.0, "category": "Case Values"},
        {"name": "per_def_disc_c", "label": "Per Defendant discovery Value (C)", "value": 5000.0, "category": "Case Values"},
        {"name": "m2d_case_d", "label": "M2D Case Value (D)", "value": 4000.0, "category": "Case Values"},
        {"name": "m2d_per_def_d", "label": "M2D Case Value per Defendant (D)", "value": 2000.0, "category": "Case Values"},
        {"name": "at_issue_case_e", "label": "At Issue Case Value (E)", "value": 8000.0, "category": "Case Values"},
        {"name": "at_issue_per_def_e", "label": "At Issue Case Value per Defendant (E)", "value": 3000.0, "category": "Case Values"},
        {"name": "msj_case_f", "label": "MSJ Case Value (F)", "value": 16000.0, "category": "Case Values"},
        {"name": "msj_per_def_f", "label": "MSJ Case Value per Defendant (F)", "value": 5000.0, "category": "Case Values"},
        {"name": "fee_pet_case_g", "label": "fee Petition Case Value (G)", "value": 20000.0, "category": "Case Values"},
        {"name": "fee_pet_per_def_g", "label": "fee Petition Case Value per Defendant (G)", "value": 6000.0, "category": "Case Values"},
        
        # Probability Drivers (All at 80.00% / 0.8)
        {"name": "prob_initial_a", "label": "Initial Case Value Probability (A)", "value": 0.8, "category": "Probability"},
        {"name": "prob_m2d_d", "label": "M2D Phase Probability (D)", "value": 0.8, "category": "Probability"},
        {"name": "prob_at_issue_e", "label": "At Issue Probability (E)", "value": 0.8, "category": "Probability"},
        {"name": "prob_msj_f", "label": "MSJ Probability (F)", "value": 0.8, "category": "Probability"},
        {"name": "prob_fee_pet_g", "label": "Fee petition probability (G)", "value": 0.8, "category": "Probability"},
        {"name": "prob_disc_b", "label": "Discovery Probability (B)", "value": 0.8, "category": "Probability"},
        {"name": "prob_disc_per_d_c", "label": "Discovery Probability per D (C)", "value": 0.8, "category": "Probability"},
    ]

    for item in drivers_data:
        session.add(CaseDriver(**item))
    session.commit()

# 2. API ROUTES

@app.get("/api/cases", response_model=List[dict])
def get_returnalyzer_data(session: Session = Depends(get_session)):
    # 1. Fetch drivers for dynamic values
    drivers = session.exec(select(CaseDriver)).all()
    d_map = {d.name: d.value for d in drivers}
    def get_v(name): return d_map.get(name, 0.0)

    # 2. Fetch Cases
    statement = select(CaseEntry).options(selectinload(CaseEntry.defendants)).order_by(CaseEntry.id)
    results = session.exec(statement).all()
    
    output = []
    for r in results:
        # --- A. DEFENDANT SUMS ---
        sum_d_lit = 0.0
        sum_d_discovery = 0.0
        disc_driver_val = get_v("per_def_disc_c")

        for d in r.defendants:
            if d.settlement_status == "None":
                status = d.litigation_status_id
                if status in [3, 4, 6]: sum_d_lit += disc_driver_val
                elif status in [7, 8]: sum_d_lit += get_v("m2d_per_def_d")
                elif status == 9: sum_d_lit += get_v("at_issue_per_def_e")
                elif status == 11: sum_d_lit += get_v("msj_per_def_f")
                elif status == 12: sum_d_lit += get_v("fee_pet_per_def_g")

                if d.discovery_status == "Discovery Received":
                    sum_d_discovery += disc_driver_val

        # --- B. CASE-WIDE VALUES ---
        discovery_raw = get_v("full_case_disc_b") if r.discovery_ok == "Yes" else 0.0
        
        lit_status_raw = 0.0
        if r.litigation_status_id in [3, 4, 6]:
            lit_status_raw = get_v("raw_initial_a") if len(r.defendants) == 1 else get_v("multiple_initial_a")
        elif r.litigation_status_id in [7, 8]: lit_status_raw = get_v("m2d_case_d")
        elif r.litigation_status_id == 9: lit_status_raw = get_v("at_issue_case_e")
        elif r.litigation_status_id == 11: lit_status_raw = get_v("msj_case_f")
        elif r.litigation_status_id == 12: lit_status_raw = get_v("fee_pet_case_g")

        # --- C. CALCULATE INTERMEDIATE SUMS ---
        sum_case_values = lit_status_raw + sum_d_lit + discovery_raw + sum_d_discovery
        casewide_settled = sum(d.settlement_amount for d in r.defendants if d.settlement_status == "Settled" and d.settlement_amount)
        casewide_discussion = sum(d.settlement_amount for d in r.defendants if d.settlement_status == "In Discussion" and d.settlement_amount)

        # --- D. GROSS & NET VALUES ---
        gross_value = casewide_settled + casewide_discussion + sum_case_values
        costs = r.filing_fee_amount or 0.0
        
        # FINAL CALCULATION
        net_value = gross_value - costs

        output.append({
            "name": r.case_name,
            "number": r.case_number or "N/A",
            "location": f"{r.state} / {r.county}",
            "defendants": len(r.defendants),
            "status": r.litigation_status_id,
            "discovery_ok": r.discovery_ok or "No",
            "discovery_raw": discovery_raw,
            "lit_status_raw": lit_status_raw,
            "sum_d_lit": sum_d_lit,
            "sum_d_discovery": sum_d_discovery,
            "sum_case_values": sum_case_values,
            "casewide_settled": casewide_settled,
            "casewide_discussion": casewide_discussion,
            "gross_value": gross_value,
            "costs": costs,
            
            # --- NEW ASSIGNMENT ---
            "net_value": net_value
        })
        
    return output
    
@app.get("/api/defendants", response_model=List[dict])
def get_all_defendants(session: Session = Depends(get_session)):
    # 1. Fetch all drivers into a dictionary for quick access
    drivers = session.exec(select(CaseDriver)).all()
    d_map = {d.name: d.value for d in drivers}

    # Helper to get value with a fallback to 0.0
    def get_val(name): return d_map.get(name, 0.0)

    # 2. Fetch Defendants joined with CaseEntry
    statement = (
        select(Defendant, CaseEntry)
        .join(CaseEntry)
        .order_by(CaseEntry.id.asc(), Defendant.id.asc())
    )
    results = session.exec(statement).all()
    
    output = []
    for d, c in results:
        # --- LITIGATION STATUS VALUE LOGIC ---
        lit_val = 0.0
        status = d.litigation_status_id
        
        if status in [3, 4, 6]:
            lit_val = get_val("per_def_initial_a")      # Maps to ID 3 logic
        elif status in [7, 8]:
            lit_val = get_val("m2d_per_def_d")       # Maps to ID 7 logic
        elif status == 9:
            lit_val = get_val("at_issue_per_def_e")  # Maps to ID 9 logic
        elif status == 11:
            lit_val = get_val("msj_per_def_f")       # Maps to ID 11 logic
        elif status == 12:
            lit_val = get_val("fee_pet_per_def_g")   # Maps to ID 13 logic

        output.append({
            "name": d.name,
            "number": d.number,
            "case_name": c.case_name,
            "case_number": c.case_number or "N/A",
            "location": f"{c.state} / {c.county}",
            "litigation_status": status,
            "service_status": d.service_status,
            "settlement_status": d.settlement_status,
            "discovery_status": d.discovery_status,
            "settlement_amount": d.settlement_amount or 0.0,
            
            # --- NEW ASSIGNMENTS ---
            "lit_val": lit_val,
            "disc_val": get_val("per_def_disc_c") if d.discovery_status == "Discovery Received" else 0.0
        })
        
    return output
    
# API to get all driver values
@app.get("/api/drivers")
def get_drivers(session: Session = Depends(get_session)):
    return session.exec(select(CaseDriver)).all()

# --- UPDATED DASHBOARD API (With Safety Nets) ---
@app.get("/api/dashboard/stats")
def get_dashboard_stats( current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    drivers = session.exec(select(CaseDriver)).all()
    d_map = {d.name: d.value for d in drivers}
    def get_v(name): return float(d_map.get(name, 0.0))

    statement = select(CaseEntry).options(selectinload(CaseEntry.defendants))
    cases = session.exec(statement).all()
    all_defendants = session.exec(select(Defendant)).all()

    disposed_value = 0.0
    pending_value = 0.0
    case_status_counts = {}

    for c in cases:
        sum_d_lit = 0.0
        sum_d_discovery = 0.0
        for d in c.defendants:
            if d.settlement_status == "None":
                st = d.litigation_status_id or 0
                if st in [3, 4, 6]: sum_d_lit += get_v("per_def_disc_c")
                elif st in [7, 8]: sum_d_lit += get_v("m2d_per_def_d")
                elif st == 9: sum_d_lit += get_v("at_issue_per_def_e")
                elif st == 11: sum_d_lit += get_v("msj_per_def_f")
                elif st == 12: sum_d_lit += get_v("fee_pet_per_def_g")
                if d.discovery_status == "Discovery Received":
                    sum_d_discovery += get_v("per_def_disc_c")

        discovery_raw = get_v("full_case_disc_b") if c.discovery_ok == "Yes" else 0.0
        l_status = c.litigation_status_id or 0
        lit_status_raw = 0.0
        if l_status in [3, 4, 6]:
            lit_status_raw = get_v("raw_initial_a") if len(c.defendants) == 1 else get_v("multiple_initial_a")
        elif l_status in [7, 8]: lit_status_raw = get_v("m2d_case_d")
        elif l_status == 9: lit_status_raw = get_v("at_issue_case_e")
        elif l_status == 11: lit_status_raw = get_v("msj_case_f")
        elif l_status == 12: lit_status_raw = get_v("fee_pet_case_g")

        # Added (d.settlement_amount or 0.0) to prevent 500 errors on NULL values
        c_settled = sum((d.settlement_amount or 0.0) for d in c.defendants if d.settlement_status == "Settled")
        c_disc = sum((d.settlement_amount or 0.0) for d in c.defendants if d.settlement_status == "In Discussion")
        
        net_case_value = (c_settled + c_disc + lit_status_raw + sum_d_lit + discovery_raw + sum_d_discovery) - (c.filing_fee_amount or 0.0)

        if l_status >= 14: disposed_value += net_case_value
        else: pending_value += net_case_value

        case_status_counts[l_status] = case_status_counts.get(l_status, 0) + 1

    def_status_counts = {}
    for d in all_defendants:
        ds = d.litigation_status_id or 0
        def_status_counts[ds] = def_status_counts.get(ds, 0) + 1

    return {
        "financials": {"disposed": disposed_value, "pending": pending_value},
        "cases": {"total": len(cases), "breakdown": case_status_counts},
        "defendants": {"total": len(all_defendants), "breakdown": def_status_counts}
    }
    
@app.patch("/api/drivers/{driver_name}")
def update_driver(driver_name: str, data: DriverUpdate, session: Session = Depends(get_session)):
    # 1. Find the driver in the database by its unique name (e.g., 'msj_case_f')
    statement = select(CaseDriver).where(CaseDriver.name == driver_name)
    driver = session.exec(statement).first()
    
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # 2. Update only the value field
    driver.value = data.value
    
    # 3. Save to database
    session.add(driver)
    session.commit()
    session.refresh(driver) # Refresh to get any DB-side changes
    
    return {"message": "Success", "updated_driver": driver.name, "new_value": driver.value}

# --- 3. STATIC FILES & HTML SERVING ---

# Update this path to match your actual structure inside Docker
# If your Dockerfile WORKDIR is /app, and main.py is in /app/app/, 
# then static is likely at /app/app/static
STATIC_PATH = os.path.join(os.path.dirname(__file__), "static")

# Mount the static directory
if os.path.exists(STATIC_PATH):
    app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")

# Helper to serve files safely
def safe_file_response(filename: str):
    file_path = os.path.join(STATIC_PATH, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return {"error": f"{filename} not found at {file_path}"}

@app.get("/", include_in_schema=False)
async def serve_index():
    return safe_file_response("index.html")

@app.get("/cases")
async def serve_cases_page():
    return safe_file_response("cases.html")

@app.get("/defendants")
async def serve_defendants_page():
    return safe_file_response("defendants.html")

@app.get("/drivers")
async def serve_drivers_page():
    return safe_file_response("drivers.html")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content="", media_type="image/x-icon")

# @app.get("/api/dashboard/stats")
# def get_dashboard_stats(session: Session = Depends(get_session)):
#     # 1. Fetch Drivers for Calculations
#     drivers = session.exec(select(CaseDriver)).all()
#     d_map = {d.name: d.value for d in drivers}
#     def get_v(name): return float(d_map.get(name, 0.0))
    
#     statement = select(CaseEntry).options(selectinload(CaseEntry.defendants))
#     cases = session.exec(statement).all()
#     all_defendants = session.exec(select(Defendant)).all()

#     # 2. Fetch All Cases & Defendants
#     cases = session.exec(select(CaseEntry).options(selectinload(CaseEntry.defendants))).all()
#     all_defendants = session.exec(select(Defendant)).all()

#     # --- FINANCIAL TOTALS ---
#     disposed_value = 0.0
#     pending_value = 0.0
    
#     # --- CASE STATUS BREAKDOWN ---
#     case_status_counts = {}

#     for c in cases:
#         # Re-use the Net Case Value Logic
#         sum_d_lit = 0.0
#         sum_d_discovery = 0.0
#         for d in c.defendants:
#             if d.settlement_status == "None":
#                 st = d.litigation_status_id
#                 if st in [3, 4, 6]: sum_d_lit += get_v("per_def_disc_c")
#                 elif st in [7, 8]: sum_d_lit += get_v("m2d_per_def_d")
#                 elif st == 9: sum_d_lit += get_v("at_issue_per_def_e")
#                 elif st == 11: sum_d_lit += get_v("msj_per_def_f")
#                 elif st == 12: sum_d_lit += get_v("fee_pet_per_def_g")
#                 if d.discovery_status == "Discovery Received":
#                     sum_d_discovery += get_v("per_def_disc_c")

#         discovery_raw = get_v("full_case_disc_b") if c.discovery_ok == "Yes" else 0.0
        
#         # Lit Status Raw
#         l_status = c.litigation_status_id or 0
#         lit_status_raw = 0.0
#         if l_status in [3, 4, 6]:
#             lit_status_raw = get_v("raw_initial_a") if len(c.defendants) == 1 else get_v("multiple_initial_a")
#         elif l_status in [7, 8]: lit_status_raw = get_v("m2d_case_d")
#         elif l_status == 9: lit_status_raw = get_v("at_issue_case_e")
#         elif l_status == 11: lit_status_raw = get_v("msj_case_f")
#         elif l_status == 12: lit_status_raw = get_v("fee_pet_case_g")

#         # sum_case_values = lit_status_raw + sum_d_lit + discovery_raw + sum_d_discovery
#         c_settled = sum(d.settlement_amount for d in c.defendants if d.settlement_status == "Settled" and d.settlement_amount)
#         c_disc = sum(d.settlement_amount for d in c.defendants if d.settlement_status == "In Discussion" and d.settlement_amount)
        
#         net_case_value = (c_settled + c_disc + sum_case_values) - (c.filing_fee_amount or 0.0)

#         # Categorize by Status 14 (Disposed vs Pending)
#         if l_status >= 14:
#             disposed_value += net_case_value
#         else:
#             pending_value += net_case_value

#         # Count Case Statuses
#         case_status_counts[l_status] = case_status_counts.get(l_status, 0) + 1

#     # --- DEFENDANT STATUS BREAKDOWN ---
#     def_status_counts = {}
#     for d in all_defendants:
#         # Use the defendant's individual litigation status ID
#         ds = d.litigation_status_id
#         def_status_counts[ds] = def_status_counts.get(ds, 0) + 1

#     return {
#         "financials": {
#             "disposed": disposed_value,
#             "pending": pending_value
#         },
#         "cases": {
#             "total": len(cases),
#             "breakdown": case_status_counts
#         },
#         "defendants": {
#             "total": len(all_defendants),
#             "breakdown": def_status_counts
#         }
#     }

# # 3. STATIC FILES & HTML SERVING
# STATIC_PATH = "/app/app/static"
# CASES_HTML_PATH = os.path.join(STATIC_PATH, "cases.html")
# DEFENDANTS_HTML_PATH = os.path.join(STATIC_PATH, "defendants.html")
# DRIVERS_HTML_PATH = os.path.join(STATIC_PATH, "drivers.html")
# INDEX_HTML_PATH= os.path.join(STATIC_PATH, "index.html")

# # Mount the static directory
# if os.path.exists(STATIC_PATH):
#     app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")
    
# # Serve the index page
# @app.get("/", include_in_schema=False)
# async def serve_index():
#     if os.path.exists(INDEX_HTML_PATH):
#         return FileResponse("static/index.html")
#     return {"error": "index.html not found"}

# # Serve the Cases page
# @app.get("/cases")
# async def serve_cases_page():
#     if os.path.exists(CASES_HTML_PATH):
#         return FileResponse(CASES_HTML_PATH)
#     return {"error": "cases.html not found"}

# # Serve the Defendants page
# @app.get("/defendants")
# async def serve_defendants_page():
#     if os.path.exists(DEFENDANTS_HTML_PATH):
#         return FileResponse(DEFENDANTS_HTML_PATH)
#     return {"error": "defendants.html not found"}

# # Serve the Drivers page
# @app.get("/drivers")
# async def serve_drivers_page():
#     if os.path.exists(DRIVERS_HTML_PATH):
#         return FileResponse(DRIVERS_HTML_PATH)
#     return {"error": "drivers.html not found"}

# # Root redirect to the cases page
# @app.get("/")
# async def root():
#     if os.path.exists(CASES_HTML_PATH):
#         return FileResponse(CASES_HTML_PATH)
#     return {"message": "Welcome to Returnalyzer API. Visit /cases or /defendants for the UI."}