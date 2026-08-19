import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getNestedValue = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const normalizeApprovalData = (item, index) => {
  const employee = item.employee || item.user || item.pegawai || {};
  const name =
    getNestedValue(item, ["name", "employee_name", "nama"]) ||
    getNestedValue(employee, ["name", "nama"]) ||
    "Pegawai";
  const nip =
    getNestedValue(item, ["nip", "employee_nip", "nik"]) ||
    getNestedValue(employee, ["nip", "nik"]) ||
    "-";
  const unit =
    getNestedValue(item, ["unit", "unit_kerja", "unit_name"]) ||
    getNestedValue(employee, ["unit", "unit_kerja", "unit_name"]) ||
    "-";
  const type =
    getNestedValue(item, ["type", "jenis", "leave_type", "category"]) || "Izin";
  const startDate =
    getNestedValue(item, ["start_date", "tanggal_mulai", "startDate"]) || "-";
  const endDate =
    getNestedValue(item, ["end_date", "tanggal_selesai", "endDate"]) || startDate;
  const reason =
    getNestedValue(item, ["reason", "alasan", "notes", "keterangan"]) || "-";
  const submitted =
    getNestedValue(item, ["submitted_at", "created_at", "submitted", "tanggal_pengajuan"]) || "-";
  const statusRaw =
    getNestedValue(item, ["status", "approval_status", "state", "status_pengajuan"]) || "";

  let status = "Menunggu";
  if (typeof item.is_approved === "boolean") {
    status = item.is_approved ? "Disetujui" : "Ditolak";
  } else if (typeof item.isRejected === "boolean") {
    status = item.isRejected ? "Ditolak" : status;
  } else if (statusRaw) {
    const lower = String(statusRaw).toLowerCase();
    if (lower.includes("approve") || lower.includes("approved")) status = "Disetujui";
    else if (lower.includes("reject") || lower.includes("rejected")) status = "Ditolak";
    else if (lower.includes("pending") || lower.includes("wait")) status = "Menunggu";
  }

  return {
    id: item.id ?? index + 1,
    name,
    nip,
    unit,
    type,
    startDate,
    endDate,
    reason,
    submitted,
    status,
  };
};

function Approval() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Menunggu");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/leave-requests");
      const normalized = normalizeArray(response).map(normalizeApprovalData);
      setData(normalized);
    } catch (err) {
      console.error("Gagal mengambil data persetujuan:", err);
      setError(err.message || "Gagal mengambil data persetujuan.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();
    const matchSearch =
      item.name.toLowerCase().includes(keyword) ||
      item.nip.toLowerCase().includes(keyword);

    const matchStatus =
      statusFilter === "Semua Status" ||
      item.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleApprove = async (id) => {
    try {
      await apiRequest(`/leave-requests/${id}/approve`, {
        method: "POST",
      });

      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Disetujui" } : item
        )
      );
    } catch (err) {
      console.error("Gagal menyetujui pengajuan:", err);
      setError(err.message || "Gagal menyetujui pengajuan.");
    }
  };

  const handleReject = async (id) => {
    try {
      await apiRequest(`/leave-requests/${id}/reject`, {
        method: "POST",
      });

      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Ditolak" } : item
        )
      );
    } catch (err) {
      console.error("Gagal menolak pengajuan:", err);
      setError(err.message || "Gagal menolak pengajuan.");
    }
  };

  return (
    <AdminLayout>
      <div className="approval-page">
        <div className="page-heading">
          <div>
            <h2>Persetujuan Pengajuan</h2>
            <p>Verifikasi dan persetujuan pengajuan pegawai</p>
          </div>
        </div>

        <div className="approval-summary">
          <div className="approval-summary-card">
            <span>Menunggu Persetujuan</span>
            <strong>{data.filter((item) => item.status === "Menunggu").length}</strong>
          </div>

          <div className="approval-summary-card approved">
            <span>Disetujui</span>
            <strong>{data.filter((item) => item.status === "Disetujui").length}</strong>
          </div>

          <div className="approval-summary-card rejected">
            <span>Ditolak</span>
            <strong>{data.filter((item) => item.status === "Ditolak").length}</strong>
          </div>
        </div>

        <section className="data-panel">
          <div className="data-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Cari nama atau NIP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>Menunggu</option>
              <option>Disetujui</option>
              <option>Ditolak</option>
              <option>Semua Status</option>
            </select>
          </div>

          {loading && <div className="empty-state">Memuat data persetujuan...</div>}

          {!loading && error && (
            <div className="empty-state">
              <p>{error}</p>
              <button className="secondary-button" onClick={fetchApprovals}>
                Coba Lagi
              </button>
            </div>
          )}

          {!loading && !error && (
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
                          <div className="employee-avatar">{item.name.charAt(0)}</div>
                          <div>
                            <strong>{item.name}</strong>
                            <span>{item.nip}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`submission-type ${item.type.toLowerCase()}`}>
                          {item.type}
                        </span>
                      </td>

                      <td>
                        <div className="submission-date">
                          <strong>{item.startDate}</strong>
                          {item.startDate !== item.endDate && <span>s/d {item.endDate}</span>}
                        </div>
                      </td>

                      <td>
                        <span className="reason-text">{item.reason}</span>
                      </td>

                      <td>{item.submitted}</td>

                      <td>
                        <span className={`submission-status ${item.status.toLowerCase().replace(/\s+/g, "-")}`}>
                          {item.status}
                        </span>
                      </td>

                      <td>
                        <div className="approval-actions">
                          <button
                            className="action-button"
                            onClick={() =>
                              navigate("/pengajuan/detail", { state: { pengajuan: item } })
                            }
                          >
                            Detail
                          </button>

                          {item.status === "Menunggu" && (
                            <>
                              <button className="approve-small" onClick={() => handleApprove(item.id)}>
                                ✓
                              </button>
                              <button className="reject-small" onClick={() => handleReject(item.id)}>
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
                <div className="empty-state">Tidak ada pengajuan yang ditemukan.</div>
              )}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

export default Approval;