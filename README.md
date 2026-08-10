# Product Requirements Document (PRD)
# Sistem Informasi Presensi Pegawai — Universitas Tadulako (SI-PRESENSI UNTAD)

| | |
|---|---|
| **Nama Produk** | SI-PRESENSI UNTAD |
| **Pemilik Produk** | UPA TIK Universitas Tadulako |
| **Versi Dokumen** | 1.0 (Draft) |
| **Status** | Untuk Review |
| **Stack Target** | Backend: Laravel 13 (PHP 8.3) · Web Admin: ReactJS · Mobile: aplikasi presensi pegawai · DB: PostgreSQL 16 · Microservice Face Recognition (Python/FastAPI + GPU) |

---

## 1. Ringkasan Eksekutif

SI-PRESENSI UNTAD adalah sistem presensi kepegawaian terpusat untuk seluruh pegawai (PNS, PPPK, Non-ASN) di lingkungan Universitas Tadulako. Sistem memverifikasi kehadiran menggunakan **pengenalan wajah (face recognition)** dan **pembatasan lokasi (geofencing radius)** per unit kerja, mendukung **WFO (di kantor), WFH (di rumah), dan sistem shift**, serta mengelola seluruh siklus **izin, sakit, cuti, dan lembur** sesuai regulasi kepegawaian ASN.

Sistem terdiri dari **dua aplikasi**:
- **Aplikasi Mobile (aplikasi utama presensi)** — dipakai pegawai untuk **melakukan absen** (face recognition + geofencing), mengajukan izin/cuti, serta melihat riwayat & saldo.
- **Web Admin (ReactJS)** — konsol back-office khusus untuk **Super Admin, Admin Kepegawaian, dan Pimpinan/Verifikator** guna **manajemen pegawai, manajemen & verifikasi kehadiran, dan laporan kehadiran**.

Fitur pembeda utama:
- **Mode presensi fleksibel per unit kerja**: unit administratif memakai jam kerja reguler, sedangkan unit layanan 24 jam seperti **Rumah Sakit Pendidikan Untad** memakai sistem **shift**.
- **Aturan jam kerja berbasis kategori pegawai**: dosen (min. 2 jam), dosen dengan tugas tambahan (4 jam), tenaga kependidikan (8 jam).
- **Mesin aturan cuti** yang mengkodekan ketentuan cuti PNS (7 jenis) dan PPPK (4 jenis), termasuk akumulasi dan hangusnya saldo cuti tahunan.

---

## 2. Latar Belakang & Tujuan

### 2.1 Latar Belakang
Pencatatan kehadiran manual atau berbasis fingerprint tunggal memiliki kelemahan: rawan titip absen (buddy punching), tidak memvalidasi posisi fisik pegawai, sulit mengakomodasi WFH, dan tidak terintegrasi dengan pengelolaan cuti. Untad membutuhkan satu sistem yang menyatukan presensi, geolokasi, biometrik, dan administrasi cuti dalam satu basis data terpadu.

### 2.2 Tujuan Produk
1. Menyediakan presensi yang **akurat dan anti-titip** melalui verifikasi wajah + lokasi.
2. Mengakomodasi **keragaman pola kerja** antar unit (reguler vs shift, WFO vs WFH).
3. Menegakkan **aturan jam kerja minimal** secara otomatis per kategori pegawai.
4. Mendigitalkan **pengajuan dan persetujuan** izin/cuti/sakit/lembur dengan jejak audit.
5. Menyediakan **rekap dan laporan** kehadiran untuk dasar tunjangan kinerja/remunerasi.

### 2.3 Metrik Keberhasilan
- ≥ 95% pegawai aktif terdaftar wajahnya dan menggunakan sistem.
- Tingkat false acceptance (titip absen lolos) < 0,1%.
- Waktu rata-rata satu kali presensi (capture → verifikasi → simpan) < 5 detik.
- ≥ 90% pengajuan cuti/izin diproses melalui sistem (bukan manual).

---

## 3. Pengguna & Peran (Roles)

| Peran | Deskripsi | Platform | Hak Akses Utama |
|---|---|---|---|
| **Super Admin** | Tim UPA TIK | **Web** | Konfigurasi global, kelola semua unit & pengguna, pemetaan peran SIGA8, integrasi, audit |
| **Admin Kepegawaian** | Biro Umum & Keuangan (Bagian SDM) | **Web** | Manajemen pegawai, kehadiran, cuti & saldo, validasi akhir, laporan kehadiran universitas |
| **Pimpinan / Verifikator** | Rektor, Dekan, Kepala Biro/UPT, Kepala Bagian, Karu (RS) — atasan langsung | **Web + Mobile** | **Menyetujui/menolak** pengajuan bawahan; **memverifikasi & menghadirkan manual** pegawai yang lupa/tidak absen; verifikasi surat sakit > 14 hari; ringkasan & laporan unit |
| **Admin Unit / Operator** *(opsional)* | Operator kepegawaian di tiap fakultas/biro/UPT/RS | Web | Kelola data pegawai unitnya, lokasi & shift unit, rekap unit |
| **Pegawai** | Dosen, dosen tugas tambahan, tenaga kependidikan | **Mobile** | **Absen** (face+geofence), ajukan izin/cuti/sakit/lembur/WFH, lihat riwayat & saldo |

