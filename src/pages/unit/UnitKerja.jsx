import { useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";

const initialUnits = [
  {
    id: 1,
    code: "FT",
    name: "Fakultas Teknik",
    head: "Dr. Andi Wijaya, S.T., M.T.",
    employees: 386,
    workMode: "Hybrid",
    status: "Aktif",
  },
  {
    id: 2,
    code: "FE",
    name: "Fakultas Ekonomi",
    head: "Dr. Siti Rahma, S.E., M.Si.",
    employees: 324,
    workMode: "Hybrid",
    status: "Aktif",
  },
  {
    id: 3,
    code: "FH",
    name: "Fakultas Hukum",
    head: "Dr. Budi Santoso, S.H., M.H.",
    employees: 287,
    workMode: "WFO",
    status: "Aktif",
  },
  {
    id: 4,
    code: "FK",
    name: "Fakultas Kedokteran",
    head: "Dr. Nur Aisyah, M.Kes.",
    employees: 215,
    workMode: "WFO",
    status: "Aktif",
  },
  {
    id: 5,
    code: "UPT-TI",
    name: "UPT Teknologi Informasi",
    head: "Rizky Pratama, S.Kom., M.Kom.",
    employees: 94,
    workMode: "Hybrid",
    status: "Aktif",
  },
];

function UnitKerja() {
  const [units, setUnits] = useState(initialUnits);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("Semua Status");

  const [showModal, setShowModal] =
    useState(false);

  const filteredUnits = units.filter((unit) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      unit.name.toLowerCase().includes(keyword) ||
      unit.code.toLowerCase().includes(keyword) ||
      unit.head.toLowerCase().includes(keyword);

    const matchStatus =
      statusFilter === "Semua Status" ||
      unit.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleAddUnit = (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    const newUnit = {
      id: units.length + 1,
      code: form.get("code").toUpperCase(),
      name: form.get("name"),
      head: form.get("head"),
      employees: 0,
      workMode: form.get("workMode"),
      status: "Aktif",
    };

    setUnits([
      ...units,
      newUnit,
    ]);

    setShowModal(false);
  };

  return (
    <AdminLayout>

      <div className="unit-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>
            <h2>Unit Kerja</h2>

            <p>
              Kelola struktur organisasi dan mode kerja unit
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => setShowModal(true)}
          >
            + Tambah Unit
          </button>

        </div>

        {/* SUMMARY */}

        <div className="unit-summary">

          <div className="summary-card">
            <span>Total Unit Kerja</span>
            <strong>{units.length}</strong>
          </div>

          <div className="summary-card">
            <span>Unit Aktif</span>
            <strong>
              {units.filter(
                (unit) => unit.status === "Aktif"
              ).length}
            </strong>
          </div>

          <div className="summary-card">
            <span>Mode Hybrid</span>
            <strong>
              {units.filter(
                (unit) => unit.workMode === "Hybrid"
              ).length}
            </strong>
          </div>

          <div className="summary-card">
            <span>Total Pegawai</span>
            <strong>
              {units
                .reduce(
                  (total, unit) =>
                    total + unit.employees,
                  0
                )
                .toLocaleString("id-ID")}
            </strong>
          </div>

        </div>

        {/* DATA */}

        <section className="data-panel">

          <div className="data-toolbar">

            <div className="search-box">

              <span>⌕</span>

              <input
                type="text"
                placeholder="Cari unit kerja atau pimpinan..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option>Semua Status</option>
              <option>Aktif</option>
              <option>Nonaktif</option>
            </select>

          </div>

          <div className="employee-table-wrapper">

            <table className="employee-table unit-table">

              <thead>

                <tr>
                  <th>Kode</th>
                  <th>Unit Kerja</th>
                  <th>Pimpinan</th>
                  <th>Pegawai</th>
                  <th>Mode Kerja</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>

              </thead>

              <tbody>

                {filteredUnits.map((unit) => (

                  <tr key={unit.id}>

                    <td>
                      <span className="unit-code">
                        {unit.code}
                      </span>
                    </td>

                    <td>
                      <strong className="unit-name">
                        {unit.name}
                      </strong>
                    </td>

                    <td>
                      {unit.head}
                    </td>

                    <td>
                      <strong>
                        {unit.employees}
                      </strong>
                    </td>

                    <td>

                      <span
                        className={`work-mode ${unit.workMode
                          .toLowerCase()
                          .replace("-", "")}`}
                      >
                        {unit.workMode}
                      </span>

                    </td>

                    <td>

                      <span className="status-pill active">
                        {unit.status}
                      </span>

                    </td>

                    <td>

                      <button className="action-button">
                        Detail
                      </button>

                      <button className="action-button">
                        Edit
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

            {filteredUnits.length === 0 && (
              <div className="empty-state">
                Unit kerja tidak ditemukan.
              </div>
            )}

          </div>

          <div className="table-footer">

            <span>
              Menampilkan {filteredUnits.length} unit kerja
            </span>

            <div className="pagination">
              <button>‹</button>
              <button className="current">1</button>
              <button>2</button>
              <button>›</button>
            </div>

          </div>

        </section>

      </div>

      {/* MODAL */}

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
                <h3>Tambah Unit Kerja</h3>

                <p>
                  Tambahkan unit kerja baru
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

            <form onSubmit={handleAddUnit}>

              <div className="form-grid">

                <div className="form-field">

                  <label>Kode Unit</label>

                  <input
                    name="code"
                    required
                    placeholder="Contoh: FT"
                  />

                </div>

                <div className="form-field">

                  <label>Nama Unit Kerja</label>

                  <input
                    name="name"
                    required
                    placeholder="Nama unit kerja"
                  />

                </div>

                <div className="form-field">

                  <label>Pimpinan Unit</label>

                  <input
                    name="head"
                    required
                    placeholder="Nama pimpinan"
                  />

                </div>

                <div className="form-field">

                  <label>Mode Kerja</label>

                  <select name="workMode">

                    <option value="WFO">
                      WFO
                    </option>

                    <option value="Hybrid">
                      Hybrid
                    </option>

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
                  Simpan Unit
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </AdminLayout>
  );
}

export default UnitKerja;