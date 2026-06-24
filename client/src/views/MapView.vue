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

async function saveMarker(marker) {
  await apiClient.saveMarker(token.value, marker);
  closeMarkerPopover();
  await loadCampaign();
}

async function saveMarkerDrag(event) {
  const marker = {
    ...event.marker,
    lat: event.lat,
    lng: event.lng,
    description: event.marker.description || ''
  };
  try {
    await apiClient.saveMarker(token.value, marker);
    await loadCampaign();
  } catch (cause) {
    error.value = cause.message;
    await loadCampaign();
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
        :token="token"
        @refresh="loadCampaign"
        @edit-marker="openPanelMarker"
        @config-preview="updateConfigPreview"
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
          @marker-drag-end="saveMarkerDrag"
        />
        <MarkerPopover
          v-if="payload.mode === 'edit' && activeMarker && popoverPosition"
          :marker="activeMarker"
          :position="popoverPosition"
          @save="saveMarker"
          @delete="deleteMarker"
          @cancel="closeMarkerPopover"
        />
      </section>
    </template>
  </main>
</template>
