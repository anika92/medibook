#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# MediBook — one-command local setup
# Creates a virtual environment and installs all dependencies
# ─────────────────────────────────────────────────────────────

set -e

PYTHON=${PYTHON:-python3}
VENV_DIR="venv"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   MediBook Backend — Setup Script    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Check Python version ───────────────────────────────────
echo "→ Checking Python version..."
$PYTHON --version
PYVER=$($PYTHON -c "import sys; print(sys.version_info.minor)")
if [ "$PYVER" -lt 11 ]; then
  echo "✗ Python 3.11 or higher is required. Detected: 3.$PYVER"
  exit 1
fi
echo "  ✓ Python OK"

# ── 2. Create virtual environment ─────────────────────────────
echo ""
echo "→ Creating virtual environment in ./$VENV_DIR ..."
$PYTHON -m venv $VENV_DIR
echo "  ✓ venv created"

# ── 3. Upgrade pip ────────────────────────────────────────────
echo ""
echo "→ Upgrading pip..."
$VENV_DIR/bin/pip install --quiet --upgrade pip
echo "  ✓ pip upgraded"

# ── 4. Install dependencies ───────────────────────────────────
echo ""
echo "→ Installing dependencies from requirements.txt..."
$VENV_DIR/bin/pip install --quiet -r requirements.txt
echo "  ✓ All packages installed"

# ── 5. Create .env if not present ─────────────────────────────
echo ""
if [ ! -f ".env" ]; then
  cp .env .env
  echo "→ Created .env from .env.example"
  echo "  ⚠  Edit .env and fill in your DATABASE_URL, SECRET_KEY, bKash credentials, etc."
else
  echo "→ .env already exists — skipping"
fi

# ── 6. Done ───────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Setup complete! Next steps:                        ║"
echo "║                                                      ║"
echo "║   1. Edit .env with your credentials                 ║"
echo "║   2. Start PostgreSQL + Redis (or: docker-compose up)║"
echo "║   3. Run migrations:                                 ║"
echo "║        venv/bin/alembic upgrade head                 ║"
echo "║   4. Start the API server:                           ║"
echo "║        venv/bin/uvicorn app.main:app --reload        ║"
echo "║   5. Open Swagger docs:                              ║"
echo "║        http://localhost:8000/docs                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
