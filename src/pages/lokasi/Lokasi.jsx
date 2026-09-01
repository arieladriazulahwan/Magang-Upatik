import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { canManageLocations } from "../../utils/access";

const normalizeArray = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	return [];
};

function Lokasi() {
	const canAddLocation = canManageLocations();
	const [locations, setLocations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [showModal, setShowModal] = useState(false);
	const [formError, setFormError] = useState("");

	const fetchLocations = async () => {
		try {
			setLoading(true);
			setError("");
			const response = await apiRequest("/work-locations");
			setLocations(normalizeArray(response));
		} catch (err) {
			setError(err.message || "Endpoint lokasi belum tersedia di backend.");
			setLocations([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchLocations(); }, []);

	const handleAddLocation = async (e) => {
		e.preventDefault();
		const form = new FormData(e.target);

		try {
			setLoading(true);
			setFormError("");

			const locationName = form.get("nama");
			if (!locationName || locationName.trim() === "") {
				throw new Error("Nama lokasi wajib diisi.");
			}

			const latitude = form.get("latitude");
			const longitude = form.get("longitude");
			const radius = form.get("radius_meters");

			if (!latitude || !longitude) {
				throw new Error("Koordinat lokasi wajib diisi.");
			}

			await apiRequest("/work-locations", {
				method: "POST",
				body: JSON.stringify({
					nama: locationName,
					nama_lokasi: locationName,
					nama_tempat: locationName,
					alamat: form.get("alamat") || "",
					address: form.get("alamat") || "",
					latitude: parseFloat(latitude),
					longitude: parseFloat(longitude),
					radius_meters: parseInt(radius) || 100,
					radius: parseInt(radius) || 100,
					is_active: true,
				}),
			});

			setShowModal(false);
			setFormError("");
			await fetchLocations();
		} catch (err) {
			console.error("Gagal menambahkan lokasi:", err);
			setFormError(err.message || "Gagal menambahkan lokasi.");
			setLoading(false);
		}
	};

	return (
		<AdminLayout>
			<div className="location-page">
				<div className="page-heading">
					<div><h2>Lokasi & Geofence</h2><p>Kelola titik presensi dan radius geofence per unit kerja</p></div>
					{canAddLocation && <button className="primary-button" onClick={() => setShowModal(true)}>+ Tambah Lokasi</button>}
				</div>

				<div className="location-layout">
					<section className="data-panel location-map-panel">
						<div className="location-map">
							<div className="map-grid" />
							{locations.map((location, index) => (
								<div className="map-marker" key={location.id || index} style={{ left: `${25 + (index * 18) % 60}%`, top: `${30 + (index * 23) % 45}%` }}>
									<span className="map-radius" style={{ width: `${Math.min(Number(location.radius_meters || location.radius || 100), 300) / 2}px`, height: `${Math.min(Number(location.radius_meters || location.radius || 100), 300) / 2}px` }} />
									<b>●</b>
								</div>
							))}
							{!loading && locations.length === 0 && <div className="map-empty">Belum ada titik lokasi</div>}
							<div className="map-legend">Lingkaran menunjukkan radius geofence presensi</div>
						</div>
					</section>

					<section className="location-list-section">
						<div className="location-list-heading"><h3>Titik Presensi Terdaftar</h3><button className="secondary-button" onClick={fetchLocations} disabled={loading}>Refresh</button></div>
						{loading && <div className="empty-state">Memuat lokasi...</div>}
						{!loading && error && <div className="empty-state"><p>{error}</p><button className="secondary-button" onClick={fetchLocations}>Coba Lagi</button></div>}
						{!loading && !error && locations.map((location) => (
							<article className="location-card" key={location.id}>
								<div className="location-icon">⌖</div>
								<div className="location-card-main"><strong>{location.name || "Lokasi Presensi"}</strong><span>{location.address || location.work_unit?.name || location.unit || "-"}</span></div>
								<div className="location-radius">R {location.radius_meters || location.radius || 100}m<small>Aktif</small></div>
							</article>
						))}
						{!loading && !error && locations.length === 0 && <div className="empty-state">Belum ada lokasi terdaftar.</div>}
					</section>
				</div>

				{showModal && (
					<div className="modal-overlay" onClick={() => setShowModal(false)}>
						<div className="employee-modal" onClick={(e) => e.stopPropagation()}>
							<div className="modal-header">
								<div>
									<h3>Tambah Titik Presensi</h3>
									<p>Buat titik lokasi absen baru dengan geofence</p>
								</div>
								<button className="modal-close" onClick={() => setShowModal(false)}>×</button>
							</div>

							{formError && <div className="form-error">{formError}</div>}

							<form onSubmit={handleAddLocation}>
								<div className="form-grid">
									<div className="form-field">
										<label>Nama Lokasi*</label>
										<input name="nama" required placeholder="Contoh: Gedung Rektorat" />
									</div>

									<div className="form-field">
										<label>Alamat</label>
										<input name="alamat" placeholder="Alamat lokasi" />
									</div>

									<div className="form-field">
										<label>Latitude*</label>
										<input name="latitude" type="number" step="0.000001" required placeholder="-1.234567" />
									</div>

									<div className="form-field">
										<label>Longitude*</label>
										<input name="longitude" type="number" step="0.000001" required placeholder="119.234567" />
									</div>

									<div className="form-field">
										<label>Radius Geofence (meter)</label>
										<input name="radius_meters" type="number" min="10" defaultValue="100" placeholder="100" />
									</div>
								</div>

								<div className="modal-actions">
									<button type="button" className="secondary-button" onClick={() => setShowModal(false)}>
										Batal
									</button>
									<button type="submit" className="primary-button" disabled={loading}>
										{loading ? "Menyimpan..." : "Simpan Lokasi"}
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</AdminLayout>
	);
}

export default Lokasi;
