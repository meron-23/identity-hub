import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

def generate_profile_id() -> str:
    """Generate a unique decentralized-style identifier."""
    u: str = uuid.uuid4().hex
    return f"did:idhub:{u[0:16]}"

def build_profile(
    document_data: Dict[str, Any],
    risk_results: Dict[str, Any],
    biometric_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a reusable digital identity profile.
    This follows a structure similar to Verifiable Credentials.
    """
    
    timestamp = datetime.now(timezone.utc).isoformat()
    
    profile: Any = {
        "id": generate_profile_id(),
        "type": ["VerifiableCredential", "IdentityHubProfile"],
        "issuer": "did:idhub:system_orchestrator",
        "issuanceDate": timestamp,
        "credentialSubject": {
            "id": generate_profile_id(), # The subject's DID
            "claims": {
                "givenName": document_data.get("fields", {}).get("first_name", "N/A"),
                "familyName": document_data.get("fields", {}).get("last_name", "N/A"),
                "dateOfBirth": document_data.get("dob", "N/A"),
                "nationality": document_data.get("country", "N/A"),
                "documentDetails": {
                    "type": document_data.get("doc_type", "unknown"),
                    "number_masked": "********" + str(document_data.get("id_number", ""))[-4:],
                }
            }
        },
        "evidence": [
            {
                "type": "OCRValidation",
                "confidence": document_data.get("mean_confidence", 0.0),
                "riskScore": risk_results.get("final_risk_score", 100.0),
                "recommendation": risk_results.get("recommendation", "REJECT")
            }
        ],
        "metadata": {
            "reusable": True,
            "version": "1.0",
            "biometric_linked": biometric_data is not None
        }
    }
    
    # In a real system, we would sign this JSON using a private key here.
    profile["proof"] = {
        "type": "Ed25519Signature2018",
        "created": timestamp,
        "proofPurpose": "assertionMethod",
        "verificationMethod": "did:idhub:system_orchestrator#key-1",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19...mock_signature..."
    }
    
    return profile
