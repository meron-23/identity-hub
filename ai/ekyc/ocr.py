import easyocr
import cv2
import numpy as np
from typing import Dict, Any, List, TypedDict

class OCRFields(TypedDict):
    first_name: str
    last_name: str

class OCRResult(TypedDict):
    document_type: str
    fields: OCRFields
    raw_text: List[str]
    mean_confidence: float

class OCRProcessor:
    """
    OCR Module for eKYC.
    Handles document type detection and field extraction.
    """
    def __init__(self, languages: List[str] = ['en']):
        # Initialize EasyOCR reader
        self.reader = easyocr.Reader(languages, gpu=False)

    def process_document(self, image_input: Any) -> OCRResult:
        """
        Extract text and determine document type from an image.
        """
        # If input is a path, read it
        if isinstance(image_input, str):
            image = cv2.imread(image_input)
        else:
            image = image_input

        if image is None:
            return {
                "document_type": "unknown",
                "fields": {"first_name": "N/A", "last_name": "N/A"},
                "raw_text": [],
                "mean_confidence": 0.0
            }

        # Perform OCR recognition
        results = self.reader.readtext(image)

        document_type = "unknown"
        first_name = "N/A"
        last_name = "N/A"

        if not results:
            return {
                "document_type": document_type,
                "fields": {"first_name": first_name, "last_name": last_name},
                "raw_text": [],
                "mean_confidence": 0.0
            }

        confidences = []
        full_text = []

        for (_, text, prob) in results:
            full_text.append(text)
            confidences.append(prob)

            text_upper = text.upper()
            if "PASSPORT" in text_upper:
                document_type = "PASSPORT"
            elif "DRIVING" in text_upper or "LICENSE" in text_upper:
                document_type = "DRIVERS_LICENSE"
            elif "IDENTITY" in text_upper or "CARD" in text_upper:
                if document_type == "unknown":
                    document_type = "ID_CARD"

        # Basic heuristic for First/Last name (Placeholder logic)
        if len(full_text) > 2:
            first_name = full_text[1]
            last_name = full_text[2]

        mean_conf = float(np.mean(confidences)) if confidences else 0.0

        return {
            "document_type": document_type,
            "fields": {
                "first_name": first_name,
                "last_name": last_name
            },
            "raw_text": full_text,
            "mean_confidence": mean_conf
        }

if __name__ == "__main__":
    pass
