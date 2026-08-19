import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";

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

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const user = getStoredUser();
  const role = String(localStorage.getItem("role") || "admin");
  const displayName = user.name || user.full_name || user.username || "Administrator";
  const roleLabel = role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const avatar = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const fetchNotificationCount = async () => {
      const [attendanceResult, leaveResult] = await Promise.allSettled([
        apiRequest("/attendance"),
        apiRequest("/leave-requests"),
      ]);
      const getItems = (result) => {
        if (result.status !== "fulfilled") return [];
        const payload = result.value;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.items)) return payload.items;
        return [];
      };
      const isPending = (item) => ["menunggu", "diajukan", "diproses", "pending"].includes(
        String(item.status || item.verification_status || item.approval_status || "").toLowerCase()
      );
      setNotificationCount(
        getItems(attendanceResult).filter(isPending).length +
        getItems(leaveResult).filter(isPending).length
      );
    };

    fetchNotificationCount();
  }, []);

  const page =
    pageTitles[location.pathname] ||
    pageTitles["/dashboard"];

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const keyword = search.trim().toLowerCase();
    if (!keyword) return;

    const target = keyword.includes("pegawai") || keyword.includes("nip")
      ? "/pegawai"
      : keyword.includes("persetujuan") || keyword.includes("cuti")
      ? "/persetujuan"
      : keyword.includes("verifikasi") || keyword.includes("koreksi")
      ? "/verifikasi"
      : keyword.includes("unit")
      ? "/unit"
      : "/dashboard";

    navigate(target);
    setShowSearch(false);
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

        {showSearch && (
          <form className="header-search-form" onSubmit={handleSearch}>
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari pegawai, unit, atau pengajuan..."
              aria-label="Pencarian"
            />
          </form>
        )}

        <button
          className="header-button"
          onClick={() => setShowSearch((value) => !value)}
          title="Cari"
          aria-label="Buka pencarian"
        >
          ⌕
        </button>

        {/* Notification */}
        <button
          className="header-button notification"
          onClick={() => setShowNotifications((value) => !value)}
          title="Notifikasi"
          aria-label="Buka notifikasi"
        >
          ♢
          {notificationCount > 0 && <span>{notificationCount}</span>}
        </button>

        {showNotifications && (
          <div className="notification-popover">
            <strong>Notifikasi</strong>
            <p>{notificationCount > 0 ? `${notificationCount} pengajuan menunggu perhatian.` : "Tidak ada notifikasi baru."}</p>
            {notificationCount > 0 && (
              <button onClick={() => { setShowNotifications(false); navigate("/persetujuan"); }}>
                Lihat persetujuan
              </button>
            )}
          </div>
        )}

        {/* User */}
        <div className="header-profile">

          <div className="header-avatar">
            {avatar}
          </div>

          <div className="header-user-info">
            <strong>{displayName}</strong>
            <small>{roleLabel}</small>
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