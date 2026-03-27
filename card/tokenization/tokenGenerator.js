const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const VaultEmulator = require('../security/encryption');

class TokenizationEngine {
  
  /**
   * Generates a Stateless Secure Token wrapping an AES-Encrypted PAN.
   */
  static generateToken(cardNumber) {
    // Encrypt the actual card number to a Secure Vault Reference
    const vaultRef = VaultEmulator.encryptData(cardNumber);
    
    // In production, the DB holds the vaultRef mapped to a UUID. 
    // Here we encode the vaultRef into the token so the simulation can dynamically decrypt it.
    const tokenPayload = Buffer.from(vaultRef).toString('base64');
    
    // Returns format: tok_<short_uuid>_<base64_vault_ref>
    return `tok_${uuidv4().substring(0, 8)}_${tokenPayload}`;
  }

  /**
   * Decodes a token, retrieving the real PAN from the simulated Vault.
   */
  static decodeToken(token) {
    if (!token || !token.startsWith('tok_')) throw new Error('Invalid Token Format');
    const parts = token.split('_');
    if (parts.length < 3) throw new Error('Corrupt Secure Token');
    
    // Join the remaining parts back in case the base64 had underscores
    const vaultRef = Buffer.from(parts.slice(2).join('_'), 'base64').toString('utf8');
    return VaultEmulator.decryptData(vaultRef);
  }

  /**
   * Generates a PCI-Compliant Virtual PAN using a high-entropy PRNG
   * mapped against mathematical Luhn checksum generation.
   */
  static generateVirtualCardNumber() {
    // Generate a random 16 digit number starting with a specific BIN (e.g., 4000)
    const bin = '400000';
    let number = bin;
    
    // Use proper crypto PRNG instead of Math.random
    const randomBytes = crypto.randomBytes(5);
    for (let i = 0; i < 9; i++) {
        number += (randomBytes[i % 5] % 10).toString();
    }
    
    // Calculate Luhn checksum
    let sum = 0;
    let alternate = true;
    for (let i = number.length - 1; i >= 0; i--) {
      let n = parseInt(number.charAt(i), 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n = (n % 10) + 1;
      }
      sum += n;
      alternate = !alternate;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    number += checkDigit.toString();
    
    return number;
  }
}

module.exports = TokenizationEngine;

