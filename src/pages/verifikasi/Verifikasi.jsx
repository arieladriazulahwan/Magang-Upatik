import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const formatAttendanceTime = (value) => {
  if (!value || value === "-") return "-";
  const match = String(value).match(/(?:T|\s)(\d{2}:\d{2})|^(\d{2}:\d{2})/);
  return match?.[1] || match?.[2] || String(value);
};

const toDateTimeValue = (date, time) => {
  if (!date || !time) return null;
  return `${date} ${time}:00`;
};

const normalizeVerificationStatus = (item) => {
  const rawStatus = String(
    getNestedValue(item, ["status", "verification_status", "attendance_status"]) || ""
  ).toLowerCase();

  if (item.is_manual || item.verified_at || item.verified_by) {
    return "Disetujui";
  }

  if (getNestedValue(item, ["correction_reason", "reason", "keterangan", "notes", "description"])) {
    return "Menunggu";
  }

  if (["alpha", "tidak_lengkap", "tak_lengkap", "pending", "menunggu"].includes(rawStatus)) {
    return "Menunggu";
  }

  return "Tercatat";
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
    employee.work_unit?.name ||
    "-";
  const tanggal =
    getNestedValue(item, ["date", "tanggal", "attendance_date"]) ||
    "-";
  const rawJamMasuk =
    getNestedValue(item, ["check_in", "clock_in", "jam_masuk", "masuk", "in_time"]) ||
    "-";
  const rawJamPulang =
    getNestedValue(item, ["check_out", "clock_out", "jam_pulang", "pulang", "out_time"]) ||
    "-";
  const attendanceStatus =
    getNestedValue(item, ["status", "verification_status", "attendance_status"]) ||
    "-";
  const status = normalizeVerificationStatus(item);
  const keterangan =
    getNestedValue(item, ["correction_reason", "reason", "keterangan", "notes", "description"]) ||
    "-";

  return {
    id: item.id ?? index + 1,
    name,
    nip,
    unit,
    tanggal,
    jamMasuk: formatAttendanceTime(rawJamMasuk),
    jamPulang: formatAttendanceTime(rawJamPulang),
    status,
    attendanceStatus,
    keterangan,
  };
};

function Verifikasi() {
  const navigate = useNavigate();
  const [selectedData, setSelectedData] = useState(null);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [unitFilter, setUnitFilter] = useState("Semua Unit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [correcting, setCorrecting] = useState(false);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/attendance?per_page=100");
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

  const handleCorrect = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setCorrecting(true);
      setError("");

      await apiRequest(`/attendance/${selectedData.id}/correct`, {
        method: "PATCH",
        body: JSON.stringify({
          check_in: toDateTimeValue(selectedData.tanggal, form.get("check_in")),
          check_out: toDateTimeValue(selectedData.tanggal, form.get("check_out")),
          status: form.get("status") || null,
          correction_reason: form.get("correction_reason"),
        }),
      });

      setSelectedData(null);
      await fetchVerifications();
    } catch (err) {
      setError(err.message || "Gagal menyimpan koreksi presensi.");
    } finally {
      setCorrecting(false);
    }
  };

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
  const recorded = data.filter((item) => item.status === "Tercatat").length;

  return (
    <AdminLayout>
      <div className="verification-page">
        <div className="page-heading">
          <div>
            <h2>Verifikasi & Koreksi</h2>
            <p>Verifikasi pengajuan koreksi presensi pegawai</p>
          </div>

          <button className="primary-button" onClick={() => navigate("/verifikasi/tambah")}>
            + Tambah Koreksi
          </button>
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
            <span>Tercatat</span>
            <strong>{recorded}</strong>
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
                <option>Tercatat</option>
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

              <div className="correction-detail">
                <div className="correction-detail-person">
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

                <form className="correction-detail-grid" onSubmit={handleCorrect}>
                  <div className="correction-detail-item">
                    <span>Tanggal</span>
                    <strong>{selectedData.tanggal}</strong>
                  </div>

                  <div className="correction-detail-item">
                    <span>Status</span>
                    <strong>{selectedData.status} ({selectedData.attendanceStatus})</strong>
                  </div>

                  <div className="correction-detail-item">
                    <span>Jam Masuk</span>
                    <input name="check_in" type="time" defaultValue={selectedData.jamMasuk === "-" ? "" : selectedData.jamMasuk} />
                  </div>

                  <div className="correction-detail-item">
                    <span>Jam Pulang</span>
                    <input name="check_out" type="time" defaultValue={selectedData.jamPulang === "-" ? "" : selectedData.jamPulang} />
                  </div>
                  <div className="correction-detail-item">
                    <span>Status Koreksi</span>
                    <select name="status" defaultValue={selectedData.attendanceStatus === "-" ? "hadir" : selectedData.attendanceStatus}>
                      <option value="hadir">Hadir</option>
                      <option value="terlambat">Terlambat</option>
                      <option value="pulang_cepat">Pulang Cepat</option>
                      <option value="tidak_lengkap">Tidak Lengkap</option>
                      <option value="alpha">Alpha</option>
                      <option value="dinas">Dinas</option>
                    </select>
                  </div>
                  <div className="correction-detail-item correction-detail-full-width">
                    <span>Keterangan koreksi</span>
                    <textarea name="correction_reason" defaultValue={selectedData.keterangan === "-" ? "" : selectedData.keterangan} rows="3" required />
                  </div>
                  <div className="modal-actions correction-detail-actions">
                    <button type="button" className="secondary-button" onClick={() => setSelectedData(null)}>
                      Batal
                    </button>
                    <button type="submit" className="approve-submit" disabled={correcting}>
                      {correcting ? "Menyimpan..." : "Simpan Koreksi"}
                    </button>
                  </div>
                </form>

                </div>
            </div>
          </div>
        )}

        {false && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="employee-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Tambah Koreksi Presensi</h3>
                  <p>Catat kehadiran manual untuk pegawai</p>
                </div>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
              </div>

              <form onSubmit={handleAddCorrection}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Pegawai</label>
                    <select name="employee_id" required defaultValue="">
                      <option value="" disabled>Pilih pegawai</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name || employee.nama || employee.full_name || "Pegawai"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Tanggal</label>
                    <input name="date" type="date" required />
                  </div>
                  <div className="form-field">
                    <label>Jam Masuk</label>
                    <input name="check_in" type="time" />
                  </div>
                  <div className="form-field">
                    <label>Jam Pulang</label>
                    <input name="check_out" type="time" />
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <select name="status" required defaultValue="hadir">
                      <option value="hadir">Hadir</option>
                      <option value="terlambat">Terlambat</option>
                      <option value="pulang_cepat">Pulang Cepat</option>
                      <option value="tidak_lengkap">Tidak Lengkap</option>
                      <option value="alpha">Alpha</option>
                      <option value="dinas">Dinas</option>
                    </select>
                  </div>
                  <div className="form-field full-width">
                    <label>Alasan Koreksi</label>
                    <textarea name="correction_reason" rows="3" required placeholder="Tuliskan alasan presensi manual atau koreksi..." />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="secondary-button" onClick={() => setShowAddModal(false)}>Batal</button>
                  <button type="submit" className="approve-submit" disabled={correcting}>
                    {correcting ? "Menyimpan..." : "Simpan Koreksi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Verifikasi;