@echo off
REM ─────────────────────────────────────────────────────────────
REM MediBook — Windows setup script
REM Creates a virtual environment and installs all dependencies
REM ─────────────────────────────────────────────────────────────

echo.
echo ╔══════════════════════════════════════╗
echo ║   MediBook Backend — Setup Script    ║
echo ╚══════════════════════════════════════╝
echo.

REM ── 1. Check Python ──────────────────────────────────────────
echo ^→ Checking Python...
python --version
if %errorlevel% neq 0 (
    echo ✗ Python not found. Install from https://python.org
    pause
    exit /b 1
)

REM ── 2. Create venv ───────────────────────────────────────────
echo.
echo ^→ Creating virtual environment...
python -m venv venv
echo   ✓ venv created

REM ── 3. Upgrade pip ───────────────────────────────────────────
echo.
echo ^→ Upgrading pip...
venv\Scripts\pip install --quiet --upgrade pip
echo   ✓ pip upgraded

REM ── 4. Install requirements ───────────────────────────────────
echo.
echo ^→ Installing dependencies...
venv\Scripts\pip install --quiet -r requirements.txt
echo   ✓ All packages installed

REM ── 5. Create .env ───────────────────────────────────────────
echo.
if not exist .env (
    copy .env.example .env
    echo ^→ Created .env from .env.example
    echo   ⚠  Edit .env with your credentials before running.
) else (
    echo ^→ .env already exists — skipping
)

REM ── Done ─────────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   Setup complete! Next steps:                        ║
echo ║                                                      ║
echo ║   1. Edit .env with your credentials                 ║
echo ║   2. Start PostgreSQL + Redis                        ║
echo ║   3. Run migrations:                                 ║
echo ║        venv\Scripts\alembic upgrade head             ║
echo ║   4. Start server:                                   ║
echo ║        venv\Scripts\uvicorn app.main:app --reload    ║
echo ║   5. Swagger docs: http://localhost:8000/docs        ║
echo ╚══════════════════════════════════════════════════════╝
echo.
pause
