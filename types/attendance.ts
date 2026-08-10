export type AttendanceType = "masuk" | "pulang";
export type AttendanceStatus = "hadir" | "terlambat" | "izin" | "cuti" | "alpha";

export interface AttendanceRecord {
  id: string;
  date: string;
  type: AttendanceType;
  time: string;
  status: AttendanceStatus;
}
