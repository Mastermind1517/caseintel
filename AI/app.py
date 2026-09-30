"""
app.py
Streamlit demo: upload a scanned document (image or PDF) -> OCR (native
script) -> translate to English.

Run with:
    streamlit run app.py
"""

import time
import traceback

import streamlit as st

from languages import LANGUAGES, OCR_CANDIDATE_LANGUAGES
from preprocess import load_pages
from ocr_engine import run_ocr, ocr_to_plain_text, average_confidence, detect_language, OCRUnavailableError
from translate import translate_text, TranslationUnavailableError

st.set_page_config(page_title="Indic OCR + Translator", layout="wide")

st.title("📄 Indic Document OCR + Translator")
st.caption(
    "Upload a scanned document (image or PDF) in an Indian language — get the extracted "
    "text and its English translation."
)

with st.expander("ℹ️ Project status — what's real vs. what's still rough", expanded=False):
    st.markdown(
        """
- **Auto-detect language** is a heuristic: it runs a fast OCR pass with every
  candidate language and picks whichever one produced the most confident
  text. It is not a trained script classifier. It fails closed — if no
  language scores confidently, it says so and asks you to pick manually,
  rather than guessing.
- **Bengali** is not supported by PaddleOCR, so it's automatically routed
  through Tesseract instead (you'll see this in the "Engine used" line
  below). Accuracy is generally lower than the PaddleOCR-backed languages.
- **Translation** defaults to Google Translate, tried via two independent
  libraries (googletrans, then deep-translator as an automatic fallback).
  Neither is an official Google API; both can occasionally be wrong or slow.
  IndicTrans2 is available as a heavier, fully-offline alternative.
- **If OCR or translation fails live**, this app shows a clearly labeled
  placeholder instead of pretending it worked — see the red banner if that
  happens, and the "technical details" expander under it for the real error.
- **No PDF form-field or handwriting support.** This is for printed text on
  a scan or photo.
        """
    )

with st.sidebar:
    st.header("Settings")

    language_options = ["auto"] + [LANGUAGES[k].label for k in OCR_CANDIDATE_LANGUAGES]
    language_choice = st.selectbox(
        "Document language",
        options=language_options,
        index=0,
        format_func=lambda x: "Auto-detect" if x == "auto" else x,
        help=(
            "Auto-detect runs a quick OCR pass in every language and picks the "
            "best-scoring one — it's a heuristic, not guaranteed. Bengali runs "
            "through Tesseract (PaddleOCR doesn't support it); everything else "
            "runs through PaddleOCR."
        ),
    )
    # Map the display label back to the internal key ("auto" stays "auto")
    label_to_key = {LANGUAGES[k].label: k for k in OCR_CANDIDATE_LANGUAGES}
    language_key = "auto" if language_choice == "auto" else label_to_key[language_choice]

    backend = st.selectbox(
        "Translation backend",
        options=["google", "indictrans2"],
        index=0,
        format_func=lambda x: "Google Translate (fast, recommended)" if x == "google" else "IndicTrans2 (offline, heavier, slower)",
        help=(
            "'google' automatically falls back from googletrans to deep-translator "
            "if the first one errors — see the project status panel above."
        ),
    )
    do_preprocess = st.checkbox("Apply image preprocessing (denoise/deskew)", value=True)
    min_conf = st.slider("Minimum OCR line confidence", 0.0, 1.0, 0.5, 0.05)

uploaded_file = st.file_uploader(
    "Upload a document (JPG/PNG/PDF)", type=["jpg", "jpeg", "png", "pdf"]
)

# Kept as a LAST-RESORT visual placeholder if live OCR/translation genuinely
# breaks mid-demo. Unlike the original version, this is never swapped in
# silently: it's shown in a clearly labeled red banner with the real error
# underneath, so nobody mistakes it for a real result.
DEMO_FALLBACK = {
    "native_text": "(placeholder — not from your document) यह एक नमूना दस्तावेज़ है।",
    "english_text": "(placeholder — not from your document) This is a sample document.",
}


