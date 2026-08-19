import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const normalizeArray = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	return [];
};

function Lokasi() {
	const [locations, setLocations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

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

	return (
		<AdminLayout>
			<div className="location-page">
				<div className="page-heading">
					<div><h2>Lokasi & Geofence</h2><p>Kelola titik presensi dan radius geofence per unit kerja</p></div>
					<button className="primary-button" disabled>+ Tambah Lokasi</button>
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
			</div>
		</AdminLayout>
	);
}

export default Lokasi;
