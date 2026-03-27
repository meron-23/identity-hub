import json
import re
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

# Path to data configuration files
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
ID_FORMATS_PATH = os.path.join(DATA_DIR, "id_formats.json")
BLACKLIST_PATH = os.path.join(DATA_DIR, "blacklist.json")

def load_json(path: str) -> Dict[str, Any]:
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception:
        return {}

def validate_id_format(id_number: str, country: str, doc_type: str) -> bool:
    """
    Check if the ID number matches the known regex for a country/type.
    """
    formats = load_json(ID_FORMATS_PATH)
    country_formats = formats.get(country, {})
    pattern = country_formats.get(doc_type.lower())
    
    if not pattern:
        return True # Default to true if no rule exists
    
    return bool(re.fullmatch(pattern, id_number))

def detect_synthetic_identity(dob_str: str, issue_date_str: Optional[str] = None) -> Dict[str, Any]:
    """
    Detect potential synthetic identities based on date logic.
    Example: Person's birth date should be at least 15-18 years before ID issue date.
    """
    is_suspicious = False
    reasons = []

    try:
        # Assuming ISO format (YYYY-MM-DD) for consistency
        dob = datetime.strptime(dob_str, "%Y-%m-%d")
        if issue_date_str:
            issue_date = datetime.strptime(issue_date_str, "%Y-%m-%d")
            
            # 1. Born after ID was issued?
            if dob > issue_date:
                is_suspicious = True
                reasons.append("Date of Birth is after ID issue date")
            
            # 2. Too young at issue? (Age < 16 for a driver's license example)
            age_at_issue = (issue_date - dob).days / 365
            if age_at_issue < 0:
                is_suspicious = True
            elif age_at_issue < 5: # Basic check: nobody gets an ID at age 4
                is_suspicious = True
                reasons.append(f"Person was only {int(age_at_issue)} years old at ID issue date")

    except ValueError:
        pass # Handle parsing errors separately if needed

    return {"is_suspicious": is_suspicious, "reasons": reasons, "synthetic_risk": 0.8 if is_suspicious else 0.0}

def check_blacklist(id_value: str, field_type: str = "ssn") -> bool:
    """
    Check if the ID value is in the known blacklist.
    """
    blacklist = load_json(BLACKLIST_PATH)
    b_list = blacklist.get(field_type, [])
    return id_value in b_list

def validate_id_data(id_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    The orchestrator for all data-level validations.
    """
    id_number = id_data.get("id_number", "")
    country = id_data.get("country", "US")
    doc_type = id_data.get("doc_type", "unknown")
    dob = id_data.get("dob", "")
    issue_date = id_data.get("issue_date", "")

    # 1. Format Check
    format_valid = validate_id_format(id_number, country, doc_type)
    
    # 2. Synthetic Check
    synthetic_res = detect_synthetic_identity(dob, issue_date)
    
    # 3. Blacklist Check
    on_blacklist = check_blacklist(id_number, "ssn") or check_blacklist(id_data.get("email", ""), "emails")

    is_valid = format_valid and not synthetic_res["is_suspicious"] and not on_blacklist
    errors = []
    if not format_valid: errors.append("Invalid ID number format for this country")
    if on_blacklist: errors.append("ID or email is in the fraud blacklist")
    errors.extend(synthetic_res["reasons"])

    return {
        "is_valid": is_valid,
        "errors": errors,
        "synthetic_risk": synthetic_res["synthetic_risk"],
        "checks": {
            "format": format_valid,
            "synthetic": not synthetic_res["is_suspicious"],
            "not_blacklisted": not on_blacklist
        }
    }
