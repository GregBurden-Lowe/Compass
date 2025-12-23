from datetime import datetime
from pydantic import BaseModel
from uuid import UUID


class ReferenceCreate(BaseModel):
    name: str


class ReferenceOut(BaseModel):
    id: UUID
    name: str
    created_at: datetime

    class Config:
        orm_mode = True


