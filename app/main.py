import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from typing import List

# These imports assume 'database.py' and 'models/' are inside the 'app' folder
from .database import get_session
from .models.cases import CaseEntry

app = FastAPI(title="Returnalyzer API")

# 1. CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. API ROUTE
@app.get("/api/cases", response_model=List[dict])
def get_cases_for_returnalyzer(session: Session = Depends(get_session)):
    statement = select(
        CaseEntry.id, 
        CaseEntry.case_name, 
        CaseEntry.case_number, 
        CaseEntry.litigation_status_id,
        CaseEntry.state,
        CaseEntry.county,
        CaseEntry.case_class,
        CaseEntry.type
    )
    results = session.exec(statement).all()
    
    return [
        {
            "id": r.id,
            "name": r.case_name,
            "number": r.case_number,
            "status": r.litigation_status_id,
            "location": f"{r.state} / {r.county}" if r.state and r.county else "N/A",
            "class": r.case_class,
            "type": r.type
        } for r in results
    ]

# 3. STATIC FILES & HTML SERVING
# In Docker, your WORKDIR is /app. 
# Your 'static' folder is at /app/static.
STATIC_PATH = "/app/app/static"
HTML_FILE_PATH = os.path.join(STATIC_PATH, "cases.html")

# Mount the static directory so returnalyzer.js can be loaded
if os.path.exists(STATIC_PATH):
    app.mount("/static", StaticFiles(directory=STATIC_PATH), name="static")

# Serve the main HTML page for /cases
@app.get("/cases")
async def serve_cases_page():
    if os.path.exists(HTML_FILE_PATH):
        return FileResponse(HTML_FILE_PATH)
    return {"error": "cases.html not found in /app/static/"}

# Root redirect to the cases page
@app.get("/")
async def root():
    if os.path.exists(HTML_FILE_PATH):
        return FileResponse(HTML_FILE_PATH)
    return {"message": "Welcome to Returnalyzer API. Visit /cases for the UI."}