import { render } from "@testing-library/react";
import React from "react";

// Leaflet requires a real DOM and browser APIs not available in jsdom.
// The side-effect import "leaflet.markercluster" is mocked to avoid patching L at module load.
jest.mock("leaflet.markercluster", () => ({}));
jest.mock("leaflet", () => ({
  __esModule: true,
  default: {
    map: jest.fn(() => ({
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
    })),
    tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
    marker: jest.fn(() => ({ bindPopup: jest.fn().mockReturnThis() })),
    markerClusterGroup: jest.fn(() => ({ addLayer: jest.fn() })),
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: jest.fn(),
      },
    },
  },
}));

import { SpotMap } from "../SpotMap";

function getL() {
  return (jest.requireMock("leaflet") as { default: typeof import("leaflet") }).default;
}

describe("SpotMap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a container div with 400px height", () => {
    const { container } = render(<SpotMap points={[]} />);
    const div = container.firstChild as HTMLElement;
    expect(div).toBeInTheDocument();
    expect(div.style.height).toBe("400px");
  });

  it("initialises a Leaflet map on first render", () => {
    render(<SpotMap points={[]} />);
    expect(getL().map).toHaveBeenCalledTimes(1);
  });

  it("creates markers for points with valid coordinates", () => {
    render(
      <SpotMap
        points={[{ reference: "K-0001", parkName: "Test Park", lat: "45.0", lon: "-93.5" }]}
      />
    );
    const L = getL();
    expect(L.marker).toHaveBeenCalledTimes(1);
    expect(L.marker).toHaveBeenCalledWith([45.0, -93.5]);
  });

  it("skips points where lat or lon is null", () => {
    render(
      <SpotMap points={[{ reference: "K-0001", parkName: "Test Park", lat: null, lon: null }]} />
    );
    expect(getL().marker).not.toHaveBeenCalled();
  });

  it("skips points with non-numeric coordinate strings", () => {
    render(
      <SpotMap points={[{ reference: "K-0001", parkName: "Park", lat: "invalid", lon: "bad" }]} />
    );
    expect(getL().marker).not.toHaveBeenCalled();
  });

  it("creates multiple markers for multiple valid points", () => {
    render(
      <SpotMap
        points={[
          { reference: "K-0001", parkName: "Park A", lat: "45.0", lon: "-93.5" },
          { reference: "K-0002", parkName: "Park B", lat: "51.5", lon: "-0.1" },
        ]}
      />
    );
    expect(getL().marker).toHaveBeenCalledTimes(2);
  });

  it("adds all markers to the cluster group", () => {
    const mockCluster = { addLayer: jest.fn() };
    (getL().markerClusterGroup as jest.Mock).mockReturnValue(mockCluster);

    render(
      <SpotMap
        points={[
          { reference: "K-0001", parkName: "Park A", lat: "45.0", lon: "-93.5" },
          { reference: "K-0002", parkName: "Park B", lat: "51.5", lon: "-0.1" },
        ]}
      />
    );
    expect(mockCluster.addLayer).toHaveBeenCalledTimes(2);
  });
});
