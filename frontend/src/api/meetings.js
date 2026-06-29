import api from './index.js';

export const create = (data) => api.post('/meetings', data);
export const get    = (projectId) => api.get(`/meetings/${projectId}`);
export const remove = (projectId) => api.delete(`/meetings/${projectId}`);
