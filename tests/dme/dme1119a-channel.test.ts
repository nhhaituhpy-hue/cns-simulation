import { describe, expect, it } from "vitest";
import { cloneDefaultDmePmdtData } from "@/lib/dme-pmdt-defaults";
import {
  formatDmeFrequency,
  getDmeChannelAllocation,
  setDmeParameterValue,
  withAssignedDmeMeasurements,
} from "@/lib/dme1119a";

describe("DME 1119A channel allocation", () => {
  it.each([
    [1, "X", 1025, 962, 900, 12, 12, 50],
    [1, "Y", 1025, 1088, 900, 36, 30, 56],
    [63, "X", 1087, 1024, 962, 12, 12, 50],
    [64, "X", 1088, 1151, 963, 12, 12, 50],
    [64, "Y", 1088, 1025, 963, 36, 30, 56],
    [117, "X", 1141, 1204, 1016, 12, 12, 50],
  ] as const)(
    "resolves %s%s using Table 9-5 values",
    (channelNumber, channelType, rx, tx, rxLo, interrogationSpacing, replySpacing, delay) => {
      const allocation = getDmeChannelAllocation(channelNumber, channelType);

      expect(allocation).toMatchObject({
        channelNumber,
        channelType,
        monitorInterrogatorFrequencyMHz: rx,
        receiverFrequencyMHz: rx,
        transmitterReplyFrequencyMHz: tx,
        receiverLoFrequencyMHz: rxLo,
        interrogatorPulseSpacingUs: interrogationSpacing,
        transmitterReplyPulseSpacingUs: replySpacing,
        nominalReplyDelayUs: delay,
      });
    },
  );

  it("rejects invalid channel numbers and keeps frequency formatting stable", () => {
    expect(getDmeChannelAllocation(0, "X")).toBeNull();
    expect(getDmeChannelAllocation(127, "Y")).toBeNull();
    expect(getDmeChannelAllocation(1.5, "X")).toBeNull();
    expect(formatDmeFrequency(1141)).toBe("1141.000");
  });

  it("moves channel-derived monitor readings when switching from 117X to 1Y", () => {
    const rows = withAssignedDmeMeasurements([
      { label: "Delay", mon1Value: "49.99", mon1Status: "normal", mon2Value: "50.00", mon2Status: "normal", unit: "us" },
      { label: "Spacing", mon1Value: "11.97", mon1Status: "normal", mon2Value: "11.97", mon2Status: "normal", unit: "us" },
      { label: "Tx Frequency", mon1Value: "1203.996", mon1Status: "gray", mon2Value: "1203.996", mon2Status: "gray", unit: "MHz" },
      { label: "Rx LO Frequency", mon1Value: "1015.988", mon1Status: "gray", mon2Value: "1015.991", mon2Status: "gray", unit: "MHz" },
      { label: "Rx Frequency", mon1Value: "1140.988", mon1Status: "gray", mon2Value: "1140.991", mon2Status: "gray", unit: "MHz" },
    ], { channelNumber: 1, channelType: "Y" });

    expect(rows.map((row) => row.mon1Value)).toEqual(["55.99", "29.97", "1087.996", "899.988", "1024.988"]);
  });

  it("updates decoder spacing labels when the interrogation pulse code changes", () => {
    const data = setDmeParameterValue(
      cloneDefaultDmePmdtData(),
      "rmsConfigStation.channelType",
      "Y",
    );

    expect(data.decoderResults.monitor1[0].parameter).toContain("Receiver Sensitivity @ 36.0 us");
    expect(data.decoderResults.monitor1[1].parameter).toContain("Spacing 37.0 us");
    expect(data.decoderResults.monitor1[2].parameter).toContain("Spacing 36.5 us");
  });
});
