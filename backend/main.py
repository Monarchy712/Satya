from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.citizen import router as citizen_router
from routers.wallet import router as wallet_router, contractor_router
from routers.report import router as report_router
from routers.admin_tasks import router as admin_tasks_router


app = FastAPI(
    title="Satya Transparency Platform",
    description="Authentication & transparency backend for decentralized infrastructure reporting",
    version="1.0.0",
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(citizen_router)
app.include_router(wallet_router)
app.include_router(contractor_router)
app.include_router(report_router)
app.include_router(admin_tasks_router)



@app.get("/")
def root():
    return {"status": "online", "service": "Satya Sentinel API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
