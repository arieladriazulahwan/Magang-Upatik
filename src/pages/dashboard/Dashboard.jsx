import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { getEmployees } from "../../services/pegawaiService";
import { hasFaceEnrollment } from "../../utils/faceData";

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

const toDateKey = (date) => {
  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) return "";

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const getRecordDateKey = (record) =>
  String(record.date || record.attendance_date || record.created_at || "").slice(0, 10);

function Dashboard() {
  const [statistics, setStatistics] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [statusSummary, setStatusSummary] = useState({
    hadir: 0,
    terlambat: 0,
    alpha: 0,
    izin: 0,
    total: 0,
  });
  const [activities, setActivities] = useState([]);
  const [unitBars, setUnitBars] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [faceStats, setFaceStats] = useState({ registered: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const currentDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
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
          getEmployees(),
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
        const todayKey = toDateKey(new Date());
        const todayRecords = records.filter((record) => getRecordDateKey(record) === todayKey);
        const presentStatuses = ["hadir", "terlambat", "pulang_cepat"];
        const presentCount = todayRecords.filter((item) =>
          presentStatuses.includes(getStatus(item))
        ).length;
        const lateCount = todayRecords.filter(
          (item) => getStatus(item) === "terlambat"
        ).length;
        const absentCount = todayRecords.filter((item) =>
          ["alpha", "belum_absen"].includes(getStatus(item))
        ).length;
        const izinCount = todayRecords.filter((item) =>
          ["izin", "sakit", "wfa", "wfh"].includes(getStatus(item))
        ).length;

        const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
          const date = new Date();
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() - (6 - index));
          const key = toDateKey(date);

          return {
            key,
            label: date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
            hadir: 0,
            terlambat: 0,
            alpha: 0,
            izin: 0,
            total: 0,
            value: 0,
          };
        });
        const trendMap = new Map(lastSevenDays.map((day) => [day.key, day]));

        records.forEach((record) => {
          const key = getRecordDateKey(record);
          const bucket = trendMap.get(key);
          if (!bucket) return;

          const status = getStatus(record);
          bucket.total += 1;

          if (status === "terlambat") bucket.terlambat += 1;
          else if (["alpha", "belum_absen"].includes(status)) bucket.alpha += 1;
          else if (["izin", "sakit", "wfa", "wfh"].includes(status)) bucket.izin += 1;
          else if (presentStatuses.includes(status)) bucket.hadir += 1;
        });

        const trendRows = lastSevenDays.map((day) => ({
          ...day,
          value: day.total ? Math.round(((day.hadir + day.terlambat) / day.total) * 100) : 0,
        }));



        const verifiedEmployeeIds = new Set(
          records
            .filter((record) => record.face_matched === true || record.face_verified === true)
            .map((record) => record.employee_id || record.employee?.id || record.pegawai_id)
            .filter((id) => id !== undefined && id !== null)
            .map(String)
        );
        const registeredFaces = employees.filter((item) =>
          hasFaceEnrollment(item) || verifiedEmployeeIds.has(String(item.id))
        ).length;

        setFaceStats({ registered: registeredFaces, total: employees.length });
        setPendingApprovals(
          leaveRequests.filter((item) =>
            ["diajukan", "diproses", "menunggu", "pending"].includes(
              String(item.status || item.approval_status || "").toLowerCase()
            )
          ).slice(0, 5)
        );
        setDailyTrend(trendRows);
        setStatusSummary({
          hadir: presentCount,
          terlambat: lateCount,
          alpha: absentCount,
          izin: izinCount,
          total: todayRecords.length,
        });

        const unitMap = new Map();
        units.forEach((unit) => unitMap.set(String(unit.id), { name: unit.name, total: 0, hadir: 0, terlambat: 0, alpha: 0 }));
        employees.forEach((employee) => {
          const unitId = employee.work_unit_id || employee.workUnitId || employee.work_unit?.id;
          const key = String(unitId || employee.unit || employee.unit_kerja || "lainnya");
          if (!unitMap.has(key)) unitMap.set(key, { name: employee.unit || employee.unit_kerja || "Unit lain", total: 0, hadir: 0, terlambat: 0, alpha: 0 });
          unitMap.get(key).total += 1;
        });
        todayRecords.forEach((record) => {
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
          trendRows.map((item) => ({
            day: item.label,
            value: item.value,
          }))
        );
        setActivities(
          [...records]
            .sort((a, b) => {
              const aTime = new Date(a.check_in || a.clock_in || a.created_at || a.date || 0).getTime();
              const bTime = new Date(b.check_in || b.clock_in || b.created_at || b.date || 0).getTime();
              return bTime - aTime;
            })
            .slice(0, 6)
            .map((item, index) => ({
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


        setStatistics([]);
        setAttendance([]);
        setDailyTrend([]);
        setStatusSummary({ hadir: 0, terlambat: 0, alpha: 0, izin: 0, total: 0 });
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

  const trendPoints = dailyTrend
    .map((item, index) => {
      const x = 18 + index * 44;
      const y = 112 - (item.value / 100) * 86;
      return `${x},${y}`;
    })
    .join(" ");
  const trendAreaPoints = trendPoints ? `18,112 ${trendPoints} ${18 + (dailyTrend.length - 1) * 44},112` : "";
  const latestTrend = dailyTrend.at(-1)?.value || 0;
  const statusTotal = Math.max(statusSummary.total, 1);
  const statusPercents = {
    hadir: Math.round((statusSummary.hadir / statusTotal) * 100),
    terlambat: Math.round((statusSummary.terlambat / statusTotal) * 100),
    alpha: Math.round((statusSummary.alpha / statusTotal) * 100),
    izin: Math.round((statusSummary.izin / statusTotal) * 100),
  };
  const donutStyle = {
    "--hadir": `${statusPercents.hadir}%`,
    "--terlambat": `${statusPercents.hadir + statusPercents.terlambat}%`,
    "--alpha": `${statusPercents.hadir + statusPercents.terlambat + statusPercents.alpha}%`,
  };

  return (
    <AdminLayout>
      <div className="dashboard-page">


        <div className="dashboard-heading">
          <div>
            <h2>Ringkasan Kehadiran</h2>

            <p>
              Statistik kehadiran pegawai Universitas Tadulako
            </p>
          </div>

          <div className="dashboard-date">
            <span className="dashboard-date-icon" aria-hidden="true" />
            <span>{currentDate}</span>
            <span className="dashboard-date-chevron" aria-hidden="true">&gt;</span>
          </div>
        </div>


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

        <div className="dashboard-insights">
          <section className="dashboard-panel dashboard-trend-card">
            <div className="panel-header">
              <div>
                <h3>Grafik Kehadiran 7 Hari</h3>
                <p>Persentase hadir dan terlambat dari data presensi</p>
              </div>
              <strong className="dashboard-big-metric">{latestTrend}%</strong>
            </div>

            <div className="dashboard-line-chart">
              {loading ? (
                <div className="dashboard-empty">Memuat grafik...</div>
              ) : dailyTrend.length > 0 ? (
                <>
                  <svg viewBox="0 0 300 130" role="img" aria-label="Grafik tren kehadiran">
                    <defs>
                      <linearGradient id="attendanceFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.24" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <line x1="18" y1="26" x2="286" y2="26" />
                    <line x1="18" y1="69" x2="286" y2="69" />
                    <line x1="18" y1="112" x2="286" y2="112" />
                    {trendAreaPoints && <polygon points={trendAreaPoints} fill="url(#attendanceFill)" />}
                    {trendPoints && <polyline points={trendPoints} />}
                    {dailyTrend.map((item, index) => {
                      const x = 18 + index * 44;
                      const y = 112 - (item.value / 100) * 86;
                      return <circle key={item.key} cx={x} cy={y} r="3.6" />;
                    })}
                  </svg>

                  <div className="dashboard-chart-labels">
                    {dailyTrend.map((item) => (
                      <span key={item.key}>{item.label}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="dashboard-empty">Belum ada data grafik.</div>
              )}
            </div>
          </section>

          <section className="dashboard-panel dashboard-status-card">
            <div className="panel-header">
              <div>
                <h3>Komposisi Status</h3>
                <p>Distribusi status presensi yang sedang tercatat</p>
              </div>
            </div>

            <div className="dashboard-donut-wrap">
              <div className="dashboard-donut" style={donutStyle}>
                <strong>{statusSummary.total}</strong>
                <span>data</span>
              </div>

              <div className="dashboard-status-legend">
                <span><i className="legend-hadir" /> Hadir <b>{statusSummary.hadir}</b></span>
                <span><i className="legend-terlambat" /> Terlambat <b>{statusSummary.terlambat}</b></span>
                <span><i className="legend-alpha" /> Alpha <b>{statusSummary.alpha}</b></span>
                <span><i className="legend-izin" /> Izin/WFA <b>{statusSummary.izin}</b></span>
              </div>
            </div>
          </section>
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


        <div className="dashboard-grid">


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