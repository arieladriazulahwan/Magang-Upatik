-- =====================================================================
-- SI-PRESENSI UNTAD — Skema face_data (dipisah dari schema-core.sql)
-- Butuh ekstensi pgvector. Jalankan HANYA setelah `CREATE EXTENSION vector`
-- berhasil di database Anda (lihat README untuk cara instalasi pgvector
-- di Windows/Laragon).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE face_data (
    id              BIGSERIAL PRIMARY KEY,
    employee_id      BIGINT NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    embedding       vector(512) NOT NULL,            -- ArcFace 512-d
    reference_photo  VARCHAR(255),
    quality        REAL,                            -- skor kualitas saat enrollment
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_face_data_employee ON face_data(employee_id);
COMMENT ON TABLE face_data IS 'Multi-sampel embedding per pegawai (variasi pencahayaan/sudut) untuk akurasi face recognition';
