import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(fileURLToPath(new URL('../src/components/MapCanvas.vue', import.meta.url)), 'utf8');
const stylesSource = readFileSync(fileURLToPath(new URL('../src/styles/app.css', import.meta.url)), 'utf8');

describe('MapCanvas source contract', () => {
  it('keeps the Leaflet-owned map element class list static', () => {
    expect(source).toContain('<div id="map" class="h-full w-full"></div>');
    expect(source).not.toMatch(/<div[^>]+id="map"[^>]+:class=/);
  });

  it('moves native Leaflet zoom controls away from the custom left-side edit controls', () => {
    expect(source).toContain("zoomControl: false");
    expect(source).toContain("L.control.zoom({ position: 'topright' }).addTo(map)");
  });

  it('exposes the campaign aspect ratio on the map canvas wrapper', () => {
    expect(source).toContain('mapAspectRatio');
    expect(source).toContain('--map-aspect-ratio');
  });

  it('invalidates Leaflet size when the rendered map container changes', () => {
    expect(source).toContain('ResizeObserver');
    expect(source).toContain('map.invalidateSize');
  });

  it('emits marker drag updates for draggable markers in select mode', () => {
    expect(source).toContain("'marker-drag-end'");
    expect(source).toContain("'marker-drag-start'");
    expect(source).toContain("return props.mode === 'edit' && props.activeTool === 'select'");
    expect(source).toContain('draggable: record.draggable');
    expect(source).toContain("marker.on('dragstart'");
    expect(source).toContain("marker.on('dragend'");
    expect(source).toContain('emitMarkerDragEnd(item, marker.getLatLng())');
  });

  it('renders marker-specific icon URLs instead of campaign cursor URLs', () => {
    expect(source).toContain('iconHtml(item.icon_url, item.icon_style)');
    expect(source).not.toContain('iconHtml(props.campaign.default_cursor_url, item.icon_style)');
  });

  it('uses the campaign default cursor for map movement and pointer cursor only over interactive targets', () => {
    expect(source).toContain('function cursorUrlForKind(kind)');
    expect(source).toContain("kind === 'pointer' ? props.campaign.pointer_cursor_url : props.campaign.default_cursor_url");
    expect(source).toContain('cursorState.url = cursorUrlForKind(kind)');
    expect(source).toContain('cursorState.url = cursorUrlForKind(cursorState.kind)');
    expect(source).not.toContain('cursorState.url = props.campaign.pointer_cursor_url;');
  });

  it('keeps marker art from intercepting Leaflet drag gestures', () => {
    expect(source).toContain('magic-marker-hit-area');
    expect(stylesSource).toContain('.magic-marker-shell');
    expect(stylesSource).toContain('position: relative');
    expect(stylesSource).toContain('.magic-marker-hit-area');
    expect(stylesSource).toContain('.magic-marker-shell .custom-magic-marker');
    expect(stylesSource).toContain('pointer-events: none');
  });

  it('sizes marker hit targets from visible marker art while keeping a minimum touch target', () => {
    expect(source).toContain('markerInteractionSize(item.icon_style)');
    expect(source).toContain('iconSize: [interactionSize.width, interactionSize.height]');
    expect(source).toContain('iconAnchor: [interactionSize.width / 2, interactionSize.height / 2]');
  });

  it('opens markers from click gestures only and lets drag gestures stay drag gestures', () => {
    expect(source).toContain('const markerClickMoveTolerance = 4');
    expect(source).toContain('function trackMarkerPointerDown(record, event)');
    expect(source).toContain('function shouldOpenMarkerFromClick(record, event)');
    expect(source).toContain('draggedDuringGesture');
    expect(source).toContain("marker.on('mousedown'");
    expect(source).toContain("marker.on('touchstart'");
    expect(source).not.toContain('lastMarkerDragAt');
  });

  it('pauses map panning while marker drag owns the gesture', () => {
    expect(source).toContain('function pauseMapDraggingForMarkerDrag()');
    expect(source).toContain('function restoreMapDraggingAfterMarkerDrag()');
    expect(source).toContain('if (mapDraggingPausedForMarker)');
    expect(source).toContain('map.dragging.disable()');
    expect(source).toContain('map.dragging.enable()');
    expect(source).toContain('pauseMapDraggingForMarkerDrag();');
    expect(source).toContain('restoreMapDraggingAfterMarkerDrag();');
  });

  it('updates Leaflet markers by keyed records instead of rebuilding the layer', () => {
    expect(source).toContain('let markerRecords = new Map()');
    expect(source).toContain('function createMarkerRecord(item)');
    expect(source).toContain('function syncMarkerRecord(record, item)');
    expect(source).toContain('function syncMarkers()');
    expect(source).toContain('markerRecords.set(item.id, createMarkerRecord(item))');
    expect(source).not.toContain('markerLayer.clearLayers()');
  });

  it('keeps draggable state on existing Leaflet markers when tools change', () => {
    expect(source).toContain('function canDragMarkers()');
    expect(source).toContain('function setMarkerDragging(marker, draggable)');
    expect(source).toContain('marker.dragging.enable()');
    expect(source).toContain('marker.dragging.disable()');
    expect(source).toContain('record.dragging = true');
    expect(source).toContain('record.dragging = false');

    const markerWatchSource = source.match(/watch\(\n  \(\) => \[props\.campaign[\s\S]*?\n\);/)?.[0] || '';
    expect(markerWatchSource).toContain('props.activeTool');
    expect(markerWatchSource).toContain('syncMarkers()');
    expect(markerWatchSource).not.toContain('deep: true');
  });

  it('offsets marker tooltips away from marker art and supports hover-only descriptions', () => {
    expect(source).toContain('tooltipOffset');
    expect(source).toContain('show_title');
    expect(source).toContain('show_description');
    expect(source).toContain('permanent: hasPersistentTooltip(item)');
    expect(source).toContain('offset: tooltipOffset');
    expect(source).toContain('markerTooltipHtml(item, false)');
    expect(source).toContain('markerTooltipHtml(item, true)');
    expect(source).toContain("marker.on('mouseover'");
    expect(source).toContain('record.marker.unbindTooltip()');
    expect(source).toContain('record.marker.bindTooltip(markerTooltipHtml(item, false), markerTooltipOptions(item))');
  });

  it('exposes a marker focus API that pans the map and returns a right-side popover point', () => {
    expect(source).toContain('function focusMarker(marker)');
    expect(source).toContain('map.panTo([marker.lat, marker.lng], { animate: false })');
    expect(source).toContain('map.latLngToContainerPoint([marker.lat, marker.lng])');
    expect(source).toContain('return { x: point.x, y: point.y }');
    expect(source).toContain('defineExpose({');
    expect(source).toContain('focusMarker');
  });

  it('exposes a size refresh API for layout changes that affect Leaflet rendering', () => {
    expect(source).toContain('function refreshSize()');
    expect(source).toContain('resizeMapToContainer()');
    expect(source).toContain('refreshSize');
  });
});
