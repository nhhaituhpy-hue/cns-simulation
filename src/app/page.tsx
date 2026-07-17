import { GearSix, Student } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import { RoleCard } from "@/components/ui/role-card";

// Trang chủ Hệ thống kiểm tra mô phỏng CNS
export default function Home() {
  return (
    <section className="mx-auto grid min-h-[calc(100dvh-4.25rem)] w-full max-w-[1440px] items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(32rem,1.08fr)] lg:px-10 lg:py-10 xl:gap-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
          Nền tảng kiểm tra kỹ thuật hàng không
        </p>
        <h1 className="mt-3 max-w-[14ch] text-4xl font-bold leading-[1.06] tracking-[-0.045em] text-[var(--text-primary)] sm:text-5xl">
          Kiểm tra năng lực vận hành hệ thống CNS
        </h1>
        <p className="mt-5 max-w-[58ch] text-base leading-7 text-[var(--text-secondary)]">
          Xây dựng đề, thực hành xử lý sự cố và đánh giá quy trình trên cùng một môi trường mô phỏng.
        </p>

        <div className="mt-8 grid gap-3">
          <RoleCard
            href="/admin"
            title="Không gian giám khảo"
            description="Tạo và hiệu chỉnh kịch bản, cấu hình thiết bị, quản lý bài nộp và chấm kết quả thực hành."
            action="Quản lý kỳ kiểm tra"
            icon={<GearSix aria-hidden size={24} weight="duotone" />}
          />
          <RoleCard
            href="/student"
            title="Không gian học viên"
            description="Chọn bài thực hành VOR, DME hoặc ADS-B và thực hiện quy trình chẩn đoán trên thiết bị mô phỏng."
            action="Vào khu vực thực hành"
            icon={<Student aria-hidden size={24} weight="duotone" />}
          />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-card)]">
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[var(--surface-muted)] lg:aspect-[4/5] xl:aspect-[5/4]">
          <Image
            src="/images/cns-image.webp"
            alt="Trạm dẫn đường vô tuyến và giám sát hàng không tại khu vực ven biển"
            fill
            preload
            sizes="(max-width: 1023px) 100vw, 52vw"
            className="object-cover object-[64%_center]"
          />
        </div>
        <div className="px-3 pb-2 pt-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Môi trường mô phỏng thiết bị CNS</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            VOR, DME và ADS-B trong một quy trình kiểm tra thống nhất
          </p>
        </div>
      </div>
    </section>
  );
}
