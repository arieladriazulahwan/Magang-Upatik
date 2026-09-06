import type { AttendanceRecord, AttendanceType } from "../types/attendance";
import {
  formatWitaTime,
} from "../constants/time";
import { checkIn, checkOut } from "./api";

export async function submitAttendance(type: AttendanceType): Promise<AttendanceRecord> {
  throw new Error(
    `submitAttendance(${type}) membutuhkan foto presensi. Gunakan checkIn/checkOut dari services/api.ts.`
  );
}

export { checkIn, checkOut };

export function mapAttendanceType(type: AttendanceType) {
  return type === "masuk" ? "check-in" : "check-out";
}

export function createLocalAttendanceRecord(type: AttendanceType): AttendanceRecord {
  return {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    type,
    time: formatWitaTime(new Date(), "--:--"),
    status: "hadir",
  };
}
