const TokenizationEngine = require('../tokenization/tokenGenerator');
const aiService = require('../../backend/services/aiService');

class IdentityRiskEngine {
  
  /**
   * ML-based mock velocity detector.
   * Checks for sudden bursts in volume or frequency from same Identity node.
   */
  static analyzeVelocity(userDid) {
    // 5% chance of returning a high-velocity warning in this mock
    return Math.random() < 0.05 ? 'HIGH_VELOCITY_WARNING' : 'NORMAL';
  }

  /**
   * AI-enhanced risk assessment using biometric confidence scores
   */
  static async analyzeBiometricRisk(userDid, selfieImage = null) {
    try {
      if (!selfieImage) {
        // If no selfie provided, use historical risk profile
        return {
          biometricConfidence: 0.85, // Default confidence
          livenessScore: 0.90,
          anomalyDetected: false,
          riskContribution: 10
        };
      }

      // Call AI service for liveness and biometric analysis
      const livenessResult = await aiService.verifyLiveness(selfieImage);
      
      return {
        biometricConfidence: livenessResult.score || 0.85,
        livenessScore: livenessResult.live ? (livenessResult.score || 0.90) : 0.30,
        anomalyDetected: !livenessResult.live,
        riskContribution: livenessResult.live ? 5 : 40
      };
    } catch (error) {
      console.warn('[RiskEngine] AI service unavailable, using fallback biometric analysis');
      return {
        biometricConfidence: 0.80,
        livenessScore: 0.85,
        anomalyDetected: false,
        riskContribution: 15
      };
    }
  }

  /**
   * Document verification risk analysis
   */
  static async analyzeDocumentRisk(userDid, documentImage = null) {
    try {
      if (!documentImage) {
        return {
          documentAuthenticity: 0.90,
          tamperingDetected: false,
          riskContribution: 8
        };
      }

      // Call AI service for document verification
      const docResult = await aiService.verifyDocument(documentImage);
      
      return {
        documentAuthenticity: docResult.success ? (docResult.identity_profile?.confidence || 0.90) : 0.60,
        tamperingDetected: !docResult.success,
        riskContribution: docResult.success ? 5 : 35
      };
    } catch (error) {
      console.warn('[RiskEngine] Document verification unavailable, using fallback');
      return {
        documentAuthenticity: 0.85,
        tamperingDetected: false,
        riskContribution: 12
      };
    }
  }

  /**
   * Enhanced Risk-Based Payment Processor with AI integration
   */
  static async processPayment(cardToken, amount, requireFace = false, userDid = 'unknown', biometricData = null) {
    // 1. Decrypt token safely to prove PCI vault architecture
    let realPan;
    try {
      realPan = TokenizationEngine.decodeToken(cardToken);
    } catch(err) {
      console.error('[RiskEngine] Payment Rejected - Vault Decryption Failed');
      return { success: false, status: 'declined_invalid_token', riskScore: 100 };
    }

    // 2. Initialize risk assessment
    let riskScore = 0;
    const riskFactors = [];
    
    // Vector A: Thresholds & Limits
    if (amount > 5000) {
      riskScore += 65;
      riskFactors.push('HIGH_AMOUNT_TRANSACTION');
    } else if (amount > 1000) {
      riskScore += 40;
      riskFactors.push('ELEVATED_AMOUNT_TRANSACTION');
    } else if (amount > 500) {
      riskScore += 15;
      riskFactors.push('MODERATE_AMOUNT_TRANSACTION');
    }

    // Vector B: High Velocity Checks
    const velocity = this.analyzeVelocity(userDid);
    if (velocity === 'HIGH_VELOCITY_WARNING') {
      riskScore += 45;
      riskFactors.push('HIGH_VELOCITY_PATTERN');
      console.warn(`[RiskEngine] High Velocity Detected for DID: ${userDid}`);
    }

    // Vector C: Anomalous Geographical/IP behavior (Random Mock)
    const geoRisk = Math.floor(Math.random() * 20);
    riskScore += geoRisk;
    if (geoRisk > 15) {
      riskFactors.push('GEOGRAPHICAL_ANOMALY');
    }

    // Vector D: AI-Enhanced Biometric Risk Analysis
    const biometricRisk = await this.analyzeBiometricRisk(userDid, biometricData?.selfie);
    riskScore += biometricRisk.riskContribution;
    if (biometricRisk.anomalyDetected) {
      riskFactors.push('BIOMETRIC_ANOMALY');
    }

    // Vector E: Document Verification Risk (if available)
    if (biometricData?.document) {
      const docRisk = await this.analyzeDocumentRisk(userDid, biometricData.document);
      riskScore += docRisk.riskContribution;
      if (docRisk.tamperingDetected) {
        riskFactors.push('DOCUMENT_TAMPERING');
      }
    }

    // Vector F: Time-based risk analysis
    const currentHour = new Date().getHours();
    if (currentHour >= 23 || currentHour <= 5) {
      riskScore += 10;
      riskFactors.push('UNUSUAL_TIME_TRANSACTION');
    }

    // Bound Risk
    riskScore = Math.min(100, Math.max(1, riskScore));

    // 3. Authorization Matrix with AI-enhanced decision making
    let status = 'completed';
    let recommendation = 'APPROVE';
    
    if (riskScore > 85 && !requireFace) {
      status = 'internal_fraud_decline';
      recommendation = 'DECLINE';
    } else if (riskScore > 70 && !requireFace) {
      status = 'advanced_verification_required';
      recommendation = 'STEP_UP_AUTH';
    } else if (riskScore > 50 && !requireFace) {
      status = 'advanced_verification_required';
      recommendation = 'STEP_UP_AUTH';
    }

    // 4. Biometric (Face) Overrides with AI confidence
    if (requireFace && biometricData?.selfie) {
      const biometricConfidence = biometricRisk.biometricConfidence;
      const livenessScore = biometricRisk.livenessScore;
      
      if (status === 'internal_fraud_decline') {
        // High biometric confidence can override some risk factors
        if (biometricConfidence > 0.95 && livenessScore > 0.95 && riskScore < 95) {
          status = 'completed';
          recommendation = 'APPROVE_BIOMETRIC_OVERRIDE';
          riskFactors.push('BIOMETRIC_OVERRIDE');
        } else {
          status = 'declined_suspected_fraud';
          recommendation = 'DECLINE_HIGH_RISK';
        }
      } else if (status === 'advanced_verification_required') {
        // Good biometric match mitigates moderate risk
        if (biometricConfidence > 0.85 && livenessScore > 0.85) {
          status = 'completed';
          recommendation = 'APPROVE_BIOMETRIC_VERIFIED';
          riskFactors.push('BIOMETRIC_VERIFICATION');
        }
      }
    }

    const transactionId = `tx_ai_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    
    if (status === 'completed') {
      console.log(`[RiskEngine] Transaction ${transactionId} AUTHORIZED. Risk Score: ${riskScore}, Factors: ${riskFactors.join(', ')}`);
    } else {
      console.warn(`[RiskEngine] Transaction ${transactionId} ${status.toUpperCase()}. Risk Score: ${riskScore}, Factors: ${riskFactors.join(', ')}`);
    }

    return { 
      success: status === 'completed', 
      transactionId,
      status,
      recommendation,
      riskScore,
      riskFactors,
      biometricAnalysis: biometricRisk,
      timestamp: new Date().toISOString()
    };
  }

}

module.exports = IdentityRiskEngine;
