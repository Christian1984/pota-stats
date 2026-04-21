import { createDb, spots, type NewSpot } from "@pota-stats/db";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const POLL_INTERVAL_MINUTES = Math.max(1, parseInt(process.env.POLL_INTERVAL_MINUTES ?? "10", 10));
const JITTER_MIN_SECONDS = Math.max(0, parseInt(process.env.JITTER_MIN_SECONDS ?? "5", 10));
const JITTER_MAX_SECONDS = Math.max(JITTER_MIN_SECONDS, parseInt(process.env.JITTER_MAX_SECONDS ?? "15", 10));

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

const USER_AGENT = process.env.USER_AGENT ?? "node";

async function poll() {
  const start = Date.now();
  try {
    const res = await fetch("https://api.pota.app/v1/spots", {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as ApiSpot[];

    const now = new Date();
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
      lastSeenAt: now,
    }));

    if (rows.length === 0) {
      console.log(`[${new Date().toISOString()}] No spots returned`);
      return;
    }

    await db
      .insert(spots)
      .values(rows)
      .onConflictDoUpdate({
        target: spots.spotId,
        set: { lastSeenAt: sql`NOW()` },
      });

    console.log(
      `[${new Date().toISOString()}] Upserted ${rows.length} spots in ${Date.now() - start}ms`
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Poll failed:`, err);
  }
}

await runMigrations();

function scheduleNext() {
  const now = new Date();
  const ms = POLL_INTERVAL_MINUTES * 60 * 1000;
  const msIntoHour = (now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
  const jitter = (JITTER_MIN_SECONDS + Math.random() * (JITTER_MAX_SECONDS - JITTER_MIN_SECONDS)) * 1000;
  const delay = ms - (msIntoHour % ms) + jitter;
  const nextTick = new Date(now.getTime() + delay);
  console.log(`Next poll at ${nextTick.toISOString()}`);
  setTimeout(async () => {
    await poll();
    scheduleNext();
  }, delay);
}

scheduleNext();
console.log(`Poller running — fetching at every ${POLL_INTERVAL_MINUTES}-minute mark of the hour`);
console.log(`User-Agent: ${USER_AGENT}`);

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
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_spots_spot_time ON spots(spot_time)`);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_spots_location_desc ON spots(location_desc)`
    );
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_spots_mode ON spots(mode)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_spots_frequency ON spots(frequency)`);
    await db.execute(sql`ALTER TABLE spots ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`);
    await db.execute(sql`ALTER TABLE spots ALTER COLUMN last_seen_at SET DEFAULT NOW()`);
    await db.execute(
      sql`UPDATE spots SET last_seen_at = COALESCE(recorded_at, spot_time) WHERE last_seen_at IS NULL`
    );
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_spots_last_seen_at ON spots(last_seen_at)`);
    console.log("Database schema ready");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}
