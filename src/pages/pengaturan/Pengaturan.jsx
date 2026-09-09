import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const settingGroups = [
  {
    title: "Jam Kerja & Toleransi",
    settings: [
      {
        key: "jam_kerja_standar",
        label: "Jam kerja standar",
        description: "Rentang jam kerja normal pegawai",
        type: "text",
        defaultValue: "07:30 - 16:00",
      },
      {
        key: "ambang_terlambat",
        label: "Batas terlambat",
        description: "Jam maksimal pegawai dianggap tepat waktu",
        type: "text",
        defaultValue: "08:00",
      },
      {
        key: "timezone",
        label: "Zona waktu",
        description: "Zona waktu sistem presensi",
        type: "text",
        defaultValue: "Asia/Makassar",
      },
    ],
  },
  {
    title: "Pengenalan Wajah",
    settings: [
      {
        key: "ambang_similarity",
        label: "Ambang similarity",
        description: "Tingkat kecocokan minimum wajah",
        type: "number",
        defaultValue: "0.45",
      },
      {
        key: "liveness_wajib",
        label: "Liveness / Anti-spoofing",
        description: "Wajib melakukan pemeriksaan keaslian wajah",
        type: "boolean",
        defaultValue: true,
      },
    ],
  },
  {
    title: "Geofence & Lokasi",
    settings: [
      {
        key: "geofence_wajib",
        label: "Wajib dalam radius geofence",
        description: "Pegawai harus berada dalam area presensi",
        type: "boolean",
        defaultValue: true,
      },
      {
        key: "gps_accuracy_meters",
        label: "Toleransi akurasi GPS",
        description: "Batas toleransi ketidakakuratan lokasi",
        type: "number",
        defaultValue: "25",
      },
      {
        key: "blokir_mock_location",
        label: "Blokir mock location",
        description: "Mencegah penggunaan lokasi palsu",
        type: "boolean",
        defaultValue: true,
      },
    ],
  },
  {
    title: "Keamanan & Integrasi",
    settings: [
      {
        key: "siga8_sso_aktif",
        label: "Login wajib via SSO SIGA8",
        description: "Aktifkan autentikasi melalui SIGA8",
        type: "boolean",
        defaultValue: true,
      },
      {
        key: "device_binding",
        label: "Device binding",
        description: "Batasi penggunaan akun pada perangkat tertentu",
        type: "boolean",
        defaultValue: true,
      },
      {
        key: "timeout_sesi_admin",
        label: "Timeout sesi admin",
        description: "Batas waktu sesi admin dalam menit",
        type: "number",
        defaultValue: "30",
      },
      {
        key: "gcal_aktif",
        label: "Sinkronisasi Google Calendar",
        description: "Aktifkan integrasi jadwal dengan Google Calendar",
        type: "boolean",
        defaultValue: true,
      },
    ],
  },
];

const getDefaultValues = () => {
  const defaults = {};

  settingGroups.forEach((group) => {
    group.settings.forEach((setting) => {
      defaults[setting.key] = setting.defaultValue;
    });
  });

  return defaults;
};

const normalizeBoolean = (value) => {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
};

