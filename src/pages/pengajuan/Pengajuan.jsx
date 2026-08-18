import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";

const initialSubmissions = [
  {
    id: 1,
    name: "Siti Rahma",
    nip: "198704152012022002",
    unit: "Fakultas Ekonomi",
    type: "Izin",
    startDate: "11 Agustus 2026",
    endDate: "11 Agustus 2026",
    reason: "Keperluan keluarga",
    submitted: "10 Agustus 2026, 14:20",
    status: "Menunggu",
  },
  {
    id: 2,
    name: "Budi Santoso",
    nip: "199001102019031003",
    unit: "UPT Teknologi Informasi",
    type: "Cuti",
    startDate: "17 Agustus 2026",
    endDate: "19 Agustus 2026",
    reason: "Cuti tahunan",
    submitted: "09 Agustus 2026, 10:15",
    status: "Menunggu",
  },
  {
    id: 3,
    name: "Dewi Lestari",
    nip: "199205202021042004",
    unit: "Fakultas Hukum",
    type: "Dinas",
    startDate: "12 Agustus 2026",
    endDate: "13 Agustus 2026",
    reason: "Perjalanan dinas luar kota",
    submitted: "08 Agustus 2026, 09:30",
    status: "Disetujui",
  },
  {
    id: 4,
    name: "Andi Saputra",
    nip: "198501012010011001",
    unit: "Fakultas Teknik",
    type: "Izin",
    startDate: "07 Agustus 2026",
    endDate: "07 Agustus 2026",
    reason: "Keperluan pribadi",
    submitted: "06 Agustus 2026, 15:10",
    status: "Ditolak",
  },
];

