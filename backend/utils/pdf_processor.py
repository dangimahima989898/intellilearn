import os
import re
import fitz  # PyMuPDF
from PIL import Image
import io

try:
    import pytesseract
except ImportError:
    pytesseract = None


def extract_text_from_pdf(file_path: str) -> str:
    """Extract standard text page-by-page using PyMuPDF."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at: {file_path}")

    doc = fitz.open(file_path)
    pages_text = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        pages_text.append(text or "")
        
    doc.close()
    return "\n\n".join(pages_text)


def extract_with_ocr_fallback(file_path: str) -> str:
    """
    Extract text from PDF page-by-page.
    If a page yields very little text (< 100 chars), fall back to pytesseract OCR.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at: {file_path}")

    doc = fitz.open(file_path)
    pages_text = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text() or ""
        
        # If page seems empty or image-based, trigger OCR fallback
        if len(text.strip()) < 100 and pytesseract:
            try:
                # Render page to PNG image (150 DPI is standard for basic OCR)
                pix = page.get_pixmap(dpi=150)
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                
                # Perform OCR
                ocr_text = pytesseract.image_to_string(img)
                if ocr_text and len(ocr_text.strip()) > len(text.strip()):
                    text = ocr_text
            except Exception as e:
                # Log warning but do not crash the pipeline
                print(f"[PDF Processor] OCR fallback warning on page {page_num + 1}: {e}")

        pages_text.append(text)

    doc.close()
    return "\n\n".join(pages_text)


def clean_extracted_text(raw_text: str) -> str:
    """Clean up raw extracted text by removing page numbers, headers/footers, and duplicate spaces."""
    if not raw_text:
        return ""

    # 1. Remove common page numbering patterns (e.g. "Page 1 of 10", "1 / 10", "Page - 5")
    cleaned = re.sub(r"(?i)\bpage\s*\d+\s*(of|/)\s*\d+\b", "", raw_text)
    cleaned = re.sub(r"(?i)\bpage\s*[-–]?\s*\d+\b", "", cleaned)
    
    # 2. Remove isolated page numbers at the beginning or end of lines
    lines = []
    for line in cleaned.split("\n"):
        line_stripped = line.strip()
        if re.match(r"^\d+$", line_stripped):
            continue  # Skip line with only page numbers
        lines.append(line)
    
    cleaned = "\n".join(lines)
    
    # 3. Collapse multiple consecutive empty lines or white spaces
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r" {2,}", " ", cleaned)
    
    return cleaned.strip()


def chunk_text_by_unit(text: str, unit_markers: list = None) -> dict:
    """
    Split text dynamically by unit headers if multiple units exist in the same PDF.
    Defaults to unit split if markers are found.
    """
    if not unit_markers:
        unit_markers = ["unit i", "unit ii", "unit iii", "unit iv", "unit v", "unit 1", "unit 2", "unit 3", "unit 4", "unit 5"]

    chunks = {}
    pattern = r"(?i)\b(" + "|".join(unit_markers) + r")\b"
    
    splits = re.split(pattern, text)
    if len(splits) <= 1:
        return {"General": text}

    # First section before any unit header is General/Introduction
    current_key = "Introduction"
    chunks[current_key] = splits[0].strip()

    for i in range(1, len(splits), 2):
        unit_header = splits[i].strip().upper()
        content = splits[i+1].strip() if i+1 < len(splits) else ""
        chunks[unit_header] = content

    return chunks
