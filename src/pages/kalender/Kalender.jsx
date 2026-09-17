import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const WEEK_DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const toDateKey = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getHolidayDate = (holiday) =>
  holiday.date || holiday.start_date || holiday.holiday_date || holiday.tanggal || "";

const getHolidayName = (holiday) =>
  holiday.name || holiday.title || holiday.summary || "Hari Libur";

const getHolidayType = (holiday) => {
  const type = String(holiday.type || holiday.holiday_type || holiday.category || "nasional").toLowerCase();

  if (type.includes("cuti") || type.includes("bersama")) {
    return { label: "Cuti Bersama", className: "cuti-bersama" };
  }

  return { label: "Hari Libur Nasional", className: "nasional" };
};

const getSyncStatus = (holiday) => {
  const status = String(holiday.gcal_status || holiday.sync_status || "").toLowerCase();
  const legalBasis = String(holiday.legal_basis || "").trim().toLowerCase();

  if (
    holiday.gcal_event_id ||
    legalBasis === "google calendar" ||
    ["terkirim", "synced", "success", "berhasil"].includes(status)
  ) {
    return { label: "Tersinkron", className: "synced" };
  }

  if (["gagal", "failed", "error"].includes(status)) {
    return { label: "Gagal", className: "failed" };
  }

  return { label: "Menunggu", className: "pending" };
};

const formatLongDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatMonthTitle = (date) =>
  date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

const buildCalendarDays = (activeMonth, eventsByDate) => {
  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const firstDate = new Date(year, month, 1);
  const startOffset = (firstDate.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const key = toDateKey(date);

    return {
      key,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: key === toDateKey(new Date()),
      events: eventsByDate.get(key) || [],
    };
  });
};

