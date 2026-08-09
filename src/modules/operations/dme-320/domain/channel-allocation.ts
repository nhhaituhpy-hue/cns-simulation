import type {
  Dme320Channel,
  Dme320ChannelAllocation,
  Dme320ChannelSuffix,
} from "./types";

const MIN_CHANNEL = 1;
const MAX_CHANNEL = 126;

export function isDme320Channel(value: unknown): value is Dme320Channel {
  if (!value || typeof value !== "object") return false;
  const channel = value as Partial<Dme320Channel>;
  return (
    Number.isInteger(channel.number) &&
    Number(channel.number) >= MIN_CHANNEL &&
    Number(channel.number) <= MAX_CHANNEL &&
    (channel.suffix === "X" || channel.suffix === "Y")
  );
}

export function assertDme320Channel(channel: Dme320Channel): void {
  if (!isDme320Channel(channel)) {
    throw new RangeError("DME 320 channel must be 1X-126X or 1Y-126Y.");
  }
}

export function formatDme320Channel(channel: Dme320Channel): string {
  assertDme320Channel(channel);
  return `${channel.number}${channel.suffix}`;
}

export function parseDme320Channel(value: string): Dme320Channel | null {
  const match = /^\s*(\d{1,3})\s*([xy])\s*$/i.exec(value);
  if (!match) return null;
  const channel = {
    number: Number(match[1]),
    suffix: match[2].toUpperCase() as Dme320ChannelSuffix,
  };
  return isDme320Channel(channel) ? channel : null;
}

/**
 * Implements the complete ICAO/MOPIENS pairing table without storing 252 rows.
 * Interrogation frequency is 1024 + channel number MHz. The reply side changes
 * at channel 64 and is mirrored between X and Y channels.
 */
export function getDme320ChannelAllocation(
  channel: Dme320Channel,
): Dme320ChannelAllocation {
  assertDme320Channel(channel);
  const interrogationFrequencyMhz = 1024 + channel.number;
  const lowerHalf = channel.number <= 63;
  const replyAbove = channel.suffix === "X" ? !lowerHalf : lowerHalf;

  return {
    channel: { ...channel },
    interrogationFrequencyMhz,
    replyFrequencyMhz: interrogationFrequencyMhz + (replyAbove ? 63 : -63),
    interrogationSpacingUs: channel.suffix === "X" ? 12 : 36,
    replySpacingUs: channel.suffix === "X" ? 12 : 30,
    nominalDelayUs: channel.suffix === "X" ? 50 : 56,
  };
}

export function listDme320ChannelAllocations(): Dme320ChannelAllocation[] {
  const allocations: Dme320ChannelAllocation[] = [];
  for (let number = MIN_CHANNEL; number <= MAX_CHANNEL; number += 1) {
    allocations.push(getDme320ChannelAllocation({ number, suffix: "X" }));
    allocations.push(getDme320ChannelAllocation({ number, suffix: "Y" }));
  }
  return allocations;
}
