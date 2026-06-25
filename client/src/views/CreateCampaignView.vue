<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { apiClient } from '../lib/api-client.js';
import { prepareCursorUpload } from '../lib/image-compress.js';
import { localeLabel, localeToggleLabel, t, toggleLocale } from '../lib/i18n.js';
import { buildCampaignFormData } from '../lib/map-utils.js';
import { buildHomeTitle, setDocumentTitle } from '../lib/page-title.js';

const file = ref(null);
const name = ref('Arcane Academy');
const defaultCursorUrl = ref('/cursors/default-wand.svg');
const pointerCursorUrl = ref('/cursors/pointer-hand.svg');
const maxZoom = ref(4);
const loading = ref(false);
const uploadingCursor = ref('');
const error = ref('');
const result = ref(null);
const mapInput = ref(null);
const mapPreviewUrl = ref('');
const isDraggingMap = ref(false);
const copiedShareLink = ref(false);

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

const EditIcon = defineComponent({
  name: 'EditIcon',
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
      [h('path', { d: 'M12 20h9' }), h('path', { d: 'M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4Z' })]
    );
  }
});

const CopyIcon = defineComponent({
  name: 'CopyIcon',
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
      [h('rect', { x: '8', y: '8', width: '12', height: '12', rx: '2' }), h('path', { d: 'M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2' })]
    );
  }
});

const shareUrl = computed(() => {
  if (!result.value?.view_token || typeof window === 'undefined') return '';
  return new URL(`/${result.value.view_token}`, window.location.origin).href;
});

function revokeMapPreview() {
  if (!mapPreviewUrl.value) return;
  URL.revokeObjectURL(mapPreviewUrl.value);
  mapPreviewUrl.value = '';
}

function setMapFile(selectedFile) {
  if (!selectedFile) return;
  file.value = selectedFile;
  revokeMapPreview();
  mapPreviewUrl.value = URL.createObjectURL(selectedFile);
}

function onFileChange(event) {
  setMapFile(event.target.files?.[0]);
}

function onMapDrop(event) {
  isDraggingMap.value = false;
  setMapFile(event.dataTransfer?.files?.[0]);
}

function openMapPicker() {
  mapInput.value?.click();
}

async function uploadCursor(event, target) {
  const selectedFile = event.target.files?.[0];
  if (!selectedFile) return;
  uploadingCursor.value = target;
  error.value = '';
  try {
    const uploadFile = await prepareCursorUpload(selectedFile);
    const result = await apiClient.uploadCursor(uploadFile);
    if (target === 'default') defaultCursorUrl.value = result.url;
    else pointerCursorUrl.value = result.url;
  } catch (cause) {
    error.value = cause.message;
  } finally {
    uploadingCursor.value = '';
    event.target.value = '';
  }
}

async function createCampaign() {
  if (!file.value) {
    error.value = t('create.mapRequired');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    result.value = await apiClient.createCampaign(
      buildCampaignFormData({
        file: file.value,
        name: name.value,
        default_cursor_url: defaultCursorUrl.value,
        pointer_cursor_url: pointerCursorUrl.value,
        max_zoom: maxZoom.value
      })
    );
  } catch (cause) {
    error.value = cause.message;
  } finally {
    loading.value = false;
  }
}

async function copyShareLink() {
  if (!shareUrl.value) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareUrl.value);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = shareUrl.value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  copiedShareLink.value = true;
  window.setTimeout(() => {
    copiedShareLink.value = false;
  }, 1800);
}

onBeforeUnmount(revokeMapPreview);
onMounted(() => {
  setDocumentTitle(buildHomeTitle());
});
</script>

<template>
  <main class="create-shell">
    <section class="create-panel">
      <div class="panel-heading">
        <div>
          <p class="panel-kicker">{{ t('create.kicker') }}</p>
          <h1>{{ t('app.title') }}</h1>
        </div>
        <button type="button" class="ghost locale-toggle" :title="t('locale.switchTo')" @click="toggleLocale">
          {{ localeLabel }} / {{ localeToggleLabel }}
        </button>
      </div>

      <label class="field-block">
        {{ t('create.campaignName') }}
        <input v-model="name" />
      </label>
      <div class="field-block">
        <span>{{ t('create.mapImage') }}</span>
        <button
          type="button"
          class="map-dropzone"
          :class="{ 'is-dragging': isDraggingMap, 'has-preview': mapPreviewUrl }"
          @click="openMapPicker"
          @dragenter.prevent="isDraggingMap = true"
          @dragover.prevent="isDraggingMap = true"
          @dragleave.prevent="isDraggingMap = false"
          @drop.prevent="onMapDrop"
        >
          <img v-if="mapPreviewUrl" class="map-dropzone__preview" :src="mapPreviewUrl" alt="" />
          <span v-else class="map-dropzone__empty">
            <UploadCloudIcon class="map-dropzone__icon" />
            <span>{{ t('create.dropzoneHint') }}</span>
          </span>
        </button>
        <input ref="mapInput" class="sr-only-file" type="file" accept="image/*" tabindex="-1" @change="onFileChange" />
      </div>
      <label class="field-block">
        {{ t('create.defaultCursorUrl') }}
        <span class="asset-picker-row">
          <img v-if="defaultCursorUrl" class="asset-preview asset-preview--cursor" :src="defaultCursorUrl" alt="" />
          <span class="upload-button icon-upload-button" :title="t('create.uploadCursor')">
            <UploadCloudIcon />
            <input type="file" accept="image/*,.cur,.ico,.svg" :disabled="Boolean(uploadingCursor)" @change="uploadCursor($event, 'default')" />
          </span>
        </span>
      </label>
      <label class="field-block">
        {{ t('create.pointerCursorUrl') }}
        <span class="asset-picker-row">
          <img v-if="pointerCursorUrl" class="asset-preview asset-preview--cursor" :src="pointerCursorUrl" alt="" />
          <span class="upload-button icon-upload-button" :title="t('create.uploadCursor')">
            <UploadCloudIcon />
            <input type="file" accept="image/*,.cur,.ico,.svg" :disabled="Boolean(uploadingCursor)" @change="uploadCursor($event, 'pointer')" />
          </span>
        </span>
      </label>
      <label class="field-block">
        {{ t('create.maxZoom') }}
        <input v-model.number="maxZoom" type="number" min="0" max="8" />
      </label>

      <button type="button" :disabled="loading" @click="createCampaign">
        {{ loading ? t('create.creating') : t('create.submit') }}
      </button>

      <p v-if="error" class="inline-error">{{ error }}</p>

      <div v-if="result" class="token-result">
        <RouterLink class="result-action-card" :to="`/${result.edit_token}`">
          <EditIcon />
          <span>{{ t('create.openEditMode') }}</span>
        </RouterLink>
        <button type="button" class="result-action-card" @click="copyShareLink">
          <CopyIcon />
          <span>{{ copiedShareLink ? t('create.copiedShareLink') : t('create.copyShareLink') }}</span>
        </button>
      </div>
    </section>
  </main>
</template>
