import { spots } from "@pota-stats/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { publicProcedure, router } from "../trpc";

const bandCase = sql.raw(`CASE
  WHEN frequency::float < 2000    THEN '160m'
  WHEN frequency::float < 4000    THEN '80m'
  WHEN frequency::float < 7500    THEN '40m'
  WHEN frequency::float < 11000   THEN '30m'
  WHEN frequency::float < 15000   THEN '20m'
  WHEN frequency::float < 19000   THEN '17m'
  WHEN frequency::float < 22000   THEN '15m'
  WHEN frequency::float < 26000   THEN '12m'
  WHEN frequency::float < 35000   THEN '10m'
  WHEN frequency::float < 54000   THEN '6m'
  WHEN frequency::float < 150000  THEN '2m'
  ELSE 'UHF+'
END`);

const dimensionEnum = z.enum(["hour", "dow", "band", "mode", "region"]);
type Dimension = z.infer<typeof dimensionEnum>;

const chartInput = z.object({
  from: z.string(),
  to: z.string(),
  timezone: z.string().default("UTC"),
  filter: z.object({ dimension: dimensionEnum, value: z.string() }).optional(),
});

function filterMatchExpr(dim: Dimension, value: string, timezone: string) {
  switch (dim) {
    case "mode":
      return sql`mode = ${value}`;
    case "band":
      return sql`(${bandCase}) = ${value}`;
    case "region":
      return sql`SPLIT_PART(location_desc, '-', 1) = ${value}`;
    case "hour":
      return sql`EXTRACT(HOUR FROM timezone(${timezone}, last_seen_at))::int = ${parseInt(value, 10)}`;
    case "dow":
      return sql`EXTRACT(DOW FROM timezone(${timezone}, last_seen_at))::int = ${parseInt(value, 10)}`;
  }
}

