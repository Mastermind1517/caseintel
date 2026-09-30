"""
Tests for logic that depends on heavy libraries NOT installed in this
sandbox (PaddleOCR, torch/transformers, googletrans, deep-translator).
These stub those libraries out via unittest.mock and verify the app's own
routing/fallback/scoring logic -- the part that was actually broken -- is
correct, independent of whether the underlying ML libraries are present.
"""
import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image

from languages import LANGUAGES, OCR_CANDIDATE_LANGUAGES
import ocr_engine
import translate
from ocr_engine import OCRUnavailableError
from translate import TranslationUnavailableError


class TestLanguageTable(unittest.TestCase):
    def test_every_language_has_required_fields(self):
        for key, spec in LANGUAGES.items():
            self.assertEqual(spec.key, key)
            self.assertIn(spec.ocr_engine, ("paddle", "tesseract"))
            self.assertTrue(spec.tesseract_code)
            self.assertTrue(spec.googletrans_code)
            self.assertTrue(spec.indictrans2_code)
            if spec.ocr_engine == "paddle":
                self.assertTrue(spec.paddle_code)

    def test_bengali_is_routed_to_tesseract_not_paddle(self):
        self.assertEqual(LANGUAGES["bengali"].ocr_engine, "tesseract")
        self.assertIsNone(LANGUAGES["bengali"].paddle_code)

    def test_hindi_tamil_telugu_kannada_routed_to_paddle(self):
        for key in ("hindi", "tamil", "telugu", "kannada"):
            self.assertEqual(LANGUAGES[key].ocr_engine, "paddle")
            self.assertIsNotNone(LANGUAGES[key].paddle_code)

    def test_candidate_list_matches_table(self):
        for key in OCR_CANDIDATE_LANGUAGES:
            self.assertIn(key, LANGUAGES)


class TestRunOcrRouting(unittest.TestCase):
    """Confirms run_ocr() dispatches to the correct backend function per
    language, using mocks so no real PaddleOCR/Tesseract call happens."""

    @patch("ocr_engine.run_tesseract_ocr")
    @patch("ocr_engine.run_paddle_ocr")
    def test_hindi_calls_paddle_not_tesseract(self, mock_paddle, mock_tess):
        mock_paddle.return_value = [{"text": "x", "confidence": 0.9, "box": None}]
        results, engine = ocr_engine.run_ocr(MagicMock(), "hindi")
        mock_paddle.assert_called_once()
        mock_tess.assert_not_called()
        self.assertEqual(engine, "PaddleOCR")

    @patch("ocr_engine.run_tesseract_ocr")
    @patch("ocr_engine.run_paddle_ocr")
    def test_bengali_calls_tesseract_not_paddle(self, mock_paddle, mock_tess):
        mock_tess.return_value = [{"text": "x", "confidence": 0.9, "box": None}]
        results, engine = ocr_engine.run_ocr(MagicMock(), "bengali")
        mock_tess.assert_called_once()
        mock_paddle.assert_not_called()
        self.assertEqual(engine, "Tesseract")


