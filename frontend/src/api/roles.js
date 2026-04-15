import api from './index.js';

export const getAll  = ()         => api.get('/roles');
export const getOne  = (id)       => api.get(`/roles/${id}`);
export const create  = (data)     => api.post('/roles', data);
export const update  = (id, data) => api.put(`/roles/${id}`, data);
export const remove  = (id)       => api.delete(`/roles/${id}`);
