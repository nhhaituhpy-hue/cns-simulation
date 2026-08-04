import { ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { Wrench } from "@phosphor-icons/react/dist/csr/Wrench";
import type { LoginUser } from "@/lib/types";
import type { ValidationErrors } from "./scenario-form-utils";

type LoginRoleStepProps = {
  value: LoginUser;
  errors: ValidationErrors;
  hasRecordedActions?: boolean;
  onChange: (value: LoginUser) => void;
};

const roles: Array<{
  value: LoginUser;
  label: string;
  account: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  {
    value: "sysadmin",
    label: "Quản trị hệ thống",
    account: "sysadmin",
    description: "Truy cập đầy đủ cấu hình hệ thống, mạng, SNMP và phần mềm.",
    icon: ShieldCheck,
  },
  {
    value: "maintenance",
    label: "Bảo trì",
    account: "maintenance",
    description: "Truy cập các chức năng kiểm tra, giám sát và bảo trì thiết bị.",
    icon: Wrench,
  },
];

export function LoginRoleStep({
  value,
  errors,
  hasRecordedActions = false,
  onChange,
}: LoginRoleStepProps) {
  return (
    <fieldset aria-describedby={errors.targetLoginUser ? "login-role-error" : undefined}>
      <legend className="text-sm font-semibold text-[var(--text-primary)]">
        Tài khoản đăng nhập đầu tiên
      </legend>
      <p className="mt-1 max-w-[65ch] text-sm leading-6 text-[var(--text-secondary)]">
        Bước tiếp theo bắt đầu bằng tài khoản này. Sau khi nhấn X, có thể
        đăng nhập lại bằng sysadmin hoặc maintenance mà vẫn giữ mode và cấu
        hình máy thu.
      </p>
      {hasRecordedActions ? (
        <p className="mt-3 rounded border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#78350f]">
          Đổi tài khoản đăng nhập đầu tiên sẽ xóa chuỗi thao tác đã ghi vì
          điểm bắt đầu không còn cùng ngữ cảnh.
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const RoleIcon = role.icon;
          const selected = value === role.value;

          return (
            <label
              key={role.value}
              className={`cursor-pointer rounded-lg border p-5 transition-[border-color,background-color,box-shadow] focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 ${
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="target-login-user"
                  value={role.value}
                  checked={selected}
                  onChange={() => onChange(role.value)}
                  className="mt-1 size-4 accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                    <RoleIcon aria-hidden size={21} weight="regular" />
                    {role.label}
                  </span>
                  <code className="mt-2 inline-block rounded bg-[var(--surface)] px-2 py-1 font-mono text-xs text-[var(--accent)]">
                    {role.account}
                  </code>
                  <span className="mt-3 block text-sm leading-6 text-[var(--text-secondary)]">
                    {role.description}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {errors.targetLoginUser ? (
        <p id="login-role-error" role="alert" className="mt-3 text-sm text-[#b91c1c]">
          {errors.targetLoginUser}
        </p>
      ) : null}
    </fieldset>
  );
}
