import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const AVAILABLE_PERMISSIONS = {
  dashboard: {
    label: "Dashboard",
    category: "Core",
    subPermissions: [],
  },
  monitoring: {
    label: "Monitoring Presensi",
    category: "Monitoring",
    subPermissions: [],
  },
  pegawai: {
    label: "Kelola Pegawai",
    category: "Pegawai",
    subPermissions: [
      { id: "pegawai.view", label: "Lihat Data" },
      { id: "pegawai.create", label: "Tambah Pegawai" },
      { id: "pegawai.edit", label: "Edit Pegawai" },
      { id: "pegawai.delete", label: "Hapus Pegawai" },
    ],
  },
  unit: {
    label: "Kelola Unit Kerja",
    category: "Organisasi",
    subPermissions: [
      { id: "unit.view", label: "Lihat Data" },
      { id: "unit.create", label: "Tambah Unit" },
      { id: "unit.edit", label: "Edit Unit" },
      { id: "unit.delete", label: "Hapus Unit" },
    ],
  },
  jadwal: {
    label: "Jadwal Kerja",
    category: "Jadwal",
    subPermissions: [
      { id: "jadwal.view", label: "Lihat Jadwal" },
      { id: "jadwal.edit", label: "Edit Jadwal" },
    ],
  },
  shift: {
    label: "Kelola Shift Kerja",
    category: "Jadwal",
    subPermissions: [
      { id: "shift.view", label: "Lihat Shift" },
      { id: "shift.create", label: "Tambah Shift" },
      { id: "shift.edit", label: "Edit Shift" },
      { id: "shift.delete", label: "Hapus Shift" },
    ],
  },
  lokasi: {
    label: "Lokasi & Geofence",
    category: "Lokasi",
    subPermissions: [
      { id: "lokasi.view", label: "Lihat Lokasi" },
      { id: "lokasi.create", label: "Tambah Lokasi" },
      { id: "lokasi.edit", label: "Edit Lokasi" },
      { id: "lokasi.delete", label: "Hapus Lokasi" },
    ],
  },
  verifikasi: {
    label: "Verifikasi Presensi",
    category: "Presensi",
    subPermissions: [
      { id: "verifikasi.view", label: "Lihat Data" },
      { id: "verifikasi.approve", label: "Verifikasi/Koreksi" },
    ],
  },
  pengajuan: {
    label: "Kelola Pengajuan",
    category: "Pengajuan",
    subPermissions: [
      { id: "pengajuan.view", label: "Lihat Pengajuan" },
      { id: "pengajuan.create", label: "Buat Pengajuan" },
      { id: "pengajuan.edit", label: "Edit Pengajuan" },
      { id: "pengajuan.delete", label: "Hapus Pengajuan" },
    ],
  },
  persetujuan: {
    label: "Persetujuan",
    category: "Approval",
    subPermissions: [
      { id: "persetujuan.view", label: "Lihat Pengajuan" },
      { id: "persetujuan.approve", label: "Setujui Pengajuan" },
      { id: "persetujuan.reject", label: "Tolak Pengajuan" },
    ],
  },
  laporan: {
    label: "Laporan & Rekap",
    category: "Laporan",
    subPermissions: [
      { id: "laporan.view", label: "Lihat Laporan" },
      { id: "laporan.export", label: "Export (PDF/CSV)" },
    ],
  },
  kalender: {
    label: "Kalender Akademik",
    category: "Jadwal",
    subPermissions: [
      { id: "kalender.view", label: "Lihat Kalender" },
      { id: "kalender.edit", label: "Edit Kalender" },
    ],
  },
  kinerja: {
    label: "Penilaian Kinerja",
    category: "Kinerja",
    subPermissions: [
      { id: "kinerja.view", label: "Lihat Penilaian" },
      { id: "kinerja.create", label: "Buat Penilaian" },
      { id: "kinerja.edit", label: "Edit Penilaian" },
      { id: "kinerja.delete", label: "Hapus Penilaian" },
    ],
  },
  pengaturan: {
    label: "Pengaturan Sistem",
    category: "Admin",
    subPermissions: [
      { id: "pengaturan.view", label: "Lihat Pengaturan" },
      { id: "pengaturan.edit", label: "Edit Pengaturan" },
      { id: "pengaturan.role", label: "Manajemen Role & Permission" },
    ],
  },
  siga8: {
    label: "Pemetaan SIGA8",
    category: "Integrasi",
    subPermissions: [
      { id: "siga8.view", label: "Lihat Pemetaan" },
      { id: "siga8.edit", label: "Edit Pemetaan" },
    ],
  },
};

const DEFAULT_ROLES = [
  { id: "super_admin", name: "Super Admin", is_system: true, description: "Akses penuh ke semua fitur" },
  { id: "developer", name: "Developer", is_system: true, description: "Akses teknis dan debugging" },
  { id: "admin_kepegawaian", name: "Admin Kepegawaian", is_system: true, description: "Mengelola data pegawai" },
  { id: "admin_unit", name: "Admin Unit", is_system: true, description: "Admin per unit kerja" },
  { id: "pimpinan", name: "Pimpinan", is_system: true, description: "Verifikasi dan approval" },
  { id: "pegawai", name: "Pegawai", is_system: true, description: "Hanya dashboard" },
];

