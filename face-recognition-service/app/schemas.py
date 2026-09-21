from pydantic import BaseModel, Field


class EnrollResponse(BaseModel):
    embedding: list[float] = Field(..., description="512 angka embedding ArcFace ternormalisasi")
    detection_score: float = Field(..., description="Keyakinan deteksi wajah utama")
    bbox: tuple[float, float, float, float] = Field(..., description="Kotak wajah utama pada foto asli")
    face_count: int = Field(..., description="Jumlah wajah yang terdeteksi pada frame")
    pose: str | None = Field(None, description="Estimasi pose wajah utama: front, left, right, up, atau down")


class VerifyCandidateEmbedding(BaseModel):
    face_data_id: int = Field(..., description="ID face_data kandidat")
    embedding: list[float] = Field(..., min_length=512, max_length=512)


class VerifyResponse(BaseModel):
    matched_face_data_id: int | None = Field(None, description="face_data_id dengan similarity tertinggi")
    similarity_score: float | None = Field(None, description="Cosine similarity tertinggi")
    detection_score: float = Field(..., description="Keyakinan deteksi wajah utama")
    liveness_status: str = Field(..., description="Status anti-spoofing")
    liveness_passed: bool = Field(..., description="True jika live_score >= threshold")
    liveness_score: float = Field(..., ge=0.0, le=1.0, description="Probabilitas wajah asli")
    liveness_threshold: float = Field(..., gt=0.0, lt=1.0, description="Ambang liveness")
    bbox: tuple[float, float, float, float] = Field(..., description="Kotak wajah utama pada foto asli")
    face_count: int = Field(..., description="Jumlah wajah yang terdeteksi pada frame")
    pose: str | None = Field(None, description="Estimasi pose wajah utama")


class ErrorResponse(BaseModel):
    error_code: str
    message: str
