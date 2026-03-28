import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BiometricCapture from '../components/BiometricCapture';
import LivenessCapture from '../components/LivenessCapture';

const Enroll = () => {
  const { enroll, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    idImage: null,
    selfie: null,
    livenessScore: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [showLiveness, setShowLiveness] = useState(false);

  const handleLivenessCapture = (imageData, score) => {
    setFormData(prev => ({
      ...prev,
      selfie: imageData,
      livenessScore: score
    }));
    setShowLiveness(false);
    clearError();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    clearError();
  };

  const handleIdCapture = (imageData) => {
    setFormData(prev => ({
      ...prev,
      idImage: imageData
    }));
    clearError();
  };

  const handleSelfieCapture = (imageData) => {
    setFormData(prev => ({
      ...prev,
      selfie: imageData
    }));
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter your full name');
      return;
    }

    if (!formData.idImage) {
      alert('Please capture your ID document first');
      return;
    }

    if (!formData.selfie) {
      alert('Please capture your selfie first');
      return;
    }

    if (formData.livenessScore === null || formData.livenessScore < 0.7) {
      alert('Please complete liveness detection first. Score must be above 70%');
      return;
    }

    setSubmitting(true);
    
    try {
      const result = await enroll({
        name: formData.name.trim(),
        idImage: formData.idImage,
        selfie: formData.selfie
      });
      
      if (result.success) {
        alert('Enrollment successful! You can now login with your face.');
        navigate('/');
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Enrollment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="enroll-container">
      <div className="enroll-card">
        <h1>Identity Enrollment</h1>
        <p>Create your secure digital identity with biometric verification</p>
        
        {error && (
          <div className="error-message">
            {error}
            <button onClick={clearError} className="close-btn">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="enroll-form">
          <div className="form-group">
            <label htmlFor="name">Full Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full legal name"
              required
              disabled={loading || submitting}
            />
          </div>

          <div className="form-group">
            <label>ID Document Capture:</label>
            <BiometricCapture 
              onCapture={handleIdCapture}
              disabled={loading || submitting}
              showSelfie={false}
            />
            {formData.idImage && (
              <div className="capture-success">
                ✓ ID document captured successfully
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Selfie with Liveness Detection:</label>
            {!showLiveness ? (
              <BiometricCapture 
                onCapture={handleSelfieCapture}
                disabled={loading || submitting}
                showSelfie={true}
              />
            ) : (
              <LivenessCapture 
                onCapture={(imageData, score, aiResult) => {
                  console.log('AI liveness result:', aiResult);
                  handleLivenessCapture(imageData, score);
                }}
                disabled={loading || submitting}
              />
            )}
            
            {formData.selfie && !showLiveness && (
              <div className="capture-success">
                ✓ Selfie captured successfully
                <button 
                  type="button" 
                  onClick={() => setShowLiveness(true)}
                  style={{ 
                    marginLeft: '10px', 
                    padding: '5px 10px', 
                    background: '#4ade80', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    cursor: 'pointer' 
                  }}
                >
                  Run Liveness Check
                </button>
              </div>
            )}
            
            {formData.livenessScore && (
              <div className="capture-success">
                ✓ Liveness score: {(formData.livenessScore * 100).toFixed(0)}%
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || submitting || !formData.name.trim() || !formData.idImage || !formData.selfie}
            className="enroll-btn"
          >
            {submitting ? 'Processing Enrollment...' : 'Complete Enrollment'}
          </button>
        </form>

        <div className="enroll-footer">
          <p>Already have an account? <a href="/">Login here</a></p>
        </div>

        <div className="security-info">
          <h3>🔒 Security Information</h3>
          <ul>
            <li>Your biometric data is encrypted and securely stored</li>
            <li>ID documents are used only for verification purposes</li>
            <li>All data is processed in compliance with privacy regulations</li>
            <li>You can request data deletion at any time</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .enroll-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
          padding: 20px;
        }

        .enroll-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          max-width: 600px;
          margin: 0 auto;
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

        .enroll-form {
          display: flex;
          flex-direction: column;
          gap: 25px;
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
          border-color: #74b9ff;
        }

        .capture-success {
          background-color: #d4edda;
          color: #155724;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          margin-top: 8px;
        }

        .enroll-btn {
          background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .enroll-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .enroll-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .enroll-footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .enroll-footer a {
          color: #0984e3;
          text-decoration: none;
          font-weight: 600;
        }

        .enroll-footer a:hover {
          text-decoration: underline;
        }

        .security-info {
          margin-top: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #0984e3;
        }

        .security-info h3 {
          color: #0984e3;
          margin-bottom: 15px;
          font-size: 16px;
        }

        .security-info ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .security-info li {
          padding: 6px 0;
          color: #555;
          font-size: 14px;
          position: relative;
          padding-left: 20px;
        }

        .security-info li:before {
          content: "•";
          color: #0984e3;
          position: absolute;
          left: 0;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .enroll-container {
            padding: 15px;
          }

          .enroll-card {
            padding: 25px;
          }

          .enroll-form {
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default Enroll;
