import { Circle } from "@phosphor-icons/react/dist/csr/Circle";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import {
  SENSOR_STATUSES,
  type SensorState,
  type SiteState,
} from "@/lib/types";
import {
  createSite,
  type ValidationErrors,
} from "./scenario-form-utils";
import { SensorDataProfileEditor } from "./sensor-data-profile-editor";

type SiteStateEditorProps = {
  sites: SiteState[];
  targetSensorId: string;
  errors: ValidationErrors;
  onChange: (sites: SiteState[], targetSensorId: string) => void;
};

const statusDetails: Record<
  SensorState["status"],
  { label: string; color: string }
> = {
  green: { label: "Hoạt động", color: "#16a34a" },
  orange: { label: "Suy giảm", color: "#ea580c" },
  yellow: { label: "Một phần", color: "#ca8a04" },
  red: { label: "Lỗi", color: "#dc2626" },
  turquoise: { label: "Dự phòng tốt", color: "#0891b2" },
  magenta: { label: "Dự phòng lỗi", color: "#c026d3" },
  grey: { label: "Tắt", color: "#71717a" },
};

function firstSensorId(sites: readonly SiteState[]): string {
  for (const site of sites) {
    if (site.sensorA) return site.sensorA.id;
    if (site.sensorB) return site.sensorB.id;
  }

  return "";
}

