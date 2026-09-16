import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { getEmployees } from "../../services/pegawaiService";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

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
  const end = new Date(`${endDate || startDate}T00:00:00`);
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

function TambahShift() {
  const navigate = useNavigate();
  const backPath = "/shift";
  const [units, setUnits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [unitResponse, employeeResponse] = await Promise.all([
          apiRequest("/work-units"),
          getEmployees(),
        ]);
        setUnits(normalizeArray(unitResponse));
        setEmployees(normalizeArray(employeeResponse));
      } catch (err) {
        setError(err.message || "Gagal mengambil data referensi shift.");
      } finally {
        setLoading(false);
      }
    };

    fetchReferences();
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

  const toggleEmployee = (employeeId) => {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      setSaving(true);
      setError("");

      const workUnitId = form.get("work_unit_id");
      const employeeIds = selectedEmployeeIds.map(Number).filter(Boolean);
      const scheduleStart = form.get("schedule_start");
      const scheduleEnd = form.get("schedule_end") || scheduleStart;
      const dates = getDatesBetween(scheduleStart, scheduleEnd);
      const startTime = form.get("masuk") || "07:00";
      const endTime = form.get("pulang") || "15:00";

      if (!workUnitId) throw new Error("Unit kerja wajib dipilih.");
      if (employeeIds.length === 0) throw new Error("Pilih minimal satu pegawai untuk jadwal shift.");
      if (dates.length === 0) throw new Error("Tanggal jadwal shift tidak valid.");

      const shiftResponse = await apiRequest("/shifts", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name") || "Shift Baru",
          work_unit_id: Number(workUnitId),
          start_time: startTime,
          end_time: endTime,
          is_overnight: endTime < startTime,
          tolerance_minutes: Number(form.get("tolerance_minutes") || 0),
          is_active: true,
        }),
      });
      const shift = shiftResponse?.data || shiftResponse;

      await apiRequest("/shift-schedules/bulk", {
        method: "POST",
        body: JSON.stringify({
          employee_ids: employeeIds,
          shift_id: shift.id,
          dates,
          description: form.get("description") || null,
        }),
      });

      navigate(backPath);
    } catch (err) {
      setError(err.message || "Gagal menyimpan shift.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-heading">
        <div>
          <h2>Tambah Shift</h2>
          <p>Buat pola kerja dan tetapkan jadwal pegawai Rumah Sakit Tadulako.</p>
        </div>
      </div>

      <section className="data-panel employee-form-panel">
        <div className="modal-header">
          <div>
            <h3>Informasi Shift</h3>
            <p>Lengkapi jam kerja, unit, pegawai, dan rentang tanggal jadwal.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-field">
              <label>Nama Shift</label>
              <input name="name" required placeholder="Nama shift" />
            </div>

            <div className="form-field">
              <label>Unit Kerja</label>
              <select
                name="work_unit_id"
                required
                value={selectedUnitId}
                onChange={(event) => setSelectedUnitId(event.target.value)}
                disabled={loading}
              >
                <option value="" disabled>{loading ? "Memuat unit..." : "Pilih unit kerja"}</option>
                {hospitalUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name || unit.nama || unit.nama_unit || "Unit kerja"}
                  </option>
                ))}
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
              <label>Toleransi Keterlambatan (menit)</label>
              <input name="tolerance_minutes" type="number" min="0" defaultValue="0" required />
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
            </div>

            <div className="form-field full-width">
              <label>Keterangan Jadwal</label>
              <input name="description" placeholder="Opsional" />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => navigate(backPath)} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="primary-button" disabled={saving || loading}>
              {saving ? "Menyimpan..." : "Simpan Shift"}
            </button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
}

export default TambahShift;