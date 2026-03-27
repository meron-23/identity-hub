"""
face_recognition.py
--------------------
Face enrollment, verification, and 1:1 comparison.
Embeddings are stored in  ai/models/embeddings.db  (SQLite).

Functions
---------
enroll(user_id, face_image)       -> bool
verify(user_id, face_image)       -> dict
compare(face1_image, face2_image) -> float
delete_user(user_id)              -> bool
list_users()                      -> list[str]
"""

import json
import logging
import os
import sqlite3

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────────────────
_MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH     = os.path.join(_MODULE_DIR, "embeddings.db")

# Match threshold: cosine similarity  ≥ this → same person
SIMILARITY_THRESHOLD = 0.50

# ── Real embeddings using InsightFace ─────────────────────────────────────────────
try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False
    logger.warning("OpenCV not found – cannot load images.")

try:
    import insightface
    from insightface.app import FaceAnalysis
    _INSIGHTFACE_AVAILABLE = True
    logger.info("InsightFace loaded for face recognition.")
except ImportError:
    _INSIGHTFACE_AVAILABLE = False
    logger.warning("InsightFace not found – using dummy embedding fallback (not production safe).")

# InsightFace app singleton
_app = None

def _get_app():
    global _app
    if _app is None and _INSIGHTFACE_AVAILABLE:
        # Initialize FaceAnalysis app. 'buffalo_l' is the default model pack.
        _app = FaceAnalysis(name='buffalo_l')
        _app.prepare(ctx_id=0, det_size=(640, 640))
        logger.info("InsightFace FaceAnalysis initialized.")
    return _app

# ── Database ─────────────────────────────────────────────────────────────────

def _db() -> sqlite3.Connection:
    """Open (and auto-create) the embeddings database."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS embeddings (
            user_id    TEXT PRIMARY KEY,
            embedding  TEXT    NOT NULL,
            enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    return conn


# ── Image loader ─────────────────────────────────────────────────────────────

def _load(image) -> np.ndarray:
    if not _CV2_AVAILABLE:
        raise RuntimeError("OpenCV required: pip install opencv-python")
    if isinstance(image, np.ndarray):
        return image.copy()
    img = cv2.imread(str(image))
    if img is None:
        raise FileNotFoundError(f"Cannot load image: {image}")
    return img


# ── Embedding extraction ──────────────────────────────────────────────────────

def _extract_embedding(image) -> np.ndarray:
    """
    Return a unit-normalised embedding using real face features.
    Uses InsightFace for extraction.
    Falls back to deterministic dummy vector when InsightFace is unavailable.
    """
    img = _load(image)

    if _INSIGHTFACE_AVAILABLE:
        try:
            app = _get_app()
            # insightface expects BGR images (same as cv2.imread returns)
            faces = app.get(img)
            
            if len(faces) > 0:
                # Get the largest face by bounding box area (width * height)
                largest_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                emb = largest_face.embedding
                
                # Normalize the embedding
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb /= norm
                    
                return emb.astype(np.float32)
            else:
                raise ValueError("No face detected in the image by InsightFace.")
                
        except Exception as exc:
            logger.warning("InsightFace embedding failed: %s – using dummy.", exc)

    # ── Dummy fallback – NOT production safe ────────────────────────────────
    logger.warning("DUMMY embedding in use – not suitable for production.")
    seed = int(np.mean(img) * 1000) % (2 ** 31)
    rng  = np.random.default_rng(seed)
    emb  = rng.standard_normal(512).astype(np.float32)
    emb /= np.linalg.norm(emb)
    return emb


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity mapped from [-1,1] → [0,1]."""
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float((np.dot(a, b) / (na * nb) + 1.0) / 2.0)


# ── Public API ───────────────────────────────────────────────────────────────

def enroll(user_id: str, face_image) -> bool:
    """
    Enroll a user by extracting and storing their face embedding.

    Parameters
    ----------
    user_id    : str   – unique identifier (e.g. "user_001")
    face_image : str | np.ndarray

    Returns
    -------
    bool  True on success, False on failure.
    """
    try:
        emb = _extract_embedding(face_image)
        emb_json = json.dumps(emb.tolist())
        with _db() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO embeddings (user_id, embedding) VALUES (?, ?)",
                (user_id, emb_json),
            )
        logger.info("Enrolled user '%s'.", user_id)
        return True
    except Exception as exc:
        logger.error("enroll('%s') failed: %s", user_id, exc)
        return False


def verify(user_id: str, face_image) -> dict:
    """
    Verify a face against the stored embedding for *user_id*.

    Returns
    -------
    dict
        - ``verified``   : bool
        - ``similarity`` : float  [0,1]
        - ``threshold``  : float
        - ``user_id``    : str
        - ``error``      : str | None
    """
    base = {"user_id": user_id, "threshold": SIMILARITY_THRESHOLD, "error": None}
    try:
        with _db() as conn:
            row = conn.execute(
                "SELECT embedding FROM embeddings WHERE user_id = ?", (user_id,)
            ).fetchone()

        if row is None:
            return {**base, "verified": False, "similarity": 0.0,
                    "error": f"User '{user_id}' not enrolled."}

        stored = np.array(json.loads(row[0]), dtype=np.float32)
        probe  = _extract_embedding(face_image)
        sim    = _cosine_similarity(stored, probe)

        logger.info("verify('%s') → similarity=%.4f match=%s", user_id, sim, sim >= SIMILARITY_THRESHOLD)
        return {**base, "verified": sim >= SIMILARITY_THRESHOLD, "similarity": round(sim, 4)}

    except Exception as exc:
        logger.error("verify('%s') failed: %s", user_id, exc)
        return {**base, "verified": False, "similarity": 0.0, "error": str(exc)}


def compare(face1_image, face2_image) -> float:
    """
    Direct 1:1 face comparison.

    Returns
    -------
    float  Similarity score in [0,1].  Higher = more similar.
    """
    try:
        emb1 = _extract_embedding(face1_image)
        emb2 = _extract_embedding(face2_image)
        score = _cosine_similarity(emb1, emb2)
        logger.debug("compare() → %.4f", score)
        return round(score, 4)
    except Exception as exc:
        logger.error("compare() failed: %s", exc)
        return 0.0


def delete_user(user_id: str) -> bool:
    """Remove a user's embedding from the database."""
    try:
        with _db() as conn:
            conn.execute("DELETE FROM embeddings WHERE user_id = ?", (user_id,))
        logger.info("Deleted user '%s'.", user_id)
        return True
    except Exception as exc:
        logger.error("delete_user('%s') failed: %s", user_id, exc)
        return False


def list_users() -> list:
    """Return all enrolled user IDs sorted by enrolment time."""
    try:
        with _db() as conn:
            rows = conn.execute(
                "SELECT user_id FROM embeddings ORDER BY enrolled_at"
            ).fetchall()
        return [r[0] for r in rows]
    except Exception as exc:
        logger.error("list_users() failed: %s", exc)
        return []
