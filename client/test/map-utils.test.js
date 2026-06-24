import { describe, expect, it } from 'vitest';

import {
  buildCampaignFormData,
  buildApiPath,
  buildCursorStyleText,
  buildGoogleTileTemplate,
  formatLatLng,
  iconHtml,
  markerInteractionSize,
  markerTooltipHtml
} from '../src/lib/map-utils.js';

describe('map utilities', () => {
  it('builds api paths with encoded params', () => {
    expect(buildApiPath('/api/campaigns/:token', { token: 'edit_a/b' })).toBe('/api/campaigns/edit_a%2Fb');
  });

  it('builds dynamic cursor css that hides native cursors for custom overlay cursors', () => {
    const css = buildCursorStyleText({
      default_cursor_url: '/wand.png',
      pointer_cursor_url: '/hand.png'
    });

    expect(css).toContain('cursor: none !important');
    expect(css).toContain('.leaflet-interactive');
    expect(css).toContain('.leaflet-marker-icon');
    expect(css).toContain('.magic-marker-shell');
    expect(css).not.toContain('url(/wand.png)');
    expect(css).not.toContain('url(/hand.png)');
  });

  it('formats live coordinates as x then y', () => {
    expect(formatLatLng({ lat: 1.234, lng: 5.678 })).toBe('X: 5.68, Y: 1.23');
  });

  it('builds sharp google tile templates with row and column swapped for Leaflet coords', () => {
    expect(buildGoogleTileTemplate('/tiles/campaign-a')).toBe('/tiles/campaign-a/{z}/{y}/{x}.png');
  });

  it('renders permanent marker tooltip html without coordinates', () => {
    expect(markerTooltipHtml({ title: 'Tower', lat: 10.26, lng: 20.74 })).toBe('<b>Tower</b>');
  });

  it('renders marker descriptions in tooltip html with escaping', () => {
    expect(
      markerTooltipHtml({
        title: '<Tower>',
        description: 'Secret <script>wing</script>',
        lat: 10,
        lng: 20
      })
    ).toBe('<b>&lt;Tower&gt;</b><br><span>Secret &lt;script&gt;wing&lt;/script&gt;</span>');
  });

  it('renders marker tooltip html from independent title and description visibility flags', () => {
    expect(
      markerTooltipHtml({
        title: 'Tower',
        description: 'Secret wing',
        show_title: false,
        show_description: true
      })
    ).toBe('<span>Secret wing</span>');
    expect(
      markerTooltipHtml({
        title: 'Tower',
        description: 'Secret wing',
        show_title: true,
        show_description: false
      })
    ).toBe('<b>Tower</b>');
    expect(
      markerTooltipHtml({
        title: 'Tower',
        description: 'Secret wing',
        show_title: false,
        show_description: false
      })
    ).toBe('');
  });

  it('renders marker URL as a sized marker icon image', () => {
    expect(iconHtml('/uploads/marker-icons/gate.webp', 'width:36px;height:36px;background:red')).toBe(
      '<img class="custom-magic-marker custom-magic-marker--image" src="/uploads/marker-icons/gate.webp" alt="" draggable="false" style="width:36px;height:36px;" />'
    );
  });

  it('uses visible marker art size to derive a minimum hit target', () => {
    expect(markerInteractionSize('width:48px;height:24px;')).toEqual({ width: 48, height: 40 });
    expect(markerInteractionSize('width:18px;height:18px;')).toEqual({ width: 40, height: 40 });
    expect(markerInteractionSize('')).toEqual({ width: 40, height: 40 });
  });

  it('falls back to marker style when marker URL is empty', () => {
    expect(iconHtml('', 'background:#d7b56d')).toBe(
      '<div class="custom-magic-marker" style="background:#d7b56d"></div>'
    );
  });

  it('builds campaign upload form data with configured fields', () => {
    const file = new File(['map'], 'map.png', { type: 'image/png' });
    const formData = buildCampaignFormData({
      file,
      name: 'Academy',
      default_cursor_url: '/wand.png',
      pointer_cursor_url: '/hand.png',
      max_zoom: 5
    });

    expect(formData.get('map')).toBe(file);
    expect(formData.get('name')).toBe('Academy');
    expect(formData.get('default_cursor_url')).toBe('/wand.png');
    expect(formData.get('pointer_cursor_url')).toBe('/hand.png');
    expect(formData.get('max_zoom')).toBe('5');
  });
});
