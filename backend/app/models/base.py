from sqlalchemy.orm import DeclarativeBase, declared_attr
from sqlalchemy import MetaData
import uuid
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import UUID

metadata = MetaData()


class Base(DeclarativeBase):
    metadata = metadata

    @declared_attr.directive
    def __tablename__(cls) -> str:  # type: ignore
        return cls.__name__.lower()

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

