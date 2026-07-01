# 🏥 MediBook — Hospital Appointment Booking System

A full-stack hospital appointment booking platform with OTP login, QR-based check-in, online payments, and a complete role-based staff portal — built with FastAPI, React, and PostgreSQL.

<img width="1210" height="633" alt="Screenshot_6" src="https://github.com/user-attachments/assets/0d5d4271-27bd-4cf2-a7f3-a2d30aa054e6" />

<img width="1312" height="618" alt="Screenshot_5" src="https://github.com/user-attachments/assets/b648efd1-199b-4c30-be3a-3310a24e5da3" />

---

## ✨ Features

### Patient Side
- 📱 **OTP login** — phone number verification, no password needed
- 🪪 **NID protected booking** — one appointment per NID per day, no double booking
- 📅 **Smart scheduling** — department-wise available days and slot limits
- 💳 **Online payment** — SSLCommerz payment gateway integration
- 🎫 **QR queue token** — get a QR code with serial number, know your position in line
- 📧 **Email confirmation** — automatic booking confirmation via Gmail SMTP

### Staff Portal (Role-Based Access)
- 👑 **Super Admin** — full system access, manage all departments and staff
- 🛎️ **Receptionist** — camera-based QR scanner for patient check-in
- 🏢 **Department Manager** — manage appointments for their own department only
- 💰 **Finance** — view payments, generate reports, CSV export

### System Features
- ⏱️ **Auto-cancellation** — unpaid appointments auto-cancel after 15 minutes (background worker)
- 🔒 **JWT authentication** — secure role-based access control
- 📊 **CSV export** — download appointment data for reporting
- 🔐 **HMAC-signed QR tokens** — tamper-proof check-in verification

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy (async) |
| Frontend | React, Vite |
| Database | PostgreSQL |
| Auth | JWT |
| Payments | SSLCommerz Payment Gateway |
| QR Scanning | html5-qrcode |
| Email | Gmail SMTP |
| Migrations | Alembic |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL

### 1. Clone the repository
```bash
git clone https://github.com/anika92/MediBook.git
cd MediBook
```

### 2. Backend setup
```bash
cd medibook_backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create a `.env` file:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/medibook
SECRET_KEY=your_secret_key_here
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASS=your_store_password
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

Run migrations:
```bash
alembic upgrade head
```

Start the server:
```bash
uvicorn main:app --reload
```

### 3. Frontend setup
```bash
cd ../medibook-frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## 📁 Project Structure

```
MediBook/
├── medibook_backend/
│   ├── main.py
│   ├── models/
│   ├── routes/
│   ├── alembic/
│   └── requirements.txt
├── medibook-frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── staff/
│   │   │   └── admin/
│   │   └── components/
│   └── package.json
└── README.md
```

---

## 👥 User Roles

| Role | Access |
|---|---|
| Patient | Book appointments, view QR token, payment |
| Super Admin | Full system control |
| Receptionist | QR scanning, patient check-in |
| Department Manager | Manage own department's appointments |
| Finance | Payment reports, CSV export |

---

## 👩‍💻 Built By

**Asma Anika Shahabuddin** — Full Stack Developer & CS Student, Dhaka, Bangladesh

- 🌐 Fiverr: [CodeWithAnika](https://fiverr.com)
- 💼 Upwork: [CodeWithAnika](https://upwork.com)
- 🐙 GitHub: [github.com/anika92](https://github.com/anika92)

---

## 📄 License

MIT License — feel free to use and modify!
