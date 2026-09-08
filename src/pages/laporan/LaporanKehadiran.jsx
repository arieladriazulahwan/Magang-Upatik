import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { getEmployees } from "../../services/pegawaiService";
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
	const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
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
				getEmployees(),
				apiRequest("/leave-requests"),
			]);
			const value = (result) => result.status === "fulfilled" ? normalizeArray(result.value) : [];
			setAttendance(value(attendanceResult));
			setEmployees(employeesResult.status === "fulfilled" ? employeesResult.value : []);
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
		if (periodValue === "bulan-pilihan") {
			const [year, month] = selectedMonth.split("-").map(Number);
			return {
				start: new Date(year, month - 1, 1),
				end: new Date(year, month, 0)
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
	}, [attendance, leaveRequests, reportType, unit, period, selectedMonth, isRestrictedUser, userUnit]);

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
			case "bulan-pilihan":
				return new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
			default:
				return "";
		}
	};

	const downloadPdf = () => {
		const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
		const title = reportType === "cuti" ? "REKAP CUTI & IZIN" : "REKAP KEHADIRAN PEGAWAI";
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const periodLabel = getPeriodLabel();
		const unitLabel = unit === "Semua Unit" ? "Semua Unit" : unit;
		const margin = 14;
		const printedAt = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
		const headers = reportType === "cuti"
			? ["No", "Pegawai", "Unit Kerja", "Jenis", "Tanggal", "Status"]
			: ["No", "Pegawai", "Unit Kerja", "Tanggal", "Hadir", "Telat", "Alpha", "Izin", "Status"];
		const columnWidths = reportType === "cuti"
			? [10, 62, 52, 34, 32, 60]
			: [10, 58, 45, 28, 16, 16, 16, 16, 42];

		const tableData = rows.map((row, index) => {
			if (reportType === "cuti") {
				return [String(index + 1), row.name, row.unit, row.category, row.date, toLabel(row.status)];
			} else {
				return [String(index + 1), row.name, row.unit, row.date, String(row.hadir), String(row.terlambat), String(row.alpha), String(row.izin), toLabel(row.status)];
			}
		});

		const drawReportHeader = () => {
			doc.setFillColor(24, 91, 163);
			doc.rect(0, 0, pageWidth, 7, "F");
			doc.setTextColor(20, 45, 76);
			doc.setFont("helvetica", "bold");
			doc.setFontSize(16);
			doc.text(title, margin, 18);
			doc.setFont("helvetica", "normal");
			doc.setFontSize(9);
			doc.setTextColor(82, 97, 116);
			doc.text(`Periode: ${periodLabel}`, margin, 25);
			doc.text(`Unit kerja: ${unitLabel}`, margin, 30);
			doc.text(`Dicetak ${printedAt}`, pageWidth - margin, 25, { align: "right" });
			doc.setDrawColor(207, 218, 230);
			doc.line(margin, 35, pageWidth - margin, 35);
		};

		const drawTableHeader = (y) => {
			doc.setFont("helvetica", "bold");
			doc.setFontSize(8.5);
			doc.setFillColor(24, 91, 163);
			doc.setTextColor(255, 255, 255);
			let x = margin;
			headers.forEach((header, index) => {
				doc.rect(x, y, columnWidths[index], 8, "F");
				doc.text(header, x + columnWidths[index] / 2, y + 5.2, { align: "center" });
				x += columnWidths[index];
			});
			return y + 8;
		};

		drawReportHeader();
		let yPosition = drawTableHeader(40);
		let isEvenRow = false;

		tableData.forEach((rowData) => {
			doc.setFont("helvetica", "normal");
			doc.setFontSize(8.5);
			const cellLines = rowData.map((cell, index) => doc.splitTextToSize(String(cell || "-"), columnWidths[index] - 4));
			const rowHeight = Math.max(8, Math.max(...cellLines.map((lines) => lines.length)) * 4.2 + 3);

			if (yPosition + rowHeight > pageHeight - 16) {
				doc.addPage();
				drawReportHeader();
				yPosition = drawTableHeader(40);
				isEvenRow = false;
			}

			if (isEvenRow) {
				doc.setFillColor(244, 247, 250);
				doc.rect(margin, yPosition, columnWidths.reduce((sum, width) => sum + width, 0), rowHeight, "F");
			}

			doc.setTextColor(36, 52, 71);
			let x = margin;
			cellLines.forEach((lines, index) => {
				const centered = [0, 4, 5, 6, 7].includes(index) && reportType !== "cuti";
				doc.text(lines, centered ? x + columnWidths[index] / 2 : x + 2, yPosition + 5, { align: centered ? "center" : "left" });
				x += columnWidths[index];
			});

			yPosition += rowHeight;
			isEvenRow = !isEvenRow;
		});

		const totalPages = doc.getNumberOfPages();
		for (let page = 1; page <= totalPages; page += 1) {
			doc.setPage(page);
			doc.setFont("helvetica", "normal");
			doc.setFontSize(8);
			doc.setTextColor(112, 128, 144);
			doc.text(`Total ${rows.length} data`, margin, pageHeight - 8);
			doc.text(`Halaman ${page} dari ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
		}

		// Save PDF with period and unit info
		const periodShort = period === "bulan-pilihan" ? selectedMonth : period.replace("bulan-", "").replace("tahun-", "");
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
		const periodShort = period === "bulan-pilihan" ? selectedMonth : period.replace("bulan-", "").replace("tahun-", "");
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
					<button className="primary-button" onClick={downloadPdf} disabled={loading}>Ekspor PDF</button>
				</div>

				<section className="report-toolbar">
					<label className="report-filter"><span>Periode Laporan</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="bulan-ini">Bulan Ini</option><option value="bulan-lalu">Bulan Lalu</option><option value="bulan-pilihan">Pilih Bulan</option><option value="tahun-ini">Tahun Ini</option></select></label>
					{period === "bulan-pilihan" && <label className="report-filter"><span>Bulan yang Diekspor</span><input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>}
					<label className="report-filter"><span>Unit Kerja</span><select value={unit} onChange={(event) => setUnit(event.target.value)} disabled={isRestrictedUser}>{units.map((item) => <option key={item}>{item}</option>)}</select>{isRestrictedUser && <small>Hanya unit Anda</small>}</label>
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
