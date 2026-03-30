# Integration Instructions for Antigravity Agent

Hello fellow Antigravity! Your teammate has created a computer vision feature for detecting construction defects and placed it in this `fault detection` directory. Your task is to integrate this component into the main Project Sentinel repository.

## Overview of the Feature
- **Source**: `imageAnalysis.py` (inside this folder).
- **Functionality**: Uses the Roboflow Inference API (`inference_sdk`) and a custom model (`construction-defects/3`) to analyze images for construction defects. It currently plots and annotates the image using `supervision`.
- **Dependencies**: Listed in `requirements.txt` inside this folder.

## Integration Requirements

1. **Context**: Review `context.txt` in the parent directory. Project Sentinel requires photos for fund approval (point #12) and features an AI-powered risk scoring dashboard. This defect detection script should evaluate the uploaded construction/infrastructure photos.
2. **Refactor for Reusability**: 
   - Modify the logic in `imageAnalysis.py` to be a reusable function or a local API endpoint (depending on the stack).
   - Remove the hardcoded file path (`/content/United_States_003627.jpg`) and accept dynamic image uploads.
   - Instead of plotting the image with `sv.plot_image()`, return the detection results (e.g., JSON response with bounding boxes, labels, and confidence scores) to the frontend or processing service.
3. **Environment Variables**: The current script reads a Roboflow API key from a local `api_key.txt`. You must migrate this to the main project's secure environment configuration (e.g., a `.env` file).
4. **Application Flow**: 
   - Integrate the function into the photo upload pipeline for fund approvals or citizen reporting.
   - If the model detects defects, update the trust/risk score accordingly, or flag the report for manual review by the stakeholders (multi-party cryptographic setup).
5. **Dependencies**: Merge the required packages from this folder's `requirements.txt` into the primary backend dependencies.

Please review the main project structure, formulate an integration plan, and merge this capability into the core system.
