import React, { useState, useEffect } from 'react';
import cardService from '../services/cardService';
import WebcamCapture from '../components/WebcamCapture';

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
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showFaceFlow, setShowFaceFlow] = useState(false);
  const [transactionData, setTransactionData] = useState(null);

  const user_did = 'did:example:123456789';

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await cardService.getCards(user_did);
        setCards(res.data.filter(c => c.status === 'active'));
      } catch (err) {
        console.error('Failed to load active cards');
      }
    };
    fetchCards();
  }, []);

  const handlePay = async (requireFace = false) => {
    if (!selectedCard || !amount) {
      setStatusMsg('Please select a card and enter an amount.');
      return;
    }

    setLoading(true);
    setStatusMsg('Processing payment securely...');
    try {
      const res = await cardService.processPayment({ user_did, card_id: selectedCard, amount: Number(amount), requireFace });
      const authResult = res.data.authResult;
      
      if (authResult.status === 'advanced_verification_required') {
        setStatusMsg('High-Value Transaction Detected. Biometrics Required.');
        setShowFaceFlow(true);
      } else if (authResult.success) {
        setStatusMsg(`Payment Approved! ID: ${authResult.transactionId}`);
        setTransactionData(res.data.transaction);
        setShowFaceFlow(false);
      } else {
        setStatusMsg(`Payment Declined: ${authResult.status}`);
        setShowFaceFlow(false);
      }
    } catch (err) {
      setStatusMsg(err.response?.data?.error || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const submitFaceFlow = () => {
    setShowFaceFlow(false);
    handlePay(true);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{styles}</style>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827', margin: 0 }}>Secure Checkout</h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginTop: '10px' }}>Powered by Identity Hub Network</p>
      </div>

      <div className="glass-card" style={{ width: '100%', padding: '40px', boxSizing: 'border-box' }}>
        
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '1.1rem' }}>Payment Method</label>
          <div style={{ position: 'relative' }}>
            <select 
              value={selectedCard} 
              onChange={(e) => setSelectedCard(e.target.value)}
              className="payment-input"
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">Choose a card to pay with...</option>
              {cards.map(c => (
                <option key={c._id} value={c._id}>
                  💳 •••• {c.card_token.slice(-4)}
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              ▼
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '35px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '1.1rem' }}>Amount</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.5rem', color: '#9ca3af', fontWeight: 'bold' }}>$</span>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="payment-input"
              style={{ paddingLeft: '45px', fontSize: '1.5rem', fontWeight: 'bold' }}
            />
          </div>
        </div>

        <button 
          onClick={() => handlePay(false)} 
          disabled={loading || showFaceFlow} 
          className="pay-button"
        >
          {loading ? 'Processing...' : 'Pay Securely'}
        </button>
      </div>

      {statusMsg && (
        <div style={{ marginTop: '25px', width: '100%', padding: '20px', borderRadius: '16px', fontWeight: '500', textAlign: 'center', fontSize: '1.1rem', background: statusMsg.includes('Approved') ? 'rgba(16, 185, 129, 0.1)' : statusMsg.includes('Biometrics') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: statusMsg.includes('Approved') ? '#047857' : statusMsg.includes('Biometrics') ? '#b45309' : '#b91c1c', border: `1px solid ${statusMsg.includes('Approved') ? 'rgba(16, 185, 129, 0.3)' : statusMsg.includes('Biometrics') ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, backdropFilter: 'blur(10px)' }}>
          {statusMsg}
        </div>
      )}

      {showFaceFlow && (
        <div style={{ marginTop: '30px', width: '100%', animation: 'float 4s ease infinite' }}>
          <div className="face-scanner-wrap">
            <div className="face-scanner-inner">
              <h3 style={{ margin: '0 0 15px 0', color: '#111827', fontSize: '1.3rem' }}>Face ID Verification</h3>
              <p style={{ color: '#4b5563', marginBottom: '25px' }}>Look at the camera to authorize this transaction.</p>
              
              <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#f3f4f6', border: '3px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <WebcamCapture />
                  <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid rgba(59, 130, 246, 0.5)', animation: 'pulse 2s infinite' }}></div>
                </div>
              </div>

              <button 
                onClick={submitFaceFlow}
                style={{ padding: '14px 28px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
              >
                Scan & Complete Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {transactionData && !showFaceFlow && (
        <div className="glass-card" style={{ marginTop: '30px', width: '100%', padding: '30px', boxSizing: 'border-box', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <h4 style={{ margin: '0 0 20px 0', textAlign: 'center', fontSize: '1.4rem', color: '#111827' }}>Digital Receipt</h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px dashed #e5e7eb', marginBottom: '15px' }}>
            <span style={{ color: '#6b7280' }}>Amount</span>
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>${transactionData.amount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px dashed #e5e7eb', marginBottom: '15px' }}>
            <span style={{ color: '#6b7280' }}>Risk Assessment</span>
            <span style={{ fontWeight: '600', color: '#10b981' }}>{transactionData.risk_score}/100 - Secured</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Timestamp</span>
            <span style={{ color: '#374151' }}>{new Date(transactionData.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
