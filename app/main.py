from fastapi import FastAPI
from app.api import scan_routes, project_routes
from app.services.database import init_db

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DevSecOps Platform API")

# Configure CORS - allow all common development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080", 
        "http://localhost:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:8080", 
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

app.include_router(scan_routes.router)
app.include_router(project_routes.router)

@app.get("/")
async def root():
    return {"message": "DevSecOps Platform is running"}
