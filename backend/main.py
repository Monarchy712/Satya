from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import os
from routers.citizen import router as citizen_router
from routers.wallet import router as wallet_router, contractor_router
from routers.report import router as report_router
from routers.admin_tasks import router as admin_tasks_router
from routers.tenders import router as tenders_router
from routers.roles import router as roles_router
from routers.dispute import router as dispute_router


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
app.include_router(tenders_router)
app.include_router(roles_router)
app.include_router(dispute_router)

# Custom Error Handlers to ensure CORS headers are present on exceptions
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
        }
    )






@app.get("/health")
def health():
    return {"status": "healthy"}

# ── Unified Frontend Serving ──
# Mount the static files directory (built from frontend/dist)
# This should be at the end so it doesn't mask API routes
if os.path.exists("static"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        # 1. API routes should have been caught; if not, return 404
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        
        # 2. Check if requested path is a file in 'static/' (e.g., favicon.ico)
        static_file = os.path.join("static", full_path)
        if os.path.isfile(static_file):
            return FileResponse(static_file)
            
        # 3. Serve index.html for SPA routes or if file not found
        index_path = os.path.join("static", "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
            
        return JSONResponse(status_code=404, content={"detail": "Frontend assets not found"})


