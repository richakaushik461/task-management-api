import api from './api';

export const authService = {
  register: (name, email, password) => {
    return api.post('/auth/register', { name, email, password });
  },

  login: (email, password) => {
    return api.post('/auth/login', { email, password });
  },

  logout: () => {
    return api.post('/auth/logout');
  },

  getProfile: () => {
    return api.get('/auth/me');
  },

  refreshToken: (refreshToken) => {
    return api.post('/auth/refresh-token', { refreshToken });
  }
};