function Pengajuan() {
  const navigate = useNavigate();

  const [submissions, setSubmissions] =
    useState(initialSubmissions);

  const [search, setSearch] = useState("");

  const [typeFilter, setTypeFilter] =
    useState("Semua Jenis");

  const [statusFilter, setStatusFilter] =
    useState("Semua Status");

  const [showModal, setShowModal] =
    useState(false);

  // Filter data
  const filteredData = submissions.filter((item) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      item.name.toLowerCase().includes(keyword) ||
      item.nip.toLowerCase().includes(keyword);

    const matchType =
      typeFilter === "Semua Jenis" ||
      item.type === typeFilter;

    const matchStatus =
      statusFilter === "Semua Status" ||
      item.status === statusFilter;

    return (
      matchSearch &&
      matchType &&
      matchStatus
    );
  });

  // Tambah pengajuan
  const handleAddSubmission = (e) => {
    e.preventDefault();

    const form = new FormData(e.target);

    const newSubmission = {
      id:
        submissions.length > 0
          ? Math.max(
              ...submissions.map(
                (item) => item.id
              )
            ) + 1
          : 1,

      name: form.get("name"),
      nip: form.get("nip"),
      unit: form.get("unit"),
      type: form.get("type"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      reason: form.get("reason"),

      submitted:
        "11 Agustus 2026, sekarang",

      status: "Menunggu",
    };

    setSubmissions((prev) => [
      newSubmission,
      ...prev,
    ]);

    setShowModal(false);
  };

  return (
    <AdminLayout>

      <div className="submission-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>
            <h2>Pengajuan</h2>

            <p>
              Kelola pengajuan izin, cuti,
              dan dinas pegawai
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() =>
              setShowModal(true)
            }
          >
            + Buat Pengajuan
          </button>

        </div>

        {/* SUMMARY */}

        <div className="submission-summary">

          <div className="submission-card">

            <span>
              Total Pengajuan
            </span>

            <strong>
              {submissions.length}
            </strong>

          </div>

          <div className="submission-card waiting">

            <span>
              Menunggu
            </span>

            <strong>
              {
                submissions.filter(
                  (item) =>
                    item.status ===
                    "Menunggu"
                ).length
              }
            </strong>

          </div>

          <div className="submission-card approved">

            <span>
              Disetujui
            </span>

            <strong>
              {
                submissions.filter(
                  (item) =>
                    item.status ===
                    "Disetujui"
                ).length
              }
            </strong>

          </div>

          <div className="submission-card rejected">

            <span>
              Ditolak
            </span>

            <strong>
              {
                submissions.filter(
                  (item) =>
                    item.status ===
                    "Ditolak"
                ).length
              }
            </strong>

          </div>

        </div>

        {/* DATA */}

        <section className="data-panel">

          {/* TOOLBAR */}

          <div className="data-toolbar">

            <div className="search-box">

              <span>⌕</span>

              <input
                type="text"
                placeholder="Cari nama atau NIP..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />

            </div>

            <div className="submission-filters">

              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(
                    e.target.value
                  )
                }
              >

                <option>
                  Semua Jenis
                </option>

                <option>
                  Izin
                </option>

                <option>
                  Cuti
                </option>

                <option>
                  Dinas
                </option>

              </select>

              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
              >

                <option>
                  Semua Status
                </option>

                <option>
                  Menunggu
                </option>

                <option>
                  Disetujui
                </option>

                <option>
                  Ditolak
                </option>

              </select>

            </div>

          </div>

          {/* TABLE */}

          <div className="employee-table-wrapper">

            <table className="employee-table submission-table">

              <thead>

                <tr>
                  <th>Pegawai</th>
                  <th>Jenis</th>
                  <th>Tanggal</th>
                  <th>Alasan</th>
                  <th>Diajukan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>

              </thead>

              <tbody>

                {filteredData.map((item) => (

                  <tr key={item.id}>

                    {/* PEGAWAI */}

                    <td>

                      <div className="employee-name">

                        <div className="employee-avatar">
                          {item.name.charAt(0)}
                        </div>

                        <div>

                          <strong>
                            {item.name}
                          </strong>

                          <span>
                            {item.nip}
                          </span>

                        </div>

                      </div>

                    </td>

                    {/* JENIS */}

                    <td>

                      <span
                        className={`submission-type ${item.type.toLowerCase()}`}
                      >
                        {item.type}
                      </span>

                    </td>

                    {/* TANGGAL */}

                    <td>

                      <div className="submission-date">

                        <strong>
                          {item.startDate}
                        </strong>

                        {item.startDate !==
                          item.endDate && (
                          <span>
                            s/d {item.endDate}
                          </span>
                        )}

                      </div>

                    </td>

                    {/* ALASAN */}

                    <td>

                      <span className="reason-text">
                        {item.reason}
                      </span>

                    </td>

                    {/* DIAJUKAN */}

                    <td>
                      {item.submitted}
                    </td>

                    {/* STATUS */}

                    <td>

                      <span
                        className={`submission-status ${item.status
                          .toLowerCase()
                          .replace(
                            /\s+/g,
                            "-"
                          )}`}
                      >
                        {item.status}
                      </span>

                    </td>

                    {/* AKSI */}

                    <td>

                      <button
                        className="action-button"
                        onClick={() =>
                          navigate(
                            "/pengajuan/detail",
                            {
                              state: {
                                pengajuan: item,
                              },
                            }
                          )
                        }
                      >
                        Detail
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

            {filteredData.length === 0 && (

              <div className="empty-state">
                Pengajuan tidak ditemukan.
              </div>

            )}

          </div>

          {/* FOOTER */}

          <div className="table-footer">

            <span>
              Menampilkan{" "}
              {filteredData.length}{" "}
              pengajuan
            </span>

            <div className="pagination">

              <button>
                ‹
              </button>

              <button className="current">
                1
              </button>

              <button>
                2
              </button>

              <button>
                ›
              </button>

            </div>

          </div>

        </section>

      </div>

      {/* MODAL BUAT PENGAJUAN */}

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
                  Buat Pengajuan
                </h3>

                <p>
                  Tambahkan pengajuan izin,
                  cuti, atau dinas
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
                handleAddSubmission
              }
            >

              <div className="form-grid">

                {/* NAMA */}

                <div className="form-field">

                  <label>
                    Nama Pegawai
                  </label>

                  <input
                    name="name"
                    required
                    placeholder="Nama pegawai"
                  />

                </div>

                {/* NIP */}

                <div className="form-field">

                  <label>
                    NIP
                  </label>

                  <input
                    name="nip"
                    required
                    placeholder="Nomor Induk Pegawai"
                  />

                </div>

                {/* UNIT */}

                <div className="form-field">

                  <label>
                    Unit Kerja
                  </label>

                  <select name="unit">

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

                {/* JENIS */}

                <div className="form-field">

                  <label>
                    Jenis Pengajuan
                  </label>

                  <select name="type">

                    <option>
                      Izin
                    </option>

                    <option>
                      Cuti
                    </option>

                    <option>
                      Dinas
                    </option>

                  </select>

                </div>

                {/* TANGGAL MULAI */}

                <div className="form-field">

                  <label>
                    Tanggal Mulai
                  </label>

                  <input
                    name="startDate"
                    type="date"
                    required
                  />

                </div>

                {/* TANGGAL SELESAI */}

                <div className="form-field">

                  <label>
                    Tanggal Selesai
                  </label>

                  <input
                    name="endDate"
                    type="date"
                    required
                  />

                </div>

                {/* ALASAN */}

                <div className="form-field full-width">

                  <label>
                    Alasan
                  </label>

                  <textarea
                    name="reason"
                    required
                    placeholder="Masukkan alasan pengajuan..."
                  />

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
                  Simpan Pengajuan
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </AdminLayout>
  );
}

export default Pengajuan;