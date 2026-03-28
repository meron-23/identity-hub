import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import cardService from '../services/cardService';

// --- Premium Card Styling & Animations ---
const styles = `
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0px); }
  }
  .card-container {
    perspective: 1000px;
  }
  .credit-card {
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
    background-size: 200% 200%;
  }
  .credit-card:hover {
    transform: rotateY(5deg) rotateX(5deg) scale(1.02);
    box-shadow: -10px 20px 30px rgba(0, 0, 0, 0.2);
  }
  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
  }
  body {
    background: #f0f4f8;
    background-image: radial-gradient(circle at 10% 20%, rgb(239, 246, 249) 0%, rgb(206, 239, 253) 90%);
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
`;

const ChipIcon = () => (
  <svg width="40" height="30" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="30" rx="4" fill="#E2C15F"/>
    <path d="M12 0V30 M28 0V30 M0 15H40" stroke="#B89B48" strokeWidth="1.5"/>
    <path d="M0 8H12 M28 8H40 M0 22H12 M28 22H40" stroke="#B89B48" strokeWidth="1.5"/>
  </svg>
);

const ContactlessIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 8 C14 4, 22 4, 28 8" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M10 14 C15 11, 21 11, 26 14" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M12 20 C16 18, 20 18, 24 20" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M14 26 C15.5 25, 17.5 25, 19 26" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export default function CardManagement() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [cardNumber, setCardNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use the real authenticated user's ID as the DID
  const user_did = user?.userId;

  useEffect(() => {
    if (user_did) fetchCards();
  }, [user_did]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await cardService.getCards(user_did);
      setCards(res.data);
    } catch (err) {
      setError('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCard = async (e) => {
    e.preventDefault();
    if (!cardNumber) return;
    try {
      setLoading(true);
      setError(null);
      await cardService.linkCard({ user_did, cardNumber });
      setCardNumber('');
      fetchCards();
    } catch (err) {
      setError('Failed to link card');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVirtualCard = async () => {
    try {
      setLoading(true);
      setError(null);
      await cardService.generateVirtualCard({ user_did });
      fetchCards();
    } catch (err) {
      setError('Failed to generate virtual card');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCard = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await cardService.disableCard(id);
      fetchCards();
    } catch (err) {
      setError('Failed to update card status');
    } finally {
      setLoading(false);
    }
  };

  // Guard: wait for auth context to be ready
  if (!user_did) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading user session...
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{styles}</style>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', display: 'inline-block', background: 'linear-gradient(135deg, #1f2937, #4b5563)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Card Wallet
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginTop: '10px' }}>Manage your digital identity and finances securely.</p>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#b91c1c', marginBottom: '30px', fontWeight: '500', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '50px' }}>
        {/* Link Card Form */}
        <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.4rem', color: '#1f2937' }}>Link Physical Card</h3>
          <form onSubmit={handleLinkCard} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" 
              placeholder="16-digit Card Number" 
              value={cardNumber} 
              onChange={(e) => setCardNumber(e.target.value)}
              style={{ padding: '16px', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '1.1rem', background: 'rgba(255,255,255,0.8)', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <button type="submit" disabled={loading} style={{ padding: '16px', background: '#111827', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.1s, background 0.2s' }} onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'} onMouseUp={(e) => e.target.style.transform = 'scale(1)'}>
              Securely Link Card
            </button>
          </form>
        </div>

        {/* Generate Virtual Card */}
        <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))' }}>
          <div style={{ width: '60px', height: '60px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          </div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: '#1f2937' }}>Need a Secure Card?</h3>
          <p style={{ color: '#4b5563', marginBottom: '25px', lineHeight: '1.5' }}>Generate an instant, one-time use virtual card for safe online purchases.</p>
          <button onClick={handleGenerateVirtualCard} disabled={loading} style={{ padding: '14px 24px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', width: '100%', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)', transition: 'transform 0.1s' }} onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'} onMouseUp={(e) => e.target.style.transform = 'scale(1)'}>
            Generate Virtual Card
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: '1.8rem', color: '#1f2937', marginBottom: '30px', textAlign: 'center' }}>Your Wallet</h3>
      
      {loading && cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading your secure cards...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '40px' }} className="card-container">
          {cards.length === 0 ? <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: '40px', background: 'rgba(255,255,255,0.4)', borderRadius: '24px' }}>No cards linked yet. Add one above.</div> : cards.map((card, idx) => {
            
            const isActive = card.status === 'active';
            
            // Generate a unique beautiful gradient for each card based on its ID
            const gradients = [
              'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', // Dark Elite
              'linear-gradient(135deg, #1e3c72, #2a5298)',         // Blue Ocean
              'linear-gradient(135deg, #ff416c, #ff4b2b)',         // Red Fiery
              'linear-gradient(135deg, #8E2DE2, #4A00E0)'          // Purple Royal
            ];
            
            const bgGradient = isActive ? gradients[idx % gradients.length] : 'linear-gradient(135deg, #9ca3af, #d1d5db)';

            return (
              <div key={card._id} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Visual Credit Card */}
                <div 
                  className="credit-card"
                  style={{ 
                    height: '220px', 
                    borderRadius: '24px', 
                    padding: '24px', 
                    color: '#fff',
                    background: bgGradient,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isActive ? '0 15px 35px rgba(0,0,0,0.1)' : 'none',
                    animation: 'gradientShift 8s ease infinite',
                    filter: isActive ? 'none' : 'grayscale(100%) opacity(0.8)',
                  }}
                >
                  <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}></div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <ChipIcon />
                    <ContactlessIcon />
                  </div>
                  
                  <div style={{ position: 'relative', zIndex: 1, letterSpacing: '4px', fontSize: '1.4rem', fontFamily: 'monospace', textShadow: '0 2px 4px rgba(0,0,0,0.3)', marginTop: '20px' }}>
                    {card.card_token.replace('tok_', '').match(/.{1,4}/g)?.join(' ') || card.card_token}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
                    <div style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem', opacity: 0.9 }}>
                      IDENTITY HUB
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(235, 0, 27, 0.8)' }}></div>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(247, 158, 27, 0.8)', marginLeft: '-15px' }}></div>
                    </div>
                  </div>
                </div>

                {/* Card Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.4)', borderRadius: '16px', padding: '12px 20px', border: '1px solid rgba(255,255,255,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isActive ? '#10b981' : '#ef4444', boxShadow: `0 0 10px ${isActive ? '#10b981' : '#ef4444'}` }}></div>
                    <span style={{ fontWeight: '600', color: '#374151', textTransform: 'capitalize' }}>{card.status}</span>
                  </div>
                  <button 
                    onClick={() => handleToggleCard(card._id)}
                    disabled={loading}
                    style={{ 
                      padding: '8px 16px', 
                      background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                      color: isActive ? '#ef4444' : '#10b981', 
                      border: `1px solid ${isActive ? '#ef4444' : '#10b981'}`, 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.target.style.background = isActive ? '#ef4444' : '#10b981'; e.target.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.target.style.background = isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'; e.target.style.color = isActive ? '#ef4444' : '#10b981'; }}
                  >
                    {isActive ? 'Freeze Card' : 'Unfreeze'}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
