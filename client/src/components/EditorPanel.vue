<script setup>
import { computed, defineComponent, h, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { apiClient } from '../lib/api-client.js';
import { prepareCursorUpload, prepareMarkerIconUpload } from '../lib/image-compress.js';
import { localeLabel, localeToggleLabel, t, toggleLocale } from '../lib/i18n.js';

const DEFAULT_MARKER_ICON_STYLE = 'width:18px;height:18px;background:#d7b56d;border:2px solid #3a2b1f;';

const props = defineProps({
  campaign: { type: Object, required: true },
  markers: { type: Array, required: true },
  markerIcons: { type: Array, required: true },
  token: { type: String, required: true }
});

const emit = defineEmits([
  'refresh',
  'edit-marker',
  'config-preview',
  'config-saved',
  'marker-icon-created',
  'marker-icon-deleted',
  'marker-deleted',
  'replace-marker-icon'
]);

const config = reactive({
  name: '',
  default_cursor_url: '',
  pointer_cursor_url: '',
  default_marker_icon_url: '',
  default_marker_icon_style: DEFAULT_MARKER_ICON_STYLE,
  max_zoom: 4
});
const uploadingCursor = ref('');
const uploadingMarkerIcons = ref(false);
const replacingMarkerId = ref('');
const uploadError = ref('');
const markerIconError = ref('');
const openSections = reactive({
  campaign: true,
  cursors: true,
  markers: true
});

const UploadCloudIcon = defineComponent({
  name: 'UploadCloudIcon',
  render() {
    return h(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      },
      [
        h('path', { d: 'M16 16l-4-4-4 4' }),
        h('path', { d: 'M12 12v9' }),
        h('path', { d: 'M20.4 18.1A5 5 0 0018 8.7 7 7 0 104.3 15.3' })
      ]
    );
  }
});

const TrashIcon = defineComponent({
  name: 'TrashIcon',
  render() {
    return h(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      },
      [
        h('path', { d: 'M3 6h18' }),
        h('path', { d: 'M8 6V4h8v2' }),
        h('path', { d: 'M19 6l-1 14H6L5 6' }),
        h('path', { d: 'M10 11v5' }),
        h('path', { d: 'M14 11v5' })
      ]
    );
  }
});

const ChevronIcon = defineComponent({
  name: 'ChevronIcon',
  render() {
    return h(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      },
      [h('path', { d: 'M6 9l6 6 6-6' })]
    );
  }
});

