from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.appointments import router as appointments_router
from app.api.v1.endpoints.payments import router as payments_router
from app.api.v1.endpoints.qr_tokens import router as qr_router
from app.api.v1.endpoints.departments import router as departments_router
from app.api.v1.endpoints.reports_staff import reports_router, staff_router
from app.api.v1.endpoints.staff_register import router as staff_register_router
from app.api.v1.endpoints.patients import router as patients_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(appointments_router)
api_router.include_router(payments_router)
api_router.include_router(qr_router)
api_router.include_router(departments_router)
api_router.include_router(reports_router)
api_router.include_router(staff_router)
api_router.include_router(staff_register_router)
api_router.include_router(patients_router)