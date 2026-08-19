import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";

const normalizeArray = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	if (Array.isArray(payload?.results)) return payload.results;
	return [];
};

const getStatus = (item) => String(item.status || item.attendance_status || "").toLowerCase();

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function LaporanKehadiran() {
	const [attendance, setAttendance] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [leaveRequests, setLeaveRequests] = useState([]);
	const [period, setPeriod] = useState("bulan-ini");
	const [unit, setUnit] = useState("Semua Unit");
	const [reportType, setReportType] = useState("kehadiran");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const fetchReports = async () => {
		try {
			setLoading(true);
			setError("");
			const [attendanceResult, employeesResult, leaveResult] = await Promise.allSettled([
				apiRequest("/attendance"),
				apiRequest("/employees"),
				apiRequest("/leave-requests"),
			]);
			const value = (result) => result.status === "fulfilled" ? normalizeArray(result.value) : [];
			setAttendance(value(attendanceResult));
			setEmployees(value(employeesResult));
			setLeaveRequests(value(leaveResult));
		} catch (err) {
			setError(err.message || "Gagal memuat laporan.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchReports(); }, []);

	const units = useMemo(() => [
		"Semua Unit",
		...new Set(employees.map((employee) => employee.work_unit?.name || employee.unit || employee.unit_kerja).filter(Boolean)),
	], [employees]);

	const rows = useMemo(() => {
		if (reportType === "cuti") {
			return leaveRequests.filter((item) => {
				const employee = item.employee || item.user || {};
				const itemUnit = item.unit || item.unit_name || employee.unit || employee.unit_kerja || "";
				return unit === "Semua Unit" || itemUnit === unit;
			}).map((item, index) => {
				const employee = item.employee || item.user || {};
				return {
					id: item.id || index,
					name: item.name || item.employee_name || employee.name || "Pegawai",
					unit: item.unit || item.unit_name || employee.unit || employee.unit_kerja || "-",
					category: item.type || item.category || item.leave_type || "Izin",
					date: item.start_date || item.tanggal_mulai || "-",
					status: item.status || item.approval_status || "-",
					detail: item.reason || item.alasan || item.notes || "-",
				};
			});
		}

		return attendance.filter((item) => {
			const employee = item.employee || item.user || {};
			const itemUnit = item.unit || item.unit_name || employee.unit || employee.unit_kerja || "";
			return unit === "Semua Unit" || itemUnit === unit;
		}).map((item, index) => {
			const employee = item.employee || item.user || {};
			const status = getStatus(item);
			return {
				id: item.id || index,
				name: item.name || item.employee_name || employee.name || "Pegawai",
				unit: item.unit || item.unit_name || employee.unit || employee.unit_kerja || "-",
				date: item.date || item.attendance_date || "-",
				hadir: ["hadir", "terlambat", "pulang_cepat"].includes(status) ? 1 : 0,
				terlambat: status === "terlambat" ? 1 : 0,
				alpha: ["alpha", "belum_absen"].includes(status) ? 1 : 0,
				izin: ["izin", "sakit"].includes(status) ? 1 : 0,
				status: item.status || item.attendance_status || "-",
			};
		});
	}, [attendance, leaveRequests, reportType, unit]);

	const downloadCsv = () => {
		const headers = reportType === "cuti"
			? ["Pegawai", "Unit Kerja", "Jenis", "Tanggal Mulai", "Status", "Keterangan"]
			: ["Pegawai", "Unit Kerja", "Tanggal", "Hadir", "Terlambat", "Alpha", "Izin", "Status"];
		const values = rows.map((row) => reportType === "cuti"
			? [row.name, row.unit, row.category, row.date, row.status, row.detail]
			: [row.name, row.unit, row.date, row.hadir, row.terlambat, row.alpha, row.izin, row.status]);
		const csv = [headers, ...values].map((line) => line.map(escapeCsv).join(",")).join("\r\n");
		const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `rekap-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<AdminLayout>
			<div className="report-page">
				<div className="page-heading">
					<div><h2>Rekap & Ekspor</h2><p>Rekapitulasi kehadiran dan pengajuan pegawai</p></div>
					<button className="primary-button" onClick={downloadCsv} disabled={loading || rows.length === 0}>Ekspor CSV</button>
				</div>

				<section className="report-toolbar">
					<label>Periode<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="bulan-ini">Bulan Ini</option><option value="bulan-lalu">Bulan Lalu</option><option value="tahun-ini">Tahun Ini</option></select></label>
					<label>Unit Kerja<select value={unit} onChange={(event) => setUnit(event.target.value)}>{units.map((item) => <option key={item}>{item}</option>)}</select></label>
					<label>Jenis Laporan<select value={reportType} onChange={(event) => setReportType(event.target.value)}><option value="kehadiran">Rekap Kehadiran</option><option value="cuti">Rekap Cuti & Izin</option></select></label>
					<button className="secondary-button" onClick={fetchReports} disabled={loading}>Refresh</button>
				</section>

				<section className="data-panel report-panel">
					{loading && <div className="empty-state">Memuat laporan...</div>}
					{!loading && error && <div className="empty-state"><p>{error}</p><button className="secondary-button" onClick={fetchReports}>Coba Lagi</button></div>}
					{!loading && !error && (
						<div className="employee-table-wrapper">
							<table className="employee-table report-table">
								<thead><tr>{reportType === "cuti" ? <><th>Pegawai</th><th>Unit Kerja</th><th>Jenis</th><th>Tanggal</th><th>Status</th><th>Keterangan</th></> : <><th>Pegawai</th><th>Unit Kerja</th><th>Tanggal</th><th>Hadir</th><th>Telat</th><th>Alpha</th><th>Izin</th><th>Status</th></>}</tr></thead>
								<tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.unit}</td><td>{reportType === "cuti" ? row.category : row.date}</td>{reportType === "cuti" ? <><td>{row.date}</td><td><span className="report-status">{row.status}</span></td><td>{row.detail}</td></> : <><td>{row.hadir}</td><td>{row.terlambat}</td><td>{row.alpha}</td><td>{row.izin}</td><td><span className="report-status">{row.status}</span></td></>}</tr>)}</tbody>
							</table>
							{rows.length === 0 && <div className="empty-state">Tidak ada data pada filter ini.</div>}
						</div>
					)}
				</section>
			</div>
		</AdminLayout>
	);
}

export default LaporanKehadiran;
