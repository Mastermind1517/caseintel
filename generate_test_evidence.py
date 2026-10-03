#!/usr/bin/env python3
"""
generate_test_evidence.py
Generates controlled, high-fidelity fictional legal test documents
in PNG, PDF, and TXT formats for the CaseIntel verification and OCR platform.
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_evidence")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Select best available fonts
def get_fonts(title_size=24, header_size=18, body_size=14, mono_size=13):
    font_paths = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    font_file = None
    for fp in font_paths:
        if os.path.exists(fp):
            font_file = fp
            break

    if font_file:
        try:
            return {
                "title": ImageFont.truetype(font_file, title_size),
                "header": ImageFont.truetype(font_file, header_size),
                "body": ImageFont.truetype(font_file, body_size),
                "body_bold": ImageFont.truetype(font_file, body_size),
                "mono": ImageFont.truetype(font_file, mono_size),
            }
        except Exception:
            pass

    # Fallback to default
    default = ImageFont.load_default()
    return {
        "title": default,
        "header": default,
        "body": default,
        "body_bold": default,
        "mono": default,
    }


def get_hindi_font(size=18):
    paths = [
        "/System/Library/Fonts/Kohinoor.ttc",
        "/System/Library/Fonts/Supplemental/DevanagariMT.ttc",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return None


# ----------------------------------------------------------------------
# 1. Helper to render a formal legal letterhead document into PIL Image
# ----------------------------------------------------------------------
def render_legal_sheet(
    title: str,
    subtitle: str,
    meta_pairs: list,
    narrative_paragraphs: list,
    signature_block: tuple,
    badge_label: str = "OFFICIAL RECORD",
    accent_color: tuple = (30, 41, 59),
    width: int = 1200,
    height: int = 1500,
):
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    fonts = get_fonts(title_size=28, header_size=18, body_size=16, mono_size=14)

    # Clean border margin
    margin = 60
    draw.rectangle(
        [(margin, margin), (width - margin, height - margin)],
        outline=(203, 213, 225),
        width=2,
    )
    draw.rectangle(
        [(margin + 6, margin + 6), (width - margin - 6, height - margin - 6)],
        outline=(226, 232, 240),
        width=1,
    )

    # Header Bar
    draw.rectangle([(margin + 7, margin + 7), (width - margin - 7, margin + 45)], fill=(248, 250, 252))
    draw.text(
        (margin + 20, margin + 18),
        badge_label.upper(),
        fill=(100, 116, 139),
        font=fonts["mono"],
    )
    draw.text(
        (width - margin - 220, margin + 18),
        "CASEINTEL SECURE VAULT",
        fill=(100, 116, 139),
        font=fonts["mono"],
    )

    y = margin + 70

    # Title & Subtitle
    draw.text((margin + 30, y), title, fill=accent_color, font=fonts["title"])
    y += 40
    draw.text((margin + 30, y), subtitle, fill=(100, 116, 139), font=fonts["header"])
    y += 35

    # Divider line
    draw.line([(margin + 30, y), (width - margin - 30, y)], fill=(226, 232, 240), width=2)
    y += 25

    # Key Meta Grid Box
    box_top = y
    box_bottom = y + (len(meta_pairs) * 32) + 20
    draw.rectangle([(margin + 30, box_top), (width - margin - 30, box_bottom)], fill=(248, 250, 252), outline=(226, 232, 240), width=1)

    my = box_top + 12
    for label, val in meta_pairs:
        draw.text((margin + 50, my), f"{label}:", fill=(100, 116, 139), font=fonts["mono"])
        draw.text((margin + 340, my), str(val), fill=(15, 23, 42), font=fonts["body_bold"])
        my += 32

    y = box_bottom + 35

    # Narrative Paragraphs
    for para in narrative_paragraphs:
        draw.text((margin + 30, y), para["header"], fill=accent_color, font=fonts["header"])
        y += 28
        # Wrap text lines
        words = para["text"].split()
        line = ""
        for word in words:
            test_line = f"{line} {word}".strip()
            # approximate char limit per line
            if len(test_line) > 85:
                draw.text((margin + 30, y), line, fill=(51, 65, 85), font=fonts["body"])
                y += 24
                line = word
            else:
                line = test_line
        if line:
            draw.text((margin + 30, y), line, fill=(51, 65, 85), font=fonts["body"])
            y += 24
        y += 20

    # Official Seal / Signature Area
    sig_y = height - margin - 150
    draw.line([(margin + 30, sig_y), (width - margin - 30, sig_y)], fill=(226, 232, 240), width=1)
    sig_y += 25

    left_name, left_role = signature_block
    draw.text((margin + 50, sig_y), "RECORDING OFFICER SIGNATURE", fill=(148, 163, 184), font=fonts["mono"])
    draw.text((margin + 50, sig_y + 25), left_name, fill=(15, 23, 42), font=fonts["header"])
    draw.text((margin + 50, sig_y + 50), left_role, fill=(100, 116, 139), font=fonts["body"])

    # Seal stamp simulation on right
    stamp_x = width - margin - 260
    stamp_y = sig_y - 10
    draw.rectangle([(stamp_x, stamp_y), (stamp_x + 220, stamp_y + 90)], outline=(180, 83, 9), width=2)
    draw.text((stamp_x + 15, stamp_y + 15), "OFFICIAL VERIFIED", fill=(180, 83, 9), font=fonts["header"])
    draw.text((stamp_x + 20, stamp_y + 42), "DIGITAL CHAIN OF CUSTODY", fill=(180, 83, 9), font=fonts["mono"])
    draw.text((stamp_x + 35, stamp_y + 62), "SHA-256 SEALED", fill=(180, 83, 9), font=fonts["mono"])

    return img


# ----------------------------------------------------------------------
# Generate Documents
# ----------------------------------------------------------------------
def generate_all_evidence():
    print("Generating CaseIntel test evidence dataset...")

    # ==================================================================
    # 1. 01_FIR_Complaint_12Aug2026.png (Incident Date: 12 August 2026)
    # ==================================================================
    img_fir = render_legal_sheet(
        title="FIRST INFORMATION REPORT (FIR)",
        subtitle="Under Section 154 Code of Criminal Procedure | Siliguri Police Station",
        meta_pairs=[
            ("FIR Number", "FIR-402/2026"),
            ("Incident Date", "12 August 2026"),
            ("Time of Occurrence", "14:30 Hours IST"),
            ("Complainant", "Vikram Malhotra"),
            ("Accused", "Rahul Sharma"),
            ("Place of Occurrence", "Connaught Place, New Delhi"),
            ("Supervising Department", "Cyber Crime Division"),
        ],
        narrative_paragraphs=[
            {
                "header": "1. COMPLAINT SUMMARY & INITIAL ALLEGATION",
                "text": "The complainant Vikram Malhotra appeared before Siliguri Police Station to lodge a formal complaint regarding unauthorized financial exfiltration. On 12 August 2026, corporate accounts maintained at Apex Global Traders were compromised via unauthorized credential reuse. Preliminary investigation traces IP routing through Connaught Place.",
            },
            {
                "header": "2. SUSPECT PARTICULARS & WITNESS TESTIMONY",
                "text": "The primary suspect Rahul Sharma was observed accessing the financial administrative portal without prior authorization. Deposition was also tendered by deponent Dr. Sunita Rao affirming electronic log preservation.",
            },
        ],
        signature_block=("Inspector Rajesh Verma", "Station House Officer, Siliguri Police"),
        badge_label="EVIDENCE ITEM #1 · FIR ARCHIVE",
    )
    fir_png_path = os.path.join(OUTPUT_DIR, "01_FIR_Complaint_12Aug2026.png")
    img_fir.save(fir_png_path, "PNG")
    print(f"Saved: {fir_png_path}")

    # ==================================================================
    # 2. 02_Investigation_Report_14Aug2026.pdf (Incident Date: 14 August 2026)
    # Triggers DATE_MISMATCH when paired with Document 1!
    # ==================================================================
    img_inv = render_legal_sheet(
        title="POLICE INVESTIGATION DOSSIER & PRELIMINARY CHARGESHEET",
        subtitle="Criminal Investigation Division | Incident Verification Report",
        meta_pairs=[
            ("Investigation Case ID", "CASE-402-CRIME"),
            ("Incident Date", "14 August 2026"),  # Intentional discrepancy with FIR!
            ("Date of Dossier Filing", "18 August 2026"),
            ("Investigating Officer", "Inspector Rajesh Verma"),
            ("Subject / Accused", "Rahul Sharma"),
            ("Complainant", "Vikram Malhotra"),
            ("Location Observed", "Connaught Place, New Delhi"),
            ("Affected Organization", "Apex Global Traders"),
        ],
        narrative_paragraphs=[
            {
                "header": "1. INVESTIGATION CHRONOLOGY & FORENSIC FINDINGS",
                "text": "Investigation reveals that server logs recovered from Apex Global Traders record the primary exfiltration event on 14 August 2026. Electronic timestamps from network gateway routers place suspect Rahul Sharma in direct control of the terminal during this timeframe.",
            },
            {
                "header": "2. EVIDENCE CORROBORATION & WITNESS STATEMENTS",
                "text": "Inspector Rajesh Verma conducted an on-site audit at Connaught Place. Evidence seized includes secondary workstation drives submitted to the Forensic Science Laboratory for definitive forensic chain analysis.",
            },
        ],
        signature_block=("Inspector Rajesh Verma", "Lead Investigator, Cyber Crime Division"),
        badge_label="EVIDENCE ITEM #2 · INVESTIGATION REPORT",
    )
    inv_pdf_path = os.path.join(OUTPUT_DIR, "02_Investigation_Report_14Aug2026.pdf")
    img_inv.save(inv_pdf_path, "PDF")
    print(f"Saved: {inv_pdf_path}")

    # ==================================================================
    # 3. 03_FIR_Police_Record_2026.pdf (PDF version of FIR)
    # ==================================================================
    fir_pdf_path = os.path.join(OUTPUT_DIR, "03_FIR_Police_Record_2026.pdf")
    img_fir.save(fir_pdf_path, "PDF")
    print(f"Saved: {fir_pdf_path}")

    # ==================================================================
    # 4. 04_Forensic_Lab_Report.png (Forensic Laboratory Report)
    # ==================================================================
    img_fsl = render_legal_sheet(
        title="CENTRAL FORENSIC SCIENCE LABORATORY (CFSL)",
        subtitle="Digital Forensics & Electronic Document Analysis Division",
        meta_pairs=[
            ("Laboratory Case ID", "CFSL-DEL-2026-881"),
            ("Analysis Date", "19 August 2026"),
            ("Incident Date", "12 August 2026"),
            ("Examiner / Officer", "Dr. Sunita Rao"),
            ("Target Person", "Rahul Sharma"),
            ("Organization", "Forensic Science Laboratory"),
            ("Location", "Kolkata"),
        ],
        narrative_paragraphs=[
            {
                "header": "1. TECHNICAL SPECIMEN EXAMINATION",
                "text": "Specimen EV-01 containing an encrypted NVMe solid state drive was extracted in accordance with ISO/IEC 27037 standards. Digital hash match confirms that outbound data exfiltration directed toward offshore proxies commenced on 12 August 2026.",
            },
            {
                "header": "2. FORENSIC VERDICT & INTEGRITY ATTESTATION",
                "text": "The forensic analysis conducted by Dr. Sunita Rao establishes uncompromised digital chain of custody. Bitstream mirrors match the primary evidence ledger with zero byte corruption.",
            },
        ],
        signature_block=("Dr. Sunita Rao", "Senior Digital Forensics Analyst, CFSL"),
        badge_label="EVIDENCE ITEM #4 · FORENSIC LABORATORY REPORT",
    )
    fsl_png_path = os.path.join(OUTPUT_DIR, "04_Forensic_Lab_Report.png")
    img_fsl.save(fsl_png_path, "PNG")
    print(f"Saved: {fsl_png_path}")

    # ==================================================================
    # 5. 05_Witness_Interrogation_Transcript.txt (Plain Text)
    # ==================================================================
    txt_interrogation_path = os.path.join(OUTPUT_DIR, "05_Witness_Interrogation_Transcript.txt")
    interrogation_content = """================================================================================
