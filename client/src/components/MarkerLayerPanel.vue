<script setup>
import { computed, defineComponent, h, reactive, ref } from 'vue';

import { t } from '../lib/i18n.js';

const props = defineProps({
  markers: { type: Array, required: true },
  selectedMarkerId: { type: String, default: '' }
});

const emit = defineEmits(['edit-marker', 'delete-marker', 'replace-marker-icon']);

const isPanelOpen = ref(true);
const panelPosition = reactive({ x: 0, y: 0 });
const dragState = reactive({
  dragging: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0
});
const markerCountLabel = computed(() => String(props.markers.length));
const panelStyle = computed(() => ({
  transform: `translate(${panelPosition.x}px, ${panelPosition.y}px)`
}));

const LayersIcon = defineComponent({
  name: 'LayersIcon',
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
        h('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }),
        h('path', { d: 'M2 12l10 5 10-5' }),
        h('path', { d: 'M2 17l10 5 10-5' })
      ]
    );
  }
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

function togglePanel() {
  isPanelOpen.value = !isPanelOpen.value;
}

function markerTitle(item) {
  return item.title || t('marker.untitled');
}

function startPanelDrag(event) {
  if (event.button !== 0) return;
  dragState.dragging = true;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.originX = panelPosition.x;
  dragState.originY = panelPosition.y;
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function movePanelDrag(event) {
  if (!dragState.dragging) return;
  panelPosition.x = dragState.originX + event.clientX - dragState.startX;
  panelPosition.y = dragState.originY + event.clientY - dragState.startY;
}

function stopPanelDrag() {
  dragState.dragging = false;
}
</script>

<template>
  <div class="marker-layer-panel" :class="{ open: isPanelOpen }">
    <button
      type="button"
      class="marker-layer-toggle"
      :class="{ active: isPanelOpen }"
      :title="t('editor.markerManagement')"
      :aria-expanded="isPanelOpen"
      @click="togglePanel"
    >
      <LayersIcon />
      <span>{{ markerCountLabel }}</span>
    </button>

    <div v-if="isPanelOpen" class="marker-layer-panel__drawer" :style="panelStyle">
      <div
        class="marker-layer-panel__header marker-layer-panel__drag-handle"
        @pointerdown="startPanelDrag"
        @pointermove="movePanelDrag"
        @pointerup="stopPanelDrag"
        @pointercancel="stopPanelDrag"
      >
        <strong>{{ t('editor.markerManagement') }}</strong>
        <span>{{ markerCountLabel }}</span>
      </div>
      <div class="marker-layer-list">
        <div v-if="!markers.length" class="marker-layer-empty">{{ t('editor.noMarkers') }}</div>
        <div v-for="item in markers" :key="item.id" class="marker-layer-row" :class="{ active: selectedMarkerId === item.id }">
          <img v-if="item.icon_url" class="marker-row-icon" :src="item.icon_url" alt="" />
          <span v-else class="marker-row-icon marker-row-icon--empty" aria-hidden="true"></span>
          <button type="button" class="marker-title-button" @click="emit('edit-marker', item)">
            {{ markerTitle(item) }}
          </button>
          <span class="upload-button marker-replace-button" :title="t('editor.replaceMarkerIcon')">
            <UploadCloudIcon />
            <input type="file" accept="image/*,.svg" @change="emit('replace-marker-icon', { event: $event, marker: item })" />
          </span>
          <button type="button" class="marker-delete-button" :aria-label="t('editor.delete')" @click="emit('delete-marker', item.id)">
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
