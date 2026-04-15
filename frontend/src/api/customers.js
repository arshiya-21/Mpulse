import api from './index.js';

export const getAll  = ()         => api.get('/customers');
export const getOne  = (id)       => api.get(`/customers/${id}`);
export const create  = (data)     => api.post('/customers', data);
export const update  = (id, data) => api.put(`/customers/${id}`, data);
export const remove  = (id)       => api.delete(`/customers/${id}`);
