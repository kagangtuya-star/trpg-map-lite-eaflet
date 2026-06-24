import { DEFAULT_CURSOR_URL, DEFAULT_ICON_STYLE, DEFAULT_MARKER_ICON_URL, DEFAULT_MAX_ZOOM, POINTER_CURSOR_URL } from './defaults.js';
import { createCampaignTokens, createId } from './ids.js';

function nowIso() {
  return new Date().toISOString();
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

export function createSqliteStore(db) {
  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (
      id, name, edit_token, view_token, default_cursor_url, pointer_cursor_url, default_marker_icon_url, default_marker_icon_style, max_zoom, created_at
    ) VALUES (
      @id, @name, @edit_token, @view_token, @default_cursor_url, @pointer_cursor_url, @default_marker_icon_url, @default_marker_icon_style, @max_zoom, @created_at
    )
  `);
  const selectByToken = db.prepare(`
    SELECT * FROM campaigns WHERE edit_token = ? OR view_token = ?
  `);
  const selectMarkers = db.prepare(`
    SELECT * FROM markers WHERE campaign_id = ? ORDER BY created_at ASC
  `);
  const selectMarkerIcons = db.prepare(`
    SELECT * FROM campaign_marker_icons WHERE campaign_id = ? ORDER BY created_at ASC
  `);
  const updateCampaign = db.prepare(`
    UPDATE campaigns
    SET name = @name,
        default_cursor_url = @default_cursor_url,
        pointer_cursor_url = @pointer_cursor_url,
        default_marker_icon_url = @default_marker_icon_url,
        default_marker_icon_style = @default_marker_icon_style,
        max_zoom = @max_zoom
    WHERE id = @id
  `);
  const selectMarkerById = db.prepare('SELECT * FROM markers WHERE id = ? AND campaign_id = ?');
  const insertMarker = db.prepare(`
    INSERT INTO markers (
      id, campaign_id, lat, lng, title, description, icon_style, icon_url, chat_url, created_at, updated_at
    ) VALUES (
      @id, @campaign_id, @lat, @lng, @title, @description, @icon_style, @icon_url, @chat_url, @created_at, @updated_at
    )
  `);
  const updateMarker = db.prepare(`
    UPDATE markers
    SET lat = @lat,
        lng = @lng,
        title = @title,
        description = @description,
        icon_style = @icon_style,
        icon_url = @icon_url,
        chat_url = @chat_url,
        updated_at = @updated_at
    WHERE id = @id AND campaign_id = @campaign_id
  `);
  const deleteMarkerStatement = db.prepare('DELETE FROM markers WHERE id = ? AND campaign_id = ?');
  const insertMarkerIcon = db.prepare(`
    INSERT INTO campaign_marker_icons (id, campaign_id, url, name, created_at)
    VALUES (@id, @campaign_id, @url, @name, @created_at)
  `);
  const selectMarkerIconById = db.prepare('SELECT * FROM campaign_marker_icons WHERE id = ? AND campaign_id = ?');
  const deleteMarkerIconStatement = db.prepare('DELETE FROM campaign_marker_icons WHERE id = ? AND campaign_id = ?');
  const countMarkersUsingIcon = db.prepare('SELECT COUNT(*) AS count FROM markers WHERE campaign_id = ? AND icon_url = ?');

  function findCampaignByToken(token) {
    const campaign = selectByToken.get(token, token);
    if (!campaign) return null;
    return {
      campaign,
      mode: campaign.edit_token === token ? 'edit' : 'view'
    };
  }

  function requireEditCampaign(editToken) {
    const result = findCampaignByToken(editToken);
    if (!result || result.mode !== 'edit') throw notFound('Edit token not found');
    return result.campaign;
  }

  return {
    createCampaign(input = {}) {
      const tokens = createCampaignTokens();
      const campaign = {
        id: input.id || createId(),
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
      insertCampaign.run(campaign);
      return campaign;
    },

    getByToken(token) {
      const result = findCampaignByToken(token);
      if (!result) return null;
      return {
        mode: result.mode,
        campaign: result.campaign,
        markers: selectMarkers.all(result.campaign.id),
        marker_icons: selectMarkerIcons.all(result.campaign.id)
      };
    },

    updateConfig(editToken, patch = {}) {
      const campaign = requireEditCampaign(editToken);
      const next = {
        ...campaign,
        name: patch.name ?? campaign.name,
        default_cursor_url: patch.default_cursor_url ?? campaign.default_cursor_url,
        pointer_cursor_url: patch.pointer_cursor_url ?? campaign.pointer_cursor_url,
        default_marker_icon_url: patch.default_marker_icon_url ?? campaign.default_marker_icon_url,
        default_marker_icon_style: patch.default_marker_icon_style || campaign.default_marker_icon_style,
        max_zoom: Number(patch.max_zoom ?? campaign.max_zoom)
      };
      updateCampaign.run(next);
      return next;
    },

    upsertMarker(editToken, input = {}) {
      const campaign = requireEditCampaign(editToken);
      const existing = input.id ? selectMarkerById.get(input.id, campaign.id) : null;
      const timestamp = nowIso();
      const marker = {
        id: input.id || createId(),
        campaign_id: campaign.id,
        lat: Number(input.lat ?? existing?.lat ?? 0),
        lng: Number(input.lng ?? existing?.lng ?? 0),
        title: input.title || existing?.title || 'New Location',
        description: input.description ?? existing?.description ?? '',
        icon_style: input.icon_style || existing?.icon_style || DEFAULT_ICON_STYLE,
        icon_url: input.icon_url ?? existing?.icon_url ?? '',
        chat_url: input.chat_url || existing?.chat_url || '',
        created_at: existing?.created_at || timestamp,
        updated_at: timestamp
      };
      if (existing) updateMarker.run(marker);
      else insertMarker.run(marker);
      return marker;
    },

    deleteMarker(editToken, markerId) {
      const campaign = requireEditCampaign(editToken);
      return deleteMarkerStatement.run(markerId, campaign.id).changes > 0;
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
      insertMarkerIcon.run(icon);
      return icon;
    },

    deleteMarkerIcon(editToken, iconId) {
      const campaign = requireEditCampaign(editToken);
      const icon = selectMarkerIconById.get(iconId, campaign.id);
      if (!icon) return false;
      if (campaign.default_marker_icon_url === icon.url) {
        throw new Error('Marker icon is in use');
      }
      const usage = countMarkersUsingIcon.get(campaign.id, icon.url);
      if (Number(usage?.count || 0) > 0) {
        throw new Error('Marker icon is in use');
      }
      return deleteMarkerIconStatement.run(iconId, campaign.id).changes > 0;
    }
  };
}
