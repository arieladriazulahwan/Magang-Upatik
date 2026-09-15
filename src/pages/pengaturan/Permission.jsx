import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

const DEFAULT_OVERTIME_POLICY = {
  overtime_weekday_start: "16:00",
  overtime_friday_start: "16:30",
  overtime_weekend_allowed: true,
};

const SETTINGS_TABS = [
  { label: "Pengaturan Umum", path: "/pengaturan", code: "UM" },
  { label: "Manajemen Role", path: "/pengaturan/role", code: "RL" },
  { label: "Kebijakan Kerja", path: "/pengaturan/permission", code: "KB" },
];

const POLICY_INFO_CARDS = [
  {
    title: "Hari Kerja Reguler",
    description: "Senin hingga Jumat dapat dipakai sebagai pola kerja standar.",
    code: "01",
  },
  {
    title: "Jam Operasional",
    description: "Jam masuk dan pulang dapat diatur berbeda untuk setiap hari.",
    code: "02",
  },
  {
    title: "Hari Nonaktif",
    description: "Hari yang dinonaktifkan akan dianggap sebagai hari libur kerja.",
    code: "03",
  },
  {
    title: "Berlaku Sistem",
    description: "Kebijakan tersimpan di backend dan digunakan oleh proses presensi.",
    code: "04",
  },
];

