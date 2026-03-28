import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import cardService from '../services/cardService';
import BiometricCapture from '../components/BiometricCapture';

const styles = `
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
  @keyframes spinSlow {
    100% { transform: rotate(360deg); }
  }
  .glass-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
    border-radius: 24px;
  }
  .payment-input {
    width: 100%;
    padding: 16px 20px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    font-size: 1.2rem;
    background: #f9fafb;
    outline: none;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }
  .payment-input:focus {
    background: #fff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
  .pay-button {
    width: 100%;
    padding: 18px;
    background: linear-gradient(135deg, #111827, #374151);
    color: #fff;
    border: none;
    border-radius: 16px;
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 25px rgba(17, 24, 39, 0.3);
    transition: transform 0.1s, box-shadow 0.2s;
  }
  .pay-button:active {
    transform: scale(0.98);
    box-shadow: 0 5px 15px rgba(17, 24, 39, 0.2);
  }
  .face-scanner-wrap {
    position: relative;
    padding: 3px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
    border-radius: 24px;
    background-size: 200% 200%;
    animation: gradientShift 3s ease infinite;
  }
  .face-scanner-inner {
    background: #fff;
    border-radius: 21px;
    padding: 30px;
    text-align: center;
  }
  body {
    background: #f0f4f8;
    background-image: radial-gradient(circle at 10% 20%, rgb(239, 246, 249) 0%, rgb(206, 239, 253) 90%);
    margin: 0;
    font-family: 'Inter', sans-serif;
  }
`;