Catatan: peran bersifat **multi-role** dan **scoped per unit** (mis. seorang Dekan adalah `Pimpinan / Verifikator` di fakultasnya sekaligus `Pegawai` untuk presensi dirinya). **Pimpinan dan Verifikator adalah satu peran yang sama** (`pimpinan`): atasan yang menyetujui pengajuan sekaligus memverifikasi/mengoreksi kehadiran stafnya.

> **Pembagian platform.** **Web Admin (ReactJS)** difokuskan untuk peran administratif — **Super Admin, Admin Kepegawaian, dan Pimpinan/Verifikator** — yang menjalankan manajemen pegawai, manajemen & verifikasi kehadiran, dan laporan. **Aplikasi Mobile** adalah **aplikasi utama presensi** bagi pegawai sekaligus **kanal persetujuan cepat** bagi Pimpinan/Verifikator. Lihat 5.0.

> **Sumber peran**: login memakai SSO SIGA8. Peran presensi di atas **tidak** diketik manual per pengguna, melainkan **dipetakan dari peran SIGA8** (`roles[].id`) melalui tabel `pemetaan_role_siga8`. Lihat 5.15.

---

## 4. Struktur Organisasi & Unit Kerja

Pemodelan organisasi memakai **satu entitas rekursif**: **Unit Kerja**. Setiap unit merujuk induknya sendiri (`parent_id`), sehingga seluruh struktur Untad yang berlapis — dari Fakultas → Jurusan → Program Studi, hingga RS → Instalasi → Ruangan — direpresentasikan sebagai satu pohon dengan kedalaman bebas. `parent_id = NULL` menandai akar (Universitas). Pendekatan ini menghindari batas buatan antara "unit" dan "sub-unit" yang ambigu, dan memudahkan rekap kehadiran di tingkat mana pun.

### 4.1 Hierarki Konseptual
```
Universitas Tadulako (Rektorat)
├── Biro (BAKK, BUK, BPK)
│     └── Bagian → Sub-bagian
├── Fakultas (FKIP, FH, FISIP, FEB, FAPERTA, FATEK, FMIPA, FAHUT, FAPETKAN, FK, FKM)
│     ├── Bagian Tata Usaha → Sub-bagian (Akademik, Umum & Keuangan, Kemahasiswaan)
│     ├── Jurusan → Program Studi
│     └── Laboratorium
├── Pascasarjana
│     └── Program Studi (S2/S3)
├── Lembaga (LPPM, LPMPP)
├── UPT / UPA (Perpustakaan, TIK, Bahasa, Lab Terpadu, Bisnis, Kearsipan)
└── Rumah Sakit Pendidikan Untad  ← mode SHIFT
      └── Instalasi (IGD, Rawat Inap, Rawat Jalan, Laboratorium, Farmasi, dll.) → Ruangan
```

### 4.2 Daftar Unit Kerja & Contoh Sub-Unit

Baris "Sub-Unit" di bawah adalah **node anak pada tabel `unit_kerja` yang sama** (bukan tabel terpisah), terhubung ke induknya via `parent_id`.

| Unit Kerja | Jenis | Mode Presensi | Contoh Sub-Unit (node anak) |
|---|---|---|---|
| Rektorat | rektorat | reguler | Kantor Rektor, Kantor Wakil Rektor I–IV |
| Biro Akademik & Kemahasiswaan (BAKK) | biro | reguler | Bagian Akademik, Bagian Kemahasiswaan |
| Biro Umum & Keuangan (BUK) | biro | reguler | Bagian SDM, Bagian Keuangan, Bagian Umum, Bagian BMN |
| Biro Perencanaan & Kerja Sama (BPK) | biro | reguler | Bagian Perencanaan, Bagian Kerja Sama |
| Fakultas Teknik (FATEK) | fakultas | reguler | Jurusan Teknik Sipil/Elektro/Arsitektur/Informatika, Bagian TU, Laboratorium |
| Fakultas Ekonomi & Bisnis (FEB) | fakultas | reguler | Jurusan Manajemen/Akuntansi/IESP, Bagian TU |
| Fakultas Kedokteran (FK) | fakultas | reguler | Bagian TU, Program Studi Profesi Dokter, Laboratorium |
| FKIP, FISIP, FH, FAPERTA, FMIPA, FAHUT, FAPETKAN, FKM | fakultas | reguler | Jurusan/Prodi, Bagian TU, Laboratorium |
| Pascasarjana | pascasarjana | reguler | Program Studi S2/S3, Sekretariat |
| LPPM | lembaga | reguler | Pusat Penelitian, Pusat Pengabdian |
| LPMPP | lembaga | reguler | Pusat Penjaminan Mutu, Pusat Pengembangan Pembelajaran |
| UPA TIK | upt | reguler | Divisi Infrastruktur & Jaringan, Divisi Pengembangan Aplikasi, Divisi Layanan |
| UPT Perpustakaan | upt | reguler | Layanan Sirkulasi, Pengolahan, Repository |
| UPT Bahasa | upt | reguler | Layanan Tes & Pelatihan |
| **RS Pendidikan Untad** | rumah_sakit | **shift** | Instalasi Gawat Darurat, Rawat Inap, Rawat Jalan, Laboratorium, Farmasi, Radiologi |

