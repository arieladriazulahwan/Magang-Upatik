import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getStatus = (item) =>
  String(item.status || item.attendance_status || "")
    .trim()
    .toLowerCase();

function Dashboard() {
  const [statistics, setStatistics] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activities, setActivities] = useState([]);
  const [unitBars, setUnitBars] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [faceStats, setFaceStats] = useState({ registered: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const currentDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);

        const [attendanceResult, employeesResult, unitsResult, leaveResult] = await Promise.allSettled([
          apiRequest("/attendance"),
          apiRequest("/employees"),
          apiRequest("/work-units"),
          apiRequest("/leave-requests"),
        ]);
        const attendanceResponse =
          attendanceResult.status === "fulfilled"
            ? attendanceResult.value
            : [];
        const employeesResponse =
          employeesResult.status === "fulfilled"
            ? employeesResult.value
            : [];
        const unitsResponse = unitsResult.status === "fulfilled" ? unitsResult.value : [];
        const leaveResponse = leaveResult.status === "fulfilled" ? leaveResult.value : [];
        const records = normalizeArray(attendanceResponse);
        const employees = normalizeArray(employeesResponse);
        const units = normalizeArray(unitsResponse);
        const leaveRequests = normalizeArray(leaveResponse);
        const presentStatuses = ["hadir", "terlambat", "pulang_cepat"];
        const presentCount = records.filter((item) =>
          presentStatuses.includes(getStatus(item))
        ).length;
        const lateCount = records.filter(
          (item) => getStatus(item) === "terlambat"
        ).length;
        const absentCount = records.filter((item) =>
          ["alpha", "belum_absen"].includes(getStatus(item))
        ).length;

        const registeredFaces = employees.filter((item) =>
          Number(item.face_data_count || item.face_samples || item.face_count || item.face || 0) > 0
        ).length;

        setFaceStats({ registered: registeredFaces, total: employees.length });
        setPendingApprovals(
          leaveRequests.filter((item) =>
            ["diajukan", "diproses", "menunggu", "pending"].includes(
              String(item.status || item.approval_status || "").toLowerCase()
            )
          ).slice(0, 5)
        );

        const unitMap = new Map();
        units.forEach((unit) => unitMap.set(String(unit.id), { name: unit.name, total: 0, hadir: 0, terlambat: 0, alpha: 0 }));
        employees.forEach((employee) => {
          const unitId = employee.work_unit_id || employee.workUnitId || employee.work_unit?.id;
          const key = String(unitId || employee.unit || employee.unit_kerja || "lainnya");
          if (!unitMap.has(key)) unitMap.set(key, { name: employee.unit || employee.unit_kerja || "Unit lain", total: 0, hadir: 0, terlambat: 0, alpha: 0 });
          unitMap.get(key).total += 1;
        });
        records.forEach((record) => {
          const employee = record.employee || {};
          const unitId = record.work_unit_id || employee.work_unit_id || employee.work_unit?.id;
          const unit = unitMap.get(String(unitId));
          if (!unit) return;
          const status = getStatus(record);
          if (status === "terlambat") unit.terlambat += 1;
          else if (["alpha", "belum_absen"].includes(status)) unit.alpha += 1;
          else if (presentStatuses.includes(status)) unit.hadir += 1;
        });
        setUnitBars([...unitMap.values()].filter((unit) => unit.total > 0).slice(0, 8));

        setStatistics([
          {
            title: "Total Pegawai Aktif",
            value: employees.length,
            description: "Pegawai terdaftar",
            type: "",
          },
          {
            title: "Hadir Hari Ini",
            value: presentCount,
            description: `${employees.length ? Math.round((presentCount / employees.length) * 100) : 0}% tingkat kehadiran`,
            type: "success",
          },
          {
            title: "Terlambat",
            value: lateCount,
            description: "Presensi terlambat",
            type: "warning",
          },
          {
            title: "Belum Absen",
            value: absentCount,
            description: "Perlu ditindaklanjuti",
            type: "danger",
          },
          {
            title: "Cuti & Izin",
            value: leaveRequests.length,
            description: "Total pengajuan",
            type: "purple",
          },
          {
            title: "Enrollment Wajah",
            value: `${employees.length ? Math.round((registeredFaces / employees.length) * 100) : 0}%`,
            description: `${registeredFaces} pegawai terdaftar`,
            type: "teal",
          },
        ]);

        setAttendance(
          records.slice(-6).map((item, index) => ({
            day: item.date || item.attendance_date || `Data ${index + 1}`,
            value: presentStatuses.includes(getStatus(item)) ? 100 : 0,
          }))
        );
        setActivities(
          records.slice(0, 6).map((item, index) => ({
            name:
              item.employee?.name ||
              item.employee_name ||
              item.name ||
              "Pegawai",
            activity: item.activity || item.attendance_status || getStatus(item) || "Presensi",
            time: item.check_in || item.clock_in || item.time || "-",
            status: item.status || item.attendance_status || "Tercatat",
            id: item.id || index,
          }))
        );
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);

        // Tetap kosong kalau backend belum mempunyai data
        setStatistics([]);
        setAttendance([]);
        setActivities([]);
        setUnitBars([]);
        setPendingApprovals([]);
        setFaceStats({ registered: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <AdminLayout>
      <div className="dashboard-page">

        {/* HEADER */}
        <div className="dashboard-heading">
          <div>
            <h2>Ringkasan Kehadiran</h2>

            <p>
              Statistik kehadiran pegawai Universitas Tadulako
            </p>
          </div>

          <div className="dashboard-date">
            {currentDate}
          </div>
        </div>

        {/* STATISTICS */}
        <div className="dashboard-kpis">

          {loading ? (
            <div className="dashboard-empty">
              Memuat data...
            </div>
          ) : statistics.length > 0 ? (
            statistics.map((item) => (
              <div
                className={`kpi-card ${item.type || ""}`}
                key={item.title}
              >
                <span className="kpi-title">
                  {item.title}
                </span>

                <strong className="kpi-value">
                  {item.value}
                </strong>

                <span className="kpi-detail">
                  {item.description}
                </span>
              </div>
            ))
          ) : (
            <div className="dashboard-empty">
              Belum ada data statistik.
            </div>
          )}

        </div>

        <div className="dashboard-prototype-row">
          <section className="dashboard-panel unit-attendance-panel">
            <div className="panel-header">
              <div>
                <h3>Kehadiran per Unit Kerja</h3>
                <p>Rekap hari ini berdasarkan data presensi</p>
              </div>
              <span className="live-badge">LANGSUNG</span>
            </div>
            <div className="unit-attendance-list">
              {loading ? <div className="dashboard-empty">Memuat data...</div> : unitBars.length > 0 ? unitBars.map((unit) => {
                const total = Math.max(unit.total, 1);
                return (
                  <div className="unit-attendance-item" key={unit.name}>
                    <div className="unit-attendance-label">
                      <strong>{unit.name}</strong>
                      <span>{Math.round(((unit.hadir + unit.terlambat) / total) * 100)}% · {unit.total} pegawai</span>
                    </div>
                    <div className="unit-attendance-bar">
                      <span className="unit-hadir" style={{ width: `${(unit.hadir / total) * 100}%` }} />
                      <span className="unit-terlambat" style={{ width: `${(unit.terlambat / total) * 100}%` }} />
                      <span className="unit-alpha" style={{ width: `${(unit.alpha / total) * 100}%` }} />
                    </div>
                  </div>
                );
              }) : <div className="dashboard-empty">Belum ada data per unit.</div>}
            </div>
          </section>

          <section className="dashboard-panel activity-feed-panel">
            <div className="panel-header">
              <div>
                <h3>Aktivitas Presensi Terkini</h3>
                <p>Terverifikasi wajah dan lokasi</p>
              </div>
              <span className="live-badge">LANGSUNG</span>
            </div>
            <div className="dashboard-feed">
              {activities.slice(0, 5).map((item) => (
                <div className="dashboard-feed-item" key={`${item.name}-${item.time}-${item.id}`}>
                  <div className="dashboard-feed-avatar">{item.name.charAt(0)}</div>
                  <div className="dashboard-feed-main">
                    <strong>{item.name}</strong>
                    <span>{item.activity}</span>
                  </div>
                  <time>{item.time}</time>
                </div>
              ))}
              {!loading && activities.length === 0 && <div className="dashboard-empty">Belum ada aktivitas.</div>}
            </div>
          </section>
        </div>

        <div className="dashboard-prototype-row three-columns">
          <section className="dashboard-panel trend-panel">
            <div className="panel-header">
              <div><h3>Tren Kehadiran</h3><p>7 hari terakhir</p></div>
              <strong className="trend-value">{statistics[0]?.value ? `${Math.round((statistics[1]?.value / statistics[0].value) * 100)}%` : "0%"}</strong>
            </div>
            <div className="trend-bars">
              {attendance.slice(-7).map((item, index) => (
                <div className="trend-bar-column" key={`${item.day}-${index}`}>
                  <span style={{ height: `${Math.max(item.value, 8)}%` }} />
                  <small>{String(item.day).slice(-5)}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-panel face-panel">
            <div className="panel-header"><div><h3>Enrollment Wajah</h3><p>Cakupan data biometrik</p></div></div>
            <div className="face-progress">
              <div className="face-ring" style={{ "--face-progress": `${faceStats.total ? (faceStats.registered / faceStats.total) * 100 : 0}%` }}>
                <strong>{faceStats.total ? Math.round((faceStats.registered / faceStats.total) * 100) : 0}%</strong>
                <small>CAKUPAN</small>
              </div>
              <div className="face-counts"><span>Terdaftar <b>{faceStats.registered}</b></span><span>Belum <b>{Math.max(faceStats.total - faceStats.registered, 0)}</b></span></div>
            </div>
          </section>

          <section className="dashboard-panel pending-panel">
            <div className="panel-header"><div><h3>Menunggu Persetujuan</h3><p>Pengajuan terbaru</p></div><span className="pending-count">{pendingApprovals.length}</span></div>
            <div className="pending-list">
              {pendingApprovals.slice(0, 4).map((item, index) => <div className="pending-item" key={item.id || index}><strong>{item.employee?.name || item.employee_name || item.name || "Pegawai"}</strong><span>{item.type || item.category || "Pengajuan"}</span></div>)}
              {!loading && pendingApprovals.length === 0 && <div className="dashboard-empty">Tidak ada pengajuan baru.</div>}
            </div>
          </section>
        </div>

        {/* MAIN GRID */}
        <div className="dashboard-grid">

          {/* TREND KEHADIRAN */}
          <section className="dashboard-panel">

            <div className="panel-header">
              <div>
                <h3>Tren Kehadiran</h3>

                <p>
                  Persentase kehadiran
                </p>
              </div>

              <select className="period-select">
                <option>6 Hari</option>
                <option>1 Bulan</option>
                <option>3 Bulan</option>
              </select>
            </div>

            <div className="attendance-chart">

              {loading ? (
                <div className="dashboard-empty">
                  Memuat data...
                </div>
              ) : attendance.length > 0 ? (
                attendance.map((item) => (
                  <div
                    className="chart-column"
                    key={item.day}
                  >
                    <span className="chart-value">
                      {item.value}%
                    </span>

                    <div className="chart-bar-wrapper">
                      <div
                        className="chart-bar"
                        style={{
                          height: `${item.value * 2.2}px`,
                        }}
                      />
                    </div>

                    <span className="chart-label">
                      {item.day}
                    </span>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty">
                  Belum ada data kehadiran.
                </div>
              )}

            </div>

          </section>

          {/* STATUS KEHADIRAN */}
          <section className="dashboard-panel">

            <div className="panel-header">
              <div>
                <h3>Status Kehadiran</h3>

                <p>
                  Kondisi presensi hari ini
                </p>
              </div>
            </div>

            <div className="attendance-status">

              {statistics.length > 0 ? (
                statistics.map((item) => (
                  <div
                    className="status-item"
                    key={item.title}
                  >
                    <div>
                      <span
                        className={`status-dot ${item.type || ""}`}
                      />

                      <span>
                        {item.title}
                      </span>
                    </div>

                    <strong>
                      {item.value}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty">
                  Belum ada data status kehadiran.
                </div>
              )}

            </div>

          </section>

        </div>

        {/* AKTIVITAS */}
        <section className="dashboard-panel activity-panel">

          <div className="panel-header">

            <div>
              <h3>Aktivitas Terbaru</h3>

              <p>
                Aktivitas presensi dan pengajuan terbaru
              </p>
            </div>

            <button className="view-all">
              Lihat Semua
            </button>

          </div>

          <div className="activity-table">

            <div className="activity-header">
              <span>Pegawai</span>
              <span>Aktivitas</span>
              <span>Waktu</span>
              <span>Status</span>
            </div>

            {loading ? (
              <div className="dashboard-empty">
                Memuat data...
              </div>
            ) : activities.length > 0 ? (
              activities.map((item) => (
                <div
                  className="activity-row"
                  key={`${item.name}-${item.time}`}
                >
                  <strong>
                    {item.name}
                  </strong>

                  <span>
                    {item.activity}
                  </span>

                  <span>
                    {item.time}
                  </span>

                  <span>
                    <b
                      className={`activity-status ${
                        item.status
                          ?.toLowerCase()
                          .replace(/\s+/g, "-") || ""
                      }`}
                    >
                      {item.status}
                    </b>
                  </span>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">
                Belum ada aktivitas.
              </div>
            )}

          </div>

        </section>

      </div>
    </AdminLayout>
  );
}

export default Dashboard;