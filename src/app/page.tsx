import { GearSix, Student } from "@phosphor-icons/react/ssr";
import { RoleCard } from "@/components/ui/role-card";

// Trang chủ Hệ thống kiểm tra mô phỏng CNS
export default function Home() {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-10">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-[var(--text-primary)] md:text-4xl">
          Chọn không gian làm việc
        </h1>
        <p className="mt-3 max-w-[60ch] text-base leading-7 text-[var(--text-secondary)]">
          Quản lý kịch bản hoặc bắt đầu bài thực hành mô phỏng CNS.
        </p>
      </div>

      <div className="mt-9 grid w-full grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <RoleCard
          href="/admin"
          title="Khu vực quản trị"
          description="Xây dựng kịch bản, cấu hình thiết bị và định nghĩa chuỗi thao tác chuẩn cho hệ thống CNS (bao gồm VOR/DME/ADS-B)."
          action="Mở khu vực quản trị"
          icon={<GearSix aria-hidden size={27} weight="regular" />}
        />
        <RoleCard
          href="/student"
          title="Khu vực học viên"
          description="Chọn bài thực hành, theo dõi trạng thái giám sát và thực hiện quy trình xử lý sự cố thiết bị CNS (bao gồm VOR/DME/ADS-B)."
          action="Bắt đầu thực hành"
          icon={<Student aria-hidden size={27} weight="regular" />}
        />
      </div>
    </section>
  );
}
