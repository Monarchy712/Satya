import math
import exifread


def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Radius of the Earth in kilometers

    # Convert latitude and longitude from degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    # Haversine formula
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c

    return distance

def is_at_location(lat1, lon1, lat2, lon2):
    #fetch lat1 and lon1 from tender to access location of tender
    #import image from user input in report.py file
    #extract file name from user input
    file_name = input("Enter the file name: ")
    #extract latitude and longitude from image
    with open(file_name, 'rb') as f:
        tags = exifread.process_file(f)

    lat = tags.get('GPS GPSLatitude')
    lon = tags.get('GPS GPSLongitude')

    # Assuming 'lat' is the 'GPS GPSLatitude' IfdTag
    d = float(lat.values[0].num) / float(lat.values[0].den)
    m = float(lat.values[1].num) / float(lat.values[1].den)
    s = float(lat.values[2].num) / float(lat.values[2].den)
    decimal_lat = d + (m / 60.0) + (s / 3600.0)
    d = float(lon.values[0].num) / float(lon.values[0].den)
    m = float(lon.values[1].num) / float(lon.values[1].den)
    s = float(lon.values[2].num) / float(lon.values[2].den)
    decimal_lon = d + (m / 60.0) + (s / 3600.0)

    print(f"Decimal Latitude: {decimal_lat}")
    print(f"Decimal Longitude: {decimal_lon}")


    distance = calculate_distance(lat1, lon1, decimal_lat, decimal_lon)

    if distance > 1:
        print(f"Distance: {distance} km")
        print("Too far from source.")
        return False
    else:
        print(f"Distance: {distance} km")
        print("You are at the source location.")
        return True

# Example usage:
lat1, lon1 = 12.9716, 77.5946  # Source location (e.g., Bengaluru)
lat2, lon2 = 12.9717, 77.5947  # Destination location

is_at_location(lat1, lon1, lat2, lon2)