function Pengaturan() {
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState(getDefaultValues());
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await apiRequest("/settings");

      const payload = response?.data || response;

      let settings = [];

      if (Array.isArray(payload)) {
        settings = payload;
      } else if (payload && typeof payload === "object") {
        settings = Object.entries(payload).map(([key, value]) => ({
          key,
          value,
        }));
      }

      const loadedValues = getDefaultValues();

      settings.forEach((setting) => {
        if (setting?.key) {
          loadedValues[setting.key] = setting.value;
        }
      });

      setValues(loadedValues);
    } catch (err) {
      console.error("Gagal memuat pengaturan:", err);

      setError(
        err.message ||
          "Pengaturan belum dapat dimuat dari server."
      );

      // Tetap tampilkan nilai default
      setValues(getDefaultValues());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const getValue = (setting) => {
    const value = values[setting.key];

    if (setting.type === "boolean") {
      return normalizeBoolean(value);
    }

    return value ?? "";
  };

  const handleChange = (key, value) => {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const saveSetting = async (setting) => {
    try {
      setSavingKey(setting.key);
      setError("");
      setMessage("");

      let value = values[setting.key];

      if (setting.type === "boolean") {
        value = normalizeBoolean(value);
      }

      await apiRequest(`/settings/${setting.key}`, {
        method: "PATCH",
        body: JSON.stringify({
          value,
        }),
      });

      setMessage(
        `${setting.label} berhasil diperbarui.`
      );
    } catch (err) {
      console.error("Gagal menyimpan pengaturan:", err);

      setError(
        err.message ||
          `Gagal menyimpan ${setting.label}.`
      );
    } finally {
      setSavingKey("");
    }
  };

  const handleToggle = (setting) => {
    const currentValue = getValue(setting);

    setValues((previous) => ({
      ...previous,
      [setting.key]: !currentValue,
    }));
  };

  return (
    <AdminLayout>
      <div className="settings-page">

        {/* HEADER */}
        <div className="page-heading settings-heading">
          <div>
            <h2>Pengaturan</h2>
            <p>
              Kelola parameter presensi, keamanan,
              lokasi, dan integrasi sistem.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={fetchSettings}
            disabled={loading}
          >
            {loading ? "Memuat..." : "↻ Refresh"}
          </button>
        </div>

        {/* TAB */}
        <div className="settings-tabs">
          <button
            className={`tab-btn ${
              location.pathname === "/pengaturan"
                ? "active"
                : ""
            }`}
            onClick={() => navigate("/pengaturan")}
          >
            ⚙️ Pengaturan Umum
          </button>

          <button
            className={`tab-btn ${
              location.pathname === "/pengaturan/role"
                ? "active"
                : ""
            }`}
            onClick={() => navigate("/pengaturan/role")}
          >
            👤 Manajemen Role
          </button>

          <button
            className={`tab-btn ${
              location.pathname === "/pengaturan/permission"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("/pengaturan/permission")
            }
          >
            📋 Kebijakan Kerja
          </button>
        </div>

        {/* STATUS */}
        {loading && (
          <div className="empty-state">
            Memuat pengaturan...
          </div>
        )}

        {error && (
          <div className="form-error settings-alert">
            <div>
              <strong>Gagal memuat data pengaturan</strong>
              <p>{error}</p>
            </div>

            <button
              className="secondary-button"
              onClick={fetchSettings}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {message && (
          <div className="settings-success">
            ✓ {message}
          </div>
        )}

        {/* SETTINGS */}
        {!loading && (
          <div className="settings-grid">
            {settingGroups.map((group) => (
              <section
                className="data-panel settings-card"
                key={group.title}
              >
                <div className="panel-header">
                  <h3>{group.title}</h3>
                </div>

                <div className="settings-list">

                  {group.settings.map((setting) => {
                    const value = getValue(setting);
                    const saving =
                      savingKey === setting.key;

                    return (
                      <div
                        className="setting-row"
                        key={setting.key}
                      >
                        <div className="setting-info">
                          <strong>
                            {setting.label}
                          </strong>

                          <span>
                            {setting.description}
                          </span>
                        </div>

                        <div className="setting-control">

                          {setting.type === "boolean" ? (
                            <>
                              <button
                                type="button"
                                className={`setting-toggle ${
                                  value ? "on" : ""
                                }`}
                                onClick={() =>
                                  handleToggle(setting)
                                }
                                disabled={saving}
                              >
                                <span />
                              </button>

                              <button
                                className="setting-save-btn"
                                onClick={() =>
                                  saveSetting(setting)
                                }
                                disabled={saving}
                              >
                                {saving
                                  ? "..."
                                  : "Simpan"}
                              </button>
                            </>
                          ) : (
                            <>
                              <input
                                className="setting-input"
                                type={setting.type}
                                value={value}
                                disabled={saving}
                                onChange={(event) =>
                                  handleChange(
                                    setting.key,
                                    event.target.value
                                  )
                                }
                              />

                              <button
                                className="setting-save-btn"
                                onClick={() =>
                                  saveSetting(setting)
                                }
                                disabled={saving}
                              >
                                {saving
                                  ? "Menyimpan..."
                                  : "Simpan"}
                              </button>
                            </>
                          )}

                        </div>
                      </div>
                    );
                  })}

                </div>
              </section>
            ))}
          </div>
        )}

        <div className="settings-note">
          <strong>Informasi:</strong> Perubahan
          pengaturan dapat memengaruhi proses
          presensi seluruh pengguna. Pastikan
          konfigurasi sudah sesuai dengan kebijakan
          Universitas Tadulako.
        </div>

      </div>

      <style>{`
        .settings-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .settings-tabs {
          display: flex;
          gap: 8px;
          margin: 20px 0 24px;
          border-bottom: 1px solid #e5eaf0;
          overflow-x: auto;
        }

        .tab-btn {
          padding: 13px 18px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: #2563eb;
        }

        .tab-btn.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .settings-card {
          padding: 0;
          overflow: hidden;
        }

        .panel-header {
          padding: 18px 20px;
          border-bottom: 1px solid #edf0f4;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 15px;
        }

        .settings-list {
          padding: 6px 20px;
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 18px 0;
          border-bottom: 1px solid #edf0f4;
        }

        .setting-row:last-child {
          border-bottom: none;
        }

        .setting-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .setting-info strong {
          font-size: 13px;
          color: #334155;
        }

        .setting-info span {
          font-size: 11px;
          color: #94a3b8;
        }

        .setting-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .setting-input {
          width: 130px;
          padding: 9px 12px;
          border: 1px solid #dbe3ec;
          border-radius: 8px;
          outline: none;
          text-align: center;
          font-size: 12px;
        }

        .setting-input:focus {
          border-color: #2563eb;
        }

        .setting-save-btn {
          padding: 8px 10px;
          border: none;
          border-radius: 7px;
          background: #e8eef8;
          color: #2563eb;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .setting-save-btn:hover {
          background: #dbeafe;
        }

        .setting-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .settings-alert {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .settings-alert p {
          margin: 5px 0 0;
          font-size: 12px;
        }

        .settings-success {
          margin-bottom: 18px;
          padding: 13px 16px;
          border-radius: 8px;
          background: #ecfdf5;
          color: #047857;
          font-size: 13px;
        }

        .settings-note {
          margin-top: 20px;
          padding: 16px 18px;
          background: #f8fafc;
          border: 1px solid #e5eaf0;
          border-radius: 10px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .settings-heading {
            flex-direction: column;
            align-items: flex-start;
          }

          .setting-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .setting-control {
            width: 100%;
          }

          .setting-input {
            flex: 1;
          }
        }
      `}</style>
    </AdminLayout>
  );
}

export default Pengaturan;