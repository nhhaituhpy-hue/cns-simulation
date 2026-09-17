import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DME_320_SOFTWARE_MODULE } from "@/modules/operations/dme-320";
import { DVOR_220_SOFTWARE_MODULE } from "@/modules/operations/dvor-220";
import { OperationsSoftwareSimulator } from "@/modules/operations/software-module-pages";
import { VHF_SOFTWARE_MODULE } from "@/modules/operations/vhf";
import { VSAT_SOFTWARE_MODULE } from "@/modules/operations/vsat";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(cleanup);

describe("operations software route dispatcher", () => {
  it.each([
    {
      module: DVOR_220_SOFTWARE_MODULE,
      name: "DVOR 220",
      applicationLabel: "MOPIENS 220 DVOR PMDT",
    },
    {
      module: DME_320_SOFTWARE_MODULE,
      name: "DME 320",
      applicationLabel: "MOPIENS 320 DME PMDT",
    },
  ])("renders the real $name simulator", ({ module, applicationLabel }) => {
    render(<OperationsSoftwareSimulator module={module} />);

    expect(screen.getByLabelText(applicationLabel)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Connection List" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ranh giới module đã sẵn sàng" })).not.toBeInTheDocument();
  });

  it.each([
    { module: VHF_SOFTWARE_MODULE, name: "VHF" },
    { module: VSAT_SOFTWARE_MODULE, name: "VSAT" },
  ])("keeps the $name module on the placeholder fallback", ({ module }) => {
    render(<OperationsSoftwareSimulator module={module} />);

    expect(screen.getByRole("heading", { level: 1, name: module.name })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ranh giới module đã sẵn sàng" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quay về Simulator" })).toHaveAttribute("href", "/simulator");
    expect(screen.getByText(module.id)).toBeInTheDocument();
    expect(screen.queryByLabelText(/MOPIENS (220 DVOR|320 DME) PMDT/)).not.toBeInTheDocument();
  });
});
