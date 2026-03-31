import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig } from '../config/loader.js';
import { getLogger } from '../config/logger.js';
import * as schema from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase() {
    const config = getConfig();
    const log = getLogger();

    // Support both file: paths and in-memory :memory:
    const dbPath = config.DATABASE_URL.replace(/^file:/, '');

    if (dbPath !== ':memory:') {
        const dir = resolve(dirname(dbPath));
        mkdirSync(dir, { recursive: true });
    }

    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    const db = drizzle(sqlite, { schema });

    // Run migrations
    const migrationsFolder = resolve(__dirname, '..', '..', 'drizzle');
    try {
        migrate(db, { migrationsFolder });
        log.info('Database migrations applied');
    } catch (err) {
        log.warn({ err }, 'Migrations folder not found — running with inline schema (dev mode)');
        // In dev, auto-create tables from schema
        sqlite.exec(`
      CREATE TABLE IF NOT EXISTS suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        title TEXT,
        tags TEXT,
        correspondent TEXT,
        document_type TEXT,
        created_date TEXT,
        custom_fields TEXT,
        summary TEXT,
        new_tags TEXT,
        new_correspondent TEXT,
        new_document_type TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        applied_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        document_id INTEGER,
        status TEXT NOT NULL DEFAULT 'waiting',
        progress REAL NOT NULL DEFAULT 0,
        error TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        completed_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        document_id INTEGER,
        payload TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
        // Add new columns to existing suggestions tables (ignore error if already present)
        for (const col of [
            'ALTER TABLE suggestions ADD COLUMN new_tags TEXT',
            'ALTER TABLE suggestions ADD COLUMN new_correspondent TEXT',
            'ALTER TABLE suggestions ADD COLUMN new_document_type TEXT',
        ]) {
            try { sqlite.exec(col); } catch { /* column already exists */ }
        }
    }

    return db;
}
