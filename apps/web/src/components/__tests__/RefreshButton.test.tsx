import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { RefreshButton } from "../RefreshButton";

describe("RefreshButton", () => {
  it("renders a button when not fetching", () => {
    render(<RefreshButton isFetching={false} onRefresh={jest.fn()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls onRefresh when clicked", async () => {
    const onRefresh = jest.fn();
    render(<RefreshButton isFetching={false} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("hides the button while fetching", () => {
    render(<RefreshButton isFetching onRefresh={jest.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a spinner while fetching", () => {
    const { container } = render(<RefreshButton isFetching onRefresh={jest.fn()} />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("does not show a spinner when not fetching", () => {
    const { container } = render(<RefreshButton isFetching={false} onRefresh={jest.fn()} />);
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
  });
});
