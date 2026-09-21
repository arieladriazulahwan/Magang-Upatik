import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import API_URL, { apiRequest } from "../../services/api";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const getValue = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const normalizeStatus = (value) => {
  const lower = String(value || "").trim().toLowerCase();
  if (["disetujui", "approved", "approve", "setuju"].includes(lower)) return "Disetujui";
  if (["ditolak", "rejected", "reject", "tolak"].includes(lower)) return "Ditolak";
  return "Menunggu Persetujuan";
};

const statusClass = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace("perjadin", "dinas")
    .replace(/\s+/g, "-");

const normalizeType = (value) => {
  if (value && typeof value === "object") {
    return normalizeType(value.category || value.code || value.name);
  }

  const type = String(value || "izin").trim().toLowerCase().replace(/_/g, " ");
  if (type.includes("cuti")) return "Cuti";
  if (type.includes("sakit")) return "Sakit";
  if (type.includes("dinas")) return "Perjadin";
  return "Izin";
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
    status: normalizeStatus(step.status || step.state),
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

const basePathForSource = (source) => {
  if (source === "wfh") return "wfh-requests";
  if (source === "overtime") return "overtime-requests";
  return "leave-requests";
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

const normalizeApproval = (item, index, source) => {
  const employee = item.employee || item.user || item.pegawai || {};
  const leaveType = item.leave_type || item.leaveType || {};
  const startDate = getValue(item, ["start_date", "tanggal_mulai", "startDate", "date"]) || "-";
  const endDate = getValue(item, ["end_date", "tanggal_selesai", "endDate"]) || startDate;
  const status = normalizeStatus(getValue(item, ["status", "approval_status", "state", "status_pengajuan"]));

  return {
    id: `${source}-${item.id ?? index + 1}`,
    rawId: item.id ?? index + 1,
    source,
    name:
      getValue(item, ["name", "employee_name", "nama"]) ||
      getValue(employee, ["name", "nama"]) ||
      "Pegawai",
    nip:
      getValue(item, ["nip", "employee_nip", "nik"]) ||
      getValue(employee, ["nip", "nik"]) ||
      "-",
    unit:
      getValue(item, ["unit", "unit_kerja", "unit_name"]) ||
      getValue(employee, ["unit", "unit_kerja", "unit_name"]) ||
      employee.work_unit?.name ||
      "-",
    type:
      source === "wfh"
        ? "WFA"
        : source === "overtime"
        ? "Lembur"
        : normalizeType(leaveType || getValue(item, ["type", "jenis", "leave_type", "category"])),
    startDate,
    endDate,
    submitted: getValue(item, ["submitted_at", "created_at", "submitted", "tanggal_pengajuan"]) || "-",
    status,
    calendarStatus: source === "leave" ? normalizeCalendarStatus(item.gcal_status) || "Menunggu sinkronisasi" : "",
    reason: getValue(item, ["reason", "alasan", "notes", "keterangan", "work_description"]) || "-",
    attachments: source === "leave" ? normalizeAttachments(item) : [],
    approvalSteps: normalizeApprovalSteps(item),
  };
};

function DetailPersetujuan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("request");
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchApproval = async () => {
    try {
      setLoading(true);
      setError("");

      const [leaveResponse, wfhResponse, overtimeResponse] = await Promise.all([
        apiRequest("/leave-requests"),
        apiRequest("/wfh-requests"),
        apiRequest("/overtime-requests"),
      ]);

      const approvals = [
        ...normalizeArray(leaveResponse).map((item, index) => normalizeApproval(item, index, "leave")),
        ...normalizeArray(wfhResponse).map((item, index) => normalizeApproval(item, index, "wfh")),
        ...normalizeArray(overtimeResponse).map((item, index) => normalizeApproval(item, index, "overtime")),
      ];

      setApproval(approvals.find((item) => item.id === requestId) || null);
    } catch (err) {
      setError(err.message || "Gagal mengambil detail persetujuan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproval();
  }, [requestId]);

  const decideApproval = async (decision) => {
    if (!approval) return;

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await apiRequest(`/${basePathForSource(approval.source)}/${approval.rawId}/${decision}`, {
        method: "POST",
        body: JSON.stringify({
          note: decision === "approve" ? "Disetujui melalui web admin." : "Ditolak melalui web admin.",
        }),
      });

      setMessage(decision === "approve" ? "Pengajuan berhasil disetujui." : "Pengajuan berhasil ditolak.");
      await fetchApproval();
    } catch (err) {
      setError(err.message || "Gagal memproses persetujuan.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="approval-page">
        <div className="page-heading">
          <div>
            <h2>Detail Persetujuan</h2>
            <p>{approval ? `${approval.name} - ${approval.unit}` : "Informasi detail pengajuan pegawai"}</p>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="settings-success">{message}</div>}

        <section className="data-panel employee-form-panel approval-detail-page-panel">
          <div className="modal-header">
            <div>
              <h3>Detail Persetujuan</h3>
              <p>{approval ? `${approval.name} - ${approval.unit}` : "Memuat detail persetujuan..."}</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => navigate("/persetujuan")}>
              Kembali
            </button>
          </div>

          {loading && <div className="empty-state">Memuat detail persetujuan...</div>}

          {!loading && !approval && (
            <div className="empty-state">Detail persetujuan tidak ditemukan.</div>
          )}

          {!loading && approval && (
            <div className="approval-detail-body">
              <div className="approval-detail-badges">
                <span className={`approval-type-badge ${statusClass(approval.type)}`}>{approval.type}</span>
                <span className={`approval-status-badge ${statusClass(approval.status)}`}>{approval.status}</span>
                {approval.calendarStatus && (
                  <span className={`sync-status ${statusClass(approval.calendarStatus)}`}>
                    Google Calendar: {approval.calendarStatus}
                  </span>
                )}
              </div>

              <div className="approval-detail-fields">
                <div><span>Mulai</span><strong>{approval.startDate}</strong></div>
                <div><span>Selesai</span><strong>{approval.endDate}</strong></div>
                <div><span>Diajukan</span><strong>{approval.submitted}</strong></div>
                <div><span>NIP</span><strong>{approval.nip}</strong></div>
              </div>

              <div className="approval-reason-box">
                <span>Alasan Pengajuan</span>
                <p>{approval.reason}</p>
              </div>

              <div className="approval-flow-box">
                <span>Alur & Log Persetujuan</span>
                {approval.approvalSteps.length > 0 ? (
                  <div className="approval-step-list">
                    {approval.approvalSteps.map((step) => (
                      <article className="approval-step-item" key={step.id}>
                        <b>{step.sequence}</b>
                        <div>
                          <strong>{step.approverRole}</strong>
                          {step.approverName && <small>{step.approverName}</small>}
                          {step.note && <p>{step.note}</p>}
                        </div>
                        <span className={`approval-status-badge ${statusClass(step.status)}`}>{step.status}</span>
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
                {approval.attachments.length > 0 ? (
                  <div className="approval-attachment-list">
                    {approval.attachments.map((attachment, index) => (
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
          )}

          {approval?.status === "Menunggu Persetujuan" && (
            <div className="modal-actions approval-page-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => navigate(`/verifikasi/tambah?request=${encodeURIComponent(approval.id)}`)}
                disabled={actionLoading}
              >
                Tambah Koreksi
              </button>
              <button className="reject-submit" type="button" onClick={() => decideApproval("reject")} disabled={actionLoading}>
                {actionLoading ? "Memproses..." : "Tolak"}
              </button>
              <button className="approve-submit" type="button" onClick={() => decideApproval("approve")} disabled={actionLoading}>
                {actionLoading ? "Memproses..." : "Setujui"}
              </button>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

export default DetailPersetujuan;