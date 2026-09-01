import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const DEFAULT_WORKING_DAYS = [
  { day: "Senin", dayCode: "monday", is_active: true, start_time: "07:30", end_time: "16:00" },
  { day: "Selasa", dayCode: "tuesday", is_active: true, start_time: "07:30", end_time: "16:00" },
  { day: "Rabu", dayCode: "wednesday", is_active: true, start_time: "07:30", end_time: "16:00" },
  { day: "Kamis", dayCode: "thursday", is_active: true, start_time: "07:30", end_time: "16:00" },
  { day: "Jumat", dayCode: "friday", is_active: true, start_time: "07:30", end_time: "16:00" },
  { day: "Sabtu", dayCode: "saturday", is_active: false, start_time: "08:00", end_time: "14:00" },
  { day: "Minggu", dayCode: "sunday", is_active: false, start_time: "08:00", end_time: "14:00" },
];

function Permission() {
  const [workingDays, setWorkingDays] = useState(DEFAULT_WORKING_DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchWorkingDays();
  }, []);

  const fetchWorkingDays = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiRequest("/policies/working-days");
      const data = response?.data || response;
      if (Array.isArray(data) && data.length > 0) {
        setWorkingDays(data);
      } else {
        setWorkingDays(DEFAULT_WORKING_DAYS);
      }
    } catch (err) {
      console.error("Gagal mengambil kebijakan kerja:", err);
      setWorkingDays(DEFAULT_WORKING_DAYS);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayCode) => {
    setWorkingDays((prev) =>
      prev.map((day) =>
        day.dayCode === dayCode ? { ...day, is_active: !day.is_active } : day
      )
    );
  };

  const handleTimeChange = (dayCode, field, value) => {
    setWorkingDays((prev) =>
      prev.map((day) =>
        day.dayCode === dayCode ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSaveWorkingDays = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      await apiRequest("/policies/working-days", {
        method: "POST",
        body: JSON.stringify({ working_days: workingDays }),
      });

      setMessage("Kebijakan hari kerja berhasil disimpan.");
    } catch (err) {
      console.error("Gagal menyimpan kebijakan kerja:", err);
      setError(err.message || "Gagal menyimpan kebijakan kerja.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (confirm("Yakin reset ke pengaturan default?")) {
      setWorkingDays(DEFAULT_WORKING_DAYS);
    }
  };

  const activeWorkDays = workingDays.filter((d) => d.is_active).length;

  return (
    <AdminLayout>
      <div className="permission-page">
        <div className="page-heading">
          <div>
            <h2>Kebijakan & Jam Kerja</h2>
            <p>Kelola hari kerja, jam masuk, dan jam pulang</p>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="settings-success">{message}</div>}

        <section className="data-panel working-days-panel">
          <div className="panel-header">
            <div>
              <h3>Kebijakan Hari & Jam Kerja</h3>
              <p>Atur hari kerja dan jam operasional per hari</p>
            </div>
            <div className="panel-stats">
              <div className="stat-box">
                <span>Hari Kerja Aktif</span>
                <strong>{activeWorkDays}</strong>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Memuat kebijakan kerja...</div>
          ) : (
            <div className="working-days-container">
              {workingDays.map((day, index) => (
                <div key={day.dayCode} className={`working-day-card ${day.is_active ? "active" : "inactive"}`}>
                  <div className="day-header">
                    <h4>{day.day}</h4>
                    <button
                      className={`toggle-btn ${day.is_active ? "disable" : "enable"}`}
                      onClick={() => handleToggleDay(day.dayCode)}
                      title={day.is_active ? "Nonaktifkan hari ini" : "Aktifkan hari ini"}
                    >
                      {day.is_active ? "🔓 Aktif" : "🔒 Nonaktif"}
                    </button>
                  </div>

                  {day.is_active && (
                    <div className="day-time-inputs">
                      <div className="time-group">
                        <label>Jam Masuk</label>
                        <input
                          type="time"
                          value={day.start_time}
                          onChange={(e) => handleTimeChange(day.dayCode, "start_time", e.target.value)}
                        />
                      </div>

                      <div className="time-separator">—</div>

                      <div className="time-group">
                        <label>Jam Pulang</label>
                        <input
                          type="time"
                          value={day.end_time}
                          onChange={(e) => handleTimeChange(day.dayCode, "end_time", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {!day.is_active && (
                    <div className="day-inactive-message">
                      <p>Hari libur / tidak ada operasional</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="working-days-actions">
            <button className="secondary-button" onClick={handleResetToDefault} disabled={saving || loading}>
              ↺ Reset ke Default
            </button>
            <button className="primary-button" onClick={handleSaveWorkingDays} disabled={saving || loading}>
              {saving ? "Menyimpan..." : "💾 Simpan Kebijakan"}
            </button>
          </div>
        </section>

        <section className="data-panel policy-info">
          <h3>Informasi Kebijakan</h3>
          <div className="policy-grid">
            <div className="policy-card">
              <h4>🕐 Hari Kerja Reguler</h4>
              <p>Senin hingga Jumat dengan jam masuk standar 07:30 WIB</p>
            </div>
            <div className="policy-card">
              <h4>⏰ Jam Operasional</h4>
              <p>Setiap hari dapat dikustomisasi sesuai kebutuhan unit</p>
            </div>
            <div className="policy-card">
              <h4>🔄 Fleksibilitas</h4>
              <p>Enable/disable hari kerja dan sesuaikan jam per hari</p>
            </div>
            <div className="policy-card">
              <h4>💾 Penyimpanan Otomatis</h4>
              <p>Kebijakan tersimpan di backend dan berlaku untuk semua unit</p>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .working-days-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin: 20px 0;
        }

        .working-day-card {
          border: 1px solid #dce2e9;
          border-radius: 8px;
          padding: 16px;
          background: #ffffff;
          transition: all 0.3s ease;
        }

        .working-day-card.active {
          border-color: #2980b9;
          background: #f0f7ff;
        }

        .working-day-card.inactive {
          opacity: 0.7;
          background: #f5f5f5;
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .day-header h4 {
          margin: 0;
          font-size: 14px;
          color: #2c3e50;
          font-weight: 600;
        }

        .toggle-btn {
          padding: 4px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .toggle-btn.enable {
          background: #d4edda;
          color: #155724;
          border-color: #155724;
        }

        .toggle-btn.disable {
          background: #fff3cd;
          color: #856404;
          border-color: #856404;
        }

        .toggle-btn:hover {
          opacity: 0.8;
        }

        .day-time-inputs {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .time-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .time-group label {
          font-size: 11px;
          font-weight: 600;
          color: #627084;
        }

        .time-group input {
          padding: 6px 8px;
          border: 1px solid #dce2e9;
          border-radius: 4px;
          font-size: 13px;
        }

        .time-separator {
          padding: 0 4px;
          color: #999;
        }

        .day-inactive-message {
          padding: 8px 0;
          text-align: center;
          font-size: 12px;
          color: #999;
          font-style: italic;
        }

        .working-days-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #edf0f4;
        }

        .policy-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .policy-card {
          padding: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }

        .policy-card h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #2c3e50;
        }

        .policy-card p {
          margin: 0;
          font-size: 12px;
          color: #627084;
          line-height: 1.5;
        }
      `}</style>
    </AdminLayout>
  );
}

export default Permission;
