import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BiometricCapture from '../components/BiometricCapture';

const Login = () => {
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [selfie, setSelfie] = useState(null);
  const [userId, setUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSelfieCapture = (imageData) => {
    setSelfie(imageData);
    clearError();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!selfie) {
      alert('Please capture your selfie first');
      return;
    }

    if (!userId.trim()) {
      alert('Please enter your User ID');
      return;
    }

    setSubmitting(true);
    
    try {
      const result = await login(selfie, userId.trim());
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Biometric Login</h1>
        <p>Log in using your face and User ID</p>
        
        {error && (
          <div className="error-message">
            {error}
            <button onClick={clearError} className="close-btn">×</button>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="userId">User ID:</label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your User ID"
              required
              disabled={loading || submitting}
            />
          </div>

          <div className="form-group">
            <label>Capture Your Selfie:</label>
            <BiometricCapture 
              onCapture={handleSelfieCapture}
              disabled={loading || submitting}
              showSelfie={true}
            />
          </div>

          <button
            type="submit"
            disabled={loading || submitting || !selfie || !userId.trim()}
            className="login-btn"
          >
            {submitting ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <a href="/enroll">Enroll here</a></p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .login-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          width: 100%;
          max-width: 500px;
        }

        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 10px;
        }

        p {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
        }

        .error-message {
          background-color: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #721c24;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-weight: 600;
          color: #333;
        }

        input[type="text"] {
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        input[type="text"]:focus {
          outline: none;
          border-color: #667eea;
        }

        .login-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .login-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .login-footer a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .login-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default Login;
