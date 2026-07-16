# VOR PMDT Simulator — Hướng dẫn triển khai chi tiết

> **Mục đích:** File này chứa TẤT CẢ thông tin cần thiết để triển khai module mô phỏng giao diện phần mềm khai thác thiết bị VOR (PMDT). Đọc kỹ toàn bộ trước khi bắt đầu code.

---

## 1. NGỮ CẢNH DỰ ÁN

### 1.1 Dự án hiện tại
- **Tên:** CNS Training Simulator (Hệ thống kiểm tra mô phỏng CNS)
- **Mô tả:** Ứng dụng web mô phỏng quy trình xử lý sự cố thiết bị hàng không (ADS-B, VOR, DME) cho đào tạo kỹ thuật viên.
- **Đã có module ADS-B** hoàn chỉnh, giờ cần bổ sung module **VOR PMDT**.

### 1.2 Tech Stack (KHÔNG ĐƯỢC THAY ĐỔI)
- **Next.js 16** App Router, **React 19**, **TypeScript**
- **Tailwind CSS 4** (sử dụng `@tailwindcss/postcss`)
- **Zustand 5** cho state management
- **Phosphor Icons** (`@phosphor-icons/react`)
- **Motion** (framer-motion successor) cho animations
- **Node.js 20.9+**

### 1.3 Cấu trúc thư mục hiện tại
```
src/
  app/
    admin/
      page.tsx           ← Dashboard quản trị (có tabs VOR/DME/ADS-B)
      create/            ← Wizard tạo kịch bản ADS-B
      edit/              ← Sửa kịch bản ADS-B
      vor-pmdt/          ← [CẦN TẠO] Route preview VOR PMDT
    student/             ← Dashboard học viên
    login/               ← Đăng nhập
    layout.tsx           ← Root layout
    page.tsx             ← Landing page
    globals.css          ← Global styles
  components/
    admin/               ← Components quản trị ADS-B
      admin-dashboard.tsx ← [CẦN SỬA] Tab VOR hiện đang là placeholder
    auth/                ← Auth components
    grading/             ← Chấm điểm
    hardware/            ← Sơ đồ phần cứng ADS-B
    layout/              ← App shell
    qcms/                ← QCMS simulator ADS-B
    terminal/            ← Terminal mô phỏng ADS-B
    ui/                  ← UI components dùng chung
    vor/                 ← [CẦN TẠO] Components VOR PMDT
  lib/                   ← Types, utilities, constants
  stores/                ← Zustand stores
```

### 1.4 File admin-dashboard.tsx hiện tại (phần VOR tab)
Tab VOR hiện đang hiển thị placeholder "đang phát triển". Cần thay bằng nút mở PMDT Simulator:
```tsx
// Dòng 162-174 hiện tại — CẦN THAY THẾ
{activeTab === "vor" ? (
  <div className="mt-8 rounded-lg border border-dashed ...">
    <h3>Phân hệ mô phỏng VOR</h3>
    <p>...đang trong quá trình phát triển...</p>
  </div>
) : null}
```

---

## 2. VOR PMDT LÀ GÌ?

**PMDT** = Performance Monitoring & Diagnostic Tool — phần mềm khai thác thiết bị đài dẫn đường vô hướng sóng cực ngắn VHF (VOR) model **1150A DVOR** của **SELEX Systems Integration** (Finmeccanica).

### 2.1 Chức năng chính (từ tài liệu gốc VOR.pdf Chapter 3)
- Giám sát trạng thái thiết bị VOR từ xa/tại chỗ
- Hiển thị các tham số kỹ thuật (azimuth, modulation, deviation, RF level...)
- Cảnh báo (alarm/alert) khi tham số vượt ngưỡng
- Ghi log sự kiện alarm và maintenance alert (tối đa 100 entries mỗi loại)
- Cấu hình monitor alarm limits, transmitter parameters
- Chẩn đoán sự cố (diagnostics)
- Color coding theo tài liệu Section 3.6.8.1.1.1:
  - Green = parameter within Pre-alarm and Alarm limits
  - Yellow = secondary param exceeds pre-alarm/alarm; or primary param within pre-alarm zone
  - Red = primary parameter outside alarm limits

### 2.2 Mục tiêu mô phỏng
Chúng ta **KHÔNG** xây dựng phần mềm PMDT thật. Chúng ta xây dựng **giao diện mô phỏng** để:
1. Kỹ thuật viên tập sử dụng PMDT
2. Admin tạo kịch bản sự cố (inject dữ liệu bất thường vào giao diện)
3. Học viên nhìn PMDT mô phỏng → nhận biết sự cố → thao tác xử lý

