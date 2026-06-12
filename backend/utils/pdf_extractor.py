"""
pdf_extractor.py
Utilities for extracting text from PDF / DOCX files and splitting into
overlapping chunks suitable for RAG storage.
"""
from typing import List
import io
import re


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF file given its raw bytes."""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
        return "\n\n".join(pages)
    except Exception as e:
        raise ValueError(f"Failed to extract PDF text: {e}")


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract all text from a DOCX file given its raw bytes."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except Exception as e:
        raise ValueError(f"Failed to extract DOCX text: {e}")


def extract_text_from_txt(file_bytes: bytes) -> str:
    """Decode raw text file."""
    try:
        return file_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise ValueError(f"Failed to decode TXT file: {e}")


def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Auto-detect file type by extension and extract text.
    Supports .pdf, .docx, .txt
    """
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif lower.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    elif lower.endswith(".txt"):
        return extract_text_from_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {filename}. Supported: .pdf, .docx, .txt")


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """
    Split text into overlapping word-based chunks.

    Args:
        text:       Full document text
        chunk_size: Target words per chunk
        overlap:    Word overlap between consecutive chunks

    Returns:
        List of text chunk strings
    """
    # Normalise whitespace
    text = re.sub(r"\s+", " ", text).strip()

    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if len(chunk.strip()) > 50:          # discard tiny fragments
            chunks.append(chunk)
        if end >= len(words):
            break
        start += chunk_size - overlap        # slide with overlap

    return chunks


def infer_topic_hint(chunk: str, known_topics: List[str]) -> str | None:
    """
    Check if any of the known subject topics appear in the chunk text.
    Returns the first matching topic name, or None.
    """
    chunk_lower = chunk.lower()
    for topic in known_topics:
        if topic.lower() in chunk_lower:
            return topic
    return None
