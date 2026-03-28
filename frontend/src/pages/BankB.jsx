import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * BankB — SSO Partner Institution Demo (MicroFinance)
 *
 * Second partner institution for demonstrating cross-institution
 * federated SSO. Same flow as BankA but different branding.
 */
const BankB = () => {
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
          <div style={styles.bankLogo}>🌱</div>
          <div>
            <h1 style={styles.bankName}>AfriMicro Finance</h1>
            <p style={styles.bankTagline}>Financial Inclusion · Powered by Identity Hub SSO</p>
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
            <div style={styles.welcomeBanner}>
              <div style={styles.avatar}>
                {(ssoUser.name || ssoUser.userId || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h2 style={styles.welcomeTitle}>Welcome, {ssoUser.name || 'Verified User'}!</h2>
                <p style={styles.welcomeSub}>✅ KYC pre-verified via Identity Hub — no re-enrollment needed</p>
              </div>
            </div>

            <div style={styles.detailsGrid}>
              {[
                ['User ID', ssoUser.sub || ssoUser.userId],
                ['Name', ssoUser.name],
                ['Token Type', ssoUser.type || 'auth'],
                ['Cross-Institution', 'Enabled via SSO'],
                ['KYC Status', '✅ Pre-verified'],
                ['Session', 'Federated · Active'],
              ].map(([label, value]) => (
                <div key={label} style={styles.detailItem}>
                  <span style={styles.detailLabel}>{label}</span>
                  <span style={styles.detailValue}>{value}</span>
                </div>
              ))}
            </div>

            <div style={styles.actionsHeader}>🌍 Microfinance Products</div>
            <div style={styles.actionsGrid}>
              {[
                { icon: '🌾', label: 'Agricultural Loan', value: 'KYC pre-filled ✅' },
                { icon: '📱', label: 'Mobile Wallet', value: 'Identity linked ✅' },
                { icon: '🏡', label: 'Housing Credit', value: 'Docs verified ✅' },
                { icon: '📊', label: 'Credit Score', value: 'Profile analysed ✅' },
              ].map((item) => (
                <div key={item.label} style={styles.actionCard}>
                  <div style={styles.actionIcon}>{item.icon}</div>
                  <div style={styles.actionLabel}>{item.label}</div>
                  <div style={styles.actionValue}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={styles.ssoNote}>
              🔗 <strong>Cross-Institution Identity Portability:</strong> Your verified identity
              from Identity Hub was instantly recognized here — no passwords, no new KYC forms.
              This demonstrates <em>Federated SSO across financial institutions</em> (Challenge D).
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
    background: 'linear-gradient(135deg, #134e4a 0%, #065f46 50%, #064e3b 100%)',
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
    borderBottom: '2px solid #d1fae5',
  },
  bankLogo: { fontSize: '48px' },
  bankName: { margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#064e3b' },
  bankTagline: { margin: 0, color: '#6b7280', fontSize: '0.9rem' },
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
    background: 'linear-gradient(135deg, #065f46, #10b981)',
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
    background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid #a7f3d0',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #064e3b, #10b981)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 800,
    flexShrink: 0,
  },
  welcomeTitle: { margin: '0 0 4px 0', fontSize: '1.3rem', color: '#064e3b', fontWeight: 700 },
  welcomeSub: { margin: 0, color: '#047857', fontSize: '0.95rem' },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px',
  },
  detailItem: {
    background: '#f9fafb',
    borderRadius: '8px',
    padding: '12px 16px',
    border: '1px solid #e5e7eb',
  },
  detailLabel: { display: 'block', fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  detailValue: { display: 'block', fontSize: '0.9rem', color: '#111827', fontWeight: 500, wordBreak: 'break-all' },
  actionsHeader: { fontWeight: 700, fontSize: '1.1rem', color: '#111827', marginBottom: '12px' },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px',
  },
  actionCard: {
    background: '#f9fafb',
    borderRadius: '10px',
    padding: '18px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
  },
  actionIcon: { fontSize: '1.8rem', marginBottom: '8px' },
  actionLabel: { fontWeight: 600, color: '#111827', fontSize: '0.9rem' },
  actionValue: { color: '#6b7280', fontSize: '0.8rem', marginTop: '4px' },
  ssoNote: {
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '0.85rem',
    color: '#065f46',
    lineHeight: 1.5,
  },
  spinner: { textAlign: 'center', fontSize: '1.2rem', color: '#4a5568', padding: '40px' },
};

export default BankB;
