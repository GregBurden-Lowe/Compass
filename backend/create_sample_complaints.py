#!/usr/bin/env python3
"""Quick script to create sample complaints via the API or directly in the database.
Run this inside the backend container: docker compose exec backend python create_sample_complaints.py
"""

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db import base  # noqa: F401  # ensure all models are registered
from app.services import complaints as service
from app.utils.dates import utcnow

def create_sample_complaints():
    db = SessionLocal()
    try:
        now = utcnow()
        
        # Sample 1: Recent complaint
        complaint1 = service.create_complaint(
            db,
            complaint_data={
                "source": "Email",
                "received_at": now - timedelta(days=2),
                "description": "Customer complaint about delayed claim processing. Claim submitted 3 weeks ago with no response.",
                "category": "Claims Handling",
                "reason": "Processing delay",
                "fca_complaint": False,
                "vulnerability_flag": False,
            },
            complainant_data={
                "full_name": "Sarah Johnson",
                "email": "sarah.johnson@example.com",
                "phone": "+44 20 1234 5678",
            },
            policy_data={
                "policy_number": "MOT-2024-001234",
                "product": "Motor",
                "insurer": "Example Insurance Co",
                "broker": "Test Broker Ltd",
            },
        )
        print(f"Created complaint: {complaint1.reference} - {complaint1.complainant.full_name}")
        
        # Sample 2: Older complaint
        complaint2 = service.create_complaint(
            db,
            complaint_data={
                "source": "Phone",
                "received_at": now - timedelta(days=15),
                "description": "Dispute over policy coverage. Customer believes claim should be covered but was declined.",
                "category": "Policy Administration",
                "reason": "Coverage dispute",
                "fca_complaint": True,
                "vulnerability_flag": False,
            },
            complainant_data={
                "full_name": "Michael Brown",
                "email": "m.brown@example.com",
                "phone": "+44 20 9876 5432",
            },
            policy_data={
                "policy_number": "HOME-2024-005678",
                "product": "Home",
                "insurer": "Another Insurer Ltd",
                "broker": "Broker Services",
            },
        )
        service.acknowledge(db, complaint2, None)
        print(f"Created complaint: {complaint2.reference} - {complaint2.complainant.full_name}")
        
        # Sample 3: Vulnerable customer complaint
        complaint3 = service.create_complaint(
            db,
            complaint_data={
                "source": "Letter",
                "received_at": now - timedelta(days=5),
                "description": "Complaint regarding poor customer service and lack of support during difficult time.",
                "category": "Vulnerability and Customer Treatment",
                "reason": "Poor service during vulnerable period",
                "fca_complaint": False,
                "vulnerability_flag": True,
                "vulnerability_notes": "Customer recently bereaved, requires additional support",
            },
            complainant_data={
                "full_name": "Emma Wilson",
                "email": "emma.wilson@example.com",
                "phone": "+44 20 5555 1234",
            },
            policy_data={
                "policy_number": "LIFE-2024-009876",
                "product": "Life",
                "insurer": "Life Insurance Co",
            },
        )
        print(f"Created complaint: {complaint3.reference} - {complaint3.complainant.full_name}")
        
        # Sample 4: New complaint (just received)
        complaint4 = service.create_complaint(
            db,
            complaint_data={
                "source": "Web",
                "received_at": now,
                "description": "Online complaint form submission about premium increase without notice.",
                "category": "Pricing and Premiums",
                "reason": "Premium increase",
                "fca_complaint": False,
                "vulnerability_flag": False,
            },
            complainant_data={
                "full_name": "David Lee",
                "email": "david.lee@example.com",
                "phone": "+44 20 1111 2222",
            },
            policy_data={
                "policy_number": "MOT-2024-003456",
                "product": "Motor",
                "insurer": "Example Insurance Co",
            },
        )
        print(f"Created complaint: {complaint4.reference} - {complaint4.complainant.full_name}")
        
        db.commit()
        print(f"\n✅ Successfully created 4 sample complaints!")
        print(f"   - {complaint1.reference}: {complaint1.complainant.full_name}")
        print(f"   - {complaint2.reference}: {complaint2.complainant.full_name} (Acknowledged)")
        print(f"   - {complaint3.reference}: {complaint3.complainant.full_name} (Vulnerable)")
        print(f"   - {complaint4.reference}: {complaint4.complainant.full_name}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating complaints: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_complaints()

