import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const popoverSource = readFileSync(fileURLToPath(new URL('../src/components/MarkerPopover.vue', import.meta.url)), 'utf8');
const stylesSource = readFileSync(fileURLToPath(new URL('../src/styles/app.css', import.meta.url)), 'utf8');

describe('MarkerPopover source contract', () => {
  it('keeps the marker form inside the viewport when opened near edges', () => {
    expect(popoverSource).toContain('ResizeObserver');
    expect(popoverSource).toContain('getPopoverBounds');
    expect(popoverSource).toContain('parentElement');
    expect(popoverSource).toContain('clampToViewport');
  });

  it('allows tall marker forms to scroll instead of overflowing the screen', () => {
    expect(stylesSource).toContain('max-height: calc(100% - 24px)');
    expect(stylesSource).toContain('overflow: auto');
  });

  it('allows choosing campaign marker icons', () => {
    expect(popoverSource).toContain('markerIcons');
    expect(popoverSource).toContain('icon_url');
    expect(popoverSource).toContain('marker-icon-picker');
    expect(popoverSource).toContain('selectMarkerIcon');
    expect(popoverSource).toContain('clearMarkerIcon');
    expect(popoverSource).toContain('styleIconPreview');
    expect(popoverSource).toContain('marker-style-controls');
    expect(popoverSource).toContain('type="color"');
    expect(popoverSource).toContain('type="range"');
    expect(popoverSource).not.toContain('<textarea v-model="form.icon_style"');
  });

  it('keeps marker size controls and live preview available for every icon type', () => {
    expect(popoverSource).toContain('marker-preview');
    expect(popoverSource).toContain('selectedMarkerPreviewStyle');
    expect(popoverSource).toContain('selectedMarkerPreviewUrl');
    expect(popoverSource).toContain('marker-size-value');
    expect(popoverSource).not.toContain('<div v-if="usesStyleIcon" class="marker-style-controls">');
  });

  it('anchors absolute marker previews inside icon choice buttons', () => {
    expect(stylesSource).toContain('.marker-icon-choice');
    expect(stylesSource).toContain('position: relative');
    expect(stylesSource).toContain('.marker-preview');
  });

  it('lets markers opt out of always-visible titles and descriptions independently', () => {
    expect(popoverSource).toContain('show_title');
    expect(popoverSource).toContain('show_description');
    expect(popoverSource).toContain("marker.show_title !== false");
    expect(popoverSource).toContain("marker.show_description !== false");
    expect(popoverSource).toContain('v-model="form.show_title"');
    expect(popoverSource).toContain('v-model="form.show_description"');
    expect(popoverSource).toContain("t('marker.showTitle')");
    expect(popoverSource).toContain("t('marker.showDescription')");
    expect(popoverSource).toContain('class="visibility-toggle-row"');
    expect(stylesSource).toContain('.visibility-toggle-row');
    expect(stylesSource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
  });

  it('auto-saves once when clicking outside the whole marker editor', () => {
    expect(popoverSource).toContain("document.addEventListener('pointerdown', handleDocumentPointerDown, true)");
    expect(popoverSource).toContain("document.removeEventListener('pointerdown', handleDocumentPointerDown, true)");
    expect(popoverSource).toContain('function handleDocumentPointerDown(event)');
    expect(popoverSource).toContain('if (popoverElement.value?.contains(event.target)) return;');
    expect(popoverSource).toContain('save();');
  });
});
