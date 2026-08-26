-- =====================================================================
-- SI-PRESENSI UNTAD — Skema Database (PostgreSQL 16)
-- Stack: Laravel 13 + PostgreSQL + pgvector (+ opsional PostGIS)
-- Zona waktu aplikasi: Asia/Makassar (WITA)
-- Konvensi: snake_case, BIGSERIAL PK, TIMESTAMPTZ, soft delete (deleted_at) bila relevan
-- =====================================================================

-- ---------- EKSTENSI ----------
-- CREATE EXTENSION IF NOT EXISTS postgis;   -- opsional: untuk geofencing presisi

-- =====================================================================
-- 1. TIPE ENUM
-- =====================================================================
-- Satu enum untuk SELURUH tingkatan pohon organisasi (universitas -> ... -> ruangan).
-- Tipe menandai "ini node apa", sementara kedalaman ditentukan oleh parent_id.
CREATE TYPE work_unit_type      AS ENUM (
    'universitas','rektorat','fakultas','pascasarjana','biro','lembaga','upt','rumah_sakit',
    'jurusan','program_studi','bagian','sub_bagian','laboratorium','instalasi','ruangan','koordinator','lainnya'
);
CREATE TYPE attendance_mode         AS ENUM ('reguler','shift');
CREATE TYPE employment_status    AS ENUM ('pns','pppk','non_asn');
CREATE TYPE employee_type         AS ENUM ('dosen','tenaga_kependidikan');
CREATE TYPE work_hour_category    AS ENUM ('dosen','dosen_tugas_tambahan','tenaga_kependidikan');
CREATE TYPE gender         AS ENUM ('L','P');
CREATE TYPE attendance_type         AS ENUM ('wfo','wfh','shift','dinas_luar');
CREATE TYPE attendance_status       AS ENUM ('hadir','terlambat','pulang_cepat','tidak_lengkap','alpha','libur','cuti','izin','sakit','dinas');
CREATE TYPE punch_type           AS ENUM ('masuk','keluar');
CREATE TYPE request_category    AS ENUM ('cuti','izin','sakit','dinas_luar');
CREATE TYPE request_status      AS ENUM ('draft','diajukan','diproses','disetujui','ditolak','dibatalkan');
CREATE TYPE approval_status       AS ENUM ('menunggu','disetujui','ditolak','dilewati');
CREATE TYPE doctor_letter_type    AS ENUM ('dokter_biasa','tim_penguji_kesehatan');
CREATE TYPE holiday_type      AS ENUM ('nasional','cuti_bersama','khusus_kampus');
CREATE TYPE wfh_status            AS ENUM ('diajukan','disetujui','ditolak','dibatalkan');
CREATE TYPE overtime_status         AS ENUM ('diajukan','disetujui','ditolak','selesai','dibatalkan');
-- Integrasi eksternal
CREATE TYPE role_source           AS ENUM ('manual','siga8');                       -- asal pemberian peran
CREATE TYPE sync_status        AS ENUM ('tertunda','terkirim','gagal','dihapus'); -- status push ke Google Calendar
CREATE TYPE calendar_target       AS ENUM ('cuti','libur','keduanya');             -- jenis event yang didorong ke kalender
CREATE TYPE calendar_action         AS ENUM ('buat','perbarui','hapus');             -- operasi pada event kalender

-- =====================================================================
-- 2. ORGANISASI: UNIT KERJA (POHON REKURSIF TUNGGAL), LOKASI, JABATAN
-- =====================================================================
-- Seluruh struktur (Fakultas, Jurusan, Prodi, Biro, Bagian, Sub-bagian,
-- UPT, Lembaga, RS, Instalasi, Ruangan) dimodelkan pada SATU tabel
-- `unit_kerja` yang merujuk dirinya sendiri via parent_id.
--   parent_id = NULL  -> akar (Universitas Tadulako)
--   parent_id = X     -> anak dari unit X (kedalaman bebas)

