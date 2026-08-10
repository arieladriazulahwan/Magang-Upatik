import { useLocation, useNavigate } from "react-router-dom";

const pageTitles = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Beranda · Ringkasan kehadiran universitas",
  },

  "/monitoring": {
    title: "Monitoring Kehadiran",
    subtitle: "Pemantauan · Presensi real-time hari ini",
  },

  "/pegawai": {
    title: "Manajemen Pegawai",
    subtitle: "Manajemen · Master data & enrollment wajah",
  },

  "/unit": {
    title: "Unit Kerja",
    subtitle: "Manajemen · Struktur organisasi & mode kerja",
  },

  "/shift": {
    title: "Shift & Jadwal",
    subtitle: "Manajemen · Penjadwalan shift RS Pendidikan",
  },

  "/verifikasi": {
    title: "Verifikasi & Koreksi",
    subtitle: "Pengajuan · Koreksi presensi & presensi manual",
  },

  "/persetujuan": {
    title: "Persetujuan",
    subtitle: "Pengajuan · Cuti, izin, lembur, WFH & dinas",
  },

  "/laporan": {
    title: "Rekap & Ekspor",
    subtitle: "Laporan · Rekapitulasi kehadiran & ekspor",
  },

  "/siga8": {
    title: "Pemetaan SIGA8",
    subtitle: "Sistem · Integrasi SSO & sinkronisasi data",
  },

  "/geofence": {
    title: "Lokasi & Geofence",
    subtitle: "Sistem · Titik presensi & radius geofence",
  },

  "/kalender": {
    title: "Google Calendar",
    subtitle: "Sistem · Sinkronisasi hari libur nasional",
  },

  "/pengaturan": {
    title: "Pengaturan",
    subtitle: "Sistem · Parameter presensi & keamanan",
  },
};

function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const page =
    pageTitles[location.pathname] ||
    pageTitles["/dashboard"];

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  return (
    <header className="header">

      <div className="header-left">

        <div className="breadcrumb">
          Universitas Tadulako
          <span>/</span>
          SI-PRESENSI
        </div>

        <h1>{page.title}</h1>

        <p>{page.subtitle}</p>

      </div>

      <div className="header-right">

        {/* Search */}
        <button className="header-button">
          ⌕
        </button>

        {/* Notification */}
        <button className="header-button notification">
          ♢
          <span>3</span>
        </button>

        {/* User */}
        <div className="header-profile">

          <div className="header-avatar">
            A
          </div>

          <div className="header-user-info">
            <strong>Administrator</strong>
            <small>Super Admin</small>
          </div>

          <button
            className="profile-menu"
            onClick={handleLogout}
            title="Logout"
          >
            ⇥
          </button>

        </div>

      </div>

    </header>
  );
}

export default Header;