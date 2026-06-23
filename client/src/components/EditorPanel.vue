<script setup>
import { computed, reactive, ref, watch } from 'vue';
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

    <section>
      <h2>{{ t('editor.campaign') }}</h2>
      <label>
        {{ t('editor.name') }}
        <input v-model="config.name" />
      </label>
      <label>
        {{ t('editor.defaultCursorUrl') }}
        <span class="file-url-row">
          <input v-model="config.default_cursor_url" />
          <span class="upload-button">
            {{ uploadingCursor === 'default' ? t('editor.uploadingCursor') : t('editor.uploadCursor') }}
            <input type="file" accept="image/*,.cur,.ico" :disabled="Boolean(uploadingCursor)" @change="uploadCursor($event, 'default')" />
          </span>
        </span>
        <img v-if="config.default_cursor_url" class="asset-preview asset-preview--marker" :src="config.default_cursor_url" alt="" />
      </label>
      <label>
        {{ t('editor.pointerCursorUrl') }}
        <span class="file-url-row">
          <input v-model="config.pointer_cursor_url" />
          <span class="upload-button">
            {{ uploadingCursor === 'pointer' ? t('editor.uploadingCursor') : t('editor.uploadCursor') }}
            <input type="file" accept="image/*,.cur,.ico" :disabled="Boolean(uploadingCursor)" @change="uploadCursor($event, 'pointer')" />
          </span>
        </span>
        <img v-if="config.pointer_cursor_url" class="asset-preview asset-preview--cursor" :src="config.pointer_cursor_url" alt="" />
      </label>
      <p v-if="uploadError" class="inline-error">{{ uploadError }}</p>
      <label>
        {{ t('editor.maxZoom') }}
        <input :value="generatedMaxZoom" type="number" readonly />
      </label>
      <button type="button" @click="saveConfig">{{ t('editor.saveConfig') }}</button>
    </section>

    <section>
      <h2>{{ t('editor.markers') }}</h2>
      <div class="marker-list">
        <div v-for="item in markers" :key="item.id" class="marker-row">
          <button type="button" @click="emit('edit-marker', item)">{{ item.title }}</button>
          <button type="button" class="ghost" @click="deleteMarker(item.id)">{{ t('editor.delete') }}</button>
        </div>
      </div>
    </section>

    <RouterLink class="export-link" :to="viewHref" target="_blank" rel="noopener noreferrer">
      {{ t('editor.openViewMap') }}
    </RouterLink>
    <a class="export-link" :href="exportHref">{{ t('editor.exportZip') }}</a>
  </aside>
</template>
