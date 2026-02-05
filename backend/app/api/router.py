from fastapi import APIRouter

from app.api import auth, complaints, users, reference, config as config_api

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(complaints.router)
api_router.include_router(users.router)
api_router.include_router(reference.router)
api_router.include_router(config_api.router)

