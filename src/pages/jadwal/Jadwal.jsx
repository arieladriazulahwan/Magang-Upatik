import { useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";

const initialSchedules = [
  {
    id: 1,
    code: "REG",
    name: "Jam Kerja Reguler",
    unit: "Semua Unit",
    masuk: "08:00",
    pulang: "16:00",
    tolerance: "15 menit",
    workDays: "Senin - Jumat",
    status: "Aktif",
  },
  {
    id: 2,
    code: "PAGI",
    name: "Shift Pagi",
    unit: "UPT Teknologi Informasi",
    masuk: "07:00",
    pulang: "15:00",
    tolerance: "10 menit",
    workDays: "Senin - Sabtu",
    status: "Aktif",
  },
  {
    id: 3,
    code: "SIANG",
    name: "Shift Siang",
    unit: "UPT Teknologi Informasi",
    masuk: "15:00",
    pulang: "23:00",
    tolerance: "10 menit",
    workDays: "Senin - Sabtu",
    status: "Aktif",
  },
  {
    id: 4,
    code: "KHUSUS",
    name: "Jam Kerja Khusus",
    unit: "Fakultas Teknik",
    masuk: "08:30",
    pulang: "16:30",
    tolerance: "15 menit",
    workDays: "Senin - Jumat",
    status: "Aktif",
  },
];

function Jadwal() {
  const [schedules, setSchedules] =
    useState(initialSchedules);

  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] =
    useState("Semua Unit");

  const [showModal, setShowModal] =
    useState(false);

  const filteredSchedules = schedules.filter(
    (item) => {
      const keyword =
        search.toLowerCase();

      const matchSearch =
        item.name
          .toLowerCase()
          .includes(keyword) ||
        item.code
          .toLowerCase()
          .includes(keyword);

      const matchUnit =
        unitFilter === "Semua Unit" ||
        item.unit === unitFilter ||
        item.unit === "Semua Unit";

      return (
        matchSearch &&
        matchUnit
      );
    }
  );

  const handleAddSchedule = (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    const newSchedule = {
      id: schedules.length + 1,
      code: form
        .get("code")
        .toUpperCase(),
      name: form.get("name"),
      unit: form.get("unit"),
      masuk: form.get("masuk"),
      pulang: form.get("pulang"),
      tolerance:
        form.get("tolerance") +
        " menit",
      workDays: form.get("workDays"),
      status: "Aktif",
    };

    setSchedules([
      ...schedules,
      newSchedule,
    ]);

    setShowModal(false);
  };

  return (
    <AdminLayout>

      <div className="schedule-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>
            <h2>Shift & Jadwal</h2>

            <p>
              Pengaturan jam kerja dan jadwal presensi pegawai
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() =>
              setShowModal(true)
            }
          >
            + Tambah Jadwal
          </button>

        </div>

        {/* SHIFT CARDS */}

        <div className="shift-cards">

          <div className="shift-card">

            <div className="shift-card-top">
              <span className="shift-code">
                REG
              </span>

              <span className="status-pill active">
                Aktif
              </span>
            </div>

            <h3>
              Jam Kerja Reguler
            </h3>

            <div className="shift-time">
              <strong>08:00</strong>
              <span>—</span>
              <strong>16:00</strong>
            </div>

            <p>
              Senin - Jumat
            </p>

          </div>

          <div className="shift-card">

            <div className="shift-card-top">
              <span className="shift-code">
                PAGI
              </span>

              <span className="status-pill active">
                Aktif
              </span>
            </div>

            <h3>
              Shift Pagi
            </h3>

            <div className="shift-time">
              <strong>07:00</strong>
              <span>—</span>
              <strong>15:00</strong>
            </div>

            <p>
              Senin - Sabtu
            </p>

          </div>

          <div className="shift-card">

            <div className="shift-card-top">
              <span className="shift-code">
                SIANG
              </span>

              <span className="status-pill active">
                Aktif
              </span>
            </div>

            <h3>
              Shift Siang
            </h3>

            <div className="shift-time">
              <strong>15:00</strong>
              <span>—</span>
              <strong>23:00</strong>
            </div>

            <p>
              Senin - Sabtu
            </p>

          </div>

        </div>

        {/* DATA PANEL */}

        <section className="data-panel">

          <div className="schedule-panel-header">

            <div>
              <h3>
                Daftar Jadwal Kerja
              </h3>

              <p>
                Jadwal yang digunakan oleh unit kerja
              </p>
            </div>

          </div>

          <div className="data-toolbar">

            <div className="search-box">

              <span>⌕</span>

              <input
                type="text"
                placeholder="Cari nama atau kode jadwal..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>

            <select
              className="filter-select"
              value={unitFilter}
              onChange={(e) =>
                setUnitFilter(
                  e.target.value
                )
              }
            >
              <option>
                Semua Unit
              </option>

              <option>
                Fakultas Teknik
              </option>

              <option>
                Fakultas Ekonomi
              </option>

              <option>
                Fakultas Hukum
              </option>

              <option>
                UPT Teknologi Informasi
              </option>
            </select>

          </div>

          {/* TABLE */}

          <div className="employee-table-wrapper">

            <table className="employee-table schedule-table">

              <thead>

                <tr>
                  <th>Kode</th>
                  <th>Nama Jadwal</th>
                  <th>Unit Kerja</th>
                  <th>Jam Masuk</th>
                  <th>Jam Pulang</th>
                  <th>Toleransi</th>
                  <th>Hari Kerja</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>

              </thead>

              <tbody>

                {filteredSchedules.map(
                  (item) => (

                    <tr key={item.id}>

                      <td>

                        <span className="unit-code">
                          {item.code}
                        </span>

                      </td>

                      <td>

                        <strong className="schedule-name">
                          {item.name}
                        </strong>

                      </td>

                      <td>
                        {item.unit}
                      </td>

                      <td>

                        <span className="schedule-time">
                          {item.masuk}
                        </span>

                      </td>

                      <td>

                        <span className="schedule-time">
                          {item.pulang}
                        </span>

                      </td>

                      <td>
                        {item.tolerance}
                      </td>

                      <td>
                        {item.workDays}
                      </td>

                      <td>

                        <span className="status-pill active">
                          {item.status}
                        </span>

                      </td>

                      <td>

                        <button className="action-button">
                          Edit
                        </button>

                        <button className="action-button">
                          Detail
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

            {filteredSchedules.length === 0 && (
              <div className="empty-state">
                Jadwal tidak ditemukan.
              </div>
            )}

          </div>

          <div className="table-footer">

            <span>
              Menampilkan{" "}
              {filteredSchedules.length}{" "}
              jadwal
            </span>

            <div className="pagination">
              <button>‹</button>
              <button className="current">
                1
              </button>
              <button>2</button>
              <button>›</button>
            </div>

          </div>

        </section>

      </div>

      {/* MODAL TAMBAH JADWAL */}

      {showModal && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowModal(false)
          }
        >

          <div
            className="employee-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <h3>
                  Tambah Jadwal Kerja
                </h3>

                <p>
                  Buat jadwal kerja baru
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
              onSubmit={
                handleAddSchedule
              }
            >

              <div className="form-grid">

                <div className="form-field">

                  <label>
                    Kode Jadwal
                  </label>

                  <input
                    name="code"
                    required
                    placeholder="Contoh: REG"
                  />

                </div>

                <div className="form-field">

                  <label>
                    Nama Jadwal
                  </label>

                  <input
                    name="name"
                    required
                    placeholder="Nama jadwal"
                  />

                </div>

                <div className="form-field">

                  <label>
                    Unit Kerja
                  </label>

                  <select name="unit">

                    <option>
                      Semua Unit
                    </option>

                    <option>
                      Fakultas Teknik
                    </option>

                    <option>
                      Fakultas Ekonomi
                    </option>

                    <option>
                      Fakultas Hukum
                    </option>

                    <option>
                      UPT Teknologi Informasi
                    </option>

                  </select>

                </div>

                <div className="form-field">

                  <label>
                    Toleransi Keterlambatan
                  </label>

                  <input
                    name="tolerance"
                    type="number"
                    min="0"
                    defaultValue="15"
                    required
                  />

                </div>

                <div className="form-field">

                  <label>
                    Jam Masuk
                  </label>

                  <input
                    name="masuk"
                    type="time"
                    defaultValue="08:00"
                    required
                  />

                </div>

                <div className="form-field">

                  <label>
                    Jam Pulang
                  </label>

                  <input
                    name="pulang"
                    type="time"
                    defaultValue="16:00"
                    required
                  />

                </div>

                <div className="form-field">

                  <label>
                    Hari Kerja
                  </label>

                  <select name="workDays">

                    <option>
                      Senin - Jumat
                    </option>

                    <option>
                      Senin - Sabtu
                    </option>

                    <option>
                      Senin - Minggu
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
                  Simpan Jadwal
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </AdminLayout>
  );
}

export default Jadwal;