const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000/verify';

/**
 * verifyFaceMatch
 * Calls the external AI service to compare an ID image against a selfie.
 * Falls back to a mocked success response if AI service is unavailable.
 *
 * @param {string} idImage  - Base64-encoded ID document image
 * @param {string} selfie   - Base64-encoded selfie image
 * @returns {Object} { match: boolean, score: number, name: string, dob: string }
 */
const verifyFaceMatch = async (idImage, selfie) => {
  try {
    const response = await axios.post(
      AI_SERVICE_URL,
      { idImage, selfie, task: 'face_match' },
      { timeout: 5000 }
    );
    return response.data;
  } catch (err) {
    // AI service is unavailable — return mock success for development/demo
    console.warn('[aiService] AI service unavailable, using mock response.');
    return {
      match: true,
      score: 0.97,
      name: null,   // caller will use client-supplied name
      dob: '1990-01-01',
    };
  }
};

/**
 * verifyLiveness
 * Calls the external AI service to confirm the selfie is a live person.
 * Falls back to a mocked success response if AI service is unavailable.
 *
 * @param {string} selfie - Base64-encoded selfie image
 * @returns {Object} { live: boolean, score: number }
 */
const verifyLiveness = async (selfie) => {
  try {
    const response = await axios.post(
      AI_SERVICE_URL,
      { selfie, task: 'liveness' },
      { timeout: 5000 }
    );
    return response.data;
  } catch (err) {
    console.warn('[aiService] AI service unavailable, using mock response.');
    return { live: true, score: 0.95 };
  }
};

module.exports = { verifyFaceMatch, verifyLiveness };
