import { useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";

const initialData = [
  {
    id: 1,
    name: "Andi Saputra",
    nip: "198501012010011001",
    unit: "Fakultas Teknik",
    masuk: "07:42",
    keluar: "16:05",
    status: "Hadir",
    metode: "Face Recognition",
  },
  {
    id: 2,
    name: "Siti Rahma",
    nip: "198704152012022002",
    unit: "Fakultas Ekonomi",
    masuk: "07:48",
    keluar: "16:10",
    status: "Hadir",
    metode: "Face Recognition",
  },
  {
    id: 3,
    name: "Budi Santoso",
    nip: "199001102019031003",
    unit: "UPT Teknologi Informasi",
    masuk: "08:19",
    keluar: "-",
    status: "Terlambat",
    metode: "Face Recognition",
  },
  {
    id: 4,
    name: "Dewi Lestari",
    nip: "199205202021042004",
    unit: "Fakultas Hukum",
    masuk: "-",
    keluar: "-",
    status: "Izin",
    metode: "-",
  },
  {
    id: 5,
    name: "Rizky Pratama",
    nip: "199103122020051005",
    unit: "Fakultas Teknik",
    masuk: "-",
    keluar: "-",
    status: "Belum Absen",
    metode: "-",
  },
  {
    id: 6,
    name: "Nur Aisyah",
    nip: "198809182014062006",
    unit: "Fakultas Kedokteran",
    masuk: "07:55",
    keluar: "16:02",
    status: "Hadir",
    metode: "Face Recognition",
  },
];

function Monitoring() {
  const [data] = useState(initialData);

  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("Semua Unit");
  const [status, setStatus] = useState("Semua Status");

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      item.name.toLowerCase().includes(keyword) ||
      item.nip.toLowerCase().includes(keyword);

    const matchUnit =
      unit === "Semua Unit" ||
      item.unit === unit;

    const matchStatus =
      status === "Semua Status" ||
      item.status === status;

    return (
      matchSearch &&
      matchUnit &&
      matchStatus
    );
  });

  return (
    <AdminLayout>

      <div className="monitoring-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>
            <h2>Monitoring Kehadiran</h2>

            <p>
              Pemantauan presensi pegawai secara real-time
            </p>
          </div>

          <div className="monitoring-date">
            <span>Hari ini</span>
            <strong>10 Agustus 2026</strong>
          </div>

        </div>

        {/* SUMMARY */}

        <div className="monitoring-summary">

          <div className="monitoring-card">
            <div className="monitoring-card-icon hadir">
              ✓
            </div>

            <div>
              <span>Hadir</span>
              <strong>2.431</strong>
            </div>
          </div>

          <div className="monitoring-card">
            <div className="monitoring-card-icon terlambat">
              !
            </div>

            <div>
              <span>Terlambat</span>
              <strong>186</strong>
            </div>
          </div>

          <div className="monitoring-card">
            <div className="monitoring-card-icon izin">
              i
            </div>

            <div>
              <span>Izin / Cuti / Dinas</span>
              <strong>74</strong>
            </div>
          </div>

          <div className="monitoring-card">
            <div className="monitoring-card-icon belum">
              -
            </div>

            <div>
              <span>Belum Absen</span>
              <strong>230</strong>
            </div>
          </div>

        </div>

        {/* TABLE */}

        <section className="data-panel">

          <div className="data-toolbar monitoring-toolbar">

            <div className="search-box">

              <span>⌕</span>

              <input
                type="text"
                placeholder="Cari nama atau NIP..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

            <div className="monitoring-filters">

              <select
                className="filter-select"
                value={unit}
                onChange={(e) =>
                  setUnit(e.target.value)
                }
              >
                <option>Semua Unit</option>
                <option>Fakultas Teknik</option>
                <option>Fakultas Ekonomi</option>
                <option>Fakultas Hukum</option>
                <option>Fakultas Kedokteran</option>
                <option>UPT Teknologi Informasi</option>
              </select>

              <select
                className="filter-select"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
              >
                <option>Semua Status</option>
                <option>Hadir</option>
                <option>Terlambat</option>
                <option>Izin</option>
                <option>Belum Absen</option>
              </select>

              <button className="secondary-button">
                ⟳ Refresh
              </button>

            </div>

          </div>

          {/* REALTIME BAR */}

          <div className="realtime-bar">

            <span className="realtime-dot" />

            <span>
              Monitoring aktif
            </span>

            <small>
              Data diperbarui beberapa saat yang lalu
            </small>

          </div>

          {/* TABLE */}

          <div className="employee-table-wrapper">

            <table className="employee-table monitoring-table">

              <thead>

                <tr>
                  <th>Pegawai</th>
                  <th>Unit Kerja</th>
                  <th>Jam Masuk</th>
                  <th>Jam Keluar</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>

              </thead>

              <tbody>

                {filteredData.map((item) => (

                  <tr key={item.id}>

                    <td>

                      <div className="employee-name">

                        <div className="employee-avatar">
                          {item.name.charAt(0)}
                        </div>

                        <div>

                          <strong>
                            {item.name}
                          </strong>

                          <span>
                            {item.nip}
                          </span>

                        </div>

                      </div>

                    </td>

                    <td>
                      {item.unit}
                    </td>

                    <td>

                      <span
                        className={
                          item.masuk === "-"
                            ? "time-empty"
                            : "time-value"
                        }
                      >
                        {item.masuk}
                      </span>

                    </td>

                    <td>

                      <span
                        className={
                          item.keluar === "-"
                            ? "time-empty"
                            : "time-value"
                        }
                      >
                        {item.keluar}
                      </span>

                    </td>

                    <td>
                      <span className="method-text">
                        {item.metode}
                      </span>
                    </td>

                    <td>

                      <span
                        className={`attendance-status-pill ${item.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {item.status}
                      </span>

                    </td>

                    <td>

                      <button className="action-button">
                        Detail
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

            {filteredData.length === 0 && (
              <div className="empty-state">
                Data presensi tidak ditemukan.
              </div>
            )}

          </div>

          {/* FOOTER */}

          <div className="table-footer">

            <span>
              Menampilkan {filteredData.length} data presensi
            </span>

            <div className="pagination">
              <button>‹</button>
              <button className="current">1</button>
              <button>2</button>
              <button>3</button>
              <button>›</button>
            </div>

          </div>

        </section>

      </div>

    </AdminLayout>
  );
}

export default Monitoring;