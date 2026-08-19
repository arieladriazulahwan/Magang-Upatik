import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";

const normalizeRole = (user, payload) => {
  const roles = user?.roles || payload?.roles || payload?.data?.roles;
  const roleValue = user?.role || payload?.role || payload?.user_role;
  const firstRole = Array.isArray(roles) ? roles[0] : roles;
  const roleName =
    (typeof firstRole === "object" ? firstRole?.name : firstRole) ||
    (typeof roleValue === "object" ? roleValue?.name : roleValue) ||
    "admin";

  const normalized = String(roleName)
    .trim()
    .toLowerCase()
    .replace(/[ -]+/g, "_");

  if (normalized === "superadmin" || normalized === "super_admin") {
    return "super_admin";
  }

  if (normalized.includes("developer")) return "developer";
  if (normalized.startsWith("admin")) return "admin";

  return normalized || "admin";
};

const storeLoginSession = (response) => {
  const payload = response?.data || response;
  const user = payload?.user || payload?.data?.user || payload?.employee || {};
  const token =
    payload?.token ||
    payload?.access_token ||
    payload?.data?.token ||
    payload?.data?.access_token ||
    "";

  if (!token) {
    throw new Error("Login berhasil tetapi token tidak dikirim server.");
  }

  localStorage.setItem("token", token);

  if (Object.keys(user).length > 0) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("role", normalizeRole(user, payload));
};

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSsoLogin = async () => {
    if (!username || !password) {
      alert("Isi username dan password untuk simulasi login SSO SIGA8.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest("/mock/siga8/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          device_name: "web",
        }),
      });

      storeLoginSession(response);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login SSO gagal:", error);
      alert(error.message || "Login SSO SIGA8 gagal.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",

        body: JSON.stringify({
          username: username,
          password: password,
          device_name: "web",
        }),
      });

      storeLoginSession(response);

      alert("Login berhasil!");
      navigate("/dashboard");

    } catch (error) {
      console.error("Login gagal:", error);

      alert(
        error.message ||
        "Username atau password salah."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        {/* BAGIAN KIRI */}
        <div className="login-brand">

          <div className="brand-content">

            <div className="brand-logo">
              KP
            </div>

            <h1>
              KlikPresensi
            </h1>

            <p>
              Konsol administrasi presensi pegawai
              <br />
              Universitas Tadulako
            </p>

          </div>

          <div className="brand-footer">
            <span>
              © 2026 SI-PRESENSI
            </span>
          </div>

        </div>


        {/* BAGIAN KANAN */}
        <div className="login-form-section">

          <div className="login-form-wrapper">

            <div className="login-heading">

              <h2>
                Selamat Datang
              </h2>

              <p>
                Silakan masuk untuk melanjutkan
                ke sistem.
              </p>

            </div>

            <button
              type="button"
              className="sso-login-button"
              onClick={handleSsoLogin}
              disabled={loading}
            >
              <span className="sso-icon">✓</span>
              {loading ? "Menghubungkan..." : "Masuk dengan SSO SIGA8"}
            </button>

            <div className="login-divider">
              <span>ATAU MASUK MANUAL</span>
            </div>


            {/* FORM LOGIN */}
            <form onSubmit={handleLogin}>

              {/* USERNAME */}
              <div className="login-field">

                <label htmlFor="username">
                  Username
                </label>

                <div className="login-input-wrapper">

                  <span className="input-icon">
                    👤
                  </span>

                  <input
                    id="username"
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    disabled={loading}
                    required
                  />

                </div>

              </div>


              {/* PASSWORD */}
              <div className="login-field">

                <div className="password-label">

                  <label htmlFor="password">
                    Password
                  </label>

                  <button
                    type="button"
                    className="forgot-button"
                    onClick={() =>
                      alert(
                        "Fitur lupa password akan tersedia."
                      )
                    }
                    disabled={loading}
                  >
                    Lupa password?
                  </button>

                </div>


                <div className="login-input-wrapper">

                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="show-password"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    disabled={loading}
                  >
                    {showPassword ? "◉" : "○"}
                  </button>

                </div>

              </div>


              {/* INGAT SAYA */}
              <div className="login-options">

                <label className="remember-me">

                  <input
                    type="checkbox"
                    disabled={loading}
                  />

                  <span>
                    Ingat saya
                  </span>

                </label>

              </div>


              {/* TOMBOL LOGIN */}
              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? "Memproses..."
                  : "Masuk"}
              </button>

            </form>


            {/* INFO */}
            <div className="login-info">

              <span>
                Akses hanya untuk pengguna terdaftar
              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;