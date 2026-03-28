from flask import Flask, request, jsonify
import cv2
import numpy as np
import os
import base64
from ekyc.ocr import OCRProcessor
from ekyc.document_verification import verify_document
from ekyc.data_validation import validate_id_data
from ekyc.risk_scoring import calculate_risk_score
from ekyc.identity_profile import build_profile
from models.liveness import interactive_liveness, calculate_liveness_score
from models import face_recognition as face_rec_module
from models.risk_scoring import calculate_risk

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

# ── Helpers ──────────────────────────────────────────────────────────────────

def _decode_image(file_field):
    """Decode a multipart image file into an OpenCV ndarray."""
    file_bytes = np.frombuffer(file_field.read(), np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    return image

def _decode_base64_image(b64_str: str):
    """Decode a base64-encoded image string into an OpenCV ndarray."""
    if ',' in b64_str:
        b64_str = b64_str.split(',')[1]
    img_bytes = base64.b64decode(b64_str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

# ── Health check ─────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "identity-hub-ai"})

# ── Liveness ─────────────────────────────────────────────────────────────────

@app.route('/liveness/verify', methods=['POST', 'OPTIONS'])
def liveness_verification():
    """
    Liveness detection endpoint.
    Expects multipart form with an 'image' file.
    Returns: { is_live, score, method, warning }
    """
    if request.method == 'OPTIONS':
        return '', 204

    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = _decode_image(request.files['image'])
    if image is None:
        return jsonify({"error": "Invalid image format"}), 400

    liveness_result = calculate_liveness_score(image)
    return jsonify({
        "is_live": liveness_result["is_live"],
        "score": liveness_result["score"],
        "method": liveness_result["method"],
        "warning": liveness_result.get("warning")
    })

# ── eKYC document verification ───────────────────────────────────────────────

@app.route('/ekyc/verify-document', methods=['POST', 'OPTIONS'])
def verify_document_endpoint():
    """
    Full eKYC orchestration pipeline.
    Expects multipart form with an 'image' file.

    Pipeline: OCR → Document Verification → Data Validation → Risk Scoring → Profile
    Returns full analysis + identity_profile.
    """
    if request.method == 'OPTIONS':
        return '', 204

    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = _decode_image(request.files['image'])
    if image is None:
        return jsonify({"error": "Invalid image format"}), 400

    country = request.form.get('country', 'US')

    # Step 1: OCR & doc type detection
    ocr_data = ocr_processor.process_document(image)
    doc_type  = ocr_data.get("document_type", "unknown")

    # Step 2: Authenticity verification
    verif_results = verify_document(image, doc_type)

    # Step 3: Data validation
    raw_text = ocr_data.get("raw_text") or []
    id_data = {
        "id_number": raw_text[0] if raw_text else "",
        "country": country,
        "doc_type": doc_type,
        "dob": "1990-01-01",
        "issue_date": "2020-01-01"
    }
    validation_results = validate_id_data(id_data)

    # Step 4: Risk scoring
    risk_results = calculate_risk_score(ocr_data, verif_results, validation_results)

    # Step 5: Build identity profile
    identity_profile = build_profile(ocr_data, risk_results)

    return jsonify({
        "success": risk_results["recommendation"] == "APPROVE",
        "recommendation": risk_results["recommendation"],
        "risk_score": risk_results["final_risk_score"],
        "component_risks": risk_results["component_risks"],
        "verification_details": verif_results,
        "validation_details": validation_results,
        "identity_profile": identity_profile
    })

# ── Face recognition ─────────────────────────────────────────────────────────

@app.route('/face/enroll', methods=['POST', 'OPTIONS'])
def face_enroll():
    """
    Enroll a user's face embedding into the SQLite database.
    Expects multipart form:
      - image: face image file
      - user_id: string identifier (typically the userId from MongoDB)
    Returns: { success, user_id, message }
    """
    if request.method == 'OPTIONS':
        return '', 204

    if 'image' not in request.files or not request.form.get('user_id'):
        return jsonify({"error": "Missing 'image' file or 'user_id' field"}), 400

    image = _decode_image(request.files['image'])
    if image is None:
        return jsonify({"error": "Invalid image format"}), 400

    user_id = request.form['user_id']
    success = face_rec_module.enroll(user_id, image)

    if success:
        return jsonify({"success": True, "user_id": user_id, "message": "Face enrolled successfully"})
    else:
        return jsonify({"success": False, "user_id": user_id, "message": "Face enrollment failed — ensure a clear face is visible"}), 422


@app.route('/face/verify', methods=['POST', 'OPTIONS'])
def face_verify():
    """
    Verify a user's face against their stored embedding.
    Expects multipart form:
      - image: probe face image file
      - user_id: string identifier
    Returns: { verified, similarity, threshold, user_id, error }
    """
    if request.method == 'OPTIONS':
        return '', 204

    if 'image' not in request.files or not request.form.get('user_id'):
        return jsonify({"error": "Missing 'image' file or 'user_id' field"}), 400

    image = _decode_image(request.files['image'])
    if image is None:
        return jsonify({"error": "Invalid image format"}), 400

    user_id = request.form['user_id']
    result  = face_rec_module.verify(user_id, image)
    return jsonify(result)


@app.route('/face/compare', methods=['POST', 'OPTIONS'])
def face_compare():
    """
    Direct 1:1 face comparison — ID photo vs. selfie.
    Expects multipart form:
      - id_image: ID document photo
      - selfie: live selfie
    Returns: { similarity, match, threshold }
    """
    if request.method == 'OPTIONS':
        return '', 204

    if 'id_image' not in request.files or 'selfie' not in request.files:
        return jsonify({"error": "Both 'id_image' and 'selfie' files are required"}), 400

    id_img = _decode_image(request.files['id_image'])
    selfie = _decode_image(request.files['selfie'])

    if id_img is None or selfie is None:
        return jsonify({"error": "One or both images are invalid"}), 400

    similarity = face_rec_module.compare(id_img, selfie)
    threshold  = face_rec_module.SIMILARITY_THRESHOLD
    return jsonify({
        "similarity": similarity,
        "match": similarity >= threshold,
        "threshold": threshold
    })


@app.route('/face/users', methods=['GET'])
def face_list_users():
    """List all enrolled user IDs in the face embedding database."""
    users = face_rec_module.list_users()
    return jsonify({"users": users, "count": len(users)})


@app.route('/face/delete/<user_id>', methods=['DELETE', 'OPTIONS'])
def face_delete_user(user_id):
    """Remove a user's face embedding from the database (GDPR right-to-be-forgotten)."""
    if request.method == 'OPTIONS':
        return '', 204
    success = face_rec_module.delete_user(user_id)
    if success:
        return jsonify({"success": True, "message": f"User '{user_id}' biometrics deleted"})
    return jsonify({"success": False, "message": f"Failed to delete user '{user_id}'"}), 500

# ── AI Risk scoring ───────────────────────────────────────────────────────────

@app.route('/risk/calculate', methods=['POST', 'OPTIONS'])
def risk_calculate():
    """
    AI-enhanced multi-signal risk scoring engine.

    Accepts JSON body with any combination of:
      face_match_score   float [0,1]
      liveness_score     float [0,1]
      ocr_confidence     float [0,1]
      transaction_amount float
      device_info        { ip, user_agent, device_id }
      location           { lat, lon, country }  | null
      time_of_day        int 0-23
      user_history       { avg_amount, known_devices, known_locations }

    Returns: { score, level, factors, recommendation, breakdown }
    """
    if request.method == 'OPTIONS':
        return '', 204

    params = request.get_json(force=True, silent=True) or {}
    result = calculate_risk(params)
    return jsonify(result)


@app.route('/risk/factors', methods=['GET'])
def risk_factors():
    """List all available risk factor labels for transparency / dashboard display."""
    return jsonify({
        "factors": [
            "low_face_match",
            "low_liveness",
            "new_device",
            "unusual_location",
            "unusual_time",
            "amount_spike"
        ],
        "thresholds": {
            "HIGH_RISK": 65,
            "MEDIUM_RISK": 35
        },
        "weights": {
            "face_match":  0.30,
            "liveness":    0.25,
            "device_loc":  0.25,
            "transaction": 0.20
        }
    })

# ── Continuous KYC status ────────────────────────────────────────────────────

@app.route('/kyc/score', methods=['POST', 'OPTIONS'])
def kyc_score():
    """
    Lightweight KYC confidence score from a single image frame.
    Used by the frontend for ongoing/continuous KYC monitoring.

    Accepts multipart form with 'image' file.
    Returns: { kyc_score, liveness_score, is_live, recommendation }
    """
    if request.method == 'OPTIONS':
        return '', 204

    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = _decode_image(request.files['image'])
    if image is None:
        return jsonify({"error": "Invalid image format"}), 400

    # 1. Liveness check
    liveness_result = calculate_liveness_score(image)
    liveness_score  = liveness_result["score"]
    is_live         = liveness_result["is_live"]

    # 2. Compute a simple KYC confidence score from liveness
    #    (Could be extended with face match, OCR recency, etc.)
    kyc_base  = 20  # base score for image received
    kyc_base += int(liveness_score * 50)  # liveness contributes 50 pts
    if is_live:
        kyc_base += 30  # bonus for confirmed live

    kyc_score = min(100, kyc_base)

    if kyc_score >= 80:
        recommendation = "ALLOW"
    elif kyc_score >= 50:
        recommendation = "REVIEW"
    else:
        recommendation = "DENY"

    return jsonify({
        "kyc_score": kyc_score,
        "liveness_score": liveness_score,
        "is_live": is_live,
        "recommendation": recommendation,
        "liveness_method": liveness_result.get("method")
    })

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # Port 5001 avoids conflict with the Node backend on 5000
    app.run(host='0.0.0.0', port=5001, debug=True)
