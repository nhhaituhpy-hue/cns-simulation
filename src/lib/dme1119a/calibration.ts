import type {
  DmeMonitorCalibrationSettings,
  DmeMonitorSelfCalibratedParameters,
} from "../dme-types";

/**
 * Monitor self-calibration model (Stage 2 G03, HD-TTDMA §1).
 *
 * The station capture (Monitor 1 Calibration) records the self-calibrated
 * chain at Interrogator Nominal Power -13.2 dBm and Integral Tx Power
 * Offset -3.0 dB. A self-calibration run re-derives the chain from the
 * entered nominal power: a stronger nominal interrogation level needs
 * proportionally less front-end gain and raises the signal-generator
 * reference by the same delta, while the switched attenuator pads measure
 * at their nominal steps. The Integral Tx Power Scale compensates the
 * entered Tx Power Offset in the power domain. This is a deterministic
 * training model anchored on the capture, not a swept RF measurement.
 */
export const DME_SELF_CALIBRATION_DURATION_SECONDS = 6;

export const DME_SELF_CALIBRATION_BASELINE = Object.freeze({
  interrogatorNominalPowerDbm: -13.2,
  integralTxPowerOffsetDb: -3.0,
  amplifier32Db: 34.2,
  signalGeneratorReferenceDb: -28.4,
  integralTxPowerScalePercent: 114.0,
});

function round1(value: number): number {
  return Number(value.toFixed(1));
}

export function computeDmeSelfCalibratedParameters(
  settings: Pick<DmeMonitorCalibrationSettings, "interrogatorNominalPowerDbm" | "integralTxPowerOffsetDb">,
): DmeMonitorSelfCalibratedParameters {
  const deltaDb = settings.interrogatorNominalPowerDbm - DME_SELF_CALIBRATION_BASELINE.interrogatorNominalPowerDbm;
  const offsetDeltaDb = settings.integralTxPowerOffsetDb - DME_SELF_CALIBRATION_BASELINE.integralTxPowerOffsetDb;
  return {
    amplifier32Db: round1(DME_SELF_CALIBRATION_BASELINE.amplifier32Db - deltaDb),
    attenuator32Db: -32.0,
    attenuator16Db: -16.0,
    attenuator8Db: -8.0,
    attenuator4Db: -4.0,
    attenuator2Db: -2.0,
    attenuator1Db: -1.0,
    signalGeneratorReferenceDb: round1(DME_SELF_CALIBRATION_BASELINE.signalGeneratorReferenceDb + deltaDb),
    integralTxPowerScalePercent: round1(
      DME_SELF_CALIBRATION_BASELINE.integralTxPowerScalePercent * Math.pow(10, -offsetDeltaDb / 10),
    ),
  };
}
