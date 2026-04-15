import api from './index.js';

export const getAll    = (params) => api.get('/tasks', { params });
export const getOne    = (id)     => api.get(`/tasks/${id}`);
export const create    = (data)   => api.post('/tasks', data);
export const update    = (id, data) => api.put(`/tasks/${id}`, data);
export const remove    = (id)     => api.delete(`/tasks/${id}`);
