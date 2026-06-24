import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import yauzl from 'yauzl';

import { DEFAULT_ICON_STYLE } from './defaults.js';
import { getGeneratedTileBounds, PUBLIC_DIR, TILES_DIR } from './tile-service.js';

function archiveError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validUploadUrl(url) {
  return (
    url === '' ||
    url == null ||
    (typeof url === 'string' &&
      (url.startsWith('/cursors/') || url.startsWith('/uploads/cursors/') || url.startsWith('/uploads/marker-icons/')))
  );
}

function openZip(zipPath) {
  return yauzl.openPromise(zipPath, { lazyEntries: true });
}

function openReadStream(zipfile, entry) {
  return zipfile.openReadStreamPromise(entry);
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function validateArchiveEntryName(fileName) {
  if (!fileName || typeof fileName !== 'string') return false;
  if (fileName.includes('\\')) return false;
  if (fileName.startsWith('/')) return false;
  return !fileName.split('/').some((part) => part === '..');
}

export function normalizeArchiveConfig(config, currentCampaign) {
  if (!config || typeof config !== 'object') throw archiveError('archive config.json is invalid');
  if (!config.campaign || typeof config.campaign !== 'object') throw archiveError('archive campaign is invalid');
  if (!Array.isArray(config.markers)) throw archiveError('archive markers are invalid');
  if (!Array.isArray(config.marker_icons || [])) throw archiveError('archive marker icons are invalid');

  const campaign = {
    ...config.campaign,
    id: currentCampaign.id,
    edit_token: currentCampaign.edit_token,
    view_token: currentCampaign.view_token,
    name: config.campaign.name || currentCampaign.name,
    default_marker_icon_style: config.campaign.default_marker_icon_style || DEFAULT_ICON_STYLE
  };

  for (const url of [campaign.default_cursor_url, campaign.pointer_cursor_url, campaign.default_marker_icon_url]) {
    if (!validUploadUrl(url)) throw archiveError('archive asset reference is invalid');
  }

  const markers = config.markers.map((marker) => {
    const lat = Number(marker.lat);
    const lng = Number(marker.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw archiveError('archive markers are invalid');
    if (!validUploadUrl(marker.icon_url)) throw archiveError('archive asset reference is invalid');
    return {
      ...marker,
      campaign_id: currentCampaign.id,
      lat,
      lng
    };
  });

  const marker_icons = (config.marker_icons || []).map((icon) => {
    if (!validUploadUrl(icon.url)) throw archiveError('archive asset reference is invalid');
    return {
      ...icon,
      campaign_id: currentCampaign.id
    };
  });

  return { campaign, markers, marker_icons };
}

async function extractArchive(zipPath, stagingDir) {
  let zipfile;
  let hasConfig = false;
  let hasTiles = false;

  try {
    zipfile = await openZip(zipPath);
  } catch {
    throw archiveError('invalid project archive');
  }

  try {
    while (true) {
      const entry = await new Promise((resolve, reject) => {
        function cleanup() {
          zipfile.off('entry', onEntry);
          zipfile.off('end', onEnd);
          zipfile.off('error', onError);
        }
        function onEntry(nextEntry) {
          cleanup();
          resolve(nextEntry);
        }
        function onEnd() {
          cleanup();
          resolve(null);
        }
        function onError(error) {
          cleanup();
          reject(error);
        }
        zipfile.once('entry', onEntry);
        zipfile.once('end', onEnd);
        zipfile.once('error', onError);
        zipfile.readEntry();
      });
      if (!entry) break;
      if (!validateArchiveEntryName(entry.fileName)) throw archiveError('archive contains unsafe paths');
      if (entry.fileName.endsWith('/')) continue;

      if (entry.fileName === 'config.json') hasConfig = true;
      if (entry.fileName.startsWith('tiles/') && entry.fileName.endsWith('.png')) hasTiles = true;

      const targetPath = path.join(stagingDir, entry.fileName);
      await fsp.mkdir(path.dirname(targetPath), { recursive: true });
      const readStream = await openReadStream(zipfile, entry);
      await pipeline(readStream, fs.createWriteStream(targetPath));
    }
  } finally {
    zipfile.close();
  }

  if (!hasConfig) throw archiveError('archive config.json is required');
  if (!hasTiles) throw archiveError('archive tiles are required');
}

export async function replaceDirectoryContents(sourceDir, targetDir) {
  await fsp.rm(targetDir, { recursive: true, force: true });
  await fsp.mkdir(path.dirname(targetDir), { recursive: true });
  await fsp.cp(sourceDir, targetDir, { recursive: true });
}

async function copyImportedAssets(stagingDir) {
  const assetsUploads = path.join(stagingDir, 'assets/uploads');
  if (!(await pathExists(assetsUploads))) return;
  await fsp.mkdir(path.join(PUBLIC_DIR, 'uploads'), { recursive: true });
  await fsp.cp(assetsUploads, path.join(PUBLIC_DIR, 'uploads'), { recursive: true });
}

export async function importCampaignArchive({ store, editToken, archivePath }) {
  const result = store.getByToken(editToken);
  if (!result || result.mode !== 'edit') throw archiveError('Edit token not found', 404);

  const stagingDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'trpg-map-import-'));
  try {
    await extractArchive(archivePath, stagingDir);
    let config;
    try {
      config = JSON.parse(await fsp.readFile(path.join(stagingDir, 'config.json'), 'utf8'));
    } catch {
      throw archiveError('archive config.json is invalid');
    }

    const archiveData = normalizeArchiveConfig(config, result.campaign);
    const tileBounds = await getGeneratedTileBounds(path.join(stagingDir, 'tiles'));
    archiveData.campaign.max_zoom = tileBounds.max_zoom;
    archiveData.campaign.tile_bounds = tileBounds;

    await copyImportedAssets(stagingDir);
    await replaceDirectoryContents(path.join(stagingDir, 'tiles'), path.join(TILES_DIR, result.campaign.id));
    return store.replaceCampaignArchive(editToken, archiveData);
  } finally {
    await fsp.rm(stagingDir, { recursive: true, force: true });
  }
}
