import api from './index.js';

export const getLeads         = ()         => api.get('/marketing/leads');
export const createLead       = (data)     => api.post('/marketing/leads', data);
export const updateLead       = (id, data) => api.put(`/marketing/leads/${id}`, data);
export const removeLead       = (id)       => api.delete(`/marketing/leads/${id}`);
export const bulkChangeOwner  = (ids, owner) => api.put('/marketing/leads/bulk/owner', { ids, owner });

export const getProducts    = ()         => api.get('/marketing/products');
export const createProduct  = (name)     => api.post('/marketing/products', { name });
export const updateProduct  = (id, name) => api.put(`/marketing/products/${id}`, { name });
export const removeProduct  = (id)       => api.delete(`/marketing/products/${id}`);

export const getLeadSources   = ()         => api.get('/marketing/lead-sources');
export const createLeadSource = (name)     => api.post('/marketing/lead-sources', { name });
export const updateLeadSource = (id, name) => api.put(`/marketing/lead-sources/${id}`, { name });
export const removeLeadSource = (id)       => api.delete(`/marketing/lead-sources/${id}`);

export const getBusinessAreas   = ()         => api.get('/marketing/business-areas');
export const createBusinessArea = (name)     => api.post('/marketing/business-areas', { name });
export const updateBusinessArea = (id, name) => api.put(`/marketing/business-areas/${id}`, { name });
export const removeBusinessArea = (id)       => api.delete(`/marketing/business-areas/${id}`);

export const getFoundryTypes   = ()         => api.get('/marketing/foundry-types');
export const createFoundryType = (name)     => api.post('/marketing/foundry-types', { name });
export const updateFoundryType = (id, name) => api.put(`/marketing/foundry-types/${id}`, { name });
export const removeFoundryType = (id)       => api.delete(`/marketing/foundry-types/${id}`);

export const getSandTypes   = ()         => api.get('/marketing/sand-types');
export const createSandType = (name)     => api.post('/marketing/sand-types', { name });
export const updateSandType = (id, name) => api.put(`/marketing/sand-types/${id}`, { name });
export const removeSandType = (id)       => api.delete(`/marketing/sand-types/${id}`);

export const getDemoTypes   = ()         => api.get('/marketing/demo-types');
export const createDemoType = (name)     => api.post('/marketing/demo-types', { name });
export const updateDemoType = (id, name) => api.put(`/marketing/demo-types/${id}`, { name });
export const removeDemoType = (id)       => api.delete(`/marketing/demo-types/${id}`);

export const getProductPhases   = (productId)     => api.get('/marketing/product-phases', { params: { product_id: productId } });
export const createProductPhase = (data)          => api.post('/marketing/product-phases', data);
export const updateProductPhase = (id, data)      => api.put(`/marketing/product-phases/${id}`, data);
export const removeProductPhase = (id)            => api.delete(`/marketing/product-phases/${id}`);

export const getOrders   = ()         => api.get('/marketing/orders');
export const createOrder = (data)     => api.post('/marketing/orders', data);
export const updateOrder = (id, data) => api.put(`/marketing/orders/${id}`, data);
export const removeOrder = (id)       => api.delete(`/marketing/orders/${id}`);

export const getImplementationProgress    = (orderId)   => api.get('/marketing/implementation-progress', { params: { order_id: orderId } });
export const saveImplementationProgress   = (data)      => api.put('/marketing/implementation-progress', data);

export const getRenewals   = ()         => api.get('/marketing/renewals');
export const createRenewal = (data)     => api.post('/marketing/renewals', data);
export const updateRenewal = (id, data) => api.put(`/marketing/renewals/${id}`, data);
export const renewRenewal  = (id, data) => api.post(`/marketing/renewals/${id}/renew`, data);
export const removeRenewal = (id)       => api.delete(`/marketing/renewals/${id}`);

export const getDemos        = ()          => api.get('/marketing/demos');
export const createDemo      = (data)      => api.post('/marketing/demos', data);
export const updateDemo      = (id, data)  => api.put(`/marketing/demos/${id}`, data);
export const addDemoActivity = (id, data)  => api.post(`/marketing/demos/${id}/activities`, data);
export const removeDemo      = (id)        => api.delete(`/marketing/demos/${id}`);