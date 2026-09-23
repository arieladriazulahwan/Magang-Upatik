import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import {
  deleteEmployee,
  getEmployees,
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
  const [deletingId, setDeletingId] = useState(null);




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


  useEffect(() => {
    fetchEmployees();
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





  return (
    <AdminLayout>

      <div className="pegawai-page">



        <div className="page-heading">

          <div>

            <h2>
              Data Pegawai
            </h2>

            <p>
              Kelola master data pegawai Universitas Tadulako
            </p>

          </div>

        </div>




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




        <section className="data-panel">



          <div className="data-toolbar">

            <div className="search-box">

              <span>
                Cari
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
                className="secondary-button employee-refresh-button"
                onClick={fetchEmployees}
                disabled={loading}
              >
                {loading ? "Memuat..." : "Refresh"}
              </button>

              {canCreateEmployee && <button
                className="primary-button"
                onClick={() =>
                  navigate("/pegawai/tambah")
                }
              >
                + Tambah Pegawai
              </button>}

              <button
                className="secondary-button employee-toolbar-refresh"
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
                    Unit Presensi
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
                      colSpan="9"
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

                    const currentUnit =
                      employee.current_unit?.name ||
                      employee.currentUnit?.name ||
                      unit;

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




                        <td>
                          {nip}
                        </td>




                        <td>
                          {unit}
                        </td>

                        <td>
                          <strong className="schedule-name">{currentUnit}</strong>
                          {currentUnit !== unit && (
                            <span className="field-hint">Unit aktif absen masuk</span>
                          )}
                        </td>




                        <td>
                          {position}
                        </td>




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
                                onClick={() => navigate(`/pegawai/${employee.id}/edit`)}
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
                      colSpan="9"
                      className="empty-state"
                    >
                      Belum ada data pegawai.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>




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

      </div>

    </AdminLayout>
  );
}

export default Pegawai;