export default function Payment() {
  const { user, token } = useAuth();
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showFaceFlow, setShowFaceFlow] = useState(false);
  const [transactionData, setTransactionData] = useState(null);
  const [biometricData, setBiometricData] = useState(null);
  const [riskAnalysis, setRiskAnalysis] = useState(null);

  useEffect(() => {
    const fetchCards = async () => {
      if (!user?.userId) return;
      
      try {
        const res = await cardService.getCards(user.userId);
        setCards(res.data.filter(c => c.status === 'active'));
      } catch (err) {
        console.error('Failed to load active cards:', err);
        setStatusMsg('Failed to load payment methods');
      }
    };
    fetchCards();
  }, [user]);

  const handlePay = async (requireFace = false, biometricImage = null) => {
    if (!selectedCard || !amount) {
      setStatusMsg('Please select a card and enter an amount.');
      return;
    }

    if (requireFace && !biometricImage) {
      setStatusMsg('Please complete biometric verification first.');
      return;
    }

    setLoading(true);
    setStatusMsg('Processing payment with AI risk analysis...');
    
    try {
      const biometricPayload = requireFace && biometricImage ? {
        selfie: biometricImage
      } : null;

      const res = await cardService.processPayment({ 
        user_did: user.userId, 
        card_id: selectedCard, 
        amount: Number(amount), 
        requireFace,
        biometricData: biometricPayload
      });
      
      const authResult = res.data.authResult;
      const aiAnalysis = res.data.aiAnalysis;
      
      setRiskAnalysis(aiAnalysis);
      
      if (authResult.status === 'advanced_verification_required') {
        setStatusMsg(`⚠️ High-Risk Transaction Detected (Risk Score: ${aiAnalysis.riskScore}). Biometric verification required.`);
        setShowFaceFlow(true);
      } else if (authResult.success) {
        setStatusMsg(`✅ Payment Approved! ID: ${authResult.transactionId}`);
        setTransactionData(res.data.transaction);
        setShowFaceFlow(false);
        setBiometricData(null);
      } else {
        setStatusMsg(`❌ Payment Declined: ${authResult.status} (Risk Score: ${aiAnalysis.riskScore})`);
        setShowFaceFlow(false);
        setBiometricData(null);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setStatusMsg(err.response?.data?.error || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricCapture = (imageData) => {
    setBiometricData(imageData);
    setStatusMsg('Biometric data captured. Processing...');
  };

  const submitBiometricVerification = () => {
    if (!biometricData) {
      setStatusMsg('Please capture your biometric data first.');
      return;
    }
    
    setShowFaceFlow(false);
    handlePay(true, biometricData);
  };

  const getRiskLevelColor = (score) => {
    if (score < 30) return '#10b981'; // Green
    if (score < 60) return '#f59e0b'; // Yellow
    if (score < 85) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getRiskLevelText = (score) => {
    if (score < 30) return 'Low Risk';
    if (score < 60) return 'Medium Risk';
    if (score < 85) return 'High Risk';
    return 'Very High Risk';
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '700px', margin: '0 auto', minHeight: '100vh' }}>
      <style>{styles}</style>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827', margin: 0 }}>🔐 Secure Checkout</h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginTop: '10px' }}>AI-Enhanced Transaction Security</p>
      </div>

      <div className="glass-card" style={{ width: '100%', padding: '40px', boxSizing: 'border-box' }}>
        
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '1.1rem' }}>
            💳 Payment Method
          </label>
          <div style={{ position: 'relative' }}>
            <select 
              value={selectedCard} 
              onChange={(e) => setSelectedCard(e.target.value)}
              className="payment-input"
              style={{ appearance: 'none', cursor: 'pointer' }}
              disabled={loading}
            >
              <option value="">Choose a card to pay with...</option>
              {cards.map(c => (
                <option key={c._id} value={c._id}>
                  💳 •••• {c.card_token?.slice(-4) || '****'}
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              ▼
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '35px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '1.1rem' }}>
            💰 Amount
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.5rem', color: '#9ca3af', fontWeight: 'bold' }}>$</span>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="payment-input"
              style={{ paddingLeft: '45px', fontSize: '1.5rem', fontWeight: 'bold' }}
              disabled={loading}
            />
          </div>
        </div>

        <button 
          onClick={() => handlePay(false)} 
          disabled={loading || showFaceFlow} 
          className="pay-button"
        >
          {loading ? '🔄 Processing...' : '🚀 Pay Securely'}
        </button>
      </div>

      {statusMsg && (
        <div style={{ 
          marginTop: '25px', 
          width: '100%', 
          padding: '20px', 
          borderRadius: '16px', 
          fontWeight: '500', 
          textAlign: 'center', 
          fontSize: '1.1rem',
          background: statusMsg.includes('Approved') || statusMsg.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 
                     statusMsg.includes('Biometric') || statusMsg.includes('⚠️') ? 'rgba(245, 158, 11, 0.1)' : 
                     'rgba(239, 68, 68, 0.1)', 
          color: statusMsg.includes('Approved') || statusMsg.includes('✅') ? '#047857' : 
                 statusMsg.includes('Biometric') || statusMsg.includes('⚠️') ? '#b45309' : 
                 '#b91c1c', 
          border: `1px solid ${
            statusMsg.includes('Approved') || statusMsg.includes('✅') ? 'rgba(16, 185, 129, 0.3)' : 
            statusMsg.includes('Biometric') || statusMsg.includes('⚠️') ? 'rgba(245, 158, 11, 0.3)' : 
            'rgba(239, 68, 68, 0.3)'
          }`, 
          backdropFilter: 'blur(10px)' 
        }}>
          {statusMsg}
        </div>
      )}

      {showFaceFlow && (
        <div style={{ marginTop: '30px', width: '100%' }}>
          <div className="face-scanner-wrap">
            <div className="face-scanner-inner">
              <h3 style={{ margin: '0 0 15px 0', color: '#111827', fontSize: '1.3rem' }}>
                🔍 Biometric Step-Up Verification
              </h3>
              <p style={{ color: '#4b5563', marginBottom: '25px' }}>
                High-risk transaction detected. Please verify your identity to proceed.
              </p>
              
              <div style={{ marginBottom: '25px' }}>
                <BiometricCapture 
                  onCapture={handleBiometricCapture}
                  disabled={loading}
                  showSelfie={true}
                />
              </div>

              <button 
                onClick={submitBiometricVerification}
                disabled={!biometricData || loading}
                style={{ 
                  padding: '14px 28px', 
                  background: biometricData ? '#3b82f6' : '#9ca3af', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontSize: '1.1rem', 
                  fontWeight: 'bold', 
                  cursor: biometricData && !loading ? 'pointer' : 'not-allowed', 
                  width: '100%', 
                  boxShadow: biometricData ? '0 4px 14px rgba(59, 130, 246, 0.4)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? '🔄 Verifying...' : '🔐 Complete Biometric Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {riskAnalysis && (
        <div className="glass-card" style={{ marginTop: '30px', width: '100%', padding: '25px', boxSizing: 'border-box' }}>
          <h4 style={{ margin: '0 0 20px 0', textAlign: 'center', fontSize: '1.2rem', color: '#111827' }}>
            🤖 AI Risk Analysis
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center', padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getRiskLevelColor(riskAnalysis.riskScore) }}>
                {riskAnalysis.riskScore}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Risk Score</div>
            </div>
            <div style={{ textAlign: 'center', padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: getRiskLevelColor(riskAnalysis.riskScore) }}>
                {getRiskLevelText(riskAnalysis.riskScore)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Risk Level</div>
            </div>
          </div>

          {riskAnalysis.riskFactors && riskAnalysis.riskFactors.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Risk Factors Detected:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {riskAnalysis.riskFactors.map((factor, index) => (
                  <span key={index} style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}>
                    {factor.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {riskAnalysis.biometricConfidence && (
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
              <strong>Biometric Confidence:</strong> {Math.round(riskAnalysis.biometricConfidence * 100)}% | 
              <strong> Liveness Score:</strong> {Math.round(riskAnalysis.livenessScore * 100)}%
            </div>
          )}
        </div>
      )}

      {transactionData && !showFaceFlow && (
        <div className="glass-card" style={{ marginTop: '30px', width: '100%', padding: '30px', boxSizing: 'border-box', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <h4 style={{ margin: '0 0 20px 0', textAlign: 'center', fontSize: '1.4rem', color: '#111827' }}>
            📄 Digital Receipt
          </h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px dashed #e5e7eb', marginBottom: '15px' }}>
            <span style={{ color: '#6b7280' }}>Amount</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>${transactionData.amount.toFixed(2)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px dashed #e5e7eb', marginBottom: '15px' }}>
            <span style={{ color: '#6b7280' }}>Risk Assessment</span>
            <span style={{ fontWeight: '600', color: getRiskLevelColor(transactionData.risk_score) }}>
              {transactionData.risk_score}/100 - {getRiskLevelText(transactionData.risk_score)}
            </span>
          </div>

          {transactionData.risk_factors && transactionData.risk_factors.length > 0 && (
            <div style={{ paddingBottom: '15px', borderBottom: '1px dashed #e5e7eb', marginBottom: '15px' }}>
              <span style={{ color: '#6b7280', display: 'block', marginBottom: '5px' }}>Risk Factors</span>
              <div style={{ fontSize: '0.9rem' }}>
                {transactionData.risk_factors.join(', ').replace(/_/g, ' ')}
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Timestamp</span>
            <span style={{ color: '#374151' }}>{new Date(transactionData.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
