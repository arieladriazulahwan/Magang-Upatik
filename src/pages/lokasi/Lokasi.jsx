import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { canManageLocations } from "../../utils/access";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_MAP_CENTER = { lat: -0.899, lng: 119.87 };
let googleMapsLoader = null;

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const getUnitName = (unit) => unit.name || unit.nama || unit.nama_unit || unit.unit_name || "Unit kerja";
const getUnitCode = (unit) => unit.code || unit.kode || unit.kode_unit || "";
const getUnitLabel = (unit) => {
  const code = getUnitCode(unit);
  return code ? `${code} - ${getUnitName(unit)}` : getUnitName(unit);
};

const normalizeLocation = (location) => ({
  id: location.id,
  name: location.name || location.nama || location.nama_lokasi || location.nama_tempat || "Lokasi Presensi",
  address: location.address || location.alamat || "-",
  latitude: Number(location.latitude || location.lat || 0),
  longitude: Number(location.longitude || location.lng || location.lon || 0),
  radius: Number(location.radius_meters || location.radius || 100),
  work_unit_id: location.work_unit_id || location.work_unit?.id || "",
  work_unit_name: location.work_unit?.name || location.work_unit_name || location.unit || "Tanpa unit",
  is_active: location.is_active !== false,
});

const loadGoogleMaps = () => {
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("API key Google Maps belum dikonfigurasi."));
  }

  if (googleMapsLoader) return googleMapsLoader;

  googleMapsLoader = new Promise((resolve, reject) => {
    const existingScript = document.getElementById("google-maps-script");

    window.__klikPresensiGoogleMapsReady = () => {
      resolve(window.google.maps);
    };

    if (existingScript) {
      existingScript.addEventListener("error", () => reject(new Error("Google Maps gagal dimuat.")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=__klikPresensiGoogleMapsReady`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps gagal dimuat."));
    document.head.appendChild(script);
  });

  return googleMapsLoader;
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function GoogleLocationMap({ locations, defaultCenter, loading }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let active = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!active || !mapElementRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapElementRef.current, {
            center: defaultCenter,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            clickableIcons: false,
          });
        }

        overlaysRef.current.forEach((overlay) => overlay.setMap(null));
        overlaysRef.current = [];

        if (locations.length === 0) {
          mapRef.current.setCenter(defaultCenter);
          mapRef.current.setZoom(15);
          return;
        }

        const bounds = new maps.LatLngBounds();
        const infoWindow = new maps.InfoWindow();

        locations.forEach((location) => {
          const position = { lat: location.latitude, lng: location.longitude };
          bounds.extend(position);

          const marker = new maps.Marker({
            map: mapRef.current,
            position,
            title: location.name,
          });

          marker.addListener("click", () => {
            infoWindow.setContent(`
              <div style="min-width:180px">
                <strong>${escapeHtml(location.name)}</strong>
                <div style="margin-top:4px;color:#64748b">${escapeHtml(location.address)}</div>
                <div style="margin-top:6px">Radius: ${escapeHtml(location.radius)} m</div>
              </div>
            `);
            infoWindow.open(mapRef.current, marker);
          });

          const circle = new maps.Circle({
            map: mapRef.current,
            center: position,
            radius: location.radius,
            strokeColor: "#2563eb",
            strokeOpacity: 0.85,
            strokeWeight: 2,
            fillColor: "#2563eb",
            fillOpacity: 0.16,
          });

          overlaysRef.current.push(marker, circle);
        });

        mapRef.current.fitBounds(bounds, 56);

        if (locations.length === 1) {
          maps.event.addListenerOnce(mapRef.current, "bounds_changed", () => {
            if (mapRef.current.getZoom() > 17) {
              mapRef.current.setZoom(17);
            }
          });
        }
      })
      .catch((error) => {
        if (active) setMapError(error.message || "Google Maps gagal dimuat.");
      });

    return () => {
      active = false;
    };
  }, [defaultCenter, locations]);

  return (
    <div className="google-map-shell">
      <div className="google-map-canvas" ref={mapElementRef} />
      {(mapError || (!loading && locations.length === 0)) && (
        <div className="map-empty-overlay">{mapError || "Belum ada titik lokasi"}</div>
      )}
    </div>
  );
}

function Lokasi() {
  const canManage = canManageLocations();
  const [locations, setLocations] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("semua");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [activeFormLocation, setActiveFormLocation] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError("");

      const [locationResponse, unitResponse] = await Promise.all([
        apiRequest("/work-locations"),
        apiRequest("/work-units"),
      ]);

      setLocations(normalizeArray(locationResponse).map(normalizeLocation));
      setUnits(normalizeArray(unitResponse));
    } catch (err) {
      console.error("Gagal mengambil lokasi:", err);
      setError(err.message || "Gagal mengambil data lokasi.");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const filteredLocations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return locations.filter((location) => {
      const matchUnit = unitFilter === "semua" || String(location.work_unit_id) === unitFilter;
      const matchSearch =
        !keyword ||
        [location.name, location.address, location.work_unit_name, location.radius]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      return matchUnit && matchSearch;
    });
  }, [locations, search, unitFilter]);

  const validLocations = filteredLocations.filter(
    (location) => location.latitude !== 0 && location.longitude !== 0
  );

  const openCreateForm = () => {
    setFormError("");
    setActiveFormLocation({});
  };

  const openEditForm = (location) => {
    setFormError("");
    setActiveFormLocation(location);
  };

  const closeForm = () => {
    if (saving) return;
    setActiveFormLocation(null);
    setFormError("");
  };

  const handleSaveLocation = async (event) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const workUnitId = form.get("work_unit_id");
    const latitude = form.get("latitude");
    const longitude = form.get("longitude");
    const radius = form.get("radius_meters");

    try {
      setSaving(true);
      setFormError("");

      if (!name) throw new Error("Nama lokasi wajib diisi.");
      if (!workUnitId) throw new Error("Unit kerja wajib dipilih.");
      if (latitude === "" || longitude === "") throw new Error("Latitude dan longitude wajib diisi.");

      const payload = {
        name,
        work_unit_id: Number(workUnitId),
        address: String(form.get("address") || "").trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius_meters: Number(radius) || 100,
        is_active: form.get("is_active") === "on",
      };

      const isEdit = Boolean(activeFormLocation?.id);

      await apiRequest(isEdit ? `/work-locations/${activeFormLocation.id}` : "/work-locations", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      setActiveFormLocation(null);
      await fetchLocations();
    } catch (err) {
      console.error("Gagal menyimpan lokasi:", err);
      setFormError(err.message || "Gagal menyimpan lokasi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (location) => {
    if (!window.confirm(`Yakin ingin menghapus lokasi "${location.name}"?`)) return;

    try {
      setDeletingId(location.id);
      setError("");

      await apiRequest(`/work-locations/${location.id}`, { method: "DELETE" });
      await fetchLocations();
    } catch (err) {
      console.error("Gagal menghapus lokasi:", err);
      setError(err.message || "Gagal menghapus lokasi.");
    } finally {
      setDeletingId(null);
    }
  };

  const formTitle = activeFormLocation?.id ? "Edit Titik Presensi" : "Tambah Titik Presensi";

  return (
    <AdminLayout>
      <div className="location-page">
        <div className="page-heading">
          <div>
            <h2>Lokasi & Geofence</h2>
            <p>Kelola titik presensi masuk berdasarkan unit kerja</p>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <section className="data-panel location-management-panel">
          <div className="data-toolbar location-toolbar">
            <div className="search-box location-search-box">
              <span>Cari</span>
              <input
                type="search"
                placeholder="Nama lokasi, alamat, atau unit..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="location-toolbar-actions">
              <select
                className="filter-select"
                value={unitFilter}
                onChange={(event) => setUnitFilter(event.target.value)}
              >
                <option value="semua">Semua Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={String(unit.id)}>
                    {getUnitLabel(unit)}
                  </option>
                ))}
              </select>

              <button className="secondary-button" type="button" onClick={fetchLocations} disabled={loading}>
                {loading ? "Memuat..." : "Refresh"}
              </button>

              {canManage && (
                <button className="primary-button" type="button" onClick={openCreateForm}>
                  Tambah Lokasi
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="location-layout">
          <section className="data-panel location-map-panel">
            <div className="location-map-google">
              <GoogleLocationMap
                locations={validLocations}
                defaultCenter={DEFAULT_MAP_CENTER}
                loading={loading}
              />
            </div>
          </section>

          <section className="location-list-section">
            <div className="location-list-heading">
              <h3>Titik Presensi</h3>
              <span>{filteredLocations.length} lokasi</span>
            </div>

            {loading && <div className="empty-state">Memuat lokasi...</div>}

            {!loading &&
              !error &&
              filteredLocations.map((location) => (
                <article className="location-card" key={location.id}>
                  <div className="location-icon">LP</div>

                  <div className="location-card-main">
                    <strong>{location.name}</strong>
                    <span>{location.address}</span>
                    <small>Unit presensi: {location.work_unit_name}</small>
                  </div>

                  <div className="location-radius">
                    <span>{location.radius} m</span>
                    <small className={location.is_active ? "status-active" : "status-inactive"}>
                      {location.is_active ? "Aktif" : "Nonaktif"}
                    </small>
                  </div>

                  {canManage && (
                    <div className="location-card-actions">
                      <button className="action-button" type="button" onClick={() => openEditForm(location)}>
                        Edit
                      </button>
                      <button
                        className="delete-location-button"
                        type="button"
                        onClick={() => handleDeleteLocation(location)}
                        disabled={deletingId === location.id}
                      >
                        {deletingId === location.id ? "Menghapus..." : "Hapus"}
                      </button>
                    </div>
                  )}
                </article>
              ))}

            {!loading && !error && filteredLocations.length === 0 && (
              <div className="empty-state">
                {locations.length === 0 ? "Belum ada lokasi terdaftar." : "Lokasi tidak ditemukan."}
              </div>
            )}
          </section>
        </div>

        {activeFormLocation && (
          <div className="modal-overlay" onClick={closeForm}>
            <div className="employee-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>{formTitle}</h3>
                  <p>Isi koordinat dan radius geofence untuk unit kerja.</p>
                </div>
                <button className="modal-close" type="button" onClick={closeForm}>
                  x
                </button>
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <form onSubmit={handleSaveLocation}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Nama Lokasi*</label>
                    <input
                      name="name"
                      type="text"
                      required
                      defaultValue={activeFormLocation.name || ""}
                      placeholder="Contoh: Gedung Rektorat"
                    />
                  </div>

                  <div className="form-field">
                    <label>Unit Presensi*</label>
                    <select name="work_unit_id" required defaultValue={activeFormLocation.work_unit_id || ""}>
                      <option value="" disabled>
                        Pilih unit kerja
                      </option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {getUnitLabel(unit)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field full-width">
                    <label>Alamat</label>
                    <input
                      name="address"
                      type="text"
                      defaultValue={activeFormLocation.address === "-" ? "" : activeFormLocation.address || ""}
                      placeholder="Masukkan alamat lokasi"
                    />
                  </div>

                  <div className="form-field">
                    <label>Latitude*</label>
                    <input
                      name="latitude"
                      type="number"
                      step="any"
                      required
                      defaultValue={activeFormLocation.latitude || ""}
                      placeholder="-0.900000"
                    />
                  </div>

                  <div className="form-field">
                    <label>Longitude*</label>
                    <input
                      name="longitude"
                      type="number"
                      step="any"
                      required
                      defaultValue={activeFormLocation.longitude || ""}
                      placeholder="119.870000"
                    />
                  </div>

                  <div className="form-field">
                    <label>Radius Geofence (meter)</label>
                    <input
                      name="radius_meters"
                      type="number"
                      min="10"
                      max="10000"
                      defaultValue={activeFormLocation.radius || 100}
                      placeholder="100"
                    />
                  </div>

                  <label className="form-checkbox location-active-checkbox">
                    <input
                      name="is_active"
                      type="checkbox"
                      defaultChecked={activeFormLocation.is_active !== false}
                    />
                    Lokasi aktif
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="secondary-button" onClick={closeForm} disabled={saving}>
                    Batal
                  </button>
                  <button type="submit" className="primary-button" disabled={saving}>
                    {saving ? "Menyimpan..." : "Simpan Lokasi"}
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