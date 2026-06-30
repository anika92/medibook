import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import getpass
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.models import StaffMember, StaffRole
from app.core.security import hash_password

async def create_admin():
    print("\n=== MediBook — Create Admin ===\n")

    full_name = input("Full name: ")
    phone     = input("Phone (01XXXXXXXXX): ")
    password  = getpass.getpass("Password (hidden): ")
    confirm   = getpass.getpass("Confirm password: ")

    if password != confirm:
        print("\n✗ Passwords do not match.")
        return

    if len(password) < 8:
        print("\n✗ Password must be at least 8 characters.")
        return

    async with AsyncSessionLocal() as db:
        # Check if phone already exists
        result = await db.execute(
            select(StaffMember).where(StaffMember.phone == phone)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"\n✗ Phone {phone} is already registered.")
            return

        admin = StaffMember(
            full_name=full_name,
            phone=phone,
            hashed_password=hash_password(password),
            role=StaffRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"\n✓ Admin created successfully!")
        print(f"  Name  : {full_name}")
        print(f"  Phone : {phone}")
        print(f"  Role  : super_admin\n")

if __name__ == "__main__":
    asyncio.run(create_admin())