import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { getEmployees } from "../../services/pegawaiService";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const toDateTimeValue = (date, time) => {
  if (!date || !time) return null;
  return `${date} ${time}:00`;
};

const getEmployeeName = (employee = {}) =>
  employee.name || employee.nama || employee.full_name || "Pegawai";

function TambahKoreksi() {
  const navigate = useNavigate();
  const backPath = "/verifikasi";
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setEmployees(normalizeArray(await getEmployees()));
      } catch (err) {
        setError(err.message || "Gagal mengambil data pegawai.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((employee) => {
    const keyword = employeeSearch.trim().toLowerCase();
    if (!keyword) return true;

    return [
      getEmployeeName(employee),
      employee.nip,
      employee.work_unit?.name,
    ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setSaving(true);
      setError("");

      const employeeId = Number(form.get("employee_id"));
      const date = form.get("date");

      await apiRequest(`/attendance/${employeeId}/mark-present`, {
        method: "POST",
        body: JSON.stringify({
          date,
          check_in: toDateTimeValue(date, form.get("check_in")),
          check_out: toDateTimeValue(date, form.get("check_out")),
          status: form.get("status"),
          correction_reason: form.get("correction_reason"),
        }),
      });

      navigate(backPath);
    } catch (err) {
      setError(err.message || "Gagal menambahkan koreksi presensi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-heading">
        <div>
          <h2>Tambah Koreksi Presensi</h2>
          <p>Catat presensi manual atau koreksi kehadiran pegawai.</p>
        </div>
      </div>

      <section className="data-panel employee-form-panel">
        <div className="modal-header">
          <div>
            <h3>Data Koreksi</h3>
            <p>Pilih pegawai, tanggal, jam presensi, status, dan alasan koreksi.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-field full-width">
              <label>Cari Pegawai</label>
              <input
                type="search"
                placeholder="Ketik nama, NIP, atau unit..."
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
              />
            </div>

            <div className="form-field full-width">
              <label>Pegawai</label>
              <select name="employee_id" required defaultValue="" disabled={loading}>
                <option value="" disabled>{loading ? "Memuat pegawai..." : "Pilih pegawai"}</option>
                {filteredEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {getEmployeeName(employee)}{employee.nip ? ` - ${employee.nip}` : ""}
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
            <button type="button" className="secondary-button" onClick={() => navigate(backPath)} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="approve-submit" disabled={saving || loading}>
              {saving ? "Menyimpan..." : "Simpan Koreksi"}
            </button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
}

export default TambahKoreksi;