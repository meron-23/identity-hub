import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import LivenessCapture from '../components/LivenessCapture';

// ── Step definitions ──────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Identity',   icon: '👤' },
  { id: 2, label: 'ID Document', icon: '🪪' },
  { id: 3, label: 'Liveness',   icon: '👁' },
  { id: 4, label: 'Confirm',    icon: '✅' },
];

// ── ID Capture component (inline webcam + file) ───────────────────────────
const IDCapture = ({ onCapture, captured }) => {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const fileRef   = useRef(null);
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState(captured || null);

  const startCam  = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      videoRef.current.srcObject = s;
      await videoRef.current.play();
      setActive(true);
    } catch {
      alert('Camera not available — please upload your ID using the Upload button.');
    }
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setActive(false);
  };

  const snap = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(data);
    onCapture(data);
    stopCam();
  };

  const upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPreview(ev.target.result);
      onCapture(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setPreview(null);
    onCapture(null);
    stopCam();
  };

  if (preview) {
    return (
      <div style={id.wrap}>
        <img src={preview} alt="ID" style={id.img} />
        <div style={id.captured}>
          <span style={id.tick}>✓</span> ID captured
          <button style={id.retakeBtn} onClick={retake}>Retake</button>
        </div>
      </div>
    );
  }

  return (
    <div style={id.wrap}>
      {active ? (
        <>
          <video ref={videoRef} autoPlay playsInline muted style={id.video} />
          <div style={id.camBtns}>
            <button style={{...id.btn, ...id.btnSnap}} onClick={snap}>📸 Capture</button>
            <button style={{...id.btn, ...id.btnCancel}} onClick={stopCam}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <video ref={videoRef} style={{ display: 'none' }} />
          <div style={id.placeholder}>
            <div style={id.placeholderIcon}>🪪</div>
            <p style={id.placeholderText}>Take a photo or upload your government-issued ID</p>
            <div style={id.camBtns}>
              <button style={{...id.btn, ...id.btnPrimary}} onClick={startCam}>📷 Open Camera</button>
              <button style={{...id.btn, ...id.btnSecondary}} onClick={() => fileRef.current.click()}>
                📁 Upload File
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={upload} />
          </div>
        </>
      )}
    </div>
  );
};

