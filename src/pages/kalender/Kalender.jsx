import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const getHolidayType = (holiday) => {
  const type = String(
    holiday.type ||
    holiday.holiday_type ||
    "nasional"
  ).toLowerCase();

  if (
    type.includes("cuti") ||
    type.includes("bersama")
  ) {
    return {
      label: "Cuti Bersama",
      className: "cuti-bersama",
    };
  }

  return {
    label: "Nasional",
    className: "nasional",
  };
};

const getSyncStatus = (holiday) => {
  const status = String(
    holiday.gcal_status ||
    holiday.sync_status ||
    ""
  ).toLowerCase();

  if (
    status === "terkirim" ||
    status === "synced" ||
    status === "success" ||
    status === "berhasil"
  ) {
    return {
      label: "Tersinkron",
      className: "synced",
    };
  }

  if (
    status === "gagal" ||
    status === "failed" ||
    status === "error"
  ) {
    return {
      label: "Gagal",
      className: "failed",
    };
  }

  return {
    label: "Menunggu sinkronisasi",
    className: "pending",
  };
};

const formatDate = (dateValue) => {
  if (!dateValue) return "-";

  try {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return dateValue;
  }
};

function Kalender() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/holidays");

      const data = normalizeArray(response);

      setHolidays(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Gagal mengambil data kalender:", err);

      setError(
        err.message ||
        "Gagal mengambil data hari libur."
      );

      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const formatLastUpdated = () => {
    if (!lastUpdated) {
      return "Belum diperbarui";
    }

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Makassar",
    }).format(lastUpdated);
  };

  return (
    <AdminLayout>
      <div className="calendar-page">

        {/* HEADER */}
        <div className="page-heading calendar-page-heading">
          <div>
            <h2>Google Calendar</h2>

            <p>
              Kelola dan pantau data hari libur nasional
              serta cuti bersama
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={fetchHolidays}
            disabled={loading}
          >
            {loading ? "Memuat..." : "↻ Perbarui Data"}
          </button>
        </div>

        {/* LAST UPDATED */}
        {!loading && (
          <div className="calendar-last-updated">
            <span>Terakhir diperbarui:</span>

            <strong>
              {formatLastUpdated()}
            </strong>
          </div>
        )}

        <div className="calendar-layout">

          {/* DAFTAR HARI LIBUR */}
          <section className="data-panel holiday-panel">

            <div className="panel-header holiday-panel-header">
              <div>
                <h3>
                  Hari Libur Nasional & Cuti Bersama
                </h3>

                <p>
                  Data hari libur yang memengaruhi
                  perhitungan kehadiran pegawai
                </p>
              </div>

              {!loading && !error && (
                <span className="holiday-count">
                  {holidays.length} Data
                </span>
              )}
            </div>

            {/* LOADING */}
            {loading && (
              <div className="empty-state">
                Memuat data kalender...
              </div>
            )}

            {/* ERROR */}
            {!loading && error && (
              <div className="empty-state calendar-error">
                <p>{error}</p>

                <button
                  className="secondary-button"
                  onClick={fetchHolidays}
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* EMPTY */}
            {!loading &&
              !error &&
              holidays.length === 0 && (
                <div className="empty-state">
                  Belum ada data hari libur.
                </div>
              )}

            {/* LIST */}
            {!loading &&
              !error &&
              holidays.map((holiday, index) => {
                const type = getHolidayType(holiday);
                const syncStatus = getSyncStatus(holiday);

                const holidayDate =
                  holiday.date ||
                  holiday.start_date ||
                  holiday.holiday_date;

                const holidayName =
                  holiday.name ||
                  holiday.title ||
                  "Hari Libur";

                return (
                  <div
                    className="holiday-row"
                    key={
                      holiday.id ||
                      `${holidayDate}-${index}`
                    }
                  >

                    {/* DATE */}
                    <div className="holiday-date">
                      {formatDate(holidayDate)}
                    </div>

                    <div className="holiday-divider" />

                    {/* NAME */}
                    <div className="holiday-name">
                      <strong>
                        {holidayName}
                      </strong>

                      {holiday.description && (
                        <span>
                          {holiday.description}
                        </span>
                      )}
                    </div>

                    {/* TYPE */}
                    <span
                      className={`holiday-type ${type.className}`}
                    >
                      {type.label}
                    </span>

                    {/* SYNC STATUS */}
                    <span
                      className={`sync-status ${syncStatus.className}`}
                    >
                      {syncStatus.label}
                    </span>

                  </div>
                );
              })}

          </section>

          {/* SIDEBAR */}
          <aside className="calendar-side">

            {/* GOOGLE CALENDAR STATUS */}
            <section className="data-panel calendar-connection">

              <div className="calendar-connection-main">

                <div className="calendar-connection-icon">
                  📅
                </div>

                <div>
                  <h3>Google Calendar</h3>

                  <p>
                    Integrasi kalender presensi
                  </p>
                </div>

              </div>

              <div className="connection-state">
                <span />
                Terhubung
              </div>

            </section>

            {/* SETTINGS */}
            <section className="data-panel calendar-settings">

              <div className="calendar-setting-row">

                <div>
                  <strong>
                    Auto-sync harian
                  </strong>

                  <span>
                    Sinkronisasi dijadwalkan
                    melalui backend
                  </span>
                </div>

                <span className="setting-badge">
                  Backend
                </span>

              </div>

              <div className="calendar-setting-row">

                <div>
                  <strong>
                    Cuti bersama sebagai libur
                  </strong>

                  <span>
                    Tidak dihitung sebagai
                    ketidakhadiran
                  </span>
                </div>

                <span className="setting-badge enabled">
                  Aktif
                </span>

              </div>

            </section>

            {/* INFO */}
            <div className="calendar-note">

              <div className="calendar-note-icon">
                ℹ
              </div>

              <div>
                <strong>
                  Informasi Keamanan
                </strong>

                <p>
                  Konfigurasi Google Calendar,
                  API key, dan kredensial service
                  account harus dikelola melalui
                  environment backend dan tidak
                  disimpan di frontend.
                </p>
              </div>

            </div>

          </aside>

        </div>

      </div>
    </AdminLayout>
  );
}

export default Kalender;