def process_page(image, language_key, backend, do_preprocess, min_conf, page_label=""):
    prefix = f"{page_label}: " if page_label else ""

    with st.spinner(f"{prefix}Running OCR..."):
        t0 = time.time()
        if language_key == "auto":
            detected, scores = detect_language(image, preprocess=do_preprocess)
            if detected is None:
                st.warning(
                    f"{prefix}Couldn't confidently auto-detect the language "
                    f"(scores: {scores}). Please pick it manually in the sidebar."
                )
                return
            resolved_language = detected
            st.caption(f"{prefix}Auto-detected: **{LANGUAGES[detected].label}** (scores: {scores})")
        else:
            resolved_language = language_key

        ocr_results, engine_used = run_ocr(image, language=resolved_language, preprocess=do_preprocess)
        native_text = ocr_to_plain_text(ocr_results, min_confidence=min_conf)
        conf = average_confidence(ocr_results)
        ocr_time = time.time() - t0

    col1, col2 = st.columns(2)
    with col1:
        st.subheader(f"{prefix}Original")
        st.image(image, use_container_width=True)
    with col2:
        st.subheader(f"{prefix}Extracted Text ({LANGUAGES[resolved_language].label})")
        st.text_area("OCR output", native_text, height=180, key=f"ocr_{page_label}")
        st.caption(f"Engine used: **{engine_used}** | Avg. confidence: {conf:.2%} | OCR time: {ocr_time:.1f}s")

    if not native_text.strip():
        st.warning(
            f"{prefix}No text detected above the confidence threshold. "
            "Try lowering the confidence slider or check image quality."
        )
        return

    with st.spinner(f"{prefix}Translating to English..."):
        t0 = time.time()
        english_text = translate_text(native_text, source_lang=resolved_language, backend=backend)
        translate_time = time.time() - t0

    st.subheader(f"{prefix}English Translation")
    st.text_area("Translation output", english_text, height=180, key=f"tr_{page_label}")
    st.caption(f"Translation time: {translate_time:.1f}s (backend: {backend})")


if uploaded_file is not None:
    try:
        pages = load_pages(uploaded_file, filename=uploaded_file.name)
    except Exception as e:
        st.error(f"Couldn't read that file: {e}")
        pages = []

    if len(pages) > 1:
        st.info(f"Loaded {len(pages)} pages from this PDF — each is processed separately below.")

    if pages and st.button("Run OCR + Translate", type="primary"):
        for i, page_image in enumerate(pages, start=1):
            page_label = f"Page {i}" if len(pages) > 1 else ""
            st.divider() if i > 1 else None
            try:
                process_page(page_image, language_key, backend, do_preprocess, min_conf, page_label)
            except (OCRUnavailableError, TranslationUnavailableError) as e:
                st.error(f"🔴 {page_label + ': ' if page_label else ''}{e}")
                st.info(
                    "Falling back to a pre-loaded placeholder so the flow is still "
                    "visible — **this is NOT real output from your document.**"
                )
                st.text_area("OCR output (PLACEHOLDER)", DEMO_FALLBACK["native_text"], height=100, key=f"fallback_ocr_{i}")
                st.text_area("Translation output (PLACEHOLDER)", DEMO_FALLBACK["english_text"], height=100, key=f"fallback_tr_{i}")
                with st.expander("Technical details (for when a judge asks 'did that actually work?')"):
                    st.code(traceback.format_exc())
            except Exception as e:
                st.error(f"🔴 Something unexpected went wrong{': ' + page_label if page_label else ''}: {e}")
                st.info(
                    "Falling back to a pre-loaded placeholder so the flow is still "
                    "visible — **this is NOT real output from your document.**"
                )
                st.text_area("OCR output (PLACEHOLDER)", DEMO_FALLBACK["native_text"], height=100, key=f"fallback_ocr_{i}")
                st.text_area("Translation output (PLACEHOLDER)", DEMO_FALLBACK["english_text"], height=100, key=f"fallback_tr_{i}")
                with st.expander("Technical details (for when a judge asks 'did that actually work?')"):
                    st.code(traceback.format_exc())
else:
    st.info("Upload a document image or PDF to get started, or check the sidebar to configure language/backend.")
