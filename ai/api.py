from flask import Flask, request, jsonify
import cv2
import numpy as np
import os
from ekyc.ocr import OCRProcessor
from ekyc.document_verification import verify_document
from ekyc.data_validation import validate_id_data
from ekyc.risk_scoring import calculate_risk_score
from ekyc.identity_profile import build_profile

app = Flask(__name__)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/', methods=['GET'])
def index():
    """Serve the test frontend."""
    return app.send_static_file('index.html')

# Initialize the OCR processor once
ocr_processor = OCRProcessor()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "ekyc-orchestrator"})

@app.route('/ekyc/verify-document', methods=['POST', 'OPTIONS'])
def verify_document_endpoint():
    """
    Main eKYC orchestration endpoint.
    Expects a multipart form with an 'image' file.
    """
    if request.method == 'OPTIONS':
        return '', 204

    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    country = request.form.get('country', 'US')
    
    # 1. Load Image
    file_bytes = np.frombuffer(file.read(), np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    
    if image is None:
        return jsonify({"error": "Invalid image format"}), 400

    # 2. Step 1: OCR & Document Type Detection
    ocr_data = ocr_processor.process_document(image)
    doc_type = ocr_data.get("document_type", "unknown")
    
    # 3. Step 2: Quality & Authenticity Verification
    verif_results = verify_document(image, doc_type)
    
    # 4. Step 3: Data Validation (Format, Synthetic, Blacklist)
    # Mapping OCR raw text to structured fields for validation (simplified for hackathon)
    # In a real system, you'd use a more robust NER/Regex mapping here.
    id_data = {
        "id_number": ocr_data.get("raw_text")[0] if ocr_data.get("raw_text") else "",
        "country": country,
        "doc_type": doc_type,
        "dob": "1990-01-01", # Placeholder: would be extracted via regex from ocr_data
        "issue_date": "2020-01-01" # Placeholder
    }
    validation_results = validate_id_data(id_data)
    
    # 5. Step 4: Risk Scoring
    risk_results = calculate_risk_score(ocr_data, verif_results, validation_results)
    
    # 6. Step 5: Profile Generation
    identity_profile = build_profile(ocr_data, risk_results)
    
    # Final Response
    return jsonify({
        "success": risk_results["recommendation"] == "APPROVE",
        "recommendation": risk_results["recommendation"],
        "risk_score": risk_results["final_risk_score"],
        "component_risks": risk_results["component_risks"],
        "verification_details": verif_results,
        "validation_details": validation_results,
        "identity_profile": identity_profile
    })

if __name__ == '__main__':
    # Run on port 5001 to avoid conflicts with common React/Node ports
    app.run(host='0.0.0.0', port=5001, debug=True)
