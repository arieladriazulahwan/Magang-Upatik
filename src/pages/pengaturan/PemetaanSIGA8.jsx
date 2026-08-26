import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const getMappings = (response) => {
  const payload = response?.data || response;
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.items) ? payload.items : [];
};

const normalizeMapping = (mapping) => ({
  id: mapping.id || mapping.uuid || mapping.role_id,
  siga8RoleId: mapping.siga8_role_id || mapping.external_role_id || mapping.role?.id || "",
  siga8RoleName: mapping.siga8_role_name || mapping.external_role_name || mapping.role?.name || "-",
  roleId: mapping.role_id || mapping.role?.id || "",
  localRole: mapping.role?.name || mapping.local_role || mapping.app_role || mapping.presensi_role || "-",
  active: mapping.is_active ?? mapping.active ?? true,
});

function PemetaanSIGA8() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ siga8_role_id: "", siga8_role_name: "", role_id: "" });

  const loadMappings = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest("/siga8-role-mappings");
      setMappings(getMappings(response).map(normalizeMapping));
    } catch (err) {
      setError(err.message || "Pemetaan peran SIGA8 belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMappings(); }, []);

  const createMapping = async (event) => {
    event.preventDefault();
    if (!form.siga8_role_id.trim() || !form.siga8_role_name.trim() || !form.role_id) {
      setError("ID dan nama peran SIGA8 serta ID role KlikPresensi wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/siga8-role-mappings", { method: "POST", body: JSON.stringify(form) });
      setForm({ siga8_role_id: "", siga8_role_name: "", role_id: "" });
      setMessage("Pemetaan peran berhasil ditambahkan.");
      await loadMappings();
    } catch (err) {
      setError(err.message || "Gagal menambahkan pemetaan peran.");
    } finally {
      setSaving(false);
    }
  };

  const updateMapping = async (mapping, changes) => {
    if (!mapping.id) {
      setError("ID pemetaan tidak ditemukan. Muat ulang data lalu coba lagi.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/siga8-role-mappings/${mapping.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setMappings((items) => items.map((item) => item.id === mapping.id ? {
        ...item,
        ...(changes.role_id ? { roleId: changes.role_id } : {}),
        ...(changes.is_active !== undefined ? { active: changes.is_active } : {}),
      } : item));
      setMessage("Pemetaan peran berhasil diperbarui.");
    } catch (err) {
      setError(err.message || "Gagal memperbarui pemetaan peran.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMapping = async (mapping) => {
    if (!mapping.id || !window.confirm(`Hapus pemetaan untuk ${mapping.siga8RoleName}?`)) return;
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/siga8-role-mappings/${mapping.id}`, { method: "DELETE" });
      setMappings((items) => items.filter((item) => item.id !== mapping.id));
      setMessage("Pemetaan peran dihapus.");
    } catch (err) {
      setError(err.message || "Gagal menghapus pemetaan peran.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="siga8-mapping-page">
        <div className="page-heading">
          <div>
            <h2>Pemetaan SIGA8</h2>
            <p>Hubungkan peran dari SIGA8 ke hak akses KlikPresensi.</p>
          </div>
          <button type="button" className="secondary-button" onClick={loadMappings} disabled={loading || saving}>
            {loading ? "Memuat..." : "Muat ulang"}
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="settings-success">{message}</div>}

        <section className="data-panel siga8-mapping-form-card">
          <div className="panel-header"><h3>Tambah Pemetaan</h3></div>
          <form className="siga8-mapping-form" onSubmit={createMapping}>
            <label>ID peran SIGA8<input value={form.siga8_role_id} onChange={(e) => setForm({ ...form, siga8_role_id: e.target.value })} placeholder="Contoh: 01k723..." disabled={saving} /></label>
            <label>Nama peran SIGA8<input value={form.siga8_role_name} onChange={(e) => setForm({ ...form, siga8_role_name: e.target.value })} placeholder="Contoh: Pokja BAK" disabled={saving} /></label>
            <label>ID role KlikPresensi<input type="number" min="1" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} placeholder="Contoh: 5" disabled={saving} /></label>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Tambah Pemetaan"}</button>
          </form>
        </section>

        <section className="data-panel siga8-mapping-table-card">
          <div className="panel-header"><h3>Daftar Pemetaan</h3><span>{mappings.length} peran</span></div>
          {loading ? <div className="empty-state">Memuat pemetaan peran...</div> : mappings.length === 0 ? <div className="empty-state">Belum ada pemetaan peran SIGA8.</div> : (
            <div className="siga8-mapping-table-wrapper"><table className="siga8-mapping-table"><thead><tr><th>Peran SIGA8</th><th>ID SIGA8</th><th>Peran KlikPresensi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
              {mappings.map((mapping) => <tr key={mapping.id || mapping.siga8RoleId}><td><strong>{mapping.siga8RoleName}</strong></td><td><code>{mapping.siga8RoleId || "-"}</code></td><td><label className="mapping-role-id"><span>{mapping.localRole}</span><input type="number" min="1" defaultValue={mapping.roleId} onBlur={(e) => { const roleId = Number(e.target.value); if (Number.isInteger(roleId) && roleId > 0 && roleId !== mapping.roleId) updateMapping(mapping, { role_id: roleId }); }} disabled={saving} aria-label={`ID role untuk ${mapping.siga8RoleName}`} /></label></td><td><button type="button" className={`mapping-status ${mapping.active ? "active" : ""}`} disabled={saving} onClick={() => updateMapping(mapping, { is_active: !mapping.active })}>{mapping.active ? "Aktif" : "Nonaktif"}</button></td><td><button type="button" className="mapping-delete" disabled={saving} onClick={() => deleteMapping(mapping)}>Hapus</button></td></tr>)}
            </tbody></table></div>
          )}
        </section>
        <div className="settings-note">Perubahan pemetaan digunakan pada login berikutnya. Endpoint backend yang diperlukan: <code>/siga8-role-mappings</code>.</div>
      </div>
    </AdminLayout>
  );
}

export default PemetaanSIGA8;
