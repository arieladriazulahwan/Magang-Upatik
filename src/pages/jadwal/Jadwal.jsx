import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { canManageShifts } from "../../utils/access";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getEmployeeName = (employee) => employee.name || employee.nama || employee.full_name || "Pegawai";
const getShiftName = (shift) => shift.name || shift.nama || shift.shift_name || "Shift";

function Jadwal() {
  const canCreateSchedule = canManageShifts();
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [scheduleResponse, employeeResponse, shiftResponse] = await Promise.all([
        apiRequest("/shift-schedules"),
        apiRequest("/employees"),
        apiRequest("/shifts"),
      ]);
      setSchedules(normalizeArray(scheduleResponse));
      setEmployees(normalizeArray(employeeResponse));
      setShifts(normalizeArray(shiftResponse));
    } catch (err) {
      console.error("Gagal mengambil jadwal shift:", err);
      setError(err.message || "Gagal mengambil data jadwal shift.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSchedules = schedules.filter((schedule) => {
    const employee = schedule.employee || schedule.pegawai || {};
    const shift = schedule.shift || {};
    const searchable = [
      employee.name, employee.nama, employee.nip,
      schedule.employee_name, schedule.employee_nip,
      shift.name, shift.nama, schedule.shift_name,
      schedule.date,
    ].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(search.toLowerCase());
  });

  const handleCreate = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSaving(true);
      setError("");
      await apiRequest("/shift-schedules", {
        method: "POST",
        body: JSON.stringify({
          employee_id: Number(form.get("employee_id")),
          shift_id: Number(form.get("shift_id")),
          date: form.get("date"),
          description: form.get("description") || null,
        }),
      });
      setShowModal(false);
      await fetchData();
    } catch (err) {
      console.error("Gagal menyimpan jadwal shift:", err);
      setError(err.message || "Gagal menyimpan jadwal shift.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="schedule-page">
        <div className="page-heading">
          <div><h2>Jadwal Shift</h2><p>Atur penempatan shift pegawai berdasarkan tanggal</p></div>
          {canCreateSchedule && <button className="primary-button" onClick={() => setShowModal(true)}>+ Atur Jadwal</button>}
        </div>

        <section className="data-panel schedule-assignment-panel">
          <div className="data-toolbar schedule-assignment-toolbar">
            <div><h3>Penjadwalan Pegawai</h3><p>Daftar shift yang sudah ditetapkan pada kalender kerja</p></div>
            <div className="search-box"><span>⌕</span><input type="search" placeholder="Cari pegawai, shift, atau tanggal..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          </div>

          {loading && <div className="empty-state">Memuat jadwal shift...</div>}
          {!loading && error && <div className="empty-state"><p>{error}</p><button className="secondary-button" onClick={fetchData}>Coba Lagi</button></div>}

          {!loading && !error && <div className="employee-table-wrapper">
            <table className="employee-table schedule-assignment-table">
              <thead><tr><th>Tanggal</th><th>Pegawai</th><th>Shift</th><th>Jam Kerja</th><th>Keterangan</th></tr></thead>
              <tbody>
                {filteredSchedules.length > 0 ? filteredSchedules.map((schedule, index) => {
                  const employee = schedule.employee || schedule.pegawai || {};
                  const shift = schedule.shift || {};
                  const employeeName = schedule.employee_name || getEmployeeName(employee);
                  const shiftName = schedule.shift_name || getShiftName(shift);
                  return <tr key={schedule.id || index}>
                    <td><strong className="schedule-date">{schedule.date || schedule.tanggal || "-"}</strong></td>
                    <td><div className="employee-name"><div className="employee-avatar">{employeeName.charAt(0).toUpperCase()}</div><div><strong>{employeeName}</strong><span>{employee.nip || schedule.employee_nip || "NIP belum tersedia"}</span></div></div></td>
                    <td><span className="schedule-shift-badge">{shiftName}</span></td>
                    <td>{shift.start_time || schedule.start_time || "-"} - {shift.end_time || schedule.end_time || "-"}</td>
                    <td>{schedule.description || schedule.keterangan || "-"}</td>
                  </tr>;
                }) : <tr><td colSpan="5"><div className="empty-state">{search ? "Jadwal tidak ditemukan." : "Belum ada jadwal shift."}</div></td></tr>}
              </tbody>
            </table>
          </div>}

          {!loading && !error && <div className="table-footer"><span>Menampilkan {filteredSchedules.length} jadwal</span></div>}
        </section>

        {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="employee-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h3>Atur Jadwal Shift</h3><p>Tetapkan shift untuk pegawai pada tanggal tertentu</p></div><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleCreate}>
              <div className="form-grid">
                <div className="form-field"><label>Pegawai</label><select name="employee_id" required defaultValue=""><option value="" disabled>Pilih pegawai</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{getEmployeeName(employee)}{employee.nip ? ` - ${employee.nip}` : ""}</option>)}</select></div>
                <div className="form-field"><label>Shift</label><select name="shift_id" required defaultValue=""><option value="" disabled>Pilih shift</option>{shifts.map((shift) => <option key={shift.id} value={shift.id}>{getShiftName(shift)}{shift.start_time ? ` (${shift.start_time} - ${shift.end_time})` : ""}</option>)}</select></div>
                <div className="form-field"><label>Tanggal</label><input name="date" type="date" required /></div>
                <div className="form-field"><label>Keterangan</label><input name="description" placeholder="Opsional" /></div>
              </div>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Batal</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Jadwal"}</button></div>
            </form>
          </div>
        </div>}
      </div>
    </AdminLayout>
  );
}

export default Jadwal;
