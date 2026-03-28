import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * BankA — SSO Partner Institution Demo
 *
 * Simulates a financial institution that accepts a federated identity token
 * from Identity Hub via the /api/sso?redirect_url= flow.
 *
 * The token arrives as a URL query param: ?token=<JWT>
 */
const BankA = () => {
  const location = useLocation();
  const [ssoUser, setSsoUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      setError('No SSO token found. Please login via Identity Hub first.');
      setLoading(false);
      return;
    }

    try {
      // Decode JWT payload (client-side, for display only — no signature verification here)
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');
      const payload = JSON.parse(atob(parts[1]));
      setSsoUser(payload);
    } catch (e) {
      setError('Failed to decode SSO token: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  const handleSSOLogin = () => {
    const backendSSOUrl = `http://localhost:5000/api/sso?redirect_url=${encodeURIComponent(window.location.href.split('?')[0])}`;
    window.location.href = backendSSOUrl;
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner}>⟳ Verifying identity...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Bank Header */}
        <div style={styles.bankHeader}>
          <div style={styles.bankLogo}>🏦</div>
          <div>
            <h1 style={styles.bankName}>FirstBank Ethiopia</h1>
            <p style={styles.bankTagline}>Powered by Identity Hub SSO</p>
          </div>
        </div>

        {error && !ssoUser ? (
          <div style={styles.errorBox}>
            <p>{error}</p>
            <button onClick={handleSSOLogin} style={styles.ssoBtn}>
              🔐 Login with Identity Hub
            </button>
          </div>
        ) : ssoUser ? (
          <div>
            {/* Welcome Banner */}
            <div style={styles.welcomeBanner}>
              <div style={styles.avatar}>
                {(ssoUser.name || ssoUser.userId || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h2 style={styles.welcomeTitle}>Welcome, {ssoUser.name || 'Verified User'}!</h2>
                <p style={styles.welcomeSub}>
                  ✅ Identity verified via Identity Hub SSO
                </p>
              </div>
            </div>

            {/* Identity Details */}
            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>User ID</span>
                <span style={styles.detailValue}>{ssoUser.sub || ssoUser.userId}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Name</span>
                <span style={styles.detailValue}>{ssoUser.name}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Identity Type</span>
                <span style={styles.detailValue}>{ssoUser.type || 'auth'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Token Issuer</span>
                <span style={styles.detailValue}>identity-hub</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Token Expires</span>
                <span style={styles.detailValue}>
                  {ssoUser.exp ? new Date(ssoUser.exp * 1000).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Consent Status</span>
                <span style={{...styles.detailValue, color: '#10b981', fontWeight: 700}}>✅ Granted</span>
              </div>
            </div>

            {/* Mock Bank Actions */}
            <div style={styles.actionsHeader}>🏧 Bank Services</div>
            <div style={styles.actionsGrid}>
              {[
                { icon: '💰', label: 'Account Balance', value: 'ETB 142,500.00' },
                { icon: '📤', label: 'Transfer Money', value: 'Identity verified' },
                { icon: '📋', label: 'Loan Application', value: 'KYC pre-filled' },
                { icon: '🛡️', label: 'Insurance', value: 'Identity linked' },
              ].map((action) => (
                <div key={action.label} style={styles.actionCard}>
                  <div style={styles.actionIcon}>{action.icon}</div>
                  <div style={styles.actionLabel}>{action.label}</div>
                  <div style={styles.actionValue}>{action.value}</div>
                </div>
              ))}
            </div>

            <div style={styles.ssoNote}>
              🔗 This session was established via <strong>Identity Hub Federated SSO</strong>.
              No password was required. Your verified identity was shared with your consent.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '700px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  bankHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
  },
  bankLogo: { fontSize: '48px' },
  bankName: { margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#1a365d' },
  bankTagline: { margin: 0, color: '#718096', fontSize: '0.9rem' },
  errorBox: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    color: '#c53030',
  },
  ssoBtn: {
    marginTop: '16px',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  welcomeBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'linear-gradient(135deg, #ebf8ff, #e6fffa)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #bee3f8',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a365d, #2b6cb0)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 800,
    flexShrink: 0,
  },
  welcomeTitle: { margin: '0 0 4px 0', fontSize: '1.3rem', color: '#1a365d', fontWeight: 700 },
  welcomeSub: { margin: 0, color: '#2d7d68', fontSize: '0.95rem' },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px',
  },
  detailItem: {
    background: '#f7fafc',
    borderRadius: '8px',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
  },
  detailLabel: { display: 'block', fontSize: '0.75rem', color: '#718096', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  detailValue: { display: 'block', fontSize: '0.9rem', color: '#2d3748', fontWeight: 500, wordBreak: 'break-all' },
  actionsHeader: { fontWeight: 700, fontSize: '1.1rem', color: '#2d3748', marginBottom: '12px' },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px',
  },
  actionCard: {
    background: '#f7fafc',
    borderRadius: '10px',
    padding: '18px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  actionIcon: { fontSize: '1.8rem', marginBottom: '8px' },
  actionLabel: { fontWeight: 600, color: '#2d3748', fontSize: '0.9rem' },
  actionValue: { color: '#718096', fontSize: '0.8rem', marginTop: '4px' },
  ssoNote: {
    background: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '0.85rem',
    color: '#92400e',
    lineHeight: 1.5,
  },
  spinner: { textAlign: 'center', fontSize: '1.2rem', color: '#4a5568', padding: '40px' },
};

export default BankA;
