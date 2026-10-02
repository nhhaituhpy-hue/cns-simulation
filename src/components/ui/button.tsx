"use client";

import React, { forwardRef } from "react";
import Link, { type LinkProps } from "next/link";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md"; // sm = 32px (bảng), md = 36px (hành động trang)

export interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
}

export function cnsButtonClass({
  variant = "secondary",
  size = "md",
  className = "",
  disabled = false,
}: ButtonClassOptions = {}): string {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-[8px] font-medium text-[13px] leading-none transition duration-150 ease-out select-none " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111a24] " +
    "disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed";

  const sizeClasses =
    size === "sm"
      ? "h-8 px-3 text-[13px]" // 32px table row action button
      : "h-9 px-3.5 text-[13px]"; // 36px primary page action button

  let variantClasses = "";
  if (variant === "primary") {
    variantClasses =
      "bg-[#0369a1] text-white shadow-sm hover:bg-[#075985] active:bg-[#0c4a6e] border border-transparent";
  } else if (variant === "danger") {
    variantClasses =
      "bg-transparent text-[#f87171] border border-[rgba(248,113,113,0.25)] hover:bg-[rgba(239,68,68,0.12)] hover:border-[rgba(248,113,113,0.45)] active:bg-[rgba(239,68,68,0.2)]";
  } else {
    // secondary / ghost
    variantClasses =
      "bg-white/[0.03] text-[#E6EDF5] border border-white/[0.12] hover:bg-white/[0.08] hover:border-white/[0.2] active:bg-white/[0.12]";
  }

  const disabledClasses = disabled
    ? "pointer-events-none opacity-40 cursor-not-allowed"
    : "";

  return [base, sizeClasses, variantClasses, disabledClasses, className].filter(Boolean).join(" ");
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={props.type || "button"}
        className={cnsButtonClass({ variant, size, className, disabled: props.disabled })}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: React.ReactNode;
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ variant = "secondary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        className={cnsButtonClass({ variant, size, className })}
        {...props}
      >
        {children}
      </Link>
    );
  }
);
ButtonLink.displayName = "ButtonLink";

/* --------------------------------------------------------------------------
   Badges and Chips for Authoring & Management
   -------------------------------------------------------------------------- */

export function DifficultyBadge({
  difficulty,
  className = "",
}: {
  difficulty: "basic" | "intermediate" | "advanced" | string;
  className?: string;
}) {
  let label = "Cơ bản";
  let colorStyle =
    "bg-[rgba(34,197,94,0.14)] text-[#4ade80] border-[rgba(34,197,94,0.28)]";

  if (difficulty === "advanced") {
    label = "Nâng cao";
    colorStyle =
      "bg-[rgba(249,115,22,0.14)] text-[#fb923c] border-[rgba(249,115,22,0.28)]";
  } else if (difficulty === "intermediate") {
    label = "Trung bình";
    colorStyle =
      "bg-[rgba(234,179,8,0.14)] text-[#facc15] border-[rgba(234,179,8,0.28)]";
  }

  return (
    <span
      className={`inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[11px] font-medium leading-none tracking-tight ${colorStyle} ${className}`}
    >
      {label}
    </span>
  );
}

export function StatusSavedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium text-[#4ade80] ${className}`}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-[#22c55e]" />
      <span>Đã lưu</span>
    </span>
  );
}

export function CountBadgePill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 text-[12px] font-medium tabular-nums text-[#9AA9BC] ${className}`}
    >
      {children}
    </span>
  );
}