CREATE TABLE work_unit (
    id              BIGSERIAL PRIMARY KEY,
    parent_id       BIGINT REFERENCES work_unit(id) ON DELETE SET NULL, -- induk; NULL = akar (Universitas)
    code            VARCHAR(30)  NOT NULL UNIQUE,
    name            VARCHAR(150) NOT NULL,
    type           work_unit_type NOT NULL,                   -- fakultas/jurusan/bagian/instalasi/dst
    attendance_mode   attendance_mode,                               -- reguler vs shift; NULL = WARISI dari induk
    wfh_allowed        BOOLEAN NOT NULL DEFAULT FALSE,              -- apakah unit mengizinkan WFH
    max_wfh_per_month SMALLINT,                                 -- kuota WFH (NULL = tak dibatasi)
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_work_unit_parent ON work_unit(parent_id);
COMMENT ON COLUMN work_unit.attendance_mode IS 'reguler (jam kerja kategori) atau shift (roster). NULL = warisi dari induk; lihat fungsi mode_presensi_efektif()';

-- Mode presensi efektif: telusuri ke atas sampai menemukan node yang set eksplisit.
-- Contoh: set "shift" sekali pada RS Pendidikan -> seluruh instalasi/ruangan di bawahnya ikut shift.
CREATE OR REPLACE FUNCTION effective_attendance_mode(p_unit_id BIGINT)
RETURNS attendance_mode LANGUAGE sql STABLE AS $$
    WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, attendance_mode
        FROM work_unit WHERE id = p_unit_id
        UNION ALL
        SELECT u.id, u.parent_id, u.attendance_mode
        FROM work_unit u JOIN ancestors n ON u.id = n.parent_id
        WHERE n.attendance_mode IS NULL           -- berhenti naik begitu ketemu mode eksplisit
    )
    SELECT COALESCE(
        (SELECT attendance_mode FROM ancestors WHERE attendance_mode IS NOT NULL LIMIT 1),
        'reguler'::attendance_mode
    );
$$;

-- View bantu: jalur (breadcrumb), kedalaman (level), & jejak leluhur tiap unit.
-- Memudahkan tampilan pohon, laporan per fakultas, dan cek "unit X di bawah Y?".
CREATE VIEW v_work_unit AS
WITH RECURSIVE tree AS (
    SELECT id, parent_id, code, name, type, 1 AS level,
           name::text AS path, ARRAY[id] AS ancestor_ids
    FROM work_unit WHERE parent_id IS NULL
    UNION ALL
    SELECT u.id, u.parent_id, u.code, u.name, u.type, p.level + 1,
           p.path || ' / ' || u.name, p.ancestor_ids || u.id
    FROM work_unit u JOIN tree p ON u.parent_id = p.id
)
SELECT * FROM tree;