> Daftar di atas adalah representasi yang disesuaikan dengan struktur publik Untad; daftar final wajib disinkronkan dengan SK organisasi & tata kerja (OTK) terbaru dan data SIMPEG.

### 4.3 Atribut Penting Unit Kerja
Setiap unit kerja menyimpan:
- **mode_presensi**: `reguler`, `shift`, atau **`NULL` (warisi dari induk)**. Cukup set sekali pada node atas (mis. `shift` pada RS Pendidikan), maka seluruh instalasi/ruangan di bawahnya otomatis mengikuti — tanpa pengulangan. Node anak tetap dapat menetapkan nilainya sendiri untuk meng-override. Mode efektif dihitung fungsi `mode_presensi_efektif()` yang menelusuri pohon ke atas.
- **izin_wfh** & **maks_wfh_per_bulan**: kebijakan WFH per unit (eksplisit per node).
- **Lokasi presensi (geofence)**: satu unit dapat memiliki banyak titik lokasi (mis. gedung utama dan gedung lab), masing-masing dengan koordinat pusat dan **radius (meter)**.
- Tersedia view bantu **`v_unit_kerja`** (jalur breadcrumb, kedalaman/level, jejak leluhur) untuk tampilan pohon dan rekap kehadiran per fakultas/biro.

---

## 5. Lingkup Fitur

### 5.0 Platform & Pembagian Aplikasi
Sistem dibangun sebagai dua aplikasi dengan peran berbeda namun berbagi satu backend (Laravel 13) dan satu basis data.

**A. Aplikasi Mobile — Aplikasi Utama Presensi (untuk Pegawai)**
- Fungsi inti: **melakukan absen** masuk/keluar dengan **face recognition + geofencing** dan liveness (lihat 5.4).
- Pengajuan **izin/cuti/sakit/lembur/WFH** beserta unggah lampiran.
- Lihat **riwayat kehadiran, status pengajuan, dan saldo cuti**.
- Kanal **persetujuan cepat** bagi **Pimpinan/Verifikator** (menyetujui/menolak pengajuan langsung dari ponsel).
- Login via SSO SIGA8 (lihat 5.15).

**B. Web Admin (ReactJS) — Konsol Back-Office**
Akses **dibatasi** untuk peran **Super Admin, Admin Kepegawaian, dan Pimpinan/Verifikator**. Lingkup utama:
- **Manajemen pegawai** — master data pegawai, penempatan unit, enrollment/peremajaan data wajah, perangkat.
- **Manajemen & verifikasi kehadiran** — pemantauan kehadiran harian, koreksi, dan **penghadiran manual** pegawai yang lupa/tidak absen oleh **Pimpinan/Verifikator** (lihat 5.17).
- **Laporan kehadiran** — rekap & ekspor (Excel/PDF) per unit/periode untuk dasar tunjangan kinerja (lihat 5.13).
- Bagi Super Admin: konfigurasi global, pemetaan peran SIGA8, dan integrasi (Google Calendar).
- Web Admin **tidak** ditujukan untuk pegawai biasa melakukan absen; absen dilakukan via mobile.

> Pimpinan/Verifikator memakai **kedua aplikasi**: menyetujui pengajuan secara cepat via mobile, serta memverifikasi kehadiran, melakukan penghadiran manual, dan menelaah laporan unit via web. Cakupannya dibatasi pada unit yang dipimpin melalui `role_user`.
>
> Frontend ReactJS berkomunikasi dengan backend melalui REST API (token sesi dari SSO SIGA8). Otorisasi tiap endpoint mengikuti peran hasil pemetaan `pemetaan_role_siga8`.

### 5.1 Manajemen Master Data
CRUD untuk: unit kerja (**berjenjang/rekursif** — fakultas, jurusan, bagian, instalasi, dst. dalam satu pohon), lokasi kerja (geofence), jabatan struktural, pegawai, jenis cuti, hari libur, shift, dan pengaturan jam kerja. Impor massal pegawai via CSV/Excel dan sinkronisasi dengan SIMPEG (opsional via API). *(Web Admin)*

### 5.2 Pengaturan Mode Presensi per Unit (Reguler vs Shift)
- Admin Unit/Kepegawaian menetapkan `mode_presensi` per unit kerja.
- **Mode Reguler**: kehadiran dievaluasi terhadap aturan jam kerja kategori pegawai (lihat 5.3) dan jam standar masuk/pulang unit.
- **Mode Shift**: kehadiran dievaluasi terhadap **jadwal shift** harian pegawai (lihat 5.6). Contoh penerapan: RS Pendidikan Untad dengan shift Pagi/Siang/Malam.
- Mode bersifat **menurun di pohon**: set pada satu node, seluruh keturunannya mewarisi (mis. RS Pendidikan `shift` → semua instalasi ikut). Node anak tertentu bisa **override** dengan menetapkan mode-nya sendiri (mis. mayoritas fakultas `reguler`, tetapi satu laboratorium memakai `shift`).

