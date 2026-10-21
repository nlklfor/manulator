from fastapi import FastAPI
from app.routers import manuscripts

app = FastAPI(title="Manulator ML Service")

app.include_router(manuscripts.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}