function Kalender() {
  const [holidays, setHolidays] = useState([]);
  const [activeMonth, setActiveMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/holidays");
      setHolidays(normalizeArray(response));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Gagal mengambil data kalender:", err);
      setError(err.message || "Gagal mengambil data hari libur.");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const events = useMemo(() => {
    return holidays
      .map((holiday) => {
        const date = getHolidayDate(holiday);
        const type = getHolidayType(holiday);
        const syncStatus = getSyncStatus(holiday);

        return {
          id: holiday.id || `${date}-${getHolidayName(holiday)}`,
          date,
          key: toDateKey(date),
          name: getHolidayName(holiday),
          description: holiday.description || holiday.legal_basis || "",
          type,
          syncStatus,
        };
      })
      .filter((event) => event.key);
  }, [holidays]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const dayEvents = map.get(event.key) || [];
      dayEvents.push(event);
      map.set(event.key, dayEvents);
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(
    () => buildCalendarDays(activeMonth, eventsByDate),
    [activeMonth, eventsByDate]
  );

  const monthEvents = useMemo(() => {
    const month = activeMonth.getMonth();
    const year = activeMonth.getFullYear();

    return events
      .filter((event) => {
        const date = new Date(event.date);
        return !Number.isNaN(date.getTime()) && date.getMonth() === month && date.getFullYear() === year;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [activeMonth, events]);

  const nationalEvents = monthEvents.filter((event) => event.type.className === "nasional");
  const sharedLeaveEvents = monthEvents.filter((event) => event.type.className === "cuti-bersama");
  const workDays = calendarDays.filter((day) => {
    const dayNumber = day.date.getDay();
    return day.isCurrentMonth && dayNumber !== 0 && dayNumber !== 6 && day.events.length === 0;
  }).length;
  const todayKey = toDateKey(new Date());
  const upcomingEvents = monthEvents.filter((event) => event.key >= todayKey);

  const handleMonthChange = (event) => {
    const [year, month] = event.target.value.split("-").map(Number);
    setActiveMonth(new Date(year, month - 1, 1));
  };

  const moveMonth = (step) => {
    setActiveMonth((current) => new Date(current.getFullYear(), current.getMonth() + step, 1));
  };

  const goToday = () => {
    const today = new Date();
    setActiveMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return "Belum diperbarui";

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
        <div className="page-heading calendar-page-heading">
          <div>
            <span className="page-breadcrumb">Universitas Tadulako / SI-PRESENSI</span>
            <h2>Google Calendar</h2>
            <p>Kelola dan pantau data hari libur nasional serta cuti bersama</p>
          </div>
        </div>

        <section className="calendar-toolbar">
          <label className="calendar-month-picker">
            <span>Kalender</span>
            <input
              type="month"
              value={`${activeMonth.getFullYear()}-${String(activeMonth.getMonth() + 1).padStart(2, "0")}`}
              onChange={handleMonthChange}
            />
          </label>

          <div className="calendar-view-tabs" aria-label="Tampilan kalender">
            <button className="active" type="button">Bulan</button>
            <button type="button">Minggu</button>
            <button type="button">Hari</button>
          </div>

          <button className="calendar-sync-button" type="button" onClick={fetchHolidays} disabled={loading}>
            {loading ? "Memuat..." : "Sinkronisasi dengan Google Calendar"}
          </button>
        </section>

        {error && (
          <div className="form-error calendar-error-row">
            {error}
            <button type="button" onClick={fetchHolidays}>Coba lagi</button>
          </div>
        )}

        <div className="calendar-layout">
          <section className="calendar-board data-panel">
            <div className="calendar-board-header">
              <div>
                <h3>{formatMonthTitle(activeMonth)}</h3>
                <p>Terakhir diperbarui: {formatLastUpdated()}</p>
              </div>
              <div className="calendar-board-actions">
                <button type="button" onClick={() => moveMonth(-1)} aria-label="Bulan sebelumnya">{"<"}</button>
                <button type="button" onClick={goToday}>Hari ini</button>
                <button type="button" onClick={() => moveMonth(1)} aria-label="Bulan berikutnya">{">"}</button>
              </div>
            </div>

            <div className="calendar-weekdays">
              {WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}
            </div>

            <div className="calendar-month-grid">
              {calendarDays.map((day) => (
                <div
                  className={`calendar-day ${day.isCurrentMonth ? "" : "muted"} ${day.isToday ? "today" : ""}`}
                  key={day.key}
                >
                  <strong>{day.dayNumber}</strong>
                  <div className="calendar-day-events">
                    {day.events.slice(0, 3).map((event) => (
                      <span className={`calendar-event ${event.type.className}`} key={event.id}>
                        {event.name}
                      </span>
                    ))}
                    {day.events.length > 3 && (
                      <span className="calendar-event more">+{day.events.length - 3} lainnya</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="calendar-legend">
              <span><i className="nasional" /> Hari Libur Nasional</span>
              <span><i className="cuti-bersama" /> Cuti Bersama</span>
              <span><i className="presensi" /> Hari Kerja</span>
            </div>
          </section>

          <aside className="calendar-side">
            <section className="calendar-summary-card">
              <div className="calendar-summary-title">
                <span>GC</span>
                <div>
                  <h3>{formatMonthTitle(activeMonth)}</h3>
                  <p>Ringkasan Kalender</p>
                </div>
              </div>

              <div className="calendar-summary-grid">
                <div className="blue"><span>Hari Kerja</span><strong>{workDays}</strong></div>
                <div className="red"><span>Hari Libur Nasional</span><strong>{nationalEvents.length}</strong></div>
                <div className="purple"><span>Cuti Bersama</span><strong>{sharedLeaveEvents.length}</strong></div>
                <div className="pink"><span>Total Event</span><strong>{monthEvents.length}</strong></div>
              </div>
            </section>

            <CalendarEventList title="Hari Libur Nasional" events={nationalEvents} emptyText="Tidak ada hari libur nasional." />
            <CalendarEventList title="Cuti Bersama" events={sharedLeaveEvents} emptyText="Tidak ada cuti bersama." />
            <CalendarEventList title="Jadwal Mendatang" events={upcomingEvents} emptyText="Tidak ada jadwal mendatang." />
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}

function CalendarEventList({ title, events, emptyText }) {
  return (
    <section className="calendar-list-card">
      <div className="calendar-list-header">
        <h3>{title}</h3>
        <span>{events.length} data</span>
      </div>

      <div className="calendar-list-body">
        {events.slice(0, 4).map((event) => (
          <div className="calendar-list-item" key={`${event.key}-${event.name}`}>
            <span className={`calendar-list-icon ${event.type.className}`} />
            <div>
              <small>{formatLongDate(event.date)}</small>
              <strong>{event.name}</strong>
              <span className={`sync-status ${event.syncStatus.className}`}>{event.syncStatus.label}</span>
            </div>
          </div>
        ))}
        {events.length === 0 && <div className="calendar-list-empty">{emptyText}</div>}
      </div>
    </section>
  );
}

export default Kalender;