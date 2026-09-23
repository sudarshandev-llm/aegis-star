import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../aegis.db');

const db = new Database(dbPath);

// Enable WAL mode for high performance concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    summary TEXT NOT NULL,
    raw_data TEXT,
    is_simulated INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS briefings (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    is_simulated INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS iss_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude TEXT,
    velocity TEXT,
    is_simulated INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL
  );

  -- Purge legacy simulated data to enforce 100% real live data
  DELETE FROM events WHERE is_simulated = 1;
  DELETE FROM briefings WHERE is_simulated = 1;
  DELETE FROM iss_positions WHERE is_simulated = 1;
`);

export default db;

export function insertEvent(event) {
  const stmt = db.prepare(`
    INSERT INTO events (id, source, type, severity, summary, raw_data, is_simulated, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      severity=excluded.severity,
      summary=excluded.summary,
      raw_data=excluded.raw_data,
      is_simulated=excluded.is_simulated,
      timestamp=excluded.timestamp
  `);

  stmt.run(
    event.id,
    event.source,
    event.type,
    event.severity,
    event.summary,
    typeof event.raw_data === 'string' ? event.raw_data : JSON.stringify(event.raw_data || {}),
    event.is_simulated ? 1 : 0,
    event.timestamp || Date.now()
  );
}

export function getLatestEvents(limit = 50) {
  const stmt = db.prepare(`
    SELECT id, source, type, severity, summary, raw_data, is_simulated, timestamp
    FROM events
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  const rows = stmt.all(limit);
  return rows.map(r => ({
    ...r,
    is_simulated: Boolean(r.is_simulated),
    raw_data: r.raw_data ? JSON.parse(r.raw_data) : null
  }));
}

export function saveIssPosition(position) {
  const stmt = db.prepare(`
    INSERT INTO iss_positions (latitude, longitude, altitude, velocity, is_simulated, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    position.latitude,
    position.longitude,
    position.altitude || '420 km',
    position.velocity || '27,600 km/h',
    position.is_simulated ? 1 : 0,
    position.timestamp || Date.now()
  );
}

export function getLatestIssPosition() {
  const stmt = db.prepare(`
    SELECT latitude, longitude, altitude, velocity, is_simulated, timestamp
    FROM iss_positions
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  const row = stmt.get();
  if (!row) {
    return null;
  }
  return {
    ...row,
    is_simulated: Boolean(row.is_simulated)
  };
}

export function insertBriefing(briefing) {
  const stmt = db.prepare(`
    INSERT INTO briefings (id, content, is_simulated, timestamp)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      content=excluded.content,
      is_simulated=excluded.is_simulated,
      timestamp=excluded.timestamp
  `);
  stmt.run(
    briefing.id,
    briefing.content,
    briefing.is_simulated ? 1 : 0,
    briefing.timestamp || Date.now()
  );
}

export function getLatestBriefing() {
  const stmt = db.prepare(`
    SELECT id, content, is_simulated, timestamp
    FROM briefings
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  const row = stmt.get();
  if (!row) return null;
  return {
    ...row,
    is_simulated: Boolean(row.is_simulated)
  };
}
