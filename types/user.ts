export interface User {
  id: string;
  name: string;
  nip: string;
  unit: string;
  role: "pegawai" | "pimpinan";
}
