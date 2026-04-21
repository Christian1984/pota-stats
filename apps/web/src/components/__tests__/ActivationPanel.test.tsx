import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ActivationPanel } from "../ActivationPanel";

// All date assertions assume UTC (process.env.TZ = "UTC" set in jest.setup.ts).

interface Activation {
  activator: string | null;
  reference: string | null;
  parkName: string | null;
  mode: string | null;
  band: string | null;
  startTime: Date;
  lastSeen: Date;
}

function make(overrides: Partial<Activation> = {}): Activation {
  return {
    activator: "W1AW",
    reference: "K-0001",
    parkName: "Test Park",
    mode: "SSB",
    band: "20m",
    startTime: new Date("2024-06-15T10:00:00Z"),
    lastSeen: new Date("2024-06-15T14:00:00Z"),
    ...overrides,
  };
}

describe("ActivationPanel", () => {
  const noop = () => {};

  // ── Loading & empty states ──────────────────────────────────────────────

  it("shows a loading spinner when loading is true", () => {
    const { container } = render(
      <ActivationPanel label="K-0001" activations={[]} loading onClose={noop} />
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("does not show the table while loading", () => {
    render(<ActivationPanel label="K-0001" activations={[make()]} loading onClose={noop} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows 'No activations' when the list is empty and not loading", () => {
    render(<ActivationPanel label="K-0001" activations={[]} loading={false} onClose={noop} />);
    expect(screen.getByText("No activations")).toBeInTheDocument();
  });

  // ── BUG: "0 activations" footer shown simultaneously with "No activations" ──
  // The count <p> is rendered unconditionally, so empty state displays both
  // "No activations" (centre) and "0 activations" (footer) at the same time.
  it("does NOT show '0 activations' count when no activations exist", () => {
    render(<ActivationPanel label="K-0001" activations={[]} loading={false} onClose={noop} />);
    // This test currently FAILS — exposes the bug.
    // When fixed, the footer should be hidden (or show nothing) for an empty list.
    expect(screen.queryByText("0 activations")).not.toBeInTheDocument();
  });

  // ── Header & close button ───────────────────────────────────────────────

  it("renders the park label in the header", () => {
    render(<ActivationPanel label="K-0001 · Test Park" activations={[]} loading={false} onClose={noop} />);
    expect(screen.getByText("K-0001 · Test Park")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const handleClose = jest.fn();
    render(<ActivationPanel label="K-0001" activations={[make()]} loading={false} onClose={handleClose} />);
    await userEvent.click(screen.getByTitle("Close"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  // ── Activation count pluralisation ─────────────────────────────────────

  it("shows '1 activation' (singular) in the footer", () => {
    render(<ActivationPanel label="K-0001" activations={[make()]} loading={false} onClose={noop} />);
    expect(screen.getByText("1 activation")).toBeInTheDocument();
  });

  it("shows '2 activations' (plural) in the footer", () => {
    render(
      <ActivationPanel label="K-0001" activations={[make(), make()]} loading={false} onClose={noop} />
    );
    expect(screen.getByText("2 activations")).toBeInTheDocument();
  });

  // ── Null field display ──────────────────────────────────────────────────

  it("shows '—' for a null activator", () => {
    render(
      <ActivationPanel
        label="K-0001"
        activations={[make({ activator: null })]}
        loading={false}
        onClose={noop}
      />
    );
    expect(screen.getByRole("cell", { name: "—" })).toBeInTheDocument();
  });

  it("shows '—' for a null mode", () => {
    render(
      <ActivationPanel
        label="K-0001"
        activations={[make({ mode: null })]}
        loading={false}
        onClose={noop}
      />
    );
    // mode cell uses `|| "—"` so empty string also becomes "—"
    const cells = screen.getAllByRole("cell", { name: "—" });
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  // ── Park column visibility ──────────────────────────────────────────────

  it("does NOT show a 'Park' column when all activations share the same reference", () => {
    render(
      <ActivationPanel
        label="K-0001"
        activations={[make({ reference: "K-0001" }), make({ reference: "K-0001" })]}
        loading={false}
        onClose={noop}
      />
    );
    expect(screen.queryByRole("columnheader", { name: "Park" })).not.toBeInTheDocument();
  });

  it("shows a 'Park' column when activations have distinct references", () => {
    render(
      <ActivationPanel
        label="2 parks"
        activations={[
          make({ reference: "K-0001" }),
          make({ reference: "K-0002" }),
        ]}
        loading={false}
        onClose={noop}
      />
    );
    expect(screen.getByRole("columnheader", { name: "Park" })).toBeInTheDocument();
  });

  // ── BUG: null reference counted as a distinct park ──────────────────────
  // new Set(["K-0001", null]).size === 2, so multiPark becomes true even though
  // there is only one real park reference.  The Park column should NOT appear.
  it("does NOT show a 'Park' column when only one non-null reference exists alongside null refs", () => {
    render(
      <ActivationPanel
        label="K-0001"
        activations={[
          make({ reference: "K-0001" }),
          make({ reference: null }),   // null should not count as a second park
        ]}
        loading={false}
        onClose={noop}
      />
    );
    // This test currently FAILS — exposes the bug.
    // Fix: filter nulls before computing Set size, e.g.:
    //   new Set(activations.map(a => a.reference).filter(Boolean)).size > 1
    expect(screen.queryByRole("columnheader", { name: "Park" })).not.toBeInTheDocument();
  });

  // ── Time display: same-day vs cross-day ────────────────────────────────
  // sameDay() compares calendar dates in local time.  With TZ=UTC these tests
  // are deterministic.

  it("shows only the time for lastSeen when start and end are on the same calendar day", () => {
    // startTime 10:00 UTC, lastSeen 14:00 UTC — same day in UTC
    const activation = make({
      startTime: new Date("2024-06-15T10:00:00Z"),
      lastSeen:  new Date("2024-06-15T14:00:00Z"),
    });
    render(
      <ActivationPanel label="K-0001" activations={[activation]} loading={false} onClose={noop} />
    );
    const timeCell = screen.getByRole("cell", { name: /→/ });
    const parts = timeCell.textContent!.split(" → ");
    const lastSeenPart = parts[1]; // e.g. "14:00"
    // fmtShort only formats hour+minute — no month name expected
    expect(lastSeenPart).toMatch(/^\d{2}:\d{2}$/);
  });

  it("shows the full date for lastSeen when start and end are on different calendar days", () => {
    // 3 days apart — unambiguously different days in any timezone
    const activation = make({
      startTime: new Date("2024-06-12T10:00:00Z"),
      lastSeen:  new Date("2024-06-15T14:00:00Z"),
    });
    render(
      <ActivationPanel label="K-0001" activations={[activation]} loading={false} onClose={noop} />
    );
    const timeCell = screen.getByRole("cell", { name: /→/ });
    const parts = timeCell.textContent!.split(" → ");
    const lastSeenPart = parts[1]; // e.g. "15 Jun, 14:00"
    // fmt includes month — expect a month abbreviation
    expect(lastSeenPart).toMatch(/[A-Z][a-z]{2}/); // e.g. "Jun"
  });
});
