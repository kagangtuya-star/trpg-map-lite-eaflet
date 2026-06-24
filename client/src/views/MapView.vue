<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import EditorPanel from '../components/EditorPanel.vue';
import MapCanvas from '../components/MapCanvas.vue';
import MarkerPopover from '../components/MarkerPopover.vue';
import { apiClient } from '../lib/api-client.js';
import { localeLabel, localeToggleLabel, t, toggleLocale } from '../lib/i18n.js';

const route = useRoute();
const token = computed(() => String(route.params.token || ''));
const loading = ref(true);
const error = ref('');
const payload = ref(null);
const configPreview = ref(null);
const activeTool = ref('select');
const activeMarker = ref(null);
const popoverPosition = ref(null);
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
  return {
    id: '',
    lat: Number(event.lat.toFixed(4)),
    lng: Number(event.lng.toFixed(4)),
    title: '',
    description: '',
    icon_style: 'background:#d7b56d;border:2px solid #3a2b1f;',
    icon_url: '',
    chat_url: ''
  };
}

function openDraftMarker(event) {
  activeMarker.value = createDraftMarker(event);
  popoverPosition.value = event.point;
}

function openExistingMarker(event) {
  activeMarker.value = { ...event.marker, description: event.marker.description || '' };
  popoverPosition.value = event.point;
  activeTool.value = 'select';
}

function openPanelMarker(item) {
  activeMarker.value = { ...item, description: item.description || '' };
  popoverPosition.value = { x: 76, y: 96 };
  activeTool.value = 'select';
}

function closeMarkerPopover() {
  activeMarker.value = null;
  popoverPosition.value = null;
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

async function saveMarker(marker) {
  const result = await apiClient.saveMarker(token.value, marker);
  applySavedMarker(result.marker);
  closeMarkerPopover();
}

async function saveMarkerDrag(event) {
  const marker = {
    ...event.marker,
    lat: event.lat,
    lng: event.lng,
    description: event.marker.description || ''
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
  await loadCampaign();
}
</script>

<template>
  <main class="app-shell" :class="{ 'view-only': payload?.mode === 'view' }">
    <div v-if="loading" class="state-panel">{{ t('map.loading') }}</div>
    <div v-else-if="error" class="state-panel error">{{ error }}</div>
    <template v-else-if="payload">
      <EditorPanel
        v-if="payload.mode === 'edit'"
        :campaign="payload.campaign"
        :markers="payload.markers"
        :marker-icons="payload.marker_icons || []"
        :token="token"
        @refresh="loadCampaign"
        @config-saved="applySavedCampaign"
        @edit-marker="openPanelMarker"
        @config-preview="updateConfigPreview"
        @marker-icon-created="applySavedMarkerIcon"
        @marker-icon-deleted="removeSavedMarkerIcon"
        @replace-marker-icon="replaceMarkerIcon"
      />
      <section class="map-workspace">
        <button
          v-if="payload.mode === 'view'"
          type="button"
          class="ghost locale-toggle map-locale-toggle"
          :title="t('locale.switchTo')"
          @click="toggleLocale"
        >
          {{ localeLabel }} / {{ localeToggleLabel }}
        </button>
        <div v-if="payload.mode === 'edit'" class="map-toolbar" :aria-label="t('map.tools')">
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
        <MapCanvas
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