### 5.3 Aturan Jam Kerja per Kategori Pegawai (Mode Reguler)
Durasi kehadiran minimal per hari kerja dihitung dari selisih waktu masuk dan keluar yang terverifikasi:

| Kategori | Durasi Minimal/Hari | Keterangan |
|---|---|---|
| **Dosen** | 2 jam (120 menit) | Dosen tanpa tugas tambahan |
| **Dosen dengan Tugas Tambahan** | 4 jam (240 menit) | Dosen yang menjabat (Rektor, Wakil Rektor, Dekan, Wadek, Kajur, Kaprodi, Kepala UPT/Lembaga, dsb.) |
| **Tenaga Kependidikan** | 8 jam (480 menit) | Pegawai administratif/teknis |

Logika penentuan kategori:
- `pegawai.jenis_pegawai = dosen` **dan** memiliki `jabatan_struktural` aktif → kategori **dosen_tugas_tambahan**.
- `pegawai.jenis_pegawai = dosen` **tanpa** jabatan struktural → kategori **dosen**.
- `pegawai.jenis_pegawai = tenaga_kependidikan` → kategori **tenaga_kependidikan**.

Nilai durasi minimal, jam masuk/pulang standar, toleransi keterlambatan, dan hari kerja disimpan di tabel `pengaturan_jam_kerja` dan **dapat dikonfigurasi** (global per kategori, dengan opsi override per unit kerja).

### 5.4 Presensi: Face Recognition + Geofencing
Alur presensi (masuk dan keluar):
1. Pegawai membuka aplikasi → sistem mengambil **GPS** perangkat.
2. **Validasi lokasi**: untuk WFO/Shift, koordinat harus berada **di dalam radius** salah satu lokasi unit kerja pegawai. Untuk WFH, validasi radius dilewati (lihat 5.5).
3. **Capture wajah** (selfie) → dikirim ke microservice face recognition.
4. Microservice mengekstrak **embedding** dan menghitung **kemiripan (cosine similarity)** terhadap data wajah terdaftar pegawai. Jika skor ≥ ambang batas dan lolos **anti-spoofing/liveness**, presensi diterima.
5. Sistem mencatat: waktu, koordinat, status dalam-radius, foto bukti, skor kemiripan, jenis (masuk/keluar), tipe (WFO/WFH/Shift/Dinas Luar), dan perangkat.
6. Status kehadiran ditentukan otomatis (hadir/terlambat/pulang cepat/tidak lengkap) berdasarkan aturan jam kerja atau shift.

Ketentuan:
- **Satu wajah** terdaftar dapat memiliki beberapa sampel (variasi pencahayaan/sudut) untuk meningkatkan akurasi.
- **Pendaftaran wajah** dilakukan sekali (enrollment) oleh Admin Unit/Kepegawaian atau self-enrollment dengan verifikasi.
- Bukti foto setiap presensi disimpan untuk audit.

### 5.5 Work From Home (WFH)
- WFH **berbasis pengajuan**: pegawai mengajukan rentang tanggal WFH dengan alasan; disetujui atasan (dan/atau Admin Unit) sesuai kebijakan unit (`unit_kerja.izin_wfh = true`).
- Pada tanggal WFH yang disetujui, presensi tetap **wajib face recognition**, tetapi **validasi radius dilewati** (lokasi tetap direkam sebagai informasi, tidak sebagai syarat).
- Durasi kerja WFH tetap dievaluasi terhadap aturan jam kerja kategori pegawai.
- Kuota/aturan WFH (mis. maksimal X hari/bulan) dapat dikonfigurasi.

### 5.6 Manajemen Shift
- Admin Unit mendefinisikan **shift** (mis. Pagi 07:00–14:00, Siang 14:00–21:00, Malam 21:00–07:00) lengkap dengan toleransi dan penanda **lintas hari** (melewati tengah malam).
- **Jadwal shift** ditetapkan per pegawai per tanggal (roster). Mendukung pembuatan jadwal berulang/mingguan.
- Saat presensi pada unit shift, sistem mengevaluasi waktu masuk/keluar terhadap shift yang dijadwalkan hari itu (termasuk penanganan shift malam lintas hari).

### 5.7 Izin, Sakit, dan Dinas Luar
- **Izin**: ketidakhadiran/keterlambatan terjadwal dengan alasan (mis. keperluan keluarga, izin sebagian hari). Dapat berbasis jam atau hari.
- **Sakit (jangka pendek)**: izin sakit 1–14 hari dengan lampiran surat dokter biasa.
- **Dinas Luar**: penugasan di luar lokasi unit (presensi di luar radius diperbolehkan jika ada surat tugas yang disetujui). Dapat tetap memakai face recognition tanpa syarat radius.

Semua di atas dikelola via modul **Pengajuan** terpadu (entitas `pengajuan` dengan `jenis_cuti.kategori` = izin/sakit/dinas_luar) dan melalui alur persetujuan.

