import { useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";

function Verifikasi() {
  const [selectedData, setSelectedData] = useState(null);

  const data = [
    {
      id: 1,
      name: "Siti Rahma",
      nip: "198765432021012001",
      unit: "Fakultas Teknik",
      tanggal: "11 Agustus 2026",
      jamMasuk: "08:13",
      jamPulang: "-",
      status: "Terlambat",
      keterangan: "Kendala kendaraan",
    },
    {
      id: 2,
      name: "Andi Saputra",
      nip: "199012152022011002",
      unit: "Fakultas Ekonomi",
      tanggal: "11 Agustus 2026",
      jamMasuk: "-",
      jamPulang: "-",
      status: "Belum Absen",
      keterangan: "Lupa melakukan presensi",
    },
    {
      id: 3,
      name: "Dewi Lestari",
      nip: "198905202020032003",
      unit: "BAK",
      tanggal: "11 Agustus 2026",
      jamMasuk: "08:31",
      jamPulang: "-",
      status: "Koreksi",
      keterangan: "Presensi masuk tidak tercatat",
    },
  ];

  return (
    <AdminLayout>
      <div className="verification-page">

        {/* HEADER */}
        <div className="page-heading">
          <div>
            <h2>Verifikasi & Koreksi</h2>
            <p>
              Verifikasi pengajuan koreksi presensi pegawai
            </p>
          </div>

          <button className="primary-button">
            + Tambah Koreksi
          </button>
        </div>

        {/* SUMMARY */}
        <div className="verification-summary">

          <div className="verification-card">
            <span>Total Pengajuan</span>
            <strong>12</strong>
          </div>

          <div className="verification-card waiting">
            <span>Menunggu Verifikasi</span>
            <strong>7</strong>
          </div>

          <div className="verification-card approved">
            <span>Disetujui</span>
            <strong>4</strong>
          </div>

          <div className="verification-card rejected">
            <span>Ditolak</span>
            <strong>1</strong>
          </div>

        </div>

        {/* TABLE */}
        <div className="data-panel">

          <div className="data-toolbar">

            <div className="search-box">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Cari pegawai..."
              />
            </div>

            <div className="verification-filters">

              <select className="filter-select">
                <option>Semua Status</option>
                <option>Menunggu</option>
                <option>Disetujui</option>
                <option>Ditolak</option>
              </select>

              <select className="filter-select">
                <option>Semua Unit</option>
                <option>Fakultas Teknik</option>
                <option>Fakultas Ekonomi</option>
                <option>BAK</option>
              </select>

            </div>

          </div>

          <div className="employee-table-wrapper">

            <table className="employee-table verification-table">

              <thead>
                <tr>
                  <th>Pegawai</th>
                  <th>Tanggal</th>
                  <th>Jam Masuk</th>
                  <th>Jam Pulang</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>

                {data.map((item) => (

                  <tr key={item.id}>

                    <td>
                      <div className="employee-name">
                        <div className="employee-avatar">
                          {item.name
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)}
                        </div>

                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.nip}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {item.tanggal}
                    </td>

                    <td>
                      <strong className="time-value">
                        {item.jamMasuk}
                      </strong>
                    </td>

                    <td>
                      <strong className="time-value">
                        {item.jamPulang}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`verification-status ${item.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <span className="reason-text">
                        {item.keterangan}
                      </span>
                    </td>

                    <td>
                      <button
                        className="action-button"
                        onClick={() => setSelectedData(item)}
                      >
                        Detail
                      </button>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          {/* FOOTER */}
          <div className="table-footer">

            <span>
              Menampilkan 1–3 dari 12 pengajuan
            </span>

            <div className="pagination">
              <button>‹</button>
              <button className="current">1</button>
              <button>2</button>
              <button>3</button>
              <button>›</button>
            </div>

          </div>

        </div>

        {/* MODAL DETAIL */}
        {selectedData && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedData(null)}
          >

            <div
              className="employee-modal"
              onClick={(e) => e.stopPropagation()}
            >

              <div className="modal-header">

                <div>
                  <h3>Detail Koreksi Presensi</h3>
                  <p>
                    Informasi pengajuan koreksi pegawai
                  </p>
                </div>

                <button
                  className="modal-close"
                  onClick={() => setSelectedData(null)}
                >
                  ×
                </button>

              </div>

              <div className="approval-detail">

                <div className="detail-person">

                  <div className="employee-avatar large">
                    {selectedData.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  <div>
                    <strong>{selectedData.name}</strong>
                    <span>{selectedData.nip}</span>
                    <small>{selectedData.unit}</small>
                  </div>

                </div>

                <div className="detail-grid">

                  <div className="detail-item">
                    <span>Tanggal</span>
                    <strong>{selectedData.tanggal}</strong>
                  </div>

                  <div className="detail-item">
                    <span>Status</span>
                    <strong>{selectedData.status}</strong>
                  </div>

                  <div className="detail-item">
                    <span>Jam Masuk</span>
                    <strong>{selectedData.jamMasuk}</strong>
                  </div>

                  <div className="detail-item">
                    <span>Jam Pulang</span>
                    <strong>{selectedData.jamPulang}</strong>
                  </div>

                </div>

                <div className="detail-reason">

                  <span>Keterangan</span>

                  <p>
                    {selectedData.keterangan}
                  </p>

                </div>

              </div>

              <div className="modal-actions">

                <button
                  className="secondary-button"
                  onClick={() => setSelectedData(null)}
                >
                  Tutup
                </button>

                <button className="reject-submit">
                  Tolak
                </button>

                <button className="approve-submit">
                  Verifikasi
                </button>

              </div>

            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  );
}

export default Verifikasi;