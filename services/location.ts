export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export async function getCurrentLocation(): Promise<LocationPoint | null> {
  return null;
}
