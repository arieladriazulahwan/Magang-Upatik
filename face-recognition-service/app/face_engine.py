from __future__ import annotations

import logging

import cv2
import numpy as np
from insightface.app import FaceAnalysis

logger = logging.getLogger(__name__)


class NoFaceDetectedError(Exception):
    pass


class FaceEngine:
    def __init__(self, det_size: tuple[int, int] = (640, 640)):
        self._app = FaceAnalysis(name="buffalo_l")
        self._app.prepare(ctx_id=0, det_size=det_size)
        logger.info("FaceEngine siap (buffalo_l, det_size=%s)", det_size)

    def extract_primary_embedding(self, image_bytes: bytes) -> tuple[np.ndarray, float, tuple, int, str | None]:
        image = self._decode_image(image_bytes)
        faces = self._app.get(image)

        if len(faces) == 0:
            raise NoFaceDetectedError()

        face = self._select_primary_face(faces, image.shape)
        pose = self._estimate_pose(face)

        return face.normed_embedding, float(face.det_score), tuple(face.bbox.tolist()), len(faces), pose

    def extract_single_embedding(self, image_bytes: bytes) -> tuple[np.ndarray, float, tuple]:
        embedding, score, bbox, _face_count, _pose = self.extract_primary_embedding(image_bytes)
        return embedding, score, bbox

    @staticmethod
    def _select_primary_face(faces, image_shape: tuple[int, ...]):
        image_h, image_w = image_shape[:2]
        image_center_x = image_w / 2
        image_center_y = image_h / 2
        image_area = max(1, image_w * image_h)

        def score(face) -> float:
            x1, y1, x2, y2 = map(float, face.bbox)
            width = max(1.0, x2 - x1)
            height = max(1.0, y2 - y1)
            area_score = min(1.0, (width * height) / image_area * 8)
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2
            distance = ((center_x - image_center_x) ** 2 + (center_y - image_center_y) ** 2) ** 0.5
            max_distance = max(1.0, (image_w ** 2 + image_h ** 2) ** 0.5 / 2)
            center_score = max(0.0, 1.0 - distance / max_distance)
            return area_score * 0.58 + center_score * 0.27 + float(face.det_score) * 0.15

        return max(faces, key=score)

    @staticmethod
    def _estimate_pose(face) -> str | None:
        kps = getattr(face, "kps", None)
        if kps is None or len(kps) < 5:
            return None

        left_eye, right_eye, nose, left_mouth, right_mouth = np.asarray(kps[:5], dtype=np.float32)
        eye_center = (left_eye + right_eye) / 2
        mouth_center = (left_mouth + right_mouth) / 2
        face_height = max(1.0, float(np.linalg.norm(eye_center - mouth_center)))
        face_width = max(1.0, float(np.linalg.norm(left_eye - right_eye)))
        yaw_ratio = float((nose[0] - eye_center[0]) / face_width)
        pitch_ratio = float((nose[1] - ((eye_center[1] + mouth_center[1]) / 2)) / face_height)

        if yaw_ratio > 0.14:
            return "left"
        if yaw_ratio < -0.14:
            return "right"
        if pitch_ratio < -0.18:
            return "up"
        if pitch_ratio > 0.16:
            return "down"
        return "front"

    @staticmethod
    def _decode_image(image_bytes: bytes) -> np.ndarray:
        array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("File yang dikirim bukan gambar valid atau format tidak didukung.")

        return image

    @staticmethod
    def cosine_similarity(embedding_a: np.ndarray, embedding_b: np.ndarray) -> float:
        return float(np.dot(embedding_a, embedding_b))
