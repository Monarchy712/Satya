# Geo-Location Validation Integration Instructions

This document provides instructions on how to integrate the geo-location check feature from `geoLocationCheck/geoChecker.py` into the main application architecture.

## Overview
The goal is to verify that user-reported images are taken within a **1 km radius** of the respective tender's location. This check must occur **before** the images are sent to the ML (Roboflow) layer for defect detection.

## Prerequisites
1.  **Install Dependencies**: Add `exifread` to your python environment.
    ```bash
    pip install exifread
    ```
2.  **Database/Blockchain Update**: Ensure that Tender records (either in the database `TenderMetadata` or on-chain) include `latitude` and `longitude` fields for the project site.

## Integration Steps

### 1. Update `backend/routers/report.py`

#### Imports
Import the distance calculation logic:
```python
from geoLocationCheck.geoChecker import calculate_distance
import exifread
import io
```

#### Helper Function: Extract GPS from Image
Add a helper to extract decimal coordinates from the uploaded image `bytes`:
```python
def get_image_gps(image_content):
    tags = exifread.process_file(io.BytesIO(image_content))
    
    lat_tag = tags.get('GPS GPSLatitude')
    lon_tag = tags.get('GPS GPSLongitude')
    
    if not lat_tag or not lon_tag:
        return None, None

    def to_decimal(tag):
        values = tag.values
        d = float(values[0].num) / float(values[0].den)
        m = float(values[1].num) / float(values[1].den)
        s = float(values[2].num) / float(values[2].den)
        return d + (m / 60.0) + (s / 3600.0)

    return to_decimal(lat_tag), to_decimal(lon_tag)
```

#### Modify `/validate` Endpoint
Modify the `validate_report` function to include the geo-check:

1.  **Add `contract_id` to parameters**: The frontend must send the `contract_id` along with the images.
2.  **Fetch Tender Location**: Use the `contract_id` to get `tender_lat` and `tender_lon`.
3.  **Perform Check**:

```python
@router.post("/validate")
async def validate_report(
    contract_id: str, # Add this parameter
    files: List[UploadFile] = File(...),
    user=Depends(get_current_user)
):
    # 1. Fetch Tender Location (Example using a hypothetical DB query)
    # tender = db.query(Tender).filter(Tender.address == contract_id).first()
    # tender_lat, tender_lon = tender.latitude, tender.longitude
    
    # 2. Geo-Location Check (Before ML)
    for file in files:
        content = await file.read()
        img_lat, img_lon = get_image_gps(content)
        
        if img_lat is None:
            raise HTTPException(status_code=400, detail="Image missing GPS metadata")
            
        distance = calculate_distance(tender_lat, tender_lon, img_lat, img_lon)
        
        if distance > 1.0: # 1 KM radius
            return {
                "success": False,
                "message": f"Report Rejected: Image was taken {distance:.2f}km away from the project site (Max 1km allowed).",
                "rejection_reason": "LOCATION_MISMATCH"
            }
        
        # Reset file pointer for ML processing if needed, 
        # or pass 'content' directly to analyze_image
        file.content = content 

    # 3. Proceed to ML Layer (Existing Logic)
    # ... analyze_image(content) ...
```

## Logic Flow Summary
1.  **User uploads image** for a specific tender.
2.  **Server extracts EXIF GPS** data from the image.
3.  **Server fetches Tender GPS** from the database.
4.  **Haversine Formula** calculates the distance.
5.  **If Distance > 1km**: Immediate rejection. No ML API calls are made (saves cost/latency).
6.  **If Distance <= 1km**: Pass to Roboflow ML for defect analysis.
