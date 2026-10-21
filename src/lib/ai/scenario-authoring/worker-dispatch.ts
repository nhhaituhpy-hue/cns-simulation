import type { GenerationWorkerOutcome } from "../scenario-generation/worker";
/** Visit each durable queue once per cycle; busy new work must not starve old jobs. */
export async function runAiWorkerCycle(guided:()=>Promise<GenerationWorkerOutcome>,legacy:()=>Promise<GenerationWorkerOutcome>):Promise<GenerationWorkerOutcome>{
 const first=await guided();if(first==="stopped")return first;
 const second=await legacy();return second==="stopped"?second:first!=="idle"?first:second;
}
