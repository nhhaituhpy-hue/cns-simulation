import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ScenarioDataTable } from "@/components/ui/scenario-data-table";

const scenarios = Array.from({ length: 12 }, (_, index) => ({
  id: `scenario-${index + 1}`,
  title:
    index === 11
      ? "Mất tín hiệu Ăng-ten"
      : `Kịch bản kiểm tra ${String(index + 1).padStart(2, "0")}`,
}));

const columns = [
  { id: "number", label: "STT" },
  { id: "title", label: "Tiêu đề" },
];

function renderTable() {
  return render(
    <ScenarioDataTable
      items={scenarios}
      caption="Danh sách kiểm thử"
      columns={columns}
      renderCells={(scenario, rowIndex) => (
        <>
          <td>{rowIndex + 1}</td>
          <td><h3>{scenario.title}</h3></td>
        </>
      )}
    />,
  );
}

describe("ScenarioDataTable", () => {
  it("shows ten scenarios per page and preserves the absolute row number", async () => {
    const user = userEvent.setup();
    renderTable();

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(10);
    expect(screen.getByText("Hiển thị 1-10 trong 12 kịch bản")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mở trang 2" }));

    const rows = screen.getAllByRole("row");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
    expect(within(rows[1]).getByText("11")).toBeInTheDocument();
    expect(within(rows[2]).getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Hiển thị 11-12 trong 12 kịch bản")).toBeInTheDocument();
  });

  it("filters titles without requiring Vietnamese accents and resets to page one", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("button", { name: "Mở trang 2" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Tìm nhanh theo tiêu đề kịch bản" }),
      "mat tin hieu",
    );

    expect(screen.getByRole("heading", { name: "Mất tín hiệu Ăng-ten" })).toBeInTheDocument();
    expect(screen.getByText("1/12 kịch bản phù hợp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở trang 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows a dedicated empty search result without hiding the table headers", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(
      screen.getByRole("searchbox", { name: "Tìm nhanh theo tiêu đề kịch bản" }),
      "không tồn tại",
    );

    expect(screen.getByText("Không tìm thấy kịch bản phù hợp với tiêu đề đã nhập.")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tiêu đề" })).toBeInTheDocument();
    expect(screen.getByText("Hiển thị 0-0 trong 0 kịch bản")).toBeInTheDocument();
  });
});
