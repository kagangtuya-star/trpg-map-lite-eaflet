import { DEFAULT_CURSOR_URL, DEFAULT_ICON_STYLE, DEFAULT_MARKER_ICON_URL, DEFAULT_MAX_ZOOM, POINTER_CURSOR_URL } from './defaults.js';
import { createCampaignTokens, createId } from './ids.js';

function nowIso() {
  return new Date().toISOString();
}

function isDescriptionVisible(value) {
  return value !== false && value !== 0;
}

function normalizeCampaign(input = {}) {
  const tokens = createCampaignTokens();
  return {
    id: createId(),
    name: input.name || 'Untitled Campaign',
    edit_token: input.edit_token || tokens.edit_token,
    view_token: input.view_token || tokens.view_token,
    default_cursor_url: input.default_cursor_url || DEFAULT_CURSOR_URL,
    pointer_cursor_url: input.pointer_cursor_url || POINTER_CURSOR_URL,
    default_marker_icon_url: input.default_marker_icon_url ?? DEFAULT_MARKER_ICON_URL,
    default_marker_icon_style: input.default_marker_icon_style || DEFAULT_ICON_STYLE,
    max_zoom: Number(input.max_zoom ?? DEFAULT_MAX_ZOOM),
    created_at: input.created_at || nowIso()
  };
}

function normalizeMarker(campaignId, input = {}, existing = {}) {
  const timestamp = nowIso();
  return {
    id: input.id || existing.id || createId(),
    campaign_id: campaignId,
    lat: Number(input.lat ?? existing.lat ?? 0),
    lng: Number(input.lng ?? existing.lng ?? 0),
    title: input.title || existing.title || 'New Location',
    show_title: isDescriptionVisible(input.show_title ?? existing.show_title ?? true),
    description: input.description ?? existing.description ?? '',
    show_description: isDescriptionVisible(input.show_description ?? existing.show_description ?? true),
    icon_style: input.icon_style || existing.icon_style || DEFAULT_ICON_STYLE,
    icon_url: input.icon_url ?? existing.icon_url ?? '',
    chat_url: input.chat_url || existing.chat_url || '',
    created_at: existing.created_at || timestamp,
    updated_at: timestamp
  };
}

export function createMemoryStore() {
  const campaigns = new Map();
  const markers = new Map();
  const markerIcons = new Map();

  function findCampaignByToken(token) {
    for (const campaign of campaigns.values()) {
      if (campaign.edit_token === token) return { campaign, mode: 'edit' };
      if (campaign.view_token === token) return { campaign, mode: 'view' };
    }
    return null;
  }

  function requireEditCampaign(editToken) {
    const result = findCampaignByToken(editToken);
    if (!result || result.mode !== 'edit') {
      const error = new Error('Edit token not found');
      error.status = 404;
      throw error;
    }
    return result.campaign;
  }

  return {
    createCampaign(input = {}) {
      const campaign = normalizeCampaign(input);
      campaigns.set(campaign.id, campaign);
      markers.set(campaign.id, []);
      markerIcons.set(campaign.id, []);
      return campaign;
    },

    getByToken(token) {
      const result = findCampaignByToken(token);
      if (!result) return null;
      return {
        mode: result.mode,
        campaign: result.campaign,
        markers: [...(markers.get(result.campaign.id) || [])],
        marker_icons: [...(markerIcons.get(result.campaign.id) || [])]
      };
    },

    updateConfig(editToken, patch = {}) {
      const campaign = requireEditCampaign(editToken);
      const next = {
        ...campaign,
        default_cursor_url: patch.default_cursor_url ?? campaign.default_cursor_url,
        pointer_cursor_url: patch.pointer_cursor_url ?? campaign.pointer_cursor_url,
        default_marker_icon_url: patch.default_marker_icon_url ?? campaign.default_marker_icon_url,
        default_marker_icon_style: patch.default_marker_icon_style || campaign.default_marker_icon_style,
        name: patch.name ?? campaign.name,
        max_zoom: Number(patch.max_zoom ?? campaign.max_zoom)
      };
      campaigns.set(campaign.id, next);
      return next;
    },

    upsertMarker(editToken, input = {}) {
      const campaign = requireEditCampaign(editToken);
      const campaignMarkers = markers.get(campaign.id) || [];
      const index = campaignMarkers.findIndex((marker) => marker.id === input.id);
      const existing = index >= 0 ? campaignMarkers[index] : undefined;
      const marker = normalizeMarker(campaign.id, input, existing);
      if (index >= 0) campaignMarkers[index] = marker;
      else campaignMarkers.push(marker);
      markers.set(campaign.id, campaignMarkers);
      return marker;
    },

    deleteMarker(editToken, markerId) {
      const campaign = requireEditCampaign(editToken);
      const campaignMarkers = markers.get(campaign.id) || [];
      const next = campaignMarkers.filter((marker) => marker.id !== markerId);
      markers.set(campaign.id, next);
      return next.length !== campaignMarkers.length;
    },

    addMarkerIcon(editToken, input = {}) {
      const campaign = requireEditCampaign(editToken);
      const icon = {
        id: createId(),
        campaign_id: campaign.id,
        url: input.url,
        name: input.name || '',
        created_at: nowIso()
      };
      const icons = markerIcons.get(campaign.id) || [];
      markerIcons.set(campaign.id, [...icons, icon]);
      return icon;
    },

    deleteMarkerIcon(editToken, iconId) {
      const campaign = requireEditCampaign(editToken);
      const icons = markerIcons.get(campaign.id) || [];
      const icon = icons.find((item) => item.id === iconId);
      if (!icon) return false;
      if (campaign.default_marker_icon_url === icon.url) {
        throw new Error('Marker icon is in use');
      }
      const campaignMarkers = markers.get(campaign.id) || [];
      if (campaignMarkers.some((marker) => marker.icon_url === icon.url)) {
        throw new Error('Marker icon is in use');
      }
      markerIcons.set(
        campaign.id,
        icons.filter((item) => item.id !== iconId)
      );
      return true;
    }
  };
}
