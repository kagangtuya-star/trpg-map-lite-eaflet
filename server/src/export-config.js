import { DEFAULT_ICON_STYLE } from './defaults.js';

export function buildExportConfig(result, campaignPatch = {}) {
  return {
    mode: 'view',
    campaign: {
      id: result.campaign.id,
      name: result.campaign.name,
      view_token: result.campaign.view_token,
      default_cursor_url: result.campaign.default_cursor_url,
      pointer_cursor_url: result.campaign.pointer_cursor_url,
      default_marker_icon_url: result.campaign.default_marker_icon_url || '',
      default_marker_icon_style: result.campaign.default_marker_icon_style || DEFAULT_ICON_STYLE,
      max_zoom: result.campaign.max_zoom,
      ...campaignPatch
    },
    markers: result.markers.map((marker) => ({
      id: marker.id,
      lat: marker.lat,
      lng: marker.lng,
      title: marker.title,
      description: marker.description || '',
      icon_style: marker.icon_style,
      icon_url: marker.icon_url || '',
      chat_url: marker.chat_url
    }))
  };
}
