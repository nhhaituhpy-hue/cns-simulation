import type {
  HardwareFaultScenario,
  HardwareFaultType,
} from "./hardware-model";

export const CON_SON_FAULT_SCENARIOS: HardwareFaultScenario[] = [
  {
    id: "fault-antenna-cable-open",
    name: "Antenna cable open circuit",
    faultyComponentId: "coax-1",
    faultType: "open",
    faultDescription:
      "The RF coaxial cable is open between the pre-amplifier and lightning protector.",
    expectedSensorStatus: "yellow",
    terminalSymptoms: [
      "Receiver target count remains at 0",
      "Short and extended squitter counters stop increasing",
      "SNMP agent and network interface remain reachable",
      "GPS remains synchronized",
    ],
    qcmsSymptoms: [
      "Sensor status is Yellow: no surveillance data, SNMP OK",
      "Receiver confidence falls to 0 percent",
      "CAT 23 SNMP heartbeat remains OK",
    ],
    diagnosticSteps: [
      "Confirm that SNMP responds and GPS is synchronized",
      "Compare live receiver counters with a known-good sensor",
      "Measure RF signal at the sensor input",
      "Inspect and continuity-test the coaxial cable and connectors",
    ],
  },
  {
    id: "fault-preamp-degraded",
    name: "Pre-amplifier failure",
    faultyComponentId: "preamp-1",
    faultType: "degraded",
    faultDescription:
      "The antenna pre-amplifier has lost gain and its output level continues to fall.",
    expectedSensorStatus: "yellow",
    terminalSymptoms: [
      "Receiver confidence is below 10 percent",
      "Detected target count falls gradually",
      "CRC failure ratio increases",
      "SNMP and GPS remain operational",
    ],
    qcmsSymptoms: [
      "Sensor transitions from Green to Yellow",
      "Surveillance update rate is intermittent",
      "RF signal amplitude is extremely low",
    ],
    diagnosticSteps: [
      "Check receiver confidence and CRC statistics",
      "Verify DC bias voltage at the pre-amplifier",
      "Measure RF level before and after the pre-amplifier",
      "Substitute a known-good pre-amplifier",
    ],
  },
  {
    id: "fault-lightning-short",
    name: "Lightning protector short circuit",
    faultyComponentId: "lightning-1",
    faultType: "short",
    faultDescription:
      "The coaxial lightning protector has failed short after a surge event.",
    expectedSensorStatus: "yellow",
    terminalSymptoms: [
      "No ADS-B frames pass receiver validation",
      "Receiver confidence is 0 percent",
      "SNMP heartbeat and management network remain normal",
      "Input RF test level is heavily attenuated",
    ],
    qcmsSymptoms: [
      "Sensor status is Yellow: no data, SNMP OK",
      "CAT 21 output counters remain unchanged",
      "No network or power alarm is present",
    ],
    diagnosticSteps: [
      "Confirm sensor power and SNMP communication",
      "Inject a known RF test signal upstream of the protector",
      "Measure continuity from center conductor to earth",
      "Replace the lightning protector and repeat the RF test",
    ],
  },
  {
    id: "fault-gps-cable-disconnected",
    name: "Loose GPS cable",
    faultyComponentId: "gps-cable-1",
    faultType: "disconnected",
    faultDescription:
      "The GPS antenna cable connector is loose at the sensor timing input.",
    expectedSensorStatus: "green",
    terminalSymptoms: [
      "GPS state reports Not Synchronized",
      "Timing deviation increases continuously",
      "ADS-B receiver and network counters continue increasing",
      "NTP fallback may remain available",
    ],
    qcmsSymptoms: [
      "Sensor remains Green because surveillance and SNMP are available",
      "GPS field reports UNSYNCHRONIZED",
      "Timing warning appears in monitoring details",
    ],
    diagnosticSteps: [
      "Open GPS status and record satellite lock state",
      "Inspect both GPS cable connectors",
      "Measure antenna bias voltage at the sensor",
      "Reconnect and confirm timing deviation returns to normal",
    ],
  },
  {
    id: "fault-lan-cable-open",
    name: "LAN cable open circuit",
    faultyComponentId: "lan-cable-1",
    faultType: "open",
    faultDescription:
      "The Ethernet cable between the ADS-B sensor and LAN switch is open.",
    expectedSensorStatus: "red",
    terminalSymptoms: [
      "Sensor IP address does not respond to ping",
      "SSH and SNMP sessions time out",
      "QCMS receives no CAT 21 data",
      "Switch port link state is down",
    ],
    qcmsSymptoms: [
      "Sensor status is Red",
      "No SNMP response is recorded",
      "Surveillance data lost alarm is active",
    ],
    diagnosticSteps: [
      "Ping the sensor management IP",
      "Check link LEDs at the sensor and switch",
      "Inspect the switch port status",
      "Test all cable pairs and replace the LAN cable",
    ],
  },
  {
    id: "fault-power-feed-open",
    name: "Sensor power supply failure",
    faultyComponentId: "power-ac-1",
    faultType: "open",
    faultDescription:
      "The protected AC supply feeding the sensor power converter has failed.",
    expectedSensorStatus: "red",
    terminalSymptoms: [
      "Sensor is completely unreachable",
      "No front-panel indicators are illuminated",
      "No SNMP, SSH, GPS, or surveillance output is available",
      "LAN switch port reports link down",
    ],
    qcmsSymptoms: [
      "Sensor status is Red",
      "No SNMP response and no surveillance data",
      "All monitored voltages are unavailable",
    ],
    diagnosticSteps: [
      "Verify that the site UPS is online",
      "Measure AC voltage at the protected feed",
      "Check the circuit breaker and power cable continuity",
      "Restore power and verify the DC output under load",
    ],
  },
  {
    id: "fault-sensor-overheated",
    name: "Sensor unit overheated",
    faultyComponentId: "sensor-1",
    faultType: "overheated",
    faultDescription:
      "Restricted rack airflow causes the ADS-B sensor temperature to exceed 55 C.",
    expectedSensorStatus: "orange",
    terminalSymptoms: [
      "Internal temperature exceeds 55 C",
      "CPU load and CRC error rate increase",
      "Receiver performance is degraded but data continues",
      "Thermal alarm is present in self-monitoring",
    ],
    qcmsSymptoms: [
      "Sensor status is Orange",
      "Temperature warning is active",
      "Surveillance remains available with degraded confidence",
    ],
    diagnosticSteps: [
      "Read the sensor temperature and CPU load",
      "Inspect rack fans and air filters",
      "Measure ambient temperature around the sensor",
      "Restore airflow and confirm temperature decreases",
    ],
  },
  {
    id: "fault-site-monitor-antenna",
    name: "Site monitor antenna failure",
    faultyComponentId: "site-monitor-antenna-1",
    faultType: "degraded",
    faultDescription:
      "The site monitor test antenna is damaged and no longer radiates the test target.",
    expectedSensorStatus: "green",
    terminalSymptoms: [
      "Normal aircraft targets remain visible",
      "Site monitor test target is not detected",
      "Receiver, GPS, SNMP, and network status remain normal",
      "End-to-end RF self-test fails",
    ],
    qcmsSymptoms: [
      "Sensor remains Green",
      "Site monitor test reports FAILED",
      "No general surveillance loss alarm is present",
    ],
    diagnosticSteps: [
      "Confirm normal live aircraft reception",
      "Verify site monitor transmitter output",
      "Inspect the feeder and site monitor antenna",
      "Measure radiated test signal at the receive antenna",
    ],
  },
  {
    id: "fault-switch-port-degraded",
    name: "LAN switch port failure",
    faultyComponentId: "lan-switch-1",
    faultType: "degraded",
    faultDescription:
      "The switch port assigned to Sensor A has failed while other ports remain operational.",
    expectedSensorStatus: "red",
    terminalSymptoms: [
      "Sensor A is unreachable from QCMS",
      "Sensor B remains reachable and operational",
      "Failed port shows excessive errors or no link",
      "Sensor A local power indicators remain on",
    ],
    qcmsSymptoms: [
      "Only Sensor A status is Red",
      "Sensor B remains Green",
      "Sensor A has no SNMP response or surveillance data",
    ],
    diagnosticSteps: [
      "Compare Sensor A and Sensor B reachability",
      "Inspect error counters on the assigned switch port",
      "Move Sensor A temporarily to a known-good port",
      "Replace or reconfigure the failed switch port",
    ],
  },
  {
    id: "fault-earth-disconnected",
    name: "Protective earth cable disconnected",
    faultyComponentId: "earth-cable-1",
    faultType: "disconnected",
    faultDescription:
      "The protective bond from the sensor and RF entry plate to site earth is open.",
    expectedSensorStatus: "green",
    terminalSymptoms: [
      "No software alarm is generated",
      "Receiver, GPS, SNMP, and surveillance remain normal",
      "Chassis-to-earth resistance is above the approved limit",
      "Equipment is vulnerable to lightning and touch voltage",
    ],
    qcmsSymptoms: [
      "Sensor remains Green",
      "No QCMS monitoring symptom is visible",
      "Physical safety inspection is required",
    ],
    diagnosticSteps: [
      "Follow lockout and site electrical safety procedures",
      "Inspect earth lugs at equipment and the earth bar",
      "Measure protective bond resistance",
      "Repair the earth cable before returning the site to service",
    ],
  },
];

export const FAULT_SCENARIOS = CON_SON_FAULT_SCENARIOS;

export function getFaultScenario(
  faultId: string,
): HardwareFaultScenario | undefined {
  return CON_SON_FAULT_SCENARIOS.find((fault) => fault.id === faultId);
}

export function findFaultPreset(
  componentId: string,
  faultType?: HardwareFaultType,
): HardwareFaultScenario | undefined {
  return CON_SON_FAULT_SCENARIOS.find(
    (fault) =>
      fault.faultyComponentId === componentId &&
      (faultType === undefined || fault.faultType === faultType),
  );
}
