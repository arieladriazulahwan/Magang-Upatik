import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const normalizeShifts = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.shifts)) return payload.shifts;
  return [];
};

const formatRestTime = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return `${value} jam`;
  if (String(value).includes("jam")) return value;
  return `${value} jam`;
};

function Shift() {
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("Semua Unit");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/shifts");
      setShifts(normalizeShifts(response));
    } catch (err) {
      console.error("Gagal mengambil data shift:", err);
      setError(err.message || "Gagal mengambil data shift.");
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const filteredShifts = shifts.filter((item) => {
    const keyword = search.toLowerCase();
    const name = String(item.name || item.nama || item.shift_name || "").toLowerCase();
    const code = String(item.code || item.kode || item.shift_code || "").toLowerCase();
    const unit = String(item.unit || item.unit_kerja || item.unitName || item.unit_name || "").toLowerCase();

    const matchSearch =
      name.includes(keyword) ||
      code.includes(keyword) ||
      unit.includes(keyword);

    const matchUnit =
      unitFilter === "Semua Unit" ||
      String(item.unit || item.unit_kerja || item.unitName || item.unit_name || "") === unitFilter ||
      String(item.unit || item.unit_kerja || item.unitName || item.unit_name || "") === "Semua Unit";

    return matchSearch && matchUnit;
  });

  const handleAddShift = async (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    try {
      setLoading(true);
      setError("");

      await apiRequest("/shifts", {
        method: "POST",
        body: JSON.stringify({
          code: String(form.get("code") || "").toUpperCase(),
          name: form.get("name") || "Shift Baru",
          unit: form.get("unit") || null,
          start_time: form.get("masuk") || "07:00",
          end_time: form.get("pulang") || "15:00",
          break_minutes: Number(form.get("istirahat") || 60),
          work_days: form.get("workDays") || "Senin - Jumat",
          is_active: true,
        }),
      });

      setShowModal(false);
      await fetchShifts();
    } catch (err) {
      console.error("Gagal menambahkan shift:", err);
      setError(err.message || "Gagal menambahkan shift.");
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="schedule-page">
        <div className="page-heading">
          <div>
            <h2>Shift Kerja</h2>
            <p>Kelola jadwal kerja dan pola dinas pegawai</p>
          </div>

          <button
            className="primary-button"
            onClick={() => setShowModal(true)}
          >
            + Tambah Shift
          </button>
        </div>

        <div className="shift-cards">
          {shifts.slice(0, 3).map((item) => {
            const code = item.code || item.kode || item.shift_code || "SHIFT";
            const name = item.name || item.nama || item.shift_name || "Shift";
            const masuk = item.masuk || item.jam_masuk || item.start_time || item.startTime || "00:00";
            const pulang = item.pulang || item.jam_pulang || item.end_time || item.endTime || "00:00";
            const workDays = item.workDays || item.hari_kerja || item.work_days || "Senin - Jumat";
            const status = item.status || (item.is_active ? "Aktif" : "Tidak Aktif");

            return (
              <div className="shift-card" key={item.id || code}>
                <div className="shift-card-top">
                  <span className="shift-code">{code}</span>
                  <span className="status-pill active">{status}</span>
                </div>

                <h3>{name}</h3>

                <div className="shift-time">
                  <strong>{masuk}</strong>
                  <span>—</span>
                  <strong>{pulang}</strong>
                </div>

                <p>{workDays}</p>
              </div>
            );
          })}
        </div>

        <section className="data-panel">
          <div className="schedule-panel-header">
            <div>
              <h3>Daftar Shift</h3>
              <p>Informasi pola kerja yang berlaku di setiap unit</p>
            </div>
          </div>

          <div className="data-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Cari kode, nama, atau unit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option>Semua Unit</option>
              <option>Fakultas Teknik</option>
              <option>Fakultas Ekonomi</option>
              <option>Fakultas Hukum</option>
              <option>UPT Teknologi Informasi</option>
              <option>Instalasi Rawat Inap</option>
            </select>
          </div>

          {loading && (
            <div className="empty-state">Memuat data shift...</div>
          )}

          {!loading && error && (
            <div className="empty-state">
              <p>{error}</p>
              <button className="secondary-button" onClick={fetchShifts}>
                Coba Lagi
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="employee-table-wrapper">
              <table className="employee-table schedule-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Shift</th>
                    <th>Unit Kerja</th>
                    <th>Jam Masuk</th>
                    <th>Jam Pulang</th>
                    <th>Istirahat</th>
                    <th>Hari Kerja</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredShifts.map((item) => {
                    const code = item.code || item.kode || item.shift_code || "SHIFT";
                    const name = item.name || item.nama || item.shift_name || "Shift";
                    const unit = item.unit || item.unit_kerja || item.unitName || item.unit_name || "-";
                    const masuk = item.masuk || item.jam_masuk || item.start_time || item.startTime || "00:00";
                    const pulang = item.pulang || item.jam_pulang || item.end_time || item.endTime || "00:00";
                    const istirahat = formatRestTime(item.istirahat || item.rest_time || item.break_minutes || item.breakTime || 1);
                    const workDays = item.workDays || item.hari_kerja || item.work_days || "Senin - Jumat";
                    const status = item.status || (item.is_active ? "Aktif" : "Tidak Aktif");

                    return (
                      <tr key={item.id || code}>
                        <td>
                          <span className="unit-code">{code}</span>
                        </td>

                        <td>
                          <strong className="schedule-name">{name}</strong>
                        </td>

                        <td>{unit}</td>

                        <td>
                          <span className="schedule-time">{masuk}</span>
                        </td>

                        <td>
                          <span className="schedule-time">{pulang}</span>
                        </td>

                        <td>{istirahat}</td>

                        <td>{workDays}</td>

                        <td>
                          <span className="status-pill active">{status}</span>
                        </td>

                        <td>
                          <button className="action-button">Edit</button>
                          <button className="action-button">Detail</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredShifts.length === 0 && (
                <div className="empty-state">Shift tidak ditemukan.</div>
              )}
            </div>
          )}

          <div className="table-footer">
            <span>Menampilkan {filteredShifts.length} shift</span>
            <div className="pagination">
              <button>‹</button>
              <button className="current">1</button>
              <button>2</button>
              <button>›</button>
            </div>
          </div>
        </section>
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="employee-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Tambah Shift Kerja</h3>
                <p>Buat pola kerja baru untuk unit terkait</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddShift}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Kode Shift</label>
                  <input name="code" required placeholder="Contoh: PAGI" />
                </div>

                <div className="form-field">
                  <label>Nama Shift</label>
                  <input name="name" required placeholder="Nama shift" />
                </div>

                <div className="form-field">
                  <label>Unit Kerja</label>
                  <select name="unit">
                    <option>Semua Unit</option>
                    <option>Fakultas Teknik</option>
                    <option>Fakultas Ekonomi</option>
                    <option>Fakultas Hukum</option>
                    <option>UPT Teknologi Informasi</option>
                    <option>Instalasi Rawat Inap</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Jam Masuk</label>
                  <input name="masuk" type="time" defaultValue="07:00" required />
                </div>

                <div className="form-field">
                  <label>Jam Pulang</label>
                  <input name="pulang" type="time" defaultValue="15:00" required />
                </div>

                <div className="form-field">
                  <label>Durasi Istirahat</label>
                  <input
                    name="istirahat"
                    type="number"
                    min="0"
                    defaultValue="1"
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Hari Kerja</label>
                  <select name="workDays">
                    <option>Senin - Jumat</option>
                    <option>Senin - Sabtu</option>
                    <option>Senin - Minggu</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>

                <button type="submit" className="primary-button">
                  Simpan Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default Shift;
