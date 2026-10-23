import { sensitiveText } from "../scenario-blueprint/validation";

export type PracticeQuestionKind = "next-step" | "knowledge" | "training-login" | "blocked";
const BLOCKED = "[Câu hỏi về thông tin nhạy cảm không được hỗ trợ]";
const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "d").toLowerCase();
/** Question prose and documentary credentials have different boundaries.
 * Only a bounded vocabulary may ask about simulation login; never preserve values.
 */
export function preparePracticeQuestion(value: string): { kind: PracticeQuestionKind; question: string } {
  const question = value.trim().slice(0, 1000);
  const blocked = () => ({ kind: "blocked" as const, question: BLOCKED });
  if (question === BLOCKED) return blocked();
  const q = normalize(question);
  if (/\b(?:vps|ssh|api|token|bearer|web|website|database|postgres|key|secret|server|http|https)\b/.test(q)
    || /[\r\n:=`"{}<>]|-----/.test(q)) return blocked();
  if (sensitiveText(question)) {
    const words = new Set("tai khoan ten dang nhap login logon log on sign in user username userid id account accounts password credentials mat khau cua cho pmdt terminal simulator mo phong la gi nao nhu the tren toi can biet dung de cach va voi maintenance security level sec3 sec4 guest sa ma 3 4 what is the for how to do i use can please tell me sec2 2 administrator observer operator sysadmin dvor dme selex model 1150 1150a 1119a 220 320 ads b".split(" "));
    // Finite device spellings, checked as whole tokens: never strip an unknown
    // suffix/value to make credential-bearing prose fit the training vocabulary.
    const deviceWords = new Set<string>();
    for (const [families, models] of [
      [["dvor", "selex", "model"], ["1150", "1150a", "220"]],
      [["dme", "selex", "model"], ["1119a", "320"]],
    ]) for (const family of families) for (const model of models) for (const separator of ["", "-", "_", " "]) {
      deviceWords.add(`${family}${separator}${model}`);
      deviceWords.add(`${family}${separator}model${separator}${model}`);
    }
    for (const name of ["ads-b", "ads_b", "adsb", "ads b"]) deviceWords.add(name);
    const questionWords = q.replace(/[?.,!]/g, " ").split(/\s+/).filter(Boolean);
    const wordSequence = ` ${questionWords.join(" ")} `;
    if (!(/\b(?:pmdt|terminal|simulator|mo phong|sec[234])\b/.test(q) || [...deviceWords].some(name => wordSequence.includes(` ${name} `)))
      || !questionWords.every(word => words.has(word) || deviceWords.has(word))) return blocked();
    return { kind: "training-login", question };
  }
  if (!question || /\b(?:buoc (?:tiep|ke)|kiem tra gi|lam gi tiep|next step|what (?:should|do) i do next)\b/.test(q)
    || /^goi y(?: (?:mot )?buoc)?[?.,!]*$/.test(q)) return { kind: "next-step", question };
  return { kind: "knowledge", question };
}
