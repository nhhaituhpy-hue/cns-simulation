# ADS-B Training Simulator — Upgrade Plan v1.0

> **Tài liệu hướng dẫn triển khai** — Giao cho AI assistant thực hiện.
> Ngày tạo: 2026-07-16

---

## MỤC LỤC

1. [Bối cảnh dự án](#1-bối-cảnh-dự-án)
2. [Tổng quan nâng cấp](#2-tổng-quan-nâng-cấp)
3. [Module A — Terminal với dữ liệu Côn Sơn](#3-module-a)
4. [Module B — QCMS GUI mở rộng](#4-module-b)
5. [Module C — Mô phỏng phần cứng & cô lập sự cố](#5-module-c)
6. [Tổng hợp tasks list](#6-tổng-hợp-tasks-list)
7. [Quy tắc chất lượng](#7-quy-tắc-chất-lượng)

---

## 1. Bối cảnh dự án

### 1.1 Mô tả

Web app mô phỏng ADS-B dành cho đào tạo kỹ thuật viên. Admin tạo kịch bản sự cố, student quan sát QCMS → mở terminal giả lập → thao tác menu → nộp bài → chấm điểm tự động.

### 1.2 Tech Stack

| Công nghệ | Phiên bản |
|------------|-----------|
| Next.js | 16.2.10 (App Router) |
| React | 19.2.4 |
| TypeScript | ^5 |
| Tailwind CSS | v4 + @tailwindcss/postcss |
| Zustand | ^5.0.14 |
| Phosphor Icons | ^2.1.10 |
| Geist (font) | ^1.7.2 |
| Motion | ^12.42.2 |
| Vitest | ^4.1.10 |
| Playwright | ^1.61.1 |

### 1.3 Cấu trúc thư mục hiện tại

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page (chọn Admin/Student)
│   ├── globals.css             # Tailwind + custom styles
│   ├── admin/                  # Admin portal routes
│   ├── student/                # Student portal routes
│   └── api/                    # API routes
├── components/
│   ├── admin/                  # ScenarioForm, ActionBuilder, ...
│   ├── grading/                # GradingResult, StepDiff
│   ├── layout/                 # AppShell, Header, Sidebar
│   ├── qcms/                   # SiteMonitor, SiteItem, SensorMonitoringModal, ...
│   ├── terminal/               # TerminalWindow, TerminalOutput, TerminalInput
│   └── ui/                     # Shared UI components
├── lib/
│   ├── types.ts                # TypeScript interfaces (100 dòng)
│   ├── terminal-engine.ts      # Terminal state machine (571 dòng)
│   ├── grading.ts              # Grading algorithm LCS (186 dòng)
│   ├── normalization.ts        # Input normalization
│   ├── storage.ts              # localStorage CRUD
│   ├── db.ts                   # Data access layer
│   └── menu-data/
│       ├── index.ts            # getMenuDefinition()
│       ├── menu-types.ts       # MenuNode, MenuItem, MenuAction, MenuTree
│       ├── sa-menus.ts         # SA menu tree (11044 bytes)
│       └── ma-menus.ts         # MA menu tree (9317 bytes)
└── stores/
    ├── terminal-store.ts       # Zustand: terminal state
    ├── recording-store.ts      # Zustand: action recording
    ├── scenario-store.ts       # Zustand: scenario CRUD
    └── default-scenarios.ts    # 3 built-in scenarios
```

### 1.4 Interfaces hiện tại (types.ts)

```typescript
// Sensor có 7 trạng thái màu
type SensorStatus = "green"|"orange"|"yellow"|"red"|"turquoise"|"magenta"|"grey";

interface SensorMonitoringData {
  lastSnmpResponseAt: string;
  temperatureC: number;
  cpuLoadPercent: number;
  voltages: { v3_3: number; v5: number; v12: number };
  receiverConfidencePercent: number;
  crcErrorCount: number;
  gpsStatus: "synchronized" | "unsynchronized" | "unavailable";
}

interface SensorState {
  id: string;
  sensorLabel: "A" | "B";
  status: SensorStatus;
  ipAddress: string;
  name: string;
  monitoring?: SensorMonitoringData;
}

interface SiteState {
  id: string;
  name: string;
  sensorA: SensorState | null;
  sensorB: SensorState | null;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  createdAt: string;
  updatedAt?: string;
  sites: SiteState[];
  targetSensorId: string;
  targetLoginUser: "sysadmin" | "maintenance";
  expectedActions: RecordedAction[];
}
```

### 1.5 Menu system hiện tại (menu-types.ts)

```typescript
type MenuAction =
  | { type: "navigate"; targetMenuId: string }
  | { type: "display"; content: string }        // text cứng
  | { type: "toggle"; settingId: string; prompt: string; options: ToggleOption[] }
  | { type: "input"; settingId: string; prompt: string; successMessage: string; sensitive?: boolean }
  | { type: "return" }
  | { type: "exit" };

interface MenuNode {
  id: string;
  title: string;
  header: MenuHeader;    // sensorName, version, mode, userLabel, tag
  items: readonly MenuItem[];
}

type MenuTree = Readonly<Record<string, MenuNode>>;
```

### 1.6 Terminal engine (terminal-engine.ts)

- Class `TerminalEngine` với processInput(rawInput) → TerminalProcessResult
- Xử lý: navigate (chuyển menu), display (hiện text → RETURN), toggle (chọn option), input (nhập giá trị), return (quay lại), exit
- Render menu ASCII box 74 ký tự rộng
- `display` action hiện tại: trả về `action.content` (text cứng hardcode trong sa-menus.ts / ma-menus.ts)

### 1.7 Tài liệu tham chiếu PDF (không nằm trong repo)

| Tên file | Nội dung |
|----------|----------|
| `8.0 QCMS GUI.pdf` | 46 trang screenshot GUI QCMS: Control Buttons, Sites, Context Menu, Replay, Export, Statistics |
| `5.0 QCMS_UserManual_V1.13.pdf` | 89 trang: Site Monitor, Sensor Monitoring, Sensor Config, Site Statistics, Replay, Export, QSCT |
| `2. Sensor_HW_InstallationGuide_V1.5.pdf` | 48 trang: 12 bước lắp đặt phần cứng, sơ đồ kết nối, spec cable/connector |
| `1.0 system diagram.pdf` | Sơ đồ mạng ADS-B Côn Sơn: 3 sensor, 2 site monitor, QCMS, IP addresses |
| `1. 4.0 ADS-B Con Son_EPL_V0.3.pdf` | Equipment Provision List: 35 mã thiết bị AG.1→AG.35 |

### 1.8 Dữ liệu trạm Côn Sơn (trích từ PDF)

**Sơ đồ mạng:**
```
Equipment Room:
  Sensor 1: 192.168.201.1   (Quadrant Receiver Indoor)
  Sensor 3: 192.168.201.5   (Quadrant Receiver Indoor)
  Site Monitor 1: 192.168.201.2
  Site Monitor 2: 192.168.201.3
  QCMS: 192.168.201.10
  Gateway to ATTECH: 192.168.201.7
  QCMS-QIC-SNMP Alarm Tool: 192.168.200.2

50M Height Mast (per sensor):
  1x 1090 MHz Omni-Directional Antenna (AG.2, WiMo)
  1x Pre-amplifier 18dB (AG.3, Kuhne)
  1x GPS Receiver (AG.8, Garmin)
  1x Lightning Protection 1KV (AG.6)
  1x Directional Coupler (AG.13, for Site Monitor)
```

**Danh sách thiết bị EPL:**

| ID | Tên | Mô tả | SL |
|----|-----|-------|----|
| AG.1 | Quadrant Receiver Indoor | 1090 MHz receiver | 2+1 |
| AG.2 | 1090 MHz Antenna | 6dB omni-directional, WiMo | 2+1 |
| AG.3 | Pre-amplifier | 18dB low noise, Kuhne | 2+1 |
| AG.4 | Antenna cable | Cellflex UCF78-50JA, 50Ω | 2+1 |
| AG.5 | Earth cable | 16mm², green/yellow | 4+2 |
| AG.6 | Lightning Protection | 1KV | 4+2 |
| AG.7 | Power cable AC | Ölflex 540 P3x1.5sqmm | 2+1 |
| AG.8 | GPS Receiver | Garmin + install kit | 2+1 |
| AG.9 | Ethernet cable | Cat.5e, 100Ω | 2+1 |
| AG.10 | Antenna Mast | Ø50mm | 2+1 |
| AG.11 | Site Monitor | 1090 MHz Tx | 2 |
| AG.12 | Site Monitor Antenna | Omni-directional | 2 |
| AG.13 | Directional Coupler | Monitoring device | 2 |
| AG.22 | RCMS Workstation | HP Micro Tower + 24" LCD | 1 |
| AG.23 | QCMS License | COMSOFT | 5 |
| AG.24 | QIC License | COMSOFT | 1 |
| AG.25 | SNMP Alarm Tool | COMSOFT | 1 |

**Tuyến tín hiệu phần cứng (từ HW Installation Guide):**
```
Antenna (AG.2)
  │ N-connector
Pre-amplifier (AG.3)  ← gắn trực tiếp trên antenna
  │ Coax cable (AG.4, max 15m)
Lightning Protector (AG.6)  ← gắn trên sensor unit
  │         Earth cable (AG.5) → Central Ground
Quadrant Sensor (AG.1)
  │ Plug (3): Antenna (RF-In)
  │ Plug (2): GPS ← GPS Receiver (AG.8), cable max 5m
  │ Plug (1): AC Power ← Power cable (AG.7), max 100m
  │ Plug (5): DC Power (alternative)
  │ Plug (4): LAN ← Ethernet cable (AG.9), max 100m
LAN Switch
  ├── QCMS Workstation (AG.22)
  ├── Site Monitor (AG.11) → Directional Coupler (AG.13) → Antenna
  └── Gateway (AG.25)
```

---

## 2. Tổng quan nâng cấp

### 3 Module độc lập

| Module | Tên | Mục tiêu | Phụ thuộc |
|--------|-----|----------|-----------|
| **A** | Terminal + Dữ liệu Côn Sơn | Khi thao tác terminal, output giống thiết bị thật với data Côn Sơn | Không |
| **B** | QCMS GUI mở rộng | Mô phỏng thêm 6+ cửa sổ QCMS để đào tạo khai thác | Dùng data từ A (SensorDataProfile) |
| **C** | Phần cứng & Cô lập sự cố | Sơ đồ tín hiệu interactive, xác định component lỗi | Dùng data từ A + B |

### Thứ tự thực hiện đề xuất: A → B → C

---

## 3. Module A — Terminal với dữ liệu mẫu ADS-B Côn Sơn

### Mục tiêu
Khi student dùng terminal SA/MA, các lệnh "Display" trả kết quả **giống output thật** thay vì text cứng. Admin có thể chọn preset dữ liệu Côn Sơn hoặc tự nhập.

---

### Task A1: Mở rộng SensorDataProfile trong types.ts

**File:** `src/lib/types.ts`
**Hành động:** Thêm interface mới, KHÔNG thay đổi interface cũ

```typescript
// ===== THÊM VÀO CUỐI types.ts =====

export interface NetworkConfig {
  ip: string;           // "192.168.201.1"
  subnet: string;       // "255.255.255.0"
  gateway: string;      // "192.168.201.7"
  dhcp: boolean;
  macAddress: string;   // "00:1A:2B:3C:4D:01"
  ntpServer: string;    // "192.168.201.10"
  bitRate: string;      // "100 Mbit/s full duplex"
}

export interface ReceiverStats {
  shortSquitter: { total: number; passed: number; failed: number };
  extendedSquitter: { total: number; passed: number; failed: number };
  totalTargetsDetected: number;
  currentTargets: number;
}

export interface SurveillanceClient {
  id: number;
  name: string;
  ip: string;
  port: number;
  protocol: "UDP" | "TCP";
  messageType: string;  // "ASTERIX CAT21"
  enabled: boolean;
  messagesSent: number;
}

export interface SnmpUserConfig {
  name: string;
  authType: "noAuth" | "authNoPriv" | "authPriv";
}

export interface SnmpTrapDest {
  ip: string;
  port: number;
  enabled: boolean;
}

export interface GpsConfig {
  enabled: boolean;
  ntpEnabled: boolean;
  ntpServer: string;
  latitude: string;    // "8.6833"
  longitude: string;   // "106.6000"
  altitude: string;    // "2m"
  deviation: string;   // "0.2m"
}

export interface FilterConfig {
  altitudeEnabled: boolean;
  altitudeMin: number;  // FL
  altitudeMax: number;
  addressFilterEnabled: boolean;
  addressFilter: string;
  positionFilterEnabled: boolean;
  positionFilterRadius: number;  // NM
}

export interface AsterixConfig {
  sac: number;
  sic: number;
  cat21Version: string;
  cat21Enabled: boolean;
  nonOpEnabled: boolean;
  mlatEnabled: boolean;
  rawEnabled: boolean;
  dataBlockSize: number;
  ttl: number;
}

export interface GeneralSettings {
  crcCorrection: boolean;
  groundTargets: boolean;
  targetOverloadLimit: number;
}

export interface SyslogConfig {
  localDestination: string;  // "/var/log/sensor.log"
  remoteEnabled: boolean;
  remoteServerIp: string;
}

export interface SiteMonitorConfig {
  enabled: boolean;
  ip: string;
  port: number;
  name: string;
}

export interface SensorDataProfile {
  // Identification
  sensorVersion: string;     // "1-8-3"
  configVersion: string;     // "ConSon_V1.0"
  sensorName: string;        // "ConSon Sensor 1"

  // Network
  network: NetworkConfig;

  // Receiver performance
  receiverStats: ReceiverStats;

  // Surveillance clients (max 20 per sensor)
  clients: SurveillanceClient[];

  // SNMP
  snmpUsers: SnmpUserConfig[];
  snmpTraps: SnmpTrapDest[];
  snmpHeartbeatPeriod: number;   // seconds
  snmpAlarmPeriod: number;

  // GPS & NTP
  gps: GpsConfig;

  // Filters (MA menu only)
  filters: FilterConfig;

  // ASTERIX
  asterix: AsterixConfig;

  // SA General Settings
  general: GeneralSettings;

  // System Log
  syslog: SyslogConfig;

  // Site Monitor / Monitoring Devices (MA menu 11)
  siteMonitors: SiteMonitorConfig[];
}
```

**Cập nhật SensorState:**
```typescript
export interface SensorState {
  id: string;
  sensorLabel: SensorLabel;
  status: SensorStatus;
  ipAddress: string;
  name: string;
  monitoring?: SensorMonitoringData;
  dataProfile?: SensorDataProfile;  // ← THÊM (optional, backward-compatible)
}
```

**Mong đợi:**
- Không breaking change — `dataProfile` là optional
- 3 kịch bản mẫu cũ vẫn hoạt động (không có dataProfile)
- `npm run typecheck` pass

---

### Task A2: Tạo file preset dữ liệu Côn Sơn

**File mới:** `src/lib/sensor-data-presets.ts`
**Hành động:** Tạo 2 preset dựa trên EPL và sơ đồ mạng

```typescript
import type { SensorDataProfile } from "./types";

export const CON_SON_SENSOR_1: SensorDataProfile = {
  sensorVersion: "1-8-3",
  configVersion: "ConSon_V1.0",
  sensorName: "ConSon Sensor 1",
  network: {
    ip: "192.168.201.1",
    subnet: "255.255.255.0",
    gateway: "192.168.201.7",
    dhcp: false,
    macAddress: "00:1A:2B:3C:4D:01",
    ntpServer: "192.168.201.10",
    bitRate: "100 Mbit/s full duplex",
  },
  receiverStats: {
    shortSquitter: { total: 1284567, passed: 1271234, failed: 13333 },
    extendedSquitter: { total: 856789, passed: 848123, failed: 8666 },
    totalTargetsDetected: 45230,
    currentTargets: 12,
  },
  clients: [
    { id: 1, name: "QCMS", ip: "192.168.201.10", port: 20550, protocol: "UDP", messageType: "ASTERIX CAT21 v0.26", enabled: true, messagesSent: 4523100 },
    { id: 2, name: "Gateway", ip: "192.168.201.7", port: 20550, protocol: "UDP", messageType: "ASTERIX CAT21 v0.26", enabled: true, messagesSent: 4523098 },
  ],
  snmpUsers: [
    { name: "qcms_user", authType: "authPriv" },
  ],
  snmpTraps: [
    { ip: "192.168.201.10", port: 20900, enabled: true },
  ],
  snmpHeartbeatPeriod: 60,
  snmpAlarmPeriod: 10,
  gps: {
    enabled: true,
    ntpEnabled: false,
    ntpServer: "192.168.201.10",
    latitude: "8.6833",
    longitude: "106.6000",
    altitude: "2m",
    deviation: "0.2m",
  },
  filters: {
    altitudeEnabled: true,
    altitudeMin: 0,
    altitudeMax: 600,
    addressFilterEnabled: false,
    addressFilter: "",
    positionFilterEnabled: false,
    positionFilterRadius: 250,
  },
  asterix: {
    sac: 120,
    sic: 1,
    cat21Version: "0.26",
    cat21Enabled: true,
    nonOpEnabled: false,
    mlatEnabled: false,
    rawEnabled: false,
    dataBlockSize: 512,
    ttl: 64,
  },
  general: {
    crcCorrection: true,
    groundTargets: false,
    targetOverloadLimit: 500,
  },
  syslog: {
    localDestination: "/var/log/sensor.log",
    remoteEnabled: true,
    remoteServerIp: "192.168.201.10",
  },
  siteMonitors: [
    { enabled: true, ip: "192.168.201.2", port: 20600, name: "Site Monitor 1" },
  ],
};

export const CON_SON_SENSOR_3: SensorDataProfile = {
  // ... tương tự nhưng:
  // ip: "192.168.201.5", sic: 3, sensorName: "ConSon Sensor 3"
  // siteMonitors ip: "192.168.201.3" (Site Monitor 2)
  // ... (tạo đầy đủ)
};

export const SENSOR_DATA_PRESETS: Record<string, SensorDataProfile> = {
  "con-son-sensor-1": CON_SON_SENSOR_1,
  "con-son-sensor-3": CON_SON_SENSOR_3,
};

export const PRESET_LABELS: Record<string, string> = {
  "con-son-sensor-1": "ADS-B Côn Sơn — Sensor 1 (192.168.201.1)",
  "con-son-sensor-3": "ADS-B Côn Sơn — Sensor 3 (192.168.201.5)",
};
```

**Mong đợi:**
- 2 preset hoàn chỉnh với mọi trường đều có giá trị hợp lệ
- Export `SENSOR_DATA_PRESETS` và `PRESET_LABELS`

---

### Task A3: Tạo template engine cho terminal output

**File mới:** `src/lib/terminal-templates.ts`
**Mục tiêu:** Nhận `SensorDataProfile` + `templateId` → render text output giống console thật

Danh sách template cần tạo (khớp với display action trong sa-menus.ts / ma-menus.ts):

| Template ID | Menu path | Mô tả |
|-------------|-----------|-------|
| `sa-network-display` | SA > 2 > 1 | Display Network: IP, subnet, gateway, DHCP, MAC, NTP, bitrate |
| `sa-software-version` | SA > 6 > 1 | Display Version: sensor version, config version |
| `sa-clients-display` | SA > 3 > 1 | Display Clients: danh sách clients bảng |
| `sa-clients-stats` | SA > 3 > 2 | Display Stats: messages sent per client |
| `sa-snmp-users` | SA > 5 > 1 | Display SNMP Users: danh sách users |
| `sa-snmp-traps` | SA > 5 > 4 | Display Trap Destinations |
| `sa-syslog-config` | SA > 4 > 1 | Display Syslog Config |
| `ma-network-display` | MA > 2 > 1 | Display Network (read-only) |
| `ma-network-ntp` | MA > 2 > 2 | Display NTP status |
| `ma-network-bitrate` | MA > 2 > 3 | Display Bit Rate |
| `ma-system-config` | MA > 8 > 1 | System Config: toàn bộ config summary |
| `ma-system-status` | MA > 8 > 2 | System Status: temp, CPU, voltages, GPS |
| `ma-dsp-stats` | MA > 8 > 3 | Extended DSP Stats: CRC, receiver stats |
| `ma-gps-status` | MA > 6 > 1 | GPS Status: lat, lon, alt, sync |
| `ma-filter-display` | MA > 5 > 1 | Display Filters |
| `ma-clients-display` | MA > 3 > 1 | Display Config (clients) |
| `ma-monitoring-display` | MA > 11 > 1 | Display Config (site monitors) |

**Cấu trúc hàm:**
```typescript
export function renderTemplate(
  templateId: string,
  profile: SensorDataProfile,
  monitoring?: SensorMonitoringData,
): string {
  // switch(templateId) → render text
  // Mỗi template trả về string giống console output thật
  // Kết thúc bằng "\n\nPress RETURN to continue:"
}
```

**Ví dụ output cho `sa-network-display`:**
```
   Network Configuration:
   ─────────────────────────────────
   IP Address:      192.168.201.1
   Subnet Mask:     255.255.255.0
   Default Gateway: 192.168.201.7
   DHCP:            disabled
   MAC Address:     00:1A:2B:3C:4D:01
   NTP Server:      192.168.201.10
   Physical Int.:   eth0
   Max Bit Rate:    100 Mbit/s full duplex
```

**Ví dụ output cho `ma-system-status`:**
```
   System Status:
   ─────────────────────────────────
   Temperature:     42.5 °C
   CPU Load:        31 %
   Voltage 3.3V:    3.30 V
   Voltage 5.0V:    5.02 V
   Voltage 12.0V:   12.08 V
   GPS Status:      Synchronized
   GPS Deviation:   0.2m
   Uptime:          142d 07h 23m
```

**Ví dụ output cho `sa-clients-display`:**
```
   Surveillance Clients:
   ─────────────────────────────────────────────────────────────
   #  Name       IP              Port   Proto  Type              Enabled
   1  QCMS       192.168.201.10  20550  UDP    ASTERIX CAT21     YES
   2  Gateway    192.168.201.7   20550  UDP    ASTERIX CAT21     YES
   ─────────────────────────────────────────────────────────────
   Total: 2 clients configured
```

**Mong đợi:**
- Hàm thuần (pure function), không side effects
- Mỗi template trả text formatting đúng chuẩn monospace
- Nếu `profile` là undefined → trả text mặc định cũ (fallback)
- Unit test cho mỗi template

---

### Task A4: Tích hợp template vào terminal engine

**File:** `src/lib/terminal-engine.ts`
**Hành động:** Sửa constructor và processInput

**Thay đổi 1** — Constructor nhận thêm data:
```typescript
export interface TerminalEngineOptions {
  targetLoginUser: LoginUser;
  menus?: MenuTree;
  rootMenuId?: string;
  header?: Partial<MenuHeader>;
  sensorDataProfile?: SensorDataProfile;     // ← THÊM
  sensorMonitoring?: SensorMonitoringData;   // ← THÊM
}
```

**Thay đổi 2** — Khi gặp action type "display", kiểm tra:
- Nếu action có thêm trường `templateId` VÀ engine có `sensorDataProfile`:
  → dùng `renderTemplate(templateId, profile, monitoring)` thay cho `action.content`
- Nếu không: giữ nguyên `action.content` (backward-compatible)

**Thay đổi 3** — Mở rộng MenuAction type:
```typescript
// Trong menu-types.ts, sửa display action:
| { type: "display"; content: string; templateId?: string }
```

**Thay đổi 4** — Cập nhật sa-menus.ts và ma-menus.ts:
- Thêm `templateId` vào các display action tương ứng
- Giữ `content` cũ làm fallback
- Ví dụ:
```typescript
// SA > Network Settings > Display Network
{
  number: 1,
  label: "Display Network Settings",
  action: {
    type: "display",
    content: "Network settings:\n  IP: 10.10.10.3\n  ...",  // fallback cũ
    templateId: "sa-network-display",  // ← THÊM
  },
},
```

**Mong đợi:**
- Khi có `sensorDataProfile` → output dùng template (dữ liệu thật)
- Khi không có `sensorDataProfile` → output dùng `content` cũ
- Tất cả unit test cũ vẫn pass (backward-compatible)
- Thêm unit test mới cho template rendering

---

### Task A5: Cập nhật terminal-store và scenario flow

**File:** `src/stores/terminal-store.ts`
**Hành động:** Khi khởi tạo TerminalEngine cho student session, truyền `sensorDataProfile` từ scenario

```typescript
// Trong terminal-store, khi tạo engine cho scenario:
const targetSensor = findTargetSensor(scenario);
const engine = new TerminalEngine({
  targetLoginUser: scenario.targetLoginUser,
  sensorDataProfile: targetSensor?.dataProfile,      // ← THÊM
  sensorMonitoring: targetSensor?.monitoring,         // ← THÊM
});
```

**File:** `src/stores/default-scenarios.ts`
**Hành động:** Cập nhật 3 kịch bản mẫu, thêm 1 kịch bản Côn Sơn

```typescript
// Kịch bản mới #4:
{
  id: "seed-con-son-network",
  title: "Kiểm tra cấu hình mạng Côn Sơn",
  description: "Kiểm tra cấu hình mạng của sensor 1 tại trạm ADS-B Côn Sơn.",
  difficulty: "easy",
  sites: [
    {
      id: "con-son",
      name: "Côn Sơn",
      sensorA: {
        id: "con-son-a",
        sensorLabel: "A",
        status: "green",
        ipAddress: "192.168.201.1",
        name: "ConSon Sensor 1",
        monitoring: monitoring(),
        dataProfile: CON_SON_SENSOR_1,  // ← dùng preset
      },
      sensorB: null,
    },
  ],
  targetSensorId: "con-son-a",
  targetLoginUser: "sysadmin",
  expectedActions: buildExpectedActions("sysadmin", ["2", "1", "", "0"]),
  // SA > Network > Display Network > RETURN > Return
},
```

**Mong đợi:**
- 4 kịch bản mẫu (3 cũ + 1 Côn Sơn)
- Kịch bản Côn Sơn: khi student vào terminal → SA > 2 > 1 → hiện IP 192.168.201.1, MAC, gateway đúng

---

### Task A6: Admin form — chọn Sensor Data Preset

**File:** Admin Scenario Form (component trong `src/components/admin/`)
**Hành động:** Trong Step 2 (Sites & Sensors), khi chọn sensor:

1. Thêm dropdown "Data Profile":
   - Options: "Mặc định" | "ADS-B Côn Sơn — Sensor 1" | "ADS-B Côn Sơn — Sensor 3" | "Tùy chỉnh..."
2. Khi chọn preset → tự động fill IP, sensor name, v.v.
3. Khi chọn "Tùy chỉnh" → mở panel edit (ít nhất: IP, gateway, subnet, sensor version, GPS lat/lon)
4. Lưu `dataProfile` vào `SensorState` trong scenario

**Mong đợi:**
- Admin có thể gán preset Côn Sơn vào sensor
- Dữ liệu được lưu và load đúng trong localStorage
- Student thấy dữ liệu đúng trong terminal

---

### Task A7: Unit tests cho Module A

**File mới:** `tests/core/terminal-templates.test.ts`

Tests cần viết:
- [ ] `renderTemplate("sa-network-display", profile)` trả text chứa IP đúng
- [ ] `renderTemplate("ma-system-status", profile, monitoring)` trả temp, CPU đúng
- [ ] `renderTemplate("sa-clients-display", profile)` trả bảng clients đúng format
- [ ] `renderTemplate("unknown-id", profile)` trả fallback text
- [ ] Terminal engine với `sensorDataProfile` → display dùng template
- [ ] Terminal engine không có `sensorDataProfile` → display dùng content cũ
- [ ] Backward compatibility: 3 kịch bản mẫu cũ không bị ảnh hưởng

**Mong đợi:**
- `npm run test:run` pass, bao gồm tests mới
- `npm run typecheck` pass

---

## 4. Module B — QCMS GUI mở rộng

### Mục tiêu
Mở rộng giao diện QCMS từ chỉ có Site Monitor grid → thêm toolbar 9 nút chức năng, context menu right-click, và 6 cửa sổ/dialog mới.

---

### Task B1: QCMS Toolbar với 9 nút chức năng

**File mới:** `src/components/qcms/qcms-toolbar.tsx`

Thanh nút phía trên Site Monitor grid:
```
[MAPS] [SITES] [MET] [LOG] [REPLAY] [EXPORT] [CONF] [GEN] [EXIT]
```

Hành vi mỗi nút:

| Nút | Hành động |
|-----|-----------|
| MAPS | Disabled (hiện tooltip "Không khả dụng trong chế độ mô phỏng") |
| SITES | Active mặc định — hiện Site Monitor grid |
| MET | Disabled |
| LOG | Mở LOG Window (Task B3) |
| REPLAY | Mở Replay Dialog (Task B7) |
| EXPORT | Disabled |
| CONF | Disabled |
| GEN | Mở General Settings Dialog (Task B6) |
| EXIT | Hiện confirm dialog (mô phỏng, không thoát thật) |

**Styling:**
- Nền đậm hơn (giống QCMS thật: dark blue-grey)
- Nút active: highlighted
- Nút disabled: greyed out + tooltip

**Tích hợp:**
- Sửa `src/components/qcms/scenario-monitor-view.tsx` để đặt toolbar phía trên
- Sử dụng state management (useState hoặc Zustand) để track active panel

**Mong đợi:**
- 9 nút render đúng
- SITES active mặc định
- LOG, GEN, REPLAY mở panel/dialog tương ứng
- Nút disabled có tooltip giải thích

---

### Task B2: Right-click Context Menu trên Site

**File:** Sửa `src/components/qcms/site-item.tsx`

Khi right-click vào site name box → hiện context menu popup:
```
┌──────────────────────────┐
│ Sensor A Monitoring      │
│ Sensor A Configuration   │
│ Sensor A Status          │
│ ─────────────────────── │
│ Sensor B Monitoring      │
│ Sensor B Configuration   │
│ Sensor B Status          │
│ ─────────────────────── │
│ Site Statistics          │
│ Site Settings            │
└──────────────────────────┘
```

Hành vi:
- "Sensor X Monitoring" → mở SensorMonitoringModal hiện tại (đã có)
- "Sensor X Configuration" → mở SensorConfigWindow (Task B4)
- "Sensor X Status" → mở SensorStatusWindow (Task B5)
- "Site Statistics" → mở SiteStatisticsWindow (Task B8)
- "Site Settings" → mở SiteSettingsWindow (Task B9)
- Menu items cho sensor không tồn tại → disabled

**Styling:** Dropdown menu giống OS context menu, `bg-white border shadow-lg rounded-md`

**Mong đợi:**
- Right-click mở menu đúng vị trí (dùng onContextMenu + absolute positioning)
- Click bên ngoài hoặc Escape → đóng menu
- Menu items mở đúng dialog/window

---

### Task B3: LOG Window (Event Log)

**File mới:** `src/components/qcms/log-window.tsx`

Mô phỏng Event Log theo QCMS Manual Section 4.4:

**Dữ liệu:** Mỗi scenario có field mới `eventLog`:
```typescript
// Thêm vào Scenario interface trong types.ts:
export interface QcmsEvent {
  timestamp: string;      // "14:30:22"
  type: "snmp" | "qcms" | "selfmon" | "error" | "line";
  message: string;
}

// Trong Scenario:
eventLog?: QcmsEvent[];   // ← optional, backward-compatible
```

**UI:**
- Bảng cuộn hiển thị tối đa 1000 events
- Mỗi hàng có mã màu theo type:
  - 🔵 `snmp` → text-blue-500
  - ⚪ `qcms` → text-gray-500
  - 🟢 `selfmon` → text-green-500
  - 🔴 `error` → text-red-500
  - 🟠 `line` → text-orange-500
- Filter checkboxes per type
- Nút CLOSE

**Auto-generate events:** Nếu scenario không có `eventLog`, tự sinh events mẫu dựa trên sensor status:
```
- Sensor green → events bình thường (heartbeat OK)
- Sensor red → events lỗi (No SNMP response, Surveillance data lost)
- Sensor orange → events degraded (SNMP trap received, Temperature warning)
- Sensor yellow → events (No surveillance data, SNMP OK)
```

**Mong đợi:**
- Hiển thị events đúng color code
- Filter hoạt động (bật/tắt từng type)
- Auto-generate events nếu scenario không có field eventLog

---

### Task B4: Sensor Configuration Window

**File mới:** `src/components/qcms/sensor-config-window.tsx`

Mô phỏng QCMS Manual Section 4.2.4 (Figure 24):

**UI:** Dialog/modal lớn, hiển thị dữ liệu sensor dạng grouped panels:

| Group | Trường hiển thị |
|-------|----------------|
| Extended Control | Time of last update, REFRESH button |
| General Settings | CAT21 on/off, CRC correction, Ground targets, Overload limit |
| GPS Position | Latitude, Longitude, Altitude |
| Target Filter | Altitude min/max, Address filter, Position filter |
| ASTERIX | SAC, SIC, CAT21 version, Data block size |
| Surveillance Clients | Bảng 20 rows (id, name, ip, port, enabled) |
| SNMP Agent | Sensor name, SNMP agent name, Version |
| NTP Server | NTP server IP, sync status |

**Color code:**
- Giá trị received gần đây (< 120s): `text-black` (light mode)
- Giá trị out-dated (> 120s): `text-red-500`

**Nút:**
- REFRESH: Simulate SNMP refresh (thay đổi timestamp, giữ data)
- OPEN MAINTENANCE APPLICATION: Navigate sang terminal page
- CLOSE: Đóng window

**Data source:** Đọc từ `sensor.dataProfile` (SensorDataProfile). Nếu không có → hiện "—" cho mọi trường.

**Mong đợi:**
- Hiển thị dữ liệu grouped đúng
- Color code đúng (tất cả trường < 120s → black)
- REFRESH cập nhật timestamp
- Read-only (không cho edit — mô phỏng MONITORING mode)

---

### Task B5: Sensor Status Window (CAT 23)

**File mới:** `src/components/qcms/sensor-status-window.tsx`

Mô phỏng QCMS Manual Section 4.2.5:

**UI:**
- Danh sách status messages dạng bảng cuộn
- Cột: Time, Service, Type, Reference, Status
- Live mode indicator
- Max 1000 messages
- PAUSE / STOP / PLAY buttons (mô phỏng, toggle giữa live và paused)

**Data:** Auto-generate CAT 23 status messages dựa trên sensor monitoring data:
```
09:15:22  Service: ADS-B    Type: Status    Ref: 1    Status: OPERATIONAL
09:15:22  Service: GPS      Type: Status    Ref: 1    Status: SYNCHRONIZED
09:15:23  Service: SNMP     Type: Heartbeat Ref: 1    Status: OK
```

**Mong đợi:**
- Hiển thị status messages
- Pause/Play toggle
- Auto-scroll khi live

---

### Task B6: General Settings Dialog

**File mới:** `src/components/qcms/general-settings-dialog.tsx`

Mô phỏng QCMS Manual Section 4.8 (Figure 71):

**UI:** Dialog nhỏ read-only:
```
┌─ General Settings ─────────────────────┐
│ QCMS Version:    1-5-3                  │
│                                         │
│ Communication Settings:                 │
│   Surveillance Port: 20550 (UDP)        │
│   Weather Port:      20660 (UDP)        │
│                                         │
│ SNMP Settings:                          │
│   Cycle Time:    10 seconds             │
│   Trap Port:     20900                  │
│   Trap Community: qcms_trap             │
│                                         │
│ Viewport Settings:                      │
│   Viewport A: 8.68°N 106.60°E 400NM    │
│                                         │
│ [RESET TO DEFAULT VIEWPORTS]   [CLOSE]  │
└─────────────────────────────────────────┘
```

**Mong đợi:**
- Read-only display
- CLOSE đóng dialog

---

### Task B7: Replay Control Dialog

**File mới:** `src/components/qcms/replay-dialog.tsx`

Mô phỏng QCMS Manual Section 4.5:

**UI:**
```
┌─ Replay Control ──────────────────────────┐
│ Mode: ● ONLINE                             │
│                                            │
│ [ONLINE]  [REPLAY]                         │
│                                            │
│ Date: [2026-01-15]  Time: [14:30:00]       │
│ Speed: [1.0x ▼]                            │
│ (0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0)     │
│                                            │
│ [▶ PLAY] [⏸ PAUSE] [⏹ STOP]              │
│ [JUMP]  [NOW]                              │
│                                            │
│ Status: ⚪ Online mode                     │
│                                            │
│                              [CLOSE]       │
└────────────────────────────────────────────┘
```

**Color code status:**
- 🟢 Green: Replay playing
- 🟠 Orange: Replay paused
- 🟡 Yellow: Replay stopped
- ⚪ Grey: Online mode

**Behavior:**
- Click REPLAY → chuyển sang replay mode (controls active)
- Click ONLINE → chuyển về online mode
- PLAY/PAUSE/STOP → thay đổi status color
- Chức năng mô phỏng (không thay đổi data thật)

**Mong đợi:**
- Switch mode hoạt động
- Color code đúng
- Tất cả controls responsive

---

### Task B8: Site Statistics Window (Simplified)

**File mới:** `src/components/qcms/site-statistics-window.tsx`

Mô phỏng đơn giản QCMS Manual Section 4.2.6:

**UI:** Tab view với 4 loại:

1. **Coverage** — Bảng hiện range (NM) vs altitude band
2. **Load** — Bảng hiện message count per sector
3. **Update Rate** — Bảng hiện average update rate
4. **SAM** — Bảng hiện signal amplitude per sector

Mỗi tab:
- Hiện dữ liệu mẫu trong bảng (giả lập — không cần radial grid thật)
- "Last Reset: 2026-01-15 09:00:00"
- [RESET] button → confirm dialog → reset timestamp
- Altitude band selector (nếu có multiple bands)

**Mong đợi:**
- 4 tabs chuyển đổi được
- Dữ liệu mẫu hiển thị đúng format bảng
- Reset button có confirm

---

### Task B9: Site Settings Window

**File mới:** `src/components/qcms/site-settings-window.tsx`

Mô phỏng QCMS Manual Section 4.2.7 (Figure 32):

**UI:**
```
┌─ Site Settings: Côn Sơn ──────────────────┐
│ Site Number: 1                              │
│ Site Position:                              │
│   Latitude:  8.6833°N                       │
│   Longitude: 106.6000°E                     │
│                                             │
│ ┌─ Sensor A ────────────────────────────┐   │
│ │ IP Address: 192.168.201.1              │   │
│ │ SNMP Mode:  Active                     │   │
│ │ SNMP User:  qcms_user                  │   │
│ │ SNMP Type:  authPriv                   │   │
│ │ [REMOVE SENSOR]                        │   │
│ └────────────────────────────────────────┘   │
│                                             │
│ ┌─ Sensor B ────────────────────────────┐   │
│ │ Not configured                         │   │
│ └────────────────────────────────────────┘   │
│                                     [CLOSE] │
└─────────────────────────────────────────────┘
```

**Data source:** Đọc từ SiteState + SensorState + dataProfile

**Mong đợi:**
- Read-only display (MONITORING mode)
- REMOVE SENSOR: disabled (mô phỏng)

---

### Task B10: Tích hợp Module B vào Student flow

**File:** Sửa `src/components/qcms/scenario-monitor-view.tsx`

**Thay đổi:**
1. Thêm QcmsToolbar phía trên
2. Thêm state quản lý active panel: "sites" | "log" | "replay" | "general"
3. Render content tương ứng
4. Context menu cho site items

**File:** Sửa `src/app/student/[scenarioId]/page.tsx` (nếu cần)

**Mong đợi:**
- Flow hoàn chỉnh: Student vào scenario → thấy toolbar → click LOG → thấy events → right-click site → thấy context menu → chọn Monitoring/Config/Stats/Settings

---

### Task B11: Unit tests cho Module B

Tests cần viết:
- [ ] QcmsToolbar render đúng 9 nút
- [ ] LOG window hiển thị events đúng color
- [ ] LOG filter bật/tắt đúng type
- [ ] Auto-generate events cho sensor status
- [ ] SensorConfigWindow hiển thị dữ liệu từ dataProfile
- [ ] Context menu mở đúng dialog
- [ ] Replay dialog switch mode đúng color code

---

## 5. Module C — Mô phỏng phần cứng & cô lập sự cố

### Mục tiêu
Học viên xem sơ đồ tín hiệu phần cứng interactive, kết hợp thông tin từ QCMS + terminal để xác định component gặp sự cố.

---

### Task C1: Hardware data model

**File mới:** `src/lib/hardware-model.ts`

```typescript
export type HardwareComponentType =
  | "antenna"
  | "pre_amplifier"
  | "coax_cable"
  | "lightning_protector"
  | "sensor_unit"
  | "gps_receiver"
  | "gps_cable"
  | "power_cable_ac"
  | "power_cable_dc"
  | "lan_cable"
  | "lan_switch"
  | "site_monitor_tx"
  | "site_monitor_antenna"
  | "directional_coupler"
  | "qcms_workstation"
  | "earth_cable";

export type ComponentStatus = "ok" | "degraded" | "failed";

export interface HardwareComponent {
  id: string;
  type: HardwareComponentType;
  eplId: string;        // "AG.1", "AG.2", ...
  name: string;         // "1090 MHz Antenna"
  manufacturer: string; // "WiMo"
  specs: Record<string, string>;  // { impedance: "50Ω", maxLength: "15m" }
  position: { x: number; y: number };  // for diagram layout
  connectedTo: string[];  // IDs of connected components
}

export interface SignalPath {
  id: string;
  name: string;
  description: string;
  componentIds: string[];  // ordered from source to destination
}

export interface HardwareFaultScenario {
  id: string;
  faultyComponentId: string;
  faultType: "open" | "short" | "degraded" | "disconnected" | "overheated";
  faultDescription: string;
  
  // Auto-calculated symptoms
  expectedSensorStatus: SensorStatus;
  terminalSymptoms: string[];  // what student sees in terminal
  qcmsSymptoms: string[];     // what student sees in QCMS monitoring
  
  // For grading
  diagnosticSteps: string[];  // recommended isolation steps
}
```

**Con Son hardware preset:**
```typescript
export const CON_SON_HARDWARE: HardwareComponent[] = [
  {
    id: "antenna-1", type: "antenna", eplId: "AG.2",
    name: "1090 MHz Omni Antenna", manufacturer: "WiMo",
    specs: { gain: "6dB", frequency: "1090 MHz", type: "omni-directional" },
    position: { x: 50, y: 0 },
    connectedTo: ["preamp-1"],
  },
  {
    id: "preamp-1", type: "pre_amplifier", eplId: "AG.3",
    name: "Pre-amplifier 18dB", manufacturer: "Kuhne",
    specs: { gain: "18dB", noiseLevel: "low" },
    position: { x: 50, y: 15 },
    connectedTo: ["coax-1"],
  },
  {
    id: "coax-1", type: "coax_cable", eplId: "AG.4",
    name: "Antenna Cable", manufacturer: "Ecoflex",
    specs: { type: "Cellflex UCF78-50JA", impedance: "50Ω", maxLength: "15m" },
    position: { x: 50, y: 30 },
    connectedTo: ["lightning-1"],
  },
  // ... (tất cả components cho 1 sensor site)
];

export const CON_SON_SIGNAL_PATHS: SignalPath[] = [
  {
    id: "rf-path", name: "RF Signal Path",
    description: "1090 MHz signal from antenna to sensor receiver",
    componentIds: ["antenna-1", "preamp-1", "coax-1", "lightning-1", "sensor-1"],
  },
  {
    id: "network-path", name: "Network Path",
    description: "Ethernet from sensor to QCMS",
    componentIds: ["sensor-1", "lan-cable-1", "lan-switch", "qcms"],
  },
  {
    id: "power-path", name: "Power Path",
    description: "AC power to sensor",
    componentIds: ["power-source", "power-cable-1", "sensor-1"],
  },
  {
    id: "gps-path", name: "GPS Path",
    description: "GPS time reference",
    componentIds: ["gps-1", "gps-cable-1", "sensor-1"],
  },
];
```

**Mong đợi:**
- Data model đầy đủ cho hardware diagram
- Preset Côn Sơn hoàn chỉnh

---

### Task C2: Fault scenario definitions

**File mới:** `src/lib/fault-scenarios.ts`

10 kịch bản sự cố preset:

| # | Tên | Component lỗi | Sensor Status | Triệu chứng chính |
|---|-----|---------------|---------------|-------------------|
| 1 | Đứt cáp antenna | coax_cable | yellow hoặc red | No data, SNMP OK (yellow) hoặc No data, No SNMP (red nếu cả LAN) |
| 2 | Pre-amp hỏng | pre_amplifier | yellow → red | Signal amplitude cực thấp, dần mất data |
| 3 | Lightning protector chập | lightning_protector | yellow | No data nhưng SNMP OK |
| 4 | GPS cable lỏng | gps_cable | green (nhưng GPS unsync) | GPS: Not Synchronized, deviation tăng |
| 5 | LAN cable đứt | lan_cable | red | Không ping được, không SNMP, không data |
| 6 | Power supply fail | power_cable_ac | red | Sensor hoàn toàn mất |
| 7 | Sensor overheat | sensor_unit | orange | Temperature > 55°C, degraded performance |
| 8 | Site Monitor antenna lỗi | site_monitor_antenna | green (bình thường) | End-to-end test fail |
| 9 | Switch port lỗi | lan_switch | red (1 sensor) | 1 sensor red, sensor khác vẫn green |
| 10 | Earth cable đứt | earth_cable | green | Không triệu chứng SW, nguy hiểm khi sét |

Mỗi fault scenario cung cấp:
- `expectedSensorStatus`: sensor status hiển thị trên QCMS
- `terminalSymptoms[]`: khi vào terminal sẽ thấy gì
- `qcmsSymptoms[]`: monitoring window hiện gì bất thường
- `diagnosticSteps[]`: quy trình cô lập đúng

**Mong đợi:**
- 10 kịch bản đầy đủ
- Mỗi kịch bản có symptoms tự nhất quán với sensor status

---

### Task C3: Signal Path Diagram component

**File mới:** `src/components/hardware/signal-path-diagram.tsx`

**Approach:** Dùng HTML/CSS (flexbox/grid) thay vì SVG phức tạp:

```
┌─────────────────────────────────────────────┐
│  SIGNAL PATH DIAGRAM — Côn Sơn Sensor 1     │
│                                              │
│  ┌────────────┐                              │
│  │  🔵 Antenna │ AG.2 — WiMo 6dB            │
│  └─────┬──────┘                              │
│        │                                      │
│  ┌─────┴──────┐                              │
│  │ 🟢 Pre-amp │ AG.3 — Kuhne 18dB           │
│  └─────┬──────┘                              │
│        │ Coax cable (AG.4, max 15m)          │
│  ┌─────┴──────┐                              │
│  │ 🟢 LP     │ AG.6 — Lightning Protection  │
│  └─────┬──────┘                              │
│        │      ┌──────────┐                   │
│  ┌─────┴──────┤ 🟢 GPS   │ AG.8 — Garmin    │
│  │ 🟢 SENSOR ├──────────┘                   │
│  │  AG.1     │                              │
│  └─────┬──────┘                              │
│        │ LAN cable (AG.9, Cat.5e)            │
│  ┌─────┴──────┐                              │
│  │ 🟢 Switch │ LAN Connection Box            │
│  └─────┬──────┘                              │
│        │                                      │
│  ┌─────┴──────┐                              │
│  │ 🟢 QCMS  │ AG.22 — HP Workstation        │
│  └────────────┘                              │
└─────────────────────────────────────────────┘
```

**Hành vi:**
- Mỗi component là một card có thể click
- Màu theo status: 🟢 OK, 🟠 Degraded, 🔴 Failed
- Click component → mở panel chi tiết bên phải
- Animated dashed line giữa components (pulse effect cho signal flow)
- Khi scenario có fault → component lỗi nhấp nháy đỏ

**Mong đợi:**
- Sơ đồ hiển thị đúng topology
- Click component → hiện specs
- Responsive trên mobile (vertical layout)

---

### Task C4: Component Inspector panel

**File mới:** `src/components/hardware/component-inspector.tsx`

Panel hiển thị khi click component:
```
┌─ Component Details ──────────────────────┐
│ 🟢 Pre-amplifier 18dB                    │
│ EPL ID: AG.3                              │
│ Manufacturer: Kuhne                       │
│ Status: OK                                │
│                                           │
│ Specifications:                           │
│   Gain: 18 dB                             │
│   Noise Level: Low                        │
│   Frequency: 1090 MHz                     │
│   Connector: N-type                       │
│                                           │
│ Installation Notes:                       │
│   Mount directly on antenna N-connector.  │
│   Distance to sensor: max 15m cable.      │
│                                           │
│ Connected to:                             │
│   ↑ Antenna (AG.2)                        │
│   ↓ Coax Cable (AG.4)                     │
│                                           │
│ ☐ Mark as faulty component               │
└───────────────────────────────────────────┘
```

**Mong đợi:**
- Hiển thị specs đầy đủ
- Checkbox "Mark as faulty" cho student chọn diagnosis

---

### Task C5: Admin — Tạo kịch bản phần cứng

**File:** Sửa Admin Scenario Form

Thêm Step mới "Hardware Fault" (optional step 5):

1. Checkbox "Kịch bản có sự cố phần cứng"
2. Nếu checked → hiện signal path diagram (read-only)
3. Admin click component lỗi trên diagram
4. Chọn fault type: open / short / degraded / disconnected / overheated
5. Hệ thống tự động tính:
   - Sensor status trên QCMS
   - Terminal symptoms (auto-adjust monitoring data)
   - Diagnostic steps reference
6. Admin có thể override symptoms nếu cần

**Lưu vào Scenario:**
```typescript
// Thêm vào Scenario interface:
hardwareFault?: {
  faultyComponentId: string;
  faultType: string;
  faultDescription: string;
  hardwareLayout: HardwareComponent[];
  signalPaths: SignalPath[];
};
```

**Mong đợi:**
- Admin có thể tạo scenario phần cứng
- Sensor status auto-adjust theo fault type
- Dữ liệu lưu đúng trong localStorage

---

### Task C6: Student — Hardware diagnosis flow

**File:** Sửa student scenario page

Khi scenario có `hardwareFault`:
1. QCMS hiện sensor status bất thường (theo fault)
2. Monitoring data bất thường (temp cao, CRC 0, GPS unsync, v.v.)
3. Thêm tab/button "Sơ đồ phần cứng" bên cạnh "Mở Terminal"
4. Student mở diagram → click components → kiểm tra specs → đánh dấu component lỗi
5. "Nộp kết quả chẩn đoán" → so sánh với `hardwareFault.faultyComponentId`

**Mong đợi:**
- Flow đầy đủ: QCMS → Terminal → Diagram → Diagnosis → Submit

---

### Task C7: Grading mở rộng cho Hardware

**File:** Sửa `src/lib/grading.ts`

Thêm hàm `gradeHardwareDiagnosis`:
```typescript
export interface HardwareGradingResult {
  correctComponent: boolean;      // đúng component lỗi?
  terminalInspected: boolean;     // có vào terminal kiểm tra không?
  monitoringInspected: boolean;   // có mở monitoring window không?
  score: number;                  // 0-100
}

export function gradeHardwareDiagnosis(
  expected: { componentId: string },
  submitted: { componentId: string },
  studentActions: {
    openedTerminal: boolean;
    openedMonitoring: boolean;
    inspectedComponents: string[];
  },
): HardwareGradingResult {
  const correctComponent = expected.componentId === submitted.componentId;
  const score = [
    correctComponent ? 40 : 0,          // 40% cho đúng component
    studentActions.openedTerminal ? 20 : 0,      // 20% cho kiểm tra terminal
    studentActions.openedMonitoring ? 20 : 0,    // 20% cho kiểm tra monitoring
    studentActions.inspectedComponents.length >= 3 ? 20 : 
      studentActions.inspectedComponents.length >= 1 ? 10 : 0,  // 20% cho kiểm tra components
  ].reduce((a, b) => a + b, 0);

  return { correctComponent, terminalInspected: studentActions.openedTerminal, monitoringInspected: studentActions.openedMonitoring, score };
}
```

**Mong đợi:**
- Chấm điểm kết hợp: terminal + QCMS + hardware diagnosis
- Hiển thị kết quả rõ ràng cho student

---

### Task C8: Hardware Grading Result UI

**File mới:** `src/components/grading/hardware-grading-result.tsx`

Hiển thị kết quả cho kịch bản phần cứng:
```
┌─ Kết quả chẩn đoán phần cứng ───────────┐
│                                            │
│ ✅ Đúng component sự cố: Pre-amplifier     │
│ ✅ Đã kiểm tra terminal                    │
│ ✅ Đã kiểm tra monitoring                  │
│ ⚠️ Chỉ kiểm tra 2/5 components            │
│                                            │
│ Điểm: 90/100                               │
│                                            │
│ Giải thích:                                │
│ Pre-amplifier (AG.3) hỏng → tín hiệu RF   │
│ không được khuếch đại → sensor nhận yếu →  │
│ QCMS hiện Yellow (no data, SNMP OK)        │
│                                            │
│ [← Thử lại]              [Về danh sách]    │
└────────────────────────────────────────────┘
```

**Mong đợi:**
- Hiển thị kết quả rõ ràng
- Giải thích nguyên nhân (educational)

---

### Task C9: Unit tests cho Module C

Tests cần viết:
- [ ] Hardware model: CON_SON_HARDWARE có đủ components
- [ ] Signal paths: component IDs hợp lệ
- [ ] Fault scenarios: symptoms nhất quán với sensor status
- [ ] gradeHardwareDiagnosis: đúng component → 40 điểm
- [ ] gradeHardwareDiagnosis: sai component → 0 điểm
- [ ] gradeHardwareDiagnosis: full inspection → 100 điểm

---

## 6. Tổng hợp Tasks List

### Module A — Terminal + Dữ liệu Côn Sơn (7 tasks)

- [x] **A1** — Mở rộng types.ts: thêm SensorDataProfile + các sub-interfaces
- [x] **A2** — Tạo sensor-data-presets.ts: 2 preset Côn Sơn
- [x] **A3** — Tạo terminal-templates.ts: 17 template render functions
- [x] **A4** — Tích hợp template vào terminal-engine.ts + menu files
- [x] **A5** — Cập nhật terminal-store + default-scenarios (thêm kịch bản Côn Sơn)
- [x] **A6** — Admin form: dropdown chọn Data Profile preset
- [x] **A7** — Unit tests cho Module A

### Module B — QCMS GUI mở rộng (11 tasks)

- [x] **B1** — Tạo qcms-toolbar.tsx: 9 nút chức năng
- [x] **B2** — Right-click context menu trên site-item.tsx
- [x] **B3** — Tạo log-window.tsx: Event Log + auto-generate events
- [x] **B4** — Tạo sensor-config-window.tsx: SNMP attributes display
- [x] **B5** — Tạo sensor-status-window.tsx: CAT 23 status messages
- [x] **B6** — Tạo general-settings-dialog.tsx: read-only info
- [x] **B7** — Tạo replay-dialog.tsx: mode switch + controls
- [x] **B8** — Tạo site-statistics-window.tsx: 4 loại statistics
- [x] **B9** — Tạo site-settings-window.tsx: site/sensor config display
- [x] **B10** — Tích hợp vào scenario-monitor-view.tsx
- [x] **B11** — Unit tests cho Module B

### Module C — Phần cứng & Cô lập sự cố (9 tasks)

- [x] **C1** — Tạo hardware-model.ts: data model + Con Son preset
- [x] **C2** — Tạo fault-scenarios.ts: 10 kịch bản sự cố
- [x] **C3** — Tạo signal-path-diagram.tsx: interactive diagram
- [x] **C4** — Tạo component-inspector.tsx: detail panel
- [x] **C5** — Admin form: thêm step Hardware Fault
- [x] **C6** — Student flow: hardware diagnosis
- [x] **C7** — Mở rộng grading.ts: hardware grading
- [x] **C8** — Tạo hardware-grading-result.tsx: kết quả chẩn đoán
- [x] **C9** — Unit tests cho Module C

**Tổng: 27 tasks**

---

## 7. Quy tắc chất lượng

### 7.1 Backward Compatibility
- **KHÔNG** breaking change — mọi field mới phải optional
- 3 kịch bản mẫu cũ phải vẫn hoạt động nguyên vẹn
- Tất cả 66 unit test cũ phải pass

### 7.2 Code Quality
- TypeScript strict mode
- Tất cả component dưới 300 dòng, utility dưới 500 dòng
- Comment cho logic phức tạp
- Dùng existing patterns (Zustand stores, Phosphor Icons, Tailwind classes)

### 7.3 Styling
- Light mode mặc định (`bg-[#fafafa]`)
- Terminal luôn dark (`bg-black`)
- Sensor colors theo Table 3 QCMS Manual
- Font: Geist (UI) + Geist Mono (terminal/data)
- Border: `border-[#eaeaea]`, Card: `bg-white rounded-lg shadow-card`

### 7.4 Verification
Sau mỗi module:
```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

### 7.5 File naming
- Components: `kebab-case.tsx` (ví dụ: `log-window.tsx`)
- Libraries: `kebab-case.ts` (ví dụ: `terminal-templates.ts`)
- Tests: `kebab-case.test.ts`

### 7.6 Không cài thêm dependency
Sử dụng tech stack hiện có. Không cần thêm package mới.
Module C dùng HTML/CSS grid cho diagram, không cần React Flow hay SVG library.
