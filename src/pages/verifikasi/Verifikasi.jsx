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

const getNestedValue = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const normalizeVerificationData = (item, index) => {
  const employee = item.employee || item.user || item.pegawai || {};
  const name =
    getNestedValue(item, ["name", "employee_name", "nama"]) ||
    getNestedValue(employee, ["name", "nama"]) ||
    "Pegawai";
  const nip =
    getNestedValue(item, ["nip", "employee_nip", "nik"]) ||
    getNestedValue(employee, ["nip", "nik"]) ||
    "-";
  const unit =
    getNestedValue(item, ["unit", "unit_kerja", "unit_name"]) ||
    getNestedValue(employee, ["unit", "unit_kerja", "unit_name"]) ||
    "-";
  const tanggal =
    getNestedValue(item, ["date", "tanggal", "attendance_date"]) ||
    "-";
  const jamMasuk =
    getNestedValue(item, ["check_in", "clock_in", "jam_masuk", "masuk", "in_time"]) ||
    "-";
  const jamPulang =
    getNestedValue(item, ["check_out", "clock_out", "jam_pulang", "pulang", "out_time"]) ||
    "-";
  const status =
    getNestedValue(item, ["status", "verification_status", "attendance_status"]) ||
    (item.is_verified ? "Disetujui" : item.is_rejected ? "Ditolak" : "Menunggu");
  const keterangan =
    getNestedValue(item, ["reason", "keterangan", "notes", "description"]) ||
    "-";

  return {
    id: item.id ?? index + 1,
    name,
    nip,
    unit,
    tanggal,
    jamMasuk,
    jamPulang,
    status,
    keterangan,
  };
};

function Verifikasi() {
  const [selectedData, setSelectedData] = useState(null);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [unitFilter, setUnitFilter] = useState("Semua Unit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/attendance");
      const normalized = normalizeArray(response).map(normalizeVerificationData);
      setData(normalized);
    } catch (err) {
      console.error("Gagal mengambil data verifikasi:", err);
      setError(err.message || "Gagal mengambil data verifikasi.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();
    const matchSearch =
      item.name.toLowerCase().includes(keyword) ||
      item.nip.toLowerCase().includes(keyword) ||
      item.unit.toLowerCase().includes(keyword);

    const matchStatus =
      statusFilter === "Semua Status" ||
      item.status === statusFilter;

    const matchUnit =
      unitFilter === "Semua Unit" ||
      item.unit === unitFilter;

    return matchSearch && matchStatus && matchUnit;
  });

  const totalPengajuan = data.length;
  const waiting = data.filter((item) => item.status === "Menunggu").length;
  const approved = data.filter((item) => item.status === "Disetujui").length;
  const rejected = data.filter((item) => item.status === "Ditolak").length;

  return (
    <AdminLayout>
      <div className="verification-page">
        <div className="page-heading">
          <div>
            <h2>Verifikasi & Koreksi</h2>
            <p>Verifikasi pengajuan koreksi presensi pegawai</p>
          </div>

          <button className="primary-button">+ Tambah Koreksi</button>
        </div>

        <div className="verification-summary">
          <div className="verification-card">
            <span>Total Pengajuan</span>
            <strong>{totalPengajuan}</strong>
          </div>

          <div className="verification-card waiting">
            <span>Menunggu Verifikasi</span>
            <strong>{waiting}</strong>
          </div>

          <div className="verification-card approved">
            <span>Disetujui</span>
            <strong>{approved}</strong>
          </div>

          <div className="verification-card rejected">
            <span>Ditolak</span>
            <strong>{rejected}</strong>
          </div>
        </div>

        <div className="data-panel">
          <div className="data-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Cari pegawai..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="verification-filters">
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Menunggu</option>
                <option>Disetujui</option>
                <option>Ditolak</option>
              </select>

              <select
                className="filter-select"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                <option>Semua Unit</option>
                {[...new Set(data.map((item) => item.unit).filter(Boolean))].map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {loading && <div className="empty-state">Memuat data verifikasi...</div>}

          {!loading && error && (
            <div className="empty-state">
              <p>{error}</p>
              <button className="secondary-button" onClick={fetchVerifications}>
                Coba Lagi
              </button>
            </div>
          )}

          {!loading && !error && (
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
                  {filteredData.map((item) => (
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

                      <td>{item.tanggal}</td>

                      <td>
                        <strong className="time-value">{item.jamMasuk}</strong>
                      </td>

                      <td>
                        <strong className="time-value">{item.jamPulang}</strong>
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
                        <span className="reason-text">{item.keterangan}</span>
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

              {filteredData.length === 0 && (
                <div className="empty-state">Data verifikasi tidak ditemukan.</div>
              )}
            </div>
          )}

          {!loading && !error && (
            <div className="table-footer">
              <span>Menampilkan {filteredData.length} pengajuan</span>
              <div className="pagination">
                <button>‹</button>
                <button className="current">1</button>
                <button>2</button>
                <button>3</button>
                <button>›</button>
              </div>
            </div>
          )}
        </div>

        {selectedData && (
          <div className="modal-overlay" onClick={() => setSelectedData(null)}>
            <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Detail Koreksi Presensi</h3>
                  <p>Informasi pengajuan koreksi pegawai</p>
                </div>

                <button className="modal-close" onClick={() => setSelectedData(null)}>
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
                  <p>{selectedData.keterangan}</p>
                </div>
              </div>

              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setSelectedData(null)}>
                  Tutup
                </button>

                <button className="reject-submit">Tolak</button>
                <button className="approve-submit">Verifikasi</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Verifikasi;