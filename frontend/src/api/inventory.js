import api from './index.js';

export const getItems       = ()         => api.get('/inventory/items');
export const createItem     = (data)     => api.post('/inventory/items', data);
export const updateItem     = (id, data) => api.put(`/inventory/items/${id}`, data);
export const removeItem     = (id)       => api.delete(`/inventory/items/${id}`);

export const getSuppliers   = ()         => api.get('/inventory/suppliers');
export const createSupplier = (data)     => api.post('/inventory/suppliers', data);
export const updateSupplier = (id, data) => api.put(`/inventory/suppliers/${id}`, data);
export const removeSupplier = (id)       => api.delete(`/inventory/suppliers/${id}`);

export const getInward      = ()         => api.get('/inventory/inward');
export const createInward   = (data)     => api.post('/inventory/inward', data);
export const updateInward   = (id, data) => api.put(`/inventory/inward/${id}`, data);
export const removeInward   = (id)       => api.delete(`/inventory/inward/${id}`);

export const getOutward     = ()         => api.get('/inventory/outward');
export const createOutward  = (data)     => api.post('/inventory/outward', data);
export const updateOutward  = (id, data) => api.put(`/inventory/outward/${id}`, data);
export const removeOutward  = (id)       => api.delete(`/inventory/outward/${id}`);