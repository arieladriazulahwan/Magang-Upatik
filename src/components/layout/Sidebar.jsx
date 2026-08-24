import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { apiRequest } from "../../services/api";

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
      },
      {
        path: "/persetujuan",
        label: "Persetujuan",
        icon: "▤",
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
  const [pendingCounts, setPendingCounts] = useState({
    verifikasi: 0,
    persetujuan: 0,
  });
  const user = getStoredUser();
  const role = String(localStorage.getItem("role") || "").toLowerCase();

  useEffect(() => {
    const fetchPendingCounts = async () => {
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
      const attendance = getItems(attendanceResult);
      const leaveRequests = getItems(leaveResult);
      const isPending = (item) => {
        const status = String(
          item.status || item.verification_status || item.approval_status || ""
        ).toLowerCase();
        return ["menunggu", "diajukan", "diproses", "pending"].includes(status);
      };

      setPendingCounts({
        verifikasi: attendance.filter(isPending).length,
        persetujuan: leaveRequests.filter(isPending).length,
      });
    };

    fetchPendingCounts();
  }, []);

  const displayName = user.name || user.full_name || "Administrator";
  const roleLabel =
    role === "super_admin"
      ? "Super Admin"
      : role === "admin_kepegawaian"
      ? "Admin Kepegawaian"
      : role === "admin_unit"
      ? "Admin Unit"
      : role === "pimpinan"
      ? "Pimpinan"
      : role === "pegawai"
      ? "Pegawai"
      : role === "developer"
      ? "Developer"
      : "Pengguna";

  const visibleRoutes = {
    admin_kepegawaian: [
      "/dashboard",
      "/monitoring",
      "/pegawai",
      "/unit",
      "/shift",
      "/verifikasi",
      "/persetujuan",
      "/laporan",
    ],
    admin_unit: [
      "/dashboard",
      "/monitoring",
      "/pegawai",
      "/unit",
      "/shift",
      "/verifikasi",
      "/persetujuan",
      "/laporan",
    ],
    pimpinan: [
      "/dashboard",
      "/monitoring",
      "/pegawai",
      "/unit",
      "/verifikasi",
      "/persetujuan",
      "/laporan",
    ],
    pegawai: ["/dashboard"],
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

  const allowedPaths = visibleRoutes[role] || visibleRoutes.pegawai;

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowedPaths.includes(item.path)),
  }));

  return (
    <aside className="sidebar">

      {/* Logo */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          KP
        </div>

        <div>
          <h2>KlikPresensi</h2>
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

                {(["/verifikasi", "/persetujuan"].includes(item.path)) && (
                  <span className="nav-badge">
                    {item.path === "/verifikasi"
                      ? pendingCounts.verifikasi
                      : pendingCounts.persetujuan}
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
