import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

function TambahUnitKerja() {
  const navigate = useNavigate();
  const backPath = "/unit";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const unitName = String(form.get("nama") || "").trim();

    try {
      setSaving(true);
      setError("");

      if (!unitName) {
        throw new Error("Nama unit kerja wajib diisi.");
      }

      await apiRequest("/work-units", {
        method: "POST",
        body: JSON.stringify({
          nama: unitName,
          kode: form.get("kode") || "",
          deskripsi: form.get("deskripsi") || "",
          is_active: true,
        }),
      });

      navigate(backPath);
    } catch (err) {
      setError(err.message || "Gagal menambahkan unit kerja.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-heading">
        <div>
          <span className="page-breadcrumb">Universitas Tadulako / Manajemen / Unit Kerja</span>
          <h2>Tambah Unit Kerja</h2>
          <p>Buat unit kerja baru pada struktur organisasi.</p>
        </div>
      </div>

      <section className="data-panel employee-form-panel">
        <div className="modal-header">
          <div>
            <h3>Informasi Unit Kerja</h3>
            <p>Lengkapi nama, kode, dan deskripsi unit kerja.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-field full-width">
              <label htmlFor="nama">Nama Unit Kerja</label>
              <input id="nama" name="nama" required placeholder="Contoh: Fakultas Teknik" />
            </div>

            <div className="form-field">
              <label htmlFor="kode">Kode Unit</label>
              <input id="kode" name="kode" placeholder="Contoh: FT" />
            </div>

            <div className="form-field full-width">
              <label htmlFor="deskripsi">Deskripsi</label>
              <textarea id="deskripsi" name="deskripsi" placeholder="Deskripsi unit kerja..." rows="4" />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => navigate(backPath)}>
              Batal
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Unit"}
            </button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
}

export default TambahUnitKerja;