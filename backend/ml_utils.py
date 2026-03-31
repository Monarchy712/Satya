import requests
import io
from PIL import Image
from config import ROBOFLOW_API_KEY, ROBOFLOW_MODEL_ID

def analyze_image(image_bytes: bytes):
    """
    Calls the Roboflow Inference API directly to detect construction defects.
    Returns the raw analysis JSON with predictions.
    """
    if not ROBOFLOW_API_KEY or not ROBOFLOW_MODEL_ID:
        return {"error": "Roboflow configuration missing", "predictions": []}

    # Roboflow Hosted API endpoint
    # URL format: https://detect.roboflow.com/[MODEL_ID]/[VERSION]?api_key=[API_KEY]
    # Note: ROBOFLOW_MODEL_ID already contains "construction-defects/3"
    url = f"https://detect.roboflow.com/{ROBOFLOW_MODEL_ID}?api_key={ROBOFLOW_API_KEY}"

    try:
        # We can send the raw bytes directly to Roboflow
        # Alternatively, we could compress it with Pillow first to save bandwidth
        response = requests.post(url, data=image_bytes, headers={
            "Content-Type": "application/octet-stream"
        }, timeout=15)
        
        if response.status_code != 200:
            return {"error": f"Roboflow API returned {response.status_code}", "predictions": []}
            
        return response.json()
    except Exception as e:
        return {"error": str(e), "predictions": []}

def get_best_confidence(results):
    """
    Extracts the highest confidence score from the detections.
    """
    predictions = results.get("predictions", [])
    if not predictions:
        return 0.0
        
    return max([p.get("confidence", 0.0) for p in predictions])

def get_average_confidence(results):
    """
    Extracts the average confidence score from all detections.
    If multiple cracks/defects are found, we average their scores.
    """
    predictions = results.get("predictions", [])
    if not predictions:
        return 0.0
        
    confidences = [p.get("confidence", 0.0) for p in predictions]
    return sum(confidences) / len(confidences)
