import api from './index.js';
export const getAll        = (params)       => api.get('/projects', { params });
export const getOne        = (id)           => api.get(`/projects/${id}`);
export const create        = (data)         => api.post('/projects', data);
export const update        = (id, d)        => api.put(`/projects/${id}`, d);
export const remove        = (id)           => api.delete(`/projects/${id}`);
export const setAssignees  = (id, ids)      => api.post(`/projects/${id}/assignees`, { employee_ids: ids });
export const getOverview   = (id)           => api.get(`/projects/${id}/overview`);