### 5.8 Cuti — Aturan Lengkap

#### 5.8.1 Cuti untuk PNS (7 jenis)

**1. Cuti Tahunan**
- Syarat: telah bekerja **minimal 1 tahun** terus-menerus.
- Hak dasar: 12 hari kerja/tahun.
- **Akumulasi**: bila tidak diambil pada tahun berjalan, dapat diambil tahun berikutnya hingga **maksimal 18 hari kerja** (termasuk hak tahun berjalan).
- **Hangus**: cuti tahunan yang tidak digunakan selama **2 tahun berturut-turut** menjadi gugur.

**2. Cuti Besar**
- Syarat: telah mengabdi **minimal 5 tahun** terus-menerus.
- Kuota: maksimal **3 bulan**. Bila diambil, **tidak berhak lagi atas cuti tahunan pada tahun yang sama**.
- Pengecualian: untuk kepentingan keagamaan (mis. ibadah Haji pertama) dapat diberikan pengecualian khusus atas aturan kuota tahunan.

**3. Cuti Sakit**
- Wajib melampirkan surat keterangan sakit dari dokter (pemerintah maupun swasta).
- Durasi:
  - **1–14 hari**: surat dokter biasa.
  - **> 14 hari s.d. 1,5 tahun**: surat dari **tim penguji kesehatan** yang ditunjuk pemerintah.
- **> 1,5 tahun belum sembuh**: diuji kembali kesehatannya untuk menentukan dipertahankan atau dipensiunkan dini.

**4. Cuti Melahirkan**
- Berlaku untuk persalinan **anak ke-1, ke-2, dan ke-3**. Untuk **anak ke-4 dan seterusnya** diberikan **CLTN**.
- Durasi: maksimal **3 bulan**; pembagian sebelum/sesudah melahirkan sesuai rekomendasi dokter/bidan.

**5. Cuti Alasan Penting (CAP)**
- Alasan yang dilegalkan: pernikahan pertama; keluarga inti (ibu, bapak, istri/suami, anak, adik, kakak, mertua) sakit keras/meninggal; atau musibah bencana alam.
- Durasi: maksimal **1 bulan**, tergantung urgensi dan jarak tempuh.

**6. Cuti Bersama**
- Ditetapkan via **Keputusan Presiden (Keppres)** setiap tahun (menjelang Idulfitri, Natal, tahun baru).
- **Tidak mengurangi** jatah cuti tahunan PNS. Bagi PNS yang karena tugasnya tidak dapat ikut cuti bersama (mis. tenaga medis/keamanan), jatah cuti tahunannya **ditambah** sebanyak hari cuti bersama yang terlewat.

**7. Cuti di Luar Tanggungan Negara (CLTN)**
- Syarat: telah bekerja **minimal 5 tahun** terus-menerus dan memiliki alasan kuat (mis. mendampingi suami/istri tugas belajar ke luar negeri, mendampingi anak berkebutuhan khusus).
- Konsekuensi: maksimal **3 tahun** (dapat diperpanjang 1 tahun). Selama CLTN: **tidak menerima gaji/tunjangan**, **masa kerja tidak dihitung**, dan **jabatan dilepas**.

#### 5.8.2 Cuti untuk PPPK (4 jenis)

| Jenis | Ketentuan |
|---|---|
| **Cuti Tahunan** | **12 hari kerja** setelah bekerja minimal **1 tahun** terus-menerus |
| **Cuti Sakit** | Diberikan bila sakit **> 14 hari** dengan surat dokter pemerintah; akumulasi maksimal **1 bulan / 30 hari kerja** |
| **Cuti Melahirkan** | Maksimal **3 bulan** untuk persalinan anak ke-1 s.d. ke-3 selama masa kontrak |
| **Cuti Bersama** | Mengikuti Keppres; **tidak mengurangi** jatah cuti tahunan PPPK |

### 5.9 Lembur
- Pegawai/atasan mengajukan **rencana lembur** (tanggal, jam mulai–selesai, deskripsi pekerjaan) → disetujui atasan.
- **Realisasi lembur** divalidasi dari data presensi (kehadiran di luar jam kerja standar/shift). Durasi lembur dihitung otomatis dan menjadi dasar kompensasi sesuai kebijakan.

### 5.10 Hari Libur & Cuti Bersama
- Tabel `hari_libur` menyimpan libur nasional, **cuti bersama** (sesuai Keppres), dan libur khusus kampus.
- Perhitungan **jumlah hari kerja** pada pengajuan cuti otomatis mengecualikan akhir pekan dan hari libur.
- Logika cuti bersama mengikuti aturan 5.8.1 butir 6 (tidak memotong cuti tahunan; kompensasi bagi yang bertugas).
- Setiap hari libur dipublikasikan ke **Google Calendar** kampus (lihat 5.16).