export function SiteStateEditor({
  sites,
  targetSensorId,
  errors,
  onChange,
}: SiteStateEditorProps) {
  function updateSite(siteId: string, changes: Partial<SiteState>) {
    onChange(
      sites.map((site) => (site.id === siteId ? { ...site, ...changes } : site)),
      targetSensorId,
    );
  }

  function updateSensor(
    siteId: string,
    key: "sensorA" | "sensorB",
    changes: Partial<SensorState>,
  ) {
    onChange(
      sites.map((site) => {
        if (site.id !== siteId || !site[key]) {
          return site;
        }

        return { ...site, [key]: { ...site[key], ...changes } };
      }),
      targetSensorId,
    );
  }

  function removeSite(siteId: string) {
    const removed = sites.find((site) => site.id === siteId);
    const nextSites = sites.filter((site) => site.id !== siteId);
    const targetRemoved = [removed?.sensorA?.id, removed?.sensorB?.id].includes(
      targetSensorId,
    );

    onChange(
      nextSites,
      targetRemoved ? firstSensorId(nextSites) : targetSensorId,
    );
  }

  function addSite() {
    if (sites.length >= 8) {
      return;
    }

    const site = createSite(sites.length + 1);
    onChange([...sites, site], targetSensorId || firstSensorId([site]));
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Site và cảm biến
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Cấu hình từ 1 đến 8 site, sau đó chọn đúng một cảm biến mục tiêu.
          </p>
        </div>
        <button
          type="button"
          onClick={addSite}
          disabled={sites.length >= 8}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus aria-hidden size={18} weight="regular" />
          Thêm site
        </button>
      </div>

      {errors.sites ? (
        <p role="alert" className="text-sm text-[#b91c1c]">
          {errors.sites}
        </p>
      ) : null}

      <div
        className="grid gap-5"
        role="group"
        aria-label="Danh sách site và cảm biến mục tiêu"
        aria-describedby={errors.targetSensorId ? "target-sensor-error" : undefined}
      >
        {sites.map((site, siteIndex) => (
          <fieldset
            key={site.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
          >
            <legend className="px-2 text-sm font-semibold text-[var(--text-primary)]">
              Site {siteIndex + 1}
            </legend>

            <div className="flex items-start gap-3">
              <div className="grid min-w-0 flex-1 gap-2">
                <label
                  htmlFor={`site-name-${site.id}`}
                  className="text-sm font-medium text-[var(--text-primary)]"
                >
                  Tên site
                </label>
                <input
                  id={`site-name-${site.id}`}
                  value={site.name}
                  onChange={(event) =>
                    updateSite(site.id, { name: event.target.value })
                  }
                  aria-invalid={Boolean(errors[`site.${site.id}.name`])}
                  aria-describedby={
                    errors[`site.${site.id}.name`]
                      ? `site-name-error-${site.id}`
                      : undefined
                  }
                  className="h-10 rounded border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
                {errors[`site.${site.id}.name`] ? (
                  <p
                    id={`site-name-error-${site.id}`}
                    role="alert"
                    className="text-xs text-[#b91c1c]"
                  >
                    {errors[`site.${site.id}.name`]}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => removeSite(site.id)}
                disabled={sites.length === 1}
                className="mt-7 inline-flex size-10 shrink-0 items-center justify-center rounded text-[#b91c1c] hover:bg-[#fef2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Xóa ${site.name || `site ${siteIndex + 1}`}`}
                title="Xóa site"
              >
                <Trash aria-hidden size={19} weight="regular" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {(["sensorA", "sensorB"] as const).map((sensorKey) => {
                const sensor = site[sensorKey];
                const sensorLabel = sensorKey === "sensorA" ? "A" : "B";

                if (!sensor) {
                  return (
                    <div
                      key={sensorKey}
                      className="flex min-h-36 flex-col items-center justify-center rounded border border-dashed border-[var(--border-strong)] bg-[var(--background)] p-4 text-center"
                    >
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Sensor {sensorLabel} chưa được cấu hình
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          updateSite(site.id, {
                            [sensorKey]: {
                              id: `${site.id}-${sensorLabel}`,
                              sensorLabel,
                              status: "green",
                              ipAddress: `10.10.${siteIndex + 1}.${
                                sensorLabel === "A" ? 3 : 4
                              }`,
                              name: `Quadrant ADS-B sensor ${sensorLabel}`,
                            },
                          })
                        }
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        <Plus aria-hidden size={17} weight="regular" />
                        Thêm Sensor {sensorLabel}
                      </button>
                    </div>
                  );
                }
                const details = statusDetails[sensor.status];

                return (
                  <fieldset
                    key={sensor.id}
                    className="rounded border border-[var(--border)] bg-[var(--background)] p-4"
                  >
                    <legend className="px-1 text-sm font-semibold text-[var(--text-primary)]">
                      Sensor {sensor.sensorLabel}
                    </legend>

                    <label className="mb-4 flex cursor-pointer items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] focus-within:ring-2 focus-within:ring-[var(--accent)]">
                      <input
                        type="radio"
                        name="target-sensor"
                        value={sensor.id}
                        checked={targetSensorId === sensor.id}
                        onChange={() => onChange(sites, sensor.id)}
                        className="size-4 accent-[var(--accent)]"
                      />
                      Cảm biến mục tiêu
                    </label>

                    <div className="grid gap-4">
                      <div className="grid gap-1.5">
                        <label
                          htmlFor={`sensor-name-${sensor.id}`}
                          className="text-xs font-medium text-[var(--text-secondary)]"
                        >
                          Tên cảm biến
                        </label>
                        <input
                          id={`sensor-name-${sensor.id}`}
                          value={sensor.name}
                          onChange={(event) =>
                            updateSensor(site.id, sensorKey, {
                              name: event.target.value,
                            })
                          }
                          aria-invalid={Boolean(
                            errors[`sensor.${sensor.id}.name`],
                          )}
                          aria-describedby={
                            errors[`sensor.${sensor.id}.name`]
                              ? `sensor-name-error-${sensor.id}`
                              : undefined
                          }
                          className="h-10 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                        />
                        {errors[`sensor.${sensor.id}.name`] ? (
                          <p
                            id={`sensor-name-error-${sensor.id}`}
                            role="alert"
                            className="text-xs text-[#b91c1c]"
                          >
                            {errors[`sensor.${sensor.id}.name`]}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-1.5">
                        <label
                          htmlFor={`sensor-ip-${sensor.id}`}
                          className="text-xs font-medium text-[var(--text-secondary)]"
                        >
                          Địa chỉ IPv4
                        </label>
                        <input
                          id={`sensor-ip-${sensor.id}`}
                          value={sensor.ipAddress}
                          onChange={(event) =>
                            updateSensor(site.id, sensorKey, {
                              ipAddress: event.target.value,
                            })
                          }
                          inputMode="decimal"
                          autoComplete="off"
                          aria-invalid={Boolean(
                            errors[`sensor.${sensor.id}.ipAddress`],
                          )}
                          aria-describedby={
                            errors[`sensor.${sensor.id}.ipAddress`]
                              ? `sensor-ip-error-${sensor.id}`
                              : undefined
                          }
                          className="h-10 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 font-mono text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                        />
                        {errors[`sensor.${sensor.id}.ipAddress`] ? (
                          <p
                            id={`sensor-ip-error-${sensor.id}`}
                            role="alert"
                            className="text-xs text-[#b91c1c]"
                          >
                            {errors[`sensor.${sensor.id}.ipAddress`]}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-1.5">
                        <label
                          htmlFor={`sensor-status-${sensor.id}`}
                          className="text-xs font-medium text-[var(--text-secondary)]"
                        >
                          Trạng thái ban đầu
                        </label>
                        <div className="relative">
                          <Circle
                            aria-hidden
                            size={12}
                            weight="fill"
                            color={details.color}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                          />
                          <select
                            id={`sensor-status-${sensor.id}`}
                            value={sensor.status}
                            onChange={(event) =>
                              updateSensor(site.id, sensorKey, {
                                status: event.target.value as SensorState["status"],
                              })
                            }
                            className="h-10 w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] pl-8 pr-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                          >
                            {SENSOR_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {statusDetails[status].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <SensorDataProfileEditor
                        sensor={sensor}
                        onChange={(changes) =>
                          updateSensor(site.id, sensorKey, changes)
                        }
                      />
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {errors.targetSensorId ? (
        <p
          id="target-sensor-error"
          role="alert"
          className="text-sm text-[#b91c1c]"
        >
          {errors.targetSensorId}
        </p>
      ) : null}
    </div>
  );
}
