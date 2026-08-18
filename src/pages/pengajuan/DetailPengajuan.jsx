import { useLocation, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";

function DetailPengajuan() {
  const location = useLocation();
  const navigate = useNavigate();

  const pengajuan = location.state?.pengajuan;

  // Jika halaman dibuka langsung tanpa memilih data
  if (!pengajuan) {
    return (
      <AdminLayout>
        <div className="detail-pengajuan-page">

          <div className="data-panel empty-detail">

            <div className="empty-detail-icon">
              !
            </div>

            <h3>
              Data Pengajuan Tidak Ditemukan
            </h3>

            <p>
              Silakan kembali ke halaman pengajuan
              dan pilih data yang ingin dilihat.
            </p>

            <button
              className="primary-button"
              onClick={() =>
                navigate("/pengajuan")
              }
            >
              ← Kembali ke Pengajuan
            </button>

          </div>

        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>

      <div className="detail-pengajuan-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>

            <h2>
              Detail Pengajuan
            </h2>

            <p>
              Informasi lengkap pengajuan pegawai
            </p>

          </div>

          <button
            className="secondary-button"
            onClick={() =>
              navigate("/pengajuan")
            }
          >
            ← Kembali
          </button>

        </div>

        {/* STATUS */}

        <section className="detail-status-card">

          <div className="detail-status-left">

            <span>
              Status Pengajuan
            </span>

            <strong
              className={`detail-status ${pengajuan.status
                ?.toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {pengajuan.status}
            </strong>

          </div>

          <div className="detail-submitted">

            Diajukan pada

            <strong>
              {pengajuan.submitted || "-"}
            </strong>

          </div>

        </section>

        {/* INFORMASI PEGAWAI */}

        <section className="data-panel">

          <div className="detail-section-header">

            <div>

              <h3>
                Informasi Pegawai
              </h3>

              <p>
                Data pegawai yang mengajukan
              </p>

            </div>

          </div>

          <div className="detail-content">

            <div className="detail-person">

              <div className="employee-avatar detail-avatar">

                {pengajuan.name
                  ?.charAt(0)
                  .toUpperCase()}

              </div>

              <div className="detail-person-info">

                <strong>
                  {pengajuan.name}
                </strong>

                <span>
                  NIP. {pengajuan.nip}
                </span>

                <span>
                  {pengajuan.unit}
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* INFORMASI PENGAJUAN */}

        <section className="data-panel">

          <div className="detail-section-header">

            <div>

              <h3>
                Informasi Pengajuan
              </h3>

              <p>
                Detail izin, cuti, atau dinas
              </p>

            </div>

          </div>

          <div className="detail-grid">

            <div className="detail-item">

              <span>
                Jenis Pengajuan
              </span>

              <strong>
                {pengajuan.type}
              </strong>

            </div>

            <div className="detail-item">

              <span>
                Tanggal Mulai
              </span>

              <strong>
                {pengajuan.startDate}
              </strong>

            </div>

            <div className="detail-item">

              <span>
                Tanggal Selesai
              </span>

              <strong>
                {pengajuan.endDate}
              </strong>

            </div>

            <div className="detail-item">

              <span>
                Tanggal Pengajuan
              </span>

              <strong>
                {pengajuan.submitted}
              </strong>

            </div>

          </div>

          {/* ALASAN */}

          <div className="detail-reason">

            <span>
              Alasan Pengajuan
            </span>

            <div className="reason-box">

              {pengajuan.reason ||
                "Tidak ada alasan yang diberikan."}

            </div>

          </div>

        </section>

        {/* DOKUMEN */}

        <section className="data-panel">

          <div className="detail-section-header">

            <div>

              <h3>
                Dokumen Pendukung
              </h3>

              <p>
                Dokumen yang dilampirkan pada pengajuan
              </p>

            </div>

          </div>

          <div className="document-item">

            <div className="document-icon">
              PDF
            </div>

            <div className="document-info">

              <strong>
                Dokumen Pendukung
              </strong>

              <span>
                Lampiran pengajuan
              </span>

            </div>

            <button
              className="action-button"
              onClick={() =>
                alert(
                  "Fitur melihat dokumen akan tersedia setelah backend terhubung."
                )
              }
            >
              Lihat
            </button>

          </div>

        </section>

        {/* CATATAN */}

        <section className="data-panel">

          <div className="detail-section-header">

            <div>

              <h3>
                Catatan
              </h3>

              <p>
                Catatan dari proses persetujuan
              </p>

            </div>

          </div>

          <div className="detail-content">

            <div className="approval-note">

              Belum ada catatan dari pejabat
              yang melakukan persetujuan.

            </div>

          </div>

        </section>

        {/* ACTION */}

        {pengajuan.status === "Menunggu" && (

          <section className="detail-action-panel">

            <div>

              <strong>
                Tindakan Pengajuan
              </strong>

              <p>
                Silakan pilih tindakan untuk
                pengajuan ini.
              </p>

            </div>

            <div className="detail-actions">

              <button
                className="reject-button"
                onClick={() => {
                  alert(
                    "Pengajuan akan ditolak."
                  );
                }}
              >
                ✕ Tolak
              </button>

              <button
                className="approve-button"
                onClick={() => {
                  alert(
                    "Pengajuan akan disetujui."
                  );
                }}
              >
                ✓ Setujui
              </button>

            </div>

          </section>

        )}

      </div>

    </AdminLayout>
  );
}

export default DetailPengajuan;