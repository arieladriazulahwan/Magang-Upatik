import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const settingGroups = [
  {
    title: "Jam Kerja & Toleransi",
    settings: [
      { key: "jam_kerja_standar", label: "Jam kerja standar", type: "text", defaultValue: "07:30 - 16:00" },
      { key: "ambang_terlambat", label: "Batas terlambat", type: "text", defaultValue: "08:00" },
      { key: "timezone", label: "Zona waktu", type: "text", defaultValue: "Asia/Makassar" },
    ],
  },
  {
    title: "Pengenalan Wajah",
    settings: [
      { key: "ambang_similarity", label: "Ambang similarity", type: "number", defaultValue: "0.45" },
      { key: "liveness_wajib", label: "Liveness / anti-spoofing", type: "boolean", defaultValue: "true" },
    ],
  },
  {
    title: "Geofence & Lokasi",
    settings: [
      { key: "geofence_wajib", label: "Wajib dalam radius geofence", type: "boolean", defaultValue: "true" },
      { key: "gps_accuracy_meters", label: "Toleransi akurasi GPS", type: "number", defaultValue: "25" },
      { key: "blokir_mock_location", label: "Blokir mock location", type: "boolean", defaultValue: "true" },
    ],
  },
  {
    title: "Keamanan & Integrasi",
    settings: [
      { key: "siga8_sso_aktif", label: "Login wajib via SSO SIGA8", type: "boolean", defaultValue: "true" },
      { key: "device_binding", label: "Device binding 1 akun", type: "boolean", defaultValue: "true" },
      { key: "timeout_sesi_admin", label: "Timeout sesi admin (menit)", type: "number", defaultValue: "30" },
      { key: "gcal_aktif", label: "Sinkronisasi Google Calendar", type: "boolean", defaultValue: "true" },
    ],
  },
];

const parseValue = (value, type) => type === "boolean" ? String(value).toLowerCase() === "true" : String(value ?? "");

function Pengaturan() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiRequest("/settings");
        const payload = response?.data || response;
        const settings = Array.isArray(payload) ? payload : Object.entries(payload || {}).map(([key, value]) => ({ key, value }));
        const loaded = {};
        settings.forEach((setting) => { loaded[setting.key] = setting.value; });
        setValues(loaded);
      } catch (err) {
        setError(err.message || "Endpoint pengaturan belum tersedia di backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const getValue = (setting) => values[setting.key] === undefined ? parseValue(setting.defaultValue, setting.type) : parseValue(values[setting.key], setting.type);

  const saveSetting = async (setting, value) => {
    try {
      setSavingKey(setting.key);
      setError("");
      setMessage("");
      await apiRequest(`/settings/${setting.key}`, {
        method: "PATCH",
        body: JSON.stringify({ value: String(value) }),
      });
      setValues((previous) => ({ ...previous, [setting.key]: value }));
      setMessage(`${setting.label} berhasil diperbarui.`);
    } catch (err) {
      setError(err.message || `Gagal menyimpan ${setting.label}.`);
    } finally {
      setSavingKey("");
    }
  };

  return (
    <AdminLayout>
      <div className="settings-page">
        <div className="page-heading">
          <div><h2>Pengaturan</h2><p>Parameter presensi, keamanan, geofence, dan integrasi</p></div>
        </div>

        {loading && <div className="empty-state">Memuat pengaturan...</div>}
        {error && <div className="form-error">{error}</div>}
        {message && <div className="settings-success">{message}</div>}

        <div className="settings-grid">
          {settingGroups.map((group) => (
            <section className="data-panel settings-card" key={group.title}>
              <div className="panel-header"><h3>{group.title}</h3></div>
              <div className="settings-list">
                {group.settings.map((setting) => {
                  const value = getValue(setting);
                  const saving = savingKey === setting.key;
                  return (
                    <div className="setting-row" key={setting.key}>
                      <div><strong>{setting.label}</strong><span>{setting.key}</span></div>
                      {setting.type === "boolean" ? (
                        <button
                          type="button"
                          className={`setting-toggle ${value ? "on" : ""}`}
                          onClick={() => saveSetting(setting, !value)}
                          disabled={saving || loading}
                          aria-label={`${setting.label}: ${value ? "aktif" : "nonaktif"}`}
                        ><span /></button>
                      ) : (
                        <input
                          className="setting-input"
                          type={setting.type}
                          value={value}
                          disabled={saving || loading}
                          onChange={(event) => setValues((previous) => ({ ...previous, [setting.key]: event.target.value }))}
                          onBlur={(event) => saveSetting(setting, event.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="settings-note">Perubahan pengaturan berdampak pada seluruh proses presensi. Kredensial SIGA8 dan Google Calendar tetap dikelola di environment backend.</div>
      </div>
    </AdminLayout>
  );
}

export default Pengaturan;