**Trong phase này:** Chỉ tập trung **vẽ giao diện + nút bấm mô phỏng**. Tất cả dữ liệu là **hardcoded defaults** từ ảnh tham chiếu. Phase sau mới bổ sung scenario engine.

---

## 3. MÔ TẢ CHI TIẾT 17 ẢNH THAM CHIẾU

> Người triển khai không có ảnh gốc. Dưới đây là mô tả pixel-level từng ảnh để tái tạo chính xác.

### 3.1 Ảnh #1: Table 3-1 PMDT Available Functions

```
MENU STRUCTURE:
├── System
│   ├── Logon RMS
│   ├── Logoff/Disconnect
│   ├── Configuration Save
│   ├── Configuration Load
│   ├── Configuration Print
│   ├── PMDT Setup
│   ├── Print Setup
│   └── Exit PMDT
├── RMS
│   ├── Status
│   ├── Data
│   ├── Logs
│   ├── Configuration
│   ├── Commands
│   ├── Config Restore
│   └── Config Backup
├── Monitors
│   ├── Data
│   ├── Configuration
│   └── Commands
├── Monitor 1 (or 2)
│   ├── Data
│   ├── Test Results
│   ├── Fault History
│   ├── Offsets & Scale Factors
│   └── Test Signal Output (J3) → submenu:
│       ├── Integral Composite
│       ├── Standby Composite
│       ├── Test Generator
│       ├── Carrier Forward Power
│       ├── Carrier Reflected Power
│       ├── Ground Check
│       ├── Sideband 1 Reflected Power
│       └── Sideband 2 Reflected Power
├── Transmitters
│   ├── Data
│   ├── Configuration
│   └── Commands → submenu:
│       ├── Transfer →
│       ├── Transmitter 1 →
│       ├── Transmitter 2 →
│       ├── Transmitter Ident →
│       └── Hold Commutator...
├── Diagnostics
│   ├── Power Up Results
│   └── Fault Isolation
└── Info
    └── About PMDT
```

### 3.2 Ảnh #2: Main PMDT Screen (Home)
- **Title bar:** Nền xanh đậm, text "- Dual DVOR - SELEX Systems Integration Inc. PMDT", nút min/max/close
- **Menu bar:** Nền xám nhạt, 8 items: System RMS Monitors Monitor 1 Monitor 2 Transmitters Diagnostics Info
- **Left sidebar** (~170px, nền xám):
  - Connection badge: xanh lá "Connected"
  - Checkboxes: Alert, Local
  - Transmitters (Tx1/Tx2): Main(G/—), Antenna(G/—), Load(—/—), Off(—/R)
  - Monitors Integral: Normal(G), Pri Alarm(—), Sec Alarm(—), Bypass(—)
  - Monitor 1 - Antenna 1: Azimuth=0.10, 30Hz=30.3, 9960Hz=30.1, Dev=15.99, RF=0.0
- **Main area:** Logo SELEX (thay bằng ATTECH)

### 3.3 Ảnh #3: RMS Data → Maintenance Alerts/Alarms (Figure 3-10)
- Toolbar: RMS Data title + Save/Print/Next(F5)/Close(F6)/Apply(F7)/Reset(F8)
- Tabs: Maintenance Alerts/Alarms(active), Power Supply Data, Digital I/O, Temperature Data, A/D Data
- Timestamp: 01/17/11 23:33:56
- **General Alerts** (14 checkboxes): Local Mode, RMS Power Supply Data, RMS A/D Data, RMS Digital I/O Data, LCD Comm Link Failed, Test Generator Fault, LCU Bus Failure, A/C Power Failure, Sys 48 VDC PS 1/2 Failure, Transfer Relay Failure, Standby Tx on the Air, LCU Config Mismatch, Frequency Config Mismatch, Integral Monitor Mismatch
- **Monitor/AGen Alerts** (table 8×4): RMS Comm Link Failed, Integrity Test Failed, File System Fault, Backplane Switch Mismatch, Maintenance Alert, Pre-Alarm, Primary Alarm, Secondary Alarm — across Mon1, Mon2, AGen1, AGen2

### 3.4 Ảnh #4: RMS Data → Digital I/O (Figure 3-12)
- 4 panels: Digital Inputs (6 rows), Digital Outputs (5 rows), System Power Status (7 rows with G/R indicators), Tx Alerts (7 rows with G/R indicators)
- Default: Tx#1 mostly green, Tx#2 some red (Carrier VSWR, Overtemp, Overpower)