const exportHref = computed(() => apiClient.exportUrl(props.token));
const viewHref = computed(() => `/${props.campaign.view_token}`);
const generatedMaxZoom = computed(() => props.campaign.tile_bounds?.max_zoom ?? props.campaign.max_zoom);
const selectedDefaultMarkerIcon = computed(() =>
  props.markerIcons.find((icon) => icon.url === config.default_marker_icon_url)
);
const defaultMarkerStylePreview = computed(() => {
  const style = config.default_marker_icon_style || DEFAULT_MARKER_ICON_STYLE;
  const width = style.match(/width:\s*(\d+)px/)?.[1] || 18;
  const height = style.match(/height:\s*(\d+)px/)?.[1] || width;
  const background = style.match(/background:\s*(#[0-9a-fA-F]{3,8})/)?.[1] || '#d7b56d';
  return {
    width: `${width}px`,
    height: `${height}px`,
    background,
    border: '2px solid #3a2b1f'
  };
});
const defaultMarkerImagePreview = computed(() => {
  const style = config.default_marker_icon_style || DEFAULT_MARKER_ICON_STYLE;
  const width = style.match(/width:\s*(\d+)px/)?.[1] || 32;
  const height = style.match(/height:\s*(\d+)px/)?.[1] || width;
  return {
    width: `${width}px`,
    height: `${height}px`
  };
});

watch(
  () => props.campaign,
  (campaign) => {
    Object.assign(config, {
      name: campaign.name,
      default_cursor_url: campaign.default_cursor_url,
      pointer_cursor_url: campaign.pointer_cursor_url,
      default_marker_icon_url: campaign.default_marker_icon_url || '',
      default_marker_icon_style: campaign.default_marker_icon_style || DEFAULT_MARKER_ICON_STYLE,
      max_zoom: campaign.max_zoom
    });
  },
  { immediate: true }
);

watch(
  config,
  () => {
    emit('config-preview', { ...config });
  },
  { deep: true }
);

async function saveConfig() {
  const result = await apiClient.updateConfig(props.token, config);
  emit('config-saved', result.campaign);
}

async function uploadCursor(event, target) {
  const selectedFile = event.target.files?.[0];
  if (!selectedFile) return;
  uploadingCursor.value = target;
  uploadError.value = '';
  try {
    const uploadFile = await prepareCursorUpload(selectedFile);
    const result = await apiClient.uploadCursor(uploadFile);
    if (target === 'default') config.default_cursor_url = result.url;
    else config.pointer_cursor_url = result.url;
  } catch (cause) {
    uploadError.value = cause.message;
  } finally {
    uploadingCursor.value = '';
    event.target.value = '';
  }
}

async function uploadMarkerIcons(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  uploadingMarkerIcons.value = true;
  markerIconError.value = '';
  const failures = [];
  try {
    for (const file of files) {
      try {
        const uploadFile = await prepareMarkerIconUpload(file);
        const result = await apiClient.uploadMarkerIcon(props.token, uploadFile);
        emit('marker-icon-created', result.icon);
      } catch (cause) {
        failures.push(cause.message);
      }
    }
    if (failures.length) {
      markerIconError.value = `${failures.length} file(s) failed: ${failures[0]}`;
    }
  } finally {
    uploadingMarkerIcons.value = false;
    event.target.value = '';
  }
}

async function deleteMarkerIcon(icon) {
  markerIconError.value = '';
  try {
    await apiClient.deleteMarkerIcon(props.token, icon.id);
    emit('marker-icon-deleted', icon.id);
  } catch (cause) {
    markerIconError.value = cause.message;
  }
}

function selectDefaultMarkerIcon(icon) {
  config.default_marker_icon_url = icon.url;
  config.default_marker_icon_style = config.default_marker_icon_style || DEFAULT_MARKER_ICON_STYLE;
}

function clearDefaultMarkerIcon() {
  config.default_marker_icon_url = '';
  config.default_marker_icon_style = config.default_marker_icon_style || DEFAULT_MARKER_ICON_STYLE;
}

async function replaceMarkerIcon(event, marker) {
  const selectedFile = event.target.files?.[0];
  if (!selectedFile) return;
  replacingMarkerId.value = marker.id;
  markerIconError.value = '';
  try {
    const uploadFile = await prepareMarkerIconUpload(selectedFile);
    const result = await apiClient.uploadMarkerIcon(props.token, uploadFile);
    emit('marker-icon-created', result.icon);
    emit('replace-marker-icon', { marker, iconUrl: result.icon.url });
  } catch (cause) {
    markerIconError.value = cause.message;
  } finally {
    replacingMarkerId.value = '';
    event.target.value = '';
  }
}

async function deleteMarker(id) {
  await apiClient.deleteMarker(props.token, id);
  emit('marker-deleted', id);
}

function toggleSection(section) {
  openSections[section] = !openSections[section];
}
</script>

<template>
  <aside class="editor-panel">
    <div class="panel-heading">
      <div>
        <p class="panel-kicker">{{ t('editor.kicker') }}</p>
        <h1>{{ campaign.name }}</h1>
      </div>
      <button type="button" class="ghost locale-toggle" :title="t('locale.switchTo')" @click="toggleLocale">
        {{ localeLabel }} / {{ localeToggleLabel }}
      </button>
    </div>

    <div class="accordion-sections">
      <section class="accordion-section">
        <button type="button" class="accordion-trigger" @click="toggleSection('campaign')">
          <span>{{ t('editor.basicConfig') }}</span>
          <ChevronIcon :class="{ 'is-open': openSections.campaign }" />
        </button>
        <div v-if="openSections.campaign" class="accordion-content">
          <label>
            {{ t('editor.name') }}
            <input v-model="config.name" />
          </label>
          <label>
            {{ t('editor.maxZoom') }}
            <input :value="generatedMaxZoom" type="number" readonly />
          </label>
          <button type="button" class="primary-action" @click="saveConfig">{{ t('editor.saveConfig') }}</button>
        </div>
      </section>

      <section class="accordion-section">
        <button type="button" class="accordion-trigger" @click="toggleSection('cursors')">
          <span>{{ t('editor.cursorConfig') }}</span>
          <ChevronIcon :class="{ 'is-open': openSections.cursors }" />
        </button>
        <div v-if="openSections.cursors" class="accordion-content">
          <label>
            {{ t('editor.pointerCursorUrl') }}
            <span class="asset-picker-row">
              <img v-if="config.pointer_cursor_url" class="asset-preview asset-preview--cursor" :src="config.pointer_cursor_url" alt="" />
              <span class="upload-button icon-upload-button" :title="t('editor.uploadCursor')">
                <UploadCloudIcon />
                <input type="file" accept="image/*,.cur,.ico,.svg" :disabled="Boolean(uploadingCursor)" @change="uploadCursor($event, 'pointer')" />
              </span>
            </span>
          </label>
          <p v-if="uploadError" class="inline-error">{{ uploadError }}</p>
        </div>
      </section>

      <section class="accordion-section">
        <button type="button" class="accordion-trigger" @click="toggleSection('markers')">
          <span>{{ t('editor.markerManagement') }}</span>
          <ChevronIcon :class="{ 'is-open': openSections.markers }" />
        </button>
        <div v-if="openSections.markers" class="accordion-content">
          <div class="default-marker-settings">
            <div class="field-block">{{ t('editor.defaultMarkerSettings') }}</div>
            <div class="marker-icon-grid">
              <button
                type="button"
                class="marker-icon-choice"
                :class="{ active: !config.default_marker_icon_url }"
                :title="t('marker.useStyleIcon')"
                @click="clearDefaultMarkerIcon"
              >
                <span class="custom-magic-marker" :style="defaultMarkerStylePreview"></span>
              </button>
              <div v-if="selectedDefaultMarkerIcon" class="marker-icon-choice active" aria-current="true">
                <img :src="selectedDefaultMarkerIcon.url" :alt="selectedDefaultMarkerIcon.name" :style="defaultMarkerImagePreview" />
              </div>
            </div>
          </div>
          <div class="marker-icon-library">
            <div class="field-block">{{ t('editor.markerIcons') }}</div>
            <div class="marker-icon-grid">
              <div v-for="icon in markerIcons" :key="icon.id" class="marker-icon-tile">
                <button
                  type="button"
                  class="marker-icon-default-button"
                  :class="{ active: config.default_marker_icon_url === icon.url }"
                  :title="t('editor.useAsDefaultMarker')"
                  :aria-label="t('editor.useAsDefaultMarker')"
                  @click="selectDefaultMarkerIcon(icon)"
                >
                  <span class="custom-magic-marker" :style="defaultMarkerStylePreview"></span>
                </button>
                <img :src="icon.url" :alt="icon.name" />
                <button type="button" class="marker-icon-delete" :aria-label="t('editor.delete')" @click="deleteMarkerIcon(icon)">
                  <TrashIcon />
                </button>
              </div>
            </div>
            <span class="upload-button marker-icon-upload-button" :title="t('editor.uploadMarkerIcon')">
              <UploadCloudIcon />
              <input type="file" accept="image/*,.svg" multiple :disabled="uploadingMarkerIcons" @change="uploadMarkerIcons" />
            </span>
            <p v-if="markerIconError" class="inline-error">{{ markerIconError }}</p>
          </div>
          <div class="marker-list">
            <div v-for="item in markers" :key="item.id" class="marker-row">
              <img v-if="item.icon_url" class="marker-row-icon" :src="item.icon_url" alt="" />
              <span v-else class="marker-row-icon marker-row-icon--empty" aria-hidden="true"></span>
              <button type="button" class="marker-title-button" @click="emit('edit-marker', item)">{{ item.title }}</button>
              <span class="upload-button marker-replace-button" :title="t('editor.replaceMarkerIcon')">
                <UploadCloudIcon />
                <input type="file" accept="image/*,.svg" :disabled="replacingMarkerId === item.id" @change="replaceMarkerIcon($event, item)" />
              </span>
              <button type="button" class="marker-delete-button" :aria-label="t('editor.delete')" @click="deleteMarker(item.id)">
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <RouterLink class="export-link" :to="viewHref" target="_blank" rel="noopener noreferrer">
      {{ t('editor.openViewMap') }}
    </RouterLink>
    <a class="export-link" :href="exportHref">{{ t('editor.exportZip') }}</a>
  </aside>
</template>
