import requests
import os
import sys

# Simple script to test the integrated API
def test_integration():
    url = "http://127.0.0.1:5001/ekyc/verify-document"
    
    # Paths to test images (we'll use the ones created by test.py if available, 
    # or just mock them if we are just testing the code path)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    doc_path = os.path.join(base_dir, "models", "test_id.jpg")
    selfie_path = os.path.join(base_dir, "models", "test_face.jpg")
    
    # Create them if they don't exist (using the same logic as test.py)
    import cv2
    import numpy as np
    
    if not os.path.exists(doc_path):
        img = np.ones((400, 600, 3), dtype=np.uint8) * 240
        cv2.putText(img, "PASSPORT", (250, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
        cv2.imwrite(doc_path, img)
        
    if not os.path.exists(selfie_path):
        img = np.ones((300, 300, 3), dtype=np.uint8) * 200
        cv2.circle(img, (150, 130), 50, (150, 100, 100), -1)
        cv2.imwrite(selfie_path, img)

    files = {
        'image': open(doc_path, 'rb'),
        'selfie': open(selfie_path, 'rb')
    }
    data = {'country': 'US'}
    
    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, files=files, data=data)
        print(f"Status: {response.status_code}")
        print("Response:")
        import json
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")
    finally:
        files['image'].close()
        files['selfie'].close()

if __name__ == "__main__":
    test_integration()
