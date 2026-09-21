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

const basePathForSource = (source) => {
  if (source === "wfh") return "wfh-requests";
  if (source === "overtime") return "overtime-requests";
  return "leave-requests";
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

const formatSubmitted = (value) => {
  if (!value || value === "-") return "-";

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return String(value);
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

const normalizeVerificationData = (item, index, source = "leave") => {
  const employee = item.employee || item.user || item.pegawai || {};
  const leaveType = item.leave_type || item.leaveType || {};
  const approvalSteps = Array.isArray(item.approval_steps) ? item.approval_steps : [];
  const pendingStep = approvalSteps.find((step) => String(step.status).toLowerCase() === "menunggu");
  const latestNote = [...approvalSteps]
    .reverse()
    .find((step) => step.note || step.recorded_at);
  const startDate =
    getNestedValue(item, ["start_date", "tanggal_mulai", "startDate", "date"]) || "-";
  const statusRaw =
    getNestedValue(item, ["status", "approval_status", "state", "status_pengajuan"]) || "";

  return {
    id: `${source}-${item.id ?? index + 1}`,
    rawId: item.id ?? index + 1,
    source,
    name:
      getNestedValue(item, ["name", "employee_name", "nama"]) ||
      getNestedValue(employee, ["name", "nama"]) ||
      "Pegawai",
    nip:
      getNestedValue(item, ["nip", "employee_nip", "nik"]) ||
      getNestedValue(employee, ["nip", "nik"]) ||
      "-",
    unit:
      getNestedValue(item, ["unit", "unit_kerja", "unit_name"]) ||
      getNestedValue(employee, ["unit", "unit_kerja", "unit_name"]) ||
      employee.work_unit?.name ||
      "-",
    type:
      source === "wfh"
        ? "WFA"
        : source === "overtime"
        ? "Lembur"
        : normalizeType(leaveType || getNestedValue(item, ["type", "jenis", "leave_type", "category"])),
    startDate,
    endDate:
      getNestedValue(item, ["end_date", "tanggal_selesai", "endDate"]) ||
      startDate,
    submitted: getNestedValue(item, ["submitted_at", "created_at", "submitted", "tanggal_pengajuan"]) || "-",
    totalDuration:
      source === "overtime"
        ? getNestedValue(item, ["duration_hours", "total_hours", "hours", "jumlah_jam"]) || "-"
        : getNestedValue(item, ["total_days", "duration_days", "jumlah_hari"]) || "-",
    durationLabel: source === "overtime" ? "jam" : "hari",
    reason: getNestedValue(item, ["reason", "alasan", "notes", "keterangan", "work_description"]) || "-",
    status: normalizeApprovalStatus(statusRaw),
    tahap: pendingStep?.approver_role || latestNote?.approver_role || "-",
    catatan: latestNote?.note || "-",
    attachments: source === "leave" ? normalizeAttachments(item) : [],
    approvalSteps: normalizeApprovalSteps(item),
  };
};

function Verifikasi() {
  const navigate = useNavigate();
  const [selectedData, setSelectedData] = useState(null);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [typeFilter, setTypeFilter] = useState("Semua Jenis");
  const [unitFilter, setUnitFilter] = useState("Semua Unit");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [correctionNote, setCorrectionNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError("");

      const [leaveResponse, wfhResponse, overtimeResponse] = await Promise.all([
        apiRequest("/leave-requests"),
        apiRequest("/wfh-requests"),
        apiRequest("/overtime-requests"),
      ]);

      setData([
        ...normalizeArray(leaveResponse).map((item, index) =>
          normalizeVerificationData(item, index, "leave")
        ),
        ...normalizeArray(wfhResponse).map((item, index) =>
          normalizeVerificationData(item, index, "wfh")
        ),
        ...normalizeArray(overtimeResponse).map((item, index) =>
          normalizeVerificationData(item, index, "overtime")
        ),
      ]);
    } catch (err) {
      console.error("Gagal mengambil data verifikasi persetujuan:", err);
      setError(err.message || "Gagal mengambil data verifikasi persetujuan.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const closeDetail = () => {
    setSelectedData(null);
    setCorrectionNote("");
  };

  const openDetail = (item) => {
    setSelectedData(item);
    setCorrectionNote("");
  };

  const decideApprovalRequest = async (id, decision) => {
    const selected = data.find((item) => item.id === id);
    if (!selected) return;

    const basePath = basePathForSource(selected.source);
    const note = correctionNote.trim();

    if (decision === "reject" && !note) {
      setError("Catatan koreksi wajib diisi sebelum mengembalikan pengajuan.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const latestResponse = await apiRequest(`/${basePath}/${selected.rawId}`);
      const latestItems = normalizeArray(latestResponse);
      const latestItem = latestItems[0] || latestResponse?.data || latestResponse;
      const latestStatus = normalizeApprovalStatus(
        latestItem?.status || latestItem?.approval_status || latestItem?.state
      );

      if (latestStatus !== "Menunggu Persetujuan") {
        throw new Error(`Pengajuan ini sudah berstatus ${latestStatus.toLowerCase()}. Muat ulang daftar verifikasi.`);
      }

      await apiRequest(`/${basePath}/${selected.rawId}/${decision}`, {
        method: "POST",
        body: JSON.stringify({
          note:
            decision === "approve"
              ? "Disetujui melalui halaman Verifikasi & Koreksi."
              : note,
        }),
      });

      setMessage(decision === "approve" ? "Pengajuan berhasil disetujui." : "Pengajuan dikembalikan untuk koreksi.");
      closeDetail();
      await fetchVerifications();
    } catch (err) {
      console.error("Gagal memproses verifikasi persetujuan:", err);
      setError(err.message || "Gagal memproses verifikasi persetujuan.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();
    const matchSearch =
      item.name.toLowerCase().includes(keyword) ||
      item.nip.toLowerCase().includes(keyword) ||
      item.unit.toLowerCase().includes(keyword) ||
      item.type.toLowerCase().includes(keyword);

    const matchStatus =
      statusFilter === "Semua Status" ||
      item.status === statusFilter;

    const matchType =
      typeFilter === "Semua Jenis" ||
      item.type === typeFilter;

    const matchUnit =
      unitFilter === "Semua Unit" ||
      item.unit === unitFilter;

    return matchSearch && matchStatus && matchType && matchUnit;
  });

  const totalPengajuan = data.length;
  const waiting = data.filter((item) => item.status === "Menunggu Persetujuan").length;
  const approved = data.filter((item) => item.status === "Disetujui").length;
  const rejected = data.filter((item) => item.status === "Ditolak").length;

  return (
    <AdminLayout>
      <div className="verification-page">
        <div className="page-heading">
          <div>
            <h2>Verifikasi & Koreksi</h2>
            <p>Verifikasi dan koreksi pengajuan yang tersinkron dengan persetujuan</p>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="settings-success">{message}</div>}

        <div className="verification-summary">
          <div className="verification-card">
            <span>Total Persetujuan</span>
            <strong>{totalPengajuan}</strong>
          </div>

          <div className="verification-card waiting">
            <span>Menunggu Verifikasi</span>
            <strong>{waiting}</strong>
          </div>

          <div className="verification-card approved">
            <span>Disetujui</span>
            <strong>{approved}</strong>
          </div>

          <div className="verification-card rejected">
            <span>Perlu Koreksi</span>
            <strong>{rejected}</strong>
          </div>
        </div>

        <div className="data-panel">
          <div className="data-toolbar">
            <div className="search-box">
              <span>Cari</span>
              <input
                type="text"
                placeholder="Cari nama, NIP, unit, atau jenis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="verification-filters">
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Semua Status</option>
                <option>Menunggu Persetujuan</option>
                <option>Disetujui</option>
                <option>Ditolak</option>
              </select>

              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option>Semua Jenis</option>
                <option>Cuti</option>
                <option>Izin</option>
                <option>Sakit</option>
                <option>Perjadin</option>
                <option>WFA</option>
                <option>Lembur</option>
              </select>

              <select
                className="filter-select"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                <option>Semua Unit</option>
                {[...new Set(data.map((item) => item.unit).filter(Boolean))].map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>

              <button className="primary-button" onClick={() => navigate("/verifikasi/tambah")}>
                + Tambah Koreksi
              </button>
            </div>
          </div>

          {loading && <div className="empty-state">Memuat data verifikasi persetujuan...</div>}

          {!loading && error && (
            <div className="empty-state">
              <p>{error}</p>
              <button className="secondary-button" onClick={fetchVerifications}>
                Coba Lagi
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="employee-table-wrapper">
              <table className="employee-table verification-table">
                <thead>
                  <tr>
                    <th>Pegawai</th>
                    <th>Jenis</th>
                    <th>Periode</th>
                    <th>Durasi</th>
                    <th>Status</th>
                    <th>Tahap</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="employee-name">
                          <div className="employee-avatar">
                            {item.name
                              .split(" ")
                              .map((word) => word[0])
                              .join("")
                              .slice(0, 2)}
                          </div>

                          <div>
                            <strong>{item.name}</strong>
                            <span>{item.nip} - {item.unit}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`approval-type-badge ${statusClass(item.type)}`}>
                          {item.type}
                        </span>
                      </td>

                      <td>{item.startDate}{item.startDate !== item.endDate ? ` - ${item.endDate}` : ""}</td>
                      <td>{item.totalDuration} {item.durationLabel}</td>

                      <td>
                        <span className={`approval-status-badge ${statusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>

                      <td>{item.tahap}</td>

                      <td>
                        <button
                          className="action-button"
                          onClick={() => openDetail(item)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredData.length === 0 && (
                <div className="empty-state">Tidak ada persetujuan yang perlu ditampilkan.</div>
              )}
            </div>
          )}

          {!loading && !error && (
            <div className="table-footer">
              <span>Menampilkan {filteredData.length} persetujuan</span>
            </div>
          )}
        </div>

        {selectedData && (
          <div className="modal-overlay" onClick={closeDetail}>
            <div className="approval-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Detail Verifikasi Persetujuan</h3>
                  <p>{selectedData.name} - {selectedData.unit}</p>
                </div>

                <button className="modal-close" onClick={closeDetail}>
                  X
                </button>
              </div>

              <div className="approval-detail-body">
                <div className="approval-detail-badges">
                  <span className={`approval-type-badge ${statusClass(selectedData.type)}`}>{selectedData.type}</span>
                  <span className={`approval-status-badge ${statusClass(selectedData.status)}`}>{selectedData.status}</span>
                </div>

                <div className="approval-detail-fields">
                  <div><span>Mulai</span><strong>{selectedData.startDate}</strong></div>
                  <div><span>Selesai</span><strong>{selectedData.endDate}</strong></div>
                  <div><span>Durasi</span><strong>{selectedData.totalDuration} {selectedData.durationLabel}</strong></div>
                  <div><span>Diajukan</span><strong>{formatSubmitted(selectedData.submitted)}</strong></div>
                  <div><span>NIP</span><strong>{selectedData.nip}</strong></div>
                  <div><span>Tahap</span><strong>{selectedData.tahap}</strong></div>
                </div>

                <div className="approval-reason-box">
                  <span>Alasan Pengajuan</span>
                  <p>{selectedData.reason}</p>
                </div>

                <div className="approval-flow-box">
                  <span>Alur & Log Persetujuan</span>
                  {selectedData.approvalSteps.length > 0 ? (
                    <div className="approval-step-list">
                      {selectedData.approvalSteps.map((step) => (
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

                <div className="approval-reason-box">
                  <span>Catatan Koreksi/Verifikasi</span>
                  <p>{selectedData.catatan}</p>
                </div>

                <div className="approval-attachments-box">
                  <span>Dokumen Pendukung</span>
                  {selectedData.attachments.length > 0 ? (
                    <div className="approval-attachment-list">
                      {selectedData.attachments.map((attachment, index) => (
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

              {selectedData.status === "Menunggu Persetujuan" && (
                <>
                  <div className="approval-form-field">
                    <label>Catatan koreksi</label>
                    <textarea
                      value={correctionNote}
                      onChange={(event) => setCorrectionNote(event.target.value)}
                      rows="3"
                      placeholder="Tuliskan bagian pengajuan yang harus dikoreksi."
                    />
                  </div>

                  <div className="modal-actions">
                    <button
                      className="reject-submit"
                      onClick={() => decideApprovalRequest(selectedData.id, "reject")}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Memproses..." : "Koreksi / Tolak"}
                    </button>
                    <button
                      className="approve-submit"
                      onClick={() => decideApprovalRequest(selectedData.id, "approve")}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Memproses..." : "Setujui"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Verifikasi;