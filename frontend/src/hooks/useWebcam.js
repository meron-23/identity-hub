import { useState, useCallback } from 'react';

const useWebcam = () => {
  const [stream, setStream] = useState(null);

  const startStream = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    setStream(s);
  }, []);

  return { stream, startStream };
};

export default useWebcam;
