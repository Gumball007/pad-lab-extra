from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DB_URL = os.getenv("DB_URL") or 'localhost'
DB_PORT = os.getenv("DB_PORT") or 5433

DATABASE_URL = f'postgresql://ana:ana@{DB_URL}:{DB_PORT}/videos'

engine = create_engine(
    DATABASE_URL
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()