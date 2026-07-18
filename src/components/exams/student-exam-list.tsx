import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { MapPin } from "@phosphor-icons/react/dist/ssr/MapPin";
import Link from "next/link";

export interface StudentExamListItem {
  id: string;
  name: string;
  examDate: string;
  locationLabel: string;
  decisionBasis: string;
  status: "open" | "locked" | "archived";
  candidateName?: string;
  subjectCount?: number;
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function StudentExamList({ items }: { items: StudentExamListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-[var(--border)] bg-white px-5 py-14 text-center shadow-[var(--shadow-card)]">
        <CalendarBlank aria-hidden size={36} weight="duotone" className="mx-auto text-[var(--text-muted)]" />
        <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">Chưa có kỳ thi khả dụng</h2>
        <p className="mx-auto mt-2 max-w-[56ch] text-sm leading-6 text-[var(--text-secondary)]">Kỳ thi sẽ xuất hiện khi hội đồng mở quyền vào thi hoặc khi bạn có lượt thi cần tiếp tục/xem kết quả.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <caption className="sr-only">Danh sách kỳ thi đang mở</caption>
        <thead className="bg-[var(--surface-muted)] text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
          <tr><th className="border-b border-[var(--border)] px-4 py-3">Kỳ thi</th><th className="w-40 border-b border-[var(--border)] px-4 py-3">Ngày thi</th><th className="w-40 border-b border-[var(--border)] px-4 py-3">Địa điểm</th><th className="w-52 border-b border-[var(--border)] px-4 py-3">Trạng thái cá nhân</th><th className="w-20 border-b border-[var(--border)] px-4 py-3"><span className="sr-only">Mở</span></th></tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-[var(--surface-subtle)]">
              <td className="px-4 py-4"><Link href={`/student/exams/${item.id}`} className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline">{item.name}</Link><p className="mt-1 line-clamp-1 text-xs text-[var(--text-secondary)]">{item.decisionBasis}</p></td>
              <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--text-secondary)]"><CalendarBlank aria-hidden size={16} /> {formatDate(item.examDate)}</span></td>
              <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]"><MapPin aria-hidden size={16} /> {item.locationLabel}</span></td>
              <td className="px-4 py-4">{item.status === "locked" ? <div><p className="text-sm font-semibold text-[#92400e]">Kỳ thi đã khóa</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">Tiếp tục lượt đã bắt đầu</p></div> : item.status === "archived" ? <div><p className="text-sm font-semibold text-[var(--text-secondary)]">Kỳ thi đã lưu trữ</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">Xem tiến độ và kết quả</p></div> : item.candidateName ? <div><p className="text-sm font-semibold text-[#166534]">Có tên trong danh sách</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.subjectCount ?? 0} môn được phân</p></div> : <span className="text-sm text-[var(--text-muted)]">Mở để kiểm tra danh sách</span>}</td>
              <td className="px-4 py-4 text-right"><Link href={`/student/exams/${item.id}`} title="Mở kỳ thi" className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--accent-border)] text-[var(--accent)] hover:bg-[var(--accent-muted)]" aria-label={`Mở ${item.name}`}><ArrowRight aria-hidden size={18} /></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
