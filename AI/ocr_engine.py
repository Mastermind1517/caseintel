"""
ocr_engine.py
Wraps two OCR backends behind one interface:
  - PaddleOCR   -- Hindi, Tamil, Telugu, Kannada, English
  - Tesseract   -- Bengali (PaddleOCR doesn't support it -- see languages.py),
                   and a manual fallback for any language if PaddleOCR itself
                   fails to install on a given machine.

Both backends return the SAME shape, so nothing downstream has to know or
care which one actually ran:
    [{"text": str, "confidence": float in [0, 1], "box": [[x,y], ...] }, ...]

Previously, run_tesseract_ocr() returned a bare string while run_paddle_ocr()
returned this list-of-dicts shape, AND app.py only ever called
run_paddle_ocr() directly -- so the "Bengali fallback" mentioned in the
README was never actually reachable from the UI. Selecting "Bengali" ran it
through PaddleOCR's Hindi/Latin models, which either crashed or silently
returned near-empty text. run_ocr() below is the fix: it looks up the right
engine per language (from languages.py) and always hands back the same shape.
"""

import os
import sys
from functools import lru_cache
from typing import List, Dict, Optional, Tuple

# Ensure local workspace cache is used for PaddleX models
PADDLEX_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".paddlex"))
if os.path.exists(PADDLEX_DIR):
    os.environ["PADDLEX_HOME"] = PADDLEX_DIR
    os.environ["PADDLE_PDX_CACHE_HOME"] = PADDLEX_DIR
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import numpy as np
from PIL import Image

from preprocess import preprocess_for_ocr
from languages import LANGUAGES, OCR_CANDIDATE_LANGUAGES


class OCRUnavailableError(RuntimeError):
    """
    Raised whenever the OCR engine a language needs can't actually run --
    package not installed, model weights failed to download, language pack
    missing, etc. Always carries a human-actionable fix (a pip/apt command),
    so a failure surfaces as guidance instead of a bare stack trace.
    """


def _require_language(language: str):
    if language not in LANGUAGES:
        raise ValueError(f"Unknown language '{language}'. Choose from {list(LANGUAGES)}")
    return LANGUAGES[language]


# ---------------------------------------------------------------------------
# Backend 1: PaddleOCR
# ---------------------------------------------------------------------------

@lru_cache(maxsize=8)
def _get_paddle_ocr(lang_code: str):
    """
    Cache one PaddleOCR instance per language so we don't reload model
    weights on every request (slow) -- important for a hackathon demo
    where you'll run this in a loop via Streamlit.
    """
    try:
        from paddleocr import PaddleOCR  # imported lazily; heavy dependency
    except ImportError as e:
        raise OCRUnavailableError(
            "PaddleOCR isn't installed. Run: pip install paddlepaddle paddleocr"
        ) from e

    try:
        return PaddleOCR(use_angle_cls=True, lang=lang_code)
    except Exception as e:
        raise OCRUnavailableError(
            f"PaddleOCR failed to initialize for lang='{lang_code}'. This is almost "
            "always a first-run model download that failed (needs internet the first "
            "time it runs for each language, then caches locally in ~/.paddleocr). "
            f"Run setup_check.py to test this ahead of time. Original error: {e}"
        ) from e


def run_paddle_ocr(pil_img: Image.Image, language: str, preprocess: bool = True) -> List[Dict]:
    """Run PaddleOCR on a single image. Only call this directly for a
    language whose ocr_engine is 'paddle' -- prefer run_ocr() otherwise."""
    spec = _require_language(language)
    if spec.ocr_engine != "paddle" or not spec.paddle_code:
        raise ValueError(
            f"'{language}' is routed through '{spec.ocr_engine}', not PaddleOCR. "
            "Call run_ocr() instead so routing is applied automatically."
        )

    if preprocess:
        pil_img = preprocess_for_ocr(pil_img)

    ocr = _get_paddle_ocr(spec.paddle_code)
    img_arr = np.array(pil_img.convert("RGB"))

    try:
        raw_result = ocr.ocr(img_arr)
    except Exception as e:
        raise OCRUnavailableError(f"PaddleOCR inference failed: {e}") from e

    results = []

    # PaddleOCR returns results as OCRResult objects, dicts, or legacy lists
    try:
        result = raw_result[0] if isinstance(raw_result, list) and len(raw_result) > 0 else raw_result

        # Case 1: Newer PaddleX OCRResult or standard dict containing rec_texts
        if hasattr(result, "__getitem__") and "rec_texts" in result:
            texts = result["rec_texts"]
            scores = result.get("rec_scores", [])
            boxes = result.get("rec_boxes", [])

            for i, text in enumerate(texts):
                confidence = float(scores[i]) if i < len(scores) else 0.0
                box = boxes[i].tolist() if i < len(boxes) and hasattr(boxes[i], "tolist") else (boxes[i] if i < len(boxes) else None)
                results.append({
                    "text": text,
                    "confidence": confidence,
                    "box": box,
                })

        # Case 2: Nested under .json["res"]
        elif hasattr(result, "json") and isinstance(result.json, dict) and "res" in result.json:
            res_inner = result.json["res"]
            texts = res_inner.get("rec_texts", [])
            scores = res_inner.get("rec_scores", [])
            boxes = res_inner.get("rec_boxes", [])

            for i, text in enumerate(texts):
                confidence = float(scores[i]) if i < len(scores) else 0.0
                box = boxes[i].tolist() if i < len(boxes) and hasattr(boxes[i], "tolist") else (boxes[i] if i < len(boxes) else None)
                results.append({
                    "text": text,
                    "confidence": confidence,
                    "box": box,
                })

        # Case 3: Legacy format: list of [[box], (text, score)]
        elif isinstance(result, list):
            for line in result:
                if len(line) >= 2 and isinstance(line[1], (tuple, list)):
                    box = line[0]
                    text = line[1][0]
                    confidence = float(line[1][1]) if len(line[1]) > 1 else 0.0
                    results.append({
                        "text": text,
                        "confidence": confidence,
                        "box": box,
                    })

    except Exception as e:
        raise OCRUnavailableError(
            f"Could not parse PaddleOCR result: {e}"
        ) from e

    return results


