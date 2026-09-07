import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const APP_TIME_ZONE = "Asia/Makassar";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const toLabel = (value) => String(value || "-")
  .replace(/_/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatAttendanceTime = (value) => {
  if (!value || value === "-") return "-";
  const match = String(value).match(/(?:T|\s)(\d{2}:\d{2})|^(\d{2}:\d{2})/);
  return match?.[1] || match?.[2] || String(value);
};

const getEmployeeId = (item) => item.employee_id ?? item.employee?.id ?? item.pegawai?.id;

const enrichAttendance = (attendance, employees) => {
  const employeesById = new Map(employees.map((employee) => [String(employee.id), employee]));

  return attendance.map((item) => {
    const employee = item.employee || item.pegawai || employeesById.get(String(getEmployeeId(item))) || {};
    const status = String(item.status || item.attendance_status || "-").toLowerCase();

    return {
      ...item,
      name: item.name || item.nama || employee.name || employee.nama || "-",
      nip: item.nip || employee.nip || employee.nik || "-",
      unit: item.unit || item.unit_kerja || item.work_unit?.name || employee.work_unit?.name || employee.unit || employee.unit_kerja || "-",
      masuk: formatAttendanceTime(item.masuk || item.jam_masuk || item.check_in || item.clock_in),
      keluar: formatAttendanceTime(item.keluar || item.jam_keluar || item.check_out || item.clock_out),
      metode: item.metode || item.method || item.type || "-",
      status,
    };
  });
};

const getSummary = (attendance) => attendance.reduce((result, item) => {
  const status = String(item.status || "").toLowerCase();
  if (status === "hadir") result.hadir += 1;
  else if (status === "terlambat") result.terlambat += 1;
  else if (["izin", "cuti", "sakit", "dinas", "dinas_luar"].includes(status)) result.izin += 1;
  else if (["alpha", "tidak_lengkap", "belum_absen"].includes(status)) result.belum_absen += 1;
  return result;
}, { hadir: 0, terlambat: 0, izin: 0, belum_absen: 0 });

const getToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
};

const getAttendanceDate = (item) => {
  const value = item.date || item.attendance_date || item.tanggal || item.check_in_at || item.clock_in || item.created_at;
  if (!value) return "";
  return String(value).slice(0, 10);
};

