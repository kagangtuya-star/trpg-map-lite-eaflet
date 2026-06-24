import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const createSource = readFileSync(fileURLToPath(new URL('../src/views/CreateCampaignView.vue', import.meta.url)), 'utf8');
const editorSource = readFileSync(fileURLToPath(new URL('../src/components/EditorPanel.vue', import.meta.url)), 'utf8');
const markerLayerPanelSource = readFileSync(
  fileURLToPath(new URL('../src/components/MarkerLayerPanel.vue', import.meta.url)),
  'utf8'
);
const apiSource = readFileSync(fileURLToPath(new URL('../src/lib/api-client.js', import.meta.url)), 'utf8');
const mapViewSource = readFileSync(fileURLToPath(new URL('../src/views/MapView.vue', import.meta.url)), 'utf8');
const stylesSource = readFileSync(fileURLToPath(new URL('../src/styles/app.css', import.meta.url)), 'utf8');

describe('UI source contracts', () => {
  it('uses a custom dropzone instead of a visible native map file input', () => {
    expect(createSource).toContain('class="map-dropzone"');
    expect(createSource).toContain('UploadCloudIcon');
    expect(createSource).toContain('mapPreviewUrl');
    expect(createSource).not.toContain('<input type="file" accept="image/*" @change="onFileChange" />');
  });

  it('renders campaign result actions as card buttons', () => {
    expect(createSource).toContain('result-action-card');
    expect(createSource).toContain('EditIcon');
    expect(createSource).toContain('CopyIcon');
  });

  it('groups editor controls with accordion sections and icon delete buttons', () => {
    expect(editorSource).toContain('accordion-sections');
    expect(editorSource).toContain('toggleSection');
    expect(editorSource).toContain('TrashIcon');
    expect(markerLayerPanelSource).toContain('marker-delete-button');
  });

  it('wires campaign marker icon APIs', () => {
    expect(apiSource).toContain('uploadMarkerIcon(editToken, file)');
    expect(apiSource).toContain("formData.set('icon', file)");
    expect(apiSource).toContain('deleteMarkerIcon(editToken, iconId)');
  });

  it('supports marker icon library controls without exposing cursor URL inputs', () => {
    expect(editorSource).toContain('markerIcons');
    expect(editorSource).toContain('multiple');
    expect(editorSource).toContain('prepareCursorUpload');
    expect(editorSource).toContain('prepareMarkerIconUpload');
    expect(markerLayerPanelSource).toContain('replace-marker-icon');
    expect(editorSource).toContain('editor.defaultMarkerSettings');
    expect(editorSource).not.toContain('v-model="config.default_cursor_url"');
    expect(editorSource).not.toContain('v-model="config.pointer_cursor_url"');
    expect(editorSource).toContain('editor.defaultCursorUrl');
    expect(editorSource).toContain('editor.pointerCursorUrl');
    expect(editorSource).toContain("@change=\"uploadCursor($event, 'default')\"");
    expect(editorSource).toContain("@change=\"uploadCursor($event, 'pointer')\"");
  });

  it('lets editor choose the persisted default marker icon from style or uploaded marker icons', () => {
    expect(editorSource).toContain('default_marker_icon_url');
    expect(editorSource).toContain('default_marker_icon_style');
    expect(editorSource).toContain('selectDefaultMarkerIcon');
    expect(editorSource).toContain('clearDefaultMarkerIcon');
    expect(editorSource).toContain("config.default_marker_icon_url === icon.url");
    expect(editorSource).toContain('selectedDefaultMarkerIcon');
    expect(editorSource).toContain('marker-icon-default-button');
    expect(editorSource).toContain('editor.useAsDefaultMarker');
    expect(editorSource).not.toContain('v-for="icon in markerIcons"\n                :key="icon.id"\n                type="button"\n                class="marker-icon-choice"');
  });

  it('compresses create-page cursor uploads without exposing cursor URL inputs', () => {
    expect(createSource).toContain('prepareCursorUpload');
    expect(createSource).not.toContain('v-model="defaultCursorUrl"');
    expect(createSource).not.toContain('v-model="pointerCursorUrl"');
    expect(createSource).toContain("@change=\"uploadCursor($event, 'default')\"");
    expect(createSource).toContain("@change=\"uploadCursor($event, 'pointer')\"");
    expect(createSource).toContain('default_cursor_url: defaultCursorUrl.value');
    expect(createSource).toContain('pointer_cursor_url: pointerCursorUrl.value');
  });

  it('uses map wording on the create page instead of campaign wording', () => {
    expect(createSource).toContain("t('create.campaignName')");
    expect(createSource).not.toContain('新建战役');
    expect(createSource).not.toContain('创建战役');
  });

  it('keeps marker icons in map view state', () => {
    expect(mapViewSource).toContain(':marker-icons="payload.marker_icons || []"');
    expect(mapViewSource).toContain('@replace-marker-icon="uploadReplacementMarkerIcon"');
    expect(mapViewSource).toContain('function applySavedMarkerIcon');
  });

  it('saves editor config without requesting a full campaign refresh', () => {
    expect(editorSource).toContain("'config-saved'");
    expect(editorSource).toContain("emit('config-saved', result.campaign)");

    const saveConfigSource = editorSource.match(/async function saveConfig\(\) \{[\s\S]*?\n\}/)?.[0] || '';
    expect(saveConfigSource).not.toContain("emit('refresh'");
  });

  it('darkens Leaflet controls and popup chrome', () => {
    expect(stylesSource).toContain('.leaflet-control-zoom a');
    expect(stylesSource).toContain('backdrop-filter: blur');
    expect(stylesSource).toContain('.leaflet-popup-content-wrapper');
    expect(stylesSource).toContain('background: #27272a');
  });

  it('sizes view-only embedded maps by campaign aspect ratio', () => {
    expect(stylesSource).toContain('body:has(.app-shell.view-only)');
    expect(stylesSource).toContain('.app-shell.view-only .map-workspace');
    expect(stylesSource).toContain('.app-shell.view-only .map-canvas');
    expect(stylesSource).toContain('background: transparent');
    expect(stylesSource).toContain('aspect-ratio: var(--map-aspect-ratio)');
  });

  it('renders marker management as a floating layer panel instead of only an accordion list', () => {
    expect(markerLayerPanelSource).toContain('marker-layer-panel');
    expect(markerLayerPanelSource).toContain('marker-layer-toggle');
    expect(markerLayerPanelSource).toContain('isPanelOpen');
    expect(markerLayerPanelSource).toContain("emit('edit-marker', item)");
    expect(markerLayerPanelSource).toContain("emit('replace-marker-icon'");
    expect(markerLayerPanelSource).toContain("emit('delete-marker', item.id)");
    expect(markerLayerPanelSource).toContain(':class="{ active: selectedMarkerId === item.id }"');
    expect(stylesSource).toContain('.marker-layer-panel');
    expect(stylesSource).toContain('.marker-layer-panel__drawer');
    expect(stylesSource).toContain('.marker-layer-row.active');
  });

  it('keeps the marker layer toggle separate from the draggable drawer surface', () => {
    expect(markerLayerPanelSource).toContain('const panelPosition = reactive');
    expect(markerLayerPanelSource).toContain('const dragState = reactive');
    expect(markerLayerPanelSource).toContain('function startPanelDrag(event)');
    expect(markerLayerPanelSource).toContain('function movePanelDrag(event)');
    expect(markerLayerPanelSource).toContain('function stopPanelDrag()');
    expect(markerLayerPanelSource).toContain(':style="panelStyle"');
    expect(markerLayerPanelSource).toContain('@pointerdown="startPanelDrag"');
    expect(markerLayerPanelSource).toContain('class="marker-layer-panel__drag-handle"');
    expect(markerLayerPanelSource).toContain('@click="togglePanel"');
    expect(stylesSource).toContain('.marker-layer-panel__drag-handle');
    expect(stylesSource).toContain('cursor: move');
  });

  it('wires floating marker layer selections through the map focus edit flow', () => {
    expect(mapViewSource).toContain('import MarkerLayerPanel from');
    expect(mapViewSource).toContain('const mapCanvasRef = ref(null)');
    expect(mapViewSource).toContain('const selectedMarkerId = ref');
    expect(mapViewSource).toContain('async function focusAndEditMarker(item)');
    expect(mapViewSource).toContain('await mapCanvasRef.value?.focusMarker?.(item)');
    expect(mapViewSource).toContain('<MarkerLayerPanel');
    expect(mapViewSource).toContain(':selected-marker-id="selectedMarkerId"');
    expect(mapViewSource).toContain('@edit-marker="focusAndEditMarker"');
    expect(mapViewSource).toContain('ref="mapCanvasRef"');
  });

  it('keeps edit controls in one fixed left-side stack instead of overlapping absolute widgets', () => {
    expect(mapViewSource).toContain('class="map-control-stack"');
    expect(mapViewSource).toContain('<MarkerLayerPanel');
    expect(stylesSource).toContain('.map-control-stack');
    expect(stylesSource).toContain('.map-control-stack .map-toolbar');
    expect(stylesSource).toContain('.map-control-stack .marker-layer-panel');
    expect(stylesSource).not.toContain('.map-toolbar {\n  position: absolute;');
    expect(stylesSource).not.toContain('.marker-layer-panel {\n  position: absolute;');
  });

  it('lets the editor console collapse independently from the map workspace', () => {
    expect(mapViewSource).toContain('const isConsoleCollapsed = ref(false)');
    expect(mapViewSource).toContain('function toggleConsole()');
    expect(mapViewSource).toContain('await nextTick()');
    expect(mapViewSource).toContain('mapCanvasRef.value?.refreshSize?.()');
    expect(mapViewSource).toContain("'console-collapsed': isConsoleCollapsed");
    expect(mapViewSource).toContain("'editor-panel--collapsed': isConsoleCollapsed");
    expect(mapViewSource).not.toContain('v-show="!isConsoleCollapsed"');
    expect(mapViewSource).toContain('class="editor-panel-toggle"');
    expect(mapViewSource).toContain('@click="toggleConsole"');
    expect(stylesSource).toContain('.app-shell.console-collapsed');
    expect(stylesSource).toContain('.editor-panel--collapsed');
    expect(stylesSource).toContain('.editor-panel-toggle');
  });

  it('wires project archive import and export controls at the editor bottom', () => {
    expect(apiSource).toContain('importArchive(editToken, file)');
    expect(apiSource).toContain("formData.set('archive', file)");
    expect(apiSource).toContain('/api/campaigns/:edit_token/import');
    expect(editorSource).toContain('archive-control-bar');
    expect(editorSource).toContain('archiveFileInput');
    expect(editorSource).toContain('importArchiveFile');
    expect(editorSource).toContain("emit('archive-imported'");
    expect(mapViewSource).toContain('@archive-imported="handleArchiveImported"');
    expect(mapViewSource).toContain('async function handleArchiveImported');
    expect(stylesSource).toContain('.archive-control-bar');
  });
});
