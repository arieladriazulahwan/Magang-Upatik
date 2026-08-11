import { useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";

const initialApprovals = [
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
    name: "Rina Amelia",
    nip: "199402152021052007",
    unit: "Fakultas Teknik",
    type: "Dinas",
    startDate: "14 Agustus 2026",
    endDate: "15 Agustus 2026",
    reason: "Mengikuti kegiatan dinas universitas",
    submitted: "10 Agustus 2026, 09:10",
    status: "Menunggu",
  },
  {
    id: 4,
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
    id: 5,
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

function Approval() {
  const [approvals, setApprovals] =
    useState(initialApprovals);

  const [search, setSearch] = useState("");

  const [typeFilter, setTypeFilter] =
    useState("Semua Jenis");

  const [statusFilter, setStatusFilter] =
    useState("Menunggu");

  const [selected, setSelected] =
    useState(null);

  const [showModal, setShowModal] =
    useState(false);

  const [actionType, setActionType] =
    useState("");

  const [note, setNote] =
    useState("");

  const filteredData = approvals.filter((item) => {
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

    return matchSearch && matchType && matchStatus;
  });

  const openApproval = (item, action) => {
    setSelected(item);
    setActionType(action);
    setNote("");
    setShowModal(true);
  };

  const handleApproval = (e) => {
    e.preventDefault();

    const newStatus =
      actionType === "approve"
        ? "Disetujui"
        : "Ditolak";

    setApprovals(
      approvals.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              status: newStatus,
            }
          : item
      )
    );

    setShowModal(false);
    setSelected(null);
    setNote("");
  };

  return (
    <AdminLayout>

      <div className="approval-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>
            <h2>Persetujuan</h2>

            <p>
              Verifikasi dan proses pengajuan pegawai
            </p>
          </div>

        </div>

        {/* SUMMARY */}

        <div className="approval-summary">

          <div className="approval-card">

            <span>
              Total Pengajuan
            </span>

            <strong>
              {approvals.length}
            </strong>

          </div>

          <div className="approval-card waiting">

            <span>
              Menunggu
            </span>

            <strong>
              {
                approvals.filter(
                  (item) =>
                    item.status === "Menunggu"
                ).length
              }
            </strong>

          </div>

          <div className="approval-card approved">

            <span>
              Disetujui
            </span>

            <strong>
              {
                approvals.filter(
                  (item) =>
                    item.status === "Disetujui"
                ).length
              }
            </strong>

          </div>

          <div className="approval-card rejected">

            <span>
              Ditolak
            </span>

            <strong>
              {
                approvals.filter(
                  (item) =>
                    item.status === "Ditolak"
                ).length
              }
            </strong>

          </div>

        </div>

        {/* TABLE */}

        <section className="data-panel">

          <div className="approval-panel-header">

            <div>

              <h3>
                Daftar Persetujuan
              </h3>

              <p>
                Pengajuan yang membutuhkan verifikasi
              </p>

            </div>

            {statusFilter === "Menunggu" && (
              <span className="pending-indicator">
                ● Perlu tindakan
              </span>
            )}

          </div>

          <div className="data-toolbar">

            <div className="search-box">

              <span>⌕</span>

              <input
                type="text"
                placeholder="Cari nama atau NIP..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

            <div className="approval-filters">

              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value)
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
                  setStatusFilter(e.target.value)
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

          <div className="employee-table-wrapper">

            <table className="employee-table approval-table">

              <thead>

                <tr>
                  <th>Pegawai</th>
                  <th>Jenis</th>
                  <th>Periode</th>
                  <th>Alasan</th>
                  <th>Diajukan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>

              </thead>

              <tbody>

                {filteredData.map((item) => (

                  <tr key={item.id}>

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

                    <td>

                      <span
                        className={`submission-type ${item.type.toLowerCase()}`}
                      >
                        {item.type}
                      </span>

                    </td>

                    <td>

                      <div className="submission-date">

                        <strong>
                          {item.startDate}
                        </strong>

                        {item.startDate !== item.endDate && (
                          <span>
                            s/d {item.endDate}
                          </span>
                        )}

                      </div>

                    </td>

                    <td>

                      <span className="reason-text">
                        {item.reason}
                      </span>

                    </td>

                    <td>
                      {item.submitted}
                    </td>

                    <td>

                      <span
                        className={`submission-status ${item.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {item.status}
                      </span>

                    </td>

                    <td>

                      <button
                        className="action-button"
                        onClick={() =>
                          setSelected(item)
                        }
                      >
                        Detail
                      </button>

                      {item.status === "Menunggu" && (
                        <>
                          <button
                            className="approve-button"
                            onClick={() =>
                              openApproval(
                                item,
                                "approve"
                              )
                            }
                          >
                            Setujui
                          </button>

                          <button
                            className="reject-button"
                            onClick={() =>
                              openApproval(
                                item,
                                "reject"
                              )
                            }
                          >
                            Tolak
                          </button>
                        </>
                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

            {filteredData.length === 0 && (
              <div className="empty-state">
                Tidak ada pengajuan.
              </div>
            )}

          </div>

          <div className="table-footer">

            <span>
              Menampilkan {filteredData.length} pengajuan
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

      {/* DETAIL */}

      {selected && !showModal && (

        <div
          className="modal-overlay"
          onClick={() => setSelected(null)}
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
                  Detail Pengajuan
                </h3>

                <p>
                  Informasi pengajuan pegawai
                </p>

              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelected(null)
                }
              >
                ×
              </button>

            </div>

            <div className="approval-detail">

              <div className="detail-person">

                <div className="employee-avatar large">
                  {selected.name.charAt(0)}
                </div>

                <div>

                  <strong>
                    {selected.name}
                  </strong>

                  <span>
                    {selected.nip}
                  </span>

                  <small>
                    {selected.unit}
                  </small>

                </div>

              </div>

              <div className="detail-grid">

                <div>
                  <span>
                    Jenis Pengajuan
                  </span>

                  <strong>
                    {selected.type}
                  </strong>
                </div>

                <div>
                  <span>
                    Status
                  </span>

                  <strong>
                    {selected.status}
                  </strong>
                </div>

                <div>
                  <span>
                    Tanggal Mulai
                  </span>

                  <strong>
                    {selected.startDate}
                  </strong>
                </div>

                <div>
                  <span>
                    Tanggal Selesai
                  </span>

                  <strong>
                    {selected.endDate}
                  </strong>
                </div>

              </div>

              <div className="detail-reason">

                <span>
                  Alasan
                </span>

                <p>
                  {selected.reason}
                </p>

              </div>

              {selected.status === "Menunggu" && (

                <div className="detail-actions">

                  <button
                    className="approve-button large-button"
                    onClick={() =>
                      openApproval(
                        selected,
                        "approve"
                      )
                    }
                  >
                    ✓ Setujui
                  </button>

                  <button
                    className="reject-button large-button"
                    onClick={() =>
                      openApproval(
                        selected,
                        "reject"
                      )
                    }
                  >
                    × Tolak
                  </button>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

      {/* MODAL KONFIRMASI */}

      {showModal && selected && (

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
                  {actionType === "approve"
                    ? "Setujui Pengajuan"
                    : "Tolak Pengajuan"}
                </h3>

                <p>
                  {selected.name} — {selected.type}
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

            <form onSubmit={handleApproval}>

              <div className="approval-confirm">

                <div className="confirm-icon">
                  {actionType === "approve"
                    ? "✓"
                    : "×"}
                </div>

                <p>
                  {actionType === "approve"
                    ? "Apakah Anda yakin ingin menyetujui pengajuan ini?"
                    : "Apakah Anda yakin ingin menolak pengajuan ini?"}
                </p>

              </div>

              <div className="form-field">

                <label>
                  Catatan
                  {actionType === "reject" &&
                    " (wajib)"}
                </label>

                <textarea
                  value={note}
                  onChange={(e) =>
                    setNote(e.target.value)
                  }
                  required={
                    actionType === "reject"
                  }
                  placeholder={
                    actionType === "approve"
                      ? "Tambahkan catatan jika diperlukan..."
                      : "Masukkan alasan penolakan..."
                  }
                />

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
                  className={
                    actionType === "approve"
                      ? "approve-submit"
                      : "reject-submit"
                  }
                >
                  {actionType === "approve"
                    ? "Ya, Setujui"
                    : "Ya, Tolak"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </AdminLayout>
  );
}

export default Approval;