CREATE TABLE work_location (
    id              BIGSERIAL PRIMARY KEY,
    work_unit_id   BIGINT NOT NULL REFERENCES work_unit(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,           -- mis. "Gedung Utama FATEK"
    address          TEXT,
    latitude        DECIMAL(10,7) NOT NULL,          -- titik pusat geofence
    longitude       DECIMAL(10,7) NOT NULL,
    radius_meters    INTEGER NOT NULL DEFAULT 100 CHECK (radius_meters > 0), -- batas radius presensi
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE work_location IS 'Satu unit kerja dapat memiliki banyak titik lokasi presensi (geofence)';

CREATE TABLE structural_position (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,           -- Rektor, Dekan, Kajur, Kepala UPT, dll.
    level           SMALLINT,                        -- tingkat eselon/struktur (informasional)
    description      TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE structural_position IS 'Jabatan tambahan; dosen dengan jabatan ini = kategori dosen_tugas_tambahan (jam kerja 4 jam)';

-- =====================================================================
-- 3. PEGAWAI & BIOMETRIK
-- =====================================================================

CREATE TABLE employee (
    id                  BIGSERIAL PRIMARY KEY,
    nip                 VARCHAR(30) UNIQUE,          -- NIP (PNS/PPPK) bisa NULL untuk Non-ASN
    nik                 VARCHAR(20) UNIQUE,
    name                VARCHAR(150) NOT NULL,
    email               VARCHAR(150) UNIQUE,
    phone               VARCHAR(20),
    gender       gender,
    employment_status  employment_status NOT NULL, -- pns / pppk / non_asn
    employee_type       employee_type NOT NULL,      -- dosen / tenaga_kependidikan
    work_unit_id       BIGINT NOT NULL REFERENCES work_unit(id), -- node TERDALAM tempat pegawai bertugas
    structural_position_id BIGINT REFERENCES structural_position(id), -- non-NULL pada dosen = tugas tambahan
    tmt                 DATE NOT NULL,               -- Tanggal Mulai Tugas (dasar hitung masa kerja)
    grade            VARCHAR(20),
    rank             VARCHAR(50),
    profile_photo         VARCHAR(255),
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);
CREATE INDEX idx_employee_unit       ON employee(work_unit_id);
COMMENT ON COLUMN employee.work_unit_id IS 'Unit terdalam pegawai; gunakan v_unit_kerja.jejak untuk rekap per fakultas/biro';
COMMENT ON COLUMN employee.tmt IS 'Dasar perhitungan masa kerja untuk syarat cuti (1 thn cuti tahunan, 5 thn cuti besar/CLTN)';

-- Kategori jam kerja diturunkan via fungsi (bukan kolom statis) agar selalu konsisten
CREATE OR REPLACE FUNCTION employee_work_hour_category(p_employee_id BIGINT)
RETURNS work_hour_category LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN p.employee_type = 'tenaga_kependidikan' THEN 'tenaga_kependidikan'::work_hour_category
        WHEN p.employee_type = 'dosen' AND p.structural_position_id IS NOT NULL THEN 'dosen_tugas_tambahan'::work_hour_category
        ELSE 'dosen'::work_hour_category
    END
    FROM employee p WHERE p.id = p_employee_id;
$$;


-- =====================================================================
-- 4. AUTENTIKASI (SSO via SIGA8) & RBAC (kompatibel spatie/laravel-permission)
-- =====================================================================
-- Login didelegasikan ke web service SIGA8 (siga8.untad.ac.id). Aplikasi presensi
-- TIDAK menyimpan password; ia mencocokkan identitas & peran dari respons SIGA8.
-- Token bearer SIGA8 disimpan di sesi server (terenkripsi), bukan di basis data.

CREATE TABLE users (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id          BIGINT UNIQUE REFERENCES employee(id) ON DELETE SET NULL, -- NULL = admin sistem murni
    -- Identitas dari SIGA8
    siga8_user_id       VARCHAR(40) UNIQUE,            -- ULID user SIGA8 (mis. 01k727gqhk98rjyb6b22k9w6rt)
    username            VARCHAR(100) NOT NULL UNIQUE,  -- username SIGA8 (mis. NIP/NIK)
    full_name           VARCHAR(150),                  -- full_name dari SIGA8
    email               VARCHAR(150) UNIQUE,           -- opsional (SIGA8 tak selalu mengirim)
    level               SMALLINT,                      -- level user dari SIGA8
    -- snapshot konteks fakultas/prodi dari SIGA8 (info & scoping)
    siga8_faculty_id    VARCHAR(40),                   -- faculty_id (ULID) dari SIGA8
    faculty_code        VARCHAR(20),                   -- faculty_code (mis. "F")
    faculty_name        VARCHAR(150),                  -- faculty_name (mis. "Teknik Informatika")
    study_programs_code VARCHAR(30),                   -- study_programs_code (mis. "F551")
    password            VARCHAR(255),                  -- opsional/legacy; NULL bila murni SSO SIGA8
    email_verified_at   TIMESTAMPTZ,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_siga8 ON users(siga8_user_id);
COMMENT ON COLUMN users.siga8_user_id IS 'Kunci tautan ke SIGA8; diisi/diperbarui saat login SSO';

CREATE TABLE roles (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(80) NOT NULL UNIQUE,     -- super_admin, admin_kepegawaian, admin_unit, pimpinan, pegawai
    description      VARCHAR(255)
);

CREATE TABLE permissions (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE role_user (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    work_unit_id   BIGINT REFERENCES work_unit(id) ON DELETE CASCADE, -- cakupan peran per unit (NULL = global)
    source          role_source NOT NULL DEFAULT 'manual',              -- 'siga8' = hasil sinkron login SIGA8
    siga8_role_id   VARCHAR(40)                                         -- ULID role SIGA8 pemicu (bila sumber='siga8')
);
-- Cegah duplikasi; NULL unit dianggap "global" (sentinel 0) agar unik
CREATE UNIQUE INDEX uq_role_user ON role_user (user_id, role_id, COALESCE(work_unit_id, 0));

CREATE TABLE permission_role (
    permission_id   BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    role_id         BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (permission_id, role_id)
);

-- Pemetaan peran SIGA8 -> peran presensi (INTI pencocokan saat login SSO).
-- Saat login, untuk SETIAP roles[].id dari respons SIGA8, cari barisnya di sini,
-- lalu tetapkan/segarkan role_user (sumber='siga8', siga8_role_id terisi).
CREATE TABLE siga8_role_mapping (
    id              BIGSERIAL PRIMARY KEY,
    siga8_role_id   VARCHAR(40) NOT NULL UNIQUE,       -- roles[].id dari SIGA8 (ULID)
    siga8_role_name VARCHAR(100),                      -- roles[].name (mis. BAK, Pokja BAK, Help Desk) - referensi
    role_id         BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE, -- peran presensi tujuan
    work_unit_id   BIGINT REFERENCES work_unit(id) ON DELETE SET NULL,    -- opsional: paksa cakupan unit tertentu
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    description      VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE siga8_role_mapping IS 'Jembatan SSO: roles[].id SIGA8 dicocokkan ke roles presensi. Satu role SIGA8 -> satu role presensi; satu role presensi boleh menerima banyak role SIGA8.';

-- =====================================================================
-- 5. PENGATURAN JAM KERJA & SHIFT
-- =====================================================================

CREATE TABLE work_hour_setting (
    id              BIGSERIAL PRIMARY KEY,
    work_unit_id   BIGINT REFERENCES work_unit(id) ON DELETE CASCADE, -- NULL = aturan global default
    category        work_hour_category NOT NULL,
    min_minutes   INTEGER NOT NULL,                -- dosen=120, dosen_tt=240, tendik=480
    standard_check_in TIME,                          -- mis. 07:30
    late_threshold TIME,                            -- mis. 08:00 (lewat ini = terlambat)
    standard_check_out TIME,                         -- mis. 16:00
    work_days      SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}', -- ISO: 1=Senin..7=Minggu
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (work_unit_id, category)
);
COMMENT ON TABLE work_hour_setting IS 'Aturan jam kerja mode reguler; global per kategori + opsional override per unit';

CREATE TABLE shift (
    id              BIGSERIAL PRIMARY KEY,
    work_unit_id   BIGINT NOT NULL REFERENCES work_unit(id) ON DELETE CASCADE,
    name            VARCHAR(60) NOT NULL,            -- Pagi / Siang / Malam
    start_time       TIME NOT NULL,
    end_time     TIME NOT NULL,
    is_overnight  BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE bila shift melewati tengah malam (mis. malam)
    tolerance_minutes SMALLINT NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (work_unit_id, name)
);

CREATE TABLE shift_schedule (
    id              BIGSERIAL PRIMARY KEY,
    employee_id      BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    shift_id        BIGINT NOT NULL REFERENCES shift(id),
    date         DATE NOT NULL,
    description      VARCHAR(150),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, date, shift_id)
);
CREATE INDEX idx_shift_schedule_date ON shift_schedule(date);

CREATE TABLE holiday (
    id              BIGSERIAL PRIMARY KEY,
    date         DATE NOT NULL UNIQUE,
    name            VARCHAR(150) NOT NULL,
    type           holiday_type NOT NULL DEFAULT 'nasional',
    legal_basis     VARCHAR(150),                    -- mis. nomor Keppres untuk cuti bersama
    -- sinkronisasi Google Calendar (dipublikasikan ke kalender libur)
    gcal_event_id   VARCHAR(1024),                   -- id event Google Calendar (NULL = belum disinkron)
    gcal_status     sync_status NOT NULL DEFAULT 'tertunda',
    gcal_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE holiday IS 'Libur nasional, cuti bersama (Keppres), dan libur khusus kampus; dipakai untuk hitung hari kerja';

-- =====================================================================
-- 6. PRESENSI
-- =====================================================================

CREATE TABLE attendance (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id          BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    date             DATE NOT NULL,
    type                attendance_type NOT NULL DEFAULT 'wfo',
    shift_id            BIGINT REFERENCES shift(id),     -- diisi bila unit mode shift
    work_location_id     BIGINT REFERENCES work_location(id), -- lokasi check-in (NULL untuk WFH)
    check_in           TIMESTAMPTZ,
    check_out          TIMESTAMPTZ,
    duration_minutes        INTEGER,                         -- dihitung dari masuk-keluar
    status              attendance_status NOT NULL DEFAULT 'tidak_lengkap',
    description          TEXT,
    -- Penghadiran manual / koreksi oleh Verifikator (tanpa face/geo). Lihat PRD 5.17.
    is_manual       BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = dihadirkan/dikoreksi manual
    verified_by   BIGINT REFERENCES users(id),     -- akun verifikator pelaku
    verified_at    TIMESTAMPTZ,
    correction_reason      TEXT,                            -- wajib diisi saat dibuat_manual
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, date, shift_id),             -- 1 record per pegawai per hari per shift
    CHECK (NOT is_manual OR (verified_by IS NOT NULL AND correction_reason IS NOT NULL)) -- audit wajib
);
CREATE INDEX idx_attendance_manual      ON attendance(is_manual) WHERE is_manual;
CREATE INDEX idx_attendance_date     ON attendance(date);

CREATE TABLE attendance_log (
    id                  BIGSERIAL PRIMARY KEY,
    attendance_id         BIGINT NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    employee_id          BIGINT NOT NULL REFERENCES employee(id),
    type               punch_type NOT NULL,            -- masuk / keluar
    recorded_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    latitude            DECIMAL(10,7),
    longitude           DECIMAL(10,7),
    distance_meters         INTEGER,                         -- jarak ke pusat lokasi unit
    within_radius        BOOLEAN,                         -- hasil validasi geofence (NULL utk WFH)
    proof_photo          VARCHAR(255) NOT NULL,
    similarity_score      REAL,                            -- cosine similarity vs data_wajah
    face_matched         BOOLEAN NOT NULL DEFAULT FALSE,  -- skor >= ambang
    liveness_passed      BOOLEAN,                         -- hasil anti-spoofing
    device_info         VARCHAR(255),
    ip_address          VARCHAR(45),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attendance_log_attendance ON attendance_log(attendance_id);
COMMENT ON TABLE attendance_log IS 'Sumber kebenaran tiap kejadian punch (masuk/keluar) lengkap bukti wajah & lokasi; presensi adalah ringkasan harian';

-- Pengajuan WFH (berbasis persetujuan; presensi pada tanggal disetujui melewati syarat radius)
CREATE TABLE wfh_request (
    id              BIGSERIAL PRIMARY KEY,
    employee_id      BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    start_date   DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days     SMALLINT NOT NULL,
    reason          TEXT NOT NULL,
    status          wfh_status NOT NULL DEFAULT 'diajukan',
    approved_by  BIGINT REFERENCES employee(id),
    approved_at  TIMESTAMPTZ,
    note         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

-- =====================================================================
-- 7. IZIN, SAKIT, CUTI (terpadu via jenis_cuti + pengajuan)
-- =====================================================================

CREATE TABLE leave_type (
    id                      BIGSERIAL PRIMARY KEY,
    code                    VARCHAR(30) NOT NULL UNIQUE, -- cuti_tahunan, cuti_besar, cuti_sakit, dst.
    name                    VARCHAR(100) NOT NULL,
    category                request_category NOT NULL, -- cuti / izin / sakit / dinas_luar
    for_pns               BOOLEAN NOT NULL DEFAULT TRUE,
    for_pppk              BOOLEAN NOT NULL DEFAULT FALSE,
    for_non_asn           BOOLEAN NOT NULL DEFAULT FALSE,
    min_service_months    SMALLINT,                    -- 12 (tahunan), 60 (besar/CLTN)
    max_days               SMALLINT,                    -- maks per pengajuan/tahun (NULL=tak dibatasi)
    max_accumulated_days     SMALLINT,                    -- 18 untuk cuti tahunan
    expires_after_years     SMALLINT,                    -- 2 untuk cuti tahunan
    reduces_annual_leave BOOLEAN NOT NULL DEFAULT FALSE,
    requires_attachment          BOOLEAN NOT NULL DEFAULT FALSE,
    requires_doctor_letter      BOOLEAN NOT NULL DEFAULT FALSE,
    is_paid                BOOLEAN NOT NULL DEFAULT TRUE,  -- CLTN = FALSE
    counts_as_service     BOOLEAN NOT NULL DEFAULT TRUE,  -- CLTN = FALSE
    description              TEXT,
    is_active                BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE leave_type IS 'Master + parameter aturan untuk 7 cuti PNS, 4 cuti PPPK, serta izin/sakit/dinas';

CREATE TABLE request (
    id                  BIGSERIAL PRIMARY KEY,
    number               VARCHAR(50) UNIQUE,             -- nomor surat/pengajuan
    employee_id          BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    leave_type_id       BIGINT NOT NULL REFERENCES leave_type(id),
    start_date       DATE NOT NULL,
    end_date     DATE NOT NULL,
    total_days         SMALLINT NOT NULL,             -- hari kerja efektif (kecuali libur/akhir pekan)
    start_time           TIME,                          -- untuk izin per jam
    end_time         TIME,
    reason              TEXT NOT NULL,
    address_during_leave  TEXT,
    -- field khusus per kategori:
    child_number             SMALLINT,                      -- cuti melahirkan (1..3)
    doctor_letter_type  doctor_letter_type,            -- cuti sakit (>14 hr = tim_penguji)
    doctor_letter_number  VARCHAR(100),
    doctor_facility_name  VARCHAR(150),
    sub_category        VARCHAR(80),                   -- CAP: menikah/keluarga_sakit/keluarga_meninggal/bencana
    status              request_status NOT NULL DEFAULT 'draft',
    -- sinkronisasi Google Calendar (event dibuat saat status='disetujui'; dihapus bila dibatalkan)
    gcal_event_id       VARCHAR(1024),
    gcal_status         sync_status NOT NULL DEFAULT 'tertunda',
    gcal_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CHECK (end_date >= start_date)
);
CREATE INDEX idx_request_employee ON request(employee_id);
CREATE INDEX idx_request_status  ON request(status);

-- Konfigurasi alur persetujuan dinamis per jenis pengajuan
CREATE TABLE approval_flow (
    id              BIGSERIAL PRIMARY KEY,
    leave_type_id   BIGINT REFERENCES leave_type(id) ON DELETE CASCADE, -- NULL = alur default semua jenis
    sequence          SMALLINT NOT NULL,                 -- langkah ke-1, 2, 3...
    approver_role  VARCHAR(80) NOT NULL,              -- mis. atasan_langsung, admin_kepegawaian
    required           BOOLEAN NOT NULL DEFAULT TRUE,
    description      VARCHAR(150),
    UNIQUE (leave_type_id, sequence)
);

-- Jejak langkah persetujuan tiap pengajuan
CREATE TABLE approval_log (
    id              BIGSERIAL PRIMARY KEY,
    request_id    BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
    sequence          SMALLINT NOT NULL,
    approver_role  VARCHAR(80) NOT NULL,
    approver_id    BIGINT REFERENCES employee(id),     -- aktor yang memproses
    status          approval_status NOT NULL DEFAULT 'menunggu',
    note         TEXT,
    recorded_at           TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_approval_log_request ON approval_log(request_id);

-- Saldo cuti per pegawai per tahun per jenis
CREATE TABLE leave_balance (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id          BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    leave_type_id       BIGINT NOT NULL REFERENCES leave_type(id),
    year               SMALLINT NOT NULL,
    entitlement                 SMALLINT NOT NULL DEFAULT 0,   -- hak tahun berjalan (mis. 12)
    previous_year_balance    SMALLINT NOT NULL DEFAULT 0,   -- carry-over (cap 18 utk tahunan)
    used            SMALLINT NOT NULL DEFAULT 0,
    remaining                SMALLINT GENERATED ALWAYS AS (entitlement + previous_year_balance - used) STORED,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, leave_type_id, year)
);
COMMENT ON TABLE leave_balance IS 'Mengelola akumulasi (cap 18 hari) & dasar penggugurannya untuk cuti tahunan';

-- =====================================================================
-- 8. LEMBUR
-- =====================================================================

CREATE TABLE overtime_request (
    id                  BIGSERIAL PRIMARY KEY,
    employee_id          BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    attendance_id         BIGINT REFERENCES attendance(id), -- ditautkan saat realisasi dari presensi
    date             DATE NOT NULL,
    planned_start_time   TIME NOT NULL,
    planned_end_time TIME NOT NULL,
    work_description TEXT NOT NULL,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    duration_minutes        INTEGER,                        -- realisasi
    status              overtime_status NOT NULL DEFAULT 'diajukan',
    approved_by      BIGINT REFERENCES employee(id),
    approved_at      TIMESTAMPTZ,
    note             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_overtime_request_employee_date ON overtime_request(employee_id, date);

-- =====================================================================
-- 9. PENDUKUNG: LAMPIRAN, NOTIFIKASI, SETTING, AUDIT, PERANGKAT
-- =====================================================================

-- Lampiran polimorfik (lampiran surat dokter, surat tugas, dll.)
CREATE TABLE attachment (
    id              BIGSERIAL PRIMARY KEY,
    attachable_type VARCHAR(100) NOT NULL,             -- mis. 'App\\Models\\Pengajuan'
    attachable_id   BIGINT NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    path            VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100),
    size_bytes     BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachment_morph ON attachment(attachable_type, attachable_id);

CREATE TABLE notification (
    id              BIGSERIAL PRIMARY KEY,
    employee_id      BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,
    message           TEXT NOT NULL,
    type            VARCHAR(50),                        -- pengajuan_baru, disetujui, ditolak, pengingat
    target_url      VARCHAR(255),
    read_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_employee ON notification(employee_id, read_at);

CREATE TABLE app_setting (
    id              BIGSERIAL PRIMARY KEY,
    key           VARCHAR(100) NOT NULL UNIQUE,       -- mis. ambang_similarity, zona_waktu
    value           TEXT,
    data_type       VARCHAR(30) DEFAULT 'string',
    description      VARCHAR(255),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action            VARCHAR(100) NOT NULL,
    subject_type     VARCHAR(100),
    subject_id       BIGINT,
    detail          JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);

CREATE TABLE device (
    id              BIGSERIAL PRIMARY KEY,
    employee_id      BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    device_id       VARCHAR(255) NOT NULL,              -- identifier perangkat terdaftar
    device_name  VARCHAR(150),
    is_trusted   BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (employee_id, device_id)
);

-- =====================================================================
-- 9b. INTEGRASI GOOGLE CALENDAR (cuti & hari libur)
-- =====================================================================

-- Pemetaan kalender tujuan: global (unit_kerja_id NULL) atau spesifik per unit.
CREATE TABLE calendar_config (
    id                 BIGSERIAL PRIMARY KEY,
    work_unit_id      BIGINT REFERENCES work_unit(id) ON DELETE CASCADE, -- NULL = kalender global (semua unit)
    target             calendar_target NOT NULL DEFAULT 'keduanya',        -- event apa yang didorong: cuti/libur/keduanya
    google_calendar_id VARCHAR(255) NOT NULL,                              -- mis. xxxxx@group.calendar.google.com
    name               VARCHAR(150),
    timezone         VARCHAR(50) NOT NULL DEFAULT 'Asia/Makassar',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (work_unit_id, target, google_calendar_id)
);
COMMENT ON TABLE calendar_config IS 'Unit -> kalender Google untuk push event cuti & hari libur. Kredensial (service account/OAuth) dikelola di luar DB (env/secret).';

-- Antrian + jejak sinkronisasi (mendukung retry & audit). Polimorfik: pengajuan / hari_libur.
CREATE TABLE calendar_sync (
    id                 BIGSERIAL PRIMARY KEY,
    source_type        VARCHAR(40) NOT NULL,           -- 'pengajuan' | 'hari_libur'
    source_id          BIGINT NOT NULL,
    calendar_config_id BIGINT REFERENCES calendar_config(id) ON DELETE SET NULL,
    google_calendar_id VARCHAR(255),                   -- snapshot kalender tujuan saat eksekusi
    gcal_event_id      VARCHAR(1024),                  -- id event hasil (untuk perbarui/hapus)
    action               calendar_action NOT NULL,          -- buat / perbarui / hapus
    status             sync_status NOT NULL DEFAULT 'tertunda',
    attempts          SMALLINT NOT NULL DEFAULT 0,     -- jumlah percobaan (retry)
    error_message        TEXT,
    processed_at    TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_calendar_sync_source ON calendar_sync(source_type, source_id);
CREATE INDEX idx_calendar_sync_status ON calendar_sync(status);
COMMENT ON TABLE calendar_sync IS 'Worker/queue Laravel memproses baris tertunda: panggil Google Calendar API, simpan gcal_event_id, set status. Gagal -> percobaan++ untuk retry.';

-- =====================================================================
-- 10. SEED PARAMETER AWAL (contoh)
-- =====================================================================

INSERT INTO roles (name, description) VALUES
 ('super_admin','Tim UPA TIK - akses penuh'),
 ('admin_kepegawaian','Biro Umum & Keuangan - SDM'),
 ('admin_unit','Operator kepegawaian unit'),
 ('pimpinan','Atasan/penyetuju merangkap verifikator kehadiran (approval + penghadiran manual)'),
 ('employee','Pegawai biasa');

INSERT INTO work_hour_setting (work_unit_id, category, min_minutes, standard_check_in, late_threshold, standard_check_out) VALUES
 (NULL,'dosen',120,'07:30','08:00','16:00'),
 (NULL,'dosen_tugas_tambahan',240,'07:30','08:00','16:00'),
 (NULL,'tenaga_kependidikan',480,'07:30','08:00','16:00');

INSERT INTO leave_type (code,name,category,for_pns,for_pppk,min_service_months,max_days,max_accumulated_days,expires_after_years,reduces_annual_leave,requires_attachment,requires_doctor_letter,is_paid,counts_as_service,description) VALUES
 ('cuti_tahunan','Cuti Tahunan','cuti',TRUE,TRUE,12,12,18,2,FALSE,FALSE,FALSE,TRUE,TRUE,'Hak 12 hari; akumulasi maks 18; hangus jika 2 thn tak dipakai'),
 ('cuti_besar','Cuti Besar','cuti',TRUE,FALSE,60,90,NULL,NULL,FALSE,FALSE,FALSE,TRUE,TRUE,'Maks 3 bulan; menghapus entitlement cuti tahunan year yang sama; pengecualian keagamaan'),
 ('cuti_sakit','Cuti Sakit','sakit',TRUE,TRUE,NULL,NULL,NULL,NULL,FALSE,TRUE,TRUE,TRUE,TRUE,'1-14 hr surat dokter biasa; >14 hr s.d 1,5 thn tim penguji; PPPK maks 30 hari'),
 ('cuti_melahirkan','Cuti Melahirkan','cuti',TRUE,TRUE,NULL,90,NULL,NULL,FALSE,TRUE,TRUE,TRUE,TRUE,'Anak ke-1..3, maks 3 bulan; anak ke-4+ → CLTN'),
 ('cuti_alasan_penting','Cuti Alasan Penting (CAP)','cuti',TRUE,FALSE,NULL,30,NULL,NULL,FALSE,TRUE,FALSE,TRUE,TRUE,'Maks 1 bulan; nikah/keluarga sakit-meninggal/bencana'),
 ('cuti_bersama','Cuti Bersama','cuti',TRUE,TRUE,NULL,NULL,NULL,NULL,FALSE,FALSE,FALSE,TRUE,TRUE,'Sesuai Keppres; tidak mengurangi cuti tahunan'),
 ('cltn','Cuti di Luar Tanggungan Negara','cuti',TRUE,FALSE,60,1095,NULL,NULL,FALSE,TRUE,FALSE,FALSE,FALSE,'Maks 3 thn (+1); tanpa gaji; masa kerja tak dihitung; jabatan lepas'),
 ('izin','Izin','izin',TRUE,TRUE,NULL,NULL,NULL,NULL,FALSE,FALSE,FALSE,TRUE,TRUE,'Izin sebagian/penuh hari'),
 ('dinas_luar','Dinas Luar','dinas_luar',TRUE,TRUE,NULL,NULL,NULL,NULL,FALSE,TRUE,FALSE,TRUE,TRUE,'Presensi di luar radius dengan surat tugas');

INSERT INTO app_setting (key,value,data_type,description) VALUES
 ('timezone','Asia/Makassar','string','Zona recorded_at aplikasi (WITA)'),
 ('ambang_similarity','0.45','float','Ambang cosine similarity face recognition'),
 ('liveness_wajib','true','boolean','Wajibkan anti-spoofing saat attendance'),
 ('siga8_login_url','https://siga8.untad.ac.id/api/login','string','Endpoint web service login SIGA8'),
 ('siga8_sso_aktif','true','boolean','Aktifkan autentikasi via SIGA8'),
 ('gcal_aktif','true','boolean','Aktifkan sinkronisasi Google Calendar'),
 ('gcal_mode','service_account','string','Mode kredensial Google: service_account / oauth'),
 ('gcal_retry_maks','5','int','Batas attempts ulang sinkronisasi kalender');

-- Contoh pemetaan peran SIGA8 -> peran presensi (sesuaikan dengan kebijakan riil).
-- ID di bawah diambil dari contoh respons login SIGA8.
INSERT INTO siga8_role_mapping (siga8_role_id, siga8_role_name, role_id, description) VALUES
 ('01kafz9y3v1w55pyfs719pe97d','BAK',       (SELECT id FROM roles WHERE name='admin_kepegawaian'), 'Contoh: BAK -> admin kepegawaian'),
 ('01k723k4csfpstqyshgcnpym4k','Pokja BAK', (SELECT id FROM roles WHERE name='employee'),            'Contoh: Pokja BAK -> employee'),
 ('01k7273msxcsn6ycwmahrgqswn','Help Desk', (SELECT id FROM roles WHERE name='super_admin'),        'Contoh: Help Desk (UPA TIK) -> super admin');

-- Contoh kalender Google global untuk cuti & libur (ganti dengan calendar_id riil).
INSERT INTO calendar_config (work_unit_id, target, google_calendar_id, name) VALUES
 (NULL,'keduanya','ganti-dengan-id@group.calendar.google.com','Kalender Presensi Untad (Cuti & Libur)');
