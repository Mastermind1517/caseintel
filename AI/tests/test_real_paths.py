"""
Tests that exercise REAL code paths using whatever is actually installed
in this environment (no PaddleOCR/torch/googletrans here — see
test_mocked_paths.py for those, which stub the heavy libraries out).

What IS genuinely installed and tested for real, no mocks:
  - opencv/numpy/PIL preprocessing pipeline
  - poppler + pdf2image (multi-page PDF splitting)
  - the tesseract binary + English language pack (via pytesseract)
  - the Bengali-language-pack-missing error path (ben pack is NOT
    installed here, so this genuinely exercises the "OCR fails loudly with
    an actionable message" behavior rather than mocking success)
"""
import io
import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image, ImageDraw

from preprocess import preprocess_for_ocr, load_pages
from ocr_engine import run_tesseract_ocr, run_ocr, OCRUnavailableError, ocr_to_plain_text, average_confidence


def make_text_image(text="TEST 123", size=(400, 120)):
    img = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(img)
    draw.text((15, 40), text, fill="black")
    return img


class TestPreprocess(unittest.TestCase):
    def test_preprocess_pipeline_runs_and_preserves_size(self):
        img = make_text_image()
        out = preprocess_for_ocr(img, do_binarize=False)
        self.assertEqual(out.size, img.size)
        self.assertEqual(out.mode, "RGB")

    def test_preprocess_pipeline_with_binarize(self):
        img = make_text_image()
        out = preprocess_for_ocr(img, do_binarize=True)
        self.assertEqual(out.size, img.size)


class TestLoadPagesReal(unittest.TestCase):
    def test_single_image_returns_one_page(self):
        img = make_text_image()
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        pages = load_pages(buf, filename="scan.png")
        self.assertEqual(len(pages), 1)
        self.assertEqual(pages[0].mode, "RGB")

    def test_multipage_pdf_splits_into_real_pages(self):
        # Build a genuine 3-page PDF in memory (PIL can save multi-page PDFs
        # directly) and confirm pdf2image/poppler actually splits it back out.
        pages_in = [make_text_image(f"PAGE {i}") for i in range(1, 4)]
        buf = io.BytesIO()
        pages_in[0].save(buf, format="PDF", save_all=True, append_images=pages_in[1:])
        buf.seek(0)

        pages_out = load_pages(buf, filename="doc.pdf")
        self.assertEqual(len(pages_out), 3)
        for p in pages_out:
            self.assertEqual(p.mode, "RGB")


class TestTesseractRealEngine(unittest.TestCase):
    def test_tesseract_english_reads_real_text(self):
        # 'english' is only installed with the 'eng' tesseract pack in this
        # sandbox -- call run_tesseract_ocr directly (bypassing PaddleOCR
        # routing) to prove the new list-of-dicts return shape is correctly
        # built from real pytesseract output, not mocked.
        img = make_text_image("HELLO WORLD")
        results = run_tesseract_ocr(img, language="english", preprocess=True)

        self.assertIsInstance(results, list)
        self.assertTrue(len(results) > 0)
        for r in results:
            self.assertIn("text", r)
            self.assertIn("confidence", r)
            self.assertIn("box", r)
            self.assertTrue(0.0 <= r["confidence"] <= 1.0)

        text = ocr_to_plain_text(results, min_confidence=0.0)
        self.assertIn("HELLO", text.upper())

        conf = average_confidence(results)
        self.assertGreater(conf, 0.0)

    def test_bengali_routes_to_tesseract_and_fails_loudly_when_pack_missing(self):
        # This sandbox has NO Bengali tesseract language pack installed.
        # This is a genuine (non-mocked) test of the actual fix: selecting
        # Bengali must go through run_ocr() -> Tesseract (never PaddleOCR),
        # and when the language pack is missing it must raise a clear,
        # actionable OCRUnavailableError -- not silently return empty text
        # or crash with a raw pytesseract stack trace.
        img = make_text_image("BENGALI TEXT")
        with self.assertRaises(OCRUnavailableError) as ctx:
            run_ocr(img, language="bengali", preprocess=True)
        msg = str(ctx.exception)
        self.assertIn("tesseract-ocr-ben", msg)


if __name__ == "__main__":
    unittest.main(verbosity=2)
