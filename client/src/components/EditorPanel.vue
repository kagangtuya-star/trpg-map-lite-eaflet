<script setup>
import { computed, defineComponent, h, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { apiClient } from '../lib/api-client.js';
import { localeLabel, localeToggleLabel, t, toggleLocale } from '../lib/i18n.js';

const props = defineProps({
  campaign: { type: Object, required: true },
  markers: { type: Array, required: true },
  token: { type: String, required: true }
});

const emit = defineEmits(['refresh', 'edit-marker', 'config-preview']);

const config = reactive({
  name: '',
  default_cursor_url: '',
  pointer_cursor_url: '',
  max_zoom: 4
});
const uploadingCursor = ref('');
const uploadError = ref('');
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

watch(
  () => props.campaign,
  (campaign) => {
    Object.assign(config, {
      name: campaign.name,
      default_cursor_url: campaign.default_cursor_url,
      pointer_cursor_url: campaign.pointer_cursor_url,
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
  await apiClient.updateConfig(props.token, config);
  emit('refresh');
}

async function uploadCursor(event, target) {
  const selectedFile = event.target.files?.[0];
  if (!selectedFile) return;
  uploadingCursor.value = target;
  uploadError.value = '';
  try {
    const result = await apiClient.uploadCursor(selectedFile);
    if (target === 'default') config.default_cursor_url = result.url;
    else config.pointer_cursor_url = result.url;
  } catch (cause) {
    uploadError.value = cause.message;
  } finally {
    uploadingCursor.value = '';
    event.target.value = '';
  }
}

async function deleteMarker(id) {
  await apiClient.deleteMarker(props.token, id);
  emit('refresh');
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
            {{ t('editor.defaultCursorUrl') }}
            <span class="file-url-row">
              <input v-model="config.default_cursor_url" />
              <span class="upload-button icon-upload-button" :title="t('editor.uploadCursor')">
                <UploadCloudIcon />
                <input type="file" accept="image/*,.cur,.ico" :disabled="Boolean(uploadingCursor)" @change="uploadCursor($event, 'default')" />
              </span>
            </span>
            <img v-if="config.default_cursor_url" class="asset-preview asset-preview--marker" :src="config.default_cursor_url" alt="" />
          </label>
          <label>
            {{ t('editor.pointerCursorUrl') }}
            <span class="file-url-row">
              <input v-model="config.pointer_cursor_url" />
              <span class="upload-button icon-upload-button" :title="t('editor.uploadCursor')">
                <UploadCloudIcon />
                <input type="file" accept="image/*,.cur,.ico" :disabled="Boolean(uploadingCursor)" @change="uploadCursor($event, 'pointer')" />
              </span>
            </span>
            <img v-if="config.pointer_cursor_url" class="asset-preview asset-preview--cursor" :src="config.pointer_cursor_url" alt="" />
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
          <div class="marker-list">
            <div v-for="item in markers" :key="item.id" class="marker-row">
              <button type="button" class="marker-title-button" @click="emit('edit-marker', item)">{{ item.title }}</button>
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
