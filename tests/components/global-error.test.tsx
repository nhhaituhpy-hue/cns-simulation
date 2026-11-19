import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import GlobalError from "../../src/app/global-error";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/error", () => ({ default: () => <main>Application error</main> }));

it("captures root layout errors and renders the fallback", () => {
  const error = new Error("Root layout failed");
  const view = render(<GlobalError error={error} />, { container: document });
  expect(Sentry.captureException).toHaveBeenCalledWith(error);
  expect(view.getByText("Application error")).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("vi");
});
