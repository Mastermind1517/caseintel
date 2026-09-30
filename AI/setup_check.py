#!/usr/bin/env python3
"""
setup_check.py
Run this TODAY, on the actual laptop you're demoing from — not the night
before judging.

A plain `pip install -r requirements.txt` tells you nothing about whether
the app actually works: PaddleOCR downloads model weights the first time
it runs (needs internet, silently fails or hangs on bad wifi), and it's
easy to have the tesseract *binary* installed without the specific Indic
*language packs* it needs. This script exercises every real path on a
synthetic test image so those problems show up now, with time to fix them.

Usage:
    python3 setup_check.py
    python3 setup_check.py --include-translation    # also live-calls both translate backends
    python3 setup_check.py --include-indictrans2    # also downloads/tests the heavy offline model
"""
import argparse
import shutil
import subprocess
import sys
import time

from PIL import Image, ImageDraw


def make_test_image(text="TEST 123", size=(400, 100)) -> Image.Image:
    img = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(img)
    draw.text((10, 35), text, fill="black")
    return img


def check(name, fn):
    print(f"\n--- {name} ---")
    t0 = time.time()
    try:
        detail = fn()
        dt = time.time() - t0
        print(f"[PASS] {name} ({dt:.1f}s)" + (f" -- {detail}" if detail else ""))
        return True
    except Exception as e:
        dt = time.time() - t0
        print(f"[FAIL] {name} ({dt:.1f}s): {e}")
        return False


def check_paddleocr():
    import numpy as np
    from paddleocr import PaddleOCR

    ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    img = np.array(make_test_image())
    result = ocr.ocr(img, cls=True)
    texts = [t for _, (t, _c) in (result[0] or [])]
    if not texts:
        raise RuntimeError("PaddleOCR ran but read no text off a clean synthetic image")
    return f"read: {texts}"


def check_tesseract_binary():
    path = shutil.which("tesseract")
    if not path:
        raise RuntimeError("tesseract binary not on PATH. Install: sudo apt install tesseract-ocr")
    out = subprocess.run([path, "--list-langs"], capture_output=True, text=True)
    langs = [l.strip() for l in out.stdout.splitlines()[1:] if l.strip()]
    needed = {"hin": "Hindi", "ben": "Bengali", "tam": "Tamil", "tel": "Telugu", "kan": "Kannada"}
    missing = [f"tesseract-ocr-{code}" for code in needed if code not in langs]
    if missing:
        raise RuntimeError(
            f"Missing language packs: {', '.join(missing)}. Install: sudo apt install {' '.join(missing)}"
        )
    return f"installed langs: {langs}"


def check_pytesseract():
    import pytesseract

    text = pytesseract.image_to_string(make_test_image(), lang="eng")
    if "TEST" not in text.upper():
        raise RuntimeError(f"Tesseract ran but misread the test image (got {text!r})")
    return f"read: {text.strip()!r}"


def check_pdf2image():
    from pdf2image import convert_from_bytes
    import io

    img = make_test_image()
    buf = io.BytesIO()
    img.save(buf, format="PDF")
    pages = convert_from_bytes(buf.getvalue())
    if len(pages) != 1:
        raise RuntimeError(f"expected 1 page back, got {len(pages)}")
    return "poppler + pdf2image working"


def check_googletrans():
    from googletrans import Translator

    result = Translator().translate("नमस्ते", src="hi", dest="en")
    return f"'नमस्ते' -> {result.text!r}"


def check_deep_translator():
    from deep_translator import GoogleTranslator

    result = GoogleTranslator(source="hi", target="en").translate("नमस्ते")
    return f"'नमस्ते' -> {result!r}"


def check_indictrans2():
    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    from IndicTransToolkit.processor import IndicProcessor

    name = "ai4bharat/indictrans2-indic-en-dist-200M"
    tok = AutoTokenizer.from_pretrained(name, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(name, trust_remote_code=True)
    proc = IndicProcessor(inference=True)
    batch = proc.preprocess_batch(["नमस्ते"], src_lang="hin_Deva", tgt_lang="eng_Latn")
    inputs = tok(batch, padding=True, truncation=True, return_tensors="pt")
    out = model.generate(**inputs, max_length=64, num_beams=5)
    decoded = tok.batch_decode(out, skip_special_tokens=True)
    text = proc.postprocess_batch(decoded, lang="eng_Latn")
    return f"'नमस्ते' -> {text!r}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--include-translation", action="store_true")
    parser.add_argument("--include-indictrans2", action="store_true")
    args = parser.parse_args()

    results = {
        "PaddleOCR (downloads model weights on first run)": check("PaddleOCR", check_paddleocr),
        "Tesseract binary + language packs": check("Tesseract binary", check_tesseract_binary),
        "pytesseract": check("pytesseract", check_pytesseract),
        "pdf2image + poppler": check("pdf2image", check_pdf2image),
    }

    if args.include_translation:
        results["googletrans"] = check("googletrans", check_googletrans)
        results["deep-translator"] = check("deep-translator", check_deep_translator)

    if args.include_indictrans2:
        results["IndicTrans2 (downloads ~200M model)"] = check("IndicTrans2", check_indictrans2)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    all_ok = True
    for name, ok in results.items():
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
        all_ok = all_ok and ok

    print("\nReady for demo:", "YES" if all_ok else "NO -- fix the FAILs above before demo day")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
