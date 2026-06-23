import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import express from 'express';
import multer from 'multer';
import archiver from 'archiver';

import { streamCampaignZip } from './export-service.js';
import { createSqliteStore } from './sqlite-store.js';
import {
  ensureRuntimeDirs,
  generateTiles,
  getGeneratedMaxZoom,
  getGeneratedTileBounds,
  CURSORS_DIR,
  PUBLIC_DIR,
  TILES_DIR,
  UPLOADS_DIR
} from './tile-service.js';

const CURSOR_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.cur', '.ico']);

function createCursorUpload() {
  return multer({
    storage: multer.diskStorage({
      destination(_req, _file, callback) {
        fs.mkdirSync(CURSORS_DIR, { recursive: true });
        callback(null, CURSORS_DIR);
      },
      filename(_req, file, callback) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        callback(null, `${randomUUID()}${CURSOR_EXTENSIONS.has(ext) ? ext : ''}`);
      }
    }),
    fileFilter(_req, file, callback) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const isCursorFile = CURSOR_EXTENSIONS.has(ext);
      if (file.mimetype?.startsWith('image/') || isCursorFile) callback(null, true);
      else {
        const error = new Error('cursor file must be an image');
        error.status = 400;
        callback(error);
      }
    },
    limits: { fileSize: 1024 * 1024 }
  });
}

export function createApp({ store, upload, cursorUpload, tileGenerator = generateTiles, archiveFactory = archiver } = {}) {
  const app = express();
  const activeStore = store;
  const activeUpload = upload || multer({ dest: UPLOADS_DIR });
  const activeCursorUpload = cursorUpload || createCursorUpload();

  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get('/tiles/:campaignId/:z/:y/:x.png', (req, res, next) => {
    const fallbackTile = path.join(TILES_DIR, req.params.campaignId, 'blank.png');
    res.sendFile(fallbackTile, (error) => {
      if (error) next();
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/campaigns', activeUpload.single('map'), async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'map file is required' });
        return;
      }
      const campaign = activeStore.createCampaign({
        name: req.body.name,
        default_cursor_url: req.body.default_cursor_url,
        pointer_cursor_url: req.body.pointer_cursor_url,
        max_zoom: req.body.max_zoom
      });
      const tileDir = await tileGenerator({ filePath: req.file.path, campaignId: campaign.id });
      const generatedMaxZoom = await getGeneratedMaxZoom(tileDir);
      const maxZoom = Math.min(Number(campaign.max_zoom), generatedMaxZoom);
      const responseCampaign =
        maxZoom === Number(campaign.max_zoom)
          ? campaign
          : activeStore.updateConfig(campaign.edit_token, { max_zoom: maxZoom });
      res.status(201).json({
        campaign: responseCampaign,
        edit_token: responseCampaign.edit_token,
        view_token: responseCampaign.view_token
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/uploads/cursors', activeCursorUpload.single('cursor'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'cursor file is required' });
      return;
    }
    res.status(201).json({ url: `/uploads/cursors/${req.file.filename}` });
  });

  async function attachTileBounds(result) {
    if (!result) return result;
    const tileDir = path.join(TILES_DIR, result.campaign.id);
    try {
      const tileBounds = await getGeneratedTileBounds(tileDir);
      return {
        ...result,
        campaign: {
          ...result.campaign,
          max_zoom: tileBounds.max_zoom,
          tile_bounds: tileBounds
        }
      };
    } catch {
      return result;
    }
  }

  async function clampConfigToGeneratedTiles(campaign, patch = {}) {
    const tileDir = path.join(TILES_DIR, campaign.id);
    try {
      const generatedMaxZoom = await getGeneratedMaxZoom(tileDir);
      return {
        ...patch,
        max_zoom: Math.min(Number(patch.max_zoom ?? campaign.max_zoom), generatedMaxZoom)
      };
    } catch {
      return patch;
    }
  }

  app.get('/api/campaigns/:token', async (req, res) => {
    const result = activeStore.getByToken(req.params.token);
    if (!result) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(await attachTileBounds(result));
  });

  app.put('/api/campaigns/:edit_token/config', async (req, res, next) => {
    try {
      const result = activeStore.getByToken(req.params.edit_token);
      if (!result || result.mode !== 'edit') {
        res.status(404).json({ error: 'Edit token not found' });
        return;
      }
      const patch = await clampConfigToGeneratedTiles(result.campaign, req.body);
      res.json({ campaign: activeStore.updateConfig(req.params.edit_token, patch) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/campaigns/:edit_token/markers', (req, res, next) => {
    try {
      res.json({ marker: activeStore.upsertMarker(req.params.edit_token, req.body) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/campaigns/:edit_token/markers/:id', (req, res, next) => {
    try {
      activeStore.deleteMarker(req.params.edit_token, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/campaigns/:edit_token/export', async (req, res, next) => {
    try {
      await streamCampaignZip({
        archiveFactory,
        store: activeStore,
        editToken: req.params.edit_token,
        response: res
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  });

  return app;
}

export async function createProductionApp(db) {
  await ensureRuntimeDirs();
  return createApp({ store: createSqliteStore(db) });
}
