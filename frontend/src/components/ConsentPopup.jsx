import React from 'react';

const ConsentPopup = ({ onAccept, onDecline }) => {
  return (
    <div className="consent-popup">
      <p>Do you consent to share your identity data with this recipient?</p>
      <button onClick={onAccept}>Accept</button>
      <button onClick={onDecline}>Decline</button>
    </div>
  );
};

export default ConsentPopup;
