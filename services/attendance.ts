import type { AttendanceRecord, AttendanceType } from "../types/attendance";

export async function submitAttendance(type: AttendanceType): Promise<AttendanceRecord> {
  return {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    type,
    time: new Date().toTimeString().slice(0, 5),
    status: "hadir",
  };
}
