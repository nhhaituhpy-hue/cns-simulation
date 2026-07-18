import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExamStatusBadge } from "@/components/exams/shared";

afterEach(cleanup);

describe("ExamStatusBadge", () => {
  it("centers the status text inside a stretched header action row", () => {
    render(<ExamStatusBadge status="open" />);

    expect(screen.getByText("Đang mở")).toHaveClass("items-center", "justify-center", "leading-none");
  });
});
