#!/usr/bin/env python3
"""
Generate fictional sample legal documents for CaseIntel hackathon demo.
Doc 1: sample_fir.png (Incident Date: 12 August 2026)
Doc 2: sample_investigation_report.png (Incident Date: 14 August 2026)
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_document_image(filename, title, lines):
    width, height = 1200, 1500
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Outer border
    draw.rectangle([(30, 30), (width - 30, height - 30)], outline=(30, 40, 60), width=4)
    draw.rectangle([(40, 40), (width - 40, height - 40)], outline=(180, 190, 205), width=1)
    
    # Header Banner
    draw.rectangle([(45, 45), (width - 45, 140)], fill=(240, 244, 250))
    
    # Try system font or default
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        sub_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
        text_font = ImageFont.truetype("/System/Library/Fonts/Courier.dfont", 24)
        bold_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26)
    except Exception:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        text_font = ImageFont.load_default()
        bold_font = ImageFont.load_default()

    # Draw Title
    draw.text((70, 60), title, fill=(15, 25, 45), font=title_font)
    draw.text((70, 105), "CONFIDENTIAL - LAW ENFORCEMENT INVESTIGATION DOSSIER", fill=(100, 110, 130), font=sub_font)
    
    # Horizontal line
    draw.line([(45, 145), (width - 45, 145)], fill=(30, 40, 60), width=2)
    
    y = 190
    for line in lines:
        if line.startswith("---"):
            draw.line([(60, y), (width - 60, y)], fill=(200, 205, 215), width=1)
            y += 25
        elif line.startswith("# "):
            draw.text((60, y), line[2:], fill=(10, 20, 40), font=bold_font)
            y += 45
        elif ":" in line:
            parts = line.split(":", 1)
            draw.text((60, y), parts[0] + ":", fill=(20, 30, 50), font=bold_font)
            draw.text((420, y), parts[1].strip(), fill=(10, 15, 25), font=text_font)
            y += 40
        else:
            draw.text((60, y), line, fill=(40, 50, 60), font=text_font)
            y += 35

    # Footer
    draw.line([(45, height - 90), (width - 45, height - 90)], fill=(200, 205, 215), width=1)
    draw.text((60, height - 70), "DIGITAL CHAIN OF CUSTODY VERIFIED | SHA-256 INTEGRITY PROTECTED", fill=(120, 130, 140), font=sub_font)
    
    img.save(filename, "PNG")
    print(f"Generated demo document: {filename} ({os.path.getsize(filename)} bytes)")

if __name__ == "__main__":
    # Doc 1: FIR
    fir_lines = [
        "# FIRST INFORMATION REPORT (FIR)",
        "---",
        "Case Reference Number : CASE-001",
        "Police Station : Siliguri Police Station",
        "Incident Date : 12 August 2026",
        "Location of Incident : Siliguri",
        "Complainant / Person : Rahul Sharma",
        "Department Division : Cyber Crime",
        "---",
        "# INCIDENT SUMMARY",
        "The complainant Rahul Sharma reported unauthorized access and fraud",
        "occurring at Siliguri on 12 August 2026.",
        "Formal investigation initiated under Section 66D IT Act.",
        "Evidence files collected and placed in envelope vault.",
    ]
    create_document_image("sample_fir.png", "FIRST INFORMATION REPORT", fir_lines)

    # Doc 2: Investigation Report
    report_lines = [
        "# POLICE INVESTIGATION REPORT",
        "---",
        "Case Reference Number : CASE-001",
        "Investigating Officer : Inspector Rajesh Verma",
        "Incident Date : 14 August 2026",
        "Location Observed : Siliguri",
        "Subject Person : Rahul Sharma",
        "Supervising Department : Cyber Crime",
        "---",
        "# INVESTIGATION FINDINGS",
        "Field inspection was conducted at the designated site in Siliguri.",
        "Based on recorded witness statements and surveillance logs,",
        "the date of event is established as 14 August 2026.",
        "Subject Rahul Sharma was interrogated regarding the timeline.",
        "NOTE: Cross-verification against initial FIR date is required.",
    ]
    create_document_image("sample_investigation_report.png", "INVESTIGATION REPORT", report_lines)
