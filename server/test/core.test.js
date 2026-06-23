import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createCampaignTokens, createId } from '../src/ids.js';
import { createMemoryStore } from '../src/memory-store.js';
import { buildExportConfig } from '../src/export-config.js';
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

test('memory store upserts and deletes markers for edit token', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Map', max_zoom: 3 });

  const marker = store.upsertMarker(campaign.edit_token, {
    lat: 12.5,
    lng: 44.25,
    title: 'Library',
    description: 'Quiet archive wing',
    icon_style: 'background:#d7b56d',
    chat_url: 'https://chat.example/library'
  });

  const fetched = store.getByToken(campaign.view_token);
  assert.equal(fetched.markers.length, 1);
  assert.equal(fetched.markers[0].title, 'Library');
  assert.equal(fetched.markers[0].description, 'Quiet archive wing');

  assert.equal(store.deleteMarker(campaign.edit_token, marker.id), true);
  assert.equal(store.getByToken(campaign.view_token).markers.length, 0);
});

test('buildExportConfig strips edit token and keeps view data', () => {
  const store = createMemoryStore();
  const campaign = store.createCampaign({ name: 'Exported', max_zoom: 2 });
  store.upsertMarker(campaign.edit_token, {
    lat: 1,
    lng: 2,
    title: 'Gate',
    description: 'North entrance'
  });

  const config = buildExportConfig(store.getByToken(campaign.edit_token));

  assert.equal(config.mode, 'view');
  assert.equal(config.campaign.view_token, campaign.view_token);
  assert.equal(config.campaign.edit_token, undefined);
  assert.equal(config.markers[0].title, 'Gate');
  assert.equal(config.markers[0].description, 'North entrance');
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
