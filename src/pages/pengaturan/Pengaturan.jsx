import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const settingGroups = [
  {
    title: "Jam Kerja & Toleransi",
    icon: "🕒",
    description: "Atur waktu kerja dan batas keterlambatan pegawai",
    settings: [
      {
        key: "jam_kerja_standar",
        label: "Jam kerja standar",
        description: "Rentang waktu kerja normal pegawai",
        type: "text",
        defaultValue: "07:30 - 16:00",
      },
      {
        key: "ambang_terlambat",
        label: "Batas keterlambatan",
        description:
          "Waktu maksimal sebelum pegawai dianggap terlambat",
        type: "text",
        defaultValue: "08:00",
      },
      {
        key: "timezone",
        label: "Zona waktu",
        description:
          "Zona waktu yang digunakan oleh sistem presensi",
        type: "text",
        defaultValue: "Asia/Makassar",
      },
    ],
  },

  {
    title: "Pengenalan Wajah",
    icon: "◉",
    description:
      "Konfigurasi validasi wajah saat melakukan presensi",
    settings: [
      {
        key: "ambang_similarity",
        label: "Ambang similarity",
        description:
          "Tingkat kemiripan minimum untuk validasi wajah",
        type: "number",
        defaultValue: "0.45",
      },
      {
        key: "liveness_wajib",
        label: "Liveness / Anti-spoofing",
        description:
          "Pastikan presensi dilakukan menggunakan wajah asli",
        type: "boolean",
        defaultValue: "true",
      },
    ],
  },

  {
    title: "Geofence & Lokasi",
    icon: "⌖",
    description:
      "Atur validasi lokasi saat pegawai melakukan presensi",
    settings: [
      {
        key: "geofence_wajib",
        label: "Wajib dalam radius geofence",
        description:
          "Pegawai harus berada di area lokasi presensi yang valid",
        type: "boolean",
        defaultValue: "true",
      },
      {
        key: "gps_accuracy_meters",
        label: "Toleransi akurasi GPS",
        description:
          "Batas toleransi kesalahan GPS dalam meter",
        type: "number",
        defaultValue: "25",
      },
      {
        key: "blokir_mock_location",
        label: "Blokir mock location",
        description:
          "Mencegah penggunaan lokasi GPS palsu",
        type: "boolean",
        defaultValue: "true",
      },
    ],
  },

  {
    title: "Keamanan & Integrasi",
    icon: "🔐",
    description:
      "Atur keamanan akun dan integrasi sistem eksternal",
    settings: [
      {
        key: "siga8_sso_aktif",
        label: "Login melalui SSO SIGA8",
        description:
          "Gunakan Single Sign-On untuk autentikasi pengguna",
        type: "boolean",
        defaultValue: "true",
      },
      {
        key: "device_binding",
        label: "Device binding",
        description:
          "Batasi satu akun untuk satu perangkat utama",
        type: "boolean",
        defaultValue: "true",
      },
      {
        key: "timeout_sesi_admin",
        label: "Timeout sesi admin",
        description:
          "Waktu sesi admin sebelum otomatis berakhir",
        type: "number",
        defaultValue: "30",
      },
      {
        key: "gcal_aktif",
        label: "Google Calendar",
        description:
          "Aktifkan sinkronisasi kalender dan hari libur",
        type: "boolean",
        defaultValue: "true",
      },
    ],
  },
];

const parseValue = (value, type) => {
  if (type === "boolean") {
    return String(value).toLowerCase() === "true";
  }

  return String(value ?? "");
};

