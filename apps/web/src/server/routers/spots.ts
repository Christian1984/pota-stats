import { spots } from "@pota-stats/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { publicProcedure, router } from "../trpc";

const daysInput = z.object({ days: z.number().int().min(1).max(3650).default(30) });

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

  byHour: publicProcedure.input(daysInput).query(async ({ input }) => {
    return getDb()
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM spot_time)::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(spots)
      .where(sql`spot_time >= NOW() - INTERVAL '1 day' * ${input.days}`)
      .groupBy(sql`EXTRACT(HOUR FROM spot_time)`)
      .orderBy(sql`EXTRACT(HOUR FROM spot_time)`);
  }),

  byWeekday: publicProcedure.input(daysInput).query(async ({ input }) => {
    return getDb()
      .select({
        dow: sql<number>`EXTRACT(DOW FROM spot_time)::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(spots)
      .where(sql`spot_time >= NOW() - INTERVAL '1 day' * ${input.days}`)
      .groupBy(sql`EXTRACT(DOW FROM spot_time)`)
      .orderBy(sql`EXTRACT(DOW FROM spot_time)`);
  }),

  byBand: publicProcedure.input(daysInput).query(async ({ input }) => {
    return getDb()
      .select({
        band: sql<string>`CASE
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
        END`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(spots)
      .where(
        sql`spot_time >= NOW() - INTERVAL '1 day' * ${input.days} AND frequency IS NOT NULL`
      )
      .groupBy(sql`1`)
      .orderBy(sql`COUNT(*) DESC`);
  }),

  byRegion: publicProcedure.input(daysInput).query(async ({ input }) => {
    return getDb()
      .select({
        region: sql<string>`SPLIT_PART(location_desc, '-', 1)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(spots)
      .where(
        sql`spot_time >= NOW() - INTERVAL '1 day' * ${input.days} AND location_desc IS NOT NULL`
      )
      .groupBy(sql`SPLIT_PART(location_desc, '-', 1)`)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(20);
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
