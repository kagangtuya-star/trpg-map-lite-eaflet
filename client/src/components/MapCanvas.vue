<script setup>
import { nextTick, onBeforeUnmount, reactive, watch } from 'vue';
import L from 'leaflet';

import {
  applyDynamicCursors,
  buildGoogleTileTemplate,
  formatLatLng,
  iconHtml,
  markerInteractionSize,
  markerTooltipHtml
} from '../lib/map-utils.js';

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
let mapDraggingPausedForMarker = false;
let markerRecords = new Map();
const tooltipOffset = L.point(28, 0);
const markerClickMoveTolerance = 4;

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

function refreshSize() {
  resizeMapToContainer();
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
    zoomControl: false
  });
  L.control.zoom({ position: 'topright' }).addTo(map);
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

function cursorUrlForKind(kind) {
  return kind === 'pointer' ? props.campaign.pointer_cursor_url : props.campaign.default_cursor_url;
}

function hideCustomCursor() {
  cursorState.visible = false;
}

function updateCustomCursor(event) {
  if (mapDraggingPausedForMarker) {
    hideCustomCursor();
    return;
  }
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
  cursorState.url = cursorUrlForKind(kind);
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

async function focusMarker(marker) {
  await nextTick();
  initMap();
  if (!map || !Number.isFinite(Number(marker.lat)) || !Number.isFinite(Number(marker.lng))) {
    return null;
  }
  map.panTo([marker.lat, marker.lng], { animate: false });
  const point = map.latLngToContainerPoint([marker.lat, marker.lng]);
  return { x: point.x, y: point.y };
}

function updatePlacementCursor() {
  const container = document.getElementById('map');
  if (!container) return;
  if (props.mode === 'edit' && props.activeTool === 'marker') {
    container.style.setProperty('cursor', 'crosshair', 'important');
  } else {
    container.style.removeProperty('cursor');
  }
}

function canDragMarkers() {
  return props.mode === 'edit' && props.activeTool === 'select';
}

function markerStateSignature() {
  return props.markers
    .map((item) =>
      [
        item.id,
        item.lat,
        item.lng,
        item.title,
        item.show_title ?? true,
        item.description || '',
        item.show_description ?? true,
        item.icon_url || '',
        item.icon_style || '',
        item.chat_url || ''
      ].join(':')
    )
    .join('|');
}

function markerVisualSignature(item) {
  return [
    item.title,
    item.show_title ?? true,
    item.description || '',
    item.show_description ?? true,
    item.icon_url || '',
    item.icon_style || '',
    item.chat_url || ''
  ].join(':');
}

function buildMarkerIcon(item) {
  const interactionSize = markerInteractionSize(item.icon_style);
  return L.divIcon({
    className: 'magic-marker-shell',
    html: `<span class="magic-marker-hit-area" aria-hidden="true"></span>${iconHtml(item.icon_url, item.icon_style)}`,
    iconSize: [interactionSize.width, interactionSize.height],
    iconAnchor: [interactionSize.width / 2, interactionSize.height / 2]
  });
}

function setMarkerDragging(marker, draggable) {
  if (!marker.dragging) return;
  if (draggable) marker.dragging.enable();
  else marker.dragging.disable();
}

function markerTooltipOptions(item) {
  return {
    permanent: hasPersistentTooltip(item),
    direction: 'right',
    offset: tooltipOffset,
    className: 'magic-tooltip'
  };
}

function hasPersistentTooltip(item) {
  return (
    (item.show_title !== false && item.show_title !== 0 && Boolean(item.title)) ||
    (item.show_description !== false && item.show_description !== 0 && Boolean(String(item.description || '').trim()))
  );
}

function showHoverTooltip(record) {
  record.marker.setTooltipContent(markerTooltipHtml(record.item, true));
}

function hideHoverTooltip(record) {
  record.marker.setTooltipContent(markerTooltipHtml(record.item, false));
}

function pauseMapDraggingForMarkerDrag() {
  hideCustomCursor();
  if (!map?.dragging?.enabled?.()) return;
  map.dragging.disable();
  mapDraggingPausedForMarker = true;
}

function restoreMapDraggingAfterMarkerDrag() {
  if (!mapDraggingPausedForMarker) return;
  map.dragging.enable();
  mapDraggingPausedForMarker = false;
}

function gesturePoint(event) {
  const originalEvent = event?.originalEvent;
  const touch = originalEvent?.changedTouches?.[0] || originalEvent?.touches?.[0];
  const clientX = touch?.clientX ?? originalEvent?.clientX;
  const clientY = touch?.clientY ?? originalEvent?.clientY;
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  return { x: clientX, y: clientY };
}

function trackMarkerPointerDown(record, event) {
  record.clickStartPoint = gesturePoint(event);
  record.draggedDuringGesture = false;
}

function shouldOpenMarkerFromClick(record, event) {
  if (record.dragging || record.draggedDuringGesture) return false;
  const start = record.clickStartPoint;
  record.clickStartPoint = null;
  if (!start) return true;
  const end = gesturePoint(event);
  if (!end) return true;
  return Math.hypot(end.x - start.x, end.y - start.y) <= markerClickMoveTolerance;
}

function createMarkerRecord(item) {
  const record = {
    marker: undefined,
    item,
    visualSignature: markerVisualSignature(item),
    draggable: canDragMarkers(),
    dragging: false,
    clickStartPoint: null,
    draggedDuringGesture: false
  };
  const marker = L.marker([item.lat, item.lng], {
    draggable: record.draggable,
    interactive: true,
    icon: buildMarkerIcon(item)
  }).addTo(markerLayer);
  record.marker = marker;
  marker.bindTooltip(markerTooltipHtml(item, false), markerTooltipOptions(item));
  marker.on('mouseover', () => showHoverTooltip(record));
  marker.on('mouseout', () => hideHoverTooltip(record));
  marker.on('mousedown', (event) => trackMarkerPointerDown(record, event));
  marker.on('touchstart', (event) => trackMarkerPointerDown(record, event));
  marker.on('click', (event) => {
    if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
    if (!shouldOpenMarkerFromClick(record, event)) {
      return;
    }
    if (props.mode === 'edit') {
      emitMarkerClick(record.item);
      return;
    }
    if (record.item.chat_url) window.open(record.item.chat_url, '_blank');
  });
  marker.on('dragstart', () => {
    record.dragging = true;
    record.draggedDuringGesture = true;
    pauseMapDraggingForMarkerDrag();
    emit('marker-drag-start', { marker: record.item });
  });
  marker.on('dragend', () => {
    record.dragging = false;
    restoreMapDraggingAfterMarkerDrag();
    emitMarkerDragEnd(record.item, marker.getLatLng());
  });
  return record;
}

function syncMarkerRecord(record, item) {
  record.item = item;
  const nextVisualSignature = markerVisualSignature(item);
  if (nextVisualSignature !== record.visualSignature) {
    record.marker.setIcon(buildMarkerIcon(item));
    record.marker.unbindTooltip();
    record.marker.bindTooltip(markerTooltipHtml(item, false), markerTooltipOptions(item));
    record.visualSignature = nextVisualSignature;
  }

  const nextDraggable = canDragMarkers();
  if (nextDraggable !== record.draggable) {
    setMarkerDragging(record.marker, nextDraggable);
    record.draggable = nextDraggable;
  }

  if (!record.dragging) {
    const latLng = record.marker.getLatLng();
    if (latLng.lat !== item.lat || latLng.lng !== item.lng) {
      record.marker.setLatLng([item.lat, item.lng]);
    }
  }
}

function syncMarkers() {
  if (!markerLayer) return;
  const nextIds = new Set(props.markers.map((item) => item.id));
  markerRecords.forEach((record, id) => {
    if (!nextIds.has(id)) {
      markerLayer.removeLayer(record.marker);
      markerRecords.delete(id);
    }
  });

  props.markers.forEach((item) => {
    const existing = markerRecords.get(item.id);
    if (existing) {
      syncMarkerRecord(existing, item);
      return;
    }
    markerRecords.set(item.id, createMarkerRecord(item));
  });
}

watch(
  () => [props.campaign, props.mode, props.activeTool, markerStateSignature()],
  async () => {
    await nextTick();
    initMap();
    applyDynamicCursors(props.campaign);
    updatePlacementCursor();
    if (cursorState.visible) {
      cursorState.url = cursorUrlForKind(cursorState.kind);
    }
    syncMarkers();
  },
  { immediate: true }
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

defineExpose({
  focusMarker,
  refreshSize
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