function Pengaturan() {
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest("/settings");

        const payload = response?.data || response;

        const settings = Array.isArray(payload)
          ? payload
          : Object.entries(payload || {}).map(
              ([key, value]) => ({
                key,
                value,
              })
            );

        const loaded = {};

        settings.forEach((setting) => {
          loaded[setting.key] = setting.value;
        });

        setValues(loaded);
      } catch (err) {
        setError(
          err.message ||
            "Gagal mengambil data pengaturan dari backend."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const getValue = (setting) => {
    if (values[setting.key] === undefined) {
      return parseValue(
        setting.defaultValue,
        setting.type
      );
    }

    return parseValue(
      values[setting.key],
      setting.type
    );
  };

  const saveSetting = async (setting, value) => {
    try {
      setSavingKey(setting.key);
      setError("");
      setMessage("");

      await apiRequest(`/settings/${setting.key}`, {
        method: "PATCH",
        body: JSON.stringify({
          value: String(value),
        }),
      });

      setValues((previous) => ({
        ...previous,
        [setting.key]: value,
      }));

      setMessage(
        `${setting.label} berhasil diperbarui.`
      );

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      setError(
        err.message ||
          `Gagal menyimpan ${setting.label}.`
      );
    } finally {
      setSavingKey("");
    }
  };

  return (
    <AdminLayout>
      <div className="settings-page">

        


      {/* TABS */}
        <div className="settings-tabs">

          <button
            className={`tab-btn ${
              location.pathname === "/pengaturan"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("/pengaturan")
            }
          >
            <span>⚙</span>
            Pengaturan Umum
          </button>


          <button
            className={`tab-btn ${
              location.pathname === "/pengaturan/role"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("/pengaturan/role")
            }
          >
            <span>👤</span>
            Manajemen Role
          </button>


          <button
            className={`tab-btn ${
              location.pathname ===
              "/pengaturan/permission"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate("/pengaturan/permission")
            }
          >
            <span>📋</span>
            Kebijakan Kerja
          </button>

        </div>


        {/* LOADING */}
        {loading && (
          <div className="settings-loading">
            <div className="loading-spinner" />

            <span>
              Memuat pengaturan sistem...
            </span>
          </div>
        )}


        {/* ERROR */}
        {!loading && error && (
          <div className="form-error">
            <span>⚠</span>

            <div>
              <strong>
                Terjadi kesalahan
              </strong>

              <p>
                {error}
              </p>
            </div>
          </div>
        )}


        {/* SUCCESS */}
        {message && (
          <div className="settings-success">
            <span>✓</span>
            {message}
          </div>
        )}


        {/* SETTINGS */}
        {!loading && (
          <div className="settings-grid">

            {settingGroups.map((group) => (

              <section
                className="settings-card"
                key={group.title}
              >

                {/* CARD HEADER */}
                <div className="settings-card-header">

                  <div className="settings-card-icon">
                    {group.icon}
                  </div>

                  <div className="settings-card-title">

                    <h3>
                      {group.title}
                    </h3>

                    <p>
                      {group.description}
                    </p>

                  </div>

                </div>


                {/* SETTINGS LIST */}
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

                        {/* INFO */}
                        <div className="setting-info">

                          <strong>
                            {setting.label}
                          </strong>

                          <span>
                            {setting.description}
                          </span>

                        </div>


                        {/* CONTROL */}
                        <div className="setting-control">

                          {setting.type ===
                          "boolean" ? (

                            <button
                              type="button"
                              className={`setting-toggle ${
                                value ? "on" : ""
                              }`}
                              onClick={() =>
                                saveSetting(
                                  setting,
                                  !value
                                )
                              }
                              disabled={saving}
                              aria-label={setting.label}
                            >
                              <span />
                            </button>

                          ) : (

                            <input
                              className="setting-input"
                              type={setting.type}
                              value={value}
                              disabled={saving}
                              onChange={(event) =>
                                setValues(
                                  (previous) => ({
                                    ...previous,
                                    [setting.key]:
                                      event.target.value,
                                  })
                                )
                              }
                              onBlur={(event) =>
                                saveSetting(
                                  setting,
                                  event.target.value
                                )
                              }
                            />

                          )}

                          {saving && (

                            <small className="saving-text">
                              Menyimpan...
                            </small>

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


        {/* INFORMATION NOTE */}
        <div className="settings-note">

          <div className="settings-note-icon">
            ℹ
          </div>

          <div>

            <strong>
              Informasi Pengaturan
            </strong>

            <p>
              Perubahan konfigurasi dapat
              memengaruhi proses presensi seluruh
              pengguna. Kredensial SSO dan Google
              Calendar tetap dikelola melalui
              konfigurasi backend.
            </p>

          </div>

        </div>

      </div>
    </AdminLayout>
  );
}

export default Pengaturan;