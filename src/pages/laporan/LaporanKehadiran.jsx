import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { isAdminUnitOrLeader, getUserUnit } from "../../utils/access";

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
	const isRestrictedUser = isAdminUnitOrLeader();
	const userUnit = getUserUnit();
	const [attendance, setAttendance] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [leaveRequests, setLeaveRequests] = useState([]);
	const [period, setPeriod] = useState("bulan-ini");
	const [unit, setUnit] = useState(isRestrictedUser && userUnit ? userUnit : "Semua Unit");
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

	const units = useMemo(() => {
		const allUnits = [
			"Semua Unit",
			...new Set(employees.map((employee) => employee.work_unit?.name || employee.unit || employee.unit_kerja).filter(Boolean)),
		];
		
		// If user is admin_unit or pimpinan, hanya tampilkan unit mereka
		if (isRestrictedUser && userUnit) {
			return allUnits.filter((u) => u === "Semua Unit" || u === userUnit);
		}
		
		return allUnits;
	}, [employees, isRestrictedUser, userUnit]);

	const getDateRange = (periodValue) => {
		const today = new Date();
		const currentMonth = today.getMonth();
		const currentYear = today.getFullYear();
		
		if (periodValue === "bulan-ini") {
			return {
				start: new Date(currentYear, currentMonth, 1),
				end: new Date(currentYear, currentMonth + 1, 0)
			};
		} else if (periodValue === "bulan-lalu") {
			return {
				start: new Date(currentYear, currentMonth - 1, 1),
				end: new Date(currentYear, currentMonth, 0)
			};
		} else if (periodValue === "tahun-ini") {
			return {
				start: new Date(currentYear, 0, 1),
				end: new Date(currentYear, 11, 31)
			};
		}
		return { start: null, end: null };
	};

	const isDateInRange = (dateString) => {
		if (!dateString) return true;
		try {
			const itemDate = new Date(dateString);
			const { start, end } = getDateRange(period);
			if (!start || !end) return true;
			return itemDate >= start && itemDate <= end;
		} catch {
			return true;
		}
	};

	const rows = useMemo(() => {
		if (reportType === "cuti") {
			return leaveRequests.filter((item) => {
				const employee = item.employee || item.user || {};
				const itemUnit = item.unit || item.unit_name || employee.unit || employee.unit_kerja || "";
				const dateField = item.start_date || item.tanggal_mulai || "";
				
				// Filter berdasarkan user role
				const matchUnit = unit === "Semua Unit" || itemUnit === unit;
				const isUnitRestricted = isRestrictedUser && userUnit && itemUnit !== userUnit;
				const matchPeriod = isDateInRange(dateField);
				
				return !isUnitRestricted && matchUnit && matchPeriod;
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
			const dateField = item.date || item.attendance_date || "";
			
			// Filter berdasarkan user role
			const matchUnit = unit === "Semua Unit" || itemUnit === unit;
			const isUnitRestricted = isRestrictedUser && userUnit && itemUnit !== userUnit;
			const matchPeriod = isDateInRange(dateField);
			
			return !isUnitRestricted && matchUnit && matchPeriod;
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
	}, [attendance, leaveRequests, reportType, unit, period, isRestrictedUser, userUnit]);

	const getPeriodLabel = () => {
		switch (period) {
			case "bulan-ini":
				return new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
			case "bulan-lalu":
				const lastMonth = new Date();
				lastMonth.setMonth(lastMonth.getMonth() - 1);
				return lastMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
			case "tahun-ini":
				return new Date().getFullYear().toString();
			default:
				return "";
		}
	};

	const downloadPdf = () => {
		const doc = new jsPDF();
		const title = reportType === "cuti" ? "REKAP CUTI & IZIN" : "REKAP KEHADIRAN PEGAWAI";
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const periodLabel = getPeriodLabel();
		const unitLabel = unit === "Semua Unit" ? "Semua Unit" : unit;
		
		// Set title
		doc.setFontSize(14);
		doc.setFont(undefined, "bold");
		doc.text(title, pageWidth / 2, 15, { align: "center" });
		
		// Set subtitle with period and unit
		doc.setFontSize(10);
		doc.setFont(undefined, "normal");
		doc.text(`Periode: ${periodLabel} | Unit: ${unitLabel}`, pageWidth / 2, 22, { align: "center" });
		doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, pageWidth / 2, 28, { align: "center" });
		
		// Table headers
		const headers = reportType === "cuti"
			? ["No", "Pegawai", "Unit Kerja", "Jenis", "Tanggal", "Status"]
			: ["No", "Pegawai", "Unit Kerja", "Tanggal", "Hadir", "Telat", "Alpha", "Izin", "Status"];
		
		// Prepare table data
		let tableData = rows.map((row, index) => {
			if (reportType === "cuti") {
				return [
					String(index + 1),
					row.name,
					row.unit,
					row.category,
					row.date,
					row.status
				];
			} else {
				return [
					String(index + 1),
					row.name,
					row.unit,
					row.date,
					String(row.hadir),
					String(row.terlambat),
					String(row.alpha),
					String(row.izin),
					row.status
				];
			}
		});
		
		// Calculate column widths
		const columnCount = headers.length;
		const columnWidth = (pageWidth - 20) / columnCount;
		let yPosition = 40;
		const lineHeight = 7;
		const rowHeight = 6;
		
		// Draw headers
		doc.setFontSize(10);
		doc.setFont(undefined, "bold");
		doc.setFillColor(41, 128, 185);
		doc.setTextColor(255, 255, 255);
		
		headers.forEach((header, index) => {
			const x = 10 + index * columnWidth;
			doc.rect(x, yPosition, columnWidth, lineHeight, "F");
			doc.text(header, x + columnWidth / 2, yPosition + 5, { align: "center", maxWidth: columnWidth - 2 });
		});
		
		yPosition += lineHeight;
		
		// Draw rows
		doc.setFont(undefined, "normal");
		doc.setTextColor(0, 0, 0);
		doc.setFillColor(240, 240, 240);
		let isEvenRow = false;
		
		tableData.forEach((rowData) => {
			// Check if we need a new page
			if (yPosition + rowHeight > pageHeight - 10) {
				doc.addPage();
				yPosition = 10;
				
				// Redraw headers on new page
				doc.setFontSize(10);
				doc.setFont(undefined, "bold");
				doc.setFillColor(41, 128, 185);
				doc.setTextColor(255, 255, 255);
				
				headers.forEach((header, index) => {
					const x = 10 + index * columnWidth;
					doc.rect(x, yPosition, columnWidth, lineHeight, "F");
					doc.text(header, x + columnWidth / 2, yPosition + 5, { align: "center", maxWidth: columnWidth - 2 });
				});
				
				yPosition += lineHeight;
				doc.setFont(undefined, "normal");
				doc.setTextColor(0, 0, 0);
				isEvenRow = false;
			}
			
			// Draw row background
			if (isEvenRow) {
				doc.setFillColor(240, 240, 240);
				doc.rect(10, yPosition, pageWidth - 20, rowHeight, "F");
			}
			
			// Draw cells
			rowData.forEach((cell, index) => {
				const x = 10 + index * columnWidth;
				doc.text(String(cell), x + 2, yPosition + 4, { maxWidth: columnWidth - 4 });
			});
			
			yPosition += rowHeight;
			isEvenRow = !isEvenRow;
		});
		
		// Save PDF with period and unit info
		const periodShort = period.replace("bulan-", "").replace("tahun-", "");
		const unitShort = unit === "Semua Unit" ? "semua" : unit.toLowerCase().replace(/\s+/g, "-");
		const fileName = `rekap-${reportType}-${periodShort}-${unitShort}-${new Date().toISOString().slice(0, 10)}.pdf`;
		doc.save(fileName);
	};

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
		const periodShort = period.replace("bulan-", "").replace("tahun-", "");
		const unitShort = unit === "Semua Unit" ? "semua" : unit.toLowerCase().replace(/\s+/g, "-");
		link.download = `rekap-${reportType}-${periodShort}-${unitShort}-${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<AdminLayout>
			<div className="report-page">
				<div className="page-heading">
					<div><h2>Rekap & Ekspor</h2><p>Rekapitulasi kehadiran dan pengajuan pegawai</p></div>
					<button className="primary-button" onClick={downloadPdf} disabled={loading || rows.length === 0}>Ekspor PDF</button>
				</div>

				<section className="report-toolbar">
					<label>Periode<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="bulan-ini">Bulan Ini</option><option value="bulan-lalu">Bulan Lalu</option><option value="tahun-ini">Tahun Ini</option></select></label>
				<label>Unit Kerja<select value={unit} onChange={(event) => setUnit(event.target.value)} disabled={isRestrictedUser}>{units.map((item) => <option key={item}>{item}</option>)}</select>{isRestrictedUser && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#666" }}>(Hanya unit Anda)</span>}</label>
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
