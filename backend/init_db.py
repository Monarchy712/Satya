"""
Run this script once to create all tables in the Neon PostgreSQL database.
Usage: python init_db.py
"""
from database import engine, Base
from models import Admin, Contractor  # noqa: F401 — import so models register

if __name__ == "__main__":
    print("Creating tables in Neon PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully:")
    for table_name in Base.metadata.tables:
        print(f"  • {table_name}")
    print("\nYou can now insert admin records directly into the 'admins' table.")
    print("Use the /api/contractors/register endpoint or the UI to add contractors.")
