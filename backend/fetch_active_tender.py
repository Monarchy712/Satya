import requests
import json
import sys

def fetch_active_tender():
    url = "http://localhost:8000/api/tenders/list"
    try:
        print(f"Fetching data from {url} (this may take up to 30s)...")
        response = requests.get(url, timeout=35)
        if response.status_code == 200:
            tenders = response.json()
            # Filter for ACTIVE tenders
            active_tenders = [t for t in tenders if t.get("status") == "ACTIVE"]
            if active_tenders:
                print("\n=== CURRENTLY ACTIVE TENDER ===\n")
                print(json.dumps(active_tenders[0], indent=2))
            else:
                print("\nNo currently active tenders found in the system.")
        else:
            print(f"\nError: Backend returned status code {response.status_code}")
            print(response.text)
    except requests.exceptions.Timeout:
        print("\nError: The request timed out. The blockchain sync might be slow.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    fetch_active_tender()
