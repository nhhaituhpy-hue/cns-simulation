import { describe, expect, it } from "vitest";
import { trainingLoginFor, SELEX_DVOR_TRAINING_ACCOUNTS } from "@/lib/simulator-training-accounts";
import { useVorPmdtStore } from "@/stores/vor-pmdt-store";
import { useDvor1150PmdtStore } from "@/stores/dvor1150-pmdt-store";

describe("native training login facts, never application credentials",()=>{
 it("uses the same source of truth as both native DVOR login handlers",()=>{
  const account=trainingLoginFor("dvor-1150a","Tài khoản login PMDT là gì?");
  expect(account).toMatchObject({kind:"fixed-default",userId:"SEC3",securityLevel:3,mutable:false});
  if(account.kind!=="fixed-default")throw Error("Missing simulation account");
  expect(useVorPmdtStore.getState().login(account.userId,account.password)).toBe(true);
  expect(useDvor1150PmdtStore.getState().login(account.userId,account.password)).toBe(true);
  expect(SELEX_DVOR_TRAINING_ACCOUNTS.find(x=>x.userId===account.userId)?.password===account.password).toBe(true);
 });
 it("does not apply a SELEX login to MOPIENS or invent an ADS-B password",()=>{
  expect(trainingLoginFor("dvor-220","")).toMatchObject({kind:"fixed-default",userId:"Administrator",mutable:true});
  expect(trainingLoginFor("dme-320","")).toMatchObject({kind:"fixed-default",userId:"Administrator",mutable:true});
  expect(trainingLoginFor("ads-b","")).toEqual({kind:"no-fixed-password"});
 });
 it.each([
  ["dme-320","DVOR-1150"], ["dvor-1150a","model1150"],
  ["dvor-1150","DVOR1150A"], ["dme-1119a","DME320"],
  ["dvor-220","ADS-B"], ["ads-b","DME320"], ["dme-320","DME320 và model1150"],
 ] as const)("rejects wrong or ambiguous device scope for %s",(moduleId,device)=>{
  expect(trainingLoginFor(moduleId,`Mật khẩu ${device} là gì?`).kind).toBe("wrong-device");
 });
 it.each([
  ["dvor-1150a","sysadmin"], ["dme-1119a","maintenance"],
  ["dme-320","SA"], ["dvor-220","MA"],
  ["ads-b","SEC3"], ["ads-b","Administrator"], ["ads-b","SA"], ["ads-b","MA"],
  ["dvor-1150a","SEC3 và SEC4"], ["dme-320","operator và observer"],
  ["ads-b","sysadmin và maintenance"],
 ] as const)("fails closed on unsupported or conflicting roles for %s: %s",(moduleId,role)=>{
  expect(trainingLoginFor(moduleId,`Tài khoản ${role} simulator là gì?`).kind).toBe("unsupported-account");
 });
 it("does not silently substitute a requested unsupported account",()=>{
  expect(trainingLoginFor("dvor-1150a","Tài khoản SEC2 PMDT là gì?")).toEqual({kind:"unsupported-account"});
  expect(trainingLoginFor("dme-1119a","Tài khoản SEC2 PMDT là gì?")).toMatchObject({kind:"fixed-default",userId:"SEC2",mutable:true});
 });
});
