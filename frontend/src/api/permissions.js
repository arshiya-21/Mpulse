import api from './index.js';

export const get          = ()            => api.get('/permissions');
export const getByRole    = (roleId)      => api.get(`/permissions/role/${roleId}`);
export const updateByRole = (roleId, permissions) =>
  api.put(`/permissions/role/${roleId}`, { permissions });

// Bulk update — called from AccessConfig with full permissions object
// Format: { roleName: { module: { view, create, edit, delete } } }
export const update = (cfg) => api.put('/permissions', cfg);
