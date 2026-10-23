import type { ScenarioParametersModuleId } from "@/lib/scenario-parameters";
import { trainingLoginFor } from "@/lib/simulator-training-accounts";
import { retrieveTrainingLoginCitation } from "../knowledge/retrieve";
import type { PracticeHintResult } from "./practice-hints-worker";

/** Resolve locally: no training or live credentials ever reach a provider. */
export async function answerTrainingLogin(moduleId: ScenarioParametersModuleId, question: string): Promise<PracticeHintResult> {
  const base: PracticeHintResult = { kind: "answer", sourceMode: "knowledge-only", summary: "Đăng nhập huấn luyện", nextSteps: [], references: [], notice: "Chỉ dùng trong simulator, không phải tài khoản ứng dụng hoặc thiết bị thật." };
  const account = trainingLoginFor(moduleId, question);
  if (account.kind === "wrong-device") return { ...base, answer: "Thiết bị trong câu hỏi không khớp hoặc có nhiều model khác nhau. Hãy chọn đúng thiết bị và hỏi lại cho một model." };
  if (account.kind === "no-fixed-password") return { ...base, answer: "Terminal ADS-B mô phỏng không có mật khẩu cố định: chọn đúng vai trò sysadmin hoặc maintenance và nhập mật khẩu không rỗng. Đây là hành vi mô phỏng, không phải thông tin đăng nhập thiết bị thật." };
  if (account.kind === "unsupported-account") return { ...base, answer: "Tài khoản được hỏi không thuộc danh sách đăng nhập huấn luyện của simulator này. Hãy kiểm tra đúng thiết bị hoặc hỏi giám khảo." };
  let citation = null;
  try { citation = await retrieveTrainingLoginCitation(moduleId, question); } catch { /* Native default remains labelled as simulator-only, never invent a manual source. */ }
  const qualifier = account.mutable ? " Đây là mặc định; nếu đã đổi tài khoản trong phiên mô phỏng, hãy dùng giá trị đã đổi." : " Phân biệt chữ hoa/thường.";
  return { ...base,
    answer: `Mặc định PMDT mô phỏng: User ID ${account.userId}, Password ${account.password || "(để trống)"} (Security Level ${account.securityLevel}).${qualifier}${citation ? "" : " Nguồn: cấu hình native; chưa có trích dẫn manual phù hợp."}`,
    references: citation ? [citation] : [],
    notice: citation ? base.notice : `${base.notice} Nguồn: cấu hình mặc định native; chưa có trích dẫn manual phù hợp.`,
  };
}
