import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { canAddEmployee, canEditEmployee } from "../../utils/access";

function Pegawai() {
  const navigate = useNavigate();
  const canCreateEmployee = canAddEmployee();
  const canEdit = canEditEmployee();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Semua");
  const [loading, setLoading] = useState(true);

  // =========================
  // AMBIL DATA PEGAWAI
  // =========================

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      const response = await apiRequest("/employees");

      console.log("Response pegawai:", response);

      /*
       * Menyesuaikan beberapa kemungkinan
       * bentuk response dari backend.
       */

      if (Array.isArray(response)) {
        setEmployees(response);
      } else if (Array.isArray(response.data)) {
        setEmployees(response.data);
      } else {
        setEmployees([]);
      }

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
      employee.unit ||
      employee.unit_kerja ||
      employee.unitKerja ||
      "";

    const employeeType =
      employee.type ||
      employee.jenis_kepegawaian ||
      employee.jenis_kepegawaian ||
      "";

    const matchesSearch =
      name.toLowerCase().includes(keyword) ||
      nip.toLowerCase().includes(keyword) ||
      unit.toLowerCase().includes(keyword);

    const matchesType =
      type === "Semua" ||
      employeeType === type;

    return matchesSearch && matchesType;
  });


  // =========================
  // HITUNG SUMMARY
  // =========================

  const totalEmployees = employees.length;

  const totalPNS = employees.filter(
    (employee) =>
      (employee.type ||
        employee.jenis_kepegawaian ||
        "") === "PNS"
  ).length;

  const totalPPPK = employees.filter(
    (employee) =>
      (employee.type ||
        employee.jenis_kepegawaian ||
        "") === "PPPK"
  ).length;

  const totalNonASN = employees.filter(
    (employee) =>
      (employee.type ||
        employee.jenis_kepegawaian ||
        "") === "Non-ASN"
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

                <option value="Semua">
                  Semua
                </option>

                <option value="PNS">
                  PNS
                </option>

                <option value="PPPK">
                  PPPK
                </option>

                <option value="Non-ASN">
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
                    Aksi
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="7"
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
                      employee.unit ||
                      employee.unit_kerja ||
                      employee.unitKerja ||
                      "-";

                    const position =
                      employee.position ||
                      employee.jabatan ||
                      "-";

                    const employeeType =
                      employee.type ||
                      employee.jenis_kepegawaian ||
                      "-";

                    const employeeStatus =
                      employee.status ||
                      "Aktif";

                    const face =
                      employee.face ||
                      employee.face_status ||
                      "Belum";

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


                        {/* AKSI */}

                        <td>

                          {canEdit ? (
                            <>
                              <button
                                className="action-button"
                                onClick={() =>
                                  navigate(
                                    `/pegawai/${employee.id}`
                                  )
                                }
                              >
                                Detail
                              </button>

                              <button
                                className="action-button"
                                onClick={() =>
                                  console.log(
                                    "Menu pegawai:",
                                    employee
                                  )
                                }
                              >
                                ⋮
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#999" }}>Tidak ada aksi</span>
                          )}

                        </td>

                      </tr>

                    );
                  })

                ) : (

                  <tr>

                    <td
                      colSpan="7"
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

      </div>

    </AdminLayout>
  );
}

export default Pegawai;
