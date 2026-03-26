const crypto = require('crypto');

const encrypt = (text) => {
  // Mock encryption
  return Buffer.from(text).toString('base64');
};

const decrypt = (encrypted) => {
  // Mock decryption
  return Buffer.from(encrypted, 'base64').toString('ascii');
};

module.exports = { encrypt, decrypt };
