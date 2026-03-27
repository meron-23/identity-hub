"""
face_detection.py
-----------------
Face detection module using InspireFace SDK.
Falls back to OpenCV Haar Cascade when InspireFace is unavailable.

Usage:
    from face_detection import detect_faces
    faces = detect_faces("photo.jpg")
"""

import logging
import os
import sys
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── InsightFace Face Detection ───────────────────────────────────────────────────
try:
    import insightface
    from insightface.app import FaceAnalysis
    _INSIGHTFACE_AVAILABLE = True
    logger.info("InsightFace loaded for face detection.")
except ImportError:
    _INSIGHTFACE_AVAILABLE = False
    logger.warning("InsightFace not found – falling back to MediaPipe.")

_insightface_app = None

def _get_insightface_app():
    global _insightface_app
    if _insightface_app is not None:
        return _insightface_app
    
    _insightface_app = FaceAnalysis(name='buffalo_l', allowed_modules=['detection'])
    _insightface_app.prepare(ctx_id=0, det_size=(640, 640))
    logger.info("InsightFace FaceAnalysis initialized for detection.")
    return _insightface_app


# ── MediaPipe Face Detection ───────────────────────────────────────────────────
try:
    import mediapipe as mp
    _MP_AVAILABLE = True
    mp_face_detection = mp.solutions.face_detection
    mp_drawing = mp.solutions.drawing_utils
    logger.info("MediaPipe loaded for face detection.")
except (ImportError, AttributeError) as e:
    _MP_AVAILABLE = False
    logger.warning(f"MediaPipe not found – falling back to OpenCV Haar Cascade. Error: {e}")

# ── Required OpenCV ──────────────────────────────────────────────────────────
try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False
    logger.error("OpenCV not found. Install it: pip install opencv-python")

# ── MediaPipe session ─────────────────────────────────────────────────────
_face_detection = None

def _get_face_detection():
    """Return (creating if needed) a shared MediaPipe FaceDetection instance."""
    global _face_detection
    if _face_detection is not None:
        return _face_detection
    
    _face_detection = mp_face_detection.FaceDetection(
        model_selection=0, min_detection_confidence=0.5
    )
    logger.info("MediaPipe FaceDetection initialised.")
    return _face_detection


# ── Image loading helper ─────────────────────────────────────────────────────

def _load_image(image_path_or_array) -> np.ndarray:
    """
    Accept a file-path string, Path object, or a pre-loaded BGR numpy array.
    Always returns a BGR uint8 numpy array.
    """
    if not _CV2_AVAILABLE:
        raise RuntimeError("OpenCV is required. Install: pip install opencv-python")

    if isinstance(image_path_or_array, np.ndarray):
        return image_path_or_array.copy()

    img = cv2.imread(str(image_path_or_array))
    if img is None:
        raise FileNotFoundError(f"Cannot load image: {image_path_or_array}")
    return img


# ── InsightFace backend ──────────────────────────────────────────────────────

def _detect_insightface(img: np.ndarray) -> list:
    """Detect faces using InsightFace."""
    app = _get_insightface_app()
    # insightface expects BGR images (same as cv2.imread returns)
    faces_data = app.get(img)
    
    faces = []
    for face in faces_data:
        box = face.bbox.astype(int)
        landmarks = face.kps.astype(int) if hasattr(face, 'kps') and face.kps is not None else None
        
        lm_dict = {}
        if landmarks is not None and len(landmarks) >= 5:
            # InsightFace kps mapping: 0: left_eye, 1: right_eye, 2: nose, 3: left_mouth_corner, 4: right_mouth_corner
            lm_dict["left_eye"] = [int(landmarks[0][0]), int(landmarks[0][1])]
            lm_dict["right_eye"] = [int(landmarks[1][0]), int(landmarks[1][1])]
            lm_dict["nose"] = [int(landmarks[2][0]), int(landmarks[2][1])]
            lm_dict["left_mouth"] = [int(landmarks[3][0]), int(landmarks[3][1])]
            lm_dict["right_mouth"] = [int(landmarks[4][0]), int(landmarks[4][1])]
        else:
            lm_dict = {
                "left_eye": None, "right_eye": None, "nose": None,
                "left_mouth": None, "right_mouth": None
            }
            
        faces.append({
            "bbox": [int(box[0]), int(box[1]), int(box[2] - box[0]), int(box[3] - box[1])],
            "landmarks": lm_dict,
            "confidence": float(face.det_score)
        })
    return faces


# ── MediaPipe backend ──────────────────────────────────────────────────────

