const generateDID = (userData) => {
  // Mock DID generation logic
  return `did:identity-hub:${Math.random().toString(36).substring(7)}`;
};

module.exports = { generateDID };
