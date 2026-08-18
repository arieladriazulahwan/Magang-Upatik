import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

function Dashboard() {
  const [statistics, setStatistics] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);

        const data = await apiRequest("/dashboard/statistics");

        console.log("Data dashboard dari backend:", data);

        // Sesuaikan setelah kita melihat response backend
        setStatistics(data.statistics || []);
        setAttendance(data.attendance || []);
        setActivities(data.activities || []);
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);

        // Tetap kosong kalau backend belum mempunyai data
        setStatistics([]);
        setAttendance([]);
        setActivities([]);
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
            18 Agustus 2026
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