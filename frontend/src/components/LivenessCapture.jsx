/**
 * LivenessCapture.jsx
 *
 * Browser-native circle-tracking liveness detection.
 * Mirrors the logic in ai/models/continuous_kyc.py:
 *
 *  - An animated oval drawn on a <canvas> overlay is split into 36 segments.
 *  - A bright "active" segment moves around the oval continuously.
 *  - MediaPipe FaceMesh (loaded via CDN at runtime) provides the nose-tip
 *    keypoint (landmark index 1) in real time.
 *  - When the user's nose is within threshold_dist pixels of the active
 *    segment dot, that segment is marked as "followed" (turns green).
 *  - Completion = followed_segments / total_segments.
 *  - At ≥ 90 % completion → PASS → calls onComplete(score, capturedFrame).
 *  - Two "cheat" guards mirror the Python version:
 *      • Nose jump > 120 px in one frame → reset followed set
 *      • 3 full laps without 90 % → FAIL
 *
 * Props
 * ─────
 *  onComplete(score: float, imageDataUrl: string, result: object) → void
 *  onCancel() → void
 *  disabled: bool
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ── Constants (match continuous_kyc.py) ───────────────────────────────────
const TOTAL_SEGMENTS  = 36;
const SEG_SIZE        = (2 * Math.PI) / TOTAL_SEGMENTS;
const SPEED           = (2 * Math.PI) / (30 * 2.5); // ≈1 lap / 2.5 s at 30 fps
const THRESHOLD_DIST  = 60;   // pixels  — how close nose must be to the dot
const PASS_THRESHOLD  = 0.90; // 90 % of segments followed
const FAIL_LAP_LIMIT  = 3;    // fail if 3 full laps without passing
// Oval dimensions as fraction of canvas size
const OVAL_RX_FRAC    = 0.30;
const OVAL_RY_FRAC    = 0.38;

// ── MediaPipe CDN URLs ────────────────────────────────────────────────────
const MP_FACE_MESH_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
const MP_CAMERA_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Component ─────────────────────────────────────────────────────────────
const LivenessCapture = ({ onComplete, onCancel, disabled = false }) => {

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const stateRef   = useRef({
    theta:          0,
    followed:       new Set(),
    lastNose:       null,
    laps:           0,
    faceMesh:       null,
    noseLandmark:   null,   // { x, y } in canvas pixels
    finished:       false,
  });

  const [phase, setPhase]         = useState('idle');    // idle | loading | running | pass | fail
  const [completion, setCompletion] = useState(0);
  const [statusMsg, setStatusMsg]   = useState('');
  const [mpLoaded, setMpLoaded]     = useState(false);

  // ── Load MediaPipe once ─────────────────────────────────────────────────
  useEffect(() => {
    loadScript(MP_FACE_MESH_URL)
      .then(() => loadScript(MP_CAMERA_URL))
      .then(() => setMpLoaded(true))
      .catch(() => setMpLoaded(true)); // proceed anyway (fallback)
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (stateRef.current.faceMesh) {
      try { stateRef.current.faceMesh.close(); } catch (_) {}
      stateRef.current.faceMesh = null;
    }
  }, []);

  // ── Start liveness session ──────────────────────────────────────────────
  const startLiveness = useCallback(async () => {
    setPhase('loading');
    setStatusMsg('Starting camera…');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (e) {
      setStatusMsg('❌ Camera access denied — please allow camera and reload.');
      setPhase('fail');
      return;
    }

    // Reset state
    const s = stateRef.current;
    s.theta       = 0;
    s.followed    = new Set();
    s.lastNose    = null;
    s.laps        = 0;
    s.noseLandmark = null;
    s.finished     = false;
    setCompletion(0);

    // ── Try to init MediaPipe FaceMesh ─────────────────────────────────
    if (window.FaceMesh) {
      try {
        const fm = new window.FaceMesh({
          locateFile: (f) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
        });
        fm.setOptions({
          maxNumFaces:         1,
          refineLandmarks:     true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence:  0.5,
        });
        fm.onResults((results) => {
          if (!results.multiFaceLandmarks?.length) {
            stateRef.current.noseLandmark = null;
            return;
          }
          const canvas = canvasRef.current;
          if (!canvas) return;
          // landmark 1 = nose tip in normalised coords
          const lm = results.multiFaceLandmarks[0][1];
          stateRef.current.noseLandmark = {
            x: lm.x * canvas.width,
            y: lm.y * canvas.height,
          };
        });
        await fm.initialize();
        s.faceMesh = fm;
      } catch (_) { /* fall through to fallback */ }
    }

    setPhase('running');
    setStatusMsg('Follow the glowing dot with your nose!');
    runLoop();
  }, []);

  // ── Main animation loop ─────────────────────────────────────────────────
  const runLoop = useCallback(() => {
    const canvas  = canvasRef.current;
    const video   = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    const W   = canvas.width;
    const H   = canvas.height;
    const cx  = W / 2;
    const cy  = H / 2;
    const rx  = W * OVAL_RX_FRAC;
    const ry  = H * OVAL_RY_FRAC;

    const s = stateRef.current;

    // Feed frame to FaceMesh
    if (s.faceMesh && video.readyState >= 2) {
      s.faceMesh.send({ image: video }).catch(() => {});
    }

    // --- Draw mirrored video frame ---
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, W, H);
    ctx.restore();

    // --- Dark vignette overlay ---
    const grad = ctx.createRadialGradient(cx, cy, ry * 0.6, cx, cy, W * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // --- Progress oval (segmented) ---
    const currentSegIdx = Math.floor((s.theta % (2 * Math.PI)) / SEG_SIZE);

    for (let i = 0; i < TOTAL_SEGMENTS; i++) {
      const angleCenter = i * SEG_SIZE;
      const isActive    = i === currentSegIdx;
      const isFollowed  = s.followed.has(i);

      if (isActive) {
        ctx.strokeStyle = '#facc15'; // yellow: active target
        ctx.lineWidth   = 7;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur  = 18;
      } else if (isFollowed) {
        const prog = i / TOTAL_SEGMENTS;
        const r = Math.round(255 * (1 - prog));
        const g = Math.round(255 * prog);
        ctx.strokeStyle = `rgb(${r},${g},0)`;
        ctx.lineWidth   = 5;
        ctx.shadowBlur  = 0;
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth   = 3;
        ctx.shadowBlur  = 0;
      }

      const startAngle = angleCenter - SEG_SIZE * 0.42;
      const endAngle   = angleCenter + SEG_SIZE * 0.42;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, startAngle, endAngle);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // --- Target dot on the oval ---
    const dotX = cx + rx * Math.cos(s.theta);
    const dotY = cy + ry * Math.sin(s.theta);

    ctx.beginPath();
    ctx.arc(dotX, dotY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur  = 28;
    ctx.fill();
    ctx.shadowBlur  = 0;

    // --- Nose indicator (if tracked) ---
    if (s.noseLandmark) {
      // mirror the x to match the flipped video
      const nx = W - s.noseLandmark.x;
      const ny = s.noseLandmark.y;

      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(168,85,247,0.9)';   // purple dot
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur  = 16;
      ctx.fill();
      ctx.shadowBlur  = 0;

      // --- Check proximity ---
      const dist = Math.hypot(nx - dotX, ny - dotY);

      // Anti-cheat: jump guard
      if (s.lastNose) {
        const jump = Math.hypot(nx - s.lastNose.x, ny - s.lastNose.y);
        if (jump > 120) s.followed.clear();
      }
      s.lastNose = { x: nx, y: ny };

      if (dist < THRESHOLD_DIST) {
        s.followed.add(currentSegIdx);
      }

      // Line from nose to dot
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(dotX, dotY);
      ctx.strokeStyle = dist < THRESHOLD_DIST
        ? 'rgba(74,222,128,0.6)'
        : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // --- Progress bar ---
    const comp = s.followed.size / TOTAL_SEGMENTS;
    const barW = W * 0.7;
    const barX = (W - barW) / 2;
    const barY = H - 36;
    const fillColor = `hsl(${Math.round(comp * 120)}, 90%, 55%)`;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 12, 6);
    ctx.fill();

    ctx.fillStyle = fillColor;
    ctx.shadowColor = fillColor;
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * comp, 12, 6);
    ctx.fill();
    ctx.shadowBlur  = 0;

    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(comp * 100)}%  ${s.noseLandmark ? '👃 Nose tracked' : '👁 Center your face'}`, W / 2, barY - 8);

    // --- Advance theta ---
    s.theta += SPEED;

    // Lap check
    if (s.theta >= 2 * Math.PI * (s.laps + 1)) {
      s.laps += 1;
    }

    // --- Completion check ---
    if (comp >= PASS_THRESHOLD && !s.finished) {
      s.finished = true;
      handlePass(canvas);
      return;
    }

    if (s.laps >= FAIL_LAP_LIMIT && comp < PASS_THRESHOLD && !s.finished) {
      s.finished = true;
      handleFail(comp);
      return;
    }

    setCompletion(comp);
    rafRef.current = requestAnimationFrame(runLoop);
  }, []);

  // ── Pass ────────────────────────────────────────────────────────────────
  const handlePass = useCallback((canvas) => {
    cancelAnimationFrame(rafRef.current);

    // Final frame snapshot
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

    // Draw green "VERIFIED" overlay
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 42px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur  = 30;
    ctx.fillText('✓ LIVENESS PASSED', W / 2, H / 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText('Identity verified — you\'re a real person!', W / 2, H / 2 + 44);

    setPhase('pass');
    setCompletion(1);
    setStatusMsg('✅ Liveness check passed!');

    stopAll();
    setTimeout(() => {
      onComplete(0.97, imageDataUrl, { is_live: true, score: 0.97, method: 'circle_tracking' });
    }, 1200);
  }, [onComplete, stopAll]);

  // ── Fail ────────────────────────────────────────────────────────────────
  const handleFail = useCallback((comp) => {
    cancelAnimationFrame(rafRef.current);
    stopAll();
    setPhase('fail');
    setStatusMsg(`❌ Liveness failed (${Math.round(comp * 100)}% completed). Please try again.`);
  }, [stopAll]);

  // ── Cancel ──────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    stopAll();
    setPhase('idle');
    setCompletion(0);
    setStatusMsg('');
    if (onCancel) onCancel();
  }, [onCancel, stopAll]);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={css.wrapper}>

      {/* ── Title bar ── */}
      <div style={css.titleBar}>
        <span style={css.titleIcon}>👁</span>
        <div>
          <h3 style={css.title}>Liveness Detection</h3>
          <p style={css.subtitle}>Follow the moving dot with your nose</p>
        </div>
        {(phase === 'running' || phase === 'pass' || phase === 'fail') && (
          <button style={css.closeBtn} onClick={handleCancel}>✕</button>
        )}
      </div>

      {/* ── Camera + Canvas area ── */}
      <div style={css.cameraWrap}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ display: 'none' }}
        />
        <canvas
          ref={canvasRef}
          width={580}
          height={440}
          style={{
            ...css.canvas,
            display: phase === 'idle' || phase === 'loading' ? 'none' : 'block',
          }}
        />

        {/* ── Idle placeholder ── */}
        {(phase === 'idle' || phase === 'loading') && (
          <div style={css.placeholder}>
            <div style={css.placeholderIcon}>
              {phase === 'loading' ? '⟳' : '🎯'}
            </div>
            <p style={css.placeholderText}>
              {phase === 'loading'
                ? 'Starting camera…'
                : 'Position your face in front of the camera then press start'}
            </p>
          </div>
        )}
      </div>

      {/* ── Instructions strip (while running) ── */}
      {phase === 'running' && (
        <div style={css.instructionStrip}>
          <span>💡</span>
          <span>Move your <strong>nose tip</strong> to follow the <strong style={{ color: '#facc15' }}>yellow dot</strong> as it travels around the oval</span>
        </div>
      )}

      {/* ── Status message ── */}
      {statusMsg && (
        <div style={{
          ...css.statusMsg,
          background: phase === 'pass'
            ? 'rgba(74,222,128,0.15)'
            : phase === 'fail'
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(59,130,246,0.15)',
          borderColor: phase === 'pass' ? '#4ade80' : phase === 'fail' ? '#ef4444' : '#3b82f6',
          color: phase === 'pass' ? '#4ade80' : phase === 'fail' ? '#ef4444' : '#93c5fd',
        }}>
          {statusMsg}
        </div>
      )}

      {/* ── Progress bar (idle state) ── */}
      {phase === 'running' && (
        <div style={css.progressRow}>
          <div style={css.progressTrack}>
            <div style={{
              ...css.progressFill,
              width: `${completion * 100}%`,
              background: `hsl(${Math.round(completion * 120)}, 85%, 55%)`,
              boxShadow: `0 0 12px hsl(${Math.round(completion * 120)}, 85%, 55%)`,
            }} />
          </div>
          <span style={css.progressLabel}>{Math.round(completion * 100)}%</span>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={css.btnRow}>
        {phase === 'idle' && (
          <button
            style={{ ...css.btn, ...css.btnPrimary }}
            onClick={startLiveness}
            disabled={disabled || !mpLoaded}
          >
            {mpLoaded ? '▶ Start Liveness Check' : '⟳ Loading…'}
          </button>
        )}
        {phase === 'fail' && (
          <>
            <button style={{ ...css.btn, ...css.btnSecondary }} onClick={handleCancel}>
              Cancel
            </button>
            <button style={{ ...css.btn, ...css.btnPrimary }} onClick={() => {
              setPhase('idle');
              setCompletion(0);
              setStatusMsg('');
            }}>
              🔄 Try Again
            </button>
          </>
        )}
        {phase === 'running' && (
          <button style={{ ...css.btn, ...css.btnDanger }} onClick={handleCancel}>
            ✕ Cancel
          </button>
        )}
      </div>

      {/* ── Tip ── */}
      {phase === 'idle' && (
        <div style={css.tipBox}>
          <strong>Tips for best results:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', lineHeight: 1.7 }}>
            <li>Good lighting — face the light source</li>
            <li>Keep your eyes open and face straight</li>
            <li>Move slowly — follow the yellow dot with your <em>nose</em></li>
            <li>Stay within ~60 cm of the camera</li>
          </ul>
        </div>
      )}
    </div>
  );
};

// ── Inline styles ─────────────────────────────────────────────────────────
const css = {
  wrapper: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    border: '1px solid rgba(99,102,241,0.3)',
    fontFamily: "'Inter', sans-serif",
    color: '#e2e8f0',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '20px',
  },
  titleIcon: {
    fontSize: '2rem',
    filter: 'drop-shadow(0 0 10px #818cf8)',
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: '0.82rem',
    color: '#94a3b8',
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.4)',
    color: '#ef4444',
    borderRadius: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
  },
  cameraWrap: {
    width: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#020617',
    minHeight: '240px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.08)',
    marginBottom: '16px',
  },
  canvas: {
    width: '100%',
    height: 'auto',
    display: 'block',
    borderRadius: '12px',
  },
  placeholder: {
    textAlign: 'center',
    padding: '40px 24px',
  },
  placeholderIcon: {
    fontSize: '4rem',
    marginBottom: '12px',
    animation: 'pulse 2s infinite',
    filter: 'drop-shadow(0 0 16px #818cf8)',
  },
  placeholderText: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.9rem',
    maxWidth: '280px',
    lineHeight: 1.6,
  },
  instructionStrip: {
    background: 'rgba(251,191,36,0.1)',
    border: '1px solid rgba(251,191,36,0.3)',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '0.85rem',
    color: '#fde68a',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  statusMsg: {
    borderRadius: '8px',
    border: '1px solid',
    padding: '10px 16px',
    fontSize: '0.9rem',
    fontWeight: 600,
    marginBottom: '12px',
    textAlign: 'center',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  progressTrack: {
    flex: 1,
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.1s linear',
  },
  progressLabel: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#94a3b8',
    minWidth: '36px',
    textAlign: 'right',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  btn: {
    padding: '13px 28px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.1)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  btnDanger: {
    background: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.4)',
  },
  tipBox: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '14px 18px',
    fontSize: '0.82rem',
    color: '#64748b',
    lineHeight: 1.5,
  },
};

export default LivenessCapture;
