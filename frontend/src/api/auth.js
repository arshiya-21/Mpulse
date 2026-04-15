import api from './index.js';

export const login  = (email, password)        => api.post('/auth/login', { email, password });
export const logout = ()                        => api.post('/auth/logout');
export const verify = ()                        => api.get('/auth/verify');
export const resetFirstTimePassword = (resetToken, newPassword) =>
  api.post('/auth/reset-first-time-password', { resetToken, newPassword });
export const changePassword = (userId, currentPassword, newPassword) =>
  api.post('/auth/change-password', { userId, currentPassword, newPassword });
