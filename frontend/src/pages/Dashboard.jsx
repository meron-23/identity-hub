import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [credentialMsg, setCredentialMsg] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCardManagement = () => {
    navigate('/cards');
  };

  const handlePayment = () => {
    navigate('/payment');
  };

  const handleGetCredential = async () => {
    try {
      setCredentialMsg('Fetching credential...');
      const res = await api.get(`/credential/${user.userId}`);
      const cred = res.data.credential;
      setCredentialMsg(`✅ Verifiable Credential Issued!\n\nToken (JWT):\n${cred}`);
    } catch (err) {
      setCredentialMsg('❌ Failed to fetch credential: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Loading user data...</h2>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome to Identity Hub</h1>
        <p className="user-greeting">Hello, {user.name || 'User'}!</p>
      </div>

      <div className="dashboard-content">
        <div className="user-info-card">
          <h2>Your Identity Profile</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>User ID:</label>
              <span>{user.userId}</span>
            </div>
            <div className="info-item">
              <label>Name:</label>
              <span>{user.name || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <label>Verification Status:</label>
              <span className={`status ${user.verified ? 'verified' : 'unverified'}`}>
                {user.verified ? '✓ Verified' : '✗ Not Verified'}
              </span>
            </div>
            <div className="info-item">
              <label>Session:</label>
              <span className="session-status">Active</span>
            </div>
          </div>
        </div>

        <div className="actions-card">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button 
              onClick={handleCardManagement}
              className="action-btn primary"
            >
              🏦 Manage Cards
            </button>
            <button 
              onClick={handlePayment}
              className="action-btn success"
            >
              💳 Make Payment
            </button>
            <button 
              onClick={handleGetCredential}
              className="action-btn info"
            >
              📄 Get Verifiable Credential
            </button>
          </div>
        </div>

        <div className="system-info-card">
          <h2>System Information</h2>
          <div className="system-info">
            <p><strong>Identity Hub Features:</strong></p>
            <ul>
              <li>✅ Biometric Authentication</li>
              <li>✅ eKYC Document Verification</li>
              <li>✅ Secure Card Transactions</li>
              <li>✅ SSO Integration</li>
              <li>✅ Verifiable Credentials</li>
              <li>✅ Consent Management</li>
            </ul>
          </div>
        </div>

        {credentialMsg && (
          <div className="credential-card">
            <h2>🔏 Verifiable Credential</h2>
            <pre className="credential-output">{credentialMsg}</pre>
            <button onClick={() => setCredentialMsg('')} className="clear-btn">✕ Close</button>
          </div>
        )}
      </div>

      <div className="dashboard-footer">
        <button onClick={handleLogout} className="logout-btn">
          🚪 Logout
        </button>
      </div>

      <style jsx>{`
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .dashboard-header h1 {
          color: #333;
          margin-bottom: 10px;
        }

        .user-greeting {
          font-size: 18px;
          color: #666;
          margin: 0;
        }

        .dashboard-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .user-info-card,
        .actions-card,
        .system-info-card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          border: 1px solid #e1e5e9;
        }

        .credential-card {
          grid-column: 1 / -1;
          background: #0f172a;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          border: 1px solid #334155;
          color: #e2e8f0;
        }

        .credential-card h2 {
          color: #7dd3fc;
          margin-bottom: 15px;
          font-size: 18px;
        }

        .credential-output {
          background: #1e293b;
          color: #4ade80;
          border-radius: 8px;
          padding: 16px;
          font-size: 12px;
          word-break: break-all;
          white-space: pre-wrap;
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 15px;
          border: 1px solid #334155;
        }

        .clear-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }

        .clear-btn:hover { background: #dc2626; }

        .user-info-card h2,
        .actions-card h2,
        .system-info-card h2 {
          color: #333;
          margin-bottom: 20px;
          font-size: 20px;
        }

        .info-grid {
          display: grid;
          gap: 15px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-item label {
          font-weight: 600;
          color: #555;
        }

        .info-item span {
          color: #333;
        }

        .status.verified {
          color: #28a745;
          font-weight: 600;
        }

        .status.unverified {
          color: #dc3545;
          font-weight: 600;
        }

        .session-status {
          color: #28a745;
          font-weight: 600;
        }

        .action-buttons {
          display: grid;
          gap: 12px;
        }

        .action-btn {
          padding: 15px 20px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .action-btn.success {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
        }

        .action-btn.info {
          background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%);
          color: white;
        }

        .system-info ul {
          list-style: none;
          padding: 0;
          margin: 10px 0 0 0;
        }

        .system-info li {
          padding: 8px 0;
          color: #555;
          font-size: 14px;
        }

        .dashboard-footer {
          text-align: center;
          margin-top: 40px;
        }

        .logout-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .logout-btn:hover {
          background: #c82333;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 15px;
          }

          .dashboard-content {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            gap: 10px;
          }

          .action-btn {
            padding: 12px 16px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
