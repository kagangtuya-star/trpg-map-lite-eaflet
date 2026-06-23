import { buildApiPath } from './map-utils.js';

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const apiClient = {
  getCampaign(token) {
    return request(buildApiPath('/api/campaigns/:token', { token }));
  },

  createCampaign(formData) {
    return request('/api/campaigns', { method: 'POST', body: formData });
  },

  uploadCursor(file) {
    const formData = new FormData();
    formData.set('cursor', file);
    return request('/api/uploads/cursors', { method: 'POST', body: formData });
  },

  updateConfig(editToken, payload) {
    return request(buildApiPath('/api/campaigns/:edit_token/config', { edit_token: editToken }), {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  saveMarker(editToken, payload) {
    return request(buildApiPath('/api/campaigns/:edit_token/markers', { edit_token: editToken }), {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  deleteMarker(editToken, markerId) {
    return request(buildApiPath('/api/campaigns/:edit_token/markers/:id', { edit_token: editToken, id: markerId }), {
      method: 'DELETE'
    });
  },

  exportUrl(editToken) {
    return buildApiPath('/api/campaigns/:edit_token/export', { edit_token: editToken });
  }
};
