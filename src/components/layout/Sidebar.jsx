import { NavLink } from "react-router-dom";

const navGroups = [
  {
    title: "UTAMA",
    items: [
      {
        path: "/dashboard",
        label: "Dashboard",
        icon: "▦",
      },
      {
        path: "/monitoring",
        label: "Monitoring Kehadiran",
        icon: "⌁",
      },
    ],
  },
  {
    title: "MANAJEMEN",
    items: [
      {
        path: "/pegawai",
        label: "Manajemen Pegawai",
        icon: "♙",
      },
      {
        path: "/unit",
        label: "Unit Kerja",
        icon: "▥",
      },
      {
        path: "/shift",
        label: "Shift & Jadwal",
        icon: "□",
      },
    ],
  },
  {
    title: "PENGAJUAN",
    items: [
      {
        path: "/verifikasi",
        label: "Verifikasi & Koreksi",
        icon: "✓",
        badge: "12",
      },
      {
        path: "/persetujuan",
        label: "Persetujuan",
        icon: "▤",
        badge: "5",
      },
    ],
  },
  {
    title: "LAPORAN",
    items: [
      {
        path: "/laporan",
        label: "Rekap & Ekspor",
        icon: "▥",
      },
    ],
  },
  {
    title: "SISTEM",
    items: [
      {
        path: "/siga8",
        label: "Pemetaan SIGA8",
        icon: "↔",
      },
      {
        path: "/geofence",
        label: "Lokasi & Geofence",
        icon: "⌖",
      },
      {
        path: "/kalender",
        label: "Google Calendar",
        icon: "□",
      },
      {
        path: "/pengaturan",
        label: "Pengaturan",
        icon: "⚙",
      },
    ],
  },
];

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Gagal membaca user dari localStorage:", error);
    return {};
  }
}

function Sidebar() {
  const user = getStoredUser();
  const role = String(localStorage.getItem("role") || "").toLowerCase();

  const displayName = user.name || user.full_name || "Administrator";
  const roleLabel =
    role === "super_admin"
      ? "Super Admin"
      : role === "developer"
      ? "Developer"
      : "Admin";

  const visibleRoutes = {
    admin: [
      "/dashboard",
      "/monitoring",
      "/pegawai",
      "/unit",
      "/shift",
      "/verifikasi",
      "/persetujuan",
      "/laporan",
    ],
    super_admin: [
      "/dashboard",
      "/monitoring",
      "/pegawai",
      "/unit",
      "/shift",
      "/verifikasi",
      "/persetujuan",
      "/laporan",
      "/siga8",
      "/geofence",
      "/kalender",
      "/pengaturan",
    ],
    developer: [
      "/dashboard",
      "/monitoring",
      "/pegawai",
      "/unit",
      "/shift",
      "/verifikasi",
      "/persetujuan",
      "/laporan",
      "/siga8",
      "/geofence",
      "/kalender",
      "/pengaturan",
    ],
  };

  const allowedPaths = visibleRoutes[role] || visibleRoutes.admin;

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowedPaths.includes(item.path)),
  }));

  return (
    <aside className="sidebar">

      {/* Logo */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          U
        </div>

        <div>
          <h2>SI-PRESENSI</h2>
          <span>UNIVERSITAS TADULAKO</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">

        {filteredGroups.map((group) => (
          <div
            className="nav-group"
            key={group.title}
          >
            <div className="nav-group-title">
              {group.title}
            </div>

            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <span className="nav-icon">
                  {item.icon}
                </span>

                <span className="nav-label">
                  {item.label}
                </span>

                {item.badge && (
                  <span className="nav-badge">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

      </nav>

      {/* User */}
      <div className="sidebar-user">

        <div className="sidebar-user-avatar">
          A
        </div>

        <div className="sidebar-user-info">
          <strong>{displayName}</strong>
          <span>{roleLabel}</span>
        </div>

        <span className="user-more">
          ⋮
        </span>

      </div>

    </aside>
  );
}

export default Sidebar;