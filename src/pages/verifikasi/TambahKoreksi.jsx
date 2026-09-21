import { useEffect, useMemo, useState } from "react";
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

const normalizeStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  if (["disetujui", "approved", "approve", "setuju"].includes(status)) return "Disetujui";
  if (["ditolak", "rejected", "reject", "tolak"].includes(status)) return "Ditolak";
  return "Menunggu Persetujuan";
};

const basePathForSource = (source) => {
  if (source === "wfh") return "wfh-requests";
  if (source === "overtime") return "overtime-requests";
  return "leave-requests";
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

const statusClass = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace("perjadin", "dinas")
    .replace(/\s+/g, "-");

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

const normalizeRequest = (item, index, source) => {
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
    period: startDate === endDate ? startDate : `${startDate} - ${endDate}`,
    submitted: getValue(item, ["submitted_at", "created_at", "submitted", "tanggal_pengajuan"]) || "-",
    status,
    calendarStatus: source === "leave" ? normalizeCalendarStatus(item.gcal_status) || "Menunggu sinkronisasi" : "",
    reason: getValue(item, ["reason", "alasan", "notes", "keterangan", "work_description"]) || "-",
    attachments: source === "leave" ? normalizeAttachments(item) : [],
    approvalSteps: normalizeApprovalSteps(item),
  };
};

function TambahKoreksi() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError("");

        const [leaveResponse, wfhResponse, overtimeResponse] = await Promise.all([
          apiRequest("/leave-requests"),
          apiRequest("/wfh-requests"),
          apiRequest("/overtime-requests"),
        ]);

        setRequests([
          ...normalizeArray(leaveResponse).map((item, index) => normalizeRequest(item, index, "leave")),
          ...normalizeArray(wfhResponse).map((item, index) => normalizeRequest(item, index, "wfh")),
          ...normalizeArray(overtimeResponse).map((item, index) => normalizeRequest(item, index, "overtime")),
        ]);
      } catch (err) {
        setError(err.message || "Gagal mengambil data pengajuan.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "Menunggu Persetujuan"),
    [requests]
  );

  useEffect(() => {
    const requestId = searchParams.get("request");
    if (requestId && pendingRequests.some((request) => request.id === requestId)) {
      setSelectedId(requestId);
    }
  }, [pendingRequests, searchParams]);

  const filteredRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return pendingRequests;

    return pendingRequests.filter((request) =>
      [request.name, request.nip, request.unit, request.type, request.period]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [pendingRequests, search]);

  const selectedRequest = pendingRequests.find((request) => request.id === selectedId);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedRequest) {
      setError("Pilih pengajuan yang akan dikoreksi.");
      return;
    }

    if (!note.trim()) {
      setError("Catatan koreksi wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await apiRequest(`/${basePathForSource(selectedRequest.source)}/${selectedRequest.rawId}/reject`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() }),
      });

      navigate("/verifikasi");
    } catch (err) {
      setError(err.message || "Gagal mengirim koreksi pengajuan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-heading">
        <div>
          <h2>Tambah Koreksi Persetujuan</h2>
          <p>Pilih pengajuan cuti, izin, sakit, WFA, atau lembur yang perlu dikembalikan untuk koreksi.</p>
        </div>
      </div>

      <section className="data-panel employee-form-panel approval-detail-page-panel">
        <div className="modal-header">
          <div>
            <h3>Detail Persetujuan</h3>
            <p>{selectedRequest ? `${selectedRequest.name} - ${selectedRequest.unit}` : "Pilih pengajuan untuk melihat detail."}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-field full-width">
              <label>Cari Pengajuan</label>
              <input
                type="search"
                placeholder="Ketik nama, NIP, unit, jenis, atau tanggal..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="form-field full-width">
              <label>Pengajuan</label>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                disabled={loading}
                required
              >
                <option value="" disabled>
                  {loading ? "Memuat pengajuan..." : "Pilih pengajuan menunggu persetujuan"}
                </option>
                {filteredRequests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.name} - {request.type} - {request.period}
                  </option>
                ))}
              </select>
            </div>

            {selectedRequest && (
              <div className="approval-correction-preview full-width">
                <div className="approval-detail-badges">
                  <span className={`approval-type-badge ${statusClass(selectedRequest.type)}`}>{selectedRequest.type}</span>
                  <span className={`approval-status-badge ${statusClass(selectedRequest.status)}`}>{selectedRequest.status}</span>
                  {selectedRequest.calendarStatus && (
                    <span className={`sync-status ${statusClass(selectedRequest.calendarStatus)}`}>
                      Google Calendar: {selectedRequest.calendarStatus}
                    </span>
                  )}
                </div>

                <div className="approval-detail-fields">
                  <div><span>Mulai</span><strong>{selectedRequest.startDate}</strong></div>
                  <div><span>Selesai</span><strong>{selectedRequest.endDate}</strong></div>
                  <div><span>Diajukan</span><strong>{selectedRequest.submitted}</strong></div>
                  <div><span>NIP</span><strong>{selectedRequest.nip}</strong></div>
                </div>

                <div className="approval-reason-box">
                  <span>Alasan Pengajuan</span>
                  <p>{selectedRequest.reason}</p>
                </div>

                <div className="approval-flow-box">
                  <span>Alur & Log Persetujuan</span>
                  {selectedRequest.approvalSteps.length > 0 ? (
                    <div className="approval-step-list">
                      {selectedRequest.approvalSteps.map((step) => (
                        <article className="approval-step-item" key={step.id}>
                          <b>{step.sequence}</b>
                          <div>
                            <strong>{step.approverRole}</strong>
                            {step.approverName && <small>{step.approverName}</small>}
                            {step.note && <p>{step.note}</p>}
                          </div>
                          <span className={`approval-status-badge ${statusClass(step.status)}`}>
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
                  {selectedRequest.attachments.length > 0 ? (
                    <div className="approval-attachment-list">
                      {selectedRequest.attachments.map((attachment, index) => (
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

            <div className="form-field full-width">
              <label>Catatan Koreksi</label>
              <textarea
                rows="4"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Tuliskan bagian pengajuan yang harus diperbaiki pegawai..."
                required
              />
            </div>
          </div>

          <div className="modal-actions approval-page-actions">
            <button type="button" className="secondary-button" onClick={() => navigate("/verifikasi")} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="reject-submit" disabled={saving || loading}>
              {saving ? "Mengirim..." : "Kirim Koreksi"}
            </button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
}

export default TambahKoreksi;