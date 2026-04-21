import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BarChartCard } from "../BarChartCard";

// Recharts uses canvas/animation APIs unavailable in jsdom — replace with lightweight stubs.
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: React.PropsWithChildren) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-rows={data.length}>
      {children}
    </div>
  ),
  Bar: ({
    dataKey,
    onClick,
    children,
  }: {
    dataKey: string;
    onClick?: (data: { label: string; filterValue?: string }) => void;
    children?: React.ReactNode;
  }) => (
    <div
      data-testid={`bar-${dataKey}`}
      onClick={() => onClick?.({ label: "test-label", filterValue: "test-value" })}
    >
      {children}
    </div>
  ),
  Cell: ({ onClick }: { onClick?: () => void; fill?: string; style?: React.CSSProperties }) => (
    <span data-testid="cell" onClick={onClick} />
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

const sampleData = [
  { label: "20m", count: 100, filteredCount: 60 },
  { label: "40m", count: 80, filteredCount: 40 },
];

describe("BarChartCard", () => {
  it("renders the title", () => {
    render(<BarChartCard title="Spots by Band" data={sampleData} />);
    expect(screen.getByText("Spots by Band")).toBeInTheDocument();
  });

  it("shows a loading spinner when loading is true", () => {
    const { container } = render(<BarChartCard title="Test" data={[]} loading />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("does not show the chart or 'No data' while loading", () => {
    render(<BarChartCard title="Test" data={[]} loading />);
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    expect(screen.queryByText("No data")).not.toBeInTheDocument();
  });

  it("shows 'No data' when data is empty and not loading", () => {
    render(<BarChartCard title="Test" data={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders the bar chart when data is provided", () => {
    render(<BarChartCard title="Spots by Band" data={sampleData} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-rows", String(sampleData.length));
  });

  it("renders a single 'count' bar when neither filtered nor owner", () => {
    render(<BarChartCard title="Test" data={sampleData} />);
    expect(screen.getByTestId("bar-count")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-filteredCount")).not.toBeInTheDocument();
  });

  it("calls onBarClick with filterValue when a bar is clicked (normal mode)", async () => {
    const handleClick = jest.fn();
    render(<BarChartCard title="Test" data={sampleData} onBarClick={handleClick} />);
    await userEvent.click(screen.getByTestId("bar-count"));
    expect(handleClick).toHaveBeenCalledWith("test-value");
  });

  it("renders stacked filteredCount + remainingCount bars when filterActive and not owner", () => {
    render(<BarChartCard title="Test" data={sampleData} filterActive isOwner={false} />);
    expect(screen.getByTestId("bar-filteredCount")).toBeInTheDocument();
    expect(screen.getByTestId("bar-remainingCount")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-count")).not.toBeInTheDocument();
  });

  it("renders a single count bar with Cell per item when isOwner is true", () => {
    render(
      <BarChartCard
        title="Test"
        data={sampleData}
        isOwner
        filterActive
        activeValue="20m"
        onBarClick={jest.fn()}
      />
    );
    expect(screen.getByTestId("bar-count")).toBeInTheDocument();
    expect(screen.getAllByTestId("cell")).toHaveLength(sampleData.length);
  });

  it("calls onBarClick with the bar label when a Cell is clicked (owner mode)", async () => {
    const handleClick = jest.fn();
    render(
      <BarChartCard
        title="Test"
        data={[{ label: "20m", count: 100, filteredCount: 60 }]}
        isOwner
        filterActive
        activeValue="20m"
        onBarClick={handleClick}
      />
    );
    await userEvent.click(screen.getByTestId("cell"));
    expect(handleClick).toHaveBeenCalledWith("20m");
  });
});
