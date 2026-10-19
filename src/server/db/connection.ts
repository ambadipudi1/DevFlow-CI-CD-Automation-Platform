import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';

export function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_PATH) {
    return process.env.TEST_DATABASE_PATH;
  }
  return process.env.DATABASE_PATH || './data/devflow.db';
}

export interface RunResult {
  lastID: number;
  changes: number;
}

let SQL: SqlJsStatic | null = null;

export class SQLiteConnection {
  private db: Database | null = null;
  private dbPath: string;
  private inTransaction = false;

  constructor(customPath?: string) {
    this.dbPath = customPath || getDatabasePath();
  }

  public async connect(): Promise<Database> {
    if (this.db) {
      return this.db;
    }

    if (!SQL) {
      SQL = await initSqlJs();
    }

    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(path.resolve(this.dbPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } else {
        this.db = new SQL.Database();
        this.persist();
      }
    } else {
      this.db = new SQL.Database();
    }

    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON;');
    return this.db;
  }

  public persist(): void {
    if (this.inTransaction || this.dbPath === ':memory:' || !this.db) {
      return;
    }
    try {
      const data = this.db.export();
      // In sql.js, export() resets connection pragmas, so immediately re-enable foreign keys
      this.db.run('PRAGMA foreign_keys = ON;');
      const buffer = Buffer.from(data);
      const dir = path.dirname(path.resolve(this.dbPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('[DevFlow SQLite] Failed to persist database file:', err);
    }
  }

  public getPath(): string {
    return this.dbPath;
  }

  public async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const db = await this.connect();
    const stmt = db.prepare(sql);
    try {
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        const row = stmt.getAsObject() as T;
        return row;
      }
      return undefined;
    } finally {
      stmt.free();
    }
  }

  public async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = await this.connect();
    const stmt = db.prepare(sql);
    const results: T[] = [];
    try {
      if (params && params.length > 0) {
        stmt.bind(params);
      }
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  public async run(sql: string, params: any[] = []): Promise<RunResult> {
    const db = await this.connect();
    if (params && params.length > 0) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        stmt.step();
      } finally {
        stmt.free();
      }
    } else {
      db.run(sql);
    }
    
    // Retrieve last_insert_rowid() and changes()
    const lastIDRow = db.exec('SELECT last_insert_rowid() as id');
    const lastID = lastIDRow.length && lastIDRow[0].values.length ? Number(lastIDRow[0].values[0][0]) : 0;
    
    const changesRow = db.exec('SELECT changes() as count');
    const changes = changesRow.length && changesRow[0].values.length ? Number(changesRow[0].values[0][0]) : 0;

    this.persist();
    return { lastID, changes };
  }

  public async exec(sql: string): Promise<void> {
    const db = await this.connect();
    db.exec(sql);
    this.persist();
  }

  public async transaction<T>(callback: (conn: SQLiteConnection) => Promise<T>): Promise<T> {
    const db = await this.connect();
    this.inTransaction = true;
    db.run('BEGIN TRANSACTION;');
    try {
      const result = await callback(this);
      db.run('COMMIT;');
      this.inTransaction = false;
      this.persist();
      return result;
    } catch (error) {
      db.run('ROLLBACK;');
      this.inTransaction = false;
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (!this.db) return;
    this.persist();
    this.db.close();
    this.db = null;
  }
}

let globalConnection: SQLiteConnection | null = null;

export function getDatabase(customPath?: string): SQLiteConnection {
  if (customPath) {
    return new SQLiteConnection(customPath);
  }
  if (!globalConnection) {
    globalConnection = new SQLiteConnection();
  }
  return globalConnection;
}

process.on('SIGINT', async () => {
  if (globalConnection) {
    try {
      await globalConnection.close();
    } catch {
      // ignore
    }
  }
});

process.on('SIGTERM', async () => {
  if (globalConnection) {
    try {
      await globalConnection.close();
    } catch {
      // ignore
    }
  }
});
