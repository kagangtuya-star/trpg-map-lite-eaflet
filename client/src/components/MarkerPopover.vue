<script setup>
import { computed, reactive, watch } from 'vue';

import { t } from '../lib/i18n.js';

const props = defineProps({
  marker: { type: Object, required: true },
  position: { type: Object, required: true }
});

const emit = defineEmits(['save', 'delete', 'cancel']);

const form = reactive({
  id: '',
  lat: 0,
  lng: 0,
  title: '',
  description: '',
  icon_style: '',
  chat_url: ''
});

const isExisting = computed(() => Boolean(form.id));
const popoverStyle = computed(() => ({
  left: `${Math.max(12, props.position.x + 16)}px`,
  top: `${Math.max(12, props.position.y + 16)}px`
}));

watch(
  () => props.marker,
  (marker) => {
    Object.assign(form, {
      id: marker.id || '',
      lat: Number(marker.lat ?? 0),
      lng: Number(marker.lng ?? 0),
      title: marker.title || '',
      description: marker.description || '',
      icon_style: marker.icon_style || 'background:#d7b56d;border:2px solid #3a2b1f;',
      chat_url: marker.chat_url || ''
    });
  },
  { immediate: true, deep: true }
);

function save() {
  emit('save', { ...form });
}
</script>

<template>
  <form class="marker-popover" :style="popoverStyle" @submit.prevent="save">
    <div class="marker-popover__header">
      <strong>{{ isExisting ? t('marker.edit') : t('marker.new') }}</strong>
      <button type="button" class="ghost icon-button" :aria-label="t('marker.close')" @click="emit('cancel')">x</button>
    </div>

    <label>
      {{ t('marker.title') }}
      <input v-model="form.title" />
    </label>

    <label>
      {{ t('marker.description') }}
      <textarea v-model="form.description" rows="3"></textarea>
    </label>

    <label>
      {{ t('marker.chatUrl') }}
      <input v-model="form.chat_url" />
    </label>

    <label>
      {{ t('marker.iconStyle') }}
      <textarea v-model="form.icon_style" rows="2"></textarea>
    </label>

    <div class="coord-readout">X: {{ Number(form.lng).toFixed(2) }} / Y: {{ Number(form.lat).toFixed(2) }}</div>

    <div class="marker-popover__actions">
      <button type="submit">{{ t('marker.save') }}</button>
      <button v-if="isExisting" type="button" class="ghost" @click="emit('delete', form.id)">{{ t('marker.delete') }}</button>
      <button type="button" class="ghost" @click="emit('cancel')">{{ t('marker.cancel') }}</button>
    </div>
  </form>
</template>
