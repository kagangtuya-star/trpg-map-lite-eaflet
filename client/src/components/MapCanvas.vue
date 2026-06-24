<script setup>
import { nextTick, onBeforeUnmount, reactive, watch } from 'vue';
import L from 'leaflet';

import { applyDynamicCursors, buildGoogleTileTemplate, formatLatLng, iconHtml, markerTooltipHtml } from '../lib/map-utils.js';

const TRANSPARENT_TILE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR42mNk+M9QzwAEjDAGACvBAf9iQkZAAAAAAElFTkSuQmCC';

const props = defineProps({
  campaign: { type: Object, required: true },
  markers: { type: Array, required: true },
  mode: { type: String, required: true },
  activeTool: { type: String, default: 'select' }
});

const emit = defineEmits(['map-click', 'marker-click', 'marker-drag-start', 'marker-drag-end']);

let map;
let markerLayer;
let coordControl;
let mapContainer;
let resizeObserver;
let lastMarkerDragAt = 0;

const cursorState = reactive({
  visible: false,
  x: 0,
  y: 0,
  url: '',
  kind: 'default'
});

function campaignBounds() {
  const bounds = props.campaign.tile_bounds;
  if (!bounds) return null;
  return [
    [bounds.south, bounds.west],
    [bounds.north, bounds.east]
  ];
}

function imageCenter() {
  const bounds = props.campaign.tile_bounds;
  if (!bounds) return null;
  return [(bounds.south + bounds.north) / 2, (bounds.west + bounds.east) / 2];
}

function nativeMaxZoom() {
  return props.campaign.tile_bounds?.max_zoom ?? props.campaign.max_zoom;
}

function overzoomMax() {
  return nativeMaxZoom() + 2;
}

function mapAspectRatio() {
  const bounds = props.campaign.tile_bounds;
  if (!bounds) return '16 / 9';
  const width = Math.max(1, bounds.east - bounds.west);
  const height = Math.max(1, bounds.north - bounds.south);
  return `${width} / ${height}`;
}

function minFillZoom() {
  const bounds = props.campaign.tile_bounds;
  if (!bounds || !map) return 0;
  const size = map.getSize();
  const width = Math.max(1, bounds.east - bounds.west);
  const height = Math.max(1, bounds.north - bounds.south);
  const requiredScale = Math.max(size.x / width, size.y / height);
  return Math.min(overzoomMax(), Math.max(0, Math.ceil(Math.log2(requiredScale))));
}

function applyZoomRange() {
  const minZoom = minFillZoom();
  map.setMinZoom(minZoom);
  map.setMaxZoom(overzoomMax());
  if (map.getZoom() < minZoom || map.getZoom() > overzoomMax()) {
    map.setZoom(minZoom, { animate: false });
  }
}

function resizeMapToContainer() {
  if (!map) return;
  map.invalidateSize({ animate: false });
  applyZoomRange();
}

function initMap() {
  if (map) return;
  const bounds = campaignBounds();
  const center = imageCenter();
  const nativeZoom = nativeMaxZoom();
  map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: 0,
    maxZoom: overzoomMax(),
    maxBounds: bounds,
    maxBoundsViscosity: 1,
    zoomControl: true
  });
  mapContainer = map.getContainer();
  mapContainer.addEventListener('pointermove', updateCustomCursor);
  mapContainer.addEventListener('pointerleave', hideCustomCursor);
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resizeMapToContainer);
    resizeObserver.observe(mapContainer);
  }

  L.tileLayer(buildGoogleTileTemplate(`/tiles/${props.campaign.id}`), {
    noWrap: true,
    maxNativeZoom: nativeZoom,
    maxZoom: overzoomMax(),
    errorTileUrl: TRANSPARENT_TILE,
    attribution: ''
  }).addTo(map);

  if (center) map.setView(center, nativeZoom);
  else map.setView([0, 0], 0);
  applyZoomRange();
  map.on('resize', applyZoomRange);

  markerLayer = L.layerGroup().addTo(map);
  coordControl = L.control({ position: 'bottomright' });
  coordControl.onAdd = () => {
    const div = L.DomUtil.create('div', 'live-coords-display');
    div.id = 'live-coords-display';
    div.innerText = 'X: 0.00, Y: 0.00';
    return div;
  };
  coordControl.addTo(map);

  map.on('mousemove', (event) => {
    const node = document.getElementById('live-coords-display');
    if (node) node.innerText = formatLatLng(event.latlng);
  });

  map.on('click', (event) => {
    if (props.mode !== 'edit' || props.activeTool !== 'marker') return;
    emit('map-click', {
      lat: event.latlng.lat,
      lng: event.latlng.lng,
      point: { x: event.containerPoint.x, y: event.containerPoint.y }
    });
  });
}

