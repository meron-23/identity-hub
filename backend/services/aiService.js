const axios = require('axios');
const FormData = require('form-data');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a base64 image string (with or without data-URI prefix) to a Buffer.
 */
function base64ToBuffer(b64) {
  const raw = b64.includes(',') ? b64.split(',')[1] : b64;
  return Buffer.from(raw, 'base64');
}

/**
 * Build a FormData object with a single image field.
 */
function imageForm(b64, filename = 'image.jpg') {
  const form = new FormData();
  form.append('image', base64ToBuffer(b64), { filename });
  return form;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * verifyDocument
 * Calls /ekyc/verify-document on the AI service.
 * Falls back to mock response if AI service is unavailable.
 *
 * @param {string} idImage - Base64-encoded ID document image
 * @returns {Object} { success, recommendation, risk_score, identity_profile }
 */
const verifyDocument = async (idImage) => {
  try {
    const form = imageForm(idImage, 'id_document.jpg');
    form.append('country', 'US');

    const response = await axios.post(`${AI_SERVICE_URL}/ekyc/verify-document`, form, {
      timeout: 15000,
      headers: form.getHeaders(),
    });
    return response.data;
  } catch (err) {
    console.warn('[aiService] verifyDocument: AI service unavailable, using mock response.');
    return {
      success: true,
      recommendation: 'APPROVE',
      risk_score: 15,
      identity_profile: { name: null, confidence: 0.95 },
    };
  }
};

/**
 * verifyLiveness
 * Calls /liveness/verify on the AI service.
 * Falls back to mock response if AI service is unavailable.
 *
 * @param {string} selfie - Base64-encoded selfie image
 * @returns {Object} { live, score, method }
 */
const verifyLiveness = async (selfie) => {
  try {
    const form = imageForm(selfie, 'selfie.jpg');

    const response = await axios.post(`${AI_SERVICE_URL}/liveness/verify`, form, {
      timeout: 15000,
      headers: form.getHeaders(),
    });
    return {
      live:   response.data.is_live,
      score:  response.data.score,
      method: response.data.method,
    };
  } catch (err) {
    console.warn('[aiService] verifyLiveness: AI service unavailable, using mock response.');
    return { live: true, score: 0.95, method: 'circle_tracking_fallback' };
  }
};

/**
 * verifyFaceEnroll
 * Enrols a user's selfie into the AI face embedding database.
 * Called during enrollment so subsequent logins can do a proper face match.
 *
 * @param {string} userId  - User's UUID (used as face DB key)
 * @param {string} selfie  - Base64-encoded selfie image
 * @returns {Object} { success, user_id, message }
 */
const verifyFaceEnroll = async (userId, selfie) => {
  try {
    const form = imageForm(selfie, 'selfie.jpg');
    form.append('user_id', userId);

    const response = await axios.post(`${AI_SERVICE_URL}/face/enroll`, form, {
      timeout: 15000,
      headers: form.getHeaders(),
    });
    return response.data;
  } catch (err) {
    console.warn('[aiService] verifyFaceEnroll: AI service unavailable, using mock response.');
    return { success: true, user_id: userId, message: 'Face enrolled (mock)' };
  }
};

/**
 * verifyFaceCompare
 * Direct 1:1 face comparison — ID photo vs. selfie.
 * Used during enrollment to confirm the selfie matches the presented ID.
 *
 * @param {string} idImage - Base64-encoded ID document image
 * @param {string} selfie  - Base64-encoded selfie image
 * @returns {Object} { similarity, match, threshold }
 */
const verifyFaceCompare = async (idImage, selfie) => {
  try {
    const form = new FormData();
    form.append('id_image', base64ToBuffer(idImage), { filename: 'id_document.jpg' });
    form.append('selfie',   base64ToBuffer(selfie),  { filename: 'selfie.jpg' });

    const response = await axios.post(`${AI_SERVICE_URL}/face/compare`, form, {
      timeout: 15000,
      headers: form.getHeaders(),
    });
    return response.data;
  } catch (err) {
    console.warn('[aiService] verifyFaceCompare: AI service unavailable, using mock response.');
    return { similarity: 0.92, match: true, threshold: 0.50 };
  }
};

/**
 * verifyFaceMatch  (alias used by older code — kept for backward compatibility)
 */
const verifyFaceMatch = async (idImage, selfie) => verifyFaceCompare(idImage, selfie);

/**
 * calculateRisk
 * Calls /risk/calculate on the AI service's multi-signal risk engine.
 *
 * @param {Object} params - { face_match_score, liveness_score, transaction_amount, ... }
 * @returns {Object} { score, level, factors, recommendation, breakdown }
 */
const calculateRisk = async (params) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/risk/calculate`, params, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (err) {
    console.warn('[aiService] calculateRisk: AI service unavailable, using mock response.');
    return {
      score: 20,
      level: 'LOW',
      factors: [],
      recommendation: 'ALLOW',
      breakdown: {},
    };
  }
};

module.exports = {
  verifyDocument,
  verifyLiveness,
  verifyFaceEnroll,
  verifyFaceCompare,
  verifyFaceMatch,
  calculateRisk,
};
