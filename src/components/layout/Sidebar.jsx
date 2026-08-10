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

function Sidebar() {
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

        {navGroups.map((group) => (
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
          <strong>Administrator</strong>
          <span>Super Admin</span>
        </div>

        <span className="user-more">
          ⋮
        </span>

      </div>

    </aside>
  );
}

export default Sidebar;