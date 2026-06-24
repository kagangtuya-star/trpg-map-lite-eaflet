import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, '../../data');
export const DB_PATH = path.join(DATA_DIR, 'trpg_map.db');

export function applySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      edit_token TEXT UNIQUE NOT NULL,
      view_token TEXT UNIQUE NOT NULL,
      default_cursor_url TEXT NOT NULL,
      pointer_cursor_url TEXT NOT NULL,
      default_marker_icon_url TEXT NOT NULL DEFAULT '',
      default_marker_icon_style TEXT NOT NULL DEFAULT 'width:18px;height:18px;background:#d7b56d;border:2px solid #3a2b1f;',
      max_zoom INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS markers (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      title TEXT NOT NULL,
      show_title INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL DEFAULT '',
      show_description INTEGER NOT NULL DEFAULT 1,
      icon_style TEXT NOT NULL,
      icon_url TEXT NOT NULL DEFAULT '',
      chat_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaign_marker_icons (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      url TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );
  `);

  const markerColumns = db.prepare('PRAGMA table_info(markers)').all();
  const hasDescription = markerColumns.some((column) => column.name === 'description');
  if (!hasDescription) {
    db.exec("ALTER TABLE markers ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  }
  const hasShowTitle = markerColumns.some((column) => column.name === 'show_title');
  if (!hasShowTitle) {
    db.exec('ALTER TABLE markers ADD COLUMN show_title INTEGER NOT NULL DEFAULT 1');
  }
  const hasShowDescription = markerColumns.some((column) => column.name === 'show_description');
  if (!hasShowDescription) {
    db.exec('ALTER TABLE markers ADD COLUMN show_description INTEGER NOT NULL DEFAULT 1');
  }
  const hasIconUrl = markerColumns.some((column) => column.name === 'icon_url');
  if (!hasIconUrl) {
    db.exec("ALTER TABLE markers ADD COLUMN icon_url TEXT NOT NULL DEFAULT ''");
  }

  const campaignColumns = db.prepare('PRAGMA table_info(campaigns)').all();
  const hasDefaultMarkerIconUrl = campaignColumns.some((column) => column.name === 'default_marker_icon_url');
  if (!hasDefaultMarkerIconUrl) {
    db.exec("ALTER TABLE campaigns ADD COLUMN default_marker_icon_url TEXT NOT NULL DEFAULT ''");
  }
  const hasDefaultMarkerIconStyle = campaignColumns.some((column) => column.name === 'default_marker_icon_style');
  if (!hasDefaultMarkerIconStyle) {
    db.exec("ALTER TABLE campaigns ADD COLUMN default_marker_icon_style TEXT NOT NULL DEFAULT 'width:18px;height:18px;background:#d7b56d;border:2px solid #3a2b1f;'");
  }
}

export async function ensureDatabaseDirectory(dbPath) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
}

export async function openDatabase(dbPath = DB_PATH) {
  const { default: Database } = await import('better-sqlite3');
  await ensureDatabaseDirectory(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applySchema(db);
  return db;
}
