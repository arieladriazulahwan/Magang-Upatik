import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { getEmployees } from "../../services/pegawaiService";
import { canManageShifts } from "../../utils/access";

const normalizeShifts = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.shifts)) return payload.shifts;
  return [];
};

const normalizeUnits = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const formatRestTime = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return `${value} jam`;
  if (String(value).includes("jam")) return value;
  return `${value} jam`;
};

const getUnitName = (item = {}) =>
  item.unit ||
  item.unit_kerja ||
  item.unitName ||
  item.unit_name ||
  item.work_unit?.name ||
  "";

const isHospitalUnit = (unit = {}) => {
  const text = `${unit.type || ""} ${unit.name || unit.nama || ""} ${unit.code || ""}`.toLowerCase();
  return (
    text.includes("rumah_sakit") ||
    text.includes("rumah sakit") ||
    text.includes("rs pendidikan tadulako") ||
    (text.includes("tadulako") && text.includes("rs")) ||
    text.includes("zs")
  );
};

const getEmployeeName = (employee = {}) =>
  employee.name || employee.nama || employee.full_name || "Pegawai";

const toDateKey = (date) => date.toISOString().slice(0, 10);

const getDatesBetween = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${(endDate || startDate)}T00:00:00`);
  const dates = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return dates;
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

function Shift() {
  const navigate = useNavigate();
  const canCreateShift = canManageShifts();
  const [shifts, setShifts] = useState([]);
  const [units, setUnits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [editingShift, setEditingShift] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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

    apiRequest("/work-units")
      .then((response) => setUnits(normalizeUnits(response)))
      .catch((err) => console.error("Gagal mengambil unit kerja:", err));

    getEmployees()
      .then((response) => setEmployees(normalizeUnits(response)))
      .catch((err) => console.error("Gagal mengambil pegawai:", err));
  }, []);

  const hospitalUnits = units.filter(isHospitalUnit);
  const hospitalUnitIds = new Set(hospitalUnits.map((unit) => String(unit.id)));
  const hospitalEmployees = employees.filter((employee) => {
    const employeeUnitId = employee.work_unit_id || employee.workUnitId || employee.work_unit?.id;
    return hospitalUnitIds.has(String(employeeUnitId));
  });
  const selectableEmployees = selectedUnitId
    ? hospitalEmployees.filter((employee) => String(employee.work_unit_id || employee.work_unit?.id) === String(selectedUnitId))
    : hospitalEmployees;
  const filteredEmployees = selectableEmployees.filter((employee) => {
    const keyword = employeeSearch.trim().toLowerCase();
    if (!keyword) return true;

    return [
      getEmployeeName(employee),
      employee.nip,
      employee.work_unit?.name,
    ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });

  const filteredShifts = shifts.filter((item) => {
    const keyword = search.toLowerCase();
    const name = String(item.name || item.nama || item.shift_name || "").toLowerCase();
    const code = String(item.code || item.kode || item.shift_code || "").toLowerCase();
    const unit = String(getUnitName(item)).toLowerCase();

    const matchSearch =
      name.includes(keyword) ||
      code.includes(keyword) ||
      unit.includes(keyword);

    const matchUnit =
      unitFilter === "Semua Unit" ||
      String(getUnitName(item)) === unitFilter ||
      String(getUnitName(item)) === "Semua Unit";

    return matchSearch && matchUnit;
  });

  const openEditModal = (shift) => {
    setEditingShift(shift);
    setSelectedUnitId(String(shift.work_unit?.id || shift.work_unit_id || ""));
    setSelectedEmployeeIds([]);
    setEmployeeSearch("");
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingShift(null);
    setSelectedUnitId("");
    setSelectedEmployeeIds([]);
    setEmployeeSearch("");
  };

  const toggleEmployee = (employeeId) => {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  };

  const handleSubmitShift = async (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    try {
      setSaving(true);
      setError("");

      const workUnitId = editingShift ? selectedUnitId : form.get("work_unit_id");
      if (!workUnitId) {
        throw new Error("Unit kerja wajib dipilih.");
      }

      const employeeIds = selectedEmployeeIds.map(Number).filter(Boolean);
      const scheduleStart = form.get("schedule_start");
      const scheduleEnd = form.get("schedule_end") || scheduleStart;
      const dates = getDatesBetween(scheduleStart, scheduleEnd);

      if (!editingShift && employeeIds.length === 0) {
        throw new Error("Pilih minimal satu pegawai untuk jadwal shift.");
      }

      if (employeeIds.length > 0 && dates.length === 0) {
        throw new Error("Tanggal jadwal shift tidak valid.");
      }

      const startTime = form.get("masuk") || "07:00";
      const endTime = form.get("pulang") || "15:00";

      const shiftResponse = await apiRequest(editingShift ? `/shifts/${editingShift.id}` : "/shifts", {
        method: editingShift ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.get("name") || "Shift Baru",
          ...(editingShift ? {} : { work_unit_id: Number(workUnitId) }),
          start_time: startTime,
          end_time: endTime,
          is_overnight: endTime < startTime,
          tolerance_minutes: Number(form.get("tolerance_minutes") || 0),
          is_active: form.get("is_active") !== "false",
        }),
      });
      const shift = shiftResponse?.data || shiftResponse;

      if (employeeIds.length > 0) {
        await apiRequest("/shift-schedules/bulk", {
          method: "POST",
          body: JSON.stringify({
            employee_ids: employeeIds,
            shift_id: shift.id,
            dates,
            description: form.get("description") || null,
          }),
        });
      }

      closeModal();
      await fetchShifts();
    } catch (err) {
      console.error("Gagal menyimpan shift:", err);
      setError(err.message || "Gagal menyimpan shift.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async (shift) => {
    if (!confirm(`Hapus shift "${shift.name || shift.nama || "Shift"}"?`)) return;

    try {
      setDeletingId(shift.id);
      setError("");
      await apiRequest(`/shifts/${shift.id}`, { method: "DELETE" });
      await fetchShifts();
    } catch (err) {
      console.error("Gagal menghapus shift:", err);
      setError(err.message || "Gagal menghapus shift.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="schedule-page">
        <div className="page-heading">
          <div>
            <h2>Shift Kerja</h2>
            <p>Khusus pengaturan shift pegawai unit Rumah Sakit Tadulako</p>
          </div>
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
              <p>Informasi pola kerja untuk layanan Rumah Sakit Tadulako</p>
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

            <div className="schedule-toolbar-actions">
              <select
                className="filter-select"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                <option>Semua Unit</option>
                {hospitalUnits.map((unit) => (
                  <option key={unit.id || unit.code || unit.name}>
                    {unit.name || unit.nama || "Unit Rumah Sakit"}
                  </option>
                ))}
              </select>

              {canCreateShift && <button
                className="primary-button"
                onClick={() => navigate("/shift/tambah")}
              >
                + Tambah Shift
              </button>}
            </div>
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
                    const unit = getUnitName(item) || "-";
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
                          {canCreateShift && <button className="action-button" onClick={() => openEditModal(item)}>Edit</button>}
                          {canCreateShift && (
                            <button
                              className="action-button danger-action"
                              onClick={() => handleDeleteShift(item)}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? "..." : "Hapus"}
                            </button>
                          )}
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
          onClick={closeModal}
        >
          <div
            className="employee-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>{editingShift ? "Edit Shift Kerja" : "Tambah Shift Kerja"}</h3>
                <p>{editingShift ? "Perbarui pola kerja shift rumah sakit" : "Buat pola kerja dan langsung tetapkan ke pegawai rumah sakit"}</p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitShift}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Nama Shift</label>
                  <input
                    name="name"
                    required
                    placeholder="Nama shift"
                    defaultValue={editingShift?.name || editingShift?.nama || ""}
                  />
                </div>

                <div className="form-field">
                  <label>Unit Kerja</label>
                  <select
                    name="work_unit_id"
                    required
                    value={selectedUnitId}
                    onChange={(event) => setSelectedUnitId(event.target.value)}
                    disabled={Boolean(editingShift)}
                  >
                    <option value="" disabled>Pilih unit kerja</option>
                    {hospitalUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name || unit.nama || unit.nama_unit || "Unit kerja"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Jam Masuk</label>
                  <input name="masuk" type="time" defaultValue={editingShift?.start_time || "07:00"} required />
                </div>

                <div className="form-field">
                  <label>Jam Pulang</label>
                  <input name="pulang" type="time" defaultValue={editingShift?.end_time || "15:00"} required />
                </div>

                <div className="form-field">
                  <label>Toleransi Keterlambatan (menit)</label>
                  <input
                    name="tolerance_minutes"
                    type="number"
                    min="0"
                    defaultValue={editingShift?.tolerance_minutes ?? 0}
                    required
                  />
                </div>

                {editingShift && (
                  <div className="form-field">
                    <label>Status Shift</label>
                    <select name="is_active" defaultValue={editingShift.is_active === false ? "false" : "true"}>
                      <option value="true">Aktif</option>
                      <option value="false">Nonaktif</option>
                    </select>
                  </div>
                )}

                <div className="form-field full-width">
                  <label>Pegawai Shift</label>
                  <div className="employee-picker">
                    <input
                      type="search"
                      placeholder="Ketik nama atau NIP pegawai..."
                      value={employeeSearch}
                      onChange={(event) => setEmployeeSearch(event.target.value)}
                    />

                    <div className="employee-picker-list">
                      {filteredEmployees.length > 0 ? filteredEmployees.map((employee) => (
                        <label className="employee-picker-item" key={employee.id}>
                          <input
                            type="checkbox"
                            checked={selectedEmployeeIds.includes(employee.id)}
                            onChange={() => toggleEmployee(employee.id)}
                          />
                          <span>
                            <strong>{getEmployeeName(employee)}</strong>
                            <small>{employee.nip || "NIP belum tersedia"}</small>
                          </span>
                        </label>
                      )) : (
                        <div className="employee-picker-empty">Pegawai tidak ditemukan.</div>
                      )}
                    </div>
                  </div>
                  <small>
                    {editingShift
                      ? "Opsional: pilih pegawai jika ingin menambahkan jadwal baru untuk shift ini."
                      : "Pilih satu atau beberapa pegawai yang wajib mengikuti shift ini."}
                  </small>
                </div>

                <div className="form-field">
                  <label>Tanggal Mulai</label>
                  <input name="schedule_start" type="date" required defaultValue={toDateKey(new Date())} />
                </div>

                <div className="form-field">
                  <label>Tanggal Selesai</label>
                  <input name="schedule_end" type="date" defaultValue={toDateKey(new Date())} />
                </div>

                <div className="form-field full-width">
                  <label>Keterangan Jadwal</label>
                  <input name="description" placeholder="Opsional" />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Menyimpan..." : editingShift ? "Simpan Perubahan" : "Simpan Shift"}
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