// ── id-capture styles ─────────────────────────────────────────────────────
const id = {
  wrap: { borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a' },
  img:  { width: '100%', display: 'block', maxHeight: '280px', objectFit: 'cover' },
  video:{ width: '100%', display: 'block', maxHeight: '280px', objectFit: 'cover' },
  placeholder: {
    padding: '48px 24px',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.02)',
  },
  placeholderIcon: { fontSize: '3.5rem', marginBottom: '12px' },
  placeholderText: { color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' },
  camBtns: { display: 'flex', gap: '12px', justifyContent: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.2)' },
  btn: { padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' },
  btnPrimary: { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff' },
  btnSecondary: { background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' },
  btnSnap: { background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff' },
  btnCancel: { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' },
  captured: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 16px', background: 'rgba(16,185,129,0.1)',
    borderTop: '1px solid rgba(16,185,129,0.3)', color: '#4ade80', fontSize: '0.9rem', fontWeight: 600,
  },
  tick: { fontSize: '1.1rem' },
  retakeBtn: {
    marginLeft: 'auto', padding: '4px 12px', background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
    color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem',
  },
};

// ── Main Enroll page ──────────────────────────────────────────────────────
const Enroll = () => {
  const { enroll, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]           = useState(1);
  const [name, setName]           = useState('');
  const [idImage, setIdImage]     = useState(null);
  const [selfie, setSelfie]       = useState(null);
  const [livenessScore, setLivenessScore] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  // ── Step gate logic ─────────────────────────────────────────────────────
  const canAdvance = () => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return !!idImage;
    if (step === 3) return livenessScore !== null && livenessScore >= 0.7;
    return false;
  };

  const next = () => { if (canAdvance()) setStep(s => Math.min(s + 1, 4)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  // ── Liveness complete callback ──────────────────────────────────────────
  const handleLivenessComplete = useCallback((score, imageDataUrl) => {
    setSelfie(imageDataUrl);
    setLivenessScore(score);
    setStep(4);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name || !idImage || !selfie || livenessScore < 0.7) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await enroll({ name: name.trim(), idImage, selfie });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => navigate('/'), 2500);
      } else {
        setError(result.error || 'Enrollment failed. Please try again.');
        setStep(1);
      }
    } catch (e) {
      setError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={css.page}>
        <div style={{ ...css.card, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '5rem', marginBottom: '20px', filter: 'drop-shadow(0 0 20px #4ade80)' }}>✅</div>
          <h2 style={{ color: '#4ade80', margin: '0 0 12px', fontSize: '1.8rem' }}>Enrollment Complete!</h2>
          <p style={{ color: '#94a3b8', marginBottom: '8px' }}>Your digital identity has been created.</p>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={css.page}>
      <div style={css.card}>

        {/* ── Header ── */}
        <div style={css.header}>
          <div style={css.logo}>🔐</div>
          <div>
            <h1 style={css.h1}>Identity Enrollment</h1>
            <p style={css.sub}>Create your biometric digital identity</p>
          </div>
        </div>

        {/* ── Step indicator ── */}
        <div style={css.stepbar}>
          {STEPS.map((s, i) => {
            const done    = step > s.id;
            const current = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    ...css.stepCircle,
                    ...(done    ? css.stepDone    : {}),
                    ...(current ? css.stepCurrent : {}),
                  }}>
                    {done ? '✓' : s.icon}
                  </div>
                  <span style={{
                    ...css.stepLabel,
                    color: current ? '#818cf8' : done ? '#4ade80' : '#475569',
                  }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    ...css.stepLine,
                    background: step > s.id ? '#4ade80' : 'rgba(255,255,255,0.08)',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div style={css.errorBanner}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={css.closeX}>✕</button>
          </div>
        )}

        {/* ══════════════════ STEP 1 — Name ══════════════════ */}
        {step === 1 && (
          <div style={css.stepContent}>
            <h2 style={css.stepTitle}>What's your full name?</h2>
            <p style={css.stepDesc}>Enter your name exactly as it appears on your government-issued ID.</p>
            <input
              autoFocus
              style={css.input}
              type="text"
              placeholder="e.g. Abebe Kebede Girma"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && next()}
            />
            <div style={css.infoList}>
              <div style={css.infoItem}><span>🔒</span> Encrypted and stored securely</div>
              <div style={css.infoItem}><span>🗑️</span> Deletable at any time</div>
              <div style={css.infoItem}><span>🌍</span> GDPR & PDPA compliant</div>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 2 — ID Document ══════════════════ */}
        {step === 2 && (
          <div style={css.stepContent}>
            <h2 style={css.stepTitle}>Scan your ID document</h2>
            <p style={css.stepDesc}>
              Hold your national ID, passport, or driver's licence flat and well-lit.
              Our AI will extract and verify your details automatically.
            </p>
            <IDCapture onCapture={setIdImage} captured={idImage} />
            {idImage && (
              <div style={css.successPill}>✓ AI document scan queued — proceed to liveness</div>
            )}
          </div>
        )}

        {/* ══════════════════ STEP 3 — Liveness ══════════════════ */}
        {step === 3 && (
          <div style={css.stepContent}>
            <h2 style={css.stepTitle}>Anti-spoofing liveness check</h2>
            <p style={css.stepDesc}>
              Move your <strong style={{ color: '#fde68a' }}>nose</strong> to follow the{' '}
              <strong style={{ color: '#facc15' }}>yellow dot</strong> as it travels around the oval.
              Complete <strong>90%</strong> of the circle to pass.
            </p>
            <LivenessCapture
              onComplete={handleLivenessComplete}
              onCancel={() => {}}
              disabled={loading}
            />
          </div>
        )}

        {/* ══════════════════ STEP 4 — Confirm ══════════════════ */}
        {step === 4 && (
          <div style={css.stepContent}>
            <h2 style={css.stepTitle}>Review & submit</h2>
            <p style={css.stepDesc}>Everything looks good! Confirm the details below and submit.</p>

            <div style={css.reviewGrid}>
              <div style={css.reviewItem}>
                <span style={css.reviewLabel}>Full Name</span>
                <span style={css.reviewValue}>{name}</span>
              </div>
              <div style={css.reviewItem}>
                <span style={css.reviewLabel}>ID Document</span>
                <span style={{ ...css.reviewValue, color: '#4ade80' }}>✓ Captured</span>
              </div>
              <div style={css.reviewItem}>
                <span style={css.reviewLabel}>Liveness Score</span>
                <span style={{ ...css.reviewValue, color: '#4ade80' }}>
                  {Math.round((livenessScore || 0) * 100)}% ✓ PASSED
                </span>
              </div>
              <div style={css.reviewItem}>
                <span style={css.reviewLabel}>Selfie</span>
                <span style={{ ...css.reviewValue, color: '#4ade80' }}>✓ Captured</span>
              </div>
            </div>

            {selfie && (
              <img src={selfie} alt="selfie preview" style={css.selfiePreview} />
            )}

            <div style={css.consentBox}>
              By submitting, you consent to your biometric data being processed for identity verification
              in accordance with our{' '}
              <span style={{ color: '#818cf8', cursor: 'pointer' }}>Privacy Policy</span>.
            </div>
          </div>
        )}

        {/* ── Footer nav ── */}
        <div style={css.footer}>
          {step > 1 && step < 4 && (
            <button style={{ ...css.btn, ...css.btnBack }} onClick={back} disabled={submitting}>
              ← Back
            </button>
          )}
          {step === 4 && (
            <button style={{ ...css.btn, ...css.btnBack }} onClick={() => setStep(1)} disabled={submitting}>
              ← Edit
            </button>
          )}

          {step < 3 && (
            <button
              style={{ ...css.btn, ...(canAdvance() ? css.btnNext : css.btnDisabled) }}
              onClick={next}
              disabled={!canAdvance()}
            >
              {step === 2 ? 'Continue to Liveness →' : 'Continue →'}
            </button>
          )}

          {step === 3 && !livenessScore && (
            <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
              Complete the liveness check above to continue
            </p>
          )}

          {step === 4 && (
            <button
              style={{ ...css.btn, ...css.btnSubmit }}
              onClick={handleSubmit}
              disabled={submitting || loading}
            >
              {submitting ? '⟳ Creating identity…' : '🚀 Complete Enrollment'}
            </button>
          )}
        </div>

        {/* ── Login link ── */}
        <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.85rem', marginTop: '20px' }}>
          Already enrolled?{' '}
          <Link to="/" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            Sign in here →
          </Link>
        </p>
      </div>
    </div>
  );
};

// ── Page-level styles ─────────────────────────────────────────────────────
const css = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px 60px',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  card: {
    background: 'rgba(15,23,42,0.9)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '20px',
    padding: '36px',
    width: '100%',
    maxWidth: '620px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '28px',
  },
  logo: {
    fontSize: '2.8rem',
    filter: 'drop-shadow(0 0 16px #818cf8)',
  },
  h1: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#e2e8f0',
    letterSpacing: '-0.02em',
  },
  sub: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: '0.88rem',
  },
  // Stepbar
  stepbar: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '32px',
  },
  stepCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '2px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    color: '#475569',
    fontWeight: 700,
    transition: 'all 0.3s',
  },
  stepDone: {
    background: 'rgba(74,222,128,0.12)',
    border: '2px solid #4ade80',
    color: '#4ade80',
  },
  stepCurrent: {
    background: 'rgba(129,140,248,0.15)',
    border: '2px solid #818cf8',
    color: '#818cf8',
    boxShadow: '0 0 20px rgba(129,140,248,0.3)',
  },
  stepLine: {
    flex: 1,
    height: '2px',
    margin: '0 8px',
    borderRadius: '1px',
    marginBottom: '20px',
    transition: 'background 0.3s',
  },
  stepLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    transition: 'color 0.3s',
  },
  // Step content
  stepContent: {
    minHeight: '260px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  stepTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#e2e8f0',
    letterSpacing: '-0.01em',
  },
  stepDesc: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.88rem',
    lineHeight: 1.6,
  },
  // Name input
  input: {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.05)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    color: '#e2e8f0',
    fontSize: '1.05rem',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '4px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#475569',
    fontSize: '0.85rem',
  },
  successPill: {
    background: 'rgba(74,222,128,0.1)',
    border: '1px solid rgba(74,222,128,0.3)',
    borderRadius: '8px',
    padding: '10px 16px',
    color: '#4ade80',
    fontSize: '0.88rem',
    fontWeight: 600,
  },
  // Review
  reviewGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  reviewItem: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    padding: '14px 16px',
    border: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  reviewLabel: {
    fontSize: '0.72rem',
    color: '#475569',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  reviewValue: {
    fontSize: '0.95rem',
    color: '#e2e8f0',
    fontWeight: 600,
  },
  selfiePreview: {
    width: '120px',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '50%',
    border: '3px solid #4ade80',
    boxShadow: '0 0 20px rgba(74,222,128,0.3)',
    display: 'block',
    margin: '4px auto 0',
  },
  consentBox: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#475569',
    fontSize: '0.8rem',
    lineHeight: 1.6,
  },
  // Error
  errorBanner: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#f87171',
    fontSize: '0.88rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  closeX: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 700,
    padding: 0,
  },
  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  btn: {
    padding: '13px 28px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Inter', sans-serif",
  },
  btnBack: {
    background: 'rgba(255,255,255,0.07)',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
    marginRight: 'auto',
  },
  btnNext: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
  },
  btnDisabled: {
    background: 'rgba(255,255,255,0.06)',
    color: '#334155',
    cursor: 'not-allowed',
  },
  btnSubmit: {
    background: 'linear-gradient(135deg, #059669, #10b981)',
    color: '#fff',
    boxShadow: '0 4px 24px rgba(16,185,129,0.4)',
    fontSize: '1rem',
    padding: '14px 32px',
  },
};

export default Enroll;
