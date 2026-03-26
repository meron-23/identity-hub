import React from 'react';

const TransactionHistory = ({ transactions }) => {
  return (
    <div className="transaction-history">
      {transactions?.map(t => (
        <div key={t.id}>{t.amount} - {t.status}</div>
      ))}
    </div>
  );
};

export default TransactionHistory;
