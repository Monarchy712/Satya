import math
import io

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculates the Haversine distance between two points in km."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

# Test coordinates
site_lat, site_lon = 12.9716, 77.5946 # Bangalore (e.g., MG Road)
close_lat, close_lon = 12.9720, 77.5950 # Very close (< 100m)
far_lat, far_lon = 12.9900, 77.6500 # Far (> 5km)

dist_close = calculate_distance(site_lat, site_lon, close_lat, close_lon)
dist_far = calculate_distance(site_lat, site_lon, far_lat, far_lon)

print(f"Distance Close: {dist_close:.4f} km (Pass: {dist_close <= 1.0})")
print(f"Distance Far: {dist_far:.4f} km (Pass: {dist_far <= 1.0})")

# Verify logic
assert dist_close <= 1.0
assert dist_far > 1.0
print("Verification logic passed!")
