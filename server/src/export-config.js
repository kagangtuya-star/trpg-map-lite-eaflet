export function buildExportConfig(result, campaignPatch = {}) {
  return {
    mode: 'view',
    campaign: {
      id: result.campaign.id,
      name: result.campaign.name,
      view_token: result.campaign.view_token,
      default_cursor_url: result.campaign.default_cursor_url,
      pointer_cursor_url: result.campaign.pointer_cursor_url,
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
      chat_url: marker.chat_url
    }))
  };
}
