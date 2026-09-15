import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import {
  deleteEmployee,
  getEmployees,
  getStructuralPositions,
  getWorkUnits,
  updateEmployee,
} from "../../services/pegawaiService";
import { canAddEmployee, canDeleteEmployee, canEditEmployee } from "../../utils/access";
import { hasFaceEnrollment } from "../../utils/faceData";

function Pegawai() {
  const navigate = useNavigate();
  const canCreateEmployee = canAddEmployee();
  const canEdit = canEditEmployee();
  const canDelete = canDeleteEmployee();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState(null);
  const [units, setUnits] = useState([]);
  const [positions, setPositions] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // =========================
  // AMBIL DATA PEGAWAI
  // =========================

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      setEmployees(await getEmployees());

    } catch (error) {
      console.error("Gagal mengambil data pegawai:", error);

      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Jalankan ketika halaman dibuka
  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    Promise.all([
      getWorkUnits().catch(() => []),
      getStructuralPositions().catch(() => []),
    ]).then(([unitData, positionData]) => {
      setUnits(unitData);
      setPositions(positionData);
    });
  }, []);

  const handleToggleAttendance = async (employee) => {
    const nextValue = !employee.attendance_active;

    try {
      setUpdatingAttendanceId(employee.id);
      const response = await apiRequest(`/employees/${employee.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          attendance_active: nextValue,
        }),
      });
      const updatedEmployee = response?.data || response;

      setEmployees((current) =>
        current.map((item) =>
          item.id === employee.id
            ? { ...item, attendance_active: updatedEmployee.attendance_active ?? nextValue }
            : item
        )
      );
    } catch (error) {
      console.error("Gagal mengubah aktivasi presensi:", error);
      alert(error.message || "Gagal mengubah aktivasi presensi.");
    } finally {
      setUpdatingAttendanceId(null);
    }
  };

  const openEdit = (employee) => {
    setEditingEmployee({
      ...employee,
      work_unit_id: employee.work_unit?.id || "",
      structural_position_id: employee.structural_position?.id || "",
      username: employee.linked_user?.username || "",
      password: "",
    });
  };

  const handleEditChange = (key, value) => {
    setEditingEmployee((current) => ({
      ...current,
      [key]: value,
      ...(key === "employee_type" && value !== "dosen"
        ? { structural_position_id: "" }
        : {}),
    }));
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!editingEmployee) return;

    const payload = {
      name: editingEmployee.name,
      nip: editingEmployee.nip || null,
      nik: editingEmployee.nik || null,
      email: editingEmployee.email || null,
      phone: editingEmployee.phone || null,
      gender: editingEmployee.gender || "L",
      employment_status: editingEmployee.employment_status,
      employee_type: editingEmployee.employee_type,
      work_unit_id: Number(editingEmployee.work_unit_id),
      structural_position_id: editingEmployee.structural_position_id
        ? Number(editingEmployee.structural_position_id)
        : null,
      tmt: editingEmployee.tmt,
      grade: editingEmployee.grade || null,
      rank: editingEmployee.rank || null,
      is_active: editingEmployee.is_active !== false,
      username: editingEmployee.username || null,
      ...(editingEmployee.password ? { password: editingEmployee.password } : {}),
    };

    try {
      setSavingEdit(true);
      const response = await updateEmployee(editingEmployee.id, payload);
      const updated = response?.data || response;
      setEmployees((current) =>
        current.map((employee) => (employee.id === updated.id ? updated : employee))
      );
      setEditingEmployee(null);
    } catch (error) {
      alert(error.message || "Gagal menyimpan perubahan pegawai.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (employee) => {
    if (!confirm(`Hapus pegawai "${employee.name}"?`)) return;

    try {
      setDeletingId(employee.id);
      await deleteEmployee(employee.id);
      setEmployees((current) => current.filter((item) => item.id !== employee.id));
    } catch (error) {
      alert(error.message || "Gagal menghapus pegawai.");
    } finally {
      setDeletingId(null);
    }
  };


  // =========================
  // FILTER DATA
  // =========================

  const filteredEmployees = employees.filter((employee) => {

    const keyword = search.toLowerCase();

    const name =
      employee.name ||
      employee.nama ||
      "";

    const nip =
      employee.nip ||
      "";

    const unit =
      employee.work_unit?.name ||
      employee.unit ||
      employee.unit_kerja ||
      employee.unitKerja ||
      "";

    const employeeType =
      employee.employment_status ||
      employee.status_kepegawaian ||
      employee.type ||
      "";

    const matchesSearch =
      name.toLowerCase().includes(keyword) ||
      nip.toLowerCase().includes(keyword) ||
      unit.toLowerCase().includes(keyword);

    const matchesType =
      type === "semua" ||
      employeeType.toLowerCase() === type;

    return matchesSearch && matchesType;
  });


  // =========================
  // HITUNG SUMMARY
  // =========================

  const totalEmployees = employees.length;

  const totalPNS = employees.filter(
    (employee) =>
      (employee.employment_status || employee.status_kepegawaian || employee.type || "").toLowerCase() === "pns"
  ).length;

  const totalPPPK = employees.filter(
    (employee) =>
      (employee.employment_status || employee.status_kepegawaian || employee.type || "").toLowerCase() === "pppk"
  ).length;

  const totalNonASN = employees.filter(
    (employee) =>
      (employee.employment_status || employee.status_kepegawaian || employee.type || "").toLowerCase() === "non_asn"
  ).length;


  // =========================
  // RENDER
  // =========================

  return (
    <AdminLayout>

      <div className="pegawai-page">

        {/* =========================
            PAGE HEADER
        ========================= */}

        <div className="page-heading">

          <div>

            <h2>
              Data Pegawai
            </h2>

            <p>
              Kelola master data pegawai Universitas Tadulako
            </p>

          </div>

          {canCreateEmployee && <button
            className="primary-button"
            onClick={() =>
              navigate("/pegawai/tambah")
            }
          >
            + Tambah Pegawai
          </button>}

        </div>


        {/* =========================
            SUMMARY
        ========================= */}

        <div className="employee-summary">

          <div className="summary-card">

            <span>
              Total Pegawai
            </span>

            <strong>
              {totalEmployees}
            </strong>

          </div>


          <div className="summary-card">

            <span>
              PNS
            </span>

            <strong>
              {totalPNS}
            </strong>

          </div>


          <div className="summary-card">

            <span>
              PPPK
            </span>

            <strong>
              {totalPPPK}
            </strong>

          </div>


          <div className="summary-card">

            <span>
              Non-ASN
            </span>

            <strong>
              {totalNonASN}
            </strong>

          </div>

        </div>


        {/* =========================
            TABLE PANEL
        ========================= */}

        <section className="data-panel">

          {/* TOOLBAR */}

          <div className="data-toolbar">

            <div className="search-box">

              <span>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Cari nama, NIP, atau unit kerja..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>


            <div>

              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value)
                }
                className="filter-select"
              >

                <option value="semua">
                  Semua
                </option>

                <option value="pns">
                  PNS
                </option>

                <option value="pppk">
                  PPPK
                </option>

                <option value="non_asn">
                  Non-ASN
                </option>

              </select>

              <button
                className="secondary-button"
                onClick={fetchEmployees}
                disabled={loading}
                style={{
                  marginLeft: "10px",
                }}
              >
                {loading ? "Memuat..." : "⟳ Refresh"}
              </button>

            </div>

          </div>


          {/* =========================
              TABLE
          ========================= */}

          <div className="employee-table-wrapper">

            <table className="employee-table">

              <thead>

                <tr>

                  <th>
                    Pegawai
                  </th>

                  <th>
                    NIP
                  </th>

                  <th>
                    Unit Kerja
                  </th>

                  <th>
                    Jabatan
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Wajah
                  </th>

                  <th>
                    Aktivasi Presensi
                  </th>

                  <th>
                    Aksi
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="8"
                      className="empty-state"
                    >
                      Memuat data pegawai...
                    </td>

                  </tr>

                ) : filteredEmployees.length > 0 ? (

                  filteredEmployees.map((employee) => {

                    const name =
                      employee.name ||
                      employee.nama ||
                      "-";

                    const nip =
                      employee.nip ||
                      "-";

                    const unit =
                      employee.work_unit?.name ||
                      employee.unit ||
                      employee.unit_kerja ||
                      employee.unitKerja ||
                      "-";

                    const position =
                      employee.structural_position?.name ||
                      employee.position ||
                      employee.jabatan ||
                      "-";

                    const employeeType =
                      employee.employee_type ||
                      employee.jenis_pegawai ||
                      "-";

                    const employeeStatus =
                      employee.is_active === false || employee.deleted_at
                        ? "Nonaktif"
                        : "Aktif";

                    const face = hasFaceEnrollment(employee)
                      ? "Terdaftar"
                      : "Belum";

                    const attendanceActive = employee.attendance_active === true;
                    const linkedUser = employee.linked_user || null;
                    const linkedRoles = Array.isArray(linkedUser?.roles) ? linkedUser.roles : [];
                    const isMobileEmployee = linkedUser?.is_mobile_user === true || linkedRoles.includes("employee");

                    return (

                      <tr
                        key={
                          employee.id ||
                          employee.nip ||
                          name
                        }
                      >

                        {/* PEGAWAI */}

                        <td>

                          <div className="employee-name">

                            <div className="employee-avatar">

                              {name
                                .charAt(0)
                                .toUpperCase()}

                            </div>

                            <div>

                              <strong>
                                {name}
                              </strong>

                              <span>
                                {employeeType}
                              </span>

                            </div>

                          </div>

                        </td>


                        {/* NIP */}

                        <td>
                          {nip}
                        </td>


                        {/* UNIT */}

                        <td>
                          {unit}
                        </td>


                        {/* JABATAN */}

                        <td>
                          {position}
                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`status-pill ${
                              employeeStatus
                                .toLowerCase()
                                .replace(/\s+/g, "-")
                            }`}
                          >
                            {employeeStatus}
                          </span>

                        </td>


                        {/* WAJAH */}

                        <td>

                          <span
                            className={
                              face === "Terdaftar"
                                ? "face-status registered"
                                : "face-status unregistered"
                            }
                          >
                            {face}
                          </span>

                        </td>

                        <td>
                          {isMobileEmployee ? (
                            <button
                              className={`face-status action-face-status ${
                                attendanceActive ? "registered" : "unregistered"
                              }`}
                              type="button"
                              onClick={() => handleToggleAttendance(employee)}
                              disabled={!canEdit || updatingAttendanceId === employee.id}
                              title={attendanceActive ? "Nonaktifkan akun dari presensi dan alpha otomatis" : "Aktifkan akun untuk presensi dan alpha otomatis"}
                            >
                              {updatingAttendanceId === employee.id
                                ? "Memproses..."
                                : attendanceActive
                                ? "Akun aktif"
                                : "Aktifkan akun"}
                            </button>
                          ) : (
                            <span
                              className="face-status unregistered"
                              title={linkedUser ? "Akun ini tidak memiliki role employee/mobile" : "Pegawai ini belum tertaut ke akun user"}
                            >
                              {linkedUser ? "Web only" : "Belum tertaut"}
                            </span>
                          )}
                        </td>


                        {/* AKSI */}

                        <td>

                          <div className="employee-row-actions">
                            <button
                              className="action-button"
                              onClick={() => navigate(`/pegawai/${employee.id}`)}
                            >
                              Detail
                            </button>

                            {canEdit && (
                              <button
                                className="action-button"
                                onClick={() => openEdit(employee)}
                              >
                                Edit
                              </button>
                            )}

                            {canDelete && (
                              <button
                                className="action-button danger-action"
                                onClick={() => handleDelete(employee)}
                                disabled={deletingId === employee.id}
                              >
                                {deletingId === employee.id ? "..." : "Hapus"}
                              </button>
                            )}
                          </div>

                        </td>

                      </tr>

                    );
                  })

                ) : (

                  <tr>

                    <td
                      colSpan="8"
                      className="empty-state"
                    >
                      Belum ada data pegawai.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>


          {/* =========================
              FOOTER
          ========================= */}

          <div className="table-footer">

            <span>

              Menampilkan{" "}
              {filteredEmployees.length}{" "}
              dari{" "}
              {employees.length}{" "}
              data

            </span>

          </div>

        </section>

        {editingEmployee && (
          <div className="modal-overlay">
            <div className="employee-modal employee-edit-modal">
              <div className="modal-header">
                <div>
                  <h3>Edit Pegawai</h3>
                  <p>Perbarui data pegawai dan akun login yang tertaut.</p>
                </div>
                <button
                  className="modal-close"
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveEdit}>
                <div className="form-grid">
                  <div className="form-field full-width">
                    <label htmlFor="edit-name">Nama Lengkap</label>
                    <input
                      id="edit-name"
                      value={editingEmployee.name || ""}
                      onChange={(event) => handleEditChange("name", event.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-nip">NIP</label>
                    <input
                      id="edit-nip"
                      value={editingEmployee.nip || ""}
                      onChange={(event) => handleEditChange("nip", event.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-nik">NIK</label>
                    <input
                      id="edit-nik"
                      value={editingEmployee.nik || ""}
                      onChange={(event) => handleEditChange("nik", event.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-email">Email</label>
                    <input
                      id="edit-email"
                      type="email"
                      value={editingEmployee.email || ""}
                      onChange={(event) => handleEditChange("email", event.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-phone">No. HP</label>
                    <input
                      id="edit-phone"
                      value={editingEmployee.phone || ""}
                      onChange={(event) => handleEditChange("phone", event.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-employment-status">Status Kepegawaian</label>
                    <select
                      id="edit-employment-status"
                      value={editingEmployee.employment_status || "pns"}
                      onChange={(event) => handleEditChange("employment_status", event.target.value)}
                    >
                      <option value="pns">PNS</option>
                      <option value="pppk">PPPK</option>
                      <option value="non_asn">Non-ASN</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-employee-type">Jenis Pegawai</label>
                    <select
                      id="edit-employee-type"
                      value={editingEmployee.employee_type || "dosen"}
                      onChange={(event) => handleEditChange("employee_type", event.target.value)}
                    >
                      <option value="dosen">Dosen</option>
                      <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-gender">Jenis Kelamin</label>
                    <select
                      id="edit-gender"
                      value={editingEmployee.gender || "L"}
                      onChange={(event) => handleEditChange("gender", event.target.value)}
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-tmt">TMT</label>
                    <input
                      id="edit-tmt"
                      type="date"
                      value={editingEmployee.tmt || ""}
                      onChange={(event) => handleEditChange("tmt", event.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field full-width">
                    <label htmlFor="edit-work-unit">Unit Kerja</label>
                    <select
                      id="edit-work-unit"
                      value={editingEmployee.work_unit_id || ""}
                      onChange={(event) => handleEditChange("work_unit_id", event.target.value)}
                      required
                    >
                      <option value="">Pilih unit kerja</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.code ? `${unit.code} - ` : ""}{unit.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field full-width">
                    <label htmlFor="edit-position">Jabatan Struktural</label>
                    <select
                      id="edit-position"
                      value={editingEmployee.structural_position_id || ""}
                      onChange={(event) => handleEditChange("structural_position_id", event.target.value)}
                      disabled={editingEmployee.employee_type !== "dosen"}
                    >
                      <option value="">Tidak ada jabatan struktural</option>
                      {positions.filter((position) => position.is_active !== false).map((position) => (
                        <option key={position.id} value={position.id}>
                          {position.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-grade">Golongan</label>
                    <input
                      id="edit-grade"
                      value={editingEmployee.grade || ""}
                      onChange={(event) => handleEditChange("grade", event.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-rank">Pangkat</label>
                    <input
                      id="edit-rank"
                      value={editingEmployee.rank || ""}
                      onChange={(event) => handleEditChange("rank", event.target.value)}
                    />
                  </div>
                </div>

                <div className="form-section-title compact">
                  <div>
                    <strong>Akun Login Pegawai</strong>
                    <span>Isi password hanya jika ingin mengganti password.</span>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="edit-username">Username</label>
                    <input
                      id="edit-username"
                      value={editingEmployee.username || ""}
                      onChange={(event) => handleEditChange("username", event.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-password">Password Baru</label>
                    <input
                      id="edit-password"
                      type="password"
                      value={editingEmployee.password || ""}
                      onChange={(event) => handleEditChange("password", event.target.value)}
                      placeholder="Kosongkan jika tidak diganti"
                    />
                  </div>
                </div>

                <label className="form-checkbox edit-active-checkbox">
                  <input
                    type="checkbox"
                    checked={editingEmployee.is_active !== false}
                    onChange={(event) => handleEditChange("is_active", event.target.checked)}
                  />
                  Pegawai aktif
                </label>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setEditingEmployee(null)}
                    disabled={savingEdit}
                  >
                    Batal
                  </button>
                  <button className="primary-button" type="submit" disabled={savingEdit}>
                    {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
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

export default Pegawai;