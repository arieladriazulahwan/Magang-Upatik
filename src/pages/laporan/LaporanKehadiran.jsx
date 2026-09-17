import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiRequest } from "../../services/api";
import { getEmployees } from "../../services/pegawaiService";

const normalizeArray = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.items)) return payload.items;
	if (Array.isArray(payload?.results)) return payload.results;
	return [];
};

const getStatus = (item) => String(item.status || item.attendance_status || "").toLowerCase();

const toLabel = (value) =>
	String(value || "-")
		.replace(/_/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());

const getUnitName = (item, employee = {}) =>
	item.unit ||
	item.unit_name ||
	item.unit_kerja ||
	item.work_unit?.name ||
	employee.unit ||
	employee.unit_name ||
	employee.unit_kerja ||
	employee.work_unit?.name ||
	"";

const getNip = (item, employee = {}) =>
	item.nip ||
	item.employee_nip ||
	item.nik ||
	employee.nip ||
	employee.nik ||
	"-";

const UNTAD_LOGO_PATH = "/logo-untad.svg";

const loadImageAsPngDataUrl = (src, width = 180, height = 180) =>
	new Promise((resolve) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext("2d");
				context.clearRect(0, 0, width, height);
				context.drawImage(image, 0, 0, width, height);
				resolve(canvas.toDataURL("image/png"));
			} catch {
				resolve("");
			}
		};
		image.onerror = () => resolve("");
		image.src = src;
	});

const drawUntadLogoFallback = (doc, x, y, size) => {
	const centerX = x + size / 2;
	const shieldTop = y + 1;
	const shieldBottom = y + size - 1;

	doc.setLineWidth(0.6);
	doc.setDrawColor(17, 24, 39);
	doc.setFillColor(229, 30, 37);
	doc.triangle(centerX, shieldTop, x + size - 1, y + size * 0.24, x + size * 0.9, shieldBottom, "FD");
	doc.triangle(centerX, shieldTop, x + 1, y + size * 0.24, x + size * 0.1, shieldBottom, "FD");
	doc.rect(x + size * 0.1, y + size * 0.23, size * 0.8, size * 0.56, "F");

	doc.setFillColor(248, 220, 44);
	doc.setDrawColor(17, 24, 39);
	doc.ellipse(centerX, y + size * 0.44, size * 0.13, size * 0.29, "FD");
	doc.ellipse(x + size * 0.34, y + size * 0.48, size * 0.11, size * 0.26, "FD");
	doc.ellipse(x + size * 0.66, y + size * 0.48, size * 0.11, size * 0.26, "FD");

	doc.setFillColor(229, 30, 37);
	doc.ellipse(centerX, y + size * 0.54, size * 0.06, size * 0.11, "FD");

	doc.setDrawColor(248, 220, 44);
	doc.setLineWidth(1.1);
	doc.arc(centerX, y + size * 0.72, size * 0.28, size * 0.12, 12, 168, "S");
	doc.setFont("helvetica", "bold");
	doc.setFontSize(4.8);
	doc.setTextColor(255, 255, 255);
	doc.text("UNTAD", centerX, y + size * 0.9, { align: "center" });
};

const formatDuration = (minutes) => {
	const total = Number(minutes || 0);
	if (!total) return "-";
	const hours = Math.floor(total / 60);
	const remainingMinutes = total % 60;
	if (!hours) return `${remainingMinutes} menit`;
	if (!remainingMinutes) return `${hours} jam`;
	return `${hours} jam ${remainingMinutes} menit`;
};

const getInitials = (name) => {
	const words = String(name || "P")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0]?.slice(0, 2) || "P").toUpperCase();
};

const PAGE_SIZE = 10;

