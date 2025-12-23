import csv
from io import StringIO
from typing import Type

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.broker import Broker
from app.models.insurer import Insurer
from app.models.product import Product
from app.models.enums import UserRole
from app.schemas.reference import ReferenceCreate, ReferenceOut


router = APIRouter(prefix="/reference", tags=["reference"])


def _list(model: Type, db: Session):
    return db.query(model).order_by(model.name.asc()).all()


def _create(model: Type, payload: ReferenceCreate, db: Session):
    existing = db.query(model).filter(model.name.ilike(payload.name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name already exists")
    item = model(name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _import(model: Type, file: UploadFile, db: Session):
    content = file.file.read().decode()
    reader = csv.DictReader(StringIO(content))
    if "name" not in reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV must include 'name' column")
    added = 0
    seen: set[str] = set()
    for row in reader:
        name = (row.get("name") or "").strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        exists = db.query(model).filter(model.name.ilike(name)).first()
        if exists:
            continue
        db.add(model(name=name))
        added += 1
    db.commit()
    return {"added": added}


@router.get("/products", response_model=list[ReferenceOut])
def list_products(db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    return _list(Product, db)


@router.post("/products", response_model=ReferenceOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ReferenceCreate, db: Session = Depends(get_db), _: None = Depends(require_roles([UserRole.admin]))):
    return _create(Product, payload, db)


@router.post("/products/import")
def import_products(file: UploadFile, db: Session = Depends(get_db), _: None = Depends(require_roles([UserRole.admin]))):
    return _import(Product, file, db)


@router.get("/brokers", response_model=list[ReferenceOut])
def list_brokers(db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    return _list(Broker, db)


@router.post("/brokers", response_model=ReferenceOut, status_code=status.HTTP_201_CREATED)
def create_broker(payload: ReferenceCreate, db: Session = Depends(get_db), _: None = Depends(require_roles([UserRole.admin]))):
    return _create(Broker, payload, db)


@router.post("/brokers/import")
def import_brokers(file: UploadFile, db: Session = Depends(get_db), _: None = Depends(require_roles([UserRole.admin]))):
    return _import(Broker, file, db)


@router.get("/insurers", response_model=list[ReferenceOut])
def list_insurers(db: Session = Depends(get_db), _: None = Depends(get_current_user)):
    return _list(Insurer, db)


@router.post("/insurers", response_model=ReferenceOut, status_code=status.HTTP_201_CREATED)
def create_insurer(payload: ReferenceCreate, db: Session = Depends(get_db), _: None = Depends(require_roles([UserRole.admin]))):
    return _create(Insurer, payload, db)


@router.post("/insurers/import")
def import_insurers(file: UploadFile, db: Session = Depends(get_db), _: None = Depends(require_roles([UserRole.admin]))):
    return _import(Insurer, file, db)


