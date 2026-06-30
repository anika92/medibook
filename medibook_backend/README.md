# MediBook — Hospital Appointment System API

FastAPI + PostgreSQL + Redis + bKash PGW

---

## Project structure

```
medibook/
├── app/
│   ├── api/v1/
│   │   ├── deps.py                  # JWT auth dependencies
│   │   ├── router.py                # registers all routers
│   │   └── endpoints/
│   │       ├── auth.py              # OTP send/verify, patient register, staff login
│   │       ├── appointments.py      # book, cancel, list, slot check
│   │       ├── payments.py          # bKash initiate, callback, verify
│   │       ├── qr_tokens.py         # QR scan (reception desk)
│   │       ├── departments.py       # CRUD + weekly schedule editor
│   │       └── reports_staff.py     # daily/dept reports, staff management
│   ├── core/
│   │   ├── config.py                # Settings from .env
│   │   └── security.py              # JWT + bcrypt
│   ├── db/session.py                # Async SQLAlchemy engine + session
│   ├── models/models.py             # All DB models
│   ├── schemas/schemas.py           # Pydantic request/response schemas
│   ├── services/
│   │   ├── appointment_service.py   # Core booking logic + constraints
│   │   └── bkash.py                 # bKash PGW API client
│   ├── utils/helpers.py             # NID hashing, OTP, QR generation
│   └── main.py                      # FastAPI app entry point
├── alembic/                         # DB migrations
├── requirements.txt
├── docker-compose.yml
└── .env.example
```

---

## Quick start

### 1. Clone and configure

```bash
git clone <repo>
cd medibook
cp .env .env
# Edit .env with your DB, bKash, and secret credentials
```

### 2. Run with Docker (recommended)

```bash
docker-compose up --build
```

API is live at: http://localhost:8000  
Swagger docs at: http://localhost:8000/docs

### 3. Or run locally

```bash
# Start PostgreSQL and Redis first, then:
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

---

## Key API endpoints

| Method | Endpoint | Who | Description |
|--------|----------|-----|-------------|
| POST | `/api/v1/auth/otp/send` | Anyone | Send OTP to phone |
| POST | `/api/v1/auth/otp/verify` | Anyone | Verify OTP, get JWT |
| POST | `/api/v1/auth/register` | Anyone | Register new patient |
| POST | `/api/v1/auth/staff/login` | Staff | Staff login |
| GET  | `/api/v1/departments/` | Anyone | List departments |
| GET  | `/api/v1/departments/{id}/slots?check_date=` | Anyone | Check slot availability |
| POST | `/api/v1/appointments/` | Patient | Book appointment |
| POST | `/api/v1/payments/initiate/{appt_id}` | Patient | Start bKash payment |
| GET  | `/api/v1/payments/bkash-callback` | bKash | Payment callback |
| POST | `/api/v1/qr/scan` | Reception staff | Scan QR to admit patient |
| PUT  | `/api/v1/departments/{id}` | Admin | Edit dept schedule/slots |
| GET  | `/api/v1/reports/daily?report_date=` | Admin | Daily stats |
| GET  | `/api/v1/reports/departments` | Admin | Per-dept analytics |

Full interactive docs available at `/docs` (Swagger UI).

---

## Core business rules enforced in code

| Rule | Where enforced |
|------|---------------|
| One appointment per NID per day | `UNIQUE(patient_id, appt_date)` constraint + `_check_patient_daily_limit()` |
| Max 100 slots per dept per day | `_get_next_serial()` in `appointment_service.py` |
| Dept must be open on chosen weekday | `_check_dept_open()` checks `DeptSchedule` table |
| NID never stored raw | `hash_nid()` in `helpers.py` — SHA-256 + secret salt |
| QR tokens are HMAC-signed | `generate_qr_token()` / `verify_qr_token()` in `helpers.py` |
| Payment verified server-side | bKash PGW execute + query API in `bkash.py` |
| Role-based access | `require_roles()` dependency in `deps.py` |

---

## Staff roles and access

| Role | Modules accessible |
|------|--------------------|
| `super_admin` | Everything |
| `receptionist` | QR scanner only |
| `dept_manager` | Own department + appointments |
| `finance` | Payments + reports |
