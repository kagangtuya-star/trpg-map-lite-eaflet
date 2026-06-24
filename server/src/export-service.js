import fs from 'node:fs';
import path from 'node:path';

import { buildExportConfig } from './export-config.js';
import { getGeneratedTileBounds, PUBLIC_DIR, TILES_DIR } from './tile-service.js';

const OFFLINE_VIEWER_DIR = path.resolve(process.cwd(), 'public/offline-viewer');

function uploadArchivePath(url) {
  if (!url || typeof url !== 'string') return '';
  if (!url.startsWith('/uploads/cursors/') && !url.startsWith('/uploads/marker-icons/')) return '';
  return `assets${url}`;
}

function uploadDiskPath(url) {
  const archivePath = uploadArchivePath(url);
  if (!archivePath) return '';
  return path.join(PUBLIC_DIR, url.replace(/^\//, ''));
}

function collectUploadUrls(result) {
  const urls = new Set();
  const campaign = result.campaign || {};
  [campaign.default_cursor_url, campaign.pointer_cursor_url, campaign.default_marker_icon_url].forEach((url) => {
    if (uploadArchivePath(url)) urls.add(url);
  });
  (result.marker_icons || []).forEach((icon) => {
    if (uploadArchivePath(icon.url)) urls.add(icon.url);
  });
  (result.markers || []).forEach((marker) => {
    if (uploadArchivePath(marker.icon_url)) urls.add(marker.icon_url);
  });
  return [...urls];
}

export async function streamCampaignZip({ archiveFactory, store, editToken, response }) {
  const result = store.getByToken(editToken);
  if (!result || result.mode !== 'edit') {
    response.status(404).json({ error: 'Edit token not found' });
    return;
  }

  const archive = archiveFactory('zip', { zlib: { level: 9 } });
  response.setHeader('Content-Type', 'application/zip');
  response.setHeader('Content-Disposition', 'attachment; filename="map.zip"');
  archive.pipe(response);

  const tileDir = path.join(TILES_DIR, result.campaign.id);
  let campaignPatch = {};
  if (fs.existsSync(tileDir)) {
    const tileBounds = await getGeneratedTileBounds(tileDir);
    campaignPatch = { max_zoom: tileBounds.max_zoom, tile_bounds: tileBounds };
  }
  if (fs.existsSync(tileDir)) archive.directory(tileDir, 'tiles');
  if (fs.existsSync(OFFLINE_VIEWER_DIR)) archive.directory(OFFLINE_VIEWER_DIR, false);
  for (const url of collectUploadUrls(result)) {
    const diskPath = uploadDiskPath(url);
    if (diskPath && fs.existsSync(diskPath)) {
      archive.file(diskPath, { name: uploadArchivePath(url) });
    }
  }
  archive.append(JSON.stringify(buildExportConfig(result, campaignPatch), null, 2), { name: 'config.json' });

  await archive.finalize();
}
