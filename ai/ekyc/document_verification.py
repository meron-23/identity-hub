"""Document authenticity checks."""

from typing import Dict, Any


def verify_document(document_image: bytes) -> Dict[str, Any]:
    """Stub: verify document authenticity."""
    return {
        "validity": False,
        "issues": [],
        "score": 0.0,
    }
