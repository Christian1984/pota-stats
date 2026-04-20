import { createDb, spots, type NewSpot } from "@pota-stats/db";
import { sql } from "drizzle-orm";
import cron from "node-cron";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const db = createDb(DATABASE_URL);

interface ApiSpot {
  spotId: number;
  activator: string;
  frequency: string;
  mode: string;
  reference: string;
  name: string | null;
  spotTime: string;
  spotter: string;
  comments: string | null;
  source: string;
  locationDesc: string;
  latitude: number | null;
  longitude: number | null;
  grid4: string | null;
}

async function poll() {
  const start = Date.now();
  try {
    const res = await fetch("https://api.pota.app/v1/spots");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as ApiSpot[];

    const rows: NewSpot[] = data.map((s) => ({
      spotId: s.spotId,
      activator: s.activator ?? null,
      frequency: s.frequency ?? null,
      mode: s.mode ?? null,
      reference: s.reference ?? null,
      parkName: s.name ?? null,
      spotTime: new Date(s.spotTime),
      spotter: s.spotter ?? null,
      comments: s.comments ?? null,
      source: s.source ?? null,
      locationDesc: s.locationDesc ?? null,
      latitude: s.latitude != null ? String(s.latitude) : null,
      longitude: s.longitude != null ? String(s.longitude) : null,
      grid4: s.grid4 ?? null,
    }));

    if (rows.length === 0) {
      console.log(`[${new Date().toISOString()}] No spots returned`);
      return;
    }

    await db
      .insert(spots)
      .values(rows)
      .onConflictDoNothing({ target: spots.spotId });

    console.log(
      `[${new Date().toISOString()}] Upserted ${rows.length} spots in ${Date.now() - start}ms`
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Poll failed:`, err);
  }
}

await runMigrations();
await poll();

cron.schedule("*/5 * * * *", poll);
console.log("Poller running — fetching every 5 minutes");

async function runMigrations() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS spots (
        spot_id BIGINT PRIMARY KEY,
        activator TEXT,
        frequency NUMERIC(10,1),
        mode TEXT,
        reference TEXT,
        park_name TEXT,
        spot_time TIMESTAMPTZ NOT NULL,
        spotter TEXT,
        comments TEXT,
        source TEXT,
        location_desc TEXT,
        latitude NUMERIC(8,5),
        longitude NUMERIC(8,5),
        grid4 TEXT,
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_spots_spot_time ON spots(spot_time)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_spots_location_desc ON spots(location_desc)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_spots_mode ON spots(mode)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_spots_frequency ON spots(frequency)`
    );
    console.log("Database schema ready");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}
