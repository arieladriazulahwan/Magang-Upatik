import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

function UnitKerja() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/work-units");

      console.log("Data work units:", response);

      // Menyesuaikan kemungkinan bentuk response backend
      if (Array.isArray(response)) {
        setUnits(response);
      } else if (Array.isArray(response.data)) {
        setUnits(response.data);
      } else {
        setUnits([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data unit kerja:", error);
      setError(
        error.message || "Gagal mengambil data unit kerja."
      );
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  return (
    <AdminLayout>

      <div className="unit-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>
            <h2>Unit Kerja</h2>

            <p>
              Daftar unit kerja Universitas Tadulako
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={fetchUnits}
            disabled={loading}
          >
            ⟳ Refresh
          </button>

        </div>


        {/* CONTENT */}

        <section className="data-panel">

          {/* TOOLBAR */}

          <div className="data-toolbar">

            <div>
              <h3>
                Daftar Unit Kerja
              </h3>

              <p>
                Data unit kerja yang tersimpan pada sistem
              </p>
            </div>

          </div>


          {/* LOADING */}

          {loading && (
            <div className="empty-state">
              Memuat data unit kerja...
            </div>
          )}


          {/* ERROR */}

          {!loading && error && (
            <div className="empty-state">

              <p>
                {error}
              </p>

              <button
                className="secondary-button"
                onClick={fetchUnits}
              >
                Coba Lagi
              </button>

            </div>
          )}


          {/* TABLE */}

          {!loading && !error && (
            <div className="employee-table-wrapper">

              <table className="employee-table">

                <thead>

                  <tr>
                    <th>No</th>
                    <th>Nama Unit Kerja</th>
                    <th>Detail</th>
                  </tr>

                </thead>

                <tbody>

                  {units.length > 0 ? (

                    units.map((unit, index) => (

                      <tr key={unit.id || index}>

                        <td>
                          {index + 1}
                        </td>

                        <td>

                          <div className="employee-name">

                            <div className="employee-avatar">
                              {(unit.name ||
                                unit.nama ||
                                unit.nama_unit ||
                                "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>

                              <strong>
                                {unit.name ||
                                  unit.nama ||
                                  unit.nama_unit ||
                                  "-"}
                              </strong>

                              {unit.code && (
                                <span>
                                  {unit.code}
                                </span>
                              )}

                            </div>

                          </div>

                        </td>

                        <td>

                          <button
                            className="action-button"
                            onClick={() =>
                              navigate(`/unit/${unit.id}`)
                              
                            }
                          >
                            Detail
                          </button>

                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>

                      <td
                        colSpan="3"
                        style={{
                          textAlign: "center",
                          padding: "40px",
                        }}
                      >
                        Belum ada data unit kerja.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>
          )}


          {/* FOOTER */}

          {!loading && !error && (
            <div className="table-footer">

              <span>
                Menampilkan {units.length} unit kerja
              </span>

            </div>
          )}

        </section>

      </div>

    </AdminLayout>
  );
}

export default UnitKerja;