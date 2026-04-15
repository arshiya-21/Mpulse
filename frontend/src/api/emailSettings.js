import api from './index.js';

export const get    = ()       => api.get('/email-settings');
export const update = (data)   => api.put('/email-settings', data);
export const test   = (to)     => api.post('/email-settings/test', { to });
