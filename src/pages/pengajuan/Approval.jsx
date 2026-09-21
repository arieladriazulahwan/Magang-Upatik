import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import API_URL, { apiRequest } from "../../services/api";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const TYPE_FILTERS = [
  { label: "Semua Jenis", icon: "All" },
  { label: "Cuti", icon: "C" },
  { label: "Izin", icon: "I" },
  { label: "Sakit", icon: "+" },
  { label: "WFA", icon: "W" },
  { label: "Lembur", icon: "L" },
  { label: "Perjadin", icon: "P" },
];

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
  return "Menunggu Persetujuan";
};

const approvalStatusClass = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

const approvalTypeClass = (type) =>
  String(type || "")
    .trim()
    .toLowerCase()
    .replace("perjadin", "dinas")
    .replace(/\s+/g, "-");

const formatSubmitted = (value) => {
  if (!value || value === "-") {
    return { date: "-", time: "" };
  }

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return {
      date: parsed.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      time: parsed.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }

  const [date = value, time = ""] = String(value).split(/[T\s]/);

  return {
    date,
    time: time.slice(0, 5),
  };
};

const normalizeCalendarStatus = (value) => {
  const lower = String(value || "").trim().toLowerCase();

  if (!lower) return "";
  if (["menunggu", "pending", "tertunda", "menunggu sinkronisasi"].includes(lower)) return "Menunggu sinkronisasi";

  if (["terkirim", "synced"].includes(lower)) return "Tersinkron";
  if (["gagal", "failed"].includes(lower)) return "Gagal";
  if (["dihapus", "deleted"].includes(lower)) return "Dihapus";

  return "";
};

const calendarStatusForApproval = (item, status, source) => {
  if (source !== "leave") {
    return "";
  }

  const calendarStatus = normalizeCalendarStatus(item.gcal_status);

  return calendarStatus || "Menunggu sinkronisasi";
};

const normalizeType = (value) => {
  if (value && typeof value === "object") {
    return normalizeType(value.name || value.category || value.code);
  }

  const type = String(value || "izin").trim().toLowerCase();
  if (type.includes("cuti")) return "Cuti";
  if (type.includes("sakit")) return "Sakit";
  if (type.includes("wfh") || type.includes("wfa")) return "WFA";
  if (type.includes("lembur")) return "Lembur";
  if (type.includes("dinas")) return "Perjadin";
  return "Izin";
};

const normalizeAttachments = (item) => {
  const attachments = item.attachments || item.files || item.documents || item.dokumen || [];
  return Array.isArray(attachments) ? attachments : [];
};

const normalizeApprovalSteps = (item) => {
  const steps = item.approval_steps || item.approvalSteps || item.approval_logs || item.logs || [];
  if (!Array.isArray(steps)) return [];

  return steps.map((step, index) => ({
    id: step.id || `${step.sequence || index + 1}-${step.approver_role || index}`,
    sequence: step.sequence || index + 1,
    approverRole: step.approver_role || step.role || step.role_name || "Penyetuju",
    approverName: step.approver?.name || step.approver_name || step.user?.name || "",
    status: normalizeApprovalStatus(step.status || step.state),
    note: step.note || step.catatan || "",
    recordedAt: step.recorded_at || step.created_at || step.updated_at || "",
  }));
};

