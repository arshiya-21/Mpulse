import api from './index.js';

export const getAll  = ()         => api.get('/licenses');
export const getOne  = (id)       => api.get(`/licenses/${id}`);
export const create  = (data)     => api.post('/licenses', data);
export const update  = (id, data) => api.put(`/licenses/${id}`, data);
export const remove  = (id)       => api.delete(`/licenses/${id}`);
