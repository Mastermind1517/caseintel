"""
preprocess.py
Basic image cleanup to improve OCR accuracy on scanned/photographed documents.
Handles: grayscale conversion, denoising, deskewing, adaptive thresholding.

Also handles turning an *uploaded file* (image or PDF) into a list of PIL
pages, so multi-page PDFs don't have to be split by hand before uploading.
"""

from typing import List, Union
import io

import cv2
import numpy as np
from PIL import Image


def pil_to_cv2(pil_img: Image.Image) -> np.ndarray:
    """Convert a PIL image (RGB) to an OpenCV image (BGR)."""
    arr = np.array(pil_img.convert("RGB"))
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def cv2_to_pil(cv_img: np.ndarray) -> Image.Image:
    """Convert an OpenCV image (BGR) back to PIL (RGB)."""
    rgb = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def deskew(gray: np.ndarray) -> np.ndarray:
    """
    Estimate and correct skew angle using the minAreaRect of text pixels.
    Works well for scanned pages that are slightly rotated.
    """
    # Invert so text is white on black for contour detection
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thresh > 0))

    if coords.shape[0] < 20:
        return gray  # not enough signal to estimate skew safely

    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    # Skip correction for negligible angles (avoid over-rotating clean scans)
    if abs(angle) < 0.5:
        return gray

    (h, w) = gray.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )
    return rotated


def denoise(gray: np.ndarray) -> np.ndarray:
    return cv2.fastNlMeansDenoising(gray, h=10)


def adaptive_binarize(gray: np.ndarray) -> np.ndarray:
    return cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=15,
    )


def preprocess_for_ocr(pil_img: Image.Image, do_binarize: bool = False) -> Image.Image:
    """
    Full preprocessing pipeline. Returns a PIL image ready for OCR.

    Note: PaddleOCR's own detector is fairly robust to lighting variation,
    so `do_binarize=False` is usually the safer default -- aggressive
    binarization can sometimes hurt detection on complex/colored documents.
    Turn it on for very low-contrast or heavily shadowed scans (this is also
    turned on automatically for the Tesseract path, which benefits more from it).
    """
    cv_img = pil_to_cv2(pil_img)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    gray = denoise(gray)
    gray = deskew(gray)

    if do_binarize:
        gray = adaptive_binarize(gray)

    # Convert back to 3-channel so downstream OCR libs that expect color don't choke
    result = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    return cv2_to_pil(result)


# ---------------------------------------------------------------------------
# Multi-page / PDF loading
#
# pdf2image was already listed in requirements.txt in the original version
# of this project but never actually used anywhere -- the app only ever
# accepted single JPG/PNG uploads. This wires it up.
# ---------------------------------------------------------------------------

def load_pages(uploaded_file: Union[str, bytes, "io.IOBase"], filename: str = "") -> List[Image.Image]:
    """
    Turn an uploaded file into a list of PIL images, one per page.
    - A plain image (JPG/PNG/...) returns a single-item list.
    - A PDF returns one image per page, in order.

    `uploaded_file` can be a file path, raw bytes, or a file-like object
    (e.g. Streamlit's UploadedFile). `filename` is used to detect the PDF
    case when the object itself doesn't expose a `.name`.
    """
    name = (filename or getattr(uploaded_file, "name", "") or "").lower()

    if hasattr(uploaded_file, "read"):
        data = uploaded_file.read()
    elif isinstance(uploaded_file, (bytes, bytearray)):
        data = bytes(uploaded_file)
    else:
        # Treat as a path
        with open(uploaded_file, "rb") as f:
            data = f.read()
        if not name:
            name = str(uploaded_file).lower()

    if name.endswith(".pdf") or data.startswith(b"%PDF"):
        try:
            from pdf2image import convert_from_bytes
            pages = convert_from_bytes(data)
            return [p.convert("RGB") for p in pages]
        except Exception:
            # Fall back to pypdfium2 which requires no external poppler binary
            try:
                import pypdfium2 as pdfium
                doc = pdfium.PdfDocument(data)
                return [page.render(scale=2).to_pil().convert("RGB") for page in doc]
            except Exception as pdf_err:
                raise RuntimeError(f"Could not convert PDF to images: {pdf_err}")

    return [Image.open(io.BytesIO(data)).convert("RGB")]

