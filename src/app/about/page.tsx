import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";

const learningPrinciples = [
  {
    title: "Thực hành có bối cảnh",
    description:
      "Học viên thao tác trên môi trường mô phỏng gắn với thiết bị và tình huống khai thác CNS.",
  },
  {
    title: "Đánh giá dựa trên năng lực",
    description:
      "CBTA tập trung vào bằng chứng thực hiện nhiệm vụ, thay vì chỉ ghi nhận việc hoàn thành nội dung học.",
  },
  {
    title: "Lặp lại an toàn",
    description:
      "Kịch bản có thể được thực hành nhiều lần trước khi chuyển sang thao tác tại trạm hoặc thiết bị thực.",
  },
];

export default function AboutCnsSimulationLabPage() {
  return (
    <div className="min-h-[calc(100dvh-4.5rem)] bg-[#061b25] px-5 py-12 text-white sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-100/80">
          CNS Simulation Lab
        </p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-6xl">
          Huấn luyện từ thao tác, đánh giá từ năng lực.
        </h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-200">
          CNS Simulation Lab là môi trường huấn luyện thực hành trên CNS Simulator theo phương pháp CBTA, nghĩa là đánh giá năng lực dựa trên thực tế.
        </p>

        <section className="mt-14 grid gap-px overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 md:grid-cols-3">
          {learningPrinciples.map((principle, index) => (
            <article key={principle.title} className="bg-[#082630] p-7 sm:p-8">
              <span className="text-sm font-semibold text-cyan-200">
                0{index + 1}
              </span>
              <h2 className="mt-8 text-2xl font-semibold tracking-[-0.04em]">
                {principle.title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                {principle.description}
              </p>
            </article>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-cyan-200 px-5 text-sm font-bold text-slate-950 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061b25] active:translate-y-0 motion-reduce:transform-none"
          >
            Khám phá simulator <ArrowRight aria-hidden size={18} weight="bold" />
          </Link>
          <p className="text-sm text-slate-400">
            Nội dung giới thiệu chi tiết có thể tiếp tục mở rộng tại trang này.
          </p>
        </div>
      </div>
    </div>
  );
}
