import api from './index.js';

export const get    = ()       => api.get('/settings');
export const update = (data)   => api.put('/settings', data);
