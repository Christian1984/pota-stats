import { render } from "@testing-library/react";
import React from "react";

jest.mock("leaflet.markercluster", () => ({}));
jest.mock("leaflet", () => ({
  __esModule: true,
  default: {
    map: jest.fn(() => ({
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
    })),
    tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
    marker: jest.fn(() => ({
      bindPopup: jest.fn().mockReturnThis(),
      on: jest.fn(),
    })),
    markerClusterGroup: jest.fn(() => ({
      addLayer: jest.fn(),
      on: jest.fn(),
    })),
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
      <SpotMap
        points={[{ reference: "K-0001", parkName: "Test Park", lat: null, lon: null }]}
      />
    );
    expect(getL().marker).not.toHaveBeenCalled();
  });

  it("skips points with non-numeric coordinate strings", () => {
    render(
      <SpotMap points={[{ reference: "K-0001", parkName: "Park", lat: "invalid", lon: "bad" }]}
      />
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
    const mockCluster = { addLayer: jest.fn(), on: jest.fn() };
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

  describe("onSelect prop", () => {
    it("binds a click handler on each marker when onSelect is provided", () => {
      const onSelect = jest.fn();
      render(
        <SpotMap
          points={[{ reference: "K-0001", parkName: "Test Park", lat: "45.0", lon: "-93.5" }]}
          onSelect={onSelect}
        />
      );
      const mockMarkerInstance = (getL().marker as jest.Mock).mock.results[0].value;
      expect(mockMarkerInstance.on).toHaveBeenCalledWith("click", expect.any(Function));
    });

    it("calls onSelect with the reference and label when a marker is clicked", () => {
      const onSelect = jest.fn();
      render(
        <SpotMap
          points={[{ reference: "K-0001", parkName: "Test Park", lat: "45.0", lon: "-93.5" }]}
          onSelect={onSelect}
        />
      );
      const mockMarkerInstance = (getL().marker as jest.Mock).mock.results[0].value;
      const [, handler] = mockMarkerInstance.on.mock.calls[0];
      handler();
      expect(onSelect).toHaveBeenCalledWith(["K-0001"], "K-0001 · Test Park");
    });

    it("does NOT call onSelect for a point with no reference", () => {
      const onSelect = jest.fn();
      render(
        <SpotMap
          points={[{ reference: null, parkName: "Test Park", lat: "45.0", lon: "-93.5" }]}
          onSelect={onSelect}
        />
      );
      const mockMarkerInstance = (getL().marker as jest.Mock).mock.results[0].value;
      const [, handler] = mockMarkerInstance.on.mock.calls[0];
      handler();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("registers a clusterclick handler on the cluster group when onSelect is provided", () => {
      const onSelect = jest.fn();
      const mockCluster = { addLayer: jest.fn(), on: jest.fn() };
      (getL().markerClusterGroup as jest.Mock).mockReturnValue(mockCluster);

      render(
        <SpotMap
          points={[{ reference: "K-0001", parkName: "Park A", lat: "45.0", lon: "-93.5" }]}
          onSelect={onSelect}
        />
      );
      expect(mockCluster.on).toHaveBeenCalledWith("clusterclick", expect.any(Function));
    });

    it("does NOT bind a popup when onSelect is provided (click replaces popup)", () => {
      const onSelect = jest.fn();
      render(
        <SpotMap
          points={[{ reference: "K-0001", parkName: "Test Park", lat: "45.0", lon: "-93.5" }]}
          onSelect={onSelect}
        />
      );
      const mockMarkerInstance = (getL().marker as jest.Mock).mock.results[0].value;
      expect(mockMarkerInstance.bindPopup).not.toHaveBeenCalled();
    });

    it("still binds popups when onSelect is NOT provided", () => {
      render(
        <SpotMap
          points={[{ reference: "K-0001", parkName: "Test Park", lat: "45.0", lon: "-93.5" }]}
        />
      );
      const mockMarkerInstance = (getL().marker as jest.Mock).mock.results[0].value;
      expect(mockMarkerInstance.bindPopup).toHaveBeenCalled();
    });
  });
});
