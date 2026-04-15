import api from './index.js';
export const getAll  = (params) => api.get('/visits', { params });
export const getOne  = (id)     => api.get(`/visits/${id}`);
export const create  = (data)   => api.post('/visits', data);
export const update  = (id, d)  => api.put(`/visits/${id}`, d);
export const close   = (id, d)  => api.put(`/visits/${id}/close`, d);
export const remove  = (id)     => api.delete(`/visits/${id}`);
export const notify  = (id, cc) => api.post(`/visits/${id}/notify`, { cc });