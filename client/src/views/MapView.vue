<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import EditorPanel from '../components/EditorPanel.vue';
import MapCanvas from '../components/MapCanvas.vue';
import MarkerLayerPanel from '../components/MarkerLayerPanel.vue';
import MarkerPopover from '../components/MarkerPopover.vue';
import { apiClient } from '../lib/api-client.js';
import { prepareMarkerIconUpload } from '../lib/image-compress.js';
import { localeLabel, localeToggleLabel, t, toggleLocale } from '../lib/i18n.js';

const DEFAULT_MARKER_ICON_STYLE = 'width:18px;height:18px;background:#d7b56d;border:2px solid #3a2b1f;';

const route = useRoute();
const token = computed(() => String(route.params.token || ''));
const loading = ref(true);
const error = ref('');
const payload = ref(null);
const configPreview = ref(null);
const activeTool = ref('select');
const activeMarker = ref(null);
const popoverPosition = ref(null);
const savingMarker = ref(false);
const selectedMarkerId = ref('');
const mapCanvasRef = ref(null);
const isConsoleCollapsed = ref(false);
const previewCampaign = computed(() =>
  payload.value?.campaign ? { ...payload.value.campaign, ...(configPreview.value || {}) } : null
);

async function loadCampaign() {
  loading.value = true;
  error.value = '';
  try {
    payload.value = await apiClient.getCampaign(token.value);
    configPreview.value = null;
  } catch (cause) {
    error.value = cause.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadCampaign);

function createDraftMarker(event) {
  const campaign = previewCampaign.value || payload.value?.campaign || {};
  return {
    id: '',
    lat: Number(event.lat.toFixed(4)),
    lng: Number(event.lng.toFixed(4)),
    title: '',
    show_title: true,
    description: '',
    show_description: true,
    icon_style: campaign.default_marker_icon_style || DEFAULT_MARKER_ICON_STYLE,
    icon_url: campaign.default_marker_icon_url ?? '',
    chat_url: ''
  };
}

function openDraftMarker(event) {
  activeMarker.value = createDraftMarker(event);
  popoverPosition.value = event.point;
  selectedMarkerId.value = '';
}

function normalizeEditableMarker(marker) {
  return {
    ...marker,
    description: marker.description || '',
    show_title: marker.show_title !== false && marker.show_title !== 0,
    show_description: marker.show_description !== false && marker.show_description !== 0
  };
}

function openExistingMarker(event) {
  activeMarker.value = normalizeEditableMarker(event.marker);
  popoverPosition.value = event.point;
  selectedMarkerId.value = event.marker.id || '';
  activeTool.value = 'select';
}

async function focusAndEditMarker(item) {
  const point = await mapCanvasRef.value?.focusMarker?.(item);
  activeMarker.value = normalizeEditableMarker(item);
  popoverPosition.value = point || { x: 76, y: 96 };
  selectedMarkerId.value = item.id || '';
  activeTool.value = 'select';
}

function closeMarkerPopover() {
  activeMarker.value = null;
  popoverPosition.value = null;
  selectedMarkerId.value = '';
}

async function toggleConsole() {
  isConsoleCollapsed.value = !isConsoleCollapsed.value;
  await nextTick();
  mapCanvasRef.value?.refreshSize?.();
}

function updateConfigPreview(config) {
  configPreview.value = config;
}

function applySavedCampaign(campaign) {
  if (!payload.value) return;
  payload.value = {
    ...payload.value,
    campaign: {
      ...payload.value.campaign,
      ...campaign
    }
  };
  configPreview.value = null;
}

function applySavedMarker(marker) {
  if (!payload.value) return;
  const markers = payload.value.markers || [];
  const index = markers.findIndex((item) => item.id === marker.id);
  const nextMarkers =
    index >= 0 ? markers.map((item) => (item.id === marker.id ? marker : item)) : [...markers, marker];
  payload.value = {
    ...payload.value,
    markers: nextMarkers
  };
}

function applySavedMarkerIcon(icon) {
  if (!payload.value) return;
  payload.value = {
    ...payload.value,
    marker_icons: [...(payload.value.marker_icons || []), icon]
  };
}

function removeSavedMarkerIcon(iconId) {
  if (!payload.value) return;
  payload.value = {
    ...payload.value,
    marker_icons: (payload.value.marker_icons || []).filter((icon) => icon.id !== iconId)
  };
}

function removeSavedMarker(markerId) {
  if (!payload.value) return;
  payload.value = {
    ...payload.value,
    markers: (payload.value.markers || []).filter((marker) => marker.id !== markerId)
  };
  if (selectedMarkerId.value === markerId) {
    closeMarkerPopover();
  }
}

async function uploadReplacementMarkerIcon({ event, marker }) {
  const selectedFile = event.target.files?.[0];
  if (!selectedFile) return;
  try {
    const uploadFile = await prepareMarkerIconUpload(selectedFile);
    const result = await apiClient.uploadMarkerIcon(token.value, uploadFile);
    applySavedMarkerIcon(result.icon);
    await replaceMarkerIcon({ marker, iconUrl: result.icon.url });
  } catch (cause) {
    error.value = cause.message;
  } finally {
    event.target.value = '';
  }
}

async function deleteLayerMarker(id) {
  await apiClient.deleteMarker(token.value, id);
  removeSavedMarker(id);
}

async function saveMarker(marker) {
  if (savingMarker.value) return;
  savingMarker.value = true;
  try {
    const result = await apiClient.saveMarker(token.value, marker);
    applySavedMarker(result.marker);
    closeMarkerPopover();
  } catch (cause) {
    error.value = cause.message;
  } finally {
    savingMarker.value = false;
  }
}

async function saveMarkerDrag(event) {
  const marker = {
    ...event.marker,
    lat: event.lat,
    lng: event.lng,
    description: event.marker.description || '',
    show_title: event.marker.show_title !== false && event.marker.show_title !== 0,
    show_description: event.marker.show_description !== false && event.marker.show_description !== 0
  };
  try {
    const result = await apiClient.saveMarker(token.value, marker);
    applySavedMarker(result.marker);
  } catch (cause) {
    error.value = cause.message;
  }
}

async function replaceMarkerIcon({ marker, iconUrl }) {
  try {
    const result = await apiClient.saveMarker(token.value, {
      ...marker,
      description: marker.description || '',
      show_title: marker.show_title !== false && marker.show_title !== 0,
      show_description: marker.show_description !== false && marker.show_description !== 0,
      icon_url: iconUrl
    });
    applySavedMarker(result.marker);
  } catch (cause) {
    error.value = cause.message;
  }
}

async function deleteMarker(id) {
  await apiClient.deleteMarker(token.value, id);
  closeMarkerPopover();
  removeSavedMarker(id);
}
</script>

<template>
  <main class="app-shell" :class="{ 'view-only': payload?.mode === 'view', 'console-collapsed': isConsoleCollapsed }">
    <div v-if="loading" class="state-panel">{{ t('map.loading') }}</div>
    <div v-else-if="error" class="state-panel error">{{ error }}</div>
    <template v-else-if="payload">
      <EditorPanel
        v-if="payload.mode === 'edit'"
        :class="{ 'editor-panel--collapsed': isConsoleCollapsed }"
        :campaign="payload.campaign"
        :marker-icons="payload.marker_icons || []"
        :token="token"
        @refresh="loadCampaign"
        @config-saved="applySavedCampaign"
        @config-preview="updateConfigPreview"
        @marker-icon-created="applySavedMarkerIcon"
        @marker-icon-deleted="removeSavedMarkerIcon"
      />
      <section class="map-workspace">
        <div v-if="payload.mode === 'edit'" class="map-control-stack">
          <button
            type="button"
            class="editor-panel-toggle"
            :class="{ active: !isConsoleCollapsed }"
            :title="isConsoleCollapsed ? t('editor.expandConsole') : t('editor.collapseConsole')"
            @click="toggleConsole"
          >
            {{ isConsoleCollapsed ? '>' : '<' }}
          </button>
          <div class="map-toolbar" :aria-label="t('map.tools')">
            <button
              type="button"
              class="tool-button"
              :class="{ active: activeTool === 'select' }"
              :title="t('map.select')"
              @click="activeTool = 'select'"
            >
              S
            </button>
            <button
              type="button"
              class="tool-button"
              :class="{ active: activeTool === 'marker' }"
              :title="t('map.placeMarker')"
              @click="activeTool = 'marker'"
            >
              +
            </button>
          </div>
          <MarkerLayerPanel
            :markers="payload.markers"
            :selected-marker-id="selectedMarkerId"
            @edit-marker="focusAndEditMarker"
            @delete-marker="deleteLayerMarker"
            @replace-marker-icon="uploadReplacementMarkerIcon"
          />
        </div>
        <button
          v-if="payload.mode === 'view'"
          type="button"
          class="ghost locale-toggle map-locale-toggle"
          :title="t('locale.switchTo')"
          @click="toggleLocale"
        >
          {{ localeLabel }} / {{ localeToggleLabel }}
        </button>
        <MapCanvas
          ref="mapCanvasRef"
          :campaign="previewCampaign"
          :markers="payload.markers"
          :mode="payload.mode"
          :active-tool="activeTool"
          @map-click="openDraftMarker"
          @marker-click="openExistingMarker"
          @marker-drag-start="closeMarkerPopover"
          @marker-drag-end="saveMarkerDrag"
        />
        <MarkerPopover
          v-if="payload.mode === 'edit' && activeMarker && popoverPosition"
          :marker="activeMarker"
          :marker-icons="payload.marker_icons || []"
          :position="popoverPosition"
          @save="saveMarker"
          @delete="deleteMarker"
          @cancel="closeMarkerPopover"
        />
      </section>
    </template>
  </main>
</template>