CASEINTEL INVESTIGATION INTELLIGENCE SYSTEM
POLICE DEPARTMENT - CYBER CRIME DIVISION
OFFICIAL RECORD OF EXAMINATION UNDER SECTION 161 Cr.P.C.
================================================================================

Case Reference            : CASE-001
FIR Number                : FIR-402/2026
Date of Deposition        : 16 August 2026
Incident Date             : 12 August 2026
Examining Officer         : Inspector Rajesh Verma
Examined Person           : Rahul Sharma
Complainant Mentioned     : Vikram Malhotra
Location of Examination   : Cyber Crime Division, New Delhi
Associated Organization   : Apex Global Traders

--------------------------------------------------------------------------------
VERBATIM INTERROGATION TRANSCRIPT
--------------------------------------------------------------------------------

[TIME 10:15:00] Inspector Rajesh Verma:
State your full name and current designation for the official judicial record.

[TIME 10:15:22] Rahul Sharma:
My name is Rahul Sharma. I am employed as senior network administrator at Apex Global Traders.

[TIME 10:16:05] Inspector Rajesh Verma:
Where were you present between 14:00 hours and 17:00 hours on 12 August 2026?

[TIME 10:16:45] Rahul Sharma:
I was present at the corporate office branch located in Connaught Place, New Delhi. Complainant Vikram Malhotra had instructed me to perform routine server maintenance on that afternoon.

