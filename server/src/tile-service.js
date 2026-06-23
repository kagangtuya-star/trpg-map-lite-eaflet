import fs from 'node:fs/promises';
import path from 'node:path';

export const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
export const TILES_DIR = path.join(PUBLIC_DIR, 'tiles');
export const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
export const CURSORS_DIR = path.join(UPLOADS_DIR, 'cursors');
export const TILE_EXTENSION = 'png';

export async function ensureRuntimeDirs() {
  await fs.mkdir(TILES_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(CURSORS_DIR, { recursive: true });
}

export async function generateTiles({ filePath, campaignId, tileSize = 256, sharpFactory } = {}) {
  const sharp = sharpFactory || (await import('sharp')).default;
  const outputDir = path.join(TILES_DIR, campaignId);
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await sharp(filePath)
    .png()
    .tile({ size: tileSize, layout: 'google' })
    .toFile(outputDir);
  return outputDir;
}

export async function getGeneratedMaxZoom(outputDir) {
  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const levels = entries
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map((entry) => Number(entry.name));
  return Math.max(...levels);
}

export async function getGeneratedTileBounds(outputDir, tileSize = 256) {
  const maxZoom = await getGeneratedMaxZoom(outputDir);
  const zoomDir = path.join(outputDir, String(maxZoom));
  const rowEntries = await fs.readdir(zoomDir, { withFileTypes: true });
  let maxRow = 0;
  let maxColumn = 0;

  for (const rowEntry of rowEntries) {
    if (!rowEntry.isDirectory() || !/^\d+$/.test(rowEntry.name)) continue;
    const row = Number(rowEntry.name);
    maxRow = Math.max(maxRow, row);
    const rowDir = path.join(zoomDir, rowEntry.name);
    const tileEntries = await fs.readdir(rowDir, { withFileTypes: true });
    tileEntries.forEach((tileEntry) => {
      const match = tileEntry.isFile() ? tileEntry.name.match(/^(\d+)\.png$/) : null;
      if (match) maxColumn = Math.max(maxColumn, Number(match[1]));
    });
  }

  const scale = 2 ** maxZoom;
  return {
    max_zoom: maxZoom,
    south: -((maxRow + 1) * tileSize) / scale,
    west: 0,
    north: 0,
    east: ((maxColumn + 1) * tileSize) / scale
  };
}
