import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = readFileSync(fileURLToPath(new URL('../src/components/MapCanvas.vue', import.meta.url)), 'utf8');

describe('MapCanvas source contract', () => {
  it('keeps the Leaflet-owned map element class list static', () => {
    expect(source).toContain('<div id="map" class="h-full w-full"></div>');
    expect(source).not.toMatch(/<div[^>]+id="map"[^>]+:class=/);
  });
});
