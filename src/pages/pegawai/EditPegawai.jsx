import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import {
  getEmployee,
  getStructuralPositions,
  getWorkUnits,
  updateEmployee,
} from "../../services/pegawaiService";

const initialForm = {
  name: "",
  nip: "",
  nik: "",
  email: "",
  phone: "",
  gender: "L",
  employment_status: "pns",
  employee_type: "dosen",
  work_unit_id: "",
  structural_position_id: "",
  tmt: "",
  grade: "",
  rank: "",
  is_active: true,
  username: "",
  password: "",
};

function normalizeDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function EditPegawai() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [units, setUnits] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [employee, unitData, positionData] = await Promise.all([
          getEmployee(id),
          getWorkUnits(),
          getStructuralPositions().catch(() => []),
        ]);

        setUnits(unitData);
        setPositions(positionData);
        setForm({
          ...initialForm,
          name: employee.name || "",
          nip: employee.nip || "",
          nik: employee.nik || "",
          email: employee.email || "",
          phone: employee.phone || "",
          gender: employee.gender || "L",
          employment_status: employee.employment_status || "pns",
          employee_type: employee.employee_type || "dosen",
          work_unit_id: employee.work_unit?.id || employee.work_unit_id || "",
          structural_position_id:
            employee.structural_position?.id || employee.structural_position_id || "",
          tmt: normalizeDate(employee.tmt),
          grade: employee.grade || "",
          rank: employee.rank || "",
          is_active: employee.is_active !== false,
          username: employee.linked_user?.username || employee.username || "",
          password: "",
        });
      } catch (err) {
        setError(err.message || "Gagal mengambil data pegawai.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "employee_type" && value !== "dosen"
        ? { structural_position_id: "" }
        : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      await updateEmployee(id, {
        name: form.name,
        nip: form.nip || null,
        nik: form.nik || null,
        email: form.email || null,
        phone: form.phone || null,
        gender: form.gender || "L",
        employment_status: form.employment_status,
        employee_type: form.employee_type,
        work_unit_id: Number(form.work_unit_id),
        structural_position_id: form.structural_position_id
          ? Number(form.structural_position_id)
          : null,
        tmt: form.tmt,
        grade: form.grade || null,
        rank: form.rank || null,
        is_active: form.is_active,
        username: form.username || null,
        ...(form.password ? { password: form.password } : {}),
      });

      navigate("/pegawai");
    } catch (err) {
      setError(err.message || "Gagal menyimpan perubahan pegawai.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="empty-state">Memuat data pegawai...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="page-heading">
        <div>
          <h2>Edit Pegawai</h2>
          <p>Perbarui data kepegawaian dan akun login pegawai.</p>
        </div>

        <button className="secondary-button" onClick={() => navigate("/pegawai")}>
          Kembali
        </button>
      </div>

      <section className="data-panel employee-form-panel employee-edit-page">
        <div className="modal-header">
          <div>
            <h3>Informasi Kepegawaian</h3>
            <p>Halaman ini dapat discroll penuh untuk mengubah data pegawai.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-field full-width">
              <label htmlFor="edit-name">Nama Lengkap</label>
              <input
                id="edit-name"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-nip">NIP</label>
              <input
                id="edit-nip"
                value={form.nip}
                onChange={(event) => handleChange("nip", event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-nik">NIK</label>
              <input
                id="edit-nik"
                value={form.nik}
                onChange={(event) => handleChange("nik", event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-email">Email</label>
              <input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-phone">No. HP</label>
              <input
                id="edit-phone"
                value={form.phone}
                onChange={(event) => handleChange("phone", event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-employment-status">Status Kepegawaian</label>
              <select
                id="edit-employment-status"
                value={form.employment_status}
                onChange={(event) => handleChange("employment_status", event.target.value)}
              >
                <option value="pns">PNS</option>
                <option value="pppk">PPPK</option>
                <option value="non_asn">Non-ASN</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="edit-employee-type">Jenis Pegawai</label>
              <select
                id="edit-employee-type"
                value={form.employee_type}
                onChange={(event) => handleChange("employee_type", event.target.value)}
              >
                <option value="dosen">Dosen</option>
                <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="edit-gender">Jenis Kelamin</label>
              <select
                id="edit-gender"
                value={form.gender}
                onChange={(event) => handleChange("gender", event.target.value)}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="edit-tmt">TMT</label>
              <input
                id="edit-tmt"
                type="date"
                value={form.tmt}
                onChange={(event) => handleChange("tmt", event.target.value)}
                required
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="edit-work-unit">Unit Kerja</label>
              <select
                id="edit-work-unit"
                value={form.work_unit_id}
                onChange={(event) => handleChange("work_unit_id", event.target.value)}
                required
              >
                <option value="">Pilih unit kerja</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code ? `${unit.code} - ` : ""}{unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field full-width">
              <label htmlFor="edit-position">Jabatan Struktural</label>
              <select
                id="edit-position"
                value={form.structural_position_id}
                onChange={(event) => handleChange("structural_position_id", event.target.value)}
                disabled={form.employee_type !== "dosen"}
              >
                <option value="">Tidak ada jabatan struktural</option>
                {positions.filter((position) => position.is_active !== false).map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="edit-grade">Golongan</label>
              <input
                id="edit-grade"
                value={form.grade}
                onChange={(event) => handleChange("grade", event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-rank">Pangkat</label>
              <input
                id="edit-rank"
                value={form.rank}
                onChange={(event) => handleChange("rank", event.target.value)}
              />
            </div>
          </div>

          <div className="form-section-title compact">
            <div>
              <strong>Akun Login Pegawai</strong>
              <span>Isi password hanya jika ingin mengganti password.</span>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="edit-username">Username</label>
              <input
                id="edit-username"
                value={form.username}
                onChange={(event) => handleChange("username", event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="edit-password">Password Baru</label>
              <input
                id="edit-password"
                type="password"
                value={form.password}
                onChange={(event) => handleChange("password", event.target.value)}
                placeholder="Kosongkan jika tidak diganti"
              />
            </div>
          </div>

          <label className="form-checkbox edit-active-checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => handleChange("is_active", event.target.checked)}
            />
            Pegawai aktif
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/pegawai")}
              disabled={saving}
            >
              Batal
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
}

export default EditPegawai;