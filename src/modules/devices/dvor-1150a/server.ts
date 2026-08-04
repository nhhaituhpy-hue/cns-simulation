/** Server-safe persistence boundary for the DVOR 1150A module. */
export {
  isVorScenario,
  mapRowToVorScenario,
  vorScenarioToRow,
} from "@/lib/vor-scenario-storage";
export {
  isVorSubmission,
  mapRowToVorSubmission,
  vorSubmissionToRow,
} from "@/lib/vor-submission-storage";
export type { VorSubmissionStatus } from "@/lib/vor-types";
