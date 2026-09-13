"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";

export function SimulatorToolbarBackButton() {
  function goBack() {
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      className="simulator-toolbar-back-button"
      onClick={goBack}
      aria-label="Quay lại trang chủ"
      title="Quay lại trang chủ"
    >
      <ArrowLeft aria-hidden size={12} weight="bold" />
      <span>Quay lại</span>
    </button>
  );
}
