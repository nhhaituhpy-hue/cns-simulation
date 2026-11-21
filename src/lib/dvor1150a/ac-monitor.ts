export const AC_REFERENCE = { volts: 232.3, amps: 2.3 } as const;

export function readDvorAcMonitor() {
  return { ...AC_REFERENCE };
}