export const spotsRouter = router({
  stats: publicProcedure.query(async () => {
    const [row] = await getDb()
      .select({
        total: sql<number>`COUNT(*)::int`,
        lastInserted: sql<Date | null>`MAX(COALESCE(last_seen_at, recorded_at))`,
      })
      .from(spots);
    return row ?? { total: 0, lastInserted: null };
  }),

  byHour: publicProcedure.input(chartInput).query(async ({ input }) => {
    const { from, to, timezone, filter } = input;
    if (filter) {
      const m = filterMatchExpr(filter.dimension, filter.value, timezone);
      const result = await getDb().execute(sql`
        SELECT hour, COUNT(*)::int AS count,
          SUM(CASE WHEN matches_filter THEN 1 ELSE 0 END)::int AS "filteredCount"
        FROM (
          SELECT activator, reference, hour, BOOL_OR(${m}) AS matches_filter
          FROM (
            SELECT *, EXTRACT(HOUR FROM timezone(${timezone}, last_seen_at))::int AS hour
            FROM spots
            WHERE last_seen_at >= ${from}::timestamptz
              AND last_seen_at < ${to}::timestamptz
              AND activator IS NOT NULL AND reference IS NOT NULL
          ) s
          GROUP BY activator, reference, hour
        ) a
        GROUP BY hour ORDER BY 1
      `);
      return Array.from(result) as { hour: number; count: number; filteredCount: number }[];
    }
    const result = await getDb().execute(sql`
      SELECT hour, COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT activator, reference,
          EXTRACT(HOUR FROM timezone(${timezone}, last_seen_at))::int AS hour
        FROM spots
        WHERE last_seen_at >= ${from}::timestamptz
          AND last_seen_at < ${to}::timestamptz
          AND activator IS NOT NULL AND reference IS NOT NULL
      ) a
      GROUP BY hour ORDER BY 1
    `);
    return (Array.from(result) as { hour: number; count: number }[]).map((r) => ({
      ...r,
      filteredCount: r.count,
    }));
  }),

  byWeekday: publicProcedure.input(chartInput).query(async ({ input }) => {
    const { from, to, timezone, filter } = input;
    if (filter) {
      const m = filterMatchExpr(filter.dimension, filter.value, timezone);
      const result = await getDb().execute(sql`
        SELECT dow, COUNT(*)::int AS count,
          SUM(CASE WHEN matches_filter THEN 1 ELSE 0 END)::int AS "filteredCount"
        FROM (
          SELECT activator, reference, dow, BOOL_OR(${m}) AS matches_filter
          FROM (
            SELECT *, EXTRACT(DOW FROM timezone(${timezone}, last_seen_at))::int AS dow
            FROM spots
            WHERE last_seen_at >= ${from}::timestamptz
              AND last_seen_at < ${to}::timestamptz
              AND activator IS NOT NULL AND reference IS NOT NULL
          ) s
          GROUP BY activator, reference, dow
        ) a
        GROUP BY dow ORDER BY 1
      `);
      return Array.from(result) as { dow: number; count: number; filteredCount: number }[];
    }
    const result = await getDb().execute(sql`
      SELECT dow, COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT activator, reference,
          EXTRACT(DOW FROM timezone(${timezone}, last_seen_at))::int AS dow
        FROM spots
        WHERE last_seen_at >= ${from}::timestamptz
          AND last_seen_at < ${to}::timestamptz
          AND activator IS NOT NULL AND reference IS NOT NULL
      ) a
      GROUP BY dow ORDER BY 1
    `);
    return (Array.from(result) as { dow: number; count: number }[]).map((r) => ({
      ...r,
      filteredCount: r.count,
    }));
  }),

  byBand: publicProcedure.input(chartInput).query(async ({ input }) => {
    const { from, to, timezone, filter } = input;
    if (filter) {
      const m = filterMatchExpr(filter.dimension, filter.value, timezone);
      const result = await getDb().execute(sql`
        SELECT band, COUNT(*)::int AS count,
          SUM(CASE WHEN matches_filter THEN 1 ELSE 0 END)::int AS "filteredCount"
        FROM (
          SELECT activator, reference, band, BOOL_OR(${m}) AS matches_filter
          FROM (
            SELECT *, ${bandCase} AS band
            FROM spots
            WHERE last_seen_at >= ${from}::timestamptz
              AND last_seen_at < ${to}::timestamptz
              AND frequency IS NOT NULL
              AND activator IS NOT NULL AND reference IS NOT NULL
          ) s
          GROUP BY activator, reference, band
        ) a
        GROUP BY band ORDER BY count DESC
      `);
      return Array.from(result) as { band: string; count: number; filteredCount: number }[];
    }
    const result = await getDb().execute(sql`
      SELECT band, COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT activator, reference, ${bandCase} AS band
        FROM spots
        WHERE last_seen_at >= ${from}::timestamptz
          AND last_seen_at < ${to}::timestamptz
          AND frequency IS NOT NULL
          AND activator IS NOT NULL AND reference IS NOT NULL
      ) a
      GROUP BY band ORDER BY count DESC
    `);
    return (Array.from(result) as { band: string; count: number }[]).map((r) => ({
      ...r,
      filteredCount: r.count,
    }));
  }),

  byMode: publicProcedure.input(chartInput).query(async ({ input }) => {
    const { from, to, timezone, filter } = input;
    if (filter) {
      const m = filterMatchExpr(filter.dimension, filter.value, timezone);
      const result = await getDb().execute(sql`
        SELECT mode, COUNT(*)::int AS count,
          SUM(CASE WHEN matches_filter THEN 1 ELSE 0 END)::int AS "filteredCount"
        FROM (
          SELECT activator, reference, mode, BOOL_OR(${m}) AS matches_filter
          FROM (
            SELECT *
            FROM spots
            WHERE last_seen_at >= ${from}::timestamptz
              AND last_seen_at < ${to}::timestamptz
              AND mode IS NOT NULL
              AND activator IS NOT NULL AND reference IS NOT NULL
          ) s
          GROUP BY activator, reference, mode
        ) a
        GROUP BY mode ORDER BY count DESC
      `);
      return Array.from(result) as { mode: string; count: number; filteredCount: number }[];
    }
    const result = await getDb().execute(sql`
      SELECT mode, COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT activator, reference, mode
        FROM spots
        WHERE last_seen_at >= ${from}::timestamptz
          AND last_seen_at < ${to}::timestamptz
          AND mode IS NOT NULL
          AND activator IS NOT NULL AND reference IS NOT NULL
      ) a
      GROUP BY mode ORDER BY count DESC
    `);
    return (Array.from(result) as { mode: string; count: number }[]).map((r) => ({
      ...r,
      filteredCount: r.count,
    }));
  }),

  byRegion: publicProcedure.input(chartInput).query(async ({ input }) => {
    const { from, to, timezone, filter } = input;
    if (filter) {
      const m = filterMatchExpr(filter.dimension, filter.value, timezone);
      const result = await getDb().execute(sql`
        SELECT region, COUNT(*)::int AS count,
          SUM(CASE WHEN matches_filter THEN 1 ELSE 0 END)::int AS "filteredCount"
        FROM (
          SELECT activator, reference, region, BOOL_OR(${m}) AS matches_filter
          FROM (
            SELECT *, SPLIT_PART(location_desc, '-', 1) AS region
            FROM spots
            WHERE last_seen_at >= ${from}::timestamptz
              AND last_seen_at < ${to}::timestamptz
              AND location_desc IS NOT NULL
              AND activator IS NOT NULL AND reference IS NOT NULL
          ) s
          GROUP BY activator, reference, region
        ) a
        GROUP BY region ORDER BY count DESC LIMIT 20
      `);
      return Array.from(result) as { region: string; count: number; filteredCount: number }[];
    }
    const result = await getDb().execute(sql`
      SELECT region, COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT activator, reference, SPLIT_PART(location_desc, '-', 1) AS region
        FROM spots
        WHERE last_seen_at >= ${from}::timestamptz
          AND last_seen_at < ${to}::timestamptz
          AND location_desc IS NOT NULL
          AND activator IS NOT NULL AND reference IS NOT NULL
      ) a
      GROUP BY region ORDER BY count DESC LIMIT 20
    `);
    return (Array.from(result) as { region: string; count: number }[]).map((r) => ({
      ...r,
      filteredCount: r.count,
    }));
  }),

  mapPoints: publicProcedure
    .input(
      z.object({
        from: z.string(),
        to: z.string(),
        timezone: z.string().default("UTC"),
        filter: z.object({ dimension: dimensionEnum, value: z.string() }).optional(),
        limit: z.number().int().min(1).max(5000).default(2000),
      })
    )
    .query(async ({ input }) => {
      const { from, to, timezone, filter, limit } = input;
      if (filter) {
        const m = filterMatchExpr(filter.dimension, filter.value, timezone);
        const result = await getDb().execute(sql`
          SELECT reference, park_name AS "parkName", latitude AS lat, longitude AS lon
          FROM spots
          WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            AND last_seen_at >= ${from}::timestamptz
            AND last_seen_at < ${to}::timestamptz
            AND ${m}
          GROUP BY reference, park_name, latitude, longitude
          LIMIT ${limit}
        `);
        return Array.from(result) as {
          reference: string;
          parkName: string;
          lat: string;
          lon: string;
        }[];
      }
      const result = await getDb().execute(sql`
        SELECT reference, park_name AS "parkName", latitude AS lat, longitude AS lon
        FROM spots
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          AND last_seen_at >= ${from}::timestamptz
          AND last_seen_at < ${to}::timestamptz
        GROUP BY reference, park_name, latitude, longitude
        LIMIT ${limit}
      `);
      return Array.from(result) as {
        reference: string;
        parkName: string;
        lat: string;
        lon: string;
      }[];
    }),
});
