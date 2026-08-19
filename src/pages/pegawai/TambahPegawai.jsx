import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const normalizeArray = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	return [];
};

function TambahPegawai() {
	const navigate = useNavigate();
	const [units, setUnits] = useState([]);
	const [loadingUnits, setLoadingUnits] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const fetchUnits = async () => {
			try {
				const response = await apiRequest("/work-units");
				setUnits(normalizeArray(response));
			} catch (err) {
				setError(err.message || "Gagal mengambil daftar unit kerja.");
			} finally {
				setLoadingUnits(false);
			}
		};

		fetchUnits();
	}, []);

	const handleSubmit = async (event) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);

		try {
			setSaving(true);
			setError("");

			await apiRequest("/employees", {
				method: "POST",
				body: JSON.stringify({
					name: form.get("name"),
					nip: form.get("nip") || null,
					nik: form.get("nik") || null,
					email: form.get("email") || null,
					phone: form.get("phone") || null,
					gender: form.get("gender") || null,
					employment_status: form.get("employment_status"),
					employee_type: form.get("employee_type"),
					work_unit_id: Number(form.get("work_unit_id")),
					structural_position_id: form.get("structural_position_id")
						? Number(form.get("structural_position_id"))
						: null,
					tmt: form.get("tmt"),
					grade: form.get("grade") || null,
					rank: form.get("rank") || null,
					is_active: true,
				}),
			});

			navigate("/pegawai");
		} catch (err) {
			setError(err.message || "Gagal menyimpan data pegawai.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<AdminLayout>
			<div className="page-heading">
				<div>
					<h2>Tambah Pegawai</h2>
					<p>Master data pegawai, data wajah dienroll terpisah</p>
				</div>
			</div>

			<section className="data-panel employee-form-panel">
				<div className="modal-header">
					<div>
						<h3>Informasi Kepegawaian</h3>
						<p>Lengkapi data sesuai struktur organisasi Untad.</p>
					</div>
				</div>

				<form onSubmit={handleSubmit}>
					{error && <div className="form-error">{error}</div>}

					<div className="form-grid">
						<div className="form-field full-width">
							<label htmlFor="name">Nama Lengkap</label>
							<input id="name" name="name" required placeholder="mis. Dr. Andi Pratama, M.T." />
						</div>

						<div className="form-field">
							<label htmlFor="nip">NIP</label>
							<input id="nip" name="nip" placeholder="18 digit" />
						</div>
						<div className="form-field">
							<label htmlFor="nik">NIK</label>
							<input id="nik" name="nik" placeholder="16 digit" />
						</div>
						<div className="form-field">
							<label htmlFor="email">Email</label>
							<input id="email" name="email" type="email" placeholder="nama@untad.ac.id" />
						</div>
						<div className="form-field">
							<label htmlFor="phone">No. HP</label>
							<input id="phone" name="phone" placeholder="08xx" />
						</div>
						<div className="form-field">
							<label htmlFor="employment_status">Status Kepegawaian</label>
							<select id="employment_status" name="employment_status" defaultValue="pns">
								<option value="pns">PNS</option>
								<option value="pppk">PPPK</option>
								<option value="non_asn">Non-ASN</option>
							</select>
						</div>
						<div className="form-field">
							<label htmlFor="employee_type">Jenis Pegawai</label>
							<select id="employee_type" name="employee_type" defaultValue="dosen">
								<option value="dosen">Dosen</option>
								<option value="tenaga_kependidikan">Tenaga Kependidikan</option>
							</select>
						</div>
						<div className="form-field">
							<label htmlFor="gender">Jenis Kelamin</label>
							<select id="gender" name="gender" defaultValue="L">
								<option value="L">Laki-laki</option>
								<option value="P">Perempuan</option>
							</select>
						</div>
						<div className="form-field">
							<label htmlFor="tmt">TMT</label>
							<input id="tmt" name="tmt" type="date" required />
						</div>
						<div className="form-field full-width">
							<label htmlFor="work_unit_id">Unit Kerja</label>
							<select id="work_unit_id" name="work_unit_id" required disabled={loadingUnits}>
								<option value="">{loadingUnits ? "Memuat unit kerja..." : "Pilih unit kerja"}</option>
								{units.map((unit) => (
									<option key={unit.id} value={unit.id}>
										{unit.code ? `${unit.code} - ` : ""}{unit.name}
									</option>
								))}
							</select>
						</div>
						<div className="form-field">
							<label htmlFor="grade">Golongan</label>
							<input id="grade" name="grade" placeholder="mis. III/c" />
						</div>
						<div className="form-field">
							<label htmlFor="rank">Pangkat</label>
							<input id="rank" name="rank" placeholder="mis. Penata" />
						</div>
					</div>

					<div className="form-note">
						Kategori jam kerja dihitung otomatis dari jenis pegawai dan jabatan. Data wajah dienroll setelah pegawai tersimpan.
					</div>

					<div className="modal-actions">
						<button type="button" className="secondary-button" onClick={() => navigate("/pegawai")}>
							Batal
						</button>
						<button type="submit" className="primary-button" disabled={saving || loadingUnits}>
							{saving ? "Menyimpan..." : "Simpan Pegawai"}
						</button>
					</div>
				</form>
			</section>
		</AdminLayout>
	);
}

export default TambahPegawai;
