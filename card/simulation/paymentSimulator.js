const processPayment = (cardToken, amount) => {
  // Mock payment processing via card network
  return { success: true, transactionId: `txn_${Math.random().toString(36).substring(7)}` };
};

module.exports = { processPayment };
