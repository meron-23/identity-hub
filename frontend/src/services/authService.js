import api from './api';

const authService = {
  login: (credentials) => api.post('/auth', credentials),
  enroll: (userData) => api.post('/enroll', userData)
};

export default authService;
