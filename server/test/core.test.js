import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createCampaignTokens, createId } from '../src/ids.js';
import { createMemoryStore } from '../src/memory-store.js';
import { buildExportConfig } from '../src/export-config.js';
import { normalizeArchiveConfig, replaceDirectoryContents, validateArchiveEntryName } from '../src/import-service.js';
import { ensureDatabaseDirectory } from '../src/db.js';
import { TILE_EXTENSION, generateTiles, getGeneratedMaxZoom, getGeneratedTileBounds } from '../src/tile-service.js';

test('createCampaignTokens returns distinct edit and view tokens', () => {
  const tokens = createCampaignTokens();

  assert.match(tokens.edit_token, /^edit_[a-f0-9]{24}$/);
  assert.match(tokens.view_token, /^view_[a-f0-9]{24}$/);
  assert.notEqual(tokens.edit_token, tokens.view_token);
});

test('createId returns uuid-like ids', () => {
  assert.match(createId(), /^[0-9a-f-]{36}$/);
});

test('memory store resolves campaign mode from either token', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({
    name: 'Arcane College',
    max_zoom: 4,
    default_cursor_url: '/cursors/wand.png',
    pointer_cursor_url: '/cursors/hand.png'
  });

  assert.equal(store.getByToken(campaign.edit_token).mode, 'edit');
  assert.equal(store.getByToken(campaign.view_token).mode, 'view');
});

test('memory store persists default marker icon settings on campaign config', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Default Marker Map' });

  const updated = store.updateConfig(campaign.edit_token, {
    default_marker_icon_url: '/uploads/marker-icons/default.webp',
    default_marker_icon_style: 'width:36px;height:36px;background:#d7b56d;border:2px solid #3a2b1f;'
  });

  assert.equal(updated.default_marker_icon_url, '/uploads/marker-icons/default.webp');
  assert.equal(updated.default_marker_icon_style, 'width:36px;height:36px;background:#d7b56d;border:2px solid #3a2b1f;');
  assert.equal(store.getByToken(campaign.view_token).campaign.default_marker_icon_url, '/uploads/marker-icons/default.webp');
});

test('memory store upserts and deletes markers for edit token', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Map', max_zoom: 3 });

  const marker = store.upsertMarker(campaign.edit_token, {
    lat: 12.5,
    lng: 44.25,
    title: 'Library',
    show_title: false,
    description: 'Quiet archive wing',
    show_description: false,
    icon_style: 'background:#d7b56d',
    chat_url: 'https://chat.example/library'
  });

  const fetched = store.getByToken(campaign.view_token);
  assert.equal(fetched.markers.length, 1);
  assert.equal(fetched.markers[0].title, 'Library');
  assert.equal(fetched.markers[0].show_title, false);
  assert.equal(fetched.markers[0].description, 'Quiet archive wing');
  assert.equal(fetched.markers[0].show_description, false);

  assert.equal(store.deleteMarker(campaign.edit_token, marker.id), true);
  assert.equal(store.getByToken(campaign.view_token).markers.length, 0);
});

test('memory store defaults marker title and description visibility to true', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Visibility Default' });

  const marker = store.upsertMarker(campaign.edit_token, {
    lat: 1,
    lng: 2,
    title: 'Visible'
  });

  assert.equal(marker.show_title, true);
  assert.equal(marker.show_description, true);
  assert.equal(store.getByToken(campaign.view_token).markers[0].show_title, true);
  assert.equal(store.getByToken(campaign.view_token).markers[0].show_description, true);
});

test('memory store treats numeric zero as hidden marker title and description', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Numeric Visibility' });

  const marker = store.upsertMarker(campaign.edit_token, {
    lat: 1,
    lng: 2,
    title: 'Hidden',
    show_title: 0,
    show_description: 0
  });

  assert.equal(marker.show_title, false);
  assert.equal(marker.show_description, false);
  assert.equal(store.getByToken(campaign.view_token).markers[0].show_title, false);
  assert.equal(store.getByToken(campaign.view_token).markers[0].show_description, false);
});

test('memory store saves campaign marker icons and marker icon_url', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({
    name: 'Icon Map',
    default_cursor_url: '/cursors/wand.png',
    pointer_cursor_url: '/cursors/hand.png'
  });

  const firstIcon = store.addMarkerIcon(campaign.edit_token, {
    url: '/uploads/marker-icons/a.webp',
    name: 'a.webp'
  });
  const secondIcon = store.addMarkerIcon(campaign.edit_token, {
    url: '/uploads/marker-icons/b.webp',
    name: 'b.webp'
  });
  const marker = store.upsertMarker(campaign.edit_token, {
    lat: 1,
    lng: 2,
    title: 'Gate',
    description: '',
    icon_style: 'background:#d7b56d',
    icon_url: firstIcon.url,
    chat_url: ''
  });

  const fetched = store.getByToken(campaign.edit_token);
  assert.equal(fetched.marker_icons.length, 2);
  assert.equal(fetched.marker_icons[0].url, firstIcon.url);
  assert.equal(fetched.marker_icons[1].url, secondIcon.url);
  assert.equal(fetched.markers[0].id, marker.id);
  assert.equal(fetched.markers[0].icon_url, firstIcon.url);
});

