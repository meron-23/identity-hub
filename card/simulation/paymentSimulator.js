const TokenizationEngine = require('../tokenization/tokenGenerator');

class IdentityRiskEngine {
  
  /**
   * ML-based mock velocity detector.
   * Checks for sudden bursts in volume or frequency from the same Identity node.
   */
  static analyzeVelocity(userDid) {
    // 5% chance of returning a high-velocity warning in this mock
    return Math.random() < 0.05 ? 'HIGH_VELOCITY_WARNING' : 'NORMAL';
  }

  /**
   * Comprehensive Risk-Based Payment Processor
   * Supports zero-trust verification, where biometric overrides are requested iteratively.
   */
  static processPayment(cardToken, amount, requireFace = false, userDid = 'unknown') {
    // 1. Decrypt token safely to prove PCI vault architecture
    let realPan;
    try {
      realPan = TokenizationEngine.decodeToken(cardToken);
    } catch(err) {
      console.error('[RiskEngine] Payment Rejected - Vault Decryption Failed');
      return { success: false, status: 'declined_invalid_token', riskScore: 100 };
    }

    // 2. Advanced Multi-Vector Risk Assessment
    let riskScore = 0;
    
    // Vector A: Thresholds & Limits
    if (amount > 5000) riskScore += 65;
    else if (amount > 1000) riskScore += 40;
    else if (amount > 500) riskScore += 15;

    // Vector B: High Velocity Checks
    const velocity = this.analyzeVelocity(userDid);
    if (velocity === 'HIGH_VELOCITY_WARNING') {
      riskScore += 45;
      console.warn(`[RiskEngine] High Velocity Detected for DID: ${userDid}`);
    }

    // Vector C: Anomalous Geographical/IP behavior (Random Mock)
    riskScore += Math.floor(Math.random() * 20);

    // Bound Risk
    riskScore = Math.min(100, Math.max(1, riskScore));

    // 3. Authorization Matrix
    let status = 'completed';
    
    if (riskScore > 85 && !requireFace) {
      status = 'internal_fraud_decline';
    } else if (riskScore > 50 && !requireFace) {
      // Step-up authentication required
      status = 'advanced_verification_required';
    }

    // 4. Biometric (Face) Overrides
    if (requireFace && status === 'internal_fraud_decline') {
      // Even with biometric match, extreme risk (e.g., 95+) might still block
      status = riskScore > 95 ? 'declined_suspected_fraud' : 'completed'; 
    } else if (requireFace && status === 'advanced_verification_required') {
      status = 'completed'; // Risk successfully mitigated via Biometric Liveness match
    }

    const transactionId = `tx_sec_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    
    if (status === 'completed') {
      console.log(`[RiskEngine] Transaction ${transactionId} AUTHORIZED. Card Extracted Length: ${realPan.length}`);
    }

    return { 
      success: status === 'completed', 
      transactionId,
      status,
      riskScore,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = IdentityRiskEngine;

