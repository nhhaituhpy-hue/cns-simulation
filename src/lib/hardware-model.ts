import type { SensorStatus } from "./types";

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
export type HardwareFaultType =
  | "open"
  | "short"
  | "degraded"
  | "disconnected"
  | "overheated";

export interface HardwareComponent {
  id: string;
  type: HardwareComponentType;
  eplId: string;
  name: string;
  manufacturer: string;
  specs: Record<string, string>;
  installationNotes?: string[];
  position: { x: number; y: number };
  connectedTo: string[];
  status: ComponentStatus;
}

export interface SignalPath {
  id: string;
  name: string;
  description: string;
  componentIds: string[];
}

export interface HardwareFaultScenario {
  id: string;
  name: string;
  faultyComponentId: string;
  faultType: HardwareFaultType;
  faultDescription: string;
  expectedSensorStatus: SensorStatus;
  terminalSymptoms: string[];
  qcmsSymptoms: string[];
  diagnosticSteps: string[];
}

export const CON_SON_HARDWARE: HardwareComponent[] = [
  {
    id: "antenna-1",
    type: "antenna",
    eplId: "AG.2",
    name: "1090 MHz Omni Antenna",
    manufacturer: "WiMo",
    specs: {
      gain: "6 dB",
      frequency: "1090 MHz",
      pattern: "Omni-directional",
      impedance: "50 Ohm",
      connector: "N-type female",
    },
    installationNotes: [
      "Mount vertically with an unobstructed horizon.",
      "Bond the mounting bracket to the site earth.",
    ],
    position: { x: 18, y: 4 },
    connectedTo: ["preamp-1"],
    status: "ok",
  },
  {
    id: "preamp-1",
    type: "pre_amplifier",
    eplId: "AG.3",
    name: "Pre-amplifier 18 dB",
    manufacturer: "Kuhne",
    specs: {
      gain: "18 dB",
      noiseFigure: "< 1.0 dB",
      frequency: "1090 MHz",
      connector: "N-type",
      supply: "12 VDC via bias tee",
    },
    installationNotes: [
      "Mount directly below the antenna connector.",
      "Keep the amplified cable run below 15 m.",
    ],
    position: { x: 18, y: 18 },
    connectedTo: ["coax-1"],
    status: "ok",
  },
  {
    id: "coax-1",
    type: "coax_cable",
    eplId: "AG.4",
    name: "Antenna Coaxial Cable",
    manufacturer: "Ecoflex",
    specs: {
      model: "Cellflex UCF78-50JA",
      impedance: "50 Ohm",
      maxLength: "15 m",
      connector: "N-type male",
    },
    installationNotes: [
      "Maintain the specified minimum bend radius.",
      "Weather-seal both external connectors.",
    ],
    position: { x: 18, y: 32 },
    connectedTo: ["coupler-1"],
    status: "ok",
  },
  {
    id: "coupler-1",
    type: "directional_coupler",
    eplId: "AG.5",
    name: "RF Directional Coupler",
    manufacturer: "Mini-Circuits",
    specs: {
      frequency: "950-1200 MHz",
      coupling: "20 dB",
      insertionLoss: "< 0.5 dB",
      impedance: "50 Ohm",
    },
    installationNotes: [
      "Observe the RF input and output direction marks.",
      "Terminate the coupled port when test equipment is absent.",
    ],
    position: { x: 18, y: 46 },
    connectedTo: ["lightning-1", "site-monitor-tx-1"],
    status: "ok",
  },
  {
    id: "lightning-1",
    type: "lightning_protector",
    eplId: "AG.6",
    name: "Coaxial Lightning Protector",
    manufacturer: "PolyPhaser",
    specs: {
      frequency: "DC-3 GHz",
      impedance: "50 Ohm",
      connector: "N-type",
      protection: "Gas discharge tube",
    },
    installationNotes: [
      "Bond directly to the entry earth bar.",
      "Inspect after every known lightning event.",
    ],
    position: { x: 18, y: 60 },
    connectedTo: ["sensor-1", "earth-cable-1"],
    status: "ok",
  },
  {
    id: "sensor-1",
    type: "sensor_unit",
    eplId: "AG.1",
    name: "Quadrant ADS-B Sensor Unit",
    manufacturer: "Thales",
    specs: {
      receiver: "1090 MHz ADS-B",
      output: "ASTERIX CAT21",
      management: "SNMPv3 / SSH",
      supply: "12 VDC",
      enclosure: "19-inch rack unit",
    },
    installationNotes: [
      "Install in the conditioned equipment rack.",
      "Verify RF, GPS, LAN, power, and earth before energizing.",
    ],
    position: { x: 50, y: 60 },
    connectedTo: ["lan-cable-1", "site-monitor-tx-1", "earth-cable-1"],
    status: "ok",
  },
  {
    id: "gps-1",
    type: "gps_receiver",
    eplId: "AG.8",
    name: "GPS Timing Antenna",
    manufacturer: "Garmin",
    specs: {
      bands: "GPS L1",
      output: "NMEA / PPS",
      accuracy: "< 100 ns",
      mounting: "Outdoor mast",
    },
    installationNotes: [
      "Provide a clear sky view.",
      "Keep separation from the 1090 MHz antenna.",
    ],
    position: { x: 50, y: 18 },
    connectedTo: ["gps-cable-1"],
    status: "ok",
  },
  {
    id: "gps-cable-1",
    type: "gps_cable",
    eplId: "AG.7",
    name: "GPS Antenna Cable",
    manufacturer: "Times Microwave",
    specs: {
      model: "LMR-400",
      impedance: "50 Ohm",
      maxLength: "30 m",
      connector: "TNC",
    },
    installationNotes: [
      "Do not route in parallel with AC power cables.",
      "Weather-seal the outdoor connector.",
    ],
    position: { x: 50, y: 38 },
    connectedTo: ["sensor-1"],
    status: "ok",
  },
  {
    id: "power-ac-1",
    type: "power_cable_ac",
    eplId: "AG.10",
    name: "230 VAC Power Feed",
    manufacturer: "Lapp",
    specs: {
      voltage: "230 VAC",
      conductors: "3 x 2.5 mm2",
      protection: "6 A circuit breaker",
      source: "Site UPS",
    },
    installationNotes: [
      "Isolate the circuit before maintenance.",
      "Verify protective earth continuity.",
    ],
    position: { x: 76, y: 18 },
    connectedTo: ["power-dc-1"],
    status: "ok",
  },
  {
    id: "power-dc-1",
    type: "power_cable_dc",
    eplId: "AG.11",
    name: "12 VDC Sensor Harness",
    manufacturer: "Phoenix Contact",
    specs: {
      voltage: "12 VDC",
      current: "5 A maximum",
      polarity: "Center positive",
      connector: "Locking DC",
    },
    installationNotes: [
      "Check polarity before connecting the sensor.",
      "Measure voltage under load.",
    ],
    position: { x: 76, y: 40 },
    connectedTo: ["sensor-1"],
    status: "ok",
  },
  {
    id: "lan-cable-1",
    type: "lan_cable",
    eplId: "AG.9",
    name: "Sensor Ethernet Cable",
    manufacturer: "Siemon",
    specs: {
      category: "Cat.5e F/UTP",
      speed: "100 Mbps",
      maxLength: "100 m",
      connector: "RJ45",
    },
    installationNotes: [
      "Maintain shield continuity at the rack end.",
      "Test all pairs after termination.",
    ],
    position: { x: 50, y: 74 },
    connectedTo: ["lan-switch-1"],
    status: "ok",
  },
  {
    id: "lan-switch-1",
    type: "lan_switch",
    eplId: "AG.21",
    name: "LAN Connection Box",
    manufacturer: "Hirschmann",
    specs: {
      ports: "8 x 10/100Base-TX",
      management: "SNMP",
      redundancy: "RSTP",
      supply: "24 VDC",
    },
    installationNotes: [
      "Use the assigned sensor VLAN.",
      "Label the sensor and QCMS ports.",
    ],
    position: { x: 50, y: 86 },
    connectedTo: ["qcms-1"],
    status: "ok",
  },
  {
    id: "qcms-1",
    type: "qcms_workstation",
    eplId: "AG.22",
    name: "QCMS Workstation",
    manufacturer: "HP",
    specs: {
      role: "Site monitoring and control",
      operatingSystem: "Linux",
      surveillancePort: "20550 UDP",
      trapPort: "20900 UDP",
    },
    installationNotes: [
      "Connect to the operational management VLAN.",
      "Synchronize time with the site NTP server.",
    ],
    position: { x: 50, y: 98 },
    connectedTo: [],
    status: "ok",
  },
  {
    id: "site-monitor-tx-1",
    type: "site_monitor_tx",
    eplId: "AG.15",
    name: "Site Monitor Test Transmitter",
    manufacturer: "Thales",
    specs: {
      frequency: "1090 MHz",
      outputPower: "-20 dBm",
      mode: "Periodic test target",
      control: "QCMS",
    },
    installationNotes: [
      "Verify the programmed test target address.",
      "Do not enable during RF maintenance.",
    ],
    position: { x: 4, y: 60 },
    connectedTo: ["site-monitor-antenna-1"],
    status: "ok",
  },
  {
    id: "site-monitor-antenna-1",
    type: "site_monitor_antenna",
    eplId: "AG.16",
    name: "Site Monitor Antenna",
    manufacturer: "WiMo",
    specs: {
      frequency: "1090 MHz",
      gain: "3 dB",
      pattern: "Directional",
      connector: "N-type",
    },
    installationNotes: [
      "Aim toward the ADS-B receiving antenna.",
      "Maintain the approved test distance.",
    ],
    position: { x: 4, y: 78 },
    connectedTo: [],
    status: "ok",
  },
  {
    id: "earth-cable-1",
    type: "earth_cable",
    eplId: "AG.12",
    name: "Protective Earth Cable",
    manufacturer: "Lapp",
    specs: {
      conductor: "16 mm2 copper",
      color: "Green/yellow",
      termination: "Crimped lug",
      destination: "Site earth bar",
    },
    installationNotes: [
      "Measure bond resistance after installation.",
      "Never disconnect while equipment is energized.",
    ],
    position: { x: 76, y: 72 },
    connectedTo: [],
    status: "ok",
  },
];

