<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

import { apiClient } from '../lib/api-client.js';
import { localeLabel, localeToggleLabel, t, toggleLocale } from '../lib/i18n.js';
import { buildCampaignFormData } from '../lib/map-utils.js';

const file = ref(null);
const name = ref('Arcane Academy');
const defaultCursorUrl = ref('/cursors/default-wand.png');
const pointerCursorUrl = ref('/cursors/pointer-hand.png');
const maxZoom = ref(4);
const loading = ref(false);
const uploadingCursor = ref('');
const error = ref('');
const result = ref(null);

function onFileChange(event) {
  file.value = event.target.files?.[0] || null;
}

async function uploadCursor(event, target) {
  const selectedFile = event.target.files?.[0];
  if (!selectedFile) return;
  uploadingCursor.value = target;
  error.value = '';
  try {
    const result = await apiClient.uploadCursor(selectedFile);
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

      <label>
        {{ t('create.campaignName') }}
        <input v-model="name" />
      </label>
      <label>
        {{ t('create.mapImage') }}
        <input type="file" accept="image/*" @change="onFileChange" />
      </label>
      <label>
        {{ t('create.defaultCursorUrl') }}
        <span class="file-url-row">
          <input v-model="defaultCursorUrl" />
          <span class="upload-button">
            {{ uploadingCursor === 'default' ? t('create.uploadingCursor') : t('create.uploadCursor') }}
            <input type="file" accept="image/*,.cur,.ico" :disabled="Boolean(uploadingCursor)" @change="uploadCursor($event, 'default')" />
          </span>
        </span>
        <img v-if="defaultCursorUrl" class="asset-preview asset-preview--marker" :src="defaultCursorUrl" alt="" />
      </label>
      <label>
        {{ t('create.pointerCursorUrl') }}
        <span class="file-url-row">
          <input v-model="pointerCursorUrl" />
          <span class="upload-button">
            {{ uploadingCursor === 'pointer' ? t('create.uploadingCursor') : t('create.uploadCursor') }}
            <input type="file" accept="image/*,.cur,.ico" :disabled="Boolean(uploadingCursor)" @change="uploadCursor($event, 'pointer')" />
          </span>
        </span>
        <img v-if="pointerCursorUrl" class="asset-preview asset-preview--cursor" :src="pointerCursorUrl" alt="" />
      </label>
      <label>
        {{ t('create.maxZoom') }}
        <input v-model.number="maxZoom" type="number" min="0" max="8" />
      </label>

      <button type="button" :disabled="loading" @click="createCampaign">
        {{ loading ? t('create.creating') : t('create.submit') }}
      </button>

      <p v-if="error" class="inline-error">{{ error }}</p>

      <div v-if="result" class="token-result">
        <RouterLink :to="`/${result.edit_token}`">{{ t('create.openEditMap') }}</RouterLink>
        <RouterLink :to="`/${result.view_token}`">{{ t('create.openViewMap') }}</RouterLink>
        <code>{{ result.edit_token }}</code>
        <code>{{ result.view_token }}</code>
      </div>
    </section>
  </main>
</template>
