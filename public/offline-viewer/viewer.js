function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function markerTooltipHtml(item, forceVisible = false) {
  const showTitle = forceVisible || (item.show_title !== false && item.show_title !== 0);
  const showDescription = forceVisible || (item.show_description !== false && item.show_description !== 0);
  const titleHtml = showTitle && item.title ? `<b>${escapeHtml(item.title)}</b>` : '';
  const description = String(item.description || '').trim();
  const descriptionHtml = showDescription && description ? `<span>${escapeHtml(description)}</span>` : '';
  return [titleHtml, descriptionHtml].filter(Boolean).join('<br>');
}

function escapeAttribute(value) {
  return String(value ?? '').replaceAll('"', '&quot;');
}

function markerArtSize(iconStyle = '') {
  const width = Number(String(iconStyle).match(/width:\s*(\d+)px/)?.[1] || 32);
  const height = Number(String(iconStyle).match(/height:\s*(\d+)px/)?.[1] || width);
  return { width, height };
}

function markerSizeStyle(iconStyle = '') {
  const { width, height } = markerArtSize(iconStyle);
  return `width:${width}px;height:${height}px;`;
}

function markerInteractionSize(iconStyle = '', minimumSize = 40) {
  const { width, height } = markerArtSize(iconStyle);
  return {
    width: Math.max(minimumSize, width),
    height: Math.max(minimumSize, height)
  };
}

function markerRenderMetrics(iconStyle = '', { currentZoom, nativeZoom, minimumHitSize = 40 } = {}) {
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

const TRANSPARENT_TILE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR42mNk+M9QzwAEjDAGACvBAf9iQkZAAAAAAElFTkSuQmCC';

(async function boot() {
  const response = await fetch('./config.json');
  const config = await response.json();
  const campaign = config.campaign;

  const style = document.createElement('style');
  style.innerHTML = `
    #map { cursor: url(${campaign.pointer_cursor_url}) 4 4, auto !important; }
    .leaflet-interactive { cursor: url(${campaign.pointer_cursor_url}) 12 12, pointer !important; }
  `;
  document.head.appendChild(style);

  const bounds = campaign.tile_bounds
    ? [
        [campaign.tile_bounds.south, campaign.tile_bounds.west],
        [campaign.tile_bounds.north, campaign.tile_bounds.east]
      ]
    : null;

  const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: 0,
    maxZoom: (campaign.tile_bounds?.max_zoom ?? campaign.max_zoom) + 2,
    maxBounds: bounds,
    maxBoundsViscosity: 1
  });

  const nativeMaxZoom = campaign.tile_bounds?.max_zoom ?? campaign.max_zoom;
  const overzoomMax = nativeMaxZoom + 2;
  const markerLayers = [];

  function minFillZoom() {
    if (!campaign.tile_bounds) return 0;
    const size = map.getSize();
    const width = Math.max(1, campaign.tile_bounds.east - campaign.tile_bounds.west);
    const height = Math.max(1, campaign.tile_bounds.north - campaign.tile_bounds.south);
    const requiredScale = Math.max(size.x / width, size.y / height);
    return Math.min(overzoomMax, Math.max(0, Math.ceil(Math.log2(requiredScale))));
  }

  function applyZoomRange() {
    const minZoom = minFillZoom();
    map.setMinZoom(minZoom);
    map.setMaxZoom(overzoomMax);
    if (map.getZoom() < minZoom || map.getZoom() > overzoomMax) {
      map.setZoom(minZoom, { animate: false });
    }
  }

  L.tileLayer('./tiles/{z}/{y}/{x}.png', {
    noWrap: true,
    maxNativeZoom,
    maxZoom: overzoomMax,
    errorTileUrl: TRANSPARENT_TILE,
    attribution: ''
  }).addTo(map);

  if (campaign.tile_bounds) {
    map.setView(
      [
        (campaign.tile_bounds.south + campaign.tile_bounds.north) / 2,
        (campaign.tile_bounds.west + campaign.tile_bounds.east) / 2
      ],
      nativeMaxZoom
    );
  }
  else map.setView([0, 0], 0);
  applyZoomRange();
  map.on('resize', applyZoomRange);
  map.on('zoom', syncMarkerScales);
  map.on('zoomend', syncMarkerScales);

  const coordControl = L.control({ position: 'bottomright' });
  coordControl.onAdd = function onAdd() {
    const div = L.DomUtil.create('div', 'live-coords-display');
    div.id = 'live-coords-display';
    div.innerText = 'X: 0.00, Y: 0.00';
    return div;
  };
  coordControl.addTo(map);

  map.on('mousemove', (event) => {
    document.getElementById('live-coords-display').innerText =
      `X: ${event.latlng.lng.toFixed(2)}, Y: ${event.latlng.lat.toFixed(2)}`;
  });

  config.markers.forEach((item) => {
    const showTitle = item.show_title !== false && item.show_title !== 0;
    const showDescription = item.show_description !== false && item.show_description !== 0;
    const hasPersistentTooltip = (showTitle && Boolean(item.title)) || (showDescription && Boolean(String(item.description || '').trim()));
    const { interactionWidth, interactionHeight } = markerRenderMetrics(item.icon_style, {
      currentZoom: map.getZoom(),
      nativeZoom: nativeMaxZoom
    });
    const marker = L.marker([item.lat, item.lng], {
      icon: L.divIcon({
        className: 'magic-marker-shell',
        html: item.icon_url
          ? `<img class="custom-magic-marker custom-magic-marker--image" src="${escapeAttribute(item.icon_url)}" alt="" draggable="false" style="${escapeAttribute(markerSizeStyle(item.icon_style))}" />`
          : `<div class="custom-magic-marker" style="${escapeAttribute(item.icon_style)}"></div>`,
        iconSize: [interactionWidth, interactionHeight],
        iconAnchor: [interactionWidth / 2, interactionHeight / 2]
      })
    }).addTo(map);
    markerLayers.push({ item, marker });
    marker.bindTooltip(markerTooltipHtml(item, false), {
      permanent: hasPersistentTooltip,
      direction: 'right',
      offset: L.point(28, 0),
      className: 'magic-tooltip'
    });
    marker.on('mouseover', () => {
      marker.setTooltipContent(markerTooltipHtml(item, true));
    });
    marker.on('mouseout', () => {
      marker.setTooltipContent(markerTooltipHtml(item, false));
    });
    marker.on('click', () => {
      if (item.chat_url) window.open(item.chat_url, '_blank');
    });
  });

  syncMarkerScales();

  function syncMarkerScales() {
    markerLayers.forEach(({ item, marker }) => {
      const element = marker.getElement();
      if (!element) return;
      const { scale } = markerRenderMetrics(item.icon_style, {
        currentZoom: map.getZoom(),
        nativeZoom: nativeMaxZoom
      });
      element.style.setProperty('--marker-scale', String(scale));
    });
  }
})();
