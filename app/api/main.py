# main.py
from fastapi import FastAPI, Response
from pydantic import BaseModel
from agent import run_agent
from ics import make_ics
import os
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:5173",  # for Vite/React dev
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # or ["*"] for all
    allow_credentials=True,
    allow_methods=["*"],            # allow all methods including OPTIONS
    allow_headers=["*"],            # allow all headers
)

# Define Pydantic models
class PrioritizeIn(BaseModel):
    tasks_text: list[str]  # Changed to list of strings
    created_iso: str
    timezone: str
    user_id: str

class PlanIn(BaseModel):
    user_id: str
    timezone: str
    note: str
    schedule_plan: list

# CRITICAL: Define API routes BEFORE mounting static files
@app.post("/api/prioritize")
def prioritize(body: PrioritizeIn):
    plan = run_agent(body.tasks_text, body.created_iso, body.timezone)
    # Attach passthrough fields for frontend convenience
    plan["timestamp"] = body.created_iso
    plan["timezone"] = body.timezone
    plan["user_id"] = body.user_id
    return plan

@app.post("/api/ics")
def api_ics(body: PlanIn):
    ics = make_ics(body.schedule_plan, body.note, tzid=body.timezone)
    return Response(
        content=ics,
        media_type="text/calendar",
        headers={"Content-Disposition":"attachment; filename=taskpilot.ics"}
    )

# Mount static files LAST - this catches all remaining routes
WEB_DIR = os.path.join(os.path.dirname(__file__), "..", "web", "dist")
if os.path.exists(WEB_DIR):
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="static")
else:
    print(f"Warning: Static files directory not found: {WEB_DIR}")