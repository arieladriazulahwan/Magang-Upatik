import { useCallback, useState } from "react";
import { getCurrentLocation, type LocationPoint } from "../services/location";

export function useLocation() {
  const [location, setLocation] = useState<LocationPoint | null>(null);

  const refreshLocation = useCallback(async () => {
    const nextLocation = await getCurrentLocation();
    setLocation(nextLocation);
    return nextLocation;
  }, []);

  return {
    location,
    refreshLocation,
  };
}