[TIME 10:18:10] Inspector Rajesh Verma:
The forensic extraction log indicates that administrative credentials registered to your workstation initiated an unauthorized fund routing protocol totaling ₹15,00,000. Did you authorize this transfer?

[TIME 10:19:02] Rahul Sharma:
I categorically deny issuing any unauthorized transfer orders. My credentials may have been cloned or hijacked through remote Trojan injection. I provided all system audit logs to deponent Dr. Sunita Rao at the Forensic Science Laboratory for independent verification.

[TIME 10:22:30] Inspector Rajesh Verma:
Are you aware of any other individuals who had physical or remote terminal access to your workstation during this timeframe?

[TIME 10:23:15] Rahul Sharma:
Only the supervising IT officer and complainant Vikram Malhotra possessed administrative override authority.

--------------------------------------------------------------------------------
ATTESTATION & CHAIN OF CUSTODY
--------------------------------------------------------------------------------
The above statement was transcribed verbatim in the presence of legal counsel and sealed into the CaseIntel encrypted evidence vault.

Recorded by:
Inspector Rajesh Verma
Cyber Crime Division, New Delhi

Attested:
Rahul Sharma (Subject / Accused)
================================================================================
"""
    with open(txt_interrogation_path, "w", encoding="utf-8") as f:
        f.write(interrogation_content)
    print(f"Saved: {txt_interrogation_path}")

    # ==================================================================
    # 6. 06_Cyber_Forensic_Extraction_Log.txt (Plain Text Log)
    # ==================================================================
    txt_forensic_path = os.path.join(OUTPUT_DIR, "06_Cyber_Forensic_Extraction_Log.txt")
    forensic_log_content = """================================================================================
