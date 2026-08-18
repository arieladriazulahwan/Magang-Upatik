import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

function DetailUnitKerja() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUnit = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(`/work-units/${id}`);

      console.log("Detail unit kerja:", response);

      if (response?.data) {
        setUnit(response.data);
      } else {
        setUnit(response);
      }

    } catch (error) {
      console.error(
        "Gagal mengambil detail unit kerja:",
        error
      );

      setError(
        error.message ||
        "Gagal mengambil detail unit kerja."
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUnit();
    }
  }, [id]);

  const getName = () => {
    if (!unit) return "-";

    return (
      unit.name ||
      unit.nama ||
      unit.nama_unit ||
      unit.unit_name ||
      "-"
    );
  };

  const getCode = () => {
    if (!unit) return "-";

    return (
      unit.code ||
      unit.kode ||
      unit.kode_unit ||
      "-"
    );
  };

  const getParent = () => {
    if (!unit) return "-";

    if (typeof unit.parent === "object" && unit.parent) {
      return (
        unit.parent.name ||
        unit.parent.nama ||
        "-"
      );
    }

    return (
      unit.parent_name ||
      unit.parent ||
      "-"
    );
  };

  return (
    <AdminLayout>

      <div className="unit-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>

            <h2>
              Detail Unit Kerja
            </h2>

            <p>
              Informasi detail unit kerja
            </p>

          </div>

          <button
            className="secondary-button"
            onClick={() => navigate("/unit")}
          >
            ← Kembali
          </button>

        </div>


        {/* LOADING */}

        {loading && (
          <section className="data-panel">

            <div className="empty-state">
              Memuat detail unit kerja...
            </div>

          </section>
        )}


        {/* ERROR */}

        {!loading && error && (
          <section className="data-panel">

            <div className="empty-state">

              <p>
                {error}
              </p>

              <button
                className="secondary-button"
                onClick={fetchUnit}
              >
                Coba Lagi
              </button>

            </div>

          </section>
        )}


        {/* DETAIL */}

        {!loading && !error && unit && (

          <section className="data-panel">

            <div className="data-toolbar">

              <div>

                <h3>
                  Informasi Unit Kerja
                </h3>

                <p>
                  Data yang diperoleh dari backend
                </p>

              </div>

            </div>


            <div className="unit-detail-content">

              {/* NAMA */}

              <div className="detail-item">

                <span className="detail-label">
                  Nama Unit Kerja
                </span>

                <strong className="detail-value">
                  {getName()}
                </strong>

              </div>


              {/* KODE */}

              <div className="detail-item">

                <span className="detail-label">
                  Kode Unit
                </span>

                <strong className="detail-value">
                  {getCode()}
                </strong>

              </div>


              {/* PARENT */}

              <div className="detail-item">

                <span className="detail-label">
                  Unit Induk
                </span>

                <strong className="detail-value">
                  {getParent()}
                </strong>

              </div>


              {/* ID */}

              <div className="detail-item">

                <span className="detail-label">
                  ID
                </span>

                <strong className="detail-value">
                  {unit.id || id}
                </strong>

              </div>

            </div>

          </section>

        )}


        {/* JIKA DATA KOSONG */}

        {!loading && !error && !unit && (

          <section className="data-panel">

            <div className="empty-state">
              Data unit kerja tidak ditemukan.
            </div>

          </section>

        )}

      </div>

    </AdminLayout>
  );
}

export default DetailUnitKerja;