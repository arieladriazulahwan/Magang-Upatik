import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

function Kalender() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiRequest("/holidays");
      setHolidays(normalizeArray(response));
    } catch (err) {
      setError(err.message || "Gagal mengambil data hari libur.");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const getSyncLabel = (holiday) => {
    const status = String(holiday.gcal_status || "").toLowerCase();
    if (status === "terkirim" || status === "synced") return "Tersinkron";
    if (status === "gagal" || status === "failed") return "Gagal";
    return "Menunggu sinkronisasi";
  };

  return (
    <AdminLayout>
      <div className="calendar-page">
        <div className="page-heading">
          <div>
            <h2>Google Calendar</h2>
            <p>Sinkronisasi hari libur nasional dan cuti bersama</p>
          </div>
          <button className="secondary-button" onClick={fetchHolidays} disabled={loading}>
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>

        <div className="calendar-layout">
          <section className="data-panel holiday-panel">
            <div className="panel-header">
              <div>
                <h3>Hari Libur Nasional & Cuti Bersama</h3>
                <p>Data hari libur yang memengaruhi perhitungan kehadiran</p>
              </div>
            </div>

            {loading && <div className="empty-state">Memuat kalender...</div>}
            {!loading && error && (
              <div className="empty-state">
                <p>{error}</p>
                <button className="secondary-button" onClick={fetchHolidays}>Coba Lagi</button>
              </div>
            )}
            {!loading && !error && holidays.length === 0 && (
              <div className="empty-state">Belum ada data hari libur.</div>
            )}
            {!loading && !error && holidays.map((holiday) => (
              <div className="holiday-row" key={holiday.id || `${holiday.date}-${holiday.name}`}>
                <div className="holiday-date">{holiday.date || holiday.start_date || "-"}</div>
                <div className="holiday-divider" />
                <div className="holiday-name">
                  <strong>{holiday.name || holiday.title || "Hari Libur"}</strong>
                  <span>{holiday.description || ""}</span>
                </div>
                <span className={`holiday-type ${String(holiday.type || "nasional").toLowerCase()}`}>
                  {holiday.type || "nasional"}
                </span>
                <span className={`sync-status ${getSyncLabel(holiday).toLowerCase().replace(/\s+/g, "-")}`}>
                  {getSyncLabel(holiday)}
                </span>
              </div>
            ))}
          </section>

          <aside className="calendar-side">
            <section className="data-panel calendar-connection">
              <div className="calendar-connection-icon">□</div>
              <div>
                <h3>Google Calendar</h3>
                <p>Sinkronisasi dikelola oleh backend</p>
              </div>
              <div className="connection-state"><span /> Terhubung</div>
            </section>

            <section className="data-panel calendar-settings">
              <div className="calendar-setting-row">
                <div><strong>Auto-sync harian</strong><span>Tarik perubahan setiap 06:00 WITA</span></div>
                <span className="setting-badge">Backend</span>
              </div>
              <div className="calendar-setting-row">
                <div><strong>Cuti bersama sebagai libur</strong><span>Tidak dihitung sebagai alpha</span></div>
                <span className="setting-badge enabled">Aktif</span>
              </div>
            </section>

            <div className="calendar-note">
              Konfigurasi Google Calendar dan kredensial service account harus dikelola melalui environment backend, bukan disimpan di frontend.
            </div>
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Kalender;
