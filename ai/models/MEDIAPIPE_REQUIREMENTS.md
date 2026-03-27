# MediaPipe Requirements for Liveness Detection

## 🚨 CRITICAL DEPENDENCY

MediaPipe is **REQUIRED** for liveness detection. The system will NOT work without it.

## 📦 Installation Requirements

### Python Version
- **Python 3.10 or 3.11** (MediaPipe does NOT support Python 3.12+ reliably)

### Required Packages
```bash
pip install mediapipe>=0.10.0
pip install opencv-python>=4.8.0
pip install numpy>=1.21.0
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

## ✅ What This Fixes

### Before (Broken System)
- ❌ Fallback to position-based detection
- ❌ Fake/dummy liveness checks
- ❌ Incorrect LEFT/RIGHT detection
- ❌ Silent failures
- ❌ Unreliable biometric verification

### After (Real AI System)
- ✅ **MediaPipe REQUIRED** - no fallbacks
- ✅ **Real head pose estimation** using yaw angles
- ✅ **Accurate LEFT/RIGHT detection** (-10°/+10° thresholds)
- ✅ **Time-based validation** (1-second hold requirement)
- ✅ **Fail-fast with clear errors** if dependencies missing
- ✅ **Real biometric verification pipeline**

## 🔧 System Behavior

### If MediaPipe is Available
- ✅ Uses real face landmarks
- ✅ Estimates head pose with solvePnP
- ✅ Detects actual head rotation (yaw, pitch, roll)
- ✅ Validates time-based head turns
- ✅ Production-grade liveness detection

### If MediaPipe is Missing
- ❌ **System crashes immediately** with clear error
- ❌ No silent fallbacks
- ❌ No fake behavior
- ❌ Clear installation instructions provided

## 🎯 Liveness Detection Flow

1. **Face Landmarks**: MediaPipe extracts 468 face landmarks
2. **3D Pose Estimation**: OpenCV solvePnP calculates head rotation
3. **Yaw Angle Detection**: Extract LEFT/RIGHT head rotation
4. **Time Validation**: User must hold position for 1 second
5. **Sequential Challenge**: LEFT → RIGHT in order
6. **Real AI Verification**: No dummy or fake logic

## 🚫 What Was Removed

- ❌ All fallback logic (position-based detection)
- ❌ Dummy/heuristic liveness methods
- ❌ Silent dependency failures
- ❌ Fake scoring systems
- ❌ nose.x based direction detection

## 🎉 Result

This is now a **real biometric verification system** that:
- Requires proper AI dependencies
- Uses actual head pose estimation
- Cannot be fooled by simple tricks
- Behaves like production fintech KYC systems
- Fails fast with clear error messages

**No more simulations - real AI-based liveness detection!** 🚀
