#!/usr/bin/env python3
"""
Robust KYC System - Real Time-Based AI Verification
No instant passes, proper validation, anti-spoofing
"""

import cv2
import time
import numpy as np
import sys
import os
from collections import deque
from enum import Enum

sys.path.insert(0, os.path.dirname(__file__))

class KYCState(Enum):
    CAPTURE = "capture"
    RECOGNITION = "recognition"
    LIVENESS_CIRCLE = "liveness_circle"
    COMPLETE = "complete"
    FAILED = "failed"

class RobustKYC:
    def __init__(self):
        self.cap = None
        self.face_recognition = None
        self.liveness_module = None
        self.state = KYCState.CAPTURE
        
        self.face_positions = deque(maxlen=60)
        self.similarity_scores = deque(maxlen=10)
        self.captured_face = None
        self.face_bbox = None
        self.last_face_bbox = None
        self.face_lost_frames = 0
        self.stable_start_time = None
        
        self.liveness_score = 0.0
        self.risk_score = 0
        
    def load_modules(self):
        try:
            import face_recognition
            import liveness
            self.face_recognition = face_recognition
            self.liveness_module = liveness
            print("✓ Modules loaded successfully")
            return True
        except Exception as e:
            print(f"✗ Error loading modules: {e}")
            return False
            
    def open_camera(self):
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            print("❌ Cannot open webcam")
            return False
            
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        
        cv2.namedWindow('Robust KYC Verification', cv2.WINDOW_NORMAL)
        cv2.resizeWindow('Robust KYC Verification', 640, 480)
        cv2.moveWindow('Robust KYC Verification', 640, 300)
        
        print("✅ Camera opened successfully")
        return True
        
    def close_camera(self):
        if self.cap:
            self.cap.release()
            cv2.destroyAllWindows()
            print("✅ Camera closed")

    def get_nose_position(self, face_bbox):
        if face_bbox is None or len(face_bbox) != 4:
            return None
        x, y, w, h = face_bbox
        return (x + w // 2, y + h // 3)
        
    def detect_face(self, frame):
        """Standard face detection for capturing base identity (Pre-InsightFace step)"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.05, 3, minSize=(50, 50))
        if len(faces) == 0:
            faces = face_cascade.detectMultiScale(gray, 1.02, 2, minSize=(40, 40))
            
        if len(faces) > 0:
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            self.last_face_bbox = largest_face
            self.face_lost_frames = 0
            return largest_face
        else:
            self.face_lost_frames += 1
            return None

    def check_face_stability(self, face_bbox):
        if face_bbox is None or len(face_bbox) != 4:
            return False
        nose_pos = self.get_nose_position(face_bbox)
        if not nose_pos:
            return False
        self.face_positions.append(nose_pos)
        
        if len(self.face_positions) >= 60:
            positions = list(self.face_positions)[-60:]
            x_variance = np.var([p[0] for p in positions])
            y_variance = np.var([p[1] for p in positions])
            is_stable = (x_variance + y_variance) < 500
            
            if is_stable and self.stable_start_time is None:
                self.stable_start_time = time.time()
            elif not is_stable:
                self.stable_start_time = None
                
            if self.stable_start_time and time.time() - self.stable_start_time >= 2.0:
                return True
        return False
        
    def apply_visual_effects(self, frame, face_bbox, step_name=""):
        h, w = frame.shape[:2]
        result = frame.copy()
        if face_bbox is not None and len(face_bbox) == 4:
            x, y, w_face, h_face = face_bbox
            center_x = x + w_face // 2
            center_y = y + h_face // 2
            radius = max(w_face, h_face) // 2 + 30
            
            mask = np.zeros((h, w), dtype=np.float32)
            cv2.circle(mask, (center_x, center_y), radius, 1.0, -1)
            mask = cv2.GaussianBlur(mask, (51, 51), 0)
            mask_3d = cv2.merge([mask, mask, mask])
            
            bg = cv2.GaussianBlur(frame, (25, 25), 0)
            bg = cv2.addWeighted(bg, 0.45, np.zeros_like(bg), 0.55, 0)
            result = (frame * mask_3d + bg * (1.0 - mask_3d)).astype(np.uint8)
            cv2.circle(result, (center_x, center_y), radius, (255, 235, 215), 2, cv2.LINE_AA)
            
            for i in range(0, 360, 15):
                start_pt = (int(center_x + (radius + 15) * np.cos(np.radians(i))), 
                            int(center_y + (radius + 15) * np.sin(np.radians(i))))
                end_pt = (int(center_x + (radius + 15) * np.cos(np.radians(i+8))), 
                          int(center_y + (radius + 15) * np.sin(np.radians(i+8))))
                cv2.line(result, start_pt, end_pt, (230, 250, 255), 2, cv2.LINE_AA)
        else:
            result = cv2.addWeighted(result, 0.8, np.zeros_like(result), 0.2, 0)
        return result
        
    def draw_interface(self, frame, instruction, step_name, status_info=""):
        h, w = frame.shape[:2]
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 105), (10, 15, 25), -1)
        cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)
        cv2.line(frame, (0, 105), (w, 105), (255, 255, 255), 1, cv2.LINE_AA)
        
        step_colors = {
            KYCState.CAPTURE: (150, 240, 255),
            KYCState.RECOGNITION: (250, 210, 130),
            KYCState.COMPLETE: (170, 255, 170),
            KYCState.FAILED: (100, 110, 255)
        }
        accent = step_colors.get(self.state, (255, 255, 255))
        
        cv2.putText(frame, f"STAGE: {step_name.upper()}", (25, 40), cv2.FONT_HERSHEY_DUPLEX, 0.6, accent, 1, cv2.LINE_AA)
        cv2.putText(frame, instruction, (25, 80), cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 1, cv2.LINE_AA)
        
        if status_info:
            cv2.putText(frame, status_info, (w - 260, 80), cv2.FONT_HERSHEY_COMPLEX, 0.5, (210, 210, 210), 1, cv2.LINE_AA)
        return frame

    def run_capture_step(self):
        print("\n📸 Step 1: Face Capture")
        self.state = KYCState.CAPTURE
        start_time = time.time()
        while time.time() - start_time < 15.0:
            ret, frame = self.cap.read()
            if not ret: continue
            frame = cv2.flip(frame, 1)
            face_bbox = self.detect_face(frame)
            display_frame = self.apply_visual_effects(frame, face_bbox, "capture")
            
            if face_bbox is not None and self.check_face_stability(face_bbox):
                self.captured_face = frame.copy()
                return True
                
            status_info = f"Stability: {'Tracking...' if self.stable_start_time else 'Waiting...'}"
            display_frame = self.draw_interface(display_frame, "Stay still for 2 seconds", "capture", status_info)
            cv2.imshow('Robust KYC Verification', display_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'): return False
        return False

    def run_recognition_step(self):
        print("\n🔍 Step 2: Face Recognition")
        self.state = KYCState.RECOGNITION
        if not self.face_recognition.enroll("kyc_user", self.captured_face):
            return False
            
        start_time = time.time()
        while time.time() - start_time < 10.0:
            ret, frame = self.cap.read()
            if not ret: continue
            frame = cv2.flip(frame, 1)
            face_bbox = self.detect_face(frame)
            
            if face_bbox is not None:
                result = self.face_recognition.verify("kyc_user", frame)
                similarity = result.get('similarity', 0.0)
                self.similarity_scores.append(similarity)
                if len(self.similarity_scores) >= 5 and np.mean(list(self.similarity_scores)) >= 0.7:
                    return True
            
            display_frame = self.apply_visual_effects(frame, face_bbox, "recognition")
            status_info = f"Frames checked: {len(self.similarity_scores)}/10"
            display_frame = self.draw_interface(display_frame, "Verifying identity...", "recognition", status_info)
            cv2.imshow('Robust KYC Verification', display_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'): return False
        return False

    def get_frame(self):
        ret, frame = self.cap.read()
        return frame if ret else None

    def show_frame(self, frame):
        cv2.imshow('Robust KYC Verification', frame)
        cv2.waitKey(1)

    def run_liveness_steps(self):
        print("\n🎭 Step 3: Liveness Dynamic Tracking")
        self.state = KYCState.LIVENESS_CIRCLE
        result = self.liveness_module.interactive_liveness(camera_callback=self.get_frame, display_callback=self.show_frame)
        self.liveness_score = result.get("score", 0.0)
        return result.get("is_live", False)

    def calculate_final_score(self):
        base_score = 20
        if self.captured_face is not None: base_score += 20
        if len(self.similarity_scores) > 0 and np.mean(list(self.similarity_scores)) >= 0.7: base_score += 30
        base_score += int(self.liveness_score * 30)  # Convert 0-1 to 0-30 points
        return min(100, base_score)

    def run_robust_kyc(self):
        if not self.load_modules() or not self.open_camera():
            return False
        try:
            if not self.run_capture_step(): return False
            if not self.run_recognition_step(): return False
            if not self.run_liveness_steps(): return False
            
            self.state = KYCState.COMPLETE
            final_score = self.calculate_final_score()
            decision = "ALLOW" if final_score >= 80 else ("REVIEW" if final_score >= 50 else "DENY")
            color = (0, 255, 0) if decision == "ALLOW" else ((0, 165, 255) if decision == "REVIEW" else (0, 0, 255))
            
            ret, frame = self.cap.read()
            if ret:
                display_frame = self.apply_visual_effects(cv2.flip(frame, 1), self.detect_face(frame))
                h, w = display_frame.shape[:2]
                cv2.rectangle(display_frame, (0, 0), (w, h), (0, 0, 0), -1)
                cv2.putText(display_frame, "VERIFICATION COMPLETE", (50, h//2 - 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3)
                cv2.putText(display_frame, f"Score: {final_score}%", (50, h//2), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
                cv2.putText(display_frame, f"Decision: {decision}", (50, h//2 + 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
                cv2.imshow('Robust KYC Verification', display_frame)
                cv2.waitKey(3000)
            return final_score >= 50
        finally:
            self.close_camera()

def main():
    kyc = RobustKYC()
    return 0 if kyc.run_robust_kyc() else 1

if __name__ == "__main__":
    sys.exit(main())
