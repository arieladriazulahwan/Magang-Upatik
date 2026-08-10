import { useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";

const initialEmployees = [
  {
    id: "PGW-001",
    name: "Andi Saputra",
    nip: "198501012010011001",
    unit: "Fakultas Teknik",
    position: "Dosen",
    type: "PNS",
    face: "Terdaftar",
    status: "Aktif",
  },
  {
    id: "PGW-002",
    name: "Siti Rahma",
    nip: "198704152012022002",
    unit: "Fakultas Ekonomi",
    position: "Dosen",
    type: "PNS",
    face: "Terdaftar",
    status: "Aktif",
  },
  {
    id: "PGW-003",
    name: "Budi Santoso",
    nip: "199001102019031003",
    unit: "UPT Teknologi Informasi",
    position: "Staff",
    type: "PPPK",
    face: "Belum",
    status: "Aktif",
  },
  {
    id: "PGW-004",
    name: "Dewi Lestari",
    nip: "199205202021042004",
    unit: "Fakultas Hukum",
    position: "Staff",
    type: "Non-ASN",
    face: "Terdaftar",
    status: "Aktif",
  },
];

function Pegawai() {
  const [employees, setEmployees] =
    useState(initialEmployees);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("Semua");
  const [showModal, setShowModal] = useState(false);

  const filteredEmployees = employees.filter((employee) => {
    const keyword = search.toLowerCase();

    const matchesSearch =
      employee.name.toLowerCase().includes(keyword) ||
      employee.nip.toLowerCase().includes(keyword) ||
      employee.unit.toLowerCase().includes(keyword);

    const matchesType =
      type === "Semua" ||
      employee.type === type;

    return matchesSearch && matchesType;
  });

  const handleAddEmployee = (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    const newEmployee = {
      id: `PGW-${String(employees.length + 1).padStart(3, "0")}`,
      name: form.get("name"),
      nip: form.get("nip"),
      unit: form.get("unit"),
      position: form.get("position"),
      type: form.get("type"),
      face: "Belum",
      status: "Aktif",
    };

    setEmployees([
      ...employees,
      newEmployee,
    ]);

    setShowModal(false);
  };

  return (
    <AdminLayout>

      <div className="pegawai-page">

        {/* PAGE HEADER */}

        <div className="page-heading">

          <div>
            <h2>Data Pegawai</h2>

            <p>
              Kelola master data pegawai Universitas Tadulako
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => setShowModal(true)}
          >
            + Tambah Pegawai
          </button>

        </div>

        {/* SUMMARY */}

        <div className="employee-summary">

          <div className="summary-card">
            <span>Total Pegawai</span>
            <strong>2.847</strong>
          </div>

          <div className="summary-card">
            <span>PNS</span>
            <strong>1.642</strong>
          </div>

          <div className="summary-card">
            <span>PPPK</span>
            <strong>728</strong>
          </div>

          <div className="summary-card">
            <span>Non-ASN</span>
            <strong>477</strong>
          </div>

        </div>

        {/* TABLE PANEL */}

        <section className="data-panel">

          <div className="data-toolbar">

            <div className="search-box">

              <span>⌕</span>

              <input
                type="text"
                placeholder="Cari nama, NIP, atau unit kerja..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value)
              }
              className="filter-select"
            >
              <option>Semua</option>
              <option>PNS</option>
              <option>PPPK</option>
              <option>Non-ASN</option>
            </select>

          </div>

          <div className="employee-table-wrapper">

            <table className="employee-table">

              <thead>
                <tr>
                  <th>Pegawai</th>
                  <th>NIP</th>
                  <th>Unit Kerja</th>
                  <th>Jabatan</th>
                  <th>Status</th>
                  <th>Wajah</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>

                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>

                    <td>
                      <div className="employee-name">
                        <div className="employee-avatar">
                          {employee.name.charAt(0)}
                        </div>

                        <div>
                          <strong>
                            {employee.name}
                          </strong>

                          <span>
                            {employee.type}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {employee.nip}
                    </td>

                    <td>
                      {employee.unit}
                    </td>

                    <td>
                      {employee.position}
                    </td>

                    <td>
                      <span className="status-pill active">
                        {employee.status}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          employee.face === "Terdaftar"
                            ? "face-status registered"
                            : "face-status unregistered"
                        }
                      >
                        {employee.face}
                      </span>
                    </td>

                    <td>
                      <button className="action-button">
                        Detail
                      </button>

                      <button className="action-button">
                        ⋮
                      </button>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

            {filteredEmployees.length === 0 && (
              <div className="empty-state">
                Data pegawai tidak ditemukan.
              </div>
            )}

          </div>

          <div className="table-footer">

            <span>
              Menampilkan {filteredEmployees.length} dari{" "}
              {employees.length} data
            </span>

            <div className="pagination">
              <button>‹</button>
              <button className="current">1</button>
              <button>2</button>
              <button>3</button>
              <button>›</button>
            </div>

          </div>

        </section>

      </div>

      {/* MODAL TAMBAH PEGAWAI */}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >

          <div
            className="employee-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">
              <div>
                <h3>Tambah Pegawai</h3>
                <p>
                  Masukkan data pegawai baru
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleAddEmployee}
            >

              <div className="form-grid">

                <div className="form-field">
                  <label>Nama Lengkap</label>
                  <input
                    name="name"
                    required
                    placeholder="Nama lengkap"
                  />
                </div>

                <div className="form-field">
                  <label>NIP</label>
                  <input
                    name="nip"
                    required
                    placeholder="Nomor Induk Pegawai"
                  />
                </div>

                <div className="form-field">
                  <label>Unit Kerja</label>
                  <input
                    name="unit"
                    required
                    placeholder="Unit kerja"
                  />
                </div>

                <div className="form-field">
                  <label>Jabatan</label>
                  <input
                    name="position"
                    required
                    placeholder="Jabatan"
                  />
                </div>

                <div className="form-field">
                  <label>Status Kepegawaian</label>

                  <select name="type">
                    <option>PNS</option>
                    <option>PPPK</option>
                    <option>Non-ASN</option>
                  </select>
                </div>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Simpan Pegawai
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </AdminLayout>
  );
}

export default Pegawai;