class TestDetectLanguage(unittest.TestCase):
    """Verifies the confidence/volume scoring logic picks the right
    language and refuses to guess when nothing scores confidently."""

    def _fake_run_ocr(self, results_by_lang):
        def _run_ocr(img, language, preprocess=True):
            return results_by_lang.get(language, []), "FakeEngine"
        return _run_ocr

    @patch("ocr_engine.run_ocr")
    def test_picks_highest_scoring_language(self, mock_run_ocr):
        mock_run_ocr.side_effect = self._fake_run_ocr({
            "hindi": [{"text": "यह एक लंबा वाक्य है परीक्षण के लिए", "confidence": 0.92, "box": None}],
            "tamil": [{"text": "தமிழ்", "confidence": 0.30, "box": None}],
            "telugu": [],
            "kannada": [],
            "bengali": [],
        })
        best, scores = ocr_engine.detect_language(Image.new('RGB', (100, 100)), preprocess=False)
        self.assertEqual(best, "hindi")
        self.assertGreater(scores["hindi"], scores["tamil"])

    @patch("ocr_engine.run_ocr")
    def test_returns_none_when_nothing_confident(self, mock_run_ocr):
        mock_run_ocr.side_effect = self._fake_run_ocr({
            "hindi": [], "tamil": [], "telugu": [], "kannada": [], "bengali": [],
        })
        best, scores = ocr_engine.detect_language(Image.new('RGB', (100, 100)), preprocess=False)
        self.assertIsNone(best)

    @patch("ocr_engine.run_ocr")
    def test_low_volume_lucky_match_does_not_win(self, mock_run_ocr):
        # 2 confident characters in the WRONG language should not beat a
        # long, moderately confident passage in the RIGHT language.
        mock_run_ocr.side_effect = self._fake_run_ocr({
            "hindi": [{"text": "यह एक अनुच्छेद है जिसमें बहुत सारा पाठ है", "confidence": 0.55, "box": None}],
            "tamil": [{"text": "ஆ", "confidence": 0.99, "box": None}],
            "telugu": [], "kannada": [], "bengali": [],
        })
        best, scores = ocr_engine.detect_language(Image.new('RGB', (100, 100)), preprocess=False)
        self.assertEqual(best, "hindi")

    @patch("ocr_engine.run_ocr")
    def test_missing_engine_for_one_language_does_not_crash_detection(self, mock_run_ocr):
        def _run_ocr(img, language, preprocess=True):
            if language == "bengali":
                raise OCRUnavailableError("tesseract-ocr-ben not installed")
            return [{"text": "यह एक परीक्षण वाक्य है", "confidence": 0.8, "box": None}], "FakeEngine"
        mock_run_ocr.side_effect = _run_ocr

        best, scores = ocr_engine.detect_language(Image.new('RGB', (100, 100)), preprocess=False)
        self.assertNotIn("bengali", scores)
        self.assertIsNotNone(best)


class TestTranslateFallbackChain(unittest.TestCase):
    """The core fix for 'googletrans is unstable': confirms deep-translator
    is used automatically when googletrans raises, and that total failure
    is surfaced clearly rather than swallowed."""

    @patch("translate.translate_with_deep_translator")
    @patch("translate.translate_with_googletrans")
    def test_falls_back_to_deep_translator_when_googletrans_raises(self, mock_gt, mock_dt):
        mock_gt.side_effect = RuntimeError("googletrans broke (simulated)")
        mock_dt.return_value = "hello world"

        result = translate.translate_text("नमस्ते दुनिया", source_lang="hindi", backend="google")

        mock_gt.assert_called_once()
        mock_dt.assert_called_once()
        self.assertEqual(result, "hello world")

    @patch("translate.translate_with_deep_translator")
    @patch("translate.translate_with_googletrans")
    def test_uses_googletrans_directly_when_it_works(self, mock_gt, mock_dt):
        mock_gt.return_value = "hello world"

        result = translate.translate_text("नमस्ते दुनिया", source_lang="hindi", backend="google")

        mock_gt.assert_called_once()
        mock_dt.assert_not_called()
        self.assertEqual(result, "hello world")

    @patch("translate.translate_with_deep_translator")
    @patch("translate.translate_with_googletrans")
    def test_raises_clear_error_when_both_backends_fail(self, mock_gt, mock_dt):
        mock_gt.side_effect = RuntimeError("googletrans down")
        mock_dt.side_effect = RuntimeError("deep-translator down")

        with self.assertRaises(TranslationUnavailableError) as ctx:
            translate.translate_text("x", source_lang="hindi", backend="google")

        msg = str(ctx.exception)
        self.assertIn("googletrans", msg)
        self.assertIn("deep-translator", msg)

    def test_chunking_respects_max_chars(self):
        text = "\n".join(f"line {i} " + "x" * 100 for i in range(200))
        chunks = translate._chunk_text(text, max_chars=1000)
        self.assertGreater(len(chunks), 1)
        for c in chunks:
            self.assertLessEqual(len(c), 1000 + 120)  # allow one line's slack


if __name__ == "__main__":
    unittest.main(verbosity=2)
