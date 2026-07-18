import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

const { mockHasRequiredRole, mockPush } = vi.hoisted(() => ({
  mockHasRequiredRole: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/access-actions", () => ({
  hasRequiredRoleAction: mockHasRequiredRole,
}));

beforeEach(() => {
  mockHasRequiredRole.mockReset();
  mockPush.mockReset();
});

describe("Home page layout", () => {
  it("uses a full-width 4/6 grid and aligns the media card bottom", () => {
    render(<Home />);

    const heading = screen.getByRole("heading", {
      name: "Kiểm tra đánh giá năng lực dựa trên thực tế vận hành hệ thống CNS",
    });
    const section = heading.closest("section");
    const roleCards = screen.getByRole("link", { name: /Quản lý kỳ kiểm tra/ }).parentElement;
    const contentColumn = roleCards?.parentElement;
    const video = screen.getByLabelText("Hướng dẫn Giám khảo VOR");
    const carousel = video.parentElement;
    const mediaCard = carousel?.parentElement;

    expect(section).toHaveClass("items-start");
    expect(section).toHaveClass("lg:items-stretch");
    expect(section).toHaveClass("lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]");
    expect(section).toHaveClass("max-w-none");
    expect(section).not.toHaveClass("max-w-[1440px]");
    expect(section).not.toHaveClass("items-center");
    expect(section).not.toHaveClass("min-h-[calc(100dvh-4.25rem)]");
    expect(contentColumn).toHaveClass("flex", "min-w-0", "flex-col");
    expect(contentColumn).toHaveClass("lg:h-full");
    expect(contentColumn).not.toHaveClass("max-w-2xl");
    expect(heading).toHaveClass("text-[15px]");
    expect(heading).toHaveClass("max-w-none");
    expect(heading).not.toHaveClass("text-4xl", "xl:text-4xl");
    expect(screen.getByRole("heading", { name: "Giám khảo" })).toHaveClass("text-[15px]");
    const description = screen.getByText(
      "Xây dựng kịch bản khai thác, thực hành khai thác, xử lý sự cố trên môi trường mô phỏng.",
    );
    expect(description).toBeInTheDocument();
    expect(description.parentElement).toHaveClass("flex", "flex-1", "items-center", "py-4");
    expect(roleCards).not.toHaveClass("lg:mt-auto");
    expect(mediaCard).toHaveClass("aspect-video");
    expect(mediaCard).toHaveClass("lg:self-end");
    expect(mediaCard).not.toHaveClass("lg:aspect-auto", "lg:h-full");
    expect(carousel).toHaveAttribute("data-cache-strategy", "supabase-immutable");
    expect(screen.queryByText("Môi trường mô phỏng thiết bị CNS")).not.toBeInTheDocument();
  });

  it("denies a student who selects the examiner card", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    mockHasRequiredRole.mockResolvedValue(false);

    render(<Home />);
    await user.click(screen.getByRole("link", { name: /Quản lý kỳ kiểm tra/ }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Bạn không có quyền truy cập trang này");
    });
    expect(mockPush).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
