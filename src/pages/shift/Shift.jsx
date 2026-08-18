import { useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";

const initialShifts = [
  {
    id: 1,
    code: "PAGI",
    name: "Shift Pagi",
    unit: "UPT Teknologi Informasi",
    masuk: "07:00",
    pulang: "15:00",
    istirahat: "1 jam",
    workDays: "Senin - Sabtu",
    status: "Aktif",
  },
  {
    id: 2,
    code: "SIANG",
    name: "Shift Siang",
    unit: "UPT Teknologi Informasi",
    masuk: "15:00",
    pulang: "23:00",
    istirahat: "1 jam",
    workDays: "Senin - Sabtu",
    status: "Aktif",
  },
  {
    id: 3,
    code: "MALAM",
    name: "Shift Malam",
    unit: "Instalasi Rawat Inap",
    masuk: "23:00",
    pulang: "07:00",
    istirahat: "1 jam",
    workDays: "Senin - Jumat",
    status: "Aktif",
  },
  {
    id: 4,
    code: "REG",
    name: "Jam Kerja Reguler",
    unit: "Semua Unit",
    masuk: "08:00",
    pulang: "16:00",
    istirahat: "1 jam",
    workDays: "Senin - Jumat",
    status: "Aktif",
  },
];

function Shift() {
  const [shifts, setShifts] = useState(initialShifts);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("Semua Unit");
  const [showModal, setShowModal] = useState(false);

  const filteredShifts = shifts.filter((item) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      item.name.toLowerCase().includes(keyword) ||
      item.code.toLowerCase().includes(keyword) ||
      item.unit.toLowerCase().includes(keyword);

    const matchUnit =
      unitFilter === "Semua Unit" ||
      item.unit === unitFilter ||
      item.unit === "Semua Unit";

    return matchSearch && matchUnit;
  });

  const handleAddShift = (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    const newShift = {
      id: shifts.length + 1,
      code: form.get("code").toUpperCase(),
      name: form.get("name"),
      unit: form.get("unit"),
      masuk: form.get("masuk"),
      pulang: form.get("pulang"),
      istirahat: `${form.get("istirahat")} jam`,
      workDays: form.get("workDays"),
      status: "Aktif",
    };

    setShifts([...shifts, newShift]);
    setShowModal(false);
  };

  return (
    <AdminLayout>
      <div className="schedule-page">
        <div className="page-heading">
          <div>
            <h2>Shift Kerja</h2>
            <p>Kelola jadwal kerja dan pola dinas pegawai</p>
          </div>

          <button
            className="primary-button"
            onClick={() => setShowModal(true)}
          >
            + Tambah Shift
          </button>
        </div>

        <div className="shift-cards">
          {shifts.slice(0, 3).map((item) => (
            <div className="shift-card" key={item.id}>
              <div className="shift-card-top">
                <span className="shift-code">{item.code}</span>
                <span className="status-pill active">{item.status}</span>
              </div>

              <h3>{item.name}</h3>

              <div className="shift-time">
                <strong>{item.masuk}</strong>
                <span>—</span>
                <strong>{item.pulang}</strong>
              </div>

              <p>{item.workDays}</p>
            </div>
          ))}
        </div>

        <section className="data-panel">
          <div className="schedule-panel-header">
            <div>
              <h3>Daftar Shift</h3>
              <p>Informasi pola kerja yang berlaku di setiap unit</p>
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

            <select
              className="filter-select"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option>Semua Unit</option>
              <option>Fakultas Teknik</option>
              <option>Fakultas Ekonomi</option>
              <option>Fakultas Hukum</option>
              <option>UPT Teknologi Informasi</option>
              <option>Instalasi Rawat Inap</option>
            </select>
          </div>

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
                {filteredShifts.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="unit-code">{item.code}</span>
                    </td>

                    <td>
                      <strong className="schedule-name">{item.name}</strong>
                    </td>

                    <td>{item.unit}</td>

                    <td>
                      <span className="schedule-time">{item.masuk}</span>
                    </td>

                    <td>
                      <span className="schedule-time">{item.pulang}</span>
                    </td>

                    <td>{item.istirahat}</td>

                    <td>{item.workDays}</td>

                    <td>
                      <span className="status-pill active">{item.status}</span>
                    </td>

                    <td>
                      <button className="action-button">Edit</button>
                      <button className="action-button">Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredShifts.length === 0 && (
              <div className="empty-state">Shift tidak ditemukan.</div>
            )}
          </div>

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
          onClick={() => setShowModal(false)}
        >
          <div
            className="employee-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Tambah Shift Kerja</h3>
                <p>Buat pola kerja baru untuk unit terkait</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddShift}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Kode Shift</label>
                  <input name="code" required placeholder="Contoh: PAGI" />
                </div>

                <div className="form-field">
                  <label>Nama Shift</label>
                  <input name="name" required placeholder="Nama shift" />
                </div>

                <div className="form-field">
                  <label>Unit Kerja</label>
                  <select name="unit">
                    <option>Semua Unit</option>
                    <option>Fakultas Teknik</option>
                    <option>Fakultas Ekonomi</option>
                    <option>Fakultas Hukum</option>
                    <option>UPT Teknologi Informasi</option>
                    <option>Instalasi Rawat Inap</option>
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
                  <label>Durasi Istirahat</label>
                  <input
                    name="istirahat"
                    type="number"
                    min="0"
                    defaultValue="1"
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Hari Kerja</label>
                  <select name="workDays">
                    <option>Senin - Jumat</option>
                    <option>Senin - Sabtu</option>
                    <option>Senin - Minggu</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>

                <button type="submit" className="primary-button">
                  Simpan Shift
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
