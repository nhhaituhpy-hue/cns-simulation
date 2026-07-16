import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { HardwareFaultStep } from "@/components/admin/hardware-fault-step";
import type { ScenarioHardwareFault } from "@/lib/types";

function Harness() {
  const [value, setValue] = useState<ScenarioHardwareFault | undefined>();

  return <HardwareFaultStep value={value} onChange={setValue} />;
}

describe("HardwareFaultStep", () => {
  it("uses Vietnamese labels and allows multiple faulty components", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(
      screen.getByRole("checkbox", { name: "Kịch bản sự cố phần cứng" }),
    );

    expect(screen.getByText(/Đã đánh dấu 1 phần cứng sự cố/)).toBeInTheDocument();
    expect(screen.getByLabelText("Loại sự cố")).toBeInTheDocument();
    const qcmsStatus = screen.getByLabelText("Trạng thái QCMS dự kiến");
    expect(qcmsStatus).toBeInTheDocument();
    expect(screen.getByLabelText("Mô tả sự cố")).toBeInTheDocument();

    await user.selectOptions(qcmsStatus, "red");
    expect(qcmsStatus).toHaveValue("red");

    await user.click(
      screen.getByRole("button", { name: /1090 MHz Omni Antenna/ }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Đánh dấu phần cứng sự cố" }),
    );

    expect(screen.getByText(/Đã đánh dấu 2 phần cứng sự cố/)).toBeInTheDocument();
  });
});
