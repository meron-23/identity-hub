import React from 'react';

const CardList = ({ cards }) => {
  return (
    <div className="card-list">
      {cards?.map(card => (
        <div key={card.id}>{card.name} - {card.status}</div>
      ))}
    </div>
  );
};

export default CardList;