function Permission() {
  const navigate = useNavigate();
  const location = useLocation();
  const [workingDays, setWorkingDays] = useState(DEFAULT_WORKING_DAYS);
  const [overtimePolicy, setOvertimePolicy] = useState(DEFAULT_OVERTIME_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchWorkingDays = async () => {
    try {
      setLoading(true);
      setError("");
      const [workingDaysResponse, settingsResponse] = await Promise.all([
        apiRequest("/policies/working-days"),
        apiRequest("/settings"),
      ]);
      const response = workingDaysResponse;
      const data = response?.data || response;

      if (Array.isArray(data) && data.length > 0) {
        setWorkingDays(data);
      } else {
        setWorkingDays(DEFAULT_WORKING_DAYS);
      }

      const settings = settingsResponse?.data || settingsResponse;
      const settingsMap = Array.isArray(settings)
        ? Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
        : settings || {};

      setOvertimePolicy({
        overtime_weekday_start:
          settingsMap.overtime_weekday_start || DEFAULT_OVERTIME_POLICY.overtime_weekday_start,
        overtime_friday_start:
          settingsMap.overtime_friday_start || DEFAULT_OVERTIME_POLICY.overtime_friday_start,
        overtime_weekend_allowed:
          settingsMap.overtime_weekend_allowed === undefined
            ? DEFAULT_OVERTIME_POLICY.overtime_weekend_allowed
            : String(settingsMap.overtime_weekend_allowed).toLowerCase() === "true",
      });
    } catch (err) {
      console.error("Gagal mengambil kebijakan kerja:", err);
      setWorkingDays(DEFAULT_WORKING_DAYS);
      setOvertimePolicy(DEFAULT_OVERTIME_POLICY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkingDays();
  }, []);

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

  const handleOvertimePolicyChange = (field, value) => {
    setOvertimePolicy((prev) => ({
      ...prev,
      [field]: value,
    }));
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

      await Promise.all(
        Object.entries(overtimePolicy).map(([key, value]) =>
          apiRequest(`/settings/${key}`, {
            method: "PATCH",
            body: JSON.stringify({
              value: String(value),
              description: "Kebijakan pengajuan lembur dari halaman Kebijakan Kerja.",
            }),
          })
        )
      );

      setMessage("Kebijakan hari kerja dan lembur berhasil disimpan.");
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
      setOvertimePolicy(DEFAULT_OVERTIME_POLICY);
    }
  };

  const activeWorkDays = workingDays.filter((day) => day.is_active).length;
  const inactiveWorkDays = workingDays.length - activeWorkDays;
  const activeDays = workingDays.filter((day) => day.is_active);
  const earliestStart = activeDays[0]?.start_time || "-";
  const latestEnd = activeDays[activeDays.length - 1]?.end_time || "-";

  return (
    <AdminLayout>
      <div className="permission-page">
        <section className="permission-hero">
          <div>
            <span>Kebijakan Sistem</span>
            <h2>Kebijakan & Jam Kerja</h2>
            <p>Atur hari kerja, jam masuk, dan jam pulang yang digunakan proses presensi.</p>
          </div>
          <div className="permission-hero-summary">
            <div>
              <strong>{activeWorkDays}</strong>
              <span>Aktif</span>
            </div>
            <div>
              <strong>{inactiveWorkDays}</strong>
              <span>Libur</span>
            </div>
            <div>
              <strong>{earliestStart}</strong>
              <span>Masuk</span>
            </div>
            <div>
              <strong>{latestEnd}</strong>
              <span>Pulang</span>
            </div>
          </div>
        </section>

        <div className="settings-tabs">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.path}
              className={`tab-btn ${location.pathname === tab.path ? "active" : ""}`}
              onClick={() => navigate(tab.path)}
            >
              <span>{tab.code}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="settings-success">{message}</div>}

        <section className="data-panel working-days-panel">
          <div className="panel-header">
            <div>
              <h3>Kebijakan Hari & Jam Kerja</h3>
              <p>Aktifkan hari kerja dan tentukan rentang jam operasional per hari.</p>
            </div>
            <span className="working-days-count">{activeWorkDays} dari {workingDays.length} hari aktif</span>
          </div>

          {loading ? (
            <div className="empty-state">Memuat kebijakan kerja...</div>
          ) : (
            <div className="working-days-container">
              {workingDays.map((day) => (
                <div key={day.dayCode} className={`working-day-card ${day.is_active ? "active" : "inactive"}`}>
                  <div className="day-header">
                    <div>
                      <span className="day-code">{day.dayCode.slice(0, 3).toUpperCase()}</span>
                      <h4>{day.day}</h4>
                    </div>
                    <button
                      className={`toggle-btn ${day.is_active ? "disable" : "enable"}`}
                      onClick={() => handleToggleDay(day.dayCode)}
                      title={day.is_active ? "Nonaktifkan hari ini" : "Aktifkan hari ini"}
                    >
                      <span />
                      {day.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </div>

                  {day.is_active ? (
                    <div className="day-time-inputs">
                      <label className="time-group">
                        <span>Jam Masuk</span>
                        <input
                          type="time"
                          value={day.start_time}
                          onChange={(event) => handleTimeChange(day.dayCode, "start_time", event.target.value)}
                        />
                      </label>

                      <div className="time-separator">-</div>

                      <label className="time-group">
                        <span>Jam Pulang</span>
                        <input
                          type="time"
                          value={day.end_time}
                          onChange={(event) => handleTimeChange(day.dayCode, "end_time", event.target.value)}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="day-inactive-message">
                      <strong>Hari libur</strong>
                      <p>Tidak ada jam operasional aktif.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="working-days-actions">
            <button className="secondary-button" onClick={handleResetToDefault} disabled={saving || loading}>
              Reset ke Default
            </button>
            <button className="primary-button" onClick={handleSaveWorkingDays} disabled={saving || loading}>
              {saving ? "Menyimpan..." : "Simpan Kebijakan"}
            </button>
          </div>
        </section>

        <section className="data-panel overtime-policy-panel">
          <div className="panel-header">
            <div>
              <h3>Kebijakan Lembur</h3>
              <p>Atur batas mulai lembur untuk hari kerja dan izin pengajuan lembur akhir pekan.</p>
            </div>
            <span className="working-days-count">Berlaku saat pengajuan lembur</span>
          </div>

          <div className="overtime-policy-grid">
            <label className="overtime-policy-card">
              <span className="policy-code">LK</span>
              <strong>Hari kerja reguler</strong>
              <small>Lembur baru dapat diajukan mulai jam ini.</small>
              <input
                type="time"
                value={overtimePolicy.overtime_weekday_start}
                onChange={(event) => handleOvertimePolicyChange("overtime_weekday_start", event.target.value)}
                disabled={saving || loading}
              />
            </label>

            <label className="overtime-policy-card">
              <span className="policy-code">JMT</span>
              <strong>Khusus Jumat</strong>
              <small>Pengecualian jam mulai lembur hari Jumat.</small>
              <input
                type="time"
                value={overtimePolicy.overtime_friday_start}
                onChange={(event) => handleOvertimePolicyChange("overtime_friday_start", event.target.value)}
                disabled={saving || loading}
              />
            </label>

            <div className="overtime-policy-card">
              <span className="policy-code">WE</span>
              <strong>Sabtu & Minggu</strong>
              <small>Izinkan pegawai mengajukan lembur pada akhir pekan.</small>
              <button
                type="button"
                className={`overtime-switch ${overtimePolicy.overtime_weekend_allowed ? "on" : ""}`}
                onClick={() =>
                  handleOvertimePolicyChange(
                    "overtime_weekend_allowed",
                    !overtimePolicy.overtime_weekend_allowed
                  )
                }
                disabled={saving || loading}
              >
                <span />
                {overtimePolicy.overtime_weekend_allowed ? "Diizinkan" : "Tidak diizinkan"}
              </button>
            </div>
          </div>
        </section>

        <section className="data-panel policy-info">
          <div className="panel-header">
            <div>
              <h3>Informasi Kebijakan</h3>
              <p>Ringkasan aturan yang berlaku setelah kebijakan disimpan.</p>
            </div>
          </div>
          <div className="policy-grid">
            {POLICY_INFO_CARDS.map((card) => (
              <div className="policy-card" key={card.title}>
                <span>{card.code}</span>
                <h4>{card.title}</h4>
                <p>{card.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .permission-page {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .permission-hero {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
          border: 1px solid #dbe6f3;
          border-radius: 8px;
          background: linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
        }

        .permission-hero > div:first-child {
          max-width: 560px;
        }

        .permission-hero span {
          display: inline-flex;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 800;
          color: #2563eb;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .permission-hero h2 {
          margin: 0;
          color: #0f2748;
          font-size: 24px;
        }

        .permission-hero p {
          margin: 8px 0 0;
          color: #64748b;
          line-height: 1.6;
        }

        .permission-hero-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(78px, 1fr));
          gap: 10px;
          min-width: 420px;
        }

        .permission-hero-summary div {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 76px;
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.84);
        }

        .permission-hero-summary strong {
          color: #0f2748;
          font-size: 22px;
          line-height: 1;
        }

        .permission-hero-summary span {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 11px;
          letter-spacing: 0;
          text-transform: none;
        }

        .working-days-panel {
          overflow: hidden;
        }

        .working-days-count {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .working-days-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 14px;
          margin: 18px 0 0;
        }

        .working-day-card {
          border: 1px solid #dbe6f3;
          border-radius: 8px;
          padding: 16px;
          background: #ffffff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
          min-height: 158px;
        }

        .working-day-card.active {
          border-color: #8bb8f6;
          background: #f8fbff;
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.09);
        }

        .working-day-card.inactive {
          background: #f8fafc;
          color: #94a3b8;
        }

        .working-day-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .day-code {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 24px;
          min-width: 42px;
          margin-bottom: 8px;
          border-radius: 999px;
          background: #eaf2ff;
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
        }

        .day-header h4 {
          margin: 0;
          font-size: 16px;
          color: #0f2748;
          font-weight: 800;
        }

        .toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border: 1px solid #dbe6f3;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .toggle-btn span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: currentColor;
        }

        .toggle-btn.enable {
          background: #f1f5f9;
          color: #64748b;
          border-color: #dbe6f3;
        }

        .toggle-btn.disable {
          background: #dcfce7;
          color: #15803d;
          border-color: #bbf7d0;
        }

        .toggle-btn:hover {
          filter: brightness(0.98);
        }

        .day-time-inputs {
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }

        .time-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .time-group span {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
        }

        .time-group input {
          width: 100%;
          min-height: 38px;
          padding: 8px 10px;
          border: 1px solid #dbe6f3;
          border-radius: 8px;
          color: #0f2748;
          font-size: 14px;
          font-weight: 700;
          background: #ffffff;
        }

        .time-separator {
          padding: 0 0 10px;
          color: #94a3b8;
          font-weight: 800;
        }

        .day-inactive-message {
          display: flex;
          min-height: 70px;
          flex-direction: column;
          justify-content: center;
          padding: 12px;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          text-align: left;
        }

        .day-inactive-message strong {
          color: #64748b;
          font-size: 13px;
        }

        .day-inactive-message p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #94a3b8;
        }

        .working-days-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #edf0f4;
        }

        .overtime-policy-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .overtime-policy-card {
          display: flex;
          min-height: 172px;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          padding: 16px;
          border: 1px solid #dbe6f3;
          border-radius: 8px;
          background: #ffffff;
        }

        .overtime-policy-card .policy-code {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: #fff7ed;
          color: #c2410c;
          font-size: 11px;
          font-weight: 900;
        }

        .overtime-policy-card strong {
          color: #0f2748;
          font-size: 15px;
        }

        .overtime-policy-card small {
          min-height: 34px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
        }

        .overtime-policy-card input {
          width: 100%;
          min-height: 40px;
          margin-top: auto;
          padding: 8px 10px;
          border: 1px solid #dbe6f3;
          border-radius: 8px;
          color: #0f2748;
          font-size: 14px;
          font-weight: 800;
          background: #f8fbff;
        }

        .overtime-switch {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          min-height: 40px;
          margin-top: auto;
          padding: 6px 12px;
          border: 1px solid #dbe6f3;
          border-radius: 999px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .overtime-switch span {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: currentColor;
        }

        .overtime-switch.on {
          border-color: #fed7aa;
          background: #fff7ed;
          color: #c2410c;
        }

        .policy-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .policy-card {
          padding: 16px;
          min-height: 128px;
          background: #ffffff;
          border: 1px solid #dbe6f3;
          border-radius: 8px;
        }

        .policy-card span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 28px;
          margin-bottom: 12px;
          border-radius: 8px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
        }

        .policy-card h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #0f2748;
        }

        .policy-card p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .permission-hero {
            flex-direction: column;
          }

          .permission-hero-summary {
            min-width: 0;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .permission-hero {
            padding: 18px;
          }

          .working-days-actions {
            flex-direction: column-reverse;
          }

          .working-days-actions button {
            width: 100%;
          }
        }
      `}</style>
    </AdminLayout>
  );
}

export default Permission;