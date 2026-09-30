import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const PAGE_MARGIN = 32;
const FOOTER_HEIGHT = 24;
const FONT_REGULAR = readFileSync(resolve(process.cwd(), "public", "fonts", "Geist-Regular.ttf"));
const FONT_BOLD = readFileSync(resolve(process.cwd(), "public", "fonts", "Geist-Bold.ttf"));
const FONT_SIZE = 8.5;
const CELL_PADDING_X = 5;
const CELL_PADDING_Y = 5;

export interface ScenarioExamPdfInput {
  exam: {
    name: string;
    description: string;
    opensAt: string | null;
    closesAt: string | null;
    durationMinutes: number;
  };
  exportedAt: string;
  rows: ScenarioExamPdfRow[];
}

export interface ScenarioExamPdfRow {
  candidateName: string;
  candidateUnit: string;
  code: string | null;
  codeHint: string;
  moduleNames: string[];
  completedModules: number;
  status: "issued" | "redeemed" | "in_progress" | "submitted" | "timed_out" | "revoked";
}

interface PdfColumn {
  key: "index" | "candidateName" | "candidateUnit" | "code" | "subjects" | "progress" | "status";
  label: string;
  width: number;
}

const COLUMNS: PdfColumn[] = [
  { key: "index", label: "STT", width: 34 },
  { key: "candidateName", label: "HỌ VÀ TÊN", width: 118 },
  { key: "candidateUnit", label: "ĐƠN VỊ", width: 168 },
  { key: "code", label: "MÃ VÀO THI", width: 112 },
  { key: "subjects", label: "MÔN THI", width: 190 },
  { key: "progress", label: "TIẾN ĐỘ", width: 58 },
  { key: "status", label: "TRẠNG THÁI", width: 92 },
];

const STATUS_LABEL: Record<ScenarioExamPdfRow["status"], string> = {
  issued: "Chưa vào thi",
  redeemed: "Đã vào thi",
  in_progress: "Đang thi",
  submitted: "Đã nộp",
  timed_out: "Hết giờ",
  revoked: "Đã thu hồi",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatDate(value: string | null): string {
  if (!value) return "Không giới hạn";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Không hợp lệ" : dateFormatter.format(date);
}

function safeText(value: string): string {
  return value.trim() || "—";
}

function rowValue(row: ScenarioExamPdfRow, key: PdfColumn["key"], index: number): string {
  if (key === "index") return String(index + 1);
  if (key === "candidateName") return safeText(row.candidateName);
  if (key === "candidateUnit") return safeText(row.candidateUnit);
  if (key === "code") return row.code ?? `Không khôi phục được ••••${row.codeHint}`;
  if (key === "subjects") return row.moduleNames.length > 0 ? row.moduleNames.join(", ") : "—";
  if (key === "progress") return `${row.completedModules}/${row.moduleNames.length}`;
  return STATUS_LABEL[row.status];
}

function drawText(
  document: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  options: { bold?: boolean; color?: string; align?: PDFKit.Mixins.TextOptions["align"] } = {},
) {
  document
    .font(options.bold ? "Geist-Bold" : "Geist-Regular")
    .fontSize(FONT_SIZE)
    .fillColor(options.color ?? "#0f172a")
    .text(text, x + CELL_PADDING_X, y + CELL_PADDING_Y, {
      width: width - CELL_PADDING_X * 2,
      lineGap: 2,
      align: options.align,
    });
}

function rowHeight(document: PDFKit.PDFDocument, row: ScenarioExamPdfRow, index: number): number {
  const heights = COLUMNS.map((column) => {
    document.font("Geist-Regular").fontSize(FONT_SIZE);
    return document.heightOfString(rowValue(row, column.key, index), {
      width: column.width - CELL_PADDING_X * 2,
      lineGap: 2,
    });
  });
  return Math.max(30, Math.ceil(Math.max(...heights) + CELL_PADDING_Y * 2));
}

function drawFooter(document: PDFKit.PDFDocument, pageNumber: number) {
  const y = PAGE_HEIGHT - PAGE_MARGIN - FOOTER_HEIGHT;
  document
    .moveTo(PAGE_MARGIN, y)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, y)
    .strokeColor("#cbd5e1")
    .lineWidth(0.6)
    .stroke();
  document.font("Geist-Regular").fontSize(7.5).fillColor("#64748b");
  document.text("Tài liệu hạn chế - bảo quản theo quy định của hội đồng thi", PAGE_MARGIN, y + 7, { width: 500 });
  document.text(`Trang ${pageNumber}`, PAGE_WIDTH - PAGE_MARGIN - 70, y + 7, { width: 70, align: "right" });
}

function drawTableHeader(document: PDFKit.PDFDocument, y: number): number {
  const height = 26;
  let x = PAGE_MARGIN;
  for (const column of COLUMNS) {
    document.rect(x, y, column.width, height).fillAndStroke("#0f4c6d", "#0f4c6d");
    drawText(document, column.label, x, y + 1, column.width, { bold: true, color: "#ffffff", align: column.key === "index" || column.key === "progress" ? "center" : "left" });
    x += column.width;
  }
  return y + height;
}

