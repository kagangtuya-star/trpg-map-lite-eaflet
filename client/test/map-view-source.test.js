import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(fileURLToPath(new URL('../src/views/MapView.vue', import.meta.url)), 'utf8');

describe('MapView source contract', () => {
  it('persists marker coordinate drags immediately through the existing marker save API', () => {
    expect(source).toContain('async function saveMarkerDrag(event)');
    expect(source).toContain('await apiClient.saveMarker(token.value, marker)');
    expect(source).toContain('@marker-drag-start="closeMarkerPopover"');
    expect(source).toContain('@marker-drag-end="saveMarkerDrag"');
  });

  it('updates saved marker state locally instead of reloading the campaign', () => {
    expect(source).toContain('function applySavedMarker(marker)');
    expect(source).toContain('applySavedMarker(result.marker)');

    const saveMarkerDragSource = source.match(/async function saveMarkerDrag\(event\) \{[\s\S]*?\n\}/)?.[0] || '';
    expect(saveMarkerDragSource).not.toContain('loadCampaign');
  });

  it('removes deleted markers from local state without reloading the campaign', () => {
    expect(source).toContain('function removeSavedMarker(markerId)');
    expect(source).toContain('removeSavedMarker(id)');

    const deleteMarkerSource = source.match(/async function deleteMarker\(id\) \{[\s\S]*?\n\}/)?.[0] || '';
    expect(deleteMarkerSource).not.toContain('loadCampaign');
  });

  it('creates draft markers from campaign default marker icon settings', () => {
    expect(source).toContain('default_marker_icon_style');
    expect(source).toContain('default_marker_icon_url');
    const createDraftSource = source.match(/function createDraftMarker\(event\) \{[\s\S]*?\n\}/)?.[0] || '';
    expect(createDraftSource).toContain('previewCampaign.value || payload.value?.campaign || {}');
    expect(createDraftSource).toContain('campaign.default_marker_icon_style');
    expect(createDraftSource).toContain('campaign.default_marker_icon_url ??');
    expect(createDraftSource).not.toContain("icon_style: 'background:#d7b56d;border:2px solid #3a2b1f;'");
  });

  it('prevents duplicate marker saves while a marker save is already in flight', () => {
    expect(source).toContain("const savingMarker = ref(false)");
    const saveMarkerSource = source.match(/async function saveMarker\(marker\) \{[\s\S]*?\n\}/)?.[0] || '';
    expect(saveMarkerSource).toContain('if (savingMarker.value) return;');
    expect(saveMarkerSource).toContain('savingMarker.value = true;');
    expect(saveMarkerSource).toContain('finally');
    expect(saveMarkerSource).toContain('savingMarker.value = false;');
  });
});