### 5.11 Saldo Cuti & Akumulasi
- Tabel `saldo_cuti` menyimpan saldo per pegawai per tahun per jenis cuti: **hak**, **saldo tahun lalu (carry-over)**, **terpakai**, **sisa**.
- Penjadwalan tahunan (job) menghitung carry-over cuti tahunan dengan **batas akumulasi 18 hari** dan menggugurkan saldo yang tidak terpakai 2 tahun berturut-turut.
- Pengajuan cuti memvalidasi ketersediaan saldo dan syarat masa kerja sebelum dapat disetujui.

### 5.12 Alur Persetujuan (Approval Workflow)
- **Alur dinamis** per jenis pengajuan disimpan di `alur_persetujuan` (urutan langkah + peran/penyetuju).
- Contoh alur cuti: Pegawai → Atasan Langsung (Kepala Unit/Pimpinan) → Admin Kepegawaian (verifikasi saldo & syarat) → Selesai. Untuk cuti tertentu dapat ditambah verifikasi BKN/PPK.
- Setiap langkah dicatat di `log_persetujuan` (penyetuju, status, catatan, waktu) untuk jejak audit.
- Notifikasi dikirim pada setiap perubahan status.

### 5.13 Dashboard & Laporan
- **Pegawai**: ringkasan kehadiran bulan berjalan, saldo cuti, status pengajuan.
- **Pimpinan/Admin Unit**: rekap kehadiran unit (hadir/terlambat/alpha), daftar pengajuan menunggu persetujuan, monitoring real-time.
- **Admin Kepegawaian**: rekap universitas, ekspor (Excel/PDF) untuk dasar tunjangan kinerja, laporan keterlambatan/ketidakhadiran, laporan penggunaan cuti.

### 5.14 Notifikasi
- Kanal: in-app, email; opsional WhatsApp/Telegram.
- Pemicu: pengajuan baru menunggu persetujuan, hasil persetujuan/penolakan, pengingat presensi belum check-out, saldo cuti akan hangus.

### 5.15 Autentikasi & SSO via Web Service SIGA8
Login aplikasi presensi **didelegasikan ke web service SIGA8** (`siga8.untad.ac.id`) sehingga pegawai memakai satu kredensial yang sama dengan sistem akademik. Aplikasi presensi **tidak menyimpan password**.

**Alur login:**
1. Pengguna memasukkan username & password → presensi meneruskan ke endpoint login SIGA8.
2. SIGA8 merespons `token`, identitas (`user_id`, `username`, `full_name`, `level`, konteks `faculty_*`/`study_programs_code`), dan daftar `roles[]` (`id`, `name`, `level`).
3. Presensi **meng-upsert** akun lokal (`users`) berdasarkan `user_id` SIGA8 (ULID), menyimpan snapshot identitas & fakultas.
4. **Pencocokan peran (inti):** untuk **setiap** `roles[].id` dari SIGA8, sistem mencarinya di tabel `pemetaan_role_siga8`. Setiap kecocokan menetapkan/menyegarkan baris `role_user` dengan `sumber='siga8'` dan `siga8_role_id` terisi. Peran SIGA8 yang tak punya pemetaan diabaikan.
5. Token bearer SIGA8 disimpan di **sesi server (terenkripsi)** — bukan di basis data.

**Pengelolaan pemetaan:** Super Admin (UPA TIK) memelihara `pemetaan_role_siga8` (mis. `Help Desk → super_admin`, `BAK → admin_kepegawaian`, `Pokja BAK → pegawai`). Satu peran SIGA8 dipetakan ke satu peran presensi; satu peran presensi dapat menerima banyak peran SIGA8. Pemetaan opsional dapat memaksa cakupan unit tertentu.

**Contoh respons SIGA8 (ringkas):**
```json
{ "status": true, "data": {
  "token": "71873|BEos…",
  "user": {
    "user_id": "01k727gqhk98rjyb6b22k9w6rt",
    "username": "1010101010", "full_name": "help desk", "level": 1,
    "faculty_code": "F", "faculty_name": "Teknik Informatika", "study_programs_code": "F551",
    "roles": [
      { "id": "01kafz9y3v1w55pyfs719pe97d", "name": "BAK", "level": 1 },
      { "id": "01k723k4csfpstqyshgcnpym4k", "name": "Pokja BAK", "level": 1 },
      { "id": "01k7273msxcsn6ycwmahrgqswn", "name": "Help Desk", "level": 1 }
    ] } } }
```

### 5.16 Integrasi Google Calendar (Cuti & Hari Libur)
Untuk visibilitas tim, **cuti yang disetujui** dan **hari libur** didorong sebagai event ke **Google Calendar**.

- **Konfigurasi tujuan** (`kalender_google`): kalender dapat **global** (satu kalender untuk semua) atau **per unit** (`unit_kerja_id`), dengan parameter `target` (cuti / libur / keduanya), `google_calendar_id`, dan zona waktu (default `Asia/Makassar`).
- **Cuti** (`pengajuan`): saat status menjadi **`disetujui`**, sistem membuat event (judul = jenis cuti + nama pegawai, rentang `tanggal_mulai`–`tanggal_selesai`) dan menyimpan `gcal_event_id`. Bila pengajuan **dibatalkan**, event terkait dihapus.
- **Hari libur** (`hari_libur`): setiap entri dipublikasikan sebagai event sepanjang hari ke kalender libur.
- **Keandalan**: setiap operasi dicatat di antrian `sinkron_kalender` (aksi buat/perbarui/hapus, status, jumlah `percobaan`, pesan error) sehingga **dapat di-retry** oleh worker/queue. `gcal_event_id` & status sinkron disimpan pula pada baris sumbernya untuk pelacakan langsung.
- **Kredensial**: Google **service account** (disarankan, tanpa interaksi pengguna) atau OAuth; disimpan di env/secret, bukan di basis data.

