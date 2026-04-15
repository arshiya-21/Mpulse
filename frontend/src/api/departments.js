import api from './index.js';

export const getAll    = ()       => api.get('/departments');
export const getOne    = (id)     => api.get(`/departments/${id}`);
export const create    = (data)   => api.post('/departments', data);
export const update    = (id, data) => api.put(`/departments/${id}`, data);
export const remove    = (id)     => api.delete(`/departments/${id}`);
