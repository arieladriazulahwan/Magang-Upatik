export const me = {
  initials: "SH",
  name: "Dr. Ir. Sutomo Hadi, M.T.",
  greetingName: "Pak Sutomo",
  role: "Dekan Fakultas Teknik",
  unit: "FATEK - Teknik Sipil",
  nip: "1982 0315 2008 01 1002",
  status: "PNS",
  rank: "Pembina Tk. I / IV/b",
  category: "Dosen Tugas Tambahan",
  minWork: "240 menit / hari",
  email: "sutomo.hadi@untad.ac.id",
  phone: "0812-4455-7788",
};

export const attendanceRows = [
  { date: "30", day: "SEN", time: "07:38 - 16:10", duration: "8j 32m", status: "Hadir", mode: "WFO" },
  { date: "27", day: "JUM", time: "07:51 - 15:40", duration: "7j 49m", status: "Hadir", mode: "WFO" },
  { date: "26", day: "KAM", time: "08:12 - 16:05", duration: "7j 53m", status: "Terlambat", mode: "WFO" },
  { date: "25", day: "RAB", time: "Izin keluarga", duration: "1 hari", status: "Izin", mode: "Izin" },
  { date: "23", day: "SEN", time: "09:02 - 16:00", duration: "6j 58m", status: "Hadir", mode: "WFH" },
];

export const requests = [
  { title: "Cuti Tahunan", meta: "12-13 Jun 2026", days: "2 hari kerja", status: "Disetujui", type: "Cuti" },
  { title: "Izin Keperluan Keluarga", meta: "25 Jun 2026", days: "1 hari", status: "Menunggu", type: "Izin" },
  { title: "Work From Home", meta: "23 Jun 2026", days: "1 hari", status: "Disetujui", type: "WFH" },
  { title: "Cuti Sakit", meta: "5 Jun 2026", days: "surat dokter", status: "Disetujui", type: "Sakit" },
];

export const notifications = [
  { title: "Reza Pratama mengajukan Cuti Tahunan", desc: "Perlu persetujuan Anda - 7-8 Jul 2026", time: "09:12", unread: true },
  { title: "Anda belum absen pulang kemarin", desc: "Lengkapi jam keluar 29 Jun via koreksi atasan", time: "07:30", unread: true },
  { title: "Pengajuan WFH Anda disetujui", desc: "23 Jun 2026 - oleh Admin Kepegawaian", time: "Kemarin", unread: false },
];
