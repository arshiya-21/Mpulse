import api from './index.js';

export const getUnread  = ()       => api.get('/announcements/unread');
export const getAll     = ()       => api.get('/announcements');
export const create     = (data)   => api.post('/announcements', data);
export const markRead   = (id)     => api.post(`/announcements/${id}/read`);
export const remove     = (id)     => api.delete(`/announcements/${id}`);