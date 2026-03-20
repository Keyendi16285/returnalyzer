from sqlmodel import create_engine, SQLModel, Session
import os 

DATABASE_URL = "postgresql://postgres:casemanagement@db:5432/case_management"

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    retries = 5
    while retries > 0:
        try:
            # Try to create tables
            SQLModel.metadata.create_all(engine)
            print("✅ Database connection successful and tables created!")
            return
        except OperationalError as e:
            retries -= 1
            print(f"⚠️ Database not ready... {retries} retries left. Error: {e}")
            time.sleep(3)  # Wait 3 seconds before next try
            
    print("❌ Could not connect to the database. Exiting.")
    raise SystemExit(1)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session