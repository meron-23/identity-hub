const encryptData = (data, key) => {
  // Mock encryption for card data
  return `enc_${Buffer.from(data).toString('hex')}`;
};

module.exports = { encryptData };
