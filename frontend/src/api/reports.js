import api from './index.js';

function triggerDownload(blob, filename) {
  const url  = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href  = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const exportCSV = async (params) => {
  const res = await api.get('/reports/export', { params, responseType: 'blob' });
  triggerDownload(res.data, `mpulse_raw_${new Date().toISOString().slice(0,10)}.csv`);
};

export const exportXLSX = async (params) => {
  const res = await api.get('/reports/export/xlsx', { params, responseType: 'blob' });
  triggerDownload(res.data, `mpulse_report_${new Date().toISOString().slice(0,10)}.xlsx`);
};

export const exportSummary = async (type, params) => {
  const res = await api.get('/reports/summary', { params: { ...params, type }, responseType: 'blob' });
  triggerDownload(res.data, `mpulse_${type}_summary_${new Date().toISOString().slice(0,10)}.csv`);
};