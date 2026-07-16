import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScenarioWizardForm } from "@/components/admin/scenario-wizard-form";

beforeEach(() => {
  window.scrollTo = vi.fn();
});

afterEach(cleanup);

describe("ScenarioWizardForm", () => {
  it("blocks the first step until required metadata is valid", async () => {
    const user = userEvent.setup();
    render(<ScenarioWizardForm onSave={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(screen.getByText("Tiêu đề cần ít nhất 3 ký tự.")).toBeInTheDocument();
    expect(screen.getByText("Hãy nhập mô tả cho kịch bản.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Thông tin kịch bản" }),
    ).toBeInTheDocument();
  });

  it("saves a four-step draft with a TerminalEngine action", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ScenarioWizardForm onSave={onSave} />);

    await user.type(
      screen.getByLabelText("Tiêu đề kịch bản"),
      "Khôi phục kết nối Sensor A",
    );
    await user.type(
      screen.getByLabelText("Mô tả"),
      "Thực hành kiểm tra và khôi phục luồng dữ liệu.",
    );
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(
      screen.getByRole("heading", { name: "Cấu hình trạng thái ban đầu" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(
      screen.getByRole("heading", { name: "Chọn vai trò đăng nhập" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(
      screen.getByRole("heading", { name: "Xây dựng đáp án thao tác" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /General Settings/ }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(
      screen.getByRole("heading", { name: "Hardware Fault" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tạo kịch bản" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: "Khôi phục kết nối Sensor A",
      targetLoginUser: "sysadmin",
    });
    expect(onSave.mock.calls[0][0].expectedActions).toHaveLength(1);
    expect(onSave.mock.calls[0][0].expectedActions[0]).toMatchObject({
      menuId: "sa.root",
      input: "1",
      resultLabel: "General Settings",
    });
  });
});
