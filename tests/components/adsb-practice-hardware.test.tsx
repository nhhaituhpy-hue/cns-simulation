import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { HardwareDiagnosisWorkspace } from "@/components/hardware/hardware-diagnosis-workspace";
import { CON_SON_HARDWARE, CON_SON_SIGNAL_PATHS } from "@/lib/hardware-model";
afterEach(cleanup);
it("allows practice to save stage-2 evidence without a second submission control", () => {
  render(<HardwareDiagnosisWorkspace hardwareFault={{ faultyComponentIds: [], faultType: "open", faultDescription: "Training", hardwareLayout: CON_SON_HARDWARE, signalPaths: CON_SON_SIGNAL_PATHS, expectedSensorStatus: "red", terminalSymptoms: [], qcmsSymptoms: [], diagnosticSteps: [] }} onClose={() => {}} onSubmit={() => {}} submitLabel="Lưu lựa chọn phần cứng" />);
  expect(screen.getByRole("button", { name: "Lưu lựa chọn phần cứng" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "NỘP BÀI" })).not.toBeInTheDocument();
});
it("keeps the official and existing default stage-2 label unchanged", () => {
  render(<HardwareDiagnosisWorkspace hardwareFault={{ faultyComponentIds: [], faultType: "open", faultDescription: "Training", hardwareLayout: CON_SON_HARDWARE, signalPaths: CON_SON_SIGNAL_PATHS, expectedSensorStatus: "red", terminalSymptoms: [], qcmsSymptoms: [], diagnosticSteps: [] }} onClose={() => {}} onSubmit={() => {}} />);
  expect(screen.getByRole("button", { name: "NỘP BÀI" })).toBeInTheDocument();
});