function LaporanKehadiran() {
	const [attendance, setAttendance] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [leaveRequests, setLeaveRequests] = useState([]);
	const [overtimeRequests, setOvertimeRequests] = useState([]);
	const [period, setPeriod] = useState("bulan-ini");
	const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
	const [unit, setUnit] = useState("Semua Unit");
	const [reportType, setReportType] = useState("kehadiran");
	const [search, setSearch] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const fetchReports = async () => {
		try {
			setLoading(true);
			setError("");
			const [attendanceResult, employeesResult, leaveResult, overtimeResult] = await Promise.allSettled([
				apiRequest("/attendance"),
				getEmployees(),
				apiRequest("/leave-requests"),
				apiRequest("/overtime-requests"),
			]);
			const value = (result) => result.status === "fulfilled" ? normalizeArray(result.value) : [];
			setAttendance(value(attendanceResult));
			setEmployees(employeesResult.status === "fulfilled" ? normalizeArray(employeesResult.value) : []);
			setLeaveRequests(value(leaveResult));
			setOvertimeRequests(value(overtimeResult));
		} catch (err) {
			setError(err.message || "Gagal memuat laporan.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchReports(); }, []);

	useEffect(() => {
		setCurrentPage(1);
	}, [period, selectedMonth, unit, reportType, search]);

	const units = useMemo(() => {
		return [
			"Semua Unit",
			...new Set(employees.map((employee) => getUnitName({}, employee)).filter(Boolean)),
		];
	}, [employees]);

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
				const itemUnit = getUnitName(item, employee);
				const dateField = item.start_date || item.tanggal_mulai || "";
				const matchUnit = unit === "Semua Unit" || itemUnit === unit;
				const matchPeriod = isDateInRange(dateField);
				
				return matchUnit && matchPeriod;
			}).map((item, index) => {
				const employee = item.employee || item.user || {};
				return {
					id: item.id || index,
					name: item.name || item.employee_name || employee.name || "Pegawai",
					nip: getNip(item, employee),
					unit: getUnitName(item, employee) || "-",
					category: item.type || item.category || item.leave_type || "Izin",
					date: item.start_date || item.tanggal_mulai || "-",
					status: item.status || item.approval_status || "-",
					detail: item.reason || item.alasan || item.notes || "-",
				};
			});
		}

		if (reportType === "lembur") {
			return overtimeRequests.filter((item) => {
				const employee = item.employee || item.user || {};
				const matchedEmployee = employees.find((entry) => String(entry.id) === String(employee.id || item.employee_id));
				const itemUnit = getUnitName(item, matchedEmployee || employee);
				const dateField = item.date || item.tanggal || "";
				const matchUnit = unit === "Semua Unit" || itemUnit === unit;
				const matchPeriod = isDateInRange(dateField);

				return matchUnit && matchPeriod;
			}).map((item, index) => {
				const employee = item.employee || item.user || {};
				const matchedEmployee = employees.find((entry) => String(entry.id) === String(employee.id || item.employee_id));
				const startTime = item.planned_start_time?.slice(0, 5) || "-";
				const endTime = item.planned_end_time?.slice(0, 5) || "-";

				return {
					id: item.id || index,
					name: item.name || item.employee_name || employee.name || matchedEmployee?.name || "Pegawai",
					nip: getNip(item, matchedEmployee || employee),
					unit: getUnitName(item, matchedEmployee || employee) || "-",
					date: item.date || item.tanggal || "-",
					timeRange: `${startTime} - ${endTime}`,
					duration: formatDuration(item.duration_minutes),
					status: item.status || "-",
					detail: item.work_description || item.reason || item.keterangan || "-",
				};
			});
		}

		const attendanceRows = attendance.filter((item) => {
			const employee = item.employee || item.user || {};
			const itemUnit = getUnitName(item, employee);
			const dateField = item.date || item.attendance_date || "";
			const matchUnit = unit === "Semua Unit" || itemUnit === unit;
			const matchPeriod = isDateInRange(dateField);
			
			return matchUnit && matchPeriod;
		}).map((item, index) => {
			const employee = item.employee || item.user || {};
			const status = getStatus(item);
			return {
				id: item.id || index,
				name: item.name || item.employee_name || employee.name || "Pegawai",
				nip: getNip(item, employee),
				unit: getUnitName(item, employee) || "-",
				date: item.date || item.attendance_date || "-",
				hadir: ["hadir", "terlambat", "pulang_cepat"].includes(status) ? 1 : 0,
				terlambat: status === "terlambat" ? 1 : 0,
				alpha: ["alpha", "belum_absen"].includes(status) ? 1 : 0,
				izin: ["izin", "sakit"].includes(status) ? 1 : 0,
				status: item.status || item.attendance_status || "-",
			};
		});

		const recapMap = new Map();

		attendanceRows.forEach((row) => {
			const key = `${row.name}-${row.unit}-${row.nip || ""}`;
			const status = String(row.status || "").toLowerCase();
			const current = recapMap.get(key) || {
				...row,
				id: key,
				hadir: 0,
				terlambat: 0,
				alpha: 0,
				izin: 0,
				dinas: 0,
				cuti: 0,
				total: 0,
				status: "Rekap",
			};

			current.hadir += row.hadir;
			current.terlambat += row.terlambat;
			current.alpha += row.alpha;
			current.izin += row.izin;
			current.dinas += status.includes("dinas") || status.includes("perjadin") ? 1 : 0;
			current.cuti += status.includes("cuti") ? 1 : 0;
			current.total += 1;
			recapMap.set(key, current);
		});

		return [...recapMap.values()];
	}, [attendance, employees, leaveRequests, overtimeRequests, reportType, unit, period, selectedMonth]);

	const filteredRows = useMemo(() => {
		const keyword = search.trim().toLowerCase();
		if (!keyword) return rows;

		return rows.filter((row) =>
			[
				row.name,
				row.nip,
				row.unit,
				row.date,
				row.status,
				row.category,
				row.timeRange,
				row.duration,
				row.detail,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(keyword))
		);
	}, [rows, search]);

	const pagedRows = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filteredRows.slice(start, start + PAGE_SIZE);
	}, [filteredRows, currentPage]);

	const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

	const reportSummary = useMemo(() => {
		const attendanceTotals = rows.reduce(
			(total, row) => ({
				hadir: total.hadir + Number(row.hadir || 0),
				terlambat: total.terlambat + Number(row.terlambat || 0),
				alpha: total.alpha + Number(row.alpha || 0),
				izin: total.izin + Number(row.izin || 0),
				dinas: total.dinas + Number(row.dinas || 0),
				cuti: total.cuti + Number(row.cuti || 0),
			}),
			{ hadir: 0, terlambat: 0, alpha: 0, izin: 0, dinas: 0, cuti: 0 }
		);

		return [
			{ label: "Total Pegawai", value: employees.length, detail: "pegawai", tone: "green" },
			{ label: "Hadir", value: attendanceTotals.hadir, detail: "hari", tone: "mint" },
			{ label: "Terlambat", value: attendanceTotals.terlambat, detail: "hari", tone: "amber" },
			{ label: "Izin / Sakit", value: attendanceTotals.izin, detail: "hari", tone: "blue" },
			{ label: "Dinas", value: attendanceTotals.dinas, detail: "hari", tone: "purple" },
			{ label: "Cuti", value: reportType === "cuti" ? rows.length : attendanceTotals.cuti, detail: "hari", tone: "pink" },
			{ label: "Alpha", value: attendanceTotals.alpha, detail: "hari", tone: "red" },
		];
	}, [employees.length, reportType, rows]);

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

	const downloadPdf = async () => {
		const logoDataUrl = await loadImageAsPngDataUrl(UNTAD_LOGO_PATH);
		const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
		const title =
			reportType === "cuti"
				? "REKAP CUTI & IZIN"
				: reportType === "lembur"
					? "REKAP LEMBUR PEGAWAI"
					: "REKAP KEHADIRAN PEGAWAI";
		const pageWidth = doc.internal.pageSize.getWidth();
		const pageHeight = doc.internal.pageSize.getHeight();
		const periodLabel = getPeriodLabel();
		const unitLabel = unit === "Semua Unit" ? "Semua Unit" : unit;
		const margin = 14;
		const printedAt = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
		const headers = reportType === "cuti"
			? ["No", "Pegawai", "NIP", "Unit Kerja", "Jenis", "Tanggal", "Status"]
			: reportType === "lembur"
				? ["No", "Pegawai", "NIP", "Unit Kerja", "Tanggal", "Jam Rencana", "Durasi", "Status"]
				: ["No", "Pegawai", "NIP", "Unit Kerja", "Hadir", "Telat", "Alpha", "Izin", "Dinas", "Cuti", "Total"];
		const columnWidths = reportType === "cuti"
			? [10, 50, 36, 42, 28, 28, 54]
			: reportType === "lembur"
				? [10, 42, 34, 38, 24, 28, 26, 34]
				: [10, 42, 34, 38, 17, 17, 17, 17, 17, 17, 20];

		const tableData = filteredRows.map((row, index) => {
			if (reportType === "cuti") {
				return [String(index + 1), row.name, row.nip, row.unit, row.category, row.date, toLabel(row.status)];
			}
			if (reportType === "lembur") {
				return [String(index + 1), row.name, row.nip, row.unit, row.date, row.timeRange, row.duration, toLabel(row.status)];
			}
			return [String(index + 1), row.name, row.nip, row.unit, String(row.hadir), String(row.terlambat), String(row.alpha), String(row.izin), String(row.dinas), String(row.cuti), String(row.total)];
		});

		const drawReportHeader = () => {
			const centerX = pageWidth / 2;
			const logoX = margin + 5;
			const logoY = 10;
			const logoSize = 22;

			if (logoDataUrl) {
				doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
			} else {
				drawUntadLogoFallback(doc, logoX, logoY, logoSize);
			}

			doc.setTextColor(18, 24, 38);
			doc.setFont("helvetica", "bold");
			doc.setFontSize(12);
			doc.text("KEMENTERIAN PENDIDIKAN TINGGI", centerX, 14, { align: "center" });
			doc.text("SAINS, DAN TEKNOLOGI", centerX, 20, { align: "center" });
			doc.text("UNIVERSITAS TADULAKO", centerX, 26, { align: "center" });
			doc.setFont("helvetica", "normal");
			doc.setFontSize(8.3);
			doc.text("Jalan Soekarno Hatta Kilometer 9 Tondo, Mantikulore, Palu 94119", centerX, 32, { align: "center" });
			doc.text("Surel : untad@untad.ac.id   Laman : https://untad.ac.id", centerX, 37, { align: "center" });

			doc.setDrawColor(18, 24, 38);
			doc.setLineWidth(0.5);
			doc.line(margin, 42, pageWidth - margin, 42);

			doc.setFont("helvetica", "bold");
			doc.setFontSize(13);
			doc.text(title, centerX, 51, { align: "center" });
			doc.setFont("helvetica", "normal");
			doc.setFontSize(9);
			doc.setTextColor(82, 97, 116);
			doc.text(`Periode: ${periodLabel}`, margin, 59);
			doc.text(`Unit kerja: ${unitLabel}`, margin, 64);
			doc.text(`Dicetak ${printedAt}`, pageWidth - margin, 59, { align: "right" });
			doc.setDrawColor(207, 218, 230);
			doc.setLineWidth(0.2);
			doc.line(margin, 69, pageWidth - margin, 69);

			return 74;
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

		let yPosition = drawTableHeader(drawReportHeader());
		let isEvenRow = false;

		tableData.forEach((rowData) => {
			doc.setFont("helvetica", "normal");
			doc.setFontSize(8.5);
			const cellLines = rowData.map((cell, index) => doc.splitTextToSize(String(cell || "-"), columnWidths[index] - 4));
			const rowHeight = Math.max(8, Math.max(...cellLines.map((lines) => lines.length)) * 4.2 + 3);

			if (yPosition + rowHeight > pageHeight - 16) {
				doc.addPage();
				yPosition = drawTableHeader(drawReportHeader());
				isEvenRow = false;
			}

			if (isEvenRow) {
				doc.setFillColor(244, 247, 250);
				doc.rect(margin, yPosition, columnWidths.reduce((sum, width) => sum + width, 0), rowHeight, "F");
			}

			doc.setTextColor(36, 52, 71);
			let x = margin;
			cellLines.forEach((lines, index) => {
				const centered =
					(reportType === "kehadiran" && [0, 4, 5, 6, 7].includes(index)) ||
					(reportType === "lembur" && [0, 3, 4, 5, 6].includes(index));
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
			doc.text(`Total ${filteredRows.length} data`, margin, pageHeight - 8);
			doc.text(`Halaman ${page} dari ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
		}

		// Save PDF with period and unit info
		const periodShort = period === "bulan-pilihan" ? selectedMonth : period.replace("bulan-", "").replace("tahun-", "");
		const unitShort = unit === "Semua Unit" ? "semua" : unit.toLowerCase().replace(/\s+/g, "-");
		const fileName = `rekap-${reportType}-${periodShort}-${unitShort}-${new Date().toISOString().slice(0, 10)}.pdf`;
		doc.save(fileName);
	};

	const tableHeaders = reportType === "cuti"
		? ["No", "Pegawai", "NIP", "Unit Kerja", "Jenis", "Tanggal", "Status", "Keterangan"]
		: reportType === "lembur"
			? ["No", "Pegawai", "NIP", "Unit Kerja", "Tanggal", "Jam Rencana", "Durasi", "Status", "Keterangan"]
			: ["No", "Nama Pegawai", "NIP", "Unit Kerja", "Hadir", "Terlambat", "Alpha", "Izin/Sakit", "Dinas", "Cuti", "Total"];

	const renderRowCells = (row, index) => {
		const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;

		if (reportType === "cuti") {
			return (
				<>
					<td>{rowNumber}</td>
					<td><div className="report-person"><span>{getInitials(row.name)}</span><strong>{row.name}</strong></div></td>
					<td>{row.nip}</td>
					<td>{row.unit}</td>
					<td>{row.category}</td>
					<td>{row.date}</td>
					<td><span className="report-status">{row.status}</span></td>
					<td>{row.detail}</td>
				</>
			);
		}

		if (reportType === "lembur") {
			return (
				<>
					<td>{rowNumber}</td>
					<td><div className="report-person"><span>{getInitials(row.name)}</span><strong>{row.name}</strong></div></td>
					<td>{row.nip}</td>
					<td>{row.unit}</td>
					<td>{row.date}</td>
					<td>{row.timeRange}</td>
					<td>{row.duration}</td>
					<td><span className="report-status">{row.status}</span></td>
					<td>{row.detail}</td>
				</>
			);
		}

		return (
			<>
				<td>{rowNumber}</td>
				<td><div className="report-person"><span>{getInitials(row.name)}</span><strong>{row.name}</strong></div></td>
				<td>{row.nip}</td>
				<td>{row.unit}</td>
				<td><span className="report-pill hadir">{row.hadir}</span></td>
				<td><span className="report-pill terlambat">{row.terlambat}</span></td>
				<td><span className="report-pill alpha">{row.alpha}</span></td>
				<td><span className="report-pill izin">{row.izin}</span></td>
				<td><span className="report-pill dinas">{row.dinas}</span></td>
				<td><span className="report-pill cuti">{row.cuti}</span></td>
				<td><span className="report-pill total">{row.total}</span></td>
			</>
		);
	};

	return (
		<AdminLayout>
			<div className="report-page">
				<div className="page-heading report-heading">
					<div>
						<span className="page-breadcrumb">Universitas Tadulako / Laporan / Rekap & Ekspor</span>
						<h2>Rekap & Ekspor</h2>
						<p>Rekapitulasi kehadiran dan pengajuan pegawai berdasarkan periode yang dipilih.</p>
					</div>
				</div>

				<section className="report-toolbar">
					<label className="report-filter report-search-filter">
						<span>Pencarian</span>
						<div className="report-search-box">
							<span>Cari</span>
							<input
								type="text"
								placeholder="Nama, NIP, unit, status..."
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</div>
					</label>
					<label className="report-filter"><span>Jenis Laporan</span><select value={reportType} onChange={(event) => setReportType(event.target.value)}><option value="kehadiran">Kehadiran</option><option value="cuti">Cuti & Izin</option><option value="lembur">Lembur</option></select></label>
					<label className="report-filter"><span>Periode Laporan</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="bulan-ini">Bulan Ini</option><option value="bulan-lalu">Bulan Lalu</option><option value="bulan-pilihan">Pilih Bulan</option><option value="tahun-ini">Tahun Ini</option></select></label>
					{period === "bulan-pilihan" && <label className="report-filter"><span>Bulan yang Diekspor</span><input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label>}
					<label className="report-filter"><span>Unit Kerja</span><select value={unit} onChange={(event) => setUnit(event.target.value)}>{units.map((item) => <option key={item}>{item}</option>)}</select></label>
					<button className="report-show-button" type="button" onClick={fetchReports} disabled={loading}>
						{loading ? "Memuat..." : "Tampilkan"}
					</button>
					<button className="primary-button report-pdf-button" type="button" onClick={downloadPdf} disabled={loading}>
						Ekspor PDF
					</button>
				</section>

				<section className="report-summary-grid">
					{reportSummary.map((item) => (
						<div className={`report-summary-card ${item.tone}`} key={item.label}>
							<span>{item.label}</span>
							<strong>{item.value}</strong>
							<small>{item.detail}</small>
						</div>
					))}
				</section>

				<section className="data-panel report-panel">
					<div className="report-panel-heading">
						<div>
							<span className="report-panel-icon">{reportType === "kehadiran" ? "RK" : reportType === "cuti" ? "CI" : "LB"}</span>
							<div>
								<h3>{reportType === "kehadiran" ? "Rekap Kehadiran Pegawai" : reportType === "cuti" ? "Rekap Cuti & Izin" : "Rekap Lembur Pegawai"}</h3>
								<p>Periode: {getPeriodLabel()} - Unit Kerja: {unit} - Jumlah Data: {filteredRows.length}</p>
							</div>
						</div>
						<span className="report-total-badge">{filteredRows.length} data</span>
					</div>
					{loading && <div className="empty-state">Memuat laporan...</div>}
					{!loading && error && <div className="empty-state"><p>{error}</p><button className="secondary-button" onClick={fetchReports}>Coba Lagi</button></div>}
					{!loading && !error && (
						<div className="employee-table-wrapper">
							<table className="employee-table report-table">
								<thead><tr>{tableHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead>
								<tbody>{pagedRows.map((row, index) => <tr key={row.id}>{renderRowCells(row, index)}</tr>)}</tbody>
							</table>
							{filteredRows.length === 0 && <div className="empty-state">Tidak ada data pada filter ini.</div>}
						</div>
					)}
					{!loading && !error && filteredRows.length > 0 && (
						<div className="report-pagination">
							<span>Menampilkan {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} dari {filteredRows.length} data</span>
							<div>
								<button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>{"<"}</button>
								{Array.from({ length: totalPages }, (_, index) => index + 1)
									.filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
									.map((page, index, pages) => (
										<span key={page}>
											{index > 0 && page - pages[index - 1] > 1 && <b>...</b>}
											<button
												type="button"
												className={currentPage === page ? "active" : ""}
												onClick={() => setCurrentPage(page)}
											>
												{page}
											</button>
										</span>
									))}
								<button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>{">"}</button>
							</div>
						</div>
					)}
				</section>
			</div>
		</AdminLayout>
	);
}

export default LaporanKehadiran;