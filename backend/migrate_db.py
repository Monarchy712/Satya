from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        print("Adding missing columns to 'contractors' table...")
        cols = [
            ("registration_id", "VARCHAR"),
            ("specialty", "VARCHAR"),
            ("license_no", "VARCHAR"),
            ("location", "VARCHAR")
        ]
        for col, type_ in cols:
            try:
                conn.execute(text(f"ALTER TABLE contractors ADD COLUMN {col} {type_};"))
                print(f"✓ Added {col}")
            except Exception as e:
                print(f"! Could not add {col}: {e}")
        
        print("\nCreating 'tender_metadata' table if not exists...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tender_metadata (
                tender_address VARCHAR PRIMARY KEY,
                tender_name VARCHAR,
                tender_description VARCHAR,
                created_by_dept VARCHAR,
                selection_note VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        print("\nAdding missing columns to 'tender_metadata' table...")
        tm_cols = [
            ("tender_name", "VARCHAR"),
            ("tender_description", "VARCHAR"),
            ("created_by_dept", "VARCHAR")
        ]
        for col, type_ in tm_cols:
            try:
                conn.execute(text(f"ALTER TABLE tender_metadata ADD COLUMN {col} {type_};"))
                print(f"✓ Added {col} to tender_metadata")
            except Exception as e:
                print(f"! Could not add {col} to tender_metadata: {e}")
                

        print("\nCreating 'milestone_approvals' table if not exists...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS milestone_approvals (
                id SERIAL PRIMARY KEY,
                tender_address VARCHAR NOT NULL,
                milestone_id INTEGER NOT NULL,
                admin_address VARCHAR NOT NULL,
                role VARCHAR NOT NULL,
                signature VARCHAR,
                signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))

        print("\nEnsuring 'signature' column exists in 'milestone_approvals'...")
        try:
            conn.execute(text("ALTER TABLE milestone_approvals ADD COLUMN signature VARCHAR;"))
            print("✓ Added signature column")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("✓ Column 'signature' already exists.")
            else:
                print(f"! Error adding signature column (may already exist or table missing): {e}")

    print("Migration complete.")

if __name__ == "__main__":
    migrate()
