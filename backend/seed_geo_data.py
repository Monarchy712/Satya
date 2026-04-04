from sqlalchemy import text
from database import engine

def seed():
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        print("Seeding synthetic geo-location data...")
        
        # Data format: (tender_address, tender_name, latitude, longitude)
        # Using IDs from frontend/src/data/contractors.js
        data = [
            ('con-1001', 'NH-48 Expressway Extension', 28.3513, 76.9038), # Manesar, Haryana
            ('con-1003', 'Village Road Connectivity - Alwar', 27.5530, 76.6346), # Alwar, Rajasthan
            ('con-2002', 'Government School Renovation - Thane', 19.2183, 72.9781), # Thane, Maharashtra
            ('con-6002', 'CCTV Network - Amritsar', 31.6340, 74.8723)  # Amritsar, Punjab
        ]
        
        for address, name, lat, lon in data:
            try:
                # Upsert logic
                conn.execute(text("""
                    INSERT INTO tender_metadata (tender_address, tender_name, latitude, longitude)
                    VALUES (:addr, :name, :lat, :lon)
                    ON CONFLICT (tender_address) DO UPDATE 
                    SET latitude = EXCLUDED.latitude, 
                        longitude = EXCLUDED.longitude,
                        tender_name = EXCLUDED.tender_name;
                """), {"addr": address, "name": name, "lat": lat, "lon": lon})
                print(f"OK: Seeded {name} ({address}) at {lat}, {lon}")
            except Exception as e:
                print(f"FAIL: Could not seed {address}: {e}")

    print("Seeding complete. Use these IDs in the Ledger to test geo-verification.")

if __name__ == "__main__":
    seed()
