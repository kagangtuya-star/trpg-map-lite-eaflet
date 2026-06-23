import fs from 'node:fs';
import path from 'node:path';

import { buildExportConfig } from './export-config.js';
import { getGeneratedTileBounds, TILES_DIR } from './tile-service.js';

const OFFLINE_VIEWER_DIR = path.resolve(process.cwd(), 'public/offline-viewer');

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
  archive.append(JSON.stringify(buildExportConfig(result, campaignPatch), null, 2), { name: 'config.json' });

  await archive.finalize();
}
