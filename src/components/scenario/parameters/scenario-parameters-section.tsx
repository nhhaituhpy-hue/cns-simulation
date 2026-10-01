import type { ReactNode } from "react";

export function ScenarioParametersSection({
  number, title, englishTitle, help, ariaLabel, className = "", actions, children,
}: {
  number?: number;
  title: string;
  englishTitle: string;
  help: string;
  ariaLabel: string;
  className?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return <section className={`selex-scenario-section ${className}`} aria-label={ariaLabel} data-scenario-section={number}>
    <header className="selex-scenario-section-heading">
      <h3>{number ? <span className="selex-scenario-section-number">{number}</span> : null}{title}<small>{englishTitle}</small></h3>
      {actions}
    </header>
    <p className="selex-scenario-help">{help}</p>
    {children}
  </section>;
}

export function ScenarioCriteriaHelp({ disposition }: { disposition?: "replace-module" | "software-adjustment" }) {
  return <p className="selex-scenario-help">
    {disposition === "replace-module"
      ? "Bài thay card đánh giá bằng chứng PMDT và đúng vị trí phần cứng. Các trạng thái vận hành dưới đây dùng để tham chiếu; cảnh báo có thể vẫn còn khi đã chẩn đoán đúng."
      : disposition === "software-adjustment"
      ? "Bài hiệu chỉnh cần đạt các trạng thái vận hành đã chọn, hoàn thành yêu cầu PMDT và xác nhận không thay phần cứng."
      : "Các điều kiện được chọn xác định kết quả vận hành cần đạt. Một điều kiện đã đúng từ đầu không bắt buộc phải thay đổi."}
  </p>;
}
