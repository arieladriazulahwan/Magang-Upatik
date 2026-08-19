import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

function DetailPegawai() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [employee, setEmployee] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const fetchEmployee = async () => {
			try {
				const response = await apiRequest(`/employees/${id}`);
				setEmployee(response?.data || response);
			} catch (err) {
				setError(err.message || "Gagal mengambil detail pegawai.");
			} finally {
				setLoading(false);
			}
		};

		fetchEmployee();
	}, [id]);

	if (loading) {
		return <AdminLayout><div className="empty-state">Memuat detail pegawai...</div></AdminLayout>;
	}

	if (error || !employee) {
		return (
			<AdminLayout>
				<div className="empty-state">
					<p>{error || "Pegawai tidak ditemukan."}</p>
					<button className="secondary-button" onClick={() => navigate("/pegawai")}>Kembali</button>
				</div>
			</AdminLayout>
		);
	}

	const name = employee.name || employee.nama || "Pegawai";
	const status = employee.employment_status || employee.status || "-";
	const type = employee.employee_type || employee.type || "-";
	const unit = employee.work_unit?.name || employee.unit || employee.unit_kerja || "-";
	const faceSamples = employee.face_data_count || employee.face_samples || employee.face_count || 0;

	return (
		<AdminLayout>
			<div className="page-heading">
				<div>
					<h2>Detail Pegawai</h2>
					<p>Informasi kepegawaian dan status enrollment wajah</p>
				</div>
				<button className="secondary-button" onClick={() => navigate("/pegawai")}>Kembali</button>
			</div>

			<div className="employee-detail-grid">
				<section className="data-panel employee-profile-card">
					<div className="employee-detail-heading">
						<div className="employee-avatar large">{name.charAt(0).toUpperCase()}</div>
						<div>
							<h3>{name}</h3>
							<p>{employee.nip || "Tanpa NIP"}</p>
							<div className="detail-badges">
								<span className="status-pill active">{status}</span>
								<span className="face-status registered">{type}</span>
							</div>
						</div>
					</div>
				</section>

				<section className="data-panel">
					<div className="panel-header"><h3>Data Wajah</h3></div>
					<div className="detail-body">
						<strong className={faceSamples > 0 ? "detail-success" : "detail-warning"}>
							{faceSamples > 0 ? `${faceSamples} sampel terdaftar` : "Belum terdaftar"}
						</strong>
						<p>Enrollment wajah dilakukan terpisah setelah data pegawai tersimpan.</p>
					</div>
				</section>

				<section className="data-panel">
					<div className="panel-header"><h3>Informasi Kepegawaian</h3></div>
					<div className="detail-list">
						<div><span>NIK</span><strong>{employee.nik || "-"}</strong></div>
						<div><span>Email</span><strong>{employee.email || "-"}</strong></div>
						<div><span>No. HP</span><strong>{employee.phone || "-"}</strong></div>
						<div><span>Jenis Kelamin</span><strong>{employee.gender || "-"}</strong></div>
						<div><span>TMT</span><strong>{employee.tmt || "-"}</strong></div>
						<div><span>Golongan / Pangkat</span><strong>{employee.grade || "-"} / {employee.rank || "-"}</strong></div>
					</div>
				</section>

				<section className="data-panel">
					<div className="panel-header"><h3>Penempatan</h3></div>
					<div className="detail-body">
						<strong>{unit}</strong>
						<p>{employee.structural_position?.name || employee.position || employee.jabatan || "Tidak ada jabatan struktural"}</p>
					</div>
				</section>
			</div>
		</AdminLayout>
	);
}

export default DetailPegawai;
