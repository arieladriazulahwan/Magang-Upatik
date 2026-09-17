import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { canManageUnits } from "../../utils/access";

const getUnitName = (unit) => unit.name || unit.nama || unit.nama_unit || unit.unit_name || "Unit kerja";
const getUnitCode = (unit) => unit.code || unit.kode || unit.kode_unit || "Kode belum tersedia";
const getUnitDescription = (unit) => unit.description || unit.deskripsi || unit.keterangan || "Belum ada deskripsi unit.";
const getUnitParent = (unit) => {
  if (unit.parent && typeof unit.parent === "object") {
    return getUnitName(unit.parent);
  }

  return unit.parent_name || unit.parent || unit.parent_unit_name || "-";
};

const isUnitActive = (unit) => {
  if (typeof unit.is_active === "boolean") return unit.is_active;
  if (typeof unit.active === "boolean") return unit.active;

  const status = String(unit.status || "").toLowerCase();
  if (["nonaktif", "inactive", "disabled"].includes(status)) return false;

  return true;
};

function UnitKerja() {
  const navigate = useNavigate();
  const canAddUnit = canManageUnits();
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiRequest("/work-units");
      const data = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setUnits(data);
    } catch (err) {
      console.error("Gagal mengambil data unit kerja:", err);
      setError(err.message || "Gagal mengambil data unit kerja.");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const filteredUnits = units.filter((unit) => {
    const keyword = search.toLowerCase();
    return `${getUnitName(unit)} ${getUnitCode(unit)} ${getUnitParent(unit)} ${getUnitDescription(unit)}`.toLowerCase().includes(keyword);
  });

  const activeUnits = units.filter(isUnitActive).length;
  const inactiveUnits = Math.max(units.length - activeUnits, 0);

  return (
    <AdminLayout>
      <div className="unit-page">
        <div className="page-heading unit-heading">
          <div>
            <span className="page-breadcrumb">Universitas Tadulako / Manajemen / Unit Kerja</span>
            <h2>Unit Kerja</h2>
            <p>Kelola struktur unit dan akses operasional Universitas Tadulako</p>
          </div>
        </div>

        <div className="unit-summary-grid">
          <div className="unit-summary-card unit-summary-card-primary">
            <span className="unit-summary-icon">UK</span>
            <div><span>Total Unit Kerja</span><strong>{units.length}</strong></div>
          </div>
          <div className="unit-summary-card">
            <span className="unit-summary-icon">A</span>
            <div><span>Unit Aktif</span><strong>{activeUnits} unit</strong></div>
          </div>
          <div className="unit-summary-card">
            <span className="unit-summary-icon">N</span>
            <div><span>Nonaktif</span><strong>{inactiveUnits} unit</strong></div>
          </div>
          <div className="unit-summary-card">
            <span className="unit-summary-icon">H</span>
            <div><span>Hasil Pencarian</span><strong>{filteredUnits.length}</strong></div>
          </div>
        </div>

        <section className="data-panel unit-data-panel">
          <div className="data-toolbar unit-toolbar">
            <div>
              <h3>Daftar Unit Kerja</h3>
              <p>Data unit kerja yang tersimpan pada sistem</p>
            </div>
            <div className="unit-toolbar-actions">
              <div className="unit-search-box">
                <span>Cari</span>
                <input
                  type="search"
                  placeholder="Cari nama atau kode unit..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <button className="secondary-button" onClick={fetchUnits} disabled={loading}>
                {loading ? "Memuat..." : "Refresh"}
              </button>

              {canAddUnit && <button className="primary-button" onClick={() => navigate("/unit/tambah")}>
                Tambah Unit
              </button>}
            </div>
          </div>

          {loading && <div className="empty-state">Memuat data unit kerja...</div>}

          {!loading && error && (
            <div className="empty-state">
              <p>{error}</p>
              <button className="secondary-button" onClick={fetchUnits}>Coba Lagi</button>
            </div>
          )}

          {!loading && !error && (
            <div className="employee-table-wrapper">
              <table className="employee-table unit-table">
                <thead><tr><th>No</th><th>Unit Kerja</th><th>Induk Unit</th><th>Deskripsi</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>
                  {filteredUnits.length > 0 ? filteredUnits.map((unit, index) => (
                    <tr key={unit.id || index}>
                      <td className="unit-number">{String(index + 1).padStart(2, "0")}</td>
                      <td>
                        <div className="unit-identity">
                          <div className="unit-avatar">{getUnitName(unit).charAt(0).toUpperCase()}</div>
                          <div><strong>{getUnitName(unit)}</strong><span>{getUnitCode(unit)}</span></div>
                        </div>
                      </td>
                      <td>{getUnitParent(unit)}</td>
                      <td><span className="unit-description">{getUnitDescription(unit)}</span></td>
                      <td>
                        <span className={`unit-status ${isUnitActive(unit) ? "active" : "inactive"}`}>
                          <i /> {isUnitActive(unit) ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td><button className="action-button" onClick={() => navigate(`/unit/${unit.id}`)}>Detail <span>{">"}</span></button></td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6"><div className="empty-state">{search ? "Unit kerja tidak ditemukan." : "Belum ada data unit kerja."}</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && <div className="table-footer"><span>Menampilkan {filteredUnits.length} dari {units.length} unit kerja</span></div>}
        </section>
      </div>

    </AdminLayout>
  );
}

export default UnitKerja;