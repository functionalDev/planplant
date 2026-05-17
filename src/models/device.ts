export interface Device {
  deviceId: string;
  displayName: string;
  createdAt: Date;
}

export function createDevice(overrides?: Partial<Device>): Device {
  const id = crypto.randomUUID();
  const number = Math.floor(Math.random() * 9000) + 1000;
  return {
    deviceId: id,
    displayName: `Garden Explorer #${number}`,
    createdAt: new Date(),
    ...overrides,
  };
}