function Role() {
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", permissions: [], is_active: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiRequest("/roles");
      const data = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
      setRoles(data.length > 0 ? data : DEFAULT_ROLES);
    } catch (err) {
      console.error("Gagal mengambil roles:", err);
      setRoles(DEFAULT_ROLES);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name || "",
      description: role.description || "",
      permissions: role.permissions || [],
      is_active: role.is_active !== false,
    });
  };

  const handlePermissionToggle = (permissionKey, subPermId = null) => {
    setFormData((prev) => {
      const permissions = [...prev.permissions];
      
      if (subPermId) {
        // Toggle sub-permission
        const index = permissions.indexOf(subPermId);
        if (index > -1) {
          permissions.splice(index, 1);
        } else {
          permissions.push(subPermId);
        }
      } else {
        // Toggle parent permission - enable/disable all sub-permissions
        const permConfig = AVAILABLE_PERMISSIONS[permissionKey];
        if (permConfig && permConfig.subPermissions && permConfig.subPermissions.length > 0) {
          const subPerms = permConfig.subPermissions.map((sp) => sp.id);
          const allIncluded = subPerms.every((sp) => permissions.includes(sp));
          
          if (allIncluded) {
            // Uncheck all
            const filtered = permissions.filter((p) => !subPerms.includes(p));
            return { ...prev, permissions: filtered };
          } else {
            // Check all
            const combined = new Set([...permissions, ...subPerms]);
            return { ...prev, permissions: Array.from(combined) };
          }
        } else {
          // No sub-permissions, toggle main permission
          const index = permissions.indexOf(permissionKey);
          if (index > -1) {
            permissions.splice(index, 1);
          } else {
            permissions.push(permissionKey);
          }
        }
      }
      
      return { ...prev, permissions };
    });
  };

  const isParentPermissionChecked = (permissionKey) => {
    const permConfig = AVAILABLE_PERMISSIONS[permissionKey];
    if (permConfig && permConfig.subPermissions && permConfig.subPermissions.length > 0) {
      const subPerms = permConfig.subPermissions.map((sp) => sp.id);
      return subPerms.every((sp) => formData.permissions.includes(sp));
    }
    return formData.permissions.includes(permissionKey);
  };

  const isParentPermissionIndeterminate = (permissionKey) => {
    const permConfig = AVAILABLE_PERMISSIONS[permissionKey];
    if (permConfig && permConfig.subPermissions && permConfig.subPermissions.length > 0) {
      const subPerms = permConfig.subPermissions.map((sp) => sp.id);
      const checkedCount = subPerms.filter((sp) => formData.permissions.includes(sp)).length;
      return checkedCount > 0 && checkedCount < subPerms.length;
    }
    return false;
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setMessage("");

      if (!formData.name || formData.name.trim() === "") {
        throw new Error("Nama role wajib diisi.");
      }

      const method = selectedRole?.id && !selectedRole.is_system ? "PUT" : "POST";
      const endpoint = selectedRole?.id && !selectedRole.is_system ? `/roles/${selectedRole.id}` : "/roles";

      if (selectedRole?.is_system) {
        throw new Error("Role sistem tidak bisa diubah.");
      }

      await apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
          is_active: formData.is_active,
        }),
      });

      setMessage("Role berhasil disimpan.");
      setShowModal(false);
      setSelectedRole(null);
      await fetchRoles();
    } catch (err) {
      console.error("Gagal menyimpan role:", err);
      setError(err.message || "Gagal menyimpan role.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!confirm(`Yakin hapus role "${role.name}"?`)) return;
    try {
      setLoading(true);
      setError("");

      if (role.is_system) {
        throw new Error("Role sistem tidak bisa dihapus.");
      }

      await apiRequest(`/roles/${role.id}`, { method: "DELETE" });
      setMessage("Role berhasil dihapus.");
      setSelectedRole(null);
      await fetchRoles();
    } catch (err) {
      setError(err.message || "Gagal menghapus role.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRoleStatus = async (role) => {
    try {
      setLoading(true);
      setError("");

      if (role.is_system) {
        throw new Error("Status role sistem tidak bisa diubah.");
      }

      await apiRequest(`/roles/${role.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !role.is_active }),
      });

      setMessage(`Role ${!role.is_active ? "diaktifkan" : "dinonaktifkan"}.`);
      await fetchRoles();
    } catch (err) {
      setError(err.message || "Gagal mengubah status role.");
    } finally {
      setLoading(false);
    }
  };

  const groupedPermissions = Object.entries(AVAILABLE_PERMISSIONS).reduce((acc, [key, config]) => {
    const category = config.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, ...config });
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="role-page">
        <div className="page-heading">
          <div>
            <h2>Manajemen Role</h2>
            <p>Kelola role dan permission pengguna sistem</p>
          </div>
          <button className="primary-button" onClick={() => { setSelectedRole(null); setFormData({ name: "", description: "", permissions: [], is_active: true }); setShowModal(true); }} disabled={loading}>
            + Tambah Role
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="settings-success">{message}</div>}

        <div className="role-container">
          <section className="role-list-panel data-panel">
            <h3>Daftar Role</h3>
            {loading && !selectedRole ? <div className="empty-state">Memuat role...</div> : (
              <div className="role-list">
                {roles.map((role) => (
                  <div key={role.id} className={`role-item ${selectedRole?.id === role.id ? "active" : ""}`} onClick={() => handleSelectRole(role)}>
                    <div className="role-item-header">
                      <strong>{role.name}</strong>
                      {!role.is_system && (
                        <span className={`role-status ${role.is_active ? "active" : "inactive"}`}>
                          {role.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      )}
                      {role.is_system && <span className="role-badge">Sistem</span>}
                    </div>
                    <p>{role.description || "Tidak ada deskripsi"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="role-details-panel data-panel">
            <h3>{selectedRole ? `Detail: ${selectedRole.name}` : "Pilih role untuk melihat detail"}</h3>
            {selectedRole ? (
              <div className="role-details">
                <div className="role-info">
                  <p><strong>Deskripsi:</strong> {selectedRole.description || "Tidak ada"}</p>
                  <p><strong>Status:</strong> {selectedRole.is_active !== false ? "Aktif" : "Nonaktif"}</p>
                  <p><strong>Tipe:</strong> {selectedRole.is_system ? "Sistem (tidak bisa diubah)" : "Custom"}</p>
                </div>

                {!selectedRole.is_system && (
                  <div className="role-actions">
                    <button className="secondary-button" onClick={() => setShowModal(true)}>✎ Edit</button>
                    <button className={`action-button ${selectedRole.is_active ? "disable" : "enable"}`} onClick={() => handleToggleRoleStatus(selectedRole)}>
                      {selectedRole.is_active ? "🔒 Nonaktifkan" : "🔓 Aktifkan"}
                    </button>
                    <button className="danger-button" onClick={() => handleDeleteRole(selectedRole)}>🗑 Hapus</button>
                  </div>
                )}

                <div className="permissions-summary">
                  <h4>Permission ({(selectedRole.permissions || []).length})</h4>
                  {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                    <div className="permission-tags">
                      {selectedRole.permissions.map((perm) => {
                        // Check if it's a sub-permission
                        const parts = perm.split(".");
                        if (parts.length === 2) {
                          const parentKey = parts[0];
                          const parentConfig = AVAILABLE_PERMISSIONS[parentKey];
                          const subConfig = parentConfig?.subPermissions?.find((sp) => sp.id === perm);
                          return <span key={perm} className="permission-tag sub-permission-tag">{subConfig?.label || perm}</span>;
                        }
                        
                        // It's a parent permission
                        const permConfig = AVAILABLE_PERMISSIONS[perm];
                        return <span key={perm} className="permission-tag parent-permission-tag">{permConfig?.label || perm}</span>;
                      })}
                    </div>
                  ) : (
                    <p className="text-muted">Tidak ada permission</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">Pilih role dari daftar untuk melihat detail</div>
            )}
          </section>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="employee-modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
              <div className="modal-header">
                <div>
                  <h3>{selectedRole?.id && !selectedRole.is_system ? "Edit Role" : "Tambah Role Baru"}</h3>
                  <p>Kelola role dan assign permission</p>
                </div>
                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>

              <form onSubmit={handleSaveRole}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Nama Role*</label>
                    <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Contoh: Admin Monitoring" required />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Deskripsi</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Deskripsi role..." rows="2" />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Permission</label>
                    <div className="permissions-container">
                      {Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category} className="permission-group">
                          <h4>{category}</h4>
                          <div className="permission-checkboxes">
                            {perms.map((perm) => (
                              <div key={perm.key} className="permission-item">
                                <label className="checkbox-label parent-permission">
                                  <input
                                    type="checkbox"
                                    checked={isParentPermissionChecked(perm.key)}
                                    onChange={() => handlePermissionToggle(perm.key)}
                                    style={{
                                      accentColor: isParentPermissionIndeterminate(perm.key) ? "#666" : undefined,
                                    }}
                                  />
                                  <span style={{ fontWeight: "600" }}>{perm.label}</span>
                                </label>
                                
                                {perm.subPermissions && perm.subPermissions.length > 0 && (
                                  <div className="sub-permissions">
                                    {perm.subPermissions.map((subPerm) => (
                                      <label key={subPerm.id} className="checkbox-label">
                                        <input
                                          type="checkbox"
                                          checked={formData.permissions.includes(subPerm.id)}
                                          onChange={() => handlePermissionToggle(perm.key, subPerm.id)}
                                        />
                                        <span>{subPerm.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="primary-button" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Role"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Role;
