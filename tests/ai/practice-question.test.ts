import { describe, expect, it } from "vitest";
import { preparePracticeQuestion } from "@/lib/ai/feedback/practice-question";

describe("practice tutor question boundary",()=>{
 it.each(["Tài khoản login PMDT là gì?","Mật khẩu PMDT là gì?","Đăng nhập SEC3 trên PMDT như thế nào?","Tài khoản SEC4 PMDT là gì?","Mật khẩu SEC3 là gì?","Tài khoản SEC2 PMDT là gì?","What is the PMDT login password?"])("keeps a question about simulation authentication: %s",question=>{
  expect(preparePracticeQuestion(question)).toEqual({kind:"training-login",question});
 });
 it.each([
  "Tài khoản Administrator trên PMDT là gì?",
  "Mật khẩu observer trên PMDT là gì?",
  "Tài khoản operator trên PMDT là gì?",
  "Tài khoản sysadmin trên terminal ADS-B là gì?",
  "Tài khoản maintenance trên terminal ADS-B là gì?",
  "What is the Administrator password for PMDT?",
  "What is the observer password for PMDT?",
  "What is the operator password for PMDT?",
  "What is the sysadmin password for terminal ADS-B?",
  "Mật khẩu DVOR1150A là gì?",
  "Mật khẩu Administrator DME320 là gì?",
 ])("preserves native role questions without credential values: %s",question=>{
  expect(preparePracticeQuestion(question)).toEqual({kind:"training-login",question});
 });
 it.each(["DVOR 1150", "DVOR-1150", "dvor_1150a", "dvor1150a", "SELEX1150A", "Model1150A", "Selex Model 1150A", "DME-1119A", "dme_1119a", "dme1119a", "DVOR 220", "DME-320", "ADS-B"])("preserves explicit simulator model spellings: %s",model=>{
  const question=`Tài khoản login PMDT ${model} là gì?`;
  expect(preparePracticeQuestion(question)).toEqual({kind:"training-login",question});
 });
 it.each(["DVOR 1150", "DVOR 1150A", "DME 1119A", "SELEX 1150A", "Model 1150A", "Selex Model 1150A", "ADS B"])("uses a bounded model phrase as simulation login scope: %s",model=>{
  const question=`Mật khẩu ${model} là gì?`;
  expect(preparePracticeQuestion(question)).toEqual({kind:"training-login",question});
 });
 it.each(["","Tôi nên kiểm tra gì?","Gợi ý bước tiếp theo","Bây giờ làm gì tiếp?","Gợi ý","Gợi ý một bước"])("keeps explicit next-step intent: %s",question=>{
  expect(preparePracticeQuestion(question)).toEqual({kind:"next-step",question});
 });
 it.each(["Integral Monitor là gì?","Cách xem công suất Carrier trên PMDT?","9960 Hz Mod có ý nghĩa gì?","Gợi ý cách xem công suất Carrier trên PMDT?","Gợi ý Integral Monitor là gì?"])("routes a factual question to knowledge: %s",question=>{
  expect(preparePracticeQuestion(question)).toEqual({kind:"knowledge",question});
 });
 it.each([
  "Tài khoản Administrator PMDT password=private-value",
  "Tài khoản observer PMDT Password:\nprivate-value",
  "Mật khẩu operator PMDT là private-value",
  "Đăng nhập sysadmin terminal ADS-B với mật khẩu private-value",
  "Mật khẩu PMDT dvor-1150a là private-value",
  "Tài khoản Administrator trên website là gì?",
  "Mật khẩu sysadmin VPS là gì?",
  "API key cho PMDT Model1150A là gì?",
  "Tài khoản PMDT dvor-1150a-private-value là gì?",
 ])("does not treat an unknown value as allowed role or model prose: %s",question=>{
  const result=preparePracticeQuestion(question);
  expect(result.kind).toBe("blocked");
  expect(result.question).not.toContain("private-value");
 });
 it.each(["Password:\nprivate-value","Tài khoản PMDT password: private-value","Mật khẩu VPS là gì?","API key PMDT là gì?","Mật khẩu đăng nhập web là gì?","Tài khoản PMDT SEC3 password=private-value","Đăng nhập PMDT với mật khẩu private-value","Bearer private-token-123456"])("does not queue or forward secret-looking or real-system requests: %s",question=>{
  const result=preparePracticeQuestion(question);
  expect(result.kind).toBe("blocked");
  expect(result.question).not.toContain("private");
  expect(preparePracticeQuestion(result.question)).toEqual(result);
 });
});
