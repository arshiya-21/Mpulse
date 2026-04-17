import api from './index.js';

export const get            = ()     => api.get('/settings');
export const update         = (data) => api.put('/settings', data);
export const triggerDigest  = ()     => api.post('/settings/trigger-digest');
