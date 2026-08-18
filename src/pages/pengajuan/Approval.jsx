import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";

const initialApprovalData = [
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
];

function Approval() {
  const navigate = useNavigate();

  const [data, setData] =
    useState(initialApprovalData);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("Menunggu");

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      item.name
        .toLowerCase()
        .includes(keyword) ||
      item.nip
        .toLowerCase()
        .includes(keyword);

    const matchStatus =
      statusFilter === "Semua Status" ||
      item.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleApprove = (id) => {
    setData((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Disetujui",
            }
          : item
      )
    );
  };

  const handleReject = (id) => {
    setData((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Ditolak",
            }
          : item
      )
    );
  };

  return (
    <AdminLayout>

      <div className="approval-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>

            <h2>
              Persetujuan Pengajuan
            </h2>

            <p>
              Verifikasi dan persetujuan pengajuan
              pegawai
            </p>

          </div>

        </div>

        {/* SUMMARY */}

        <div className="approval-summary">

          <div className="approval-summary-card">

            <span>
              Menunggu Persetujuan
            </span>

            <strong>
              {
                data.filter(
                  (item) =>
                    item.status ===
                    "Menunggu"
                ).length
              }
            </strong>

          </div>

          <div className="approval-summary-card approved">

            <span>
              Disetujui
            </span>

            <strong>
              {
                data.filter(
                  (item) =>
                    item.status ===
                    "Disetujui"
                ).length
              }
            </strong>

          </div>

          <div className="approval-summary-card rejected">

            <span>
              Ditolak
            </span>

            <strong>
              {
                data.filter(
                  (item) =>
                    item.status ===
                    "Ditolak"
                ).length
              }
            </strong>

          </div>

        </div>

        {/* TABLE */}

        <section className="data-panel">

          <div className="data-toolbar">

            <div className="search-box">

              <span>
                ⌕
              </span>

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
                Menunggu
              </option>

              <option>
                Disetujui
              </option>

              <option>
                Ditolak
              </option>

              <option>
                Semua Status
              </option>

            </select>

          </div>

          <div className="employee-table-wrapper">

            <table className="employee-table approval-table">

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

                        {item.startDate !==
                          item.endDate && (
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
                          .replace(
                            /\s+/g,
                            "-"
                          )}`}
                      >
                        {item.status}
                      </span>

                    </td>

                    <td>

                      <div className="approval-actions">

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

                        {item.status ===
                          "Menunggu" && (
                          <>
                            <button
                              className="approve-small"
                              onClick={() =>
                                handleApprove(
                                  item.id
                                )
                              }
                            >
                              ✓
                            </button>

                            <button
                              className="reject-small"
                              onClick={() =>
                                handleReject(
                                  item.id
                                )
                              }
                            >
                              ✕
                            </button>
                          </>
                        )}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

            {filteredData.length === 0 && (

              <div className="empty-state">
                Tidak ada pengajuan yang ditemukan.
              </div>

            )}

          </div>

        </section>

      </div>

    </AdminLayout>
  );
}

export default Approval;