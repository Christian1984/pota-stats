import { bigint, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const spots = pgTable(
  "spots",
  {
    spotId: bigint("spot_id", { mode: "number" }).primaryKey(),
    activator: text("activator"),
    frequency: numeric("frequency", { precision: 10, scale: 1 }),
    mode: text("mode"),
    reference: text("reference"),
    parkName: text("park_name"),
    spotTime: timestamp("spot_time", { withTimezone: true }).notNull(),
    spotter: text("spotter"),
    comments: text("comments"),
    source: text("source"),
    locationDesc: text("location_desc"),
    latitude: numeric("latitude", { precision: 8, scale: 5 }),
    longitude: numeric("longitude", { precision: 8, scale: 5 }),
    grid4: text("grid4"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_spots_spot_time").on(t.spotTime),
    index("idx_spots_location_desc").on(t.locationDesc),
    index("idx_spots_mode").on(t.mode),
    index("idx_spots_frequency").on(t.frequency),
  ]
);

export type Spot = typeof spots.$inferSelect;
export type NewSpot = typeof spots.$inferInsert;