### 5.17 Penghadiran Manual & Koreksi Kehadiran (oleh Pimpinan/Verifikator)
Tidak semua ketidakhadiran berarti pegawai alpa — ada yang **lupa absen**, perangkat bermasalah, berada di lapangan, atau face/geo gagal terverifikasi. **Pimpinan/Verifikator** (atasan langsung, via Web Admin) dapat **menghadirkan pegawai secara manual** atau mengoreksi catatan kehadiran stafnya, dengan jejak audit penuh.

**Cakupan tindakan:**
- **Menandai hadir** pegawai yang tidak memiliki catatan presensi pada tanggal tertentu (mis. lupa absen masuk/keluar).
- **Melengkapi/menyunting** jam masuk/keluar pada presensi yang `tidak_lengkap`, lalu sistem menghitung ulang durasi & status.
- **Mengubah status** bila perlu (mis. dari `alpha` menjadi `hadir`/`dinas`).

**Ketentuan & jejak audit:**
- Setiap presensi hasil tindakan ini ditandai **`dibuat_manual = true`** dan menyimpan **`diverifikasi_oleh`** (akun pimpinan/verifikator), **`waktu_verifikasi`**, serta **`alasan_koreksi`** (wajib diisi).
- Tindakan tidak melalui face recognition/geofencing; karenanya `presensi_log` tidak dibuat untuk punch manual — pembedanya jelas antara kehadiran terverifikasi-biometrik dan kehadiran yang ditetapkan manual.
- Seluruh aktivitas tercatat pula di `log_aktivitas` (aktor, sebelum/sesudah, waktu) untuk akuntabilitas.
- Laporan kehadiran (5.13) **menandai** baris yang dihadirkan manual agar dapat dibedakan saat audit/penghitungan tunjangan kinerja.
- Kewenangan ada pada peran **Pimpinan/Verifikator** (atasan unit; dan Admin Kepegawaian bila dikonfigurasi); cakupannya dibatasi per unit melalui `role_user`.

---

## 6. Aturan Bisnis (Ringkasan Parametrik)

Tabel berikut adalah parameter yang dikodekan pada `jenis_cuti` untuk mesin aturan:

| Jenis | PNS | PPPK | Min. Masa Kerja | Maks. Durasi | Kurangi Cuti Tahunan | Perlu Surat Dokter | Catatan Khusus |
|---|:--:|:--:|---|---|:--:|:--:|---|
| Cuti Tahunan | ✔ | ✔ | 12 bln | 12 hari (akumulasi maks 18) | — | — | Hangus jika 2 thn tidak dipakai |
| Cuti Besar | ✔ | — | 60 bln | 3 bulan | Menggantikan | — | Pengecualian keagamaan (Haji) |
| Cuti Sakit | ✔ | ✔ | — (PPPK: >14 hr) | s.d. 1,5 thn (PPPK: maks 30 hr) | — | ✔ | >14 hr perlu tim penguji kesehatan |
| Cuti Melahirkan | ✔ | ✔ | — | 3 bulan | — | ✔ (rekomendasi) | Anak ke-1..3; ke-4+ → CLTN |
| Cuti Alasan Penting | ✔ | — | — | 1 bulan | — | Tergantung | Nikah/keluarga sakit-meninggal/bencana |
| Cuti Bersama | ✔ | ✔ | — | sesuai Keppres | **Tidak** | — | Kompensasi bagi yang bertugas |
| CLTN | ✔ | — | 60 bln | 3 thn (+1 thn) | — | — | Tanpa gaji, masa kerja tak dihitung, jabatan lepas |

Aturan jam kerja (mode reguler) — dikodekan pada `pengaturan_jam_kerja`:

| Kategori | Menit Minimal |
|---|---|
| dosen | 120 |
| dosen_tugas_tambahan | 240 |
| tenaga_kependidikan | 480 |

---

## 7. Alur Proses Utama

**A. Presensi Masuk (WFO/Shift)**
GPS → cek dalam radius lokasi unit → capture wajah → microservice verifikasi (similarity ≥ ambang + liveness) → simpan log masuk → tentukan status (hadir/terlambat).

**B. Presensi Masuk (WFH)**
Cek tanggal WFH disetujui → capture wajah → verifikasi → simpan (radius dilewati, lokasi direkam).

**C. Pengajuan Cuti**
Pilih jenis cuti → sistem validasi masa kerja + saldo → isi tanggal/alasan/lampiran → hitung hari kerja (kecuali libur) → ajukan → alur persetujuan → potong saldo bila disetujui → notifikasi.

