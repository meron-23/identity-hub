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
        cv2.resizeWindow('Robust KYC Verification', 500, 850)
        cv2.moveWindow('Robust KYC Verification', 640, 100)
        
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
        
    def render_beautiful_ui(self, frame, state_msg="", verified=False, liveness_data=None):
        # Create light gray canvas matching the prompt image
        canvas = np.full((850, 500, 3), 245, dtype=np.uint8)
        
        # Draw top header text
        cv2.putText(canvas, "FACE ID VERIFICATION", (30, 50), cv2.FONT_HERSHEY_DUPLEX, 0.6, (140, 140, 140), 1, cv2.LINE_AA)
        
        h, w = frame.shape[:2]
        video_w, video_h = 440, 480
        
        # Center crop the webcam frame to 440x480
        start_x = max(0, (w - video_w) // 2)
        end_x = start_x + video_w
        cropped = frame[:, start_x:end_x].copy()
        
        if cropped.shape[1] != video_w or cropped.shape[0] != video_h:
            cropped = cv2.resize(cropped, (video_w, video_h))
            
        # Draw static dashed oval in the center of the video frame
        oval_center = (video_w // 2, video_h // 2 - 20)
        axes = (100, 130)
        
        if liveness_data and liveness_data.get("is_active"):
            total_segments = liveness_data["total_segments"]
            followed_segments = liveness_data["followed_segments"]
            seg_size = liveness_data["segment_size"]
            theta = liveness_data["theta"]
            completion = liveness_data["completion"]
            
            current_seg_idx = int((theta % (2 * np.pi)) / seg_size)
            
            for i in range(total_segments):
                seg_angle_center = i * seg_size
                if i == current_seg_idx:
                    seg_color = (0, 255, 255) # Yellow
                    thickness = 8
                elif i in followed_segments:
                    prog = i / total_segments
                    seg_color = (0, int(255 * prog), int(255 * (1.0 - prog))) # Red to Green blend
                    thickness = 6
                else:
                    seg_color = (255, 255, 255) # White base
                    thickness = 4
                    
                start_angle = np.degrees(seg_angle_center - seg_size * 0.35)
                end_angle = np.degrees(seg_angle_center + seg_size * 0.35)
                cv2.ellipse(cropped, oval_center, axes, 0, start_angle, end_angle, seg_color, thickness, cv2.LINE_AA)
        else:
            dash_len = 15
            circum = 2 * np.pi * np.sqrt((axes[0]**2 + axes[1]**2)/2)
            dashes = int(circum / dash_len)
            angle_step = 360 / dashes
            
            for i in range(dashes):
                if i % 2 == 0:
                    cv2.ellipse(cropped, oval_center, axes, 0, i * angle_step, (i+1) * angle_step, (100, 230, 100), 3, cv2.LINE_AA)
                    
        if verified:
            # Draw semi-transparent dark overlay at the bottom matching prompt
            overlay = cropped.copy()
            cv2.rectangle(overlay, (0, video_h - 70), (video_w, video_h), (20, 35, 20), -1)
            cropped = cv2.addWeighted(overlay, 0.85, cropped, 0.15, 0)
            
            # Draw checkmark and VERIFIED text
            idx_x = video_w // 2 - 60
            cv2.circle(cropped, (idx_x, video_h - 35), 14, (70, 210, 70), -1)
            cv2.line(cropped, (idx_x-6, video_h - 35), (idx_x-2, video_h-31), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(cropped, (idx_x-2, video_h-31), (idx_x+6, video_h-40), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(cropped, "VERIFIED", (idx_x + 25, video_h - 28), cv2.FONT_HERSHEY_DUPLEX, 0.7, (70, 210, 70), 1, cv2.LINE_AA)
            
        # Create rounded corners mask for the video frame
        radius = 20
        mask = np.zeros((video_h, video_w), dtype=np.uint8)
        cv2.rectangle(mask, (radius, 0), (video_w - radius, video_h), 255, -1)
        cv2.rectangle(mask, (0, radius), (video_w, video_h - radius), 255, -1)
        cv2.circle(mask, (radius, radius), radius, 255, -1)
        cv2.circle(mask, (video_w - radius, radius), radius, 255, -1)
        cv2.circle(mask, (radius, video_h - radius), radius, 255, -1)
        cv2.circle(mask, (video_w - radius, video_h - radius), radius, 255, -1)
        
        # Blend the rounded video frame onto the canvas
        x_off, y_off = 30, 70
        roi = canvas[y_off:y_off+video_h, x_off:x_off+video_w]
        mask_3 = cv2.merge([mask, mask, mask]) / 255.0
        roi_res = (cropped * mask_3 + roi * (1.0 - mask_3)).astype(np.uint8)
        canvas[y_off:y_off+video_h, x_off:x_off+video_w] = roi_res
        
        # Draw text instructions below video frame
        def draw_centered(text, y, font, scale, color, thick):
            sz = cv2.getTextSize(text, font, scale, thick)[0]
            cx = (500 - sz[0]) // 2
            cv2.putText(canvas, text, (cx, y), font, scale, color, thick, cv2.LINE_AA)
            
        if liveness_data and liveness_data.get("is_active"):
            comp = liveness_data["completion"]
            prog_text = f"Tracking: {int(comp * 100)}%"
            draw_centered("Follow the colored segment", 610, cv2.FONT_HERSHEY_DUPLEX, 0.65, (40, 40, 40), 1)
            draw_centered("with your nose on the loop", 645, cv2.FONT_HERSHEY_DUPLEX, 0.65, (40, 40, 40), 1)
            
            # small progress bar
            bar_w = 300
            bar_fill = int(bar_w * comp)
            bar_x = (500 - bar_w) // 2
            bar_y = 680
            current_color = (0, int(255 * comp), int(255 * (1.0 - comp)))
            cv2.rectangle(canvas, (bar_x, bar_y), (bar_x + bar_w, bar_y + 10), (200, 200, 200), -1)
            cv2.rectangle(canvas, (bar_x, bar_y), (bar_x + bar_fill, bar_y + 10), current_color, -1)
            
            draw_centered(prog_text, 720, cv2.FONT_HERSHEY_DUPLEX, 0.6, current_color, 1)
        else:
            draw_centered("Position your face within the frame", 610, cv2.FONT_HERSHEY_DUPLEX, 0.65, (40, 40, 40), 1)
            draw_centered("Remain still for a moment", 660, cv2.FONT_HERSHEY_DUPLEX, 0.6, (120, 120, 120), 1)
            draw_centered("Avoid excessive movement", 695, cv2.FONT_HERSHEY_DUPLEX, 0.6, (120, 120, 120), 1)
        
        if not state_msg:
            if self.state == KYCState.CAPTURE:
                state_msg = "Waiting for Face..." if not self.stable_start_time else "Positioning Face..."
            elif self.state == KYCState.RECOGNITION:
                state_msg = "Verifying Identity..."
            elif self.state == KYCState.LIVENESS_CIRCLE:
                state_msg = "Ensuring Liveness..."
            elif self.state == KYCState.COMPLETE:
                state_msg = "Verification Complete"
                
        draw_centered(state_msg, 760, cv2.FONT_HERSHEY_DUPLEX, 0.65, (40, 40, 40), 1)
        
        # Draw spinner at bottom if not verified
        if not verified:
            t = time.time()
            sc = (250, 810)
            n_lines = 8
            phase = int((t * 8) % n_lines)
            for i in range(n_lines):
                angle = i * (360 / n_lines)
                alpha = 1.0 if (i - phase) % n_lines <= 2 else 0.3
                color = (180, 180, 180) if alpha <= 0.3 else (80, 80, 80)
                r = np.radians(angle)
                p1 = (int(sc[0] + 8 * np.cos(r)), int(sc[1] + 8 * np.sin(r)))
                p2 = (int(sc[0] + 16 * np.cos(r)), int(sc[1] + 16 * np.sin(r)))
                cv2.line(canvas, p1, p2, color, 3, cv2.LINE_AA)
                
        return canvas

    # Removing distinct timeout loops. UI rendering and process flows seamlessly.
    def calculate_final_score(self):
        base_score = 20
        if self.captured_face is not None: base_score += 20
        if len(self.similarity_scores) > 0 and np.mean(list(self.similarity_scores)) >= 0.7: base_score += 30
        base_score += int(self.liveness_score * 30)
        return min(100, base_score)

    def run_robust_kyc(self):
        if not self.load_modules() or not self.open_camera():
            return False
            
        self.state = KYCState.CAPTURE
        self.captured_face = None
        self.similarity_scores.clear()
        
        # Interactive Liveness tracking vars
        total_segments = 36
        liveness_followed = set()
        speed = (2.0 * np.pi) / (30 * 2.5)  
        threshold_dist = 60.0
        liveness_theta = 0.0
        direction = 1  
        liveness_last_nose = None
        segment_size = (2 * np.pi) / total_segments
        
        print("\n🚀 Starting Seamless Verification Flow...")
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret: continue
                frame = cv2.flip(frame, 1)
                
                state_msg = ""
                verified = False
                liveness_data = None
                
                if self.state == KYCState.CAPTURE:
                    face_bbox = self.detect_face(frame)
                    if face_bbox is not None and self.check_face_stability(face_bbox):
                        print("📸 Face Captured! Transitioning to Recognition...")
                        self.captured_face = frame.copy()
                        if self.face_recognition.enroll("kyc_user", self.captured_face):
                            self.state = KYCState.RECOGNITION
                            self.face_lost_frames = 0
                            
                elif self.state == KYCState.RECOGNITION:
                    face_bbox = self.detect_face(frame)
                    if face_bbox is not None:
                        result = self.face_recognition.verify("kyc_user", frame)
                        sim = result.get('similarity', 0.0)
                        if sim > 0.0:
                            self.similarity_scores.append(sim)
                            
                    if len(self.similarity_scores) >= 5 and np.mean(list(self.similarity_scores)[-5:]) >= 0.7:
                        print("🔍 Identity Verified! Transitioning to Liveness...")
                        self.state = KYCState.LIVENESS_CIRCLE
                        # Pre-initialize analyzer
                        self.liveness_module._get_face_analyzer()
                        
                elif self.state == KYCState.LIVENESS_CIRCLE:
                    analyzer = self.liveness_module._get_face_analyzer()
                    faces = analyzer.get(frame) if analyzer != "opencv_fallback" else []
                    
                    nose_x, nose_y = None, None
                    if len(faces) > 0:
                        face = faces[0]
                        if hasattr(face, 'kps') and face.kps is not None:
                            nose_x, nose_y = int(face.kps[2][0]), int(face.kps[2][1])
                            
                    fh, fw = frame.shape[:2]
                    video_w, video_h = 440, 480
                    start_x = max(0, (fw - video_w) // 2)
                    
                    # map nose x to cropped video frame for display bounding
                    if nose_x is not None:
                        nose_x = nose_x - start_x
                        
                    # circle anchor on UI
                    center_x, center_y = video_w // 2, video_h // 2 - 20 
                    axes = (100, 130)
                    
                    target_x = int(center_x + axes[0] * np.cos(liveness_theta))
                    target_y = int(center_y + axes[1] * np.sin(liveness_theta))
                    completion = len(liveness_followed) / total_segments
                    
                    if nose_x is not None and nose_y is not None:
                        if liveness_last_nose is not None:
                            dist_jump = np.hypot(nose_x - liveness_last_nose[0], nose_y - liveness_last_nose[1])
                            if dist_jump > 120:
                                liveness_followed.clear()  # User cheated/teleported
                        liveness_last_nose = (nose_x, nose_y)
                        
                        dist = np.hypot(nose_x - target_x, nose_y - target_y)
                        if dist < threshold_dist:
                            seg_idx = int((liveness_theta % (2 * np.pi)) / segment_size)
                            liveness_followed.add(seg_idx)
                            
                    liveness_theta += speed * direction
                    
                    if completion >= 0.90:
                        print("🎭 Liveness Passed! Completing process...")
                        self.liveness_score = 1.0
                        self.state = KYCState.COMPLETE
                    elif liveness_theta >= 4 * np.pi and len(liveness_followed) == 0:
                        print("❌ Failed Liveness: No interaction after 2 laps.")
                        self.liveness_score = 0.0
                        self.state = KYCState.FAILED
                        return False
                    elif liveness_theta >= 6 * np.pi:
                        print(f"❌ Failed Liveness: 3 laps completed with {int(completion*100)}% score.")
                        self.liveness_score = completion
                        self.state = KYCState.FAILED
                        return False
                        
                    liveness_data = {
                        "is_active": True,
                        "theta": liveness_theta,
                        "followed_segments": liveness_followed,
                        "total_segments": total_segments,
                        "completion": completion,
                        "segment_size": segment_size
                    }
                    state_msg = ""
                        
                elif self.state == KYCState.COMPLETE:
                    final_score = self.calculate_final_score()
                    decision = "ALLOW" if final_score >= 80 else ("REVIEW" if final_score >= 50 else "DENY")
                    state_msg = f"Decision: {decision} ({final_score}%)"
                    verified = (decision == "ALLOW")
                    
                    display_frame = self.render_beautiful_ui(frame, state_msg=state_msg, verified=verified, liveness_data=liveness_data)
                    cv2.imshow('Robust KYC Verification', display_frame)
                    cv2.waitKey(3000)
                    return final_score >= 50
                    
                display_frame = self.render_beautiful_ui(frame, state_msg=state_msg, verified=verified, liveness_data=liveness_data)
                cv2.imshow('Robust KYC Verification', display_frame)
                
                if cv2.waitKey(1) & 0xFF == ord('q'): return False
        except Exception as e:
            print(f"❌ Error during seamless KYC Flow: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            self.close_camera()

def main():
    kyc = RobustKYC()
    return 0 if kyc.run_robust_kyc() else 1

if __name__ == "__main__":
    sys.exit(main())
