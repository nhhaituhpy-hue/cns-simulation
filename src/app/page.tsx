import { ClipboardText, Exam } from "@phosphor-icons/react/ssr";
import { HomeMediaCarousel } from "@/components/home/home-media-carousel";
import { RoleCard } from "@/components/ui/role-card";

// Trang chủ Hệ thống kiểm tra mô phỏng CNS
export default function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const mediaBaseUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/training-media/home-guides/v1`
    : "/media";

  return (
    <section className="mx-auto grid w-full max-w-[1440px] items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(32rem,1.08fr)] lg:px-10 lg:py-10 xl:gap-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
          Nền tảng huấn luyện theo phương pháp CBTA
        </p>
        <h1 className="mt-3 max-w-[24ch] text-[2rem] font-bold leading-[1.08] tracking-[-0.035em] text-[var(--text-primary)] sm:text-4xl xl:text-[2.625rem]">
          Kiểm tra đánh giá năng lực dựa trên thực tế vận hành hệ thống CNS
        </h1>
        <p className="mt-5 max-w-[58ch] text-base leading-7 text-[var(--text-secondary)]">
          Xây dựng đề, thực hành xử lý sự cố và đánh giá quy trình trên cùng một môi trường mô phỏng.
        </p>

        <div className="mt-8 grid gap-3">
          <RoleCard
            href="/admin"
            title="Giám khảo"
            description="Tạo và hiệu chỉnh kịch bản, cấu hình thiết bị, quản lý bài nộp và chấm kết quả thực hành."
            action="Quản lý kỳ kiểm tra"
            icon={<ClipboardText aria-hidden size={24} weight="duotone" />}
          />
          <RoleCard
            href="/student"
            title="Thí sinh"
            description="Chọn bài thực hành VOR, DME hoặc ADS-B và thực hiện quy trình chẩn đoán trên thiết bị mô phỏng."
            action="Vào khu vực thực hành"
            icon={<Exam aria-hidden size={24} weight="duotone" />}
          />
        </div>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-card)]">
        <HomeMediaCarousel baseUrl={mediaBaseUrl} />
      </div>
    </section>
  );
}
