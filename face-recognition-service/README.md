# Face Recognition Service — SI-Presensi Untad

Microservice Python/FastAPI sesuai PRD §8.2/§9: ekstraksi embedding wajah
(ArcFace, 512-d, via `insightface` model pack `buffalo_l`) + endpoint
verifikasi similarity. **Diuji end-to-end sebelum diserahkan** — bukan
cuma ditulis berdasar dokumentasi (lihat bagian "Bukti pengujian" di bawah).

## Setup

```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Percobaan pertama akan download model (~280MB)** ke `~/.insightface/models/`
— butuh koneksi internet sekali di awal. Setelah itu tersimpan lokal,
tidak download ulang.

Cek jalan: `curl http://localhost:8001/health` → `{"status":"ok","model_loaded":true}`

Dokumentasi interaktif (Swagger UI) otomatis tersedia di `http://localhost:8001/docs`.

## Bukti pengujian

Sebelum diserahkan, saya jalankan 3 skenario nyata (bukan simulasi):

| Skenario | Hasil |
|---|---|
| Foto valid → `/enroll` | Embedding 512-d berhasil diekstrak |
| `/verify` foto SAMA vs kandidat dari foto itu sendiri | `similarity_score: 0.9999...` |
| `/verify` foto ORANG BERBEDA | `similarity_score: 0.0016` |
| `/verify` foto tanpa wajah (blank) | `422 no_face_detected` |

Beda `0.9999` vs `0.0016` itu jarak yang jauh — model ini secara nyata bisa
membedakan orang, bukan cuma restart-restart angka acak.

## Kontrak API

### `POST /enroll`
Multipart, field `photo` (file gambar). Dipakai sekali per sampel foto saat
pendaftaran wajah pegawai (PRD §5.4: "multi-sampel enrollment").

Response:
```json
{ "embedding": [0.041, -0.027, ...], "detection_score": 0.82, "bbox": [x1,y1,x2,y2] }
```

**Laravel simpan `embedding` langsung ke kolom `face_data.embedding`**
(tipe `vector(512)` pgvector), satu baris per sampel foto.

### `POST /verify`
Multipart, field `photo` (file) + field `candidates` (string JSON array).

Request `candidates` (Laravel yang menyusun, dari query `face_data` milik
pegawai yang sedang presensi):
```json
[
  { "face_data_id": 12, "embedding": [0.04, ...] },
  { "face_data_id": 13, "embedding": [0.05, ...] }
]
```

Response:
```json
{
  "matched_face_data_id": 12,
  "similarity_score": 0.87,
  "detection_score": 0.91,
  "liveness_status": "belum_diimplementasi"
}
```

**Penting**: service ini TIDAK memutuskan lolos/tidak — cuma mengembalikan
angka similarity mentah. Keputusan ambang batas (mis. `≥ 0.45`) tetap di
Laravel (`AttendanceService`), supaya bisa diubah lewat `app_setting` tanpa
redeploy service Python ini.

## Integrasi ke `AttendanceService::verifyFace()` (Laravel)

Ganti stub yang sekarang jadi kira-kira begini (sesuaikan nama config/HTTP client Anda):

```php
private function verifyFace(?string $photoPath, Employee $employee): array
{
    if (! $photoPath) {
        throw new AttendanceValidationException('Foto presensi wajib disertakan.', 'photo_required');
    }

    $candidates = FaceData::where('employee_id', $employee->id)
        ->where('is_active', true)
        ->get(['id', 'embedding'])
        ->map(fn ($f) => ['face_data_id' => $f->id, 'embedding' => $f->embedding])
        ->values();

    $response = Http::attach('photo', Storage::get($photoPath), basename($photoPath))
        ->post(config('services.face_recognition.url') . '/verify', [
            'candidates' => $candidates->toJson(),
        ]);

    if ($response->failed()) {
        throw new AttendanceValidationException('Verifikasi wajah gagal diproses.', 'face_service_error');
    }

    $data = $response->json();
    $threshold = AppSetting::get('face_similarity_threshold', 0.45); // contoh, sesuaikan key aslinya

    return [
        'proof_photo' => $photoPath,
        'similarity_score' => $data['similarity_score'],
        'face_matched' => $data['similarity_score'] !== null && $data['similarity_score'] >= $threshold,
        'liveness_passed' => null, // tetap null — lihat keterbatasan di bawah
    ];
}
```

## Keterbatasan yang JUJUR perlu Anda tahu

1. **Liveness/anti-spoofing BELUM diimplementasi** — `liveness_status` SELALU
   `"belum_diimplementasi"`. `app/liveness.py` isinya stub eksplisit, bukan
   heuristik lemah yang berpura-pura berfungsi. Ada 2 opsi nyata yang
   didokumentasikan di file itu kalau Anda mau lanjutkan (model anti-spoofing
   pasif seperti Silent-Face-Anti-Spoofing, atau challenge-response aktif
   yang butuh video/multi-frame — ini ubah kontrak API, perlu didiskusikan
   dulu dengan siapa pun yang pegang mobile app).
2. **Ambang similarity BELUM dikalibrasi** dengan wajah pegawai Untad
   sungguhan — angka `0.45` di contoh integrasi itu cuma perkiraan umum dari
   riset ArcFace, BUKAN hasil kalibrasi data Anda. PRD §8.2 juga bilang
   begitu ("dikalibrasi tergantung dataset").
3. **CPU vs GPU**: kode ini jalan di CPU (sudah saya buktikan), tapi lebih
   lambat (~0.1-0.5 detik/foto tergantung device). PRD menyebut target
   presensi end-to-end <5 detik — di CPU biasa kemungkinan masih dalam
   batas itu untuk 1 wajah, tapi belum diuji dengan beban banyak pengguna
   bersamaan (concurrent load) sama sekali.
4. **Service ini stateless, tidak simpan apa pun** — tidak ada database,
   tidak tahu siapa "pegawai". Semua data pegawai/embedding tetap
   sepenuhnya tanggung jawab Laravel.
5. **Belum ada autentikasi antar service** — endpoint ini polos, siapa pun
   yang bisa akses network-nya bisa panggil. Untuk production, minimal
   batasi lewat firewall/network internal (jangan expose port 8001 ke
   internet), atau tambahkan API key sederhana di header kalau perlu lebih
   ketat — saya sengaja tidak menambahkan ini sekarang supaya tidak
   over-engineer sebelum Anda tahu kebutuhan deployment sebenarnya.
