const { v4: uuidv4 } = require('uuid');

const generateToken = (cardNumber) => {
  return `tok_${uuidv4().substring(0, 8)}`;
};

module.exports = { generateToken };
