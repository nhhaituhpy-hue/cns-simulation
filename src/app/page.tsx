import { ClipboardText, Student } from "@phosphor-icons/react/ssr";
import { HomeMediaCarousel } from "@/components/home/home-media-carousel";
import { RoleCard } from "@/components/ui/role-card";

// Trang chủ Hệ thống kiểm tra mô phỏng CNS
export default function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const mediaBaseUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/training-media/home-guides/v2`
    : "/media";

  return (
    <section className="grid w-full max-w-none items-start gap-8 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] lg:items-stretch lg:px-8 lg:py-4 xl:gap-10 xl:px-10 2xl:px-12">
      <div className="col-span-full flex flex-col items-center justify-center text-center">
        <p className="text-[17px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Nền tảng huấn luyện theo phương pháp CBTA
        </p>
        <h1 className="mt-2 max-w-none text-[15px] font-bold leading-[1.12] tracking-[-0.025em] text-[var(--text-primary)]">
          Kiểm tra đánh giá năng lực dựa trên thực tế vận hành hệ thống CNS
        </h1>
      </div>

      <div className="flex min-w-0 flex-col lg:h-full">
        <div className="flex flex-1 items-center py-4">
          <p className="max-w-[58ch] text-sm leading-6 text-[var(--text-secondary)] sm:text-[15px]">
            Xây dựng kịch bản khai thác, thực hành khai thác, xử lý sự cố trên môi trường mô phỏng.
          </p>
        </div>

        <div className="grid gap-3">
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
            icon={<Student aria-hidden size={24} weight="duotone" />}
          />
        </div>
      </div>

      <div className="relative aspect-video self-start overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-card)] lg:self-end">
        <HomeMediaCarousel baseUrl={mediaBaseUrl} />
      </div>
    </section>
  );
}
