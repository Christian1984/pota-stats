/**
 * @jest-environment node
 */

// Mock trpc to avoid superjson (ESM-only, not transformable by Jest)
jest.mock("../trpc", () => {
  const { initTRPC } = require("@trpc/server");
  const t = initTRPC.create();
  return { t, router: t.router, publicProcedure: t.procedure };
});
jest.mock("@pota-stats/db", () => ({ spots: {} }));
jest.mock("../db");

import { filterMatchExpr } from "../routers/spots";
import type { SQL } from "drizzle-orm";

function toSql(q: SQL): string {
  return (q as unknown as { toQuery: (opts: object) => { sql: string } }).toQuery({
    escapeName: (n: string) => n,
    escapeParam: (_i: number, v: unknown) => `'${v}'`,
    escapeString: (s: string) => `'${s}'`,
    casing: "snake_case",
  }).sql;
}

describe("filterMatchExpr", () => {
  it("hour — uses spot_time, NOT last_seen_at", () => {
    const s = toSql(filterMatchExpr("hour", "14", "UTC"));
    expect(s).toContain("spot_time");
    expect(s).not.toContain("last_seen_at");
    expect(s).toContain("14");
  });

  it("dow — uses spot_time, NOT last_seen_at", () => {
    const s = toSql(filterMatchExpr("dow", "3", "America/New_York"));
    expect(s).toContain("spot_time");
    expect(s).not.toContain("last_seen_at");
    expect(s).toContain("3");
  });

  it("mode — matches mode column by value", () => {
    const s = toSql(filterMatchExpr("mode", "SSB", "UTC"));
    expect(s).toContain("mode");
    expect(s).toContain("'SSB'");
  });

  it("band — uses frequency CASE expression", () => {
    const s = toSql(filterMatchExpr("band", "20m", "UTC"));
    expect(s).toContain("frequency");
    expect(s).toContain("'20m'");
  });

  it("region — uses SPLIT_PART on location_desc", () => {
    const s = toSql(filterMatchExpr("region", "K", "UTC"));
    expect(s).toContain("SPLIT_PART");
    expect(s).toContain("location_desc");
    expect(s).toContain("'K'");
  });
});
