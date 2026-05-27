/**
 * Philips Hue Bridge Integration
 * Docs: https://developers.meethue.com/develop/hue-api-v2/
 * Install (not required, uses fetch): no extra package needed
 */

const HUE_BRIDGE_IP = process.env.HUE_BRIDGE_IP;
const HUE_API_KEY = process.env.HUE_API_KEY;

const BASE = () => `http://${HUE_BRIDGE_IP}/api/${HUE_API_KEY}`;

export interface HueLight {
  id: string;
  name: string;
  state: { on: boolean; bri: number; reachable: boolean };
  type: string;
}

export interface HueSensor {
  id: string;
  name: string;
  type: string;
  state: {
    presence?: boolean;      // Motion sensor
    lightlevel?: number;     // Daylight sensor
    temperature?: number;    // Temperature (× 100 = °C)
    lastupdated: string;
  };
  config: { on: boolean; reachable: boolean };
}

export async function getLights(): Promise<Record<string, HueLight>> {
  if (!HUE_BRIDGE_IP || !HUE_API_KEY) return {};
  const res = await fetch(`${BASE()}/lights`);
  return res.json();
}

export async function setLight(lightId: string, state: { on?: boolean; bri?: number; ct?: number }): Promise<void> {
  if (!HUE_BRIDGE_IP || !HUE_API_KEY) return;
  await fetch(`${BASE()}/lights/${lightId}/state`, {
    method: "PUT",
    body: JSON.stringify(state),
  });
}

export async function getSensors(): Promise<Record<string, HueSensor>> {
  if (!HUE_BRIDGE_IP || !HUE_API_KEY) return {};
  const res = await fetch(`${BASE()}/sensors`);
  return res.json();
}

export async function getMotionSensors(): Promise<HueSensor[]> {
  const sensors = await getSensors();
  return Object.values(sensors).filter(s => s.type === "ZLLPresence");
}

// Care-specific: "Gute Nacht" scene — dim all lights, reduce blue light
export async function activateBedtimeScene(): Promise<void> {
  const lights = await getLights();
  await Promise.all(
    Object.keys(lights).map(id =>
      setLight(id, { bri: 50, ct: 454 }) // warm white
    )
  );
}

// Emergency: flash all lights red 3 times
export async function triggerEmergencyFlash(): Promise<void> {
  const lights = await getLights();
  for (let i = 0; i < 3; i++) {
    await Promise.all(Object.keys(lights).map(id => setLight(id, { on: true, bri: 254, ct: 153 })));
    await new Promise(r => setTimeout(r, 500));
    await Promise.all(Object.keys(lights).map(id => setLight(id, { on: false })));
    await new Promise(r => setTimeout(r, 300));
  }
}
