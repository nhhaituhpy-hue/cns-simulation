import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Quản lý kịch bản",
};

export default function AdminPage() {
  redirect("/admin/exams");
}
