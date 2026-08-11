import AdminLayout from "../../components/layout/AdminLayout";

function DetailPengajuan() {
  const pengajuan = {
    nama: "Siti Rahma",
    nip: "198704152012022002",
    unit: "Fakultas Ekonomi",
    jenis: "Izin",
    tanggalMulai: "11 Agustus 2026",
    tanggalSelesai: "11 Agustus 2026",
    alasan: "Keperluan keluarga",
    tanggalPengajuan: "10 Agustus 2026, 14:20",
    status: "Menunggu",
    catatan: "-",
  };

  return (
    <AdminLayout>

      <div className="detail-pengajuan-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>
            <h2>Detail Pengajuan</h2>

            <p>
              Informasi lengkap pengajuan pegawai
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={() => window.history.back()}
          >
            ← Kembali
          </button>

        </div>

        {/* STATUS */}

        <div className="detail-status-card">

          <div>

            <span>
              Status Pengajuan
            </span>

            <strong className="status-menunggu">
              {pengajuan.status}
            </strong>

          </div>

          <div className="detail-submitted">

            Diajukan pada{" "}

            <strong>
              {pengajuan.tanggalPengajuan}
            </strong>

          </div>

        </div>

        {/* INFORMASI PEGAWAI */}

        <section className="data-panel">

          <div className="detail-section-header">

            <h3>
              Informasi Pegawai
            </h3>

          </div>

          <div className="detail-content">

            <div className="detail-person">

              <div className="employee-avatar large">
                {pengajuan.nama.charAt(0)}
              </div>

              <div>

                <strong>
                  {pengajuan.nama}
                </strong>

                <span>
                  NIP. {pengajuan.nip}
                </span>

                <small>
                  {pengajuan.unit}
                </small>

              </div>

            </div>

          </div>

        </section>

        {/* INFORMASI PENGAJUAN */}

        <section className="data-panel">

          <div className="detail-section-header">

            <h3>
              Informasi Pengajuan
            </h3>

          </div>

          <div className="detail-grid">

            <div className="detail-item">

              <span>
                Jenis Pengajuan
              </span>

              <strong>
                {pengajuan.jenis}
              </strong>

            </div>

            <div className="detail-item">

              <span>
                Tanggal Mulai
              </span>

              <strong>
                {pengajuan.tanggalMulai}
              </strong>

            </div>

            <div className="detail-item">

              <span>
                Tanggal Selesai
              </span>

              <strong>
                {pengajuan.tanggalSelesai}
              </strong>

            </div>

            <div className="detail-item">

              <span>
                Tanggal Pengajuan
              </span>

              <strong>
                {pengajuan.tanggalPengajuan}
              </strong>

            </div>

          </div>

          <div className="detail-reason">

            <span>
              Alasan Pengajuan
            </span>

            <p>
              {pengajuan.alasan}
            </p>

          </div>

        </section>

        {/* CATATAN */}

        <section className="data-panel">

          <div className="detail-section-header">

            <h3>
              Catatan Persetujuan
            </h3>

          </div>

          <div className="detail-content">

            <p className="approval-note">
              {pengajuan.catatan}
            </p>

          </div>

        </section>

        {/* ACTION */}

        {pengajuan.status === "Menunggu" && (

          <div className="detail-actions">

            <button
              className="reject-button large-button"
            >
              ✕ Tolak Pengajuan
            </button>

            <button
              className="approve-button large-button"
            >
              ✓ Setujui Pengajuan
            </button>

          </div>

        )}

      </div>

    </AdminLayout>
  );
}

export default DetailPengajuan;