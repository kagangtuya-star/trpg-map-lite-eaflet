<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { t } from '../lib/i18n.js';

const props = defineProps({
  marker: { type: Object, required: true },
  position: { type: Object, required: true }
});

const emit = defineEmits(['save', 'delete', 'cancel']);
const viewportMargin = 12;
const popoverOffset = 16;
const popoverElement = ref(null);
const popoverSize = reactive({ width: 320, height: 0 });
let resizeObserver;

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
const popoverStyle = computed(() => {
  const position = clampToViewport(props.position.x + popoverOffset, props.position.y + popoverOffset);
  return {
    left: `${position.x}px`,
    top: `${position.y}px`
  };
});

function clampToViewport(left, top) {
  const bounds = getPopoverBounds();
  const maxLeft = Math.max(viewportMargin, bounds.width - popoverSize.width - viewportMargin);
  const maxTop = Math.max(viewportMargin, bounds.height - popoverSize.height - viewportMargin);
  return {
    x: Math.min(Math.max(viewportMargin, left), maxLeft),
    y: Math.min(Math.max(viewportMargin, top), maxTop)
  };
}

function getPopoverBounds() {
  const parent = popoverElement.value?.parentElement;
  if (!parent) return { width: window.innerWidth, height: window.innerHeight };
  const rect = parent.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function measurePopover() {
  if (!popoverElement.value) return;
  const rect = popoverElement.value.getBoundingClientRect();
  popoverSize.width = rect.width;
  popoverSize.height = rect.height;
}

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

watch(
  () => props.position,
  async () => {
    await nextTick();
    measurePopover();
  },
  { deep: true }
);

onMounted(async () => {
  await nextTick();
  measurePopover();
  resizeObserver = new ResizeObserver(measurePopover);
  if (popoverElement.value) resizeObserver.observe(popoverElement.value);
  window.addEventListener('resize', measurePopover);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', measurePopover);
});

function save() {
  emit('save', { ...form });
}
</script>

<template>
  <form ref="popoverElement" class="marker-popover" :style="popoverStyle" @submit.prevent="save">
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
