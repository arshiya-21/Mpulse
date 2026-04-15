import api from './index.js';
export const uploadFile = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