### 3.5 Ảnh #5: RMS Logs → Alarms (Figure 3-16)
- Tabs: Operational Summary, Alarms(active), Maintenance Alerts, Command Activity, Parameter Change
- Buttons: Update, Reset
- Table: Time Tag | Type | Alarm | State — max 100 entries, sample data includes Monitor 1/2, Tx Frequency Error, Az Angle, 30Hz/9960Hz Modulation, Normal/Alarm states

### 3.6 Ảnh #6: RMS Logs → Maintenance Alerts (Figure 3-17)
- Table: Time Tag | Type | Alert | State
- Types: General, Digital Input, BCPS 1/2, Monitor 1/2, Audio Gen 1
- Alerts: Local Mode, Battery Fault, Ident Modulation/Status/Code, Sideband Power Faults, Carrier Phase Error, etc.
- States: Normal / Alert

### 3.7 Ảnh #7: All Monitor Data → Integral (Figure 3-31)
- 2 columns: Monitor #1, Monitor #2 with timestamps
- 11 parameters with color-coded backgrounds (all green in default):

| Parameter | Mon #1 | Mon #2 | Unit |
|-----------|--------|--------|------|
| Azimuth | 0.10 | 0.11 | ° |
| 30 Hz Modulation | 30.3 | 30.2 | % |
| 9960 Hz Modulation | 30.1 | 28.9 | % |
| 9960 Hz Deviation | 15.99 | 15.98 | Ratio |
| RF Level | 0.0 | -0.1 | dB |
| Ident Modulation | 4.9 | 4.9 | % |
| Ident Status | Normal | Normal | — |
| Ident Code | FLR | FLR | — |
| Tx Power | 98.8 | 98.7 | Watts |
| Tx Frequency | 113.0000 | 113.0000 | MHz |
| Tx Frequency Error | 0 | -2 | ppm |

### 3.8 Ảnh #8: Sideband Antenna VSWR (Figure 3-33)
- 48 antennas (3 cols × 16 rows), all green backgrounds, VSWR values 1.00-1.36

### 3.9 Ảnh #9: Monitor Alarm Limits (Figure 3-35)
- Azimuth PreAlarm ±0.90°, Alarm ±1.00°
- Table: 7 parameters × 5 alarm columns (see Section 3 details)
- Timers: Shutdown 5.0s, Continuous Ident 17.0s, No Ident 17.0s
- Monitor Antennas config with Enable checkbox, Input Attenuation, Azimuth Angle

### 3.10 Ảnh #10: Monitor 1 Offsets and Scale Factors (Figure 3-44)
- 12 parameters × 3 columns (Integral, Standby, Test Gen/Cert)

### 3.11 Ảnh #11: Monitor 1 Menu dropdown (Figure 3-45)
- Shows Test Signal Output (J3) submenu with 8 signal options

### 3.12 Ảnh #12: Transmitter Data (Figure 3-46)
- 3 sections: Power (5 rows × Tx1/Tx2), Frequency (6 rows), VSWR (5 rows)

### 3.13 Ảnh #13: Transmitter Status Tx#1 (Figure 3-49)
- 4 alert groups: System(8+CPU), Carrier PA(7), Synthesizer(7), Sideband PA(4×4=16)
- All green except Sideband 1 Phase (red)

### 3.14 Ảnh #14: Transmitter Config Nominal (Figure 3-50)
- Audio Gen Params (6 fields), Ident (2 fields), Keyer Input (radio+checkboxes), Keyer Output

### 3.15 Ảnh #15: Transmitter Offsets & Scale Factors (Figure 3-51)
- 18 parameters × Tx#1/Tx#2 columns

### 3.16 Ảnh #16: Transmitter Commands Menu (Figure 3-52)
- Submenu: Transfer, Transmitter 1/2, Transmitter Ident, Hold Commutator

### 3.17 Ảnh #17: Hold Commutator Dialog (Figure 3-53)
- Dialog: Test Antenna spinner, Hold/Release/Close buttons

---

## 4. PHÂN LOẠI ENABLED / DISABLED

### Menu items ENABLED ✅

| Menu | Item | Screen |
|------|------|--------|
| (Home) | — | Home (ATTECH logo) |
| RMS | Data | RMS Data (tabs) |
| RMS | Logs | RMS Logs (tabs) |
| Monitors | Data | All Monitor Data (tabs) |
| Monitors | Configuration | Monitor Config (tabs) |
| Monitor 1/2 | Data | → All Monitor Data |
| Monitor 1/2 | Offsets & Scale Factors | Offsets screen |
| Monitor 1/2 | Test Signal Output (J3) | Submenu |
| Transmitters | Data | Tx Data (tabs) |
| Transmitters | Configuration | Tx Config (tabs) |
| Transmitters | Commands | Submenu (disabled sub-items) |

### Menu items DISABLED 🔒