test('memory store refuses to delete marker icons that are in use', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Icon Guard' });
  const icon = store.addMarkerIcon(campaign.edit_token, {
    url: '/uploads/marker-icons/used.webp',
    name: 'used.webp'
  });

  store.upsertMarker(campaign.edit_token, {
    lat: 1,
    lng: 2,
    title: 'Used',
    description: '',
    icon_style: 'background:#d7b56d',
    icon_url: icon.url,
    chat_url: ''
  });

  assert.throws(() => store.deleteMarkerIcon(campaign.edit_token, icon.id), /Marker icon is in use/);
});

test('memory store refuses to delete marker icons used as the campaign default', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Default Icon Guard' });
  const icon = store.addMarkerIcon(campaign.edit_token, {
    url: '/uploads/marker-icons/default.webp',
    name: 'default.webp'
  });
  store.updateConfig(campaign.edit_token, {
    default_marker_icon_url: icon.url
  });

  assert.throws(() => store.deleteMarkerIcon(campaign.edit_token, icon.id), /Marker icon is in use/);
});

test('memory store allows clearing marker icon_url back to style rendering', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Icon Clear' });
  const marker = store.upsertMarker(campaign.edit_token, {
    lat: 1,
    lng: 2,
    title: 'Clear',
    icon_url: '/uploads/marker-icons/clear.webp'
  });

  const cleared = store.upsertMarker(campaign.edit_token, {
    ...marker,
    icon_url: ''
  });

  assert.equal(cleared.icon_url, '');
  assert.equal(store.getByToken(campaign.edit_token).markers[0].icon_url, '');
});

test('buildExportConfig strips edit token and keeps view data', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Exported', max_zoom: 2 });
  store.updateConfig(campaign.edit_token, {
    default_marker_icon_url: '/uploads/marker-icons/default.webp',
    default_marker_icon_style: 'width:28px;height:28px;background:#d7b56d;border:2px solid #3a2b1f;'
  });
  const icon = store.addMarkerIcon(campaign.edit_token, {
    url: '/uploads/marker-icons/gate.webp',
    name: 'gate.webp'
  });
  store.upsertMarker(campaign.edit_token, {
    lat: 1,
    lng: 2,
    title: 'Gate',
    show_title: false,
    description: 'North entrance',
    show_description: false,
    icon_url: '/uploads/marker-icons/gate.webp'
  });

  const config = buildExportConfig(store.getByToken(campaign.edit_token));

  assert.equal(config.mode, 'view');
  assert.equal(config.campaign.view_token, campaign.view_token);
  assert.equal(config.campaign.edit_token, undefined);
  assert.equal(config.campaign.default_marker_icon_url, '/uploads/marker-icons/default.webp');
  assert.equal(config.campaign.default_marker_icon_style, 'width:28px;height:28px;background:#d7b56d;border:2px solid #3a2b1f;');
  assert.equal(config.markers[0].title, 'Gate');
  assert.equal(config.markers[0].show_title, false);
  assert.equal(config.markers[0].description, 'North entrance');
  assert.equal(config.markers[0].show_description, false);
  assert.equal(config.markers[0].icon_url, '/uploads/marker-icons/gate.webp');
  assert.equal(config.marker_icons.length, 1);
  assert.equal(config.marker_icons[0].id, icon.id);
  assert.equal(config.marker_icons[0].campaign_id, campaign.id);
  assert.equal(config.marker_icons[0].url, '/uploads/marker-icons/gate.webp');
  assert.equal(config.marker_icons[0].name, 'gate.webp');
});

test('memory store replaces archive data while preserving current campaign identity', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Current', max_zoom: 2 });
  const oldMarker = store.upsertMarker(campaign.edit_token, { title: 'Old', lat: 1, lng: 1 });

  const replaced = store.replaceCampaignArchive(campaign.edit_token, {
    campaign: {
      id: 'imported-id',
      name: 'Imported',
      view_token: 'view_imported',
      default_cursor_url: '/uploads/cursors/imported.webp',
      pointer_cursor_url: '/uploads/cursors/pointer.webp',
      default_marker_icon_url: '/uploads/marker-icons/default.webp',
      default_marker_icon_style: 'width:20px;height:20px;background:#f59e0b;border:2px solid #111;',
      max_zoom: 5
    },
    markers: [
      {
        id: 'marker-imported',
        campaign_id: 'imported-id',
        lat: 3,
        lng: 4,
        title: 'Imported Gate',
        show_title: false,
        description: 'New marker',
        show_description: true,
        icon_style: 'background:#fff',
        icon_url: '/uploads/marker-icons/default.webp',
        chat_url: ''
      }
    ],
    marker_icons: [
      {
        id: 'icon-imported',
        campaign_id: 'imported-id',
        url: '/uploads/marker-icons/default.webp',
        name: 'default.webp',
        created_at: '2026-06-24T00:00:00.000Z'
      }
    ]
  });

  assert.equal(replaced.campaign.id, campaign.id);
  assert.equal(replaced.campaign.edit_token, campaign.edit_token);
  assert.equal(replaced.campaign.view_token, campaign.view_token);
  assert.equal(replaced.campaign.name, 'Imported');
  assert.equal(replaced.markers.length, 1);
  assert.equal(replaced.markers[0].id, 'marker-imported');
  assert.equal(replaced.markers[0].campaign_id, campaign.id);
  assert.notEqual(replaced.markers[0].id, oldMarker.id);
  assert.equal(replaced.marker_icons[0].id, 'icon-imported');
  assert.equal(replaced.marker_icons[0].campaign_id, campaign.id);
});

