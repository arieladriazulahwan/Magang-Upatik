

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.face_engine import FaceEngine, NoFaceDetectedError
from app.liveness import check_liveness, load_liveness_model
from app.schemas import EnrollResponse, VerifyCandidateEmbedding, VerifyResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_engine: FaceEngine | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _engine
    logger.info("Memuat model ArcFace (buffalo_l)...")
    _engine = FaceEngine()
    logger.info("Memuat model anti-spoofing/liveness...")
    load_liveness_model()
    logger.info("Face recognition + liveness siap.")
    yield
    _engine = None


app = FastAPI(
    title="SI-Presensi Untad — Face Recognition Service",
    description="Microservice internal. TIDAK untuk diekspos langsung ke internet — panggil dari Laravel backend saja.",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _engine is not None}


@app.post("/enroll", response_model=EnrollResponse, responses={422: {"description": "Wajah tidak terdeteksi"}})
async def enroll(photo: UploadFile = File(...)):
    image_bytes = await photo.read()

    try:
        embedding, det_score, bbox, face_count, pose = _engine.extract_primary_embedding(image_bytes)
    except NoFaceDetectedError:
        raise HTTPException(status_code=422, detail={"error_code": "no_face_detected", "message": "Tidak ada wajah terdeteksi pada foto. Pastikan wajah menghadap kamera dan pencahayaan cukup."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error_code": "invalid_image", "message": str(e)})

    return EnrollResponse(
        embedding=embedding.tolist(),
        detection_score=det_score,
        bbox=bbox,
        face_count=face_count,
        pose=pose,
    )


@app.post("/verify", response_model=VerifyResponse, responses={422: {"description": "Wajah tidak terdeteksi"}})
async def verify(
    photo: UploadFile = File(...),
    candidates: str = Form(..., description="JSON array of {face_data_id, embedding}"),
):
    image_bytes = await photo.read()

    try:
        candidate_list = [VerifyCandidateEmbedding(**c) for c in json.loads(candidates)]
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail={"error_code": "invalid_candidates", "message": f"Field 'candidates' harus JSON array valid: {e}"})

    try:
        new_embedding, det_score, bbox, face_count, pose = _engine.extract_primary_embedding(image_bytes)
    except NoFaceDetectedError:
        raise HTTPException(status_code=422, detail={"error_code": "no_face_detected", "message": "Tidak ada wajah terdeteksi pada foto presensi."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error_code": "invalid_image", "message": str(e)})

    liveness_result = check_liveness(image_bytes, bbox)

    if not candidate_list:


        return VerifyResponse(
            matched_face_data_id=None,
            similarity_score=None,
            detection_score=det_score,
            liveness_status=liveness_result["status"],
            liveness_passed=liveness_result["passed"],
            liveness_score=liveness_result["live_score"],
            liveness_threshold=liveness_result["threshold"],
            bbox=bbox,
            face_count=face_count,
            pose=pose,
        )

    best_candidate = None
    best_similarity = -2.0

    for candidate in candidate_list:
        similarity = FaceEngine.cosine_similarity(new_embedding, np.array(candidate.embedding, dtype=np.float32))

        if similarity > best_similarity:
            best_similarity = similarity
            best_candidate = candidate

    return VerifyResponse(
        matched_face_data_id=best_candidate.face_data_id,
        similarity_score=best_similarity,
        detection_score=det_score,
        liveness_status=liveness_result["status"],
        liveness_passed=liveness_result["passed"],
        liveness_score=liveness_result["live_score"],
        liveness_threshold=liveness_result["threshold"],
        bbox=bbox,
        face_count=face_count,
        pose=pose,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):


    logger.exception("Unhandled exception di %s", request.url)
    return JSONResponse(status_code=500, content={"error_code": "internal_error", "message": "Terjadi kesalahan internal di face recognition service."})
