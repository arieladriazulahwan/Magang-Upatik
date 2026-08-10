import AdminLayout from "../../components/layout/AdminLayout";

function Dashboard() {
  const statistics = [
    {
      title: "Total Pegawai Aktif",
      value: "2.847",
      description: "PNS 1.642 · PPPK 728 · Non-ASN 477",
      type: "primary",
    },
    {
      title: "Hadir Hari Ini",
      value: "2.431",
      description: "85,4% dari total pegawai aktif",
      type: "success",
    },
    {
      title: "Terlambat",
      value: "186",
      description: "6,5% dari total pegawai aktif",
      type: "warning",
    },
    {
      title: "Belum Absen",
      value: "230",
      description: "Menunggu presensi hari ini",
      type: "danger",
    },
  ];

  const attendance = [
    { day: "Sen", value: 91 },
    { day: "Sel", value: 94 },
    { day: "Rab", value: 89 },
    { day: "Kam", value: 93 },
    { day: "Jum", value: 85 },
    { day: "Sab", value: 72 },
  ];

  const activities = [
    {
      name: "Andi Saputra",
      activity: "Melakukan presensi masuk",
      time: "07:42",
      status: "Hadir",
    },
    {
      name: "Siti Rahma",
      activity: "Mengajukan koreksi presensi",
      time: "08:13",
      status: "Menunggu",
    },
    {
      name: "Budi Santoso",
      activity: "Melakukan presensi masuk",
      time: "08:19",
      status: "Terlambat",
    },
    {
      name: "Dewi Lestari",
      activity: "Mengajukan izin",
      time: "08:31",
      status: "Menunggu",
    },
  ];

  return (
    <AdminLayout>

      <div className="dashboard-page">

        {/* HEADER DASHBOARD */}

        <div className="dashboard-heading">
          <div>
            <h2>Ringkasan Kehadiran</h2>

            <p>
              Statistik kehadiran pegawai Universitas Tadulako
            </p>
          </div>

          <div className="dashboard-date">
            10 Agustus 2026
          </div>
        </div>

        {/* STATISTICS */}

        <div className="dashboard-kpis">

          {statistics.map((item) => (
            <div
              className={`kpi-card ${item.type}`}
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
          ))}

        </div>

        {/* MAIN GRID */}

        <div className="dashboard-grid">

          {/* ATTENDANCE CHART */}

          <section className="dashboard-panel">

            <div className="panel-header">

              <div>
                <h3>Tren Kehadiran</h3>

                <p>
                  Persentase kehadiran 6 hari terakhir
                </p>
              </div>

              <select className="period-select">
                <option>6 Hari</option>
                <option>1 Bulan</option>
                <option>3 Bulan</option>
              </select>

            </div>

            <div className="attendance-chart">

              {attendance.map((item) => (
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
              ))}

            </div>

          </section>

          {/* STATUS */}

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

              <div className="status-item">
                <div>
                  <span className="status-dot hadir" />
                  <span>Hadir</span>
                </div>

                <strong>2.431</strong>
              </div>

              <div className="status-item">
                <div>
                  <span className="status-dot terlambat" />
                  <span>Terlambat</span>
                </div>

                <strong>186</strong>
              </div>

              <div className="status-item">
                <div>
                  <span className="status-dot izin" />
                  <span>Izin / Cuti / Dinas</span>
                </div>

                <strong>74</strong>
              </div>

              <div className="status-item">
                <div>
                  <span className="status-dot belum" />
                  <span>Belum Absen</span>
                </div>

                <strong>230</strong>
              </div>

            </div>

          </section>

        </div>

        {/* ACTIVITY */}

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

            {activities.map((item) => (
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
                    className={`activity-status ${item.status
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {item.status}
                  </b>
                </span>

              </div>
            ))}

          </div>

        </section>

      </div>

    </AdminLayout>
  );
}

export default Dashboard;