CASEINTEL DIGITAL FORENSIC EVIDENCE LOG
FORENSIC EXTRACTION & CHAIN OF CUSTODY MANIFEST
================================================================================

EVIDENCE ARTIFACT ID     : EVD-SEC-2026-9041
CASE IDENTIFIER          : CASE-001
PRIMARY SUSPECT          : Rahul Sharma
INVESTIGATING OFFICER    : Inspector Rajesh Verma
REPORTING WITNESS        : Dr. Sunita Rao
INCIDENT DATE RECORDED   : 12 August 2026
PRIMARY LOCATION         : Connaught Place, New Delhi
SUPERVISING UNIT         : Cyber Crime Division
VICTIM ORGANIZATION      : Apex Global Traders

--------------------------------------------------------------------------------
HARDWARE SPECIFICATION & DIGITAL SEALS
--------------------------------------------------------------------------------
Hardware Seized          : Dell Precision 7760 Mobile Workstation
Serial Number            : SN-CYB-8839210-IN
Storage Device           : Samsung NVMe SSD 1TB (Firmware 3B2QEXM7)
Acquisition Technique    : Hardware Write-Blocked Bitstream Image (dd / raw)
Forensic Tool Utilized   : FTK Imager v4.7.1 & CaseIntel AI Pipeline

--------------------------------------------------------------------------------
CRYPTOGRAPHIC INTEGRITY HASH VERIFICATION
--------------------------------------------------------------------------------
MD5 Master Checksum      : a7c8e9104b9012cd3ef4516789abcde0
SHA-1 Master Checksum    : 9283f98234bcadef8812903847561029384756ab
SHA-256 Chain Seal       : e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Integrity Verification   : PASSED - ZERO BYTE ALTERATION CONFIRMED

--------------------------------------------------------------------------------
TIMESTAMP EXTRACTION CHRONOLOGY
--------------------------------------------------------------------------------
[2026-08-12 14:15:02 UTC] System login: User 'rsharma' (Rahul Sharma)
[2026-08-12 14:22:18 UTC] Outbound TLS tunnel opened to 198.51.100.44
[2026-08-12 14:30:00 UTC] High-volume database exfiltration command dispatched
[2026-08-12 14:35:45 UTC] Local event audit log purge command attempted
[2026-08-12 14:36:12 UTC] Security daemon flagged abnormal egress pattern

