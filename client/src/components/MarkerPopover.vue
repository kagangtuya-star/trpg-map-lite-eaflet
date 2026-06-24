<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import { t } from '../lib/i18n.js';

const props = defineProps({
  marker: { type: Object, required: true },
  markerIcons: { type: Array, default: () => [] },
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
  show_title: true,
  description: '',
  show_description: true,
  icon_style: '',
  icon_url: '',
  chat_url: ''
});
const styleControls = reactive({
  color: '#d7b56d',
  size: 18
});

const isExisting = computed(() => Boolean(form.id));
const usesStyleIcon = computed(() => !form.icon_url);
const selectedMarkerPreviewUrl = computed(() => form.icon_url);
const styleIconPreview = computed(() => ({
  width: `${styleControls.size}px`,
  height: `${styleControls.size}px`,
  background: styleControls.color,
  border: '2px solid #3a2b1f'
}));
const selectedMarkerPreviewStyle = computed(() => {
  if (selectedMarkerPreviewUrl.value) {
    return {
      width: `${styleControls.size}px`,
      height: `${styleControls.size}px`
    };
  }
  return styleIconPreview.value;
});
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

function readStyleControls(iconStyle) {
  const color = String(iconStyle || '').match(/background:\s*(#[0-9a-fA-F]{3,8})/)?.[1];
  const size = String(iconStyle || '').match(/width:\s*(\d+)px/)?.[1];
  styleControls.color = color || '#d7b56d';
  styleControls.size = Math.min(48, Math.max(12, Number(size || 18)));
}

function writeIconStyle() {
  form.icon_style = `width:${styleControls.size}px;height:${styleControls.size}px;background:${styleControls.color};border:2px solid #3a2b1f;`;
}

watch(
  () => props.marker,
  (marker) => {
    const iconStyle = marker.icon_style || 'background:#d7b56d;border:2px solid #3a2b1f;';
    Object.assign(form, {
      id: marker.id || '',
      lat: Number(marker.lat ?? 0),
      lng: Number(marker.lng ?? 0),
      title: marker.title || '',
      show_title: marker.show_title !== false && marker.show_title !== 0,
      description: marker.description || '',
      show_description: marker.show_description !== false && marker.show_description !== 0,
      icon_style: iconStyle,
      icon_url: marker.icon_url || '',
      chat_url: marker.chat_url || ''
    });
    readStyleControls(iconStyle);
  },
  { immediate: true, deep: true }
);

watch(styleControls, writeIconStyle, { deep: true });

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

function selectMarkerIcon(icon) {
  form.icon_url = icon.url;
  writeIconStyle();
}

function clearMarkerIcon() {
  form.icon_url = '';
  writeIconStyle();
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

    <div class="visibility-toggle-row">
      <label class="checkbox-field">
        <input v-model="form.show_title" type="checkbox" />
        <span>{{ t('marker.showTitle') }}</span>
      </label>
      <label class="checkbox-field">
        <input v-model="form.show_description" type="checkbox" />
        <span>{{ t('marker.showDescription') }}</span>
      </label>
    </div>

    <label>
      {{ t('marker.chatUrl') }}
      <input v-model="form.chat_url" />
    </label>

    <div class="marker-icon-picker">
      <button
        v-for="icon in markerIcons"
        :key="icon.id"
        type="button"
        class="marker-icon-choice"
        :class="{ active: form.icon_url === icon.url }"
        @click="selectMarkerIcon(icon)"
      >
        <img :src="icon.url" :alt="icon.name" />
      </button>
      <button
        type="button"
        class="marker-icon-choice"
        :class="{ active: usesStyleIcon }"
        :title="t('marker.useStyleIcon')"
        @click="clearMarkerIcon"
      >
        <span class="custom-magic-marker" :style="styleIconPreview"></span>
      </button>
    </div>

    <div class="marker-preview">
      <img
        v-if="selectedMarkerPreviewUrl"
        class="custom-magic-marker custom-magic-marker--image marker-preview-icon"
        :src="selectedMarkerPreviewUrl"
        alt=""
        :style="selectedMarkerPreviewStyle"
        draggable="false"
      />
      <span v-else class="custom-magic-marker marker-preview-icon" :style="selectedMarkerPreviewStyle"></span>
    </div>

    <div class="marker-style-controls">
      <label v-if="usesStyleIcon">
        {{ t('marker.styleColor') }}
        <input v-model="styleControls.color" type="color" />
      </label>
      <span v-else></span>
      <label>
        <span>{{ t('marker.styleSize') }} <span class="marker-size-value">{{ styleControls.size }}px</span></span>
        <input v-model.number="styleControls.size" type="range" min="12" max="48" />
      </label>
    </div>

    <div class="coord-readout">X: {{ Number(form.lng).toFixed(2) }} / Y: {{ Number(form.lat).toFixed(2) }}</div>

    <div class="marker-popover__actions">
      <button type="submit">{{ t('marker.save') }}</button>
      <button v-if="isExisting" type="button" class="ghost" @click="emit('delete', form.id)">{{ t('marker.delete') }}</button>
      <button type="button" class="ghost" @click="emit('cancel')">{{ t('marker.cancel') }}</button>
    </div>
  </form>
</template>
