import {
  CON_SON_SENSOR_1,
  PRESET_LABELS,
  SENSOR_DATA_PRESETS,
} from "@/lib/sensor-data-presets";
import type { SensorDataProfile, SensorState } from "@/lib/types";

type SensorDataProfileEditorProps = {
  sensor: SensorState;
  onChange: (changes: Partial<SensorState>) => void;
};

type ProfileFieldProps = {
  id: string;
  label: string;
  value: string;
  inputMode?: "decimal";
  mono?: boolean;
  onChange: (value: string) => void;
};

function ProfileField({
  id,
  label,
  value,
  inputMode,
  mono = false,
  onChange,
}: ProfileFieldProps) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium text-[var(--text-secondary)]"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        className={
          "h-10 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 " +
          (mono ? "font-mono" : "")
        }
      />
    </div>
  );
}

function selectedProfileValue(
  profile: SensorDataProfile | undefined,
): string {
  if (!profile) return "default";

  const serialized = JSON.stringify(profile);
  const preset = Object.entries(SENSOR_DATA_PRESETS).find(
    ([, value]) => JSON.stringify(value) === serialized,
  );
  return preset?.[0] ?? "custom";
}

function createCustomProfile(sensor: SensorState): SensorDataProfile {
  const profile = structuredClone(CON_SON_SENSOR_1);
  profile.sensorName = sensor.name;
  profile.network.ip = sensor.ipAddress;
  return profile;
}

export function SensorDataProfileEditor({
  sensor,
  onChange,
}: SensorDataProfileEditorProps) {
  const selection = selectedProfileValue(sensor.dataProfile);
  const profile = sensor.dataProfile;

  function updateProfile(nextProfile: SensorDataProfile) {
    onChange({ dataProfile: nextProfile });
  }

  function handleSelection(value: string) {
    if (value === "default") {
      onChange({ dataProfile: undefined });
      return;
    }

    if (value === "custom") {
      onChange({
        dataProfile: profile
          ? structuredClone(profile)
          : createCustomProfile(sensor),
      });
      return;
    }

    const preset = SENSOR_DATA_PRESETS[value];
    if (!preset) return;

    const nextProfile = structuredClone(preset);
    onChange({
      dataProfile: nextProfile,
      ipAddress: nextProfile.network.ip,
      name: nextProfile.sensorName,
    });
  }

  function updateNetwork(
    key: "ip" | "subnet" | "gateway",
    value: string,
  ) {
    if (!profile) return;
    updateProfile({
      ...profile,
      network: { ...profile.network, [key]: value },
    });

    if (key === "ip") {
      onChange({
        ipAddress: value,
        dataProfile: {
          ...profile,
          network: { ...profile.network, ip: value },
        },
      });
    }
  }

  function updateGps(key: "latitude" | "longitude", value: string) {
    if (!profile) return;
    updateProfile({
      ...profile,
      gps: { ...profile.gps, [key]: value },
    });
  }

  return (
    <div className="grid gap-3 border-t border-[var(--border)] pt-4">
      <div className="grid gap-1.5">
        <label
          htmlFor={"sensor-profile-" + sensor.id}
          className="text-xs font-medium text-[var(--text-secondary)]"
        >
          Data Profile
        </label>
        <select
          id={"sensor-profile-" + sensor.id}
          value={selection}
          onChange={(event) => handleSelection(event.target.value)}
          className="h-10 w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        >
          <option value="default">{"M\u1eb7c \u0111\u1ecbnh"}</option>
          {Object.entries(PRESET_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
          <option value="custom">{"T\u00f9y ch\u1ec9nh..."}</option>
        </select>
      </div>

      {selection === "custom" && profile ? (
        <div className="grid gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            {
              "Ch\u1ec9nh c\u00e1c th\u00f4ng s\u1ed1 terminal c\u01a1 b\u1ea3n. IP v\u00e0 t\u00ean \u0111\u01b0\u1ee3c \u0111\u1ed3ng b\u1ed9 v\u1edbi sensor."
            }
          </p>
          <ProfileField
            id={"profile-name-" + sensor.id}
            label={"T\u00ean sensor"}
            value={profile.sensorName}
            onChange={(value) => {
              updateProfile({ ...profile, sensorName: value });
              onChange({
                name: value,
                dataProfile: { ...profile, sensorName: value },
              });
            }}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileField
              id={"profile-ip-" + sensor.id}
              label={"\u0110\u1ecba ch\u1ec9 IPv4"}
              value={profile.network.ip}
              inputMode="decimal"
              mono
              onChange={(value) => updateNetwork("ip", value)}
            />
            <ProfileField
              id={"profile-subnet-" + sensor.id}
              label="Subnet mask"
              value={profile.network.subnet}
              inputMode="decimal"
              mono
              onChange={(value) => updateNetwork("subnet", value)}
            />
            <ProfileField
              id={"profile-gateway-" + sensor.id}
              label="Default gateway"
              value={profile.network.gateway}
              inputMode="decimal"
              mono
              onChange={(value) => updateNetwork("gateway", value)}
            />
            <ProfileField
              id={"profile-version-" + sensor.id}
              label="Sensor version"
              value={profile.sensorVersion}
              mono
              onChange={(value) =>
                updateProfile({ ...profile, sensorVersion: value })
              }
            />
            <ProfileField
              id={"profile-latitude-" + sensor.id}
              label="GPS latitude"
              value={profile.gps.latitude}
              inputMode="decimal"
              mono
              onChange={(value) => updateGps("latitude", value)}
            />
            <ProfileField
              id={"profile-longitude-" + sensor.id}
              label="GPS longitude"
              value={profile.gps.longitude}
              inputMode="decimal"
              mono
              onChange={(value) => updateGps("longitude", value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