def _detect_mediapipe(img: np.ndarray) -> list:
    """Detect faces using MediaPipe FaceDetection."""
    detection = _get_face_detection()
    
    # Convert BGR to RGB for MediaPipe
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = detection.process(rgb_img)
    
    faces = []
    if results.detections:
        for detection in results.detections:
            bbox = detection.location_data.relative_bounding_box
            h, w, _ = img.shape
            
            # Convert relative coordinates to absolute
            x = int(bbox.xmin * w)
            y = int(bbox.ymin * h)
            width = int(bbox.width * w)
            height = int(bbox.height * h)
            
            confidence = detection.score[0]
            
            # Extract keypoints for landmarks
            keypoints = detection.location_data.relative_keypoints
            landmarks = {}
            
            # Map MediaPipe keypoints to our expected landmarks
            if len(keypoints) >= 6:  # MediaPipe provides 6 keypoints
                landmarks["right_eye"] = [int(keypoints[0].x * w), int(keypoints[0].y * h)]
                landmarks["left_eye"] = [int(keypoints[1].x * w), int(keypoints[1].y * h)]
                landmarks["nose"] = [int(keypoints[2].x * w), int(keypoints[2].y * h)]
                landmarks["mouth"] = [int(keypoints[3].x * w), int(keypoints[3].y * h)]
                landmarks["right_ear"] = [int(keypoints[4].x * w), int(keypoints[4].y * h)]
                landmarks["left_ear"] = [int(keypoints[5].x * w), int(keypoints[5].y *h)]
                
                # Derive left/right mouth from mouth center
                landmarks["left_mouth"] = [landmarks["mouth"][0] - width // 6, landmarks["mouth"][1]]
                landmarks["right_mouth"] = [landmarks["mouth"][0] + width // 6, landmarks["mouth"][1]]
            else:
                # Fallback landmarks if keypoints not available
                cx, cy = x + width // 2, y + height // 2
                landmarks = {
                    "left_eye":    [cx - width // 5, cy - height // 8],
                    "right_eye":   [cx + width // 5, cy - height // 8],
                    "nose":        [cx,           cy],
                    "left_mouth":  [cx - width // 6, cy + height // 5],
                    "right_mouth": [cx + width // 6, cy + height // 5],
                }
            
            faces.append({
                "bbox": [x, y, width, height],
                "landmarks": landmarks,
                "confidence": float(confidence),
            })
    
    return faces


# ── OpenCV Haar Cascade fallback ─────────────────────────────────────────────

def _detect_opencv(img: np.ndarray) -> list:
    gray   = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    xml    = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    finder = cv2.CascadeClassifier(xml)
    raw    = finder.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    faces = []
    for x, y, w, h in (raw if len(raw) else []):
        cx, cy = x + w // 2, y + h // 2
        faces.append({
            "bbox": [int(x), int(y), int(w), int(h)],
            "landmarks": {
                "left_eye":    [cx - w // 5, cy - h // 8],
                "right_eye":   [cx + w // 5, cy - h // 8],
                "nose":        [cx,           cy],
                "left_mouth":  [cx - w // 6, cy + h // 5],
                "right_mouth": [cx + w // 6, cy + h // 5],
            },
            "confidence": 0.85,
        })
    return faces


# ── Public API ───────────────────────────────────────────────────────────────

def detect_faces(image_path_or_array) -> list:
    """
    Detect all faces in an image using MediaPipe.

    Parameters
    ----------
    image_path_or_array : str | Path | np.ndarray
        Path to an image file **or** a pre-loaded BGR numpy array.

    Returns
    -------
    list[dict]
        Each dict contains:
        - ``bbox``       : [x, y, width, height]
        - ``landmarks``  : dict with left_eye, right_eye, nose,
                           left_mouth, right_mouth (each [x, y] or None)
        - ``confidence`` : float 0–1
    """
    img = _load_image(image_path_or_array)

    if _INSIGHTFACE_AVAILABLE:
        try:
            faces = _detect_insightface(img)
            logger.debug("InsightFace detected %d face(s).", len(faces))
            return faces
        except Exception as exc:
            logger.warning("InsightFace detection error: %s. Falling back to MediaPipe/OpenCV.", exc)

    if _MP_AVAILABLE:
        try:
            faces = _detect_mediapipe(img)
            logger.debug("MediaPipe detected %d face(s).", len(faces))
            return faces
        except Exception as exc:
            logger.warning("MediaPipe detection error: %s. Falling back to OpenCV.", exc)

    if not _CV2_AVAILABLE:
        raise RuntimeError("No face detection backend available.")

    faces = _detect_opencv(img)
    logger.debug("OpenCV detected %d face(s).", len(faces))
    return faces


def draw_faces(image_path_or_array, output_path: str = None) -> np.ndarray:
    """
    Draw bounding boxes + landmarks on each detected face.

    Parameters
    ----------
    image_path_or_array : str | Path | np.ndarray
    output_path         : str | None  – if given, save annotated image here

    Returns
    -------
    np.ndarray  BGR annotated image
    """
    img   = _load_image(image_path_or_array)
    faces = detect_faces(img)

    for face in faces:
        x, y, w, h = face["bbox"]
        cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(img, f"{face['confidence']:.2f}",
                    (x, y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        for pt in face.get("landmarks", {}).values():
            if pt:
                cv2.circle(img, (int(pt[0]), int(pt[1])), 3, (0, 0, 255), -1)

    if output_path:
        cv2.imwrite(output_path, img)
        logger.info("Annotated image saved → %s", output_path)

    return img
