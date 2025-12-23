import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import create_app
from app.db.session import get_db
from app.models.base import Base
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import get_password_hash


@pytest.fixture(scope="session")
def db_engine():
    tmpdir = tempfile.mkdtemp()
    url = f"sqlite:///{os.path.join(tmpdir, 'test.db')}"
    engine = create_engine(url, connect_args={"check_same_thread": False}, future=True)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture()
def db_session(db_engine):
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine, future=True)
    db = TestingSessionLocal()
    try:
        if not db.query(User).first():
            db.add(
                User(
                    email="test@example.com",
                    full_name="Tester",
                    role=UserRole.admin,
                    hashed_password=get_password_hash("password123"),
                )
            )
            db.commit()
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(db_session):
    app = create_app()

    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

    def override_get_current_user():
        return db_session.query(User).first()

    from app.api import deps

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[deps.get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c