const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const openAttachment = async (attachment) => {
  const token = localStorage.getItem("token");
  const url = attachment.download_url || attachment.url || attachment.path;

  if (!url) {
    alert("URL dokumen tidak tersedia.");
    return;
  }

  const response = await fetch(`${API_URL}${url.startsWith("/") ? url : `/${url}`}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: attachment.mime_type || "application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error("Gagal membuka dokumen lampiran.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

const normalizeApprovalData = (item, index, source = "leave") => {
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
    employee.work_unit?.name ||
    "-";
  const type =
    source === "wfh"
      ? "WFA"
      : source === "overtime"
      ? "Lembur"
      : normalizeType(
          getNestedValue(item, ["type", "jenis", "leave_type", "category"])
        );
  const startDate =
    getNestedValue(item, ["start_date", "tanggal_mulai", "startDate", "date"]) || "-";
  const endDate =
    getNestedValue(item, ["end_date", "tanggal_selesai", "endDate"]) || startDate;
  const reason =
    getNestedValue(item, ["reason", "alasan", "notes", "keterangan", "work_description"]) || "-";
  const submitted =
    getNestedValue(item, ["submitted_at", "created_at", "submitted", "tanggal_pengajuan"]) || "-";
  const statusRaw =
    getNestedValue(item, ["status", "approval_status", "state", "status_pengajuan"]) || "";

  let status = "Menunggu Persetujuan";
  if (typeof item.is_approved === "boolean") {
    status = item.is_approved ? "Disetujui" : "Ditolak";
  } else if (typeof item.isRejected === "boolean") {
    status = item.isRejected ? "Ditolak" : status;
  } else if (statusRaw) {
    status = normalizeApprovalStatus(statusRaw);
  }

  return {
    id: `${source}-${item.id ?? index + 1}`,
    rawId: item.id ?? index + 1,
    source,
    name,
    nip,
    unit,
    type,
    startDate,
    endDate,
    reason,
    submitted,
    status,
    calendarStatus: calendarStatusForApproval(item, status, source),
    calendarSyncedAt: item.gcal_synced_at || "",
    attachments: normalizeAttachments(item),
    approvalSteps: normalizeApprovalSteps(item),
  };
};

function Approval() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
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

      const [leaveResponse, wfhResponse, overtimeResponse] = await Promise.all([
        apiRequest("/leave-requests"),
        apiRequest("/wfh-requests"),
        apiRequest("/overtime-requests"),
      ]);

      const normalized = [
        ...normalizeArray(leaveResponse).map((item, index) =>
          normalizeApprovalData(item, index, "leave")
        ),
        ...normalizeArray(wfhResponse).map((item, index) =>
          normalizeApprovalData(item, index, "wfh")
        ),
        ...normalizeArray(overtimeResponse).map((item, index) =>
          normalizeApprovalData(item, index, "overtime")
        ),
      ];
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
      const selected = data.find((item) => item.id === id);
      const source = selected?.source || "leave";
      const basePath =
        source === "wfh"
          ? "wfh-requests"
          : source === "overtime"
          ? "overtime-requests"
          : "leave-requests";

      const latestResponse = await apiRequest(`/${basePath}/${selected?.rawId || id}`);
      const latestItems = normalizeArray(latestResponse);
      const latestItem = latestItems[0] || latestResponse?.data || latestResponse;
      const latestStatus = normalizeApprovalStatus(
        latestItem?.status || latestItem?.approval_status || latestItem?.state
      );
      if (latestStatus !== "Menunggu Persetujuan") {
        throw new Error(`Pengajuan ini sudah berstatus ${latestStatus.toLowerCase()}. Muat ulang daftar pengajuan.`);
      }

      await apiRequest(`/${basePath}/${selected?.rawId || id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          note: "Disetujui melalui web admin.",
        }),
      });

      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "Disetujui" } : item
        )
      );
      setStatusFilter("Semua Status");
      setMessage("Pengajuan berhasil disetujui.");
      setSelectedApproval(null);
      await fetchApprovals();
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
      const selected = data.find((item) => item.id === id);
      const source = selected?.source || "leave";
      const basePath =
        source === "wfh"
          ? "wfh-requests"
          : source === "overtime"
          ? "overtime-requests"
          : "leave-requests";

      const latestResponse = await apiRequest(`/${basePath}/${selected?.rawId || id}`);
      const latestItems = normalizeArray(latestResponse);
      const latestItem = latestItems[0] || latestResponse?.data || latestResponse;
      const latestStatus = normalizeApprovalStatus(
        latestItem?.status || latestItem?.approval_status || latestItem?.state
      );
      if (latestStatus !== "Menunggu Persetujuan") {
        throw new Error(`Pengajuan ini sudah berstatus ${latestStatus.toLowerCase()}. Muat ulang daftar pengajuan.`);
      }

      await apiRequest(`/${basePath}/${selected?.rawId || id}/reject`, {
        method: "POST",
        body: JSON.stringify({
          note: "Ditolak melalui web admin.",
        }),
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

  const handleAddCorrection = (approval) => {
    if (!approval) return;
    navigate(`/verifikasi/tambah?request=${encodeURIComponent(approval.id)}`);
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
              {TYPE_FILTERS.map(({ label, icon }) => {
                return (
                  <button
                    key={label}
                    className={typeFilter === label ? "approval-chip active" : "approval-chip"}
                    onClick={() => setTypeFilter(label)}
                  >
                    <i>{icon}</i>
                    <strong>{label}</strong>
                    <span>{label === "Semua Jenis" ? data.length : data.filter((item) => item.type === label).length}</span>
                  </button>
                );
              })}
            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>Menunggu Persetujuan</option>
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
              {filteredData.map((item) => {
                const submitted = formatSubmitted(item.submitted);

                return (
                  <button className="approval-row" key={item.id} onClick={() => navigate(`/persetujuan/detail?request=${encodeURIComponent(item.id)}`)}>
                    <div className="approval-avatar">{item.name.charAt(0)}</div>
                    <div className="approval-person">
                      <strong>{item.name}</strong>
                      <span>NIP. {item.nip}</span>
                    </div>
                    <div className="approval-row-main">
                      <div className="approval-row-title">
                        <span className={`approval-type-badge ${approvalTypeClass(item.type)}`}>{item.type}</span>
                        <strong>{item.startDate}{item.startDate !== item.endDate ? ` - ${item.endDate}` : ""}</strong>
                      </div>
                      <div className="approval-row-meta">
                        {item.reason}
                      </div>
                    </div>
                    <div className="approval-row-state">
                      <span className={`approval-status-badge ${approvalStatusClass(item.status)}`}>{item.status}</span>
                      {item.calendarStatus && (
                        <span className={`sync-status ${item.calendarStatus.toLowerCase().replace(/\s+/g, "-")}`}>
                          {item.calendarStatus}
                        </span>
                      )}
                    </div>
                    <span className="approval-submitted">
                      <strong>{submitted.date}</strong>
                      <small>{submitted.time}</small>
                    </span>
                    <span className="approval-chevron">⋮</span>
                  </button>
                );
              })}

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
                  <span className={`approval-type-badge ${approvalTypeClass(selectedApproval.type)}`}>{selectedApproval.type}</span>
                  <span className={`approval-status-badge ${approvalStatusClass(selectedApproval.status)}`}>{selectedApproval.status}</span>
                  {selectedApproval.calendarStatus && (
                    <span className={`sync-status ${selectedApproval.calendarStatus.toLowerCase().replace(/\s+/g, "-")}`}>
                      Google Calendar: {selectedApproval.calendarStatus}
                    </span>
                  )}
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
                <div className="approval-flow-box">
                  <span>Alur & Log Persetujuan</span>
                  {selectedApproval.approvalSteps.length > 0 ? (
                    <div className="approval-step-list">
                      {selectedApproval.approvalSteps.map((step) => (
                        <article className="approval-step-item" key={step.id}>
                          <b>{step.sequence}</b>
                          <div>
                            <strong>{step.approverRole}</strong>
                            {step.approverName && <small>{step.approverName}</small>}
                            {step.note && <p>{step.note}</p>}
                          </div>
                          <span className={`approval-status-badge ${approvalStatusClass(step.status)}`}>
                            {step.status}
                          </span>
                          {step.recordedAt && <time>{step.recordedAt}</time>}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>Log persetujuan belum tersedia.</p>
                  )}
                </div>
                <div className="approval-attachments-box">
                  <span>Dokumen Pendukung</span>
                  {selectedApproval.attachments.length > 0 ? (
                    <div className="approval-attachment-list">
                      {selectedApproval.attachments.map((attachment, index) => (
                        <button
                          type="button"
                          className="approval-attachment-item"
                          key={attachment.id || attachment.file_name || index}
                          onClick={async () => {
                            try {
                              await openAttachment(attachment);
                            } catch (err) {
                              setError(err.message || "Gagal membuka dokumen lampiran.");
                            }
                          }}
                        >
                          <strong>{attachment.file_name || attachment.name || `Lampiran ${index + 1}`}</strong>
                          <small>{attachment.mime_type || "File"} {formatFileSize(attachment.size_bytes)}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>Tidak ada dokumen pendukung.</p>
                  )}
                </div>
              </div>
              {selectedApproval.status === "Menunggu Persetujuan" && (
                <div className="modal-actions">
                  <button className="secondary-button" onClick={() => handleAddCorrection(selectedApproval)} disabled={actionLoading}>
                    Tambah Koreksi
                  </button>
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