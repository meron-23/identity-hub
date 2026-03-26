import api from './api';

const cardService = {
  linkCard: (cardData) => api.post('/card/link-card', cardData),
  disableCard: (id) => api.patch(`/card/${id}/disable`)
};

export default cardService;
