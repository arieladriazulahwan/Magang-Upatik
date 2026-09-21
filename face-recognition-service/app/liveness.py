

from __future__ import annotations

import os
from enum import Enum
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort


class LivenessStatus(str, Enum):
    PASSED = "lolos"
    FAILED = "gagal"


class LivenessModelError(RuntimeError):
    """Liveness model is missing or cannot be initialized."""


class LivenessDetector:
    INPUT_SIZE = 128
    BBOX_EXPANSION = 1.5

    def __init__(self, model_path: str | None = None, threshold: float | None = None):
        default_path = Path(__file__).resolve().parent.parent / "models" / "AntiSpoofing_bin_1.5_128.onnx"
        self.model_path = Path(model_path or os.getenv("LIVENESS_MODEL_PATH", str(default_path)))
        self.threshold = float(
            threshold if threshold is not None
            else os.getenv("LIVENESS_THRESHOLD", "0.50")
        )

        if not 0.0 < self.threshold < 1.0:
            raise ValueError("LIVENESS_THRESHOLD harus berada di antara 0 dan 1.")

        if not self.model_path.is_file():
            raise LivenessModelError(
                f"Model liveness tidak ditemukan: {self.model_path}. "
                "Letakkan AntiSpoofing_bin_1.5_128.onnx di folder models/ "
                "atau set LIVENESS_MODEL_PATH."
            )

        try:
            self.session = ort.InferenceSession(
                str(self.model_path),
                providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
            )
        except Exception as exc:
            raise LivenessModelError(
                f"Gagal memuat model liveness '{self.model_path}': {exc}"
            ) from exc

        inputs = self.session.get_inputs()
        if not inputs:
            raise LivenessModelError("Model liveness tidak memiliki input ONNX.")

        self.input_name = inputs[0].name

    @staticmethod
    def _square_crop_with_margin(
        image_rgb: np.ndarray,
        bbox: tuple[float, float, float, float],
        expansion: float = 1.5,
    ) -> np.ndarray:
        """
        Crop persegi berpusat pada bbox wajah, diperbesar 1.5x.
        Area di luar gambar dipadding hitam agar wajah tidak terpotong.
        """
        x1, y1, x2, y2 = map(float, bbox)
        w = max(1.0, x2 - x1)
        h = max(1.0, y2 - y1)

        side = max(w, h) * expansion
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0

        left = int(round(cx - side / 2.0))
        top = int(round(cy - side / 2.0))
        right = int(round(cx + side / 2.0))
        bottom = int(round(cy + side / 2.0))

        img_h, img_w = image_rgb.shape[:2]

        pad_left = max(0, -left)
        pad_top = max(0, -top)
        pad_right = max(0, right - img_w)
        pad_bottom = max(0, bottom - img_h)

        if pad_left or pad_top or pad_right or pad_bottom:
            image_rgb = cv2.copyMakeBorder(
                image_rgb,
                pad_top,
                pad_bottom,
                pad_left,
                pad_right,
                cv2.BORDER_CONSTANT,
                value=(0, 0, 0),
            )
            left += pad_left
            right += pad_left
            top += pad_top
            bottom += pad_top

        crop = image_rgb[top:bottom, left:right]
        if crop.size == 0:
            raise ValueError("Crop wajah untuk liveness kosong.")

        return crop

    def _preprocess(
        self,
        image_rgb: np.ndarray,
        bbox: tuple[float, float, float, float],
    ) -> np.ndarray:
        crop = self._square_crop_with_margin(
            image_rgb,
            bbox,
            self.BBOX_EXPANSION,
        )

        crop = cv2.resize(
            crop,
            (self.INPUT_SIZE, self.INPUT_SIZE),
            interpolation=cv2.INTER_LINEAR,
        )

        tensor = crop.astype(np.float32) / 255.0
        tensor = np.transpose(tensor, (2, 0, 1))
        return np.expand_dims(tensor, axis=0)

    @staticmethod
    def _probabilities(raw_output: np.ndarray) -> np.ndarray:
        values = np.asarray(raw_output, dtype=np.float32).reshape(-1)
        if values.size < 2:
            raise LivenessModelError(
                f"Output model liveness tidak valid: shape={raw_output.shape}"
            )

        values = values[:2]


        if (
            np.all(np.isfinite(values))
            and np.all(values >= 0)
            and np.all(values <= 1)
            and abs(float(values.sum()) - 1.0) < 1e-3
        ):
            return values

        shifted = values - np.max(values)
        exp_values = np.exp(shifted)
        return exp_values / np.sum(exp_values)

    def predict(
        self,
        image_bytes: bytes,
        bbox: tuple[float, float, float, float],
    ) -> dict:
        array = np.frombuffer(image_bytes, dtype=np.uint8)
        image_bgr = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image_bgr is None:
            raise ValueError("File gambar tidak valid.")

        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        tensor = self._preprocess(image_rgb, bbox)

        raw = self.session.run(None, {self.input_name: tensor})[0]
        probabilities = self._probabilities(raw)

        live_score = float(probabilities[0])
        spoof_score = float(probabilities[1])
        passed = live_score >= self.threshold

        return {
            "status": LivenessStatus.PASSED.value if passed else LivenessStatus.FAILED.value,
            "passed": passed,
            "live_score": live_score,
            "spoof_score": spoof_score,
            "threshold": self.threshold,
        }


_detector: LivenessDetector | None = None


def load_liveness_model() -> LivenessDetector:
    global _detector
    _detector = LivenessDetector()
    return _detector


def get_liveness_detector() -> LivenessDetector:
    if _detector is None:
        raise LivenessModelError("Model liveness belum dimuat.")
    return _detector


def check_liveness(
    image_bytes: bytes,
    bbox: tuple[float, float, float, float],
) -> dict:
    return get_liveness_detector().predict(image_bytes, bbox)
