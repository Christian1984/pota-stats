import { BAND_ORDER, DOW_LABELS, HOUR_LABELS } from "../labels";

describe("HOUR_LABELS", () => {
  it("has 24 entries", () => {
    expect(HOUR_LABELS).toHaveLength(24);
  });

  it("formats hours as HH:00", () => {
    expect(HOUR_LABELS[0]).toBe("00:00");
    expect(HOUR_LABELS[9]).toBe("09:00");
    expect(HOUR_LABELS[23]).toBe("23:00");
  });

  it("pads single-digit hours with a leading zero", () => {
    for (let i = 0; i < 10; i++) {
      expect(HOUR_LABELS[i]).toMatch(/^0\d:00$/);
    }
  });

  it("does not pad two-digit hours", () => {
    for (let i = 10; i < 24; i++) {
      expect(HOUR_LABELS[i]).toMatch(/^\d{2}:00$/);
      expect(HOUR_LABELS[i]).not.toMatch(/^0/);
    }
  });
});

describe("DOW_LABELS", () => {
  it("has 7 entries", () => {
    expect(DOW_LABELS).toHaveLength(7);
  });

  it("contains the expected abbreviated names in order", () => {
    expect(DOW_LABELS).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("index 0 is Sunday and index 6 is Saturday", () => {
    expect(DOW_LABELS[0]).toBe("Sun");
    expect(DOW_LABELS[6]).toBe("Sat");
  });
});

describe("BAND_ORDER", () => {
  it("has 12 entries", () => {
    expect(BAND_ORDER).toHaveLength(12);
  });

  it("starts with 160m and ends with UHF+", () => {
    expect(BAND_ORDER[0]).toBe("160m");
    expect(BAND_ORDER[BAND_ORDER.length - 1]).toBe("UHF+");
  });

  it("contains the core HF bands", () => {
    expect(BAND_ORDER).toContain("160m");
    expect(BAND_ORDER).toContain("80m");
    expect(BAND_ORDER).toContain("40m");
    expect(BAND_ORDER).toContain("20m");
    expect(BAND_ORDER).toContain("10m");
  });

  it("contains the VHF/UHF bands", () => {
    expect(BAND_ORDER).toContain("6m");
    expect(BAND_ORDER).toContain("2m");
    expect(BAND_ORDER).toContain("UHF+");
  });

  it("has no duplicate entries", () => {
    expect(new Set(BAND_ORDER).size).toBe(BAND_ORDER.length);
  });
});
