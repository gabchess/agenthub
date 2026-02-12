import initSqlJs, { type Database } from "sql.js";
import fs from "fs";
import path from "path";
import os from "os";

const DB_PATH = path.join(os.homedir(), ".openclaw", "antfarm", "antfarm.db");

let _db: Database | null = null;
let _dbLoadedAt = 0;
const DB_MAX_AGE_MS = 5000;

export async function getDb(): Promise<Database> {
  const now = Date.now();
  if (_db && now - _dbLoadedAt < DB_MAX_AGE_MS) return _db;

  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_PATH)) {
    _db = new SQL.Database();
    _dbLoadedAt = now;
    return _db;
  }

  const buffer = fs.readFileSync(DB_PATH);
  _db = new SQL.Database(buffer);
  _dbLoadedAt = now;
  return _db;
}

/**
 * Run a query and return rows as objects (similar to better-sqlite3's .all())
 */
export async function queryAll(
  sql: string,
  params: (string | number | null)[] = []
): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function getDbPath(): string {
  return DB_PATH;
}
