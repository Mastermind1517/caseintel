# Indic OCR + Translator (Hackathon Prototype)

Scans a document image or PDF in an Indian language, extracts the text (OCR),
and translates it into English.

## Day-0 checklist — do this today, not the night before judging

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# System packages this app needs (Debian/Ubuntu):
sudo apt install tesseract-ocr tesseract-ocr-hin tesseract-ocr-ben \
                 tesseract-ocr-tam tesseract-ocr-tel tesseract-ocr-kan \
                 poppler-utils

# Then run this BEFORE demo day. It forces PaddleOCR's first-run model
# download to happen now (needs internet, ~10-100MB per language), and
# actually runs OCR + PDF-splitting on synthetic test images to confirm
# the whole pipeline works end-to-end, not just that imports succeed:
python3 setup_check.py --include-translation

# Optional: only if you plan to demo the offline IndicTrans2 backend
python3 setup_check.py --include-indictrans2

# Then run the app
streamlit run app.py
```

Open the URL Streamlit prints (usually http://localhost:8501).

If `setup_check.py` reports any `[FAIL]`, it tells you exactly which `pip`
or `apt` command fixes it. Get everything to `[PASS]` before you're relying
on this in front of judges.

## What's inside

| File | Purpose |
|---|---|
| `languages.py` | Single source of truth: which OCR engine + which language codes each library needs, per language |
| `preprocess.py` | Image cleanup (denoise/deskew/binarize) + turning an uploaded image *or PDF* into a list of pages |
| `ocr_engine.py` | Unified OCR: routes each language to PaddleOCR or Tesseract automatically, plus auto-detect |
| `translate.py` | Translation: Google Translate (googletrans, auto-falls back to deep-translator) or IndicTrans2 |
| `app.py` | Streamlit UI tying it all together |
| `setup_check.py` | Day-0 script: forces model downloads now and verifies every path on synthetic test images |
| `tests/` | Automated tests — real (non-mocked) tests for what's installed, mocked tests for the routing/fallback logic |

## What changed from the original prototype, and why

- **Bengali actually works now (via Tesseract) instead of silently failing.**
  PaddleOCR does not support Bengali (confirmed against its own supported-
  language tables — it's absent from every script group, including
  Devanagari). The original code had a Tesseract fallback function defined
  in `ocr_engine.py`, but `app.py` never called it — selecting "Bengali" in
  the UI ran it through PaddleOCR anyway. `languages.py` now declares which
  engine each language actually needs, and `ocr_engine.run_ocr()` enforces
  that routing, so this class of bug can't silently reappear when a new
  language is added. The UI now also shows which engine ran ("PaddleOCR" vs
  "Tesseract") so it's never a mystery. Also: `pytesseract` was imported by
  the old `ocr_engine.py` but was never in `requirements.txt`, so the
  fallback wasn't even pip-installable as shipped — fixed.
- **Language auto-detection**, as an "Auto-detect" option in the language
  dropdown. It's a heuristic (runs a fast OCR pass in every candidate
  language on a downscaled image and scores each by confidence × amount of
  text found), not a trained classifier — and it's labeled as such in the
  app. It fails closed: if nothing scores confidently, it tells the user to
  pick manually instead of guessing wrong with false confidence.
- **googletrans instability now has a real fallback, not just a warning.**
  `translate_text(..., backend="google")` tries googletrans first, and
  automatically retries via `deep-translator`'s `GoogleTranslator` (an
  independently maintained wrapper around the same endpoint) if googletrans
  raises anything. Only raises an error to the user if *both* fail, and that
  error names both underlying failures. `IndicTrans2` is still there as a
  fully offline option if you want a backend not dependent on either.
- **Multi-page PDF support.** `pdf2image` was already a dependency in the
  original `requirements.txt` but never actually used. `preprocess.load_pages()`
  now splits an uploaded PDF into one image per page; the app processes each
  page and shows results separately. Plain JPG/PNG uploads still work as before.
- **The demo safety net is now honest.** If OCR or translation genuinely
  fails live, the app shows a clearly labeled red banner — "this is NOT real
  output from your document" — with the actual error available in a
  "technical details" expander, instead of quietly showing placeholder text
  that looks identical to a real result.

## Known limitations (mention to judges as "next steps")

- **Auto-detect is a heuristic**, not a trained language-ID model — it can
  be wrong on very short or very noisy documents, and costs a few extra
  seconds since it runs OCR once per candidate language.
- **Bengali accuracy is generally lower** than the PaddleOCR-backed
  languages, since it runs through general-purpose Tesseract rather than a
  script-specific deep model.
- **IndicTrans2 still needs manual extra setup** (`pip install
  IndicTransToolkit`) and is slower on CPU — kept as an optional, fully
  offline upgrade path over the Google Translate default.
- **No handwriting support**, and no PDF form-field extraction — this is for
  printed text on a scan or photo.
- **Neither Google Translate path is an official API** — both googletrans
  and deep-translator go through Google Translate's public web interface,
  which can rate-limit or occasionally change behavior. The two together
  cover most single-point failures, not all of them.
