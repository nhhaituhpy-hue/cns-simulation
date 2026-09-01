"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";

export function SimulatorToolbarBackButton() {
  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/simulator");
  }

  return (
    <button
      type="button"
      className="simulator-toolbar-back-button"
      onClick={goBack}
      aria-label="Quay lại trang trước"
      title="Quay lại trang trước"
    >
      <ArrowLeft aria-hidden size={12} weight="bold" />
      <span>Quay lại</span>
    </button>
  );
}
