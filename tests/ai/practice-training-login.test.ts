// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { generatePracticeHint } from "@/lib/ai/feedback/practice-hints-worker";
import { trainingLoginFor, SELEX_DVOR_TRAINING_ACCOUNTS, SELEX_DME_TRAINING_ACCOUNTS, MOPIENS_DME_TRAINING_ACCOUNTS } from "@/lib/simulator-training-accounts";
import { preparePracticeQuestion } from "@/lib/ai/feedback/practice-question";
const nativePasswords = [...SELEX_DVOR_TRAINING_ACCOUNTS, ...SELEX_DME_TRAINING_ACCOUNTS, ...MOPIENS_DME_TRAINING_ACCOUNTS].map(account => account.password).filter(Boolean);
import { createDefaultDvor1150aScenarioDefinition } from "@/lib/dvor1150a/scenario";
const input={moduleId:"dvor-1150a" as const,definition:createDefaultDvor1150aScenarioDefinition(),rubric:null,payload:{},question:"Tài khoản login PMDT là gì?"};
describe("practice simulation-login answer",()=>{
 it("answers from native training defaults without sending a credential to a provider",async()=>{
  const provider=vi.fn();const result=await generatePracticeHint(input,{provider});
  const account=trainingLoginFor(input.moduleId,input.question);if(account.kind!=="fixed-default")throw Error();
  expect(result.kind).toBe("answer");expect(result.sourceMode).toBe("knowledge-only");
  expect(result.answer?.includes(account.userId)&&result.answer.includes(account.password)).toBe(true);
  expect(result.answer).toMatch(/mô phỏng|huấn luyện/i);
  expect(result.nextSteps).toEqual([]);expect(provider).not.toHaveBeenCalled();
 });
 it.each([
  ["dvor-220","Tài khoản Administrator PMDT là gì?","Administrator"],
  ["dme-320","Mật khẩu operator trên simulator là gì?","operator"],
  ["dme-320","Tài khoản observer PMDT là gì?","observer"],
 ] as const)("answers a native %s training identity without a provider",async(moduleId,question,userId)=>{
  const provider=vi.fn();const result=await generatePracticeHint({...input,moduleId,question},{provider});
  const account=trainingLoginFor(moduleId,question);if(account.kind!=="fixed-default")throw Error();
  expect(result.answer?.includes(userId)&&result.answer.includes(account.password)).toBe(true);
  expect(result.answer).toMatch(/mặc định|đã đổi/);expect(provider).not.toHaveBeenCalled();
 });
 it.each([
  "DVOR-1150", "DVOR 1150", "DVOR_1150", "DVOR1150", "DVOR model 1150",
  "selex1150", "selex-model-1150", "Model1150", "model_1150",
  "DVOR-1150A", "DME1119A", "DVOR220", "ADS-B", "ADS_B", "ADSB", "ADS B",
  "DME320 và DVOR1150", "DME320 và ADS-B",
 ])("fails closed for wrong or conflicting explicit device %s",async device=>{
  const question=`Mật khẩu ${device} là gì?`;
  expect(preparePracticeQuestion(question).kind).toBe("training-login");
  const provider=vi.fn();
  const result=await generatePracticeHint({...input,moduleId:"dme-320",question},{provider});
  expect(nativePasswords.some(password=>result.answer?.includes(password))).toBe(false);
  expect(result.answer).toMatch(/đúng thiết bị/i);
  expect(result).toMatchObject({kind:"answer",sourceMode:"knowledge-only",references:[],nextSteps:[]});
  expect(provider).not.toHaveBeenCalled();
 });
 it.each([
  ["dvor-1150","DVOR-1150"], ["dvor-1150a","selexmodel1150a"],
  ["dme-1119a","DME_1119A"], ["dvor-220","Model220"], ["dme-320","DME 320"],
 ] as const)("retains correct explicit device %s",async(moduleId,device)=>{
  const question=`Mật khẩu ${device} là gì?`, provider=vi.fn();
  expect(preparePracticeQuestion(question).kind).toBe("training-login");
  const result=await generatePracticeHint({...input,moduleId,question},{provider});
  const account=trainingLoginFor(moduleId,question);
  expect(account.kind).toBe("fixed-default");
  if(account.kind!=="fixed-default")throw Error("Missing native default");
  expect(result.answer?.includes(account.password)).toBe(true);
  expect(provider).not.toHaveBeenCalled();
 });
 it.each([
  ["dvor-1150a","sysadmin"], ["dvor-1150a","maintenance"],
  ["dme-1119a","SA"], ["dvor-1150","MA"],
  ["dvor-220","sysadmin"], ["dme-320","maintenance"],
  ["dme-320","SA"], ["dvor-220","MA"],
  ["ads-b","SEC3"], ["ads-b","Administrator"], ["ads-b","observer"],
  ["ads-b","SA"], ["ads-b","MA"],
  ["dvor-1150a","SEC3 và SEC4"], ["dme-320","operator và Administrator"],
  ["ads-b","sysadmin và maintenance"], ["ads-b","SEC3 và sysadmin"],
 ] as const)("rejects unsupported or conflicting explicit roles for %s: %s",async(moduleId,role)=>{
  const question=`Tài khoản ${role} trên simulator là gì?`, provider=vi.fn();
  expect(preparePracticeQuestion(question).kind).toBe("training-login");
  const result=await generatePracticeHint({...input,moduleId,question},{provider});
  expect(nativePasswords.some(password=>result.answer?.includes(password))).toBe(false);
  expect(result.answer).toMatch(/không thuộc danh sách/i);
  expect(result).toMatchObject({kind:"answer",sourceMode:"knowledge-only",references:[],nextSteps:[]});
  expect(provider).not.toHaveBeenCalled();
 });
 it.each(["sysadmin","maintenance"])("retains supported ADS-B role %s",async role=>{
  const question=`Tài khoản ${role} terminal ADS-B là gì?`,provider=vi.fn();
  expect(preparePracticeQuestion(question).kind).toBe("training-login");
  const result=await generatePracticeHint({...input,moduleId:"ads-b",question},{provider});
  expect(result.answer).toMatch(/không.*mật khẩu.*cố định/i);
  expect(provider).not.toHaveBeenCalled();
 });
 it("does not invent a fixed password for ADS-B",async()=>{
  const provider=vi.fn();const result=await generatePracticeHint({...input,moduleId:"ads-b",question:"Tài khoản login terminal là gì?"},{provider});
  expect(result.answer).toMatch(/không.*mật khẩu.*cố định/i);expect(provider).not.toHaveBeenCalled();
 });
});
