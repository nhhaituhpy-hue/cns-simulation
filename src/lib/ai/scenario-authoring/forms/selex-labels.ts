import type { ValueSchema } from "../types";
const startup: Record<string, [string, string]> = {
 mainTransmitterId: ["Máy phát chính khi bắt đầu", "Chọn TX1 hoặc TX2 nối đường phát chính lúc mở bài; không phải đáp án khôi phục."],
 startLocal: ["Bắt đầu ở chế độ tại chỗ (Local)", "Bật để bắt đầu điều khiển tại chỗ; tắt để dùng trạng thái không Local của engine. Giữ mặc định nếu bài không yêu cầu."],
 startMonitorBypassed: ["Bỏ qua giám sát khi bắt đầu (Monitor Bypass)", "Bật để bắt đầu với giám sát bị bypass. Đây là trạng thái đầu bài, không phải quyền sửa hoặc điều kiện đạt."],
 integralMonitorBypassed: ["Bypass giám sát chính khi bắt đầu", "Bật để bỏ qua Integral Monitor lúc bắt đầu; yêu cầu bỏ bypass khi kết thúc được đặt riêng ở Điều kiện đạt."],
 standbyMonitorBypassed: ["Bypass giám sát dự phòng khi bắt đầu", "Bật để bỏ qua Standby Monitor lúc bắt đầu. Giữ tắt nếu không cần tình huống này."],
 identMode: ["Chế độ tín hiệu nhận dạng (IDENT)", "Chọn phát nhận dạng bình thường, tắt hoặc liên tục khi bắt đầu bài."],
};
export function selexStartupSchema(key: string): ValueSchema {
 const [label, help] = startup[key];
 const values = key === "mainTransmitterId" ? [["tx1", "Máy phát 1 (TX1)"], ["tx2", "Máy phát 2 (TX2)"]] : key === "identMode" ? [["normal", "Bình thường"], ["off", "Tắt"], ["continuous", "Liên tục"]] : null;
 return {type: values ? "select" : "boolean", label, help, required:true, ...(values ? {options:values.map(([value,label]) => ({value,label}))} : {})};
}
const criteria: Record<string, string> = {
 requireIntegralMonitorNormal:"Giám sát chính (Integral Monitor) trở về bình thường",
 requireActiveTransmitter:"Có máy phát hoạt động trên anten",
 requireNoVswrExecutiveAlarm:"Không còn báo động VSWR điều hành",
 requireNoSidebandVswrAlarm:"Không còn báo động VSWR anten biên tần",
 requireMonitorBypassCleared:"Đã bỏ chế độ Monitor Bypass",
};
export function selexCriterionSchema(key: string): ValueSchema {
 const label = criteria[key];
 return {type:"boolean",label,help:`${label}: bật nếu đây là kết quả học viên phải đạt. Engine chỉ kiểm tra điều kiện đã chọn; không tự cấp quyền sửa hoặc xác nhận đã khôi phục.`,required:true};
}
