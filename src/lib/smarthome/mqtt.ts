/**
 * MQTT Bridge for IoT care devices (bed sensors, door contacts, wearables)
 * Install: npm install mqtt (note in file but don't run)
 */

export interface MQTTEvent {
  topic: string;
  payload: string;
  timestamp: Date;
  deviceId: string;
}

export interface BedSensorData {
  inBed: boolean;
  weight?: number;
  restlessness?: number; // 0-100
  timestamp: Date;
}

export interface DoorContactData {
  open: boolean;
  doorId: string;
  timestamp: Date;
}

// Topic patterns for xcare devices
export const MQTT_TOPICS = {
  BED_SENSOR: "xcare/+/bed",
  DOOR_CONTACT: "xcare/+/door",
  WEARABLE_FALL: "xcare/+/fall",
  WEARABLE_HEART: "xcare/+/heartrate",
  EMERGENCY_BUTTON: "xcare/+/emergency",
} as const;

// Parse incoming MQTT messages
export function parseBedSensor(payload: string): BedSensorData | null {
  try {
    const data = JSON.parse(payload);
    return {
      inBed: Boolean(data.in_bed ?? data.presence),
      weight: data.weight_kg,
      restlessness: data.restlessness,
      timestamp: new Date(data.ts || Date.now()),
    };
  } catch {
    return null;
  }
}

export function parseDoorContact(payload: string, doorId: string): DoorContactData | null {
  try {
    const data = JSON.parse(payload);
    return {
      open: Boolean(data.open ?? data.state === "open"),
      doorId,
      timestamp: new Date(data.ts || Date.now()),
    };
  } catch {
    return null;
  }
}

// MQTT connection config (for server-side usage with mqtt package)
export const mqttConfig = {
  brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  options: {
    clientId: `xcare-bridge-${Math.random().toString(16).slice(2, 8)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clean: true,
    reconnectPeriod: 5000,
  },
};