function isPointerTarget(target) {
  return Boolean(target?.closest?.('.leaflet-marker-icon, .leaflet-interactive, .magic-marker-shell'));
}

function hideCustomCursor() {
  cursorState.visible = false;
}

function updateCustomCursor(event) {
  if (props.mode === 'edit' && props.activeTool === 'marker') {
    hideCustomCursor();
    return;
  }
  const rect = mapContainer.getBoundingClientRect();
  const kind = isPointerTarget(event.target) ? 'pointer' : 'default';
  cursorState.visible = true;
  cursorState.x = event.clientX - rect.left;
  cursorState.y = event.clientY - rect.top;
  cursorState.kind = kind;
  cursorState.url = props.campaign.pointer_cursor_url;
}

function emitMarkerClick(item) {
  const point = map.latLngToContainerPoint([item.lat, item.lng]);
  emit('marker-click', {
    marker: item,
    lat: item.lat,
    lng: item.lng,
    point: { x: point.x, y: point.y }
  });
}

function emitMarkerDragEnd(item, latlng) {
  const point = map.latLngToContainerPoint(latlng);
  emit('marker-drag-end', {
    marker: item,
    lat: Number(latlng.lat.toFixed(4)),
    lng: Number(latlng.lng.toFixed(4)),
    point: { x: point.x, y: point.y }
  });
}

function updatePlacementCursor() {
  const container = document.getElementById('map');
  if (!container) return;
  if (props.mode === 'edit' && props.activeTool === 'marker') {
    container.style.setProperty('cursor', 'crosshair', 'important');
  }
}

function renderMarkers() {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  props.markers.forEach((item) => {
    const marker = L.marker([item.lat, item.lng], {
      draggable: props.mode === 'edit' && props.activeTool === 'select',
      icon: L.divIcon({
        className: 'magic-marker-shell',
        html: iconHtml(item.icon_url, item.icon_style),
        iconSize: [32, 32],
        iconAnchor: [12, 12]
      })
    }).addTo(markerLayer);
    marker.bindTooltip(markerTooltipHtml(item), {
      permanent: true,
      direction: 'right',
      className: 'magic-tooltip'
    });
    marker.on('click', (event) => {
      if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
      if (Date.now() - lastMarkerDragAt < 250) {
        return;
      }
      if (props.mode === 'edit') {
        emitMarkerClick(item);
        return;
      }
      if (item.chat_url) window.open(item.chat_url, '_blank');
    });
    marker.on('dragstart', () => {
      emit('marker-drag-start', { marker: item });
    });
    marker.on('dragend', () => {
      lastMarkerDragAt = Date.now();
      emitMarkerDragEnd(item, marker.getLatLng());
    });
  });
}

watch(
  () => [props.campaign, props.markers, props.mode],
  async () => {
    await nextTick();
    initMap();
    applyDynamicCursors(props.campaign);
    updatePlacementCursor();
    if (cursorState.visible) {
      cursorState.url = props.campaign.pointer_cursor_url;
    }
    renderMarkers();
  },
  { immediate: true, deep: true }
);

watch(
  () => props.activeTool,
  () => {
    applyDynamicCursors(props.campaign);
    updatePlacementCursor();
    hideCustomCursor();
    renderMarkers();
  }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = undefined;
  if (mapContainer) {
    mapContainer.removeEventListener('pointermove', updateCustomCursor);
    mapContainer.removeEventListener('pointerleave', hideCustomCursor);
  }
  if (map) {
    map.remove();
    map = undefined;
  }
});
</script>

<template>
  <div
    class="h-full w-full map-canvas"
    :class="{ 'is-placing-marker': mode === 'edit' && activeTool === 'marker' }"
    :style="{ '--map-aspect-ratio': mapAspectRatio() }"
  >
    <div id="map" class="h-full w-full"></div>
    <img
      v-if="cursorState.visible && cursorState.url"
      class="map-custom-cursor"
      :class="`map-custom-cursor--${cursorState.kind}`"
      :src="cursorState.url"
      :style="{ left: `${cursorState.x}px`, top: `${cursorState.y}px` }"
      alt=""
      aria-hidden="true"
    />
  </div>
</template>
