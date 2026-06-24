function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function markerTooltipHtml(item) {
  const description = String(item.description || '').trim();
  const descriptionHtml = description ? `<br><span>${escapeHtml(description)}</span>` : '';
  return `<b>${escapeHtml(item.title)}</b>${descriptionHtml}`;
}

function escapeAttribute(value) {
  return String(value ?? '').replaceAll('"', '&quot;');
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
    const marker = L.marker([item.lat, item.lng], {
      icon: L.divIcon({
        className: 'magic-marker-shell',
        html: item.icon_url
          ? `<img class="custom-magic-marker custom-magic-marker--image" src="${escapeAttribute(item.icon_url)}" alt="" draggable="false" />`
          : `<div class="custom-magic-marker" style="${escapeAttribute(item.icon_style)}"></div>`,
        iconSize: [32, 32],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
    marker.bindTooltip(markerTooltipHtml(item), {
      permanent: true,
      direction: 'right',
      className: 'magic-tooltip'
    });
    marker.on('click', () => {
      if (item.chat_url) window.open(item.chat_url, '_blank');
    });
  });
})();
