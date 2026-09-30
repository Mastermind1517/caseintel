"""
translate.py
Translates extracted native-script text into English.

Backends
--------
"google" (default, recommended for a live demo):
    Tries googletrans first (free, zero setup), and if it raises ANYTHING --
    which it does periodically, since it's a reverse-engineered wrapper
    around Google Translate's internal web API and breaks whenever Google
    changes something server-side, with no warning and no version bump --
    automatically falls back to deep-translator's GoogleTranslator, an
    independently maintained wrapper around the same public endpoint. Only
    raises TranslationUnavailableError if BOTH fail, and that error lists
    both underlying failures. This is the fix for "googletrans is unstable":
    instead of "test it in advance and hope", the app now has a real second
    path that fires automatically mid-demo if the first one breaks.

"indictrans2":
    AI4Bharat's IndicTrans2 model via HuggingFace transformers. Indic-
    specialized, fully offline once downloaded, heavier to install and
    slower on CPU. Called directly with no fallback -- if you explicitly
    asked for the offline model, silently swapping in a different one
    without telling you would be its own kind of dishonesty.
"""

from functools import lru_cache
from typing import List

from languages import LANGUAGES


class TranslationUnavailableError(RuntimeError):
    """Raised only when every backend we tried failed. The message lists
    what was tried and why, so a failure is never silently swallowed into
    a fake-looking success."""


def _require_language(source_lang: str):
    if source_lang not in LANGUAGES:
        raise ValueError(f"Unknown language '{source_lang}'. Choose from {list(LANGUAGES)}")
    return LANGUAGES[source_lang]


def _chunk_text(text: str, max_chars: int = 4000) -> List[str]:
    """
    Google's translate endpoints (both googletrans and deep-translator go
    through the same underlying service) reject very long single requests.
    Split on line breaks first, so OCR line structure survives, packing
    lines into chunks that stay under max_chars.
    """
    lines = text.split("\n")
    chunks, current, current_len = [], [], 0
    for line in lines:
        if current and current_len + len(line) + 1 > max_chars:
            chunks.append("\n".join(current))
            current, current_len = [], 0
        current.append(line)
        current_len += len(line) + 1
    if current:
        chunks.append("\n".join(current))
    return chunks or [""]


# ---------------------------------------------------------------------------
# Backend: googletrans
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_googletrans_translator():
    from googletrans import Translator  # imported lazily
    return Translator()


def translate_with_googletrans(text: str, source_lang: str) -> str:
    if not text.strip():
        return ""
    spec = _require_language(source_lang)
    translator = _get_googletrans_translator()
    out = []
    for chunk in _chunk_text(text):
        if not chunk.strip():
            out.append("")
            continue
        result = translator.translate(chunk, src=spec.googletrans_code, dest="en")
        out.append(result.text)
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Backend: deep-translator -- the automatic fallback (see module docstring)
# ---------------------------------------------------------------------------

def translate_with_deep_translator(text: str, source_lang: str) -> str:
    if not text.strip():
        return ""
    spec = _require_language(source_lang)
    from deep_translator import GoogleTranslator  # imported lazily

    out = []
    for chunk in _chunk_text(text, max_chars=4500):
        if not chunk.strip():
            out.append("")
            continue
        out.append(GoogleTranslator(source=spec.googletrans_code, target="en").translate(chunk))
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Backend: IndicTrans2 (AI4Bharat) via HuggingFace transformers
# Model: ai4bharat/indictrans2-indic-en-dist-200M (smaller/faster variant)
# ---------------------------------------------------------------------------

_indictrans2_cache = {}


def _load_indictrans2():
    if "model" in _indictrans2_cache:
        return _indictrans2_cache["model"], _indictrans2_cache["tokenizer"], _indictrans2_cache["processor"]

    try:
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        # IndicTransToolkit handles the language-tag preprocessing IndicTrans2 needs.
        from IndicTransToolkit.processor import IndicProcessor
    except ImportError as e:
        raise TranslationUnavailableError(
            "IndicTrans2 backend needs extra packages. Run: pip install torch transformers "
            "sentencepiece sacremoses IndicTransToolkit"
        ) from e

    model_name = "ai4bharat/indictrans2-indic-en-dist-200M"
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name, trust_remote_code=True)
    processor = IndicProcessor(inference=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device).eval()

    _indictrans2_cache.update(
        {"model": model, "tokenizer": tokenizer, "processor": processor, "device": device}
    )
    return model, tokenizer, processor


def translate_with_indictrans2(text: str, source_lang: str) -> str:
    if not text.strip():
        return ""
    spec = _require_language(source_lang)
    model, tokenizer, processor = _load_indictrans2()
    device = _indictrans2_cache["device"]

    segments = [line for line in text.split("\n") if line.strip()]
    if not segments:
        return ""

    batch = processor.preprocess_batch(segments, src_lang=spec.indictrans2_code, tgt_lang="eng_Latn")
    inputs = tokenizer(batch, padding=True, truncation=True, return_tensors="pt").to(device)

    import torch
    with torch.no_grad():
        generated = model.generate(**inputs, max_length=256, num_beams=5, early_stopping=True)

    decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)
    translations = processor.postprocess_batch(decoded, lang="eng_Latn")
    return "\n".join(translations)


# ---------------------------------------------------------------------------
# Unified entry point
# ---------------------------------------------------------------------------

def translate_text(text: str, source_lang: str, backend: str = "google") -> str:
    """
    backend="google": googletrans, then deep-translator automatically if
    googletrans raises anything at all. Raises TranslationUnavailableError
    (with both underlying errors) only if both fail -- never silently
    returns a placeholder.
    backend="indictrans2": calls IndicTrans2 directly, no fallback.
    """
    if backend == "google":
        errors = []
        try:
            return translate_with_googletrans(text, source_lang)
        except Exception as e:
            errors.append(f"googletrans: {e}")
        try:
            return translate_with_deep_translator(text, source_lang)
        except Exception as e:
            errors.append(f"deep-translator: {e}")
        raise TranslationUnavailableError(
            "Both Google Translate backends failed -- " + " | ".join(errors)
        )
    elif backend == "indictrans2":
        return translate_with_indictrans2(text, source_lang)
    else:
        raise ValueError(f"Unknown backend '{backend}'. Use 'google' or 'indictrans2'.")