**D. Lembur**
Ajukan rencana → disetujui → hadir di luar jam standar → realisasi dihitung dari presensi → rekap kompensasi.

---

## 8. Persyaratan Non-Fungsional

### 8.1 Keamanan & Privasi Data Biometrik
- **Embedding wajah** (bukan foto mentah) menjadi basis pencocokan; embedding & foto dienkripsi *at rest*.
- Persetujuan (consent) pegawai untuk pemrosesan data biometrik; kebijakan retensi & penghapusan data.
- Kepatuhan terhadap UU Perlindungan Data Pribadi (UU 27/2022): minimisasi data, hak akses/hapus, audit akses.
- **Anti-spoofing/liveness detection** untuk mencegah penggunaan foto/video.
- Otentikasi pengguna (login), otorisasi berbasis peran (RBAC), rate limiting, dan audit log seluruh aksi sensitif.

### 8.2 Akurasi Face Recognition
- Model rekomendasi: **ArcFace** (embedding 512 dimensi), pencocokan via **cosine similarity** dengan ambang yang dikalibrasi (mis. ≥ 0,40–0,50 tergantung dataset).
- **Ketahanan terhadap variasi pencahayaan** penting karena presensi dilakukan di lokasi outdoor/indoor beragam — terapkan augmentasi/normalisasi pencahayaan atau pendekatan domain adaptation lintas iluminasi.
- Multi-sampel enrollment per pegawai untuk menurunkan false reject.

### 8.3 Arsitektur & Performa
- **Microservice inference** (Python/FastAPI) yang berjalan di GPU (mis. perangkat kelas DGX Spark / GB10) untuk ekstraksi embedding & liveness, terpisah dari aplikasi utama Laravel; komunikasi via REST internal.
- Penyimpanan embedding di PostgreSQL dengan ekstensi **pgvector** untuk pencarian similarity yang efisien.
- Geofencing via perhitungan haversine (atau ekstensi **PostGIS**) terhadap titik lokasi unit.
- Target: presensi end-to-end < 5 detik; sistem mendukung lonjakan presensi serentak di jam masuk.

### 8.4 Ketersediaan & Lainnya
- Dukungan akses via web (admin) dan mobile (pegawai); mode offline-tolerant untuk capture saat sinyal lemah (queue & sync).
- Backup basis data terjadwal; logging & monitoring; zona waktu **WITA (Asia/Makassar)**.

---

## 9. Teknologi yang Diusulkan

| Lapisan | Pilihan |
|---|---|
| Backend/API | Laravel 13 (PHP 8.3), REST API |
| Database | PostgreSQL 16 + ekstensi `pgvector` (+ opsional PostGIS) |
| Face Recognition Service | Python + FastAPI, model ArcFace, liveness detection, dijalankan di GPU |
| Web Admin | **ReactJS** (konsol back-office: Super Admin, Admin Kepegawaian, Pimpinan/Verifikator — manajemen pegawai, kehadiran, laporan) |
| Mobile Pegawai | **Aplikasi utama presensi** (capture kamera untuk face recognition + GPS untuk geofencing); kanal pengajuan & persetujuan |
| Auth & RBAC | **SSO via web service SIGA8** + Laravel Sanctum (sesi) + spatie/laravel-permission |
| Integrasi Kalender | Google Calendar API (service account) via Laravel + Queue |
| Antrian/Job | Laravel Queue (perhitungan saldo cuti, rekap, notifikasi, **sinkronisasi kalender**) |

---

## 10. Asumsi & Batasan
- Daftar unit kerja (semua tingkat) final mengikuti SK OTK & data SIMPEG terbaru.
- Besaran ambang similarity, kuota WFH, dan parameter shift dikonfigurasi saat implementasi.
- Aturan cuti mengacu pada ringkasan regulasi yang diberikan; rujuk peraturan resmi (PP 11/2017 jo. PP 17/2020, PP 49/2018 & turunannya) untuk implementasi final dan perubahan terbaru.
- Integrasi penggajian/remunerasi & SIMPEG berada di luar lingkup MVP namun disiapkan jalur API.
- **Ketergantungan eksternal**: ketersediaan & kontrak respons web service SIGA8 mengikuti contoh pada 5.15; perubahan skema respons memerlukan penyesuaian pemetaan. Sinkronisasi Google Calendar membutuhkan kredensial Google (service account) dan kalender tujuan yang valid.

---

## 11. Roadmap Implementasi (Indikatif)

| Fase | Lingkup |
|---|---|
| **Fase 1 — MVP** | **Login SSO SIGA8 + pemetaan peran**, master data, presensi WFO face+geofence, aturan jam kerja reguler, izin/sakit, dashboard dasar |
| **Fase 2** | Modul cuti lengkap (PNS & PPPK) + saldo & akumulasi, alur persetujuan dinamis, hari libur/cuti bersama |
| **Fase 3** | Sistem shift (RS Pendidikan), WFH, lembur, notifikasi multi-kanal, **integrasi Google Calendar (cuti & libur)** |
| **Fase 4** | Laporan lanjutan, integrasi SIMPEG/remunerasi, optimasi akurasi & liveness |
