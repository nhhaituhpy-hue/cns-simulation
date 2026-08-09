import { describe, expect, it } from "vitest";
import {
  formatDme320Channel,
  getDme320ChannelAllocation,
  listDme320ChannelAllocations,
  parseDme320Channel,
} from "@/modules/operations/dme-320/domain/channel-allocation";

describe("MOPIENS DME 320 channel allocation", () => {
  it.each([
    [1, "X", 1025, 962, 12, 12, 50],
    [63, "X", 1087, 1024, 12, 12, 50],
    [64, "X", 1088, 1151, 12, 12, 50],
    [126, "X", 1150, 1213, 12, 12, 50],
    [1, "Y", 1025, 1088, 36, 30, 56],
    [63, "Y", 1087, 1150, 36, 30, 56],
    [64, "Y", 1088, 1025, 36, 30, 56],
    [126, "Y", 1150, 1087, 36, 30, 56],
  ] as const)(
    "allocates %s%s",
    (number, suffix, interrogation, reply, interrogationSpacing, replySpacing, delay) => {
      expect(getDme320ChannelAllocation({ number, suffix })).toMatchObject({
        interrogationFrequencyMhz: interrogation,
        replyFrequencyMhz: reply,
        interrogationSpacingUs: interrogationSpacing,
        replySpacingUs: replySpacing,
        nominalDelayUs: delay,
      });
    },
  );

  it("covers every X and Y allocation exactly once", () => {
    const allocations = listDme320ChannelAllocations();
    const labels = allocations.map((allocation) => formatDme320Channel(allocation.channel));

    expect(allocations).toHaveLength(252);
    expect(new Set(labels)).toHaveLength(252);
    expect(labels).toContain("1X");
    expect(labels).toContain("126Y");
  });

  it("parses case-insensitively and rejects out-of-range channels", () => {
    expect(parseDme320Channel(" 100x ")).toEqual({ number: 100, suffix: "X" });
    expect(parseDme320Channel("126Y")).toEqual({ number: 126, suffix: "Y" });
    expect(parseDme320Channel("0X")).toBeNull();
    expect(parseDme320Channel("127Y")).toBeNull();
    expect(parseDme320Channel("12Z")).toBeNull();
  });
});
