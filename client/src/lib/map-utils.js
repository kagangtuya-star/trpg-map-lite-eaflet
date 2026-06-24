import { t } from './i18n.js';

export function buildApiPath(template, params = {}) {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(value)),
    template
  );
}

export function buildCursorStyleText(campaign) {
  return `
    #map {
      cursor: none !important;
    }

    .leaflet-interactive {
      cursor: none !important;
    }

    .leaflet-marker-icon,
    .magic-marker-shell {
      cursor: none !important;
    }
  `;
}

export function applyDynamicCursors(campaign, styleId = 'campaign-cursor-style') {
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.innerHTML = buildCursorStyleText(campaign);
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    mapContainer.style.setProperty('cursor', 'none', 'important');
  }
}

export function formatLatLng(latlng) {
  return `X: ${latlng.lng.toFixed(2)}, Y: ${latlng.lat.toFixed(2)}`;
}

export function buildGoogleTileTemplate(basePath, extension = 'png') {
  return `${basePath}/{z}/{y}/{x}.${extension}`;
}

export function markerTooltipHtml(marker) {
  const title = escapeHtml(marker.title);
  const description = String(marker.description || '').trim();
  const descriptionHtml = description ? `<br><span>${escapeHtml(description)}</span>` : '';
  return `<b>${title}</b>${descriptionHtml}`;
}

export function iconHtml(markerUrl, iconStyle) {
  if (markerUrl) {
    return `<img class="custom-magic-marker custom-magic-marker--image" src="${escapeAttribute(markerUrl)}" alt="" draggable="false" />`;
  }
  return `<div class="custom-magic-marker" style="${escapeAttribute(iconStyle)}"></div>`;
}

export function buildCampaignFormData(input) {
  const formData = new FormData();
  formData.set('map', input.file);
  formData.set('name', input.name || t('campaign.untitled'));
  formData.set('default_cursor_url', input.default_cursor_url || '');
  formData.set('pointer_cursor_url', input.pointer_cursor_url || '');
  formData.set('max_zoom', String(input.max_zoom ?? 4));
  return formData;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value = '') {
  return String(value).replaceAll('"', '&quot;');
}
