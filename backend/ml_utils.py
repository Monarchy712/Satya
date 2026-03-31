import requests
import base64
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
        # Roboflow API expects base64 encoded string with x-www-form-urlencoded
        encoded_string = base64.b64encode(image_bytes).decode('ascii')
        
        response = requests.post(url, data=encoded_string, headers={
            "Content-Type": "application/x-www-form-urlencoded"
        }, timeout=15)
        
        if response.status_code != 200:
            return {"error": f"Roboflow API returned {response.status_code}", "predictions": []}
            
        return response.json()
    except Exception as e:
        return {"error": str(e), "predictions": []}

def calculate_image_score(results, constant=1.2):
    """
    Calculates final score: grabs all confidence values, multiplies by 100, 
    averages them out, multiplies by constant, and restricts to [0, 100].
    """
    predictions = results.get("predictions", [])
    
    # 🔴 Print the raw JSON from Roboflow to terminal for debugging
    print(f"\n[ML Debug] Raw Roboflow Response: {results}")
    
    # Process all predictions, assuming the model specializes in construction defects/cracks
    print(f"[ML Debug] Total Predictions to score: {len(predictions)}")
    
    if not predictions:
        print("[ML Debug] Returning 0.0 score because no predictions were found.")
        return 0.0
        
    # 1. Multiply all confidence scores by 100 before making derivations
    scores = [p.get("confidence", 0.0) * 100 for p in predictions]
    
    # 2. Add them and average out
    total_sum = sum(scores)
    avg_score = total_sum / len(scores)
    
    # 3. Multiply by constant
    final_score = avg_score * constant
    
    # Generalize to a score between 0 and 100
    clamped_score = max(0.0, min(100.0, final_score))
    print(f"[ML Debug] Scaled scores (*100): {scores} | Avg: {avg_score:.2f} | Final: {clamped_score:.2f}")
    return clamped_score
