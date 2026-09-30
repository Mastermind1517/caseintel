"""
languages.py
Single source of truth for which languages this app supports, which OCR
engine actually handles each one, and the codes each downstream library
(PaddleOCR, Tesseract, googletrans / deep-translator, IndicTrans2) expects.

Why this file exists
---------------------
The original version of this project had four separate {name: code} dicts
scattered across ocr_engine.py and translate.py. Bengali was added to two of
them (Tesseract + translation) but never to anything that decided *which OCR
engine to call* -- so selecting "Bengali" in the UI silently ran it through
PaddleOCR (which does not support Bengali; confirmed against PaddleOCR's own
supported-language tables, where Bengali is absent from every model group,
including the Devanagari one) and produced empty or garbage output with no
error at all.

Keeping every language's full routing info in one table makes that class of
bug structurally harder to reintroduce: add a language once, here, and every
part of the app (OCR routing, auto-detect, translation) picks it up.
"""

from dataclasses import dataclass
from typing import Optional, Dict


@dataclass(frozen=True)
class LanguageSpec:
    key: str                      # internal key used throughout the app, e.g. "bengali"
    label: str                    # human-readable label for the UI, e.g. "Bengali"
    ocr_engine: str               # "paddle" or "tesseract" -- which backend actually supports this script
    paddle_code: Optional[str]    # PaddleOCR --lang code, only set when ocr_engine == "paddle"
    tesseract_code: str           # tesseract-ocr language pack code (always set: used for Bengali AND as a manual fallback)
    googletrans_code: str         # ISO 639-1 code -- used by both googletrans and deep-translator
    indictrans2_code: str         # FLORES-200 style code IndicTrans2 expects


LANGUAGES: Dict[str, LanguageSpec] = {
    "hindi":   LanguageSpec("hindi",   "Hindi",   "paddle",     "hi",   "hin", "hi", "hin_Deva"),
    "tamil":   LanguageSpec("tamil",   "Tamil",   "paddle",     "ta",   "tam", "ta", "tam_Taml"),
    "telugu":  LanguageSpec("telugu",  "Telugu",  "paddle",     "te",   "tel", "te", "tel_Telu"),
    "kannada": LanguageSpec("kannada", "Kannada", "paddle",     "ka",   "kan", "kn", "kan_Knda"),
    # Bengali is NOT in PaddleOCR's model zoo (checked against the current
    # PP-OCRv5 supported-language table: it isn't listed under any script
    # group, including Devanagari). It is routed to Tesseract instead --
    # this is enforced by ocr_engine.run_ocr(), not left to the caller.
    "bengali": LanguageSpec("bengali", "Bengali", "tesseract",  None,   "ben", "bn", "ben_Beng"),
    "english": LanguageSpec("english", "English", "paddle",     "en",   "eng", "en", "eng_Latn"),
}

# Languages offered for OCR + auto-detect in the UI. "english" is excluded
# here -- it's a translation target / mixed-script helper, not something a
# user is scanning a "document written in English" for in this app's context.
OCR_CANDIDATE_LANGUAGES = ["hindi", "tamil", "telugu", "kannada", "bengali"]