function drawTableRow(document: PDFKit.PDFDocument, row: ScenarioExamPdfRow, index: number, y: number, height: number) {
  const background = index % 2 === 0 ? "#ffffff" : "#f8fafc";
  let x = PAGE_MARGIN;
  for (const column of COLUMNS) {
    document.rect(x, y, column.width, height).fillAndStroke(background, "#cbd5e1");
    const isCode = column.key === "code";
    drawText(document, rowValue(row, column.key, index), x, y, column.width, {
      bold: isCode && row.code !== null,
      color: isCode && row.code === null ? "#9a3412" : "#0f172a",
      align: column.key === "index" || column.key === "progress" ? "center" : "left",
    });
    x += column.width;
  }
}

function drawFirstPageHeader(document: PDFKit.PDFDocument, input: ScenarioExamPdfInput): number {
  let y = PAGE_MARGIN;
  document.font("Geist-Bold").fontSize(8.5).fillColor("#0f4c6d").text("CNS SIMULATION LAB · HỘI ĐỒNG THI", PAGE_MARGIN, y);
  y += 17;
  document.font("Geist-Bold").fontSize(17).fillColor("#0f172a").text("DANH SÁCH MÃ VÀO THI", PAGE_MARGIN, y, { width: PAGE_WIDTH - PAGE_MARGIN * 2 });
  y += 25;
  document.font("Geist-Bold").fontSize(11.5).fillColor("#0f172a").text(safeText(input.exam.name), PAGE_MARGIN, y, { width: PAGE_WIDTH - PAGE_MARGIN * 2 });
  y += Math.max(18, document.heightOfString(safeText(input.exam.name), { width: PAGE_WIDTH - PAGE_MARGIN * 2 }));
  if (input.exam.description.trim()) {
    document.font("Geist-Regular").fontSize(8.5).fillColor("#475569").text(input.exam.description.trim(), PAGE_MARGIN, y, { width: PAGE_WIDTH - PAGE_MARGIN * 2, lineGap: 2 });
    y += document.heightOfString(input.exam.description.trim(), { width: PAGE_WIDTH - PAGE_MARGIN * 2, lineGap: 2 }) + 3;
  }
  const metadata = `Lịch thi: ${formatDate(input.exam.opensAt)} - ${formatDate(input.exam.closesAt)}   |   Thời lượng: ${input.exam.durationMinutes} phút   |   Số mã: ${input.rows.length}`;
  document.font("Geist-Regular").fontSize(8.5).fillColor("#334155").text(metadata, PAGE_MARGIN, y, { width: PAGE_WIDTH - PAGE_MARGIN * 2 });
  y += 17;
  document.text(`Xuất lúc: ${formatDate(input.exportedAt)} (UTC+7)`, PAGE_MARGIN, y, { width: PAGE_WIDTH - PAGE_MARGIN * 2 });
  y += 18;
  document.roundedRect(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN * 2, 28, 4).fillAndStroke("#fff7ed", "#fed7aa");
  document.font("Geist-Bold").fontSize(8).fillColor("#9a3412").text("Lưu ý bảo mật: mã đầy đủ chỉ dùng cho việc phát cho đúng thí sinh. Các mã phát hành trước khi bật lưu mã mã hóa được đánh dấu không khôi phục được.", PAGE_MARGIN + 9, y + 8, { width: PAGE_WIDTH - PAGE_MARGIN * 2 - 18 });
  return y + 39;
}

export function buildScenarioExamCodesPdf(input: ScenarioExamPdfInput): Promise<Buffer> {
  return new Promise((resolvePdf, reject) => {
    const document = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, autoFirstPage: false });
    const chunks: Buffer[] = [];
    document.registerFont("Geist-Regular", FONT_REGULAR);
    document.registerFont("Geist-Bold", FONT_BOLD);
    document.info.Title = `Danh sách mã vào thi - ${safeText(input.exam.name)}`;
    document.info.Author = "CNS Simulation Lab";
    document.info.Subject = "Danh sách mã vào thi Scenario";
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolvePdf(Buffer.concat(chunks)));

    let pageNumber = 1;
    document.addPage({ size: "A4", layout: "landscape", margin: 0 });
    let cursorY = drawFirstPageHeader(document, input);
    cursorY = drawTableHeader(document, cursorY);
    const bottom = PAGE_HEIGHT - PAGE_MARGIN - FOOTER_HEIGHT - 4;

    input.rows.forEach((row, index) => {
      const height = rowHeight(document, row, index);
      if (cursorY + height > bottom && index > 0) {
        drawFooter(document, pageNumber);
        document.addPage({ size: "A4", layout: "landscape", margin: 0 });
        pageNumber += 1;
        cursorY = drawTableHeader(document, PAGE_MARGIN);
      }
      drawTableRow(document, row, index, cursorY, height);
      cursorY += height;
    });
    drawFooter(document, pageNumber);
    document.end();
  });
}