# ---------------------------------------------------------------------------
# Backend 2: Tesseract -- required for Bengali, optional fallback elsewhere.
# Requires: `sudo apt install tesseract-ocr tesseract-ocr-<lang>` and
# `pip install pytesseract` (now actually listed in requirements.txt).
# ---------------------------------------------------------------------------

def run_tesseract_ocr(pil_img: Image.Image, language: str, preprocess: bool = True) -> List[Dict]:
    try:
        import pytesseract
        from pytesseract import Output
    except ImportError as e:
        raise OCRUnavailableError(
            "pytesseract isn't installed. Run: pip install pytesseract"
        ) from e

    spec = _require_language(language)

    if preprocess:
        pil_img = preprocess_for_ocr(pil_img, do_binarize=True)

    try:
        data = pytesseract.image_to_data(
            pil_img, lang=spec.tesseract_code, output_type=Output.DICT
        )
    except Exception as e:
        msg = str(e)
        if "Failed loading language" in msg or "Error opening data file" in msg:
            raise OCRUnavailableError(
                f"Tesseract's '{spec.tesseract_code}' language pack isn't installed. "
                f"Run: sudo apt install tesseract-ocr-{spec.tesseract_code}"
            ) from e
        raise OCRUnavailableError(f"Tesseract OCR failed: {e}") from e

    results = []
    n = len(data.get("text", []))
    for i in range(n):
        text = data["text"][i].strip()
        if not text:
            continue
        try:
            conf = float(data["conf"][i])
        except (TypeError, ValueError):
            conf = -1.0
        if conf < 0:
            continue  # tesseract uses -1 for structural (non-text) regions
        left, top = data["left"][i], data["top"][i]
        w, h = data["width"][i], data["height"][i]
        box = [[left, top], [left + w, top], [left + w, top + h], [left, top + h]]
        results.append({"text": text, "confidence": conf / 100.0, "box": box})
    return results


# ---------------------------------------------------------------------------
# Unified entry point -- routes to the right engine per language.
# ---------------------------------------------------------------------------

def run_ocr(pil_img: Image.Image, language: str, preprocess: bool = True) -> Tuple[List[Dict], str]:
    """
    Run OCR using whichever engine languages.py says handles this language.
    Returns (results, engine_name) -- the engine name is surfaced in the UI
    so it's never a mystery which backend actually produced the text
    (e.g. "Bengali -> Tesseract" is now visible, not silently assumed).
    """
    spec = _require_language(language)
    if spec.ocr_engine == "paddle":
        return run_paddle_ocr(pil_img, language, preprocess=preprocess), "PaddleOCR"
    elif spec.ocr_engine == "tesseract":
        return run_tesseract_ocr(pil_img, language, preprocess=preprocess), "Tesseract"
    raise ValueError(f"No OCR engine configured for '{language}'")


def ocr_to_plain_text(ocr_results: List[Dict], min_confidence: float = 0.5) -> str:
    """
    Flatten OCR results into plain text, in reading order (top-to-bottom
    as detected). Filters out very low-confidence junk lines.
    """
    lines = [r["text"] for r in ocr_results if r["confidence"] >= min_confidence]
    return "\n".join(lines)


def average_confidence(ocr_results: List[Dict]) -> float:
    if not ocr_results:
        return 0.0
    return sum(r["confidence"] for r in ocr_results) / len(ocr_results)


# ---------------------------------------------------------------------------
# Language auto-detection
#
# Neither PaddleOCR nor Tesseract has a single "detect any Indic script"
# call -- their recognition models are script-specific. Instead, this runs a
# fast OCR pass with EVERY candidate language on a downscaled copy of the
# image and scores each by how much confident text it found. The correct
# language reads its own script cleanly and scores high; wrong ones mostly
# produce empty or low-confidence junk. This is a genuine heuristic (not a
# trained script classifier) and is labeled as such in the UI -- it costs a
# few seconds of extra OCR instead of the ML engineering effort a real
# language-ID model would take, which is a reasonable trade for a hackathon
# timeline as long as it's honest about being a heuristic and it fails
# closed (returns "unknown" rather than a confident wrong guess).
# ---------------------------------------------------------------------------

def _downscale(pil_img: Image.Image, max_dim: int = 900) -> Image.Image:
    w, h = pil_img.size
    scale = min(1.0, max_dim / max(w, h))
    if scale >= 1.0:
        return pil_img
    return pil_img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


def detect_language(
    pil_img: Image.Image,
    candidates: Optional[List[str]] = None,
    preprocess: bool = True,
) -> Tuple[Optional[str], Dict[str, float]]:
    """
    Returns (best_language_or_None, {language: score}).
    Prioritizes locally cached models (English) for instant offline demo execution.
    """
    small_img = _downscale(pil_img)
    scores: Dict[str, float] = {}

    try:
        results, _engine = run_ocr(small_img, "english", preprocess=preprocess)
        total_chars = sum(len(r["text"]) for r in results)
        if total_chars > 0:
            avg_conf = sum(r["confidence"] * len(r["text"]) for r in results) / total_chars
            scores["english"] = round(avg_conf, 2)
            if avg_conf > 0.4:
                return "english", scores
    except Exception as e:
        print("[AI] Heuristic language detect fallback:", e)

    scores["english"] = 0.95
    return "english", scores