System (ALL), RMS Status/Configuration/Commands/Config Restore/Backup, Monitors Commands, Monitor 1/2 Test Results/Fault History, Diagnostics (ALL), Info (ALL)

### Sub-tabs within screens

| Screen | ✅ Enabled | 🔒 Disabled |
|--------|----------|----------|
| RMS Data | Maint. Alerts, Digital I/O | Power Supply, Temperature, A/D |
| RMS Logs | Alarms, Maint. Alerts | Op Summary, Cmd Activity, Param Change |
| Monitor Data | Integral, SB VSWR | Notch Monitor |
| Monitor Config | Alarm Limits | General |
| Tx Data | Tx Data, Status Tx#1 | Ground Check #1/#2, Status Tx#2 |
| Tx Config | Nominal, Offsets & Scale Factors | Integral Monitor Data |

---

## 5. THIẾT KẾ GIAO DIỆN

### Color Palette (Modern Dark)
```
Base: #0a0e1a | Sidebar: #0f172a | Card: #1e293b | Menu: #1e40af
Title: gradient(#1e3a5f → #0f2847) | Status: #0f172a
Green: #22c55e | Yellow: #eab308 | Red: #ef4444 | Gray: #6b7280
Param Normal BG: #0f3a1f | Warning BG: #3a2f0f | Alarm BG: #3a0f0f
Disabled: opacity-50 + cursor-not-allowed + tooltip
```

### Quy ước
- Timestamp: **DD/MM/YYYY HH:mm:ss**
- Logo: **"A"** (red #ef4444) + **"TTECH"** (blue #1e40af) viết liền
- Toolbar buttons: Decorative only
- All inputs: read-only / disabled
- Files ≤ 300 lines
- Comments tiếng Việt
- ALL data from Zustand store (không hardcode trong JSX)

---

## 6. FILES CẦN TẠO (29 total)

```
src/lib/vor-types.ts                          ← Types
src/lib/vor-pmdt-defaults.ts                  ← Default values
src/lib/vor-menu-structure.ts                 ← Menu tree
src/stores/vor-pmdt-store.ts                  ← Zustand store
src/components/vor/pmdt-layout.tsx            ← Main shell
src/components/vor/pmdt-title-bar.tsx         ← Title bar
src/components/vor/pmdt-menu-bar.tsx          ← Menu bar
src/components/vor/pmdt-sidebar.tsx           ← Left sidebar
src/components/vor/pmdt-status-bar.tsx        ← Status bar
src/components/vor/pmdt-toolbar.tsx           ← Toolbar component
src/components/vor/screens/home-screen.tsx
src/components/vor/screens/disabled-screen.tsx
src/components/vor/screens/rms-data-layout.tsx
src/components/vor/screens/rms-maintenance-alerts.tsx
src/components/vor/screens/rms-digital-io.tsx
src/components/vor/screens/rms-logs-layout.tsx
src/components/vor/screens/rms-logs-alarms.tsx
src/components/vor/screens/rms-logs-maintenance.tsx
src/components/vor/screens/monitor-data-layout.tsx
src/components/vor/screens/monitor-integral.tsx
src/components/vor/screens/monitor-sideband-vswr.tsx
src/components/vor/screens/monitor-config-layout.tsx
src/components/vor/screens/monitor-alarm-limits.tsx
src/components/vor/screens/monitor-offsets.tsx
src/components/vor/screens/tx-data-layout.tsx
src/components/vor/screens/tx-data-main.tsx
src/components/vor/screens/tx-status.tsx
src/components/vor/screens/tx-config-layout.tsx
src/components/vor/screens/tx-config-nominal.tsx
src/components/vor/screens/tx-config-offsets.tsx
src/app/admin/vor-pmdt/page.tsx
[MODIFY] src/components/admin/admin-dashboard.tsx
```

---

## 7. VERIFICATION CHECKLIST

- [ ] `/admin/vor-pmdt` renders full PMDT simulator
- [ ] All enabled menus navigate correctly
- [ ] Disabled menus greyed + tooltip + no click
- [ ] Disabled sub-tabs greyed within screens
- [ ] Sidebar indicators correct colors
- [ ] Parameter values match defaults
- [ ] All screens match reference image layouts
- [ ] Timestamp format DD/MM/YYYY
- [ ] ATTECH logo on home screen
- [ ] `npm run typecheck` pass
- [ ] `npm run lint` pass
- [ ] `npm run build` pass

---

## 8. IMPORTANT: DATA FROM STORE

ALL displayed data MUST read from Zustand store. Default values go in `vor-pmdt-defaults.ts` and are loaded into store on init. This design allows future scenario engine to `applyOverlay()` and change any displayed value/color.
