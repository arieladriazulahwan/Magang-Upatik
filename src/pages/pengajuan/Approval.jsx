import { useEffect, useState } from "react";
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

const normalizeApprovalStatus = (value) => {
  const lower = String(value || "").trim().toLowerCase();
  if (["disetujui", "approved", "approve", "setuju"].includes(lower)) {
    return "Disetujui";
  }
  if (["ditolak", "rejected", "reject", "tolak"].includes(lower)) {
    return "Ditolak";
  }
  return "Menunggu";
};

const normalizeType = (value) => {
  const type = String(value || "izin").trim().toLowerCase();
  if (type.includes("cuti")) return "Cuti";
  if (type.includes("sakit")) return "Sakit";
  if (type.includes("wfh")) return "WFH";
  if (type.includes("lembur")) return "Lembur";
  if (type.includes("dinas")) return "Dinas";
  return "Izin";
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
  const type = normalizeType(
    getNestedValue(item, ["type", "jenis", "leave_type", "category"])
  );
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
    status = normalizeApprovalStatus(statusRaw);
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
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Menunggu");
  const [typeFilter, setTypeFilter] = useState("Semua Jenis");
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

    const matchType =
      typeFilter === "Semua Jenis" ||
      item.type.toLowerCase() === typeFilter.toLowerCase();

    return matchSearch && matchStatus && matchType;
  });

  const handleApprove = async (id) => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const latestResponse = await apiRequest(`/leave-requests/${id}`);
      const latestItems = normalizeArray(latestResponse);
      const latestItem = latestItems[0] || latestResponse?.data || latestResponse;
      const latestStatus = normalizeApprovalStatus(
        latestItem?.status || latestItem?.approval_status || latestItem?.state
      );
      if (latestStatus !== "Menunggu") {
        throw new Error(`Pengajuan ini sudah berstatus ${latestStatus.toLowerCase()}. Muat ulang daftar pengajuan.`);
      }

      await apiRequest(`/leave-requests/${id}/approve`, {
        method: "POST",
      });

      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Disetujui" } : item
        )
      );
      setStatusFilter("Semua Status");
      setMessage("Pengajuan berhasil disetujui.");
      setSelectedApproval(null);
    } catch (err) {
      console.error("Gagal menyetujui pengajuan:", err);
      setError(err.message || "Gagal menyetujui pengajuan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const latestResponse = await apiRequest(`/leave-requests/${id}`);
      const latestItems = normalizeArray(latestResponse);
      const latestItem = latestItems[0] || latestResponse?.data || latestResponse;
      const latestStatus = normalizeApprovalStatus(
        latestItem?.status || latestItem?.approval_status || latestItem?.state
      );
      if (latestStatus !== "Menunggu") {
        throw new Error(`Pengajuan ini sudah berstatus ${latestStatus.toLowerCase()}. Muat ulang daftar pengajuan.`);
      }

      await apiRequest(`/leave-requests/${id}/reject`, {
        method: "POST",
      });

      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Ditolak" } : item
        )
      );
      setStatusFilter("Semua Status");
      setMessage("Pengajuan berhasil ditolak.");
      setSelectedApproval(null);
    } catch (err) {
      console.error("Gagal menolak pengajuan:", err);
      setError(err.message || "Gagal menolak pengajuan.");
    } finally {
      setActionLoading(false);
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

        {error && <div className="form-error">{error}</div>}
        {message && <div className="settings-success">{message}</div>}

        <section className="data-panel">
          <div className="approval-toolbar">
            <div className="approval-chips">
              {["Semua Jenis", "Cuti", "Izin", "Sakit", "WFH", "Lembur", "Dinas"].map((type) => (
                <button
                  key={type}
                  className={typeFilter === type ? "approval-chip active" : "approval-chip"}
                  onClick={() => setTypeFilter(type)}
                >
                  {type}
                  <span>{type === "Semua Jenis" ? data.length : data.filter((item) => item.type === type).length}</span>
                </button>
              ))}
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

          <div className="approval-search-row">
            <div className="search-box">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Cari nama atau NIP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
            <div className="approval-list">
              {filteredData.map((item) => (
                <button className="approval-row" key={item.id} onClick={() => setSelectedApproval(item)}>
                  <div className="approval-avatar">{item.name.charAt(0)}</div>
                  <div className="approval-row-main">
                    <div className="approval-row-title">
                      <strong>{item.name}</strong>
                      <span className={`approval-type-badge ${item.type.toLowerCase()}`}>{item.type}</span>
                    </div>
                    <div className="approval-row-meta">
                      {item.unit} · {item.startDate}{item.startDate !== item.endDate ? ` - ${item.endDate}` : ""} · {item.reason}
                    </div>
                  </div>
                  <span className={`approval-status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                  <span className="approval-submitted">{item.submitted}</span>
                  <span className="approval-chevron">›</span>
                </button>
              ))}

              {filteredData.length === 0 && (
                <div className="empty-state">Tidak ada pengajuan yang ditemukan.</div>
              )}
            </div>
          )}
        </section>

        {selectedApproval && (
          <div className="modal-overlay" onClick={() => setSelectedApproval(null)}>
            <div className="approval-detail-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Detail Persetujuan</h3>
                  <p>{selectedApproval.name} · {selectedApproval.unit}</p>
                </div>
                <button className="modal-close" onClick={() => setSelectedApproval(null)}>×</button>
              </div>
              <div className="approval-detail-body">
                <div className="approval-detail-badges">
                  <span className={`approval-type-badge ${selectedApproval.type.toLowerCase()}`}>{selectedApproval.type}</span>
                  <span className={`approval-status-badge ${selectedApproval.status.toLowerCase()}`}>{selectedApproval.status}</span>
                </div>
                <div className="approval-detail-fields">
                  <div><span>Mulai</span><strong>{selectedApproval.startDate}</strong></div>
                  <div><span>Selesai</span><strong>{selectedApproval.endDate}</strong></div>
                  <div><span>Diajukan</span><strong>{selectedApproval.submitted}</strong></div>
                  <div><span>NIP</span><strong>{selectedApproval.nip}</strong></div>
                </div>
                <div className="approval-reason-box">
                  <span>Alasan Pengajuan</span>
                  <p>{selectedApproval.reason}</p>
                </div>
              </div>
              {selectedApproval.status === "Menunggu" && (
                <div className="modal-actions">
                  <button className="reject-submit" onClick={() => handleReject(selectedApproval.id)} disabled={actionLoading}>
                    {actionLoading ? "Memproses..." : "Tolak"}
                  </button>
                  <button className="approve-submit" onClick={() => handleApprove(selectedApproval.id)} disabled={actionLoading}>
                    {actionLoading ? "Memproses..." : "Setujui"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Approval;