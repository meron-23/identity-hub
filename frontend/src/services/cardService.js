import api from './api';

const cardService = {
  getCards: (did) => api.get(`/card/${did}`),
  linkCard: (cardData) => api.post('/card/link-card', cardData),
  disableCard: (id) => api.patch(`/card/${id}/disable`),
  generateVirtualCard: (data) => api.post('/virtual-card', data),
  processPayment: (data) => api.post('/transaction', data)
};

export default cardService;
