"""Reusable profile generation helpers for identity data."""

from typing import Dict, Any


def build_profile(document_data: Dict[str, Any], biometric_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Stub: aggregate identity profile fields."""
    return {
        "document_data": document_data,
        "biometric_data": biometric_data,
        "created_at": None,
    }
