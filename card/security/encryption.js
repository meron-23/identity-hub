/**
 * Enterprise-Grade Security Engine 
 * Simulates a PCI-DSS compliant vault by encrypting PANs (Primary Account Numbers)
 * using Advanced Encryption Standard (AES-256-GCM) with random Initialization Vectors (IV).
 */
const crypto = require('crypto');

// Simulated KMS (Key Management Service) Master Key (256-bit)
// In production, this would reside in AWS KMS or HashiCorp Vault.
const MASTER_KEY = crypto.scryptSync('IdentityHub-Secure-Master-Phrase', 'salt', 32);

class VaultEmulator {
  
  /**
   * Encrypts sensitive card data using AES-256-GCM.
   * @param {string} text - The plaintext data (e.g., PAN).
   * @returns {string} The base64 combined IV, AuthTag, and Ciphertext.
   */
  static encryptData(text) {
    if (!text) throw new Error('Cannot encrypt empty data');
    try {
      const iv = crypto.randomBytes(12); // Standard for GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
      
      let encrypted = cipher.update(String(text), 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();
      
      // We combine IV + AuthTag + CipherText into a single Vault Token Reference string format
      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    } catch (error) {
       console.error('[Vault] Encryption Failure', error);
       throw new Error('Encryption Engine Failure');
    }
  }

  /**
   * Decrypts vault text
   * @param {string} vaultRef - The composite reference string containing IV, AuthTag, and Ciphertext
   * @returns {string} The decrypted plaintext
   */
  static decryptData(vaultRef) {
    try {
      const parts = vaultRef.split(':');
      if (parts.length !== 3) throw new Error('Invalid vault reference format');
      
      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encryptedText = parts[2];
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
       console.error('[Vault] Decryption Failure - Possible Tampering Detected', error);
       throw new Error('Decryption Engine Failure');
    }
  }

  /**
   * Generates a structural irreversable hash (HMAC) to use as a queryable index token
   * Without decrypting the entire vault.
   */
  static generateBlindIndex(text) {
    const hmac = crypto.createHmac('sha256', MASTER_KEY);
    hmac.update(String(text));
    return hmac.digest('hex');
  }
}

module.exports = VaultEmulator;
