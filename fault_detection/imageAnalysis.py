import cv2
import requests
import supervision as sv
from inference_sdk import InferenceHTTPClient
from PIL import Image

file_path = '/content/United_States_003627.jpg'

img = Image.open(file_path)

img.show()

with open('api_key.txt', 'r') as f:
  api_key = f.read()

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=api_key,
)
results = client.infer(img, model_id="construction-defects/3")

detections = sv.Detections.from_inference(results)

labels = [f'{i['class']} {i['confidence']:.3f}' for i in results['predictions']]

if detections.is_empty():
    print("No detections found")
    sv.plot_image(img)
else:
  annotated_image = sv.BoxAnnotator().annotate(scene=img, detections=detections)
  label_annotator = sv.LabelAnnotator()
  annotated_frame = label_annotator.annotate(
      scene=img.copy(),
      detections=detections,
      labels=labels
  )
  sv.plot_image(annotated_frame)