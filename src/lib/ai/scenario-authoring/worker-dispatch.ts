import type { GenerationWorkerOutcome } from "../scenario-generation/worker";
/** Visit each durable queue once per cycle; busy new work must not starve old jobs. */
export async function runAiWorkerCycle(...queues: Array<() => Promise<GenerationWorkerOutcome>>): Promise<GenerationWorkerOutcome> {
  let outcome: GenerationWorkerOutcome = "idle";
  for (const queue of queues) {
    const next = await queue();
    if (next === "stopped") return next;
    if (outcome === "idle") outcome = next;
  }
  return outcome;
}
