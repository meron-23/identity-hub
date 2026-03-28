import React, { useRef, useState, useCallback } from 'react';
import useWebcam from '../hooks/useWebcam';

const BiometricCapture = ({ onCapture, disabled = false, showSelfie = true }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [image, setImage] = useState(null);
  const { stream, startStream } = useWebcam();

  // Start video stream when component mounts
  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startWebcam = async () => {
    try {
      await startStream();
    } catch (err) {
      console.error('Error accessing webcam:', err);
      alert('Unable to access webcam. Please ensure you have granted camera permissions.');
    }
  };

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');
    setImage(imageData);
    setCapturing(false);
    
    if (onCapture) {
      onCapture(imageData);
    }
  }, [onCapture]);

  const retake = () => {
    setImage(null);
    setCapturing(false);
  };

  return (
    <div className="biometric-capture">
      {!image ? (
        <div className="capture-section">
          {!stream ? (
            <div className="webcam-prompt">
              <button 
                onClick={startWebcam}
                disabled={disabled}
                className="btn btn-primary"
              >
                Start Camera
              </button>
            </div>
          ) : (
            <div className="video-section">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="video-feed"
              />
              <div className="capture-controls">
                {!capturing ? (
                  <button
                    onClick={() => setCapturing(true)}
                    disabled={disabled}
                    className="btn btn-success"
                  >
                    Capture {showSelfie ? 'Selfie' : 'Document'}
                  </button>
                ) : (
                  <div className="capture-countdown">
                    <h3>Get ready...</h3>
                    <button
                      onClick={captureImage}
                      className="btn btn-danger"
                    >
                      Capture Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="preview-section">
          <img src={image} alt="Captured" className="captured-image" />
          <div className="preview-controls">
            <button onClick={retake} className="btn btn-secondary">
              Retake
            </button>
            {onCapture && (
              <button 
                onClick={() => onCapture(image)} 
                className="btn btn-primary"
              >
                Use This {showSelfie ? 'Selfie' : 'Document'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style jsx>{`
        .biometric-capture {
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
        }

        .video-feed {
          width: 100%;
          max-width: 400px;
          height: auto;
          border-radius: 8px;
          border: 2px solid #ddd;
        }

        .captured-image {
          width: 100%;
          max-width: 400px;
          height: auto;
          border-radius: 8px;
          border: 2px solid #28a745;
        }

        .capture-controls, .preview-controls {
          margin-top: 15px;
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .webcam-prompt {
          padding: 40px 20px;
          border: 2px dashed #ddd;
          border-radius: 8px;
        }

        .capture-countdown {
          padding: 20px;
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-success {
          background-color: #28a745;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background-color: #1e7e34;
        }

        .btn-danger {
          background-color: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background-color: #c82333;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #545b62;
        }
      `}</style>
    </div>
  );
};

export default BiometricCapture;
