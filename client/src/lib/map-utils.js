import { t } from './i18n.js';

export function buildApiPath(template, params = {}) {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(value)),
    template
  );
}

export function buildCursorStyleText(campaign, { placementMode = false } = {}) {
  if (placementMode) {
    return `
      #map,
      .leaflet-container,
      .leaflet-interactive,
      .leaflet-marker-icon,
      .magic-marker-shell {
        cursor: crosshair !important;
      }
    `;
  }

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

export function applyDynamicCursors(campaign, options = {}, styleId = 'campaign-cursor-style') {
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.innerHTML = buildCursorStyleText(campaign, options);
}

export function formatLatLng(latlng) {
  return `X: ${latlng.lng.toFixed(2)}, Y: ${latlng.lat.toFixed(2)}`;
}

export function buildGoogleTileTemplate(basePath, extension = 'png') {
  return `${basePath}/{z}/{y}/{x}.${extension}`;
}

export function markerTooltipHtml(marker, forceVisible = false) {
  const showTitle = forceVisible || (marker.show_title !== false && marker.show_title !== 0);
  const showDescription = forceVisible || (marker.show_description !== false && marker.show_description !== 0);
  const titleHtml = showTitle && marker.title ? `<b>${escapeHtml(marker.title)}</b>` : '';
  const description = String(marker.description || '').trim();
  const descriptionHtml = showDescription && description ? `<span>${escapeHtml(description)}</span>` : '';
  return [titleHtml, descriptionHtml].filter(Boolean).join('<br>');
}

export function iconHtml(markerUrl, iconStyle) {
  if (markerUrl) {
    return `<img class="custom-magic-marker custom-magic-marker--image" src="${escapeAttribute(markerUrl)}" alt="" draggable="false" style="${escapeAttribute(markerSizeStyle(iconStyle))}" />`;
  }
  return `<div class="custom-magic-marker" style="${escapeAttribute(iconStyle)}"></div>`;
}

export function markerSizeStyle(iconStyle = '') {
  const { width, height } = markerArtSize(iconStyle);
  return `width:${width}px;height:${height}px;`;
}

export function markerArtSize(iconStyle = '') {
  const width = Number(String(iconStyle).match(/width:\s*(\d+)px/)?.[1] || 32);
  const height = Number(String(iconStyle).match(/height:\s*(\d+)px/)?.[1] || width);
  return { width, height };
}

export function markerInteractionSize(iconStyle = '', minimumSize = 40) {
  const { width, height } = markerArtSize(iconStyle);
  return {
    width: Math.max(minimumSize, width),
    height: Math.max(minimumSize, height)
  };
}

export function markerRenderMetrics(iconStyle = '', { currentZoom, nativeZoom, minimumHitSize = 40 } = {}) {
  const artSize = markerArtSize(iconStyle);
  const interactionSize = markerInteractionSize(iconStyle, minimumHitSize);
  const zoomDelta =
    Number.isFinite(currentZoom) && Number.isFinite(nativeZoom) ? Number(currentZoom) - Number(nativeZoom) : 0;
  return {
    artWidth: artSize.width,
    artHeight: artSize.height,
    interactionWidth: interactionSize.width,
    interactionHeight: interactionSize.height,
    scale: 2 ** zoomDelta
  };
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