function Monitoring() {
  const today = getToday();
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    hadir: 0,
    terlambat: 0,
    izin: 0,
    belum_absen: 0,
  });

  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("Semua Unit");
  const [status, setStatus] = useState("Semua Status");
  const [selectedDate, setSelectedDate] = useState(today);

  const [loading, setLoading] = useState(true);

  // =========================
  // AMBIL DATA DARI BACKEND
  // =========================

  const fetchMonitoring = useCallback(async () => {
    try {
      setLoading(true);

      // Backend menerima filter tanggal agar ringkasan dan data yang dikirim
      // hanya untuk tanggal yang dipilih. Penyaringan ulang di frontend mengantisipasi
      // backend lama yang belum menerapkan query parameter tersebut.
      const [response, employeesResponse] = await Promise.all([
        apiRequest(`/attendance?date=${selectedDate}`),
        apiRequest("/employees").catch(() => []),
      ]);

      console.log(
        "Data monitoring dari backend:",
        response
      );

      /*
       * Sesuaikan dengan response backend.
       * Untuk sementara kita antisipasi:
       *
       * {
       *   data: [],
       *   summary: {
       *      hadir: 0,
       *      terlambat: 0,
       *      izin: 0,
       *      belum_absen: 0
       *   }
       * }
       */

      const attendance = normalizeArray(response)
        .filter((item) => !getAttendanceDate(item) || getAttendanceDate(item) === selectedDate);
      const normalizedAttendance = enrichAttendance(attendance, normalizeArray(employeesResponse));
      const calculatedSummary = getSummary(normalizedAttendance);
      setData(normalizedAttendance);

      setSummary({
        hadir: response.summary?.hadir ?? calculatedSummary.hadir,
        terlambat: response.summary?.terlambat ?? calculatedSummary.terlambat,
        izin: response.summary?.izin ?? calculatedSummary.izin,
        belum_absen: response.summary?.belum_absen ?? calculatedSummary.belum_absen,
      });

    } catch (error) {
      console.error(
        "Gagal mengambil data monitoring:",
        error
      );

      setData([]);

      setSummary({
        hadir: 0,
        terlambat: 0,
        izin: 0,
        belum_absen: 0,
      });

    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchMonitoring();
  }, [fetchMonitoring]);

  // =========================
  // FILTER DATA
  // =========================

  const filteredData = data.filter((item) => {
    const keyword = search.toLowerCase();

    const name =
      item.name ||
      "";

    const nip =
      item.nip || "";

    const itemUnit =
      item.unit ||
      item.unit_kerja ||
      "";

    const itemStatus = toLabel(item.status);

    const matchSearch =
      name.toLowerCase().includes(keyword) ||
      nip.toLowerCase().includes(keyword);

    const matchUnit =
      unit === "Semua Unit" ||
      itemUnit === unit;

    const matchStatus =
      status === "Semua Status" ||
      itemStatus === status;

    return (
      matchSearch &&
      matchUnit &&
      matchStatus
    );
  });

  // =========================
  // UNIT DARI DATA BACKEND
  // =========================

  const units = [
    ...new Set(
      data
        .map(
          (item) =>
            item.unit
        )
        .filter(Boolean)
    ),
  ];

  // =========================
  // RENDER
  // =========================

  return (
    <AdminLayout>

      <div className="monitoring-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>
            <h2>
              Monitoring Kehadiran
            </h2>

            <p>
              Pemantauan presensi pegawai secara real-time
            </p>
          </div>

          <div className="monitoring-date">

            <span>
              Hari ini
            </span>

            <strong>
              {todayLabel}
            </strong>

          </div>

        </div>


        {/* SUMMARY */}

        <div className="monitoring-summary">

          {/* HADIR */}

          <div className="monitoring-card">

            <div className="monitoring-card-icon hadir">
              ✓
            </div>

            <div>
              <span>
                Hadir
              </span>

              <strong>
                {summary.hadir}
              </strong>
            </div>

          </div>


          {/* TERLAMBAT */}

          <div className="monitoring-card">

            <div className="monitoring-card-icon terlambat">
              !
            </div>

            <div>
              <span>
                Terlambat
              </span>

              <strong>
                {summary.terlambat}
              </strong>
            </div>

          </div>


          {/* IZIN */}

          <div className="monitoring-card">

            <div className="monitoring-card-icon izin">
              i
            </div>

            <div>
              <span>
                Izin / Cuti / Dinas
              </span>

              <strong>
                {summary.izin}
              </strong>
            </div>

          </div>


          {/* BELUM ABSEN */}

          <div className="monitoring-card">

            <div className="monitoring-card-icon belum">
              -
            </div>

            <div>
              <span>
                Belum Absen
              </span>

              <strong>
                {summary.belum_absen}
              </strong>
            </div>

          </div>

        </div>


        {/* TABLE */}

        <section className="data-panel">

          {/* TOOLBAR */}

          <div className="data-toolbar monitoring-toolbar">

            {/* SEARCH */}

            <div className="search-box">

              <span>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Cari nama atau NIP..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>


            {/* FILTER */}

            <div className="monitoring-filters">

              <input
                type="date"
                className="filter-input"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
              />

              <select
                className="filter-select"
                value={unit}
                onChange={(e) =>
                  setUnit(e.target.value)
                }
              >

                <option>
                  Semua Unit
                </option>

                {units.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}

              </select>


              <select
                className="filter-select"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
              >

                <option>
                  Semua Status
                </option>

                <option>
                  Hadir
                </option>

                <option>
                  Terlambat
                </option>

                <option>
                  Izin
                </option>

                <option>
                  Belum Absen
                </option>

              </select>


              <button
                className="secondary-button"
                onClick={fetchMonitoring}
                disabled={loading}
              >
                ⟳ {loading ? "Memuat..." : "Refresh"}
              </button>

            </div>

          </div>


          {/* REALTIME BAR */}

          <div className="realtime-bar">

            <span className="realtime-dot" />

            <span>
              Monitoring aktif
            </span>

            <small>
              Data diperbarui dari server
            </small>

          </div>


          {/* TABLE */}

          <div className="employee-table-wrapper">

            <table className="employee-table monitoring-table">

              <thead>

                <tr>

                  <th>
                    Pegawai
                  </th>

                  <th>
                    Unit Kerja
                  </th>

                  <th>
                    Jam Masuk
                  </th>

                  <th>
                    Jam Keluar
                  </th>

                  <th>
                    Metode
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Aksi
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="7"
                      className="empty-state"
                    >
                      Memuat data presensi...
                    </td>

                  </tr>

                ) : filteredData.length > 0 ? (

                  filteredData.map((item) => {

                    const name = item.name || "-";

                    const nip = item.nip || "-";

                    const itemUnit = item.unit || "-";

                    const masuk = item.masuk || "-";

                    const keluar = item.keluar || "-";

                    const metode = toLabel(item.metode);

                    const itemStatus = toLabel(item.status);

                    return (

                      <tr key={item.id}>

                        {/* PEGAWAI */}

                        <td>

                          <div className="employee-name">

                            <div className="employee-avatar">
                              {name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>

                              <strong>
                                {name}
                              </strong>

                              <span>
                                {nip}
                              </span>

                            </div>

                          </div>

                        </td>


                        {/* UNIT */}

                        <td>
                          {itemUnit}
                        </td>


                        {/* MASUK */}

                        <td>

                          <span
                            className={
                              masuk === "-"
                                ? "time-empty"
                                : "time-value"
                            }
                          >
                            {masuk}
                          </span>

                        </td>


                        {/* KELUAR */}

                        <td>

                          <span
                            className={
                              keluar === "-"
                                ? "time-empty"
                                : "time-value"
                            }
                          >
                            {keluar}
                          </span>

                        </td>


                        {/* METODE */}

                        <td>

                          <span className="method-text">
                            {metode}
                          </span>

                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`attendance-status-pill ${
                              itemStatus
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )
                            }`}
                          >
                            {itemStatus}
                          </span>

                        </td>


                        {/* AKSI */}

                        <td>

                          <button className="action-button">
                            Detail
                          </button>

                        </td>

                      </tr>

                    );
                  })

                ) : (

                  <tr>

                    <td
                      colSpan="7"
                      className="empty-state"
                    >
                      Data presensi belum tersedia.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>


          {/* FOOTER */}

          <div className="table-footer">

            <span>
              Menampilkan{" "}
              {filteredData.length}{" "}
              data presensi
            </span>

            <div className="pagination">

              <button>
                ‹
              </button>

              <button className="current">
                1
              </button>

              <button>
                ›
              </button>

            </div>

          </div>

        </section>

      </div>

    </AdminLayout>
  );
}

export default Monitoring;
