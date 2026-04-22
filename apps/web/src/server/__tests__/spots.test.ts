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

import { getDb } from "../db";
import { t } from "../trpc";
import { spotsRouter } from "../routers/spots";

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

function makeMockDb(executeRows: unknown[] = [], selectFromRows: unknown[] = []) {
  const mockFrom = jest.fn().mockResolvedValue(selectFromRows);
  const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
  const mockExecute = jest.fn().mockResolvedValue(executeRows);
  return { execute: mockExecute, select: mockSelect, _from: mockFrom };
}

function toSql(q: unknown): string {
  return (q as { toQuery: (opts: object) => { sql: string } }).toQuery({
    escapeName: (n: string) => n,
    escapeParam: (_i: number, v: unknown) => `'${v}'`,
    escapeString: (s: string) => `'${s}'`,
    casing: "snake_case",
  }).sql;
}

const createCaller = t.createCallerFactory(spotsRouter);
const caller = createCaller({});

const RANGE = {
  from: "2024-01-01T00:00:00.000Z",
  to: "2024-01-08T00:00:00.000Z",
  timezone: "UTC",
};

const STATS_INPUT = { from: RANGE.from, to: RANGE.to };

// ── stats ────────────────────────────────────────────────────────────────────

describe("stats", () => {
  function makeStatsMockDb(totalRows: unknown[], rangeRows: unknown[], lastInserted: unknown = null) {
    const mockFrom = jest.fn().mockResolvedValue([{ lastInserted }]);
    const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });
    const mockExecute = jest.fn()
      .mockResolvedValueOnce(totalRows)
      .mockResolvedValueOnce(rangeRows);
    return { execute: mockExecute, select: mockSelect, _from: mockFrom };
  }

  it("returns { total, rangeTotal, lastInserted }", async () => {
    const lastInserted = new Date("2024-01-07T12:00:00Z");
    const db = makeStatsMockDb([{ total: 42 }], [{ total: 15 }], lastInserted);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await caller.stats(STATS_INPUT);
    expect(result.total).toBe(42);
    expect(result.rangeTotal).toBe(15);
    expect(result.lastInserted).toEqual(lastInserted);
  });

  it("returns total=0 and rangeTotal=0 when execute returns no rows", async () => {
    const db = makeStatsMockDb([], []);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await caller.stats(STATS_INPUT);
    expect(result.total).toBe(0);
    expect(result.rangeTotal).toBe(0);
  });

  it("global total SQL has no date filter", async () => {
    const db = makeStatsMockDb([{ total: 7 }], [{ total: 3 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.stats(STATS_INPUT);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("DISTINCT");
    expect(sql).toContain("DATE(timezone");
    expect(sql).not.toContain("last_seen_at >=");
  });

  it("range total SQL filters by last_seen_at lower bound and spot_time upper bound", async () => {
    const db = makeStatsMockDb([{ total: 7 }], [{ total: 3 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.stats(STATS_INPUT);
    const sql = toSql(db.execute.mock.calls[1][0]);
    expect(sql).toContain("DISTINCT");
    expect(sql).toContain("DATE(timezone");
    expect(sql).toContain("last_seen_at >=");
  });

  it("SQL excludes QRT records", async () => {
    const db = makeStatsMockDb([{ total: 0 }], [{ total: 0 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.stats(STATS_INPUT);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("QRT");
  });
});

// ── byHour ───────────────────────────────────────────────────────────────────

describe("byHour", () => {
  it("without filter — returns data with filteredCount equal to count", async () => {
    const db = makeMockDb([{ hour: 14, count: 5 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await caller.byHour(RANGE);
    expect(result).toEqual([{ hour: 14, count: 5, filteredCount: 5 }]);
  });

  it("without filter — SQL uses spot_time for HOUR extraction (not last_seen_at)", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byHour(RANGE);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toMatch(/EXTRACT\(HOUR FROM.*spot_time/i);
    expect(sql).not.toMatch(/EXTRACT\(HOUR FROM.*last_seen_at/i);
  });

  it("without filter — SQL includes DATE(timezone in DISTINCT clause", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byHour(RANGE);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("DATE(timezone");
  });

  it("with filter — SQL includes BOOL_OR and DATE(timezone", async () => {
    const db = makeMockDb([{ hour: 10, count: 3, filteredCount: 2 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byHour({ ...RANGE, filter: { dimension: "mode", value: "SSB" } });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("BOOL_OR");
    expect(sql).toContain("DATE(timezone");
  });
});

// ── byWeekday ─────────────────────────────────────────────────────────────────

describe("byWeekday", () => {
  it("without filter — returns data with filteredCount equal to count", async () => {
    const db = makeMockDb([{ dow: 1, count: 8 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await caller.byWeekday(RANGE);
    expect(result).toEqual([{ dow: 1, count: 8, filteredCount: 8 }]);
  });

  it("without filter — SQL uses spot_time for DOW extraction (not last_seen_at)", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byWeekday(RANGE);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toMatch(/EXTRACT\(DOW FROM.*spot_time/i);
    expect(sql).not.toMatch(/EXTRACT\(DOW FROM.*last_seen_at/i);
  });

  it("without filter — SQL includes DATE(timezone in DISTINCT clause", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byWeekday(RANGE);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("DATE(timezone");
  });

  it("with filter — SQL includes BOOL_OR and DATE(timezone", async () => {
    const db = makeMockDb([{ dow: 2, count: 4, filteredCount: 1 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byWeekday({ ...RANGE, filter: { dimension: "band", value: "20m" } });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("BOOL_OR");
    expect(sql).toContain("DATE(timezone");
  });
});

// ── byBand ───────────────────────────────────────────────────────────────────

describe("byBand", () => {
  it("without filter — returns data with filteredCount equal to count", async () => {
    const db = makeMockDb([{ band: "20m", count: 12 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await caller.byBand(RANGE);
    expect(result).toEqual([{ band: "20m", count: 12, filteredCount: 12 }]);
  });

  it("without filter — SQL includes DATE(timezone in DISTINCT", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byBand(RANGE);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("DATE(timezone");
    expect(sql).toContain("DISTINCT");
  });

  it("with filter — SQL includes DATE(timezone and BOOL_OR", async () => {
    const db = makeMockDb([{ band: "40m", count: 5, filteredCount: 2 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byBand({ ...RANGE, filter: { dimension: "mode", value: "CW" } });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("DATE(timezone");
    expect(sql).toContain("BOOL_OR");
  });
});

// ── byMode ───────────────────────────────────────────────────────────────────

describe("byMode", () => {
  it("without filter — returns data with filteredCount equal to count", async () => {
    const db = makeMockDb([{ mode: "SSB", count: 20 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await caller.byMode(RANGE);
    expect(result).toEqual([{ mode: "SSB", count: 20, filteredCount: 20 }]);
  });

  it("without filter — SQL includes DATE(timezone in DISTINCT", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byMode(RANGE);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("DATE(timezone");
    expect(sql).toContain("DISTINCT");
  });

  it("with filter — SQL includes DATE(timezone and BOOL_OR", async () => {
    const db = makeMockDb([{ mode: "FT8", count: 10, filteredCount: 3 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byMode({ ...RANGE, filter: { dimension: "band", value: "20m" } });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("DATE(timezone");
    expect(sql).toContain("BOOL_OR");
  });
});

// ── byRegion ──────────────────────────────────────────────────────────────────

describe("byRegion", () => {
  it("without filter — returns data with filteredCount equal to count", async () => {
    const db = makeMockDb([{ region: "K", count: 30 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await caller.byRegion(RANGE);
    expect(result).toEqual([{ region: "K", count: 30, filteredCount: 30 }]);
  });

  it("without filter — SQL includes DATE(timezone in DISTINCT", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byRegion(RANGE);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("DATE(timezone");
    expect(sql).toContain("DISTINCT");
  });

  it("with filter — SQL includes DATE(timezone and BOOL_OR", async () => {
    const db = makeMockDb([{ region: "VE", count: 5, filteredCount: 1 }]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.byRegion({ ...RANGE, filter: { dimension: "mode", value: "SSB" } });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("DATE(timezone");
    expect(sql).toContain("BOOL_OR");
  });
});

// ── mapPoints ─────────────────────────────────────────────────────────────────

describe("mapPoints", () => {
  it("without filter — returns map point rows", async () => {
    const row = { reference: "K-0001", parkName: "Test Park", lat: "40.0", lon: "-75.0" };
    const db = makeMockDb([row]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await caller.mapPoints({ ...RANGE, limit: 100 });
    expect(result).toEqual([row]);
  });

  it("without filter — SQL filters by lat/lon IS NOT NULL and date range", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.mapPoints({ ...RANGE, limit: 500 });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("latitude IS NOT NULL");
    expect(sql).toContain("longitude IS NOT NULL");
    expect(sql).toContain("last_seen_at >=");
    expect(sql).toContain("QRT");
  });

  it("without filter — SQL includes the limit", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.mapPoints({ ...RANGE, limit: 42 });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("'42'");
  });

  it("with filter — SQL includes filter expression", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.mapPoints({ ...RANGE, limit: 100, filter: { dimension: "mode", value: "CW" } });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("'CW'");
    expect(sql).toContain("mode");
  });

  it("with filter — SQL still includes lat/lon and date range", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.mapPoints({ ...RANGE, limit: 100, filter: { dimension: "band", value: "20m" } });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("latitude IS NOT NULL");
    expect(sql).toContain("last_seen_at >=");
  });
});

// ── activationsForPark ────────────────────────────────────────────────────────

describe("activationsForPark", () => {
  const PARK_INPUT = {
    references: ["K-0001", "K-0002"],
    ...RANGE,
  };

  it("without filter — returns activation rows", async () => {
    const row = {
      activator: "W1AW",
      reference: "K-0001",
      parkName: "Test Park",
      mode: "SSB",
      band: "20m",
      startTime: new Date("2024-01-03T14:00:00Z"),
      lastSeen: new Date("2024-01-03T15:00:00Z"),
    };
    const db = makeMockDb([row]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await caller.activationsForPark(PARK_INPUT);
    expect(result).toEqual([row]);
  });

  it("without filter — SQL includes reference IN clause and date range", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.activationsForPark(PARK_INPUT);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("reference IN");
    expect(sql).toContain("'K-0001'");
    expect(sql).toContain("'K-0002'");
    expect(sql).toContain("last_seen_at >=");
    expect(sql).toContain("QRT");
  });

  it("without filter — SQL groups by activator/reference/date and orders by start time DESC", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.activationsForPark(PARK_INPUT);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("GROUP BY activator");
    expect(sql).toContain("DATE(timezone");
    expect(sql).toContain("MIN(spot_time)");
    expect(sql).toContain("DESC");
  });

  it("without filter — SQL assigns band via CASE expression", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.activationsForPark(PARK_INPUT);
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("frequency");
    expect(sql).toContain("20m");
  });

  it("with filter — SQL includes filter expression", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.activationsForPark({ ...PARK_INPUT, filter: { dimension: "mode", value: "FT8" } });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("'FT8'");
    expect(sql).toContain("mode");
  });

  it("with filter — SQL still includes reference IN clause", async () => {
    const db = makeMockDb([]);
    mockGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await caller.activationsForPark({ ...PARK_INPUT, filter: { dimension: "band", value: "40m" } });
    const sql = toSql(db.execute.mock.calls[0][0]);
    expect(sql).toContain("reference IN");
    expect(sql).toContain("'K-0001'");
  });
});
