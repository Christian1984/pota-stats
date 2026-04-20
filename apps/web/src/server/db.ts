import { createDb, type Db } from "@pota-stats/db";

let _db: Db | undefined;

export function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    _db = createDb(url);
  }
  return _db;
}
