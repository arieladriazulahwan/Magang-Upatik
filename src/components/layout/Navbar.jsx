import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div>
        <h1>Dashboard</h1>
        <p>Selamat datang di SI-PRESENSI UNTAD</p>
      </div>

      <div className="navbar-right">
        <button className="notification-button">
          🔔
          <span className="notification-badge">3</span>
        </button>

        <div className="profile">
          <div className="profile-avatar">A</div>

          <div className="profile-info">
            <strong>Administrator</strong>
            <span>Super Admin</span>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            title="Logout"
          >
            ⇥
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;