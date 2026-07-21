import api from './index.js';

export const getSettings    = ()           => api.get('/motivational-quotes/settings');
export const getLog         = ()           => api.get('/motivational-quotes/log');
export const updateSettings = (data)       => api.put('/motivational-quotes/settings', data);
export const importQuotes   = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/motivational-quotes/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const testSend = (email) => api.post('/motivational-quotes/test-send', { email });