export const CON_SON_SIGNAL_PATHS: SignalPath[] = [
  {
    id: "rf-path",
    name: "RF Signal Path",
    description: "1090 MHz signal from antenna to sensor receiver",
    componentIds: [
      "antenna-1",
      "preamp-1",
      "coax-1",
      "coupler-1",
      "lightning-1",
      "sensor-1",
    ],
  },
  {
    id: "network-path",
    name: "Network Path",
    description: "Ethernet surveillance and management path from sensor to QCMS",
    componentIds: ["sensor-1", "lan-cable-1", "lan-switch-1", "qcms-1"],
  },
  {
    id: "power-path",
    name: "Power Path",
    description: "Protected AC feed and DC harness to the sensor",
    componentIds: ["power-ac-1", "power-dc-1", "sensor-1"],
  },
  {
    id: "gps-path",
    name: "GPS Path",
    description: "GPS time reference to the sensor",
    componentIds: ["gps-1", "gps-cable-1", "sensor-1"],
  },
  {
    id: "site-monitor-path",
    name: "Site Monitor Test Path",
    description: "End-to-end test signal generated by the site monitor",
    componentIds: ["site-monitor-tx-1", "site-monitor-antenna-1"],
  },
  {
    id: "earth-path",
    name: "Protective Earth Path",
    description: "Protective bonding from RF entry and sensor to site earth",
    componentIds: ["lightning-1", "earth-cable-1"],
  },
];

export function getHardwareComponent(
  componentId: string,
  components: readonly HardwareComponent[] = CON_SON_HARDWARE,
): HardwareComponent | undefined {
  return components.find((component) => component.id === componentId);
}

export function validateSignalPaths(
  components: readonly HardwareComponent[],
  signalPaths: readonly SignalPath[],
): boolean {
  const componentIds = new Set(components.map((component) => component.id));
  return signalPaths.every(
    (path) =>
      path.componentIds.length > 1 &&
      path.componentIds.every((componentId) => componentIds.has(componentId)),
  );
}
