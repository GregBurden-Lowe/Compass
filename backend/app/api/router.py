from fastapi import APIRouter

from app.api import auth, complaints, users, reference

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(complaints.router)
api_router.include_router(users.router)
api_router.include_router(reference.router)