Forensic Examiner:
Dr. Sunita Rao
Forensic Science Laboratory, Kolkata
================================================================================
"""
    with open(txt_forensic_path, "w", encoding="utf-8") as f:
        f.write(forensic_log_content)
    print(f"Saved: {txt_forensic_path}")

    # ==================================================================
    # 7. 07_Witness_Affidavit_Deposition.pdf (Judicial Affidavit PDF)
    # ==================================================================
    img_aff = render_legal_sheet(
        title="SWORN JUDICIAL AFFIDAVIT & DEPOSITION",
        subtitle="Before the Chief Judicial Magistrate Court | Case 402/2026",
        meta_pairs=[
            ("Court Reference", "CJM-DEL-402-2026"),
            ("Deposition Date", "19 August 2026"),
            ("Incident Date", "12 August 2026"),
            ("Deponent / Witness", "Dr. Sunita Rao"),
            ("Accused", "Rahul Sharma"),
            ("Organization", "Forensic Science Laboratory"),
            ("Jurisdiction", "New Delhi"),
        ],
        narrative_paragraphs=[
            {
                "header": "1. SWORN STATEMENT OF EXPERT WITNESS",
                "text": "I, Dr. Sunita Rao, age 42, Senior Digital Forensics Examiner at Forensic Science Laboratory, do hereby solemnly affirm and state on oath that the forensic evidence collected on 12 August 2026 was sealed under my direct personal supervision.",
            },
            {
                "header": "2. IDENTIFICATION OF ACCUSED & VERIFICATION",
                "text": "I certify that all digital artifacts linked to suspect Rahul Sharma were cryptographically preserved using SHA-256 envelope vaults. The integrity hashes match the records registered with Siliguri Police Station and Cyber Crime Division without deviation.",
            },
        ],
        signature_block=("Dr. Sunita Rao", "Deponent & Senior Forensic Analyst"),
        badge_label="EVIDENCE ITEM #7 · SWORN JUDICIAL AFFIDAVIT",
    )
    aff_pdf_path = os.path.join(OUTPUT_DIR, "07_Witness_Affidavit_Deposition.pdf")
    img_aff.save(aff_pdf_path, "PDF")
    print(f"Saved: {aff_pdf_path}")

    # ==================================================================
    # 8. 08_Hindi_FIR_Summary.png (Indic Multilingual OCR & Translation)
    # ==================================================================
    hindi_font = get_hindi_font(24)
    img_hindi = render_legal_sheet(
        title="FIRST INFORMATION REPORT (प्रथम सूचना रिपोर्ट)",
        subtitle="Police Department of India | State of West Bengal / New Delhi",
        meta_pairs=[
            ("FIR Number", "FIR-402/2026-HIN"),
            ("Incident Date (घटना दिनांक)", "12 August 2026"),
            ("Complainant (शिकायतकर्ता)", "Vikram Malhotra"),
            ("Accused (अभियुक्त)", "Rahul Sharma"),
            ("Police Station (थाना)", "Siliguri Police Station"),
            ("Location (घटना स्थल)", "Connaught Place, New Delhi"),
            ("Department (विभाग)", "Cyber Crime Division"),
        ],
        narrative_paragraphs=[
            {
                "header": "1. INCIDENT DETAILS (घटना का संक्षिप्त विवरण)",
                "text": "शिकायतकर्ता Vikram Malhotra ने पुलिस थाना Siliguri Police Station में शिकायत दर्ज कराई कि दिनांक 12 August 2026 को आरोपी Rahul Sharma द्वारा Apex Global Traders के खाते से अवैध रूप से ₹15,00,000 की निकासी की गई। मामले की जांच Cyber Crime Division द्वारा की जा रही है।",
            },
            {
                "header": "2. POLICE DIRECTIVE (पुलिस निर्देश)",
                "text": "This multilingual record certifies that suspect Rahul Sharma is subject to immediate investigative summons. All digital evidence has been secured in the CaseIntel vault with verified SHA-256 chain of custody.",
            },
        ],
        signature_block=("Inspector Rajesh Verma", "Station House Officer, Siliguri Police"),
        badge_label="EVIDENCE ITEM #8 · INDIC MULTILINGUAL FIR",
    )
    hindi_png_path = os.path.join(OUTPUT_DIR, "08_Hindi_FIR_Summary.png")
    img_hindi.save(hindi_png_path, "PNG")
    print(f"Saved: {hindi_png_path}")

    print("\nAll 8 test evidence files generated successfully in:")
    print(OUTPUT_DIR)


if __name__ == "__main__":
    generate_all_evidence()