test('validateArchiveEntryName rejects unsafe zip paths', () => {
  assert.equal(validateArchiveEntryName('config.json'), true);
  assert.equal(validateArchiveEntryName('tiles/0/0/0.png'), true);
  assert.equal(validateArchiveEntryName('../config.json'), false);
  assert.equal(validateArchiveEntryName('/config.json'), false);
  assert.equal(validateArchiveEntryName('tiles\\0\\0.png'), false);
});

test('normalizeArchiveConfig preserves imported item ids but rewrites campaign identity', () => {
  const normalized = normalizeArchiveConfig(
    {
      campaign: { id: 'source', name: 'Imported', view_token: 'view_source', max_zoom: 4 },
      markers: [{ id: 'm1', campaign_id: 'source', lat: 1, lng: 2, title: 'Gate' }],
      marker_icons: [{ id: 'i1', campaign_id: 'source', url: '/uploads/marker-icons/i.webp', name: 'i.webp' }]
    },
    { id: 'current', edit_token: 'edit_current', view_token: 'view_current' }
  );

  assert.equal(normalized.campaign.id, 'current');
  assert.equal(normalized.campaign.edit_token, 'edit_current');
  assert.equal(normalized.campaign.view_token, 'view_current');
  assert.equal(normalized.markers[0].id, 'm1');
  assert.equal(normalized.markers[0].campaign_id, 'current');
  assert.equal(normalized.marker_icons[0].id, 'i1');
  assert.equal(normalized.marker_icons[0].campaign_id, 'current');
});

test('replaceDirectoryContents overwrites tile contents without renaming the target directory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-map-replace-'));
  const source = path.join(root, 'source');
  const target = path.join(root, 'target');
  await fs.mkdir(path.join(source, '0', '0'), { recursive: true });
  await fs.mkdir(path.join(target, 'old'), { recursive: true });
  await fs.writeFile(path.join(source, '0', '0', '0.png'), 'new');
  await fs.writeFile(path.join(target, 'old', 'tile.png'), 'old');

  await replaceDirectoryContents(source, target);

  assert.equal(await fs.readFile(path.join(target, '0', '0', '0.png'), 'utf8'), 'new');
  await assert.rejects(fs.access(path.join(target, 'old', 'tile.png')));
});

test('ensureDatabaseDirectory creates missing parent directory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-map-db-'));
  const dbPath = path.join(root, 'nested', 'trpg_map.db');

  await ensureDatabaseDirectory(dbPath);

  const stat = await fs.stat(path.dirname(dbPath));
  assert.equal(stat.isDirectory(), true);
});

test('generateTiles writes png tiles for the client tile URL template', async () => {
  const calls = [];
  const outputDir = await generateTiles({
    filePath: '/tmp/source.jpg',
    campaignId: 'tile-format-test',
    sharpFactory(filePath) {
      calls.push(['sharp', filePath]);
      return {
        png() {
          calls.push(['png']);
          return this;
        },
        tile(options) {
          calls.push(['tile', options]);
          return this;
        },
        async toFile(targetPath) {
          calls.push(['toFile', targetPath]);
        }
      };
    }
  });

  assert.equal(TILE_EXTENSION, 'png');
  assert.deepEqual(calls.slice(0, 3), [
    ['sharp', '/tmp/source.jpg'],
    ['png'],
    ['tile', { size: 256, layout: 'google' }]
  ]);
  assert.equal(calls[3][1], outputDir);
});

test('getGeneratedMaxZoom returns highest numeric tile level', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-map-zoom-'));
  await fs.mkdir(path.join(root, '0'), { recursive: true });
  await fs.mkdir(path.join(root, '2'), { recursive: true });
  await fs.mkdir(path.join(root, 'blank'), { recursive: true });

  assert.equal(await getGeneratedMaxZoom(root), 2);
});

test('getGeneratedTileBounds returns CRS simple bounds from highest tile grid', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-map-bounds-'));
  await fs.mkdir(path.join(root, '3', '0'), { recursive: true });
  await fs.mkdir(path.join(root, '3', '4'), { recursive: true });
  await fs.writeFile(path.join(root, '3', '0', '0.png'), '');
  await fs.writeFile(path.join(root, '3', '4', '7.png'), '');

  assert.deepEqual(await getGeneratedTileBounds(root), {
    max_zoom: 3,
    south: -160,
    west: 0,
    north: 0,
    east: 256
  });
});
