import api from './index.js';

export const getAll      = ()         => api.get('/assets');
export const getOne      = (id)       => api.get(`/assets/${id}`);
export const create      = (data)     => api.post('/assets', data);
export const update      = (id, data) => api.put(`/assets/${id}`, data);
export const remove      = (id)       => api.delete(`/assets/${id}`);

export const getTypes    = ()         => api.get('/assets/types');
export const createType  = (data)     => api.post('/assets/types', data);
export const deleteType  = (name)     => api.delete(`/assets/types/${encodeURIComponent(name)}`);

export const transfer    = (id, data) => api.post(`/assets/${id}/transfer`, data);
export const getTransfers= (id)       => api.get(`/assets/${id}/transfers`);

export const logService  = (id, data) => api.post(`/assets/${id}/service-log`, data);
export const getServiceLogs=(id)      => api.get(`/assets/${id}/service-logs`);