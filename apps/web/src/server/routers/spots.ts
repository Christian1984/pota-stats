import { spots } from "@pota-stats/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { publicProcedure, router } from "../trpc";

const rangeInput = z.object({
  from: z.string(),
  to: z.string(),
});
const localRangeInput = rangeInput.extend({ timezone: z.string().default("UTC") });

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

export const spotsRouter = router({
  stats: publicProcedure.query(async () => {
    const [row] = await getDb()
      .select({
        total: sql<number>`COUNT(*)::int`,
        lastInserted: sql<Date | null>`MAX(recorded_at)`,
      })
      .from(spots);
    return row ?? { total: 0, lastInserted: null };
  }),

  byHour: publicProcedure.input(localRangeInput).query(async ({ input }) => {
    const result = await getDb().execute(sql`
      SELECT EXTRACT(HOUR FROM local_time)::int AS hour, COUNT(*)::int AS count
      FROM (
        SELECT activator, reference,
               timezone(${input.timezone}, MIN(spot_time)) AS local_time
        FROM spots
        WHERE spot_time >= ${input.from}::timestamptz
          AND spot_time < ${input.to}::timestamptz
          AND activator IS NOT NULL AND reference IS NOT NULL
        GROUP BY activator, reference
      ) a
      GROUP BY EXTRACT(HOUR FROM local_time)
      ORDER BY 1
    `);
    return Array.from(result) as { hour: number; count: number }[];
  }),

  byWeekday: publicProcedure.input(localRangeInput).query(async ({ input }) => {
    const result = await getDb().execute(sql`
      SELECT EXTRACT(DOW FROM local_time)::int AS dow, COUNT(*)::int AS count
      FROM (
        SELECT activator, reference,
               timezone(${input.timezone}, MIN(spot_time)) AS local_time
        FROM spots
        WHERE spot_time >= ${input.from}::timestamptz
          AND spot_time < ${input.to}::timestamptz
          AND activator IS NOT NULL AND reference IS NOT NULL
        GROUP BY activator, reference
      ) a
      GROUP BY EXTRACT(DOW FROM local_time)
      ORDER BY 1
    `);
    return Array.from(result) as { dow: number; count: number }[];
  }),

  byBand: publicProcedure.input(rangeInput).query(async ({ input }) => {
    const result = await getDb().execute(sql`
      SELECT band, COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT activator, reference, ${bandCase} AS band
        FROM spots
        WHERE spot_time >= ${input.from}::timestamptz
          AND spot_time < ${input.to}::timestamptz
          AND frequency IS NOT NULL
          AND activator IS NOT NULL AND reference IS NOT NULL
      ) a
      GROUP BY band
      ORDER BY count DESC
    `);
    return Array.from(result) as { band: string; count: number }[];
  }),

  byMode: publicProcedure.input(rangeInput).query(async ({ input }) => {
    const result = await getDb().execute(sql`
      SELECT mode, COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT activator, reference, mode
        FROM spots
        WHERE spot_time >= ${input.from}::timestamptz
          AND spot_time < ${input.to}::timestamptz
          AND mode IS NOT NULL
          AND activator IS NOT NULL AND reference IS NOT NULL
      ) a
      GROUP BY mode
      ORDER BY count DESC
    `);
    return Array.from(result) as { mode: string; count: number }[];
  }),

  byRegion: publicProcedure.input(rangeInput).query(async ({ input }) => {
    const result = await getDb().execute(sql`
      SELECT region, COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT activator, reference, SPLIT_PART(location_desc, '-', 1) AS region
        FROM spots
        WHERE spot_time >= ${input.from}::timestamptz
          AND spot_time < ${input.to}::timestamptz
          AND location_desc IS NOT NULL
          AND activator IS NOT NULL AND reference IS NOT NULL
      ) a
      GROUP BY region
      ORDER BY count DESC
      LIMIT 20
    `);
    return Array.from(result) as { region: string; count: number }[];
  }),

  mapPoints: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(5000).default(2000) }))
    .query(async ({ input }) => {
      return getDb()
        .select({
          reference: spots.reference,
          parkName: spots.parkName,
          lat: spots.latitude,
          lon: spots.longitude,
        })
        .from(spots)
        .where(sql`latitude IS NOT NULL AND longitude IS NOT NULL`)
        .groupBy(spots.reference, spots.parkName, spots.latitude, spots.longitude)
        .limit(input.limit);
    }),
});
