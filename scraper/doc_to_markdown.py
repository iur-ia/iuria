#!/usr/bin/env python3
"""
Pipeline de extração de texto e conversão para Markdown.
Suporta múltiplas estratégias de extração com fallback progressivo:

  1. pdfplumber  – extração nativa de texto (PDFs com texto embutido)
  2. PyPDF2      – fallback para PDFs mais antigos
  3. pdftotext   – poppler, boa preservação de layout
  4. Tesseract OCR – para PDFs escaneados / imagens
  5. mammoth     – para .docx → markdown
  6. texto puro  – para .txt, .md, .html

Cada etapa é testada e, se não gerar texto suficiente, a próxima é tentada.
O resultado final é sempre Markdown limpo.
"""

import sys
import os
import json
import re
import subprocess
import tempfile
import logging
from pathlib import Path
from typing import Optional, Tuple

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
log = logging.getLogger("doc_pipeline")

# ─── Quality check ───────────────────────────────────────────────
MIN_TEXT_LENGTH = 50  # Minimum chars to consider extraction successful

def _is_good(text: Optional[str]) -> bool:
    """Check if extracted text is meaningful enough."""
    if not text:
        return False
    cleaned = re.sub(r'\s+', '', text)
    return len(cleaned) >= MIN_TEXT_LENGTH

# ─── Strategy 1: pdfplumber (best for native-text PDFs) ─────────
def extract_pdfplumber(filepath: str) -> Optional[str]:
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(filepath) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    pages.append(f"## Página {i + 1}\n\n{text}")
        result = "\n\n---\n\n".join(pages)
        if _is_good(result):
            log.info(f"pdfplumber: extracted {len(result)} chars from {len(pages)} pages")
            return result
    except Exception as e:
        log.warning(f"pdfplumber failed: {e}")
    return None

# ─── Strategy 2: PyPDF2 (fallback for older PDFs) ───────────────
def extract_pypdf2(filepath: str) -> Optional[str]:
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(filepath)
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():
                pages.append(f"## Página {i + 1}\n\n{text}")
        result = "\n\n---\n\n".join(pages)
        if _is_good(result):
            log.info(f"PyPDF2: extracted {len(result)} chars from {len(pages)} pages")
            return result
    except Exception as e:
        log.warning(f"PyPDF2 failed: {e}")
    return None

# ─── Strategy 3: pdftotext (poppler, preserves layout) ──────────
def extract_pdftotext(filepath: str) -> Optional[str]:
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", filepath, "-"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0 and _is_good(result.stdout):
            text = result.stdout
            # Split into pages by form-feed
            raw_pages = text.split('\f')
            pages = []
            for i, page in enumerate(raw_pages):
                stripped = page.strip()
                if stripped:
                    pages.append(f"## Página {i + 1}\n\n```\n{stripped}\n```")
            md = "\n\n---\n\n".join(pages)
            log.info(f"pdftotext: extracted {len(md)} chars from {len(pages)} pages")
            return md
    except Exception as e:
        log.warning(f"pdftotext failed: {e}")
    return None

# ─── Strategy 4: Tesseract OCR (for scanned PDFs / images) ──────
def extract_tesseract_ocr(filepath: str) -> Optional[str]:
    """
    Convert PDF pages to images, then OCR each with Tesseract.
    Uses pdf2image (poppler) for PDF → image conversion.
    For image files, OCR directly.
    """
    try:
        import pytesseract
        from PIL import Image

        ext = Path(filepath).suffix.lower()
        images = []

        if ext in ('.pdf',):
            from pdf2image import convert_from_path
            # Convert at 300 DPI for good OCR quality
            images = convert_from_path(filepath, dpi=300, fmt='png', thread_count=2)
            log.info(f"Converted PDF to {len(images)} images for OCR")
        elif ext in ('.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp'):
            images = [Image.open(filepath)]
        else:
            return None

        if not images:
            return None

        pages = []
        for i, img in enumerate(images):
            # Pre-process: convert to grayscale for better OCR
            gray = img.convert('L')
            
            # OCR with Portuguese + English
            text = pytesseract.image_to_string(
                gray, 
                lang='por+eng',
                config='--psm 1 --oem 3'  # Auto page segmentation, LSTM engine
            )
            if text and text.strip():
                pages.append(f"## Página {i + 1} (OCR)\n\n{text.strip()}")

        result = "\n\n---\n\n".join(pages)
        if _is_good(result):
            log.info(f"Tesseract OCR: extracted {len(result)} chars from {len(pages)} pages")
            return result
    except Exception as e:
        log.warning(f"Tesseract OCR failed: {e}")
    return None

# ─── Strategy 5: mammoth (for .docx → markdown) ─────────────────
def extract_docx(filepath: str) -> Optional[str]:
    try:
        import mammoth
        with open(filepath, "rb") as f:
            result = mammoth.convert_to_markdown(f)
            md = result.value
            if _is_good(md):
                log.info(f"mammoth: extracted {len(md)} chars from DOCX")
                return md
    except Exception as e:
        log.warning(f"mammoth failed: {e}")
    return None

# ─── Strategy 6: plain text / HTML ──────────────────────────────
def extract_plain(filepath: str) -> Optional[str]:
    try:
        ext = Path(filepath).suffix.lower()
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        if ext in ('.html', '.htm'):
            try:
                from markdownify import markdownify as md_convert
                md = md_convert(content, heading_style="ATX")
                if _is_good(md):
                    log.info(f"HTML→Markdown: extracted {len(md)} chars")
                    return md
            except:
                pass
        
        if _is_good(content):
            log.info(f"Plain text: extracted {len(content)} chars")
            if ext == '.md':
                return content
            return f"```\n{content}\n```"
    except Exception as e:
        log.warning(f"Plain text failed: {e}")
    return None

# ─── Text cleaning and Markdown normalization ────────────────────
def clean_markdown(text: str) -> str:
    """Clean and normalize extracted text into proper Markdown."""
    if not text:
        return ""
    
    # Remove excessive blank lines (more than 2 consecutive)
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    
    # Remove null bytes and control chars (except newline/tab)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    
    # Fix common OCR artifacts
    text = text.replace('|', 'l')  # common OCR pipe-for-l
    text = re.sub(r'(\w)- \n(\w)', r'\1\2', text)  # fix hyphenated line breaks
    
    # Normalize Unicode
    import unicodedata
    text = unicodedata.normalize('NFKC', text)
    
    return text.strip()

# ─── Main pipeline ───────────────────────────────────────────────
def extract_to_markdown(filepath: str) -> Tuple[str, str, dict]:
    """
    Extract text from document and convert to Markdown.
    
    Returns:
        (markdown_text, extraction_method, metadata)
    """
    filepath = str(Path(filepath).resolve())
    ext = Path(filepath).suffix.lower()
    
    if not os.path.exists(filepath):
        return "", "error", {"error": f"File not found: {filepath}"}
    
    filesize = os.path.getsize(filepath)
    metadata = {
        "filename": Path(filepath).name,
        "extension": ext,
        "filesize_bytes": filesize,
        "filesize_human": f"{filesize / 1024:.1f} KB" if filesize < 1048576 else f"{filesize / 1048576:.1f} MB",
    }
    
    strategies = []
    
    if ext == '.pdf':
        strategies = [
            ("pdfplumber", extract_pdfplumber),
            ("PyPDF2", extract_pypdf2),
            ("pdftotext", extract_pdftotext),
            ("tesseract_ocr", extract_tesseract_ocr),
        ]
    elif ext in ('.docx',):
        strategies = [
            ("mammoth", extract_docx),
        ]
    elif ext in ('.doc',):
        # .doc is legacy, try pdftotext or fallback
        strategies = [
            ("plain_text", extract_plain),
        ]
    elif ext in ('.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp'):
        strategies = [
            ("tesseract_ocr", extract_tesseract_ocr),
        ]
    elif ext in ('.html', '.htm', '.txt', '.md', '.csv', '.rtf'):
        strategies = [
            ("plain_text", extract_plain),
        ]
    else:
        return "", "unsupported", {"error": f"Unsupported format: {ext}", **metadata}
    
    attempts = []
    for name, fn in strategies:
        log.info(f"Trying strategy: {name}")
        try:
            result = fn(filepath)
            if result and _is_good(result):
                md = clean_markdown(result)
                metadata["extraction_method"] = name
                metadata["char_count"] = len(md)
                metadata["word_count"] = len(md.split())
                metadata["strategies_tried"] = attempts + [{"name": name, "status": "success"}]
                return md, name, metadata
            else:
                attempts.append({"name": name, "status": "insufficient_text"})
        except Exception as e:
            attempts.append({"name": name, "status": "error", "error": str(e)})
    
    metadata["strategies_tried"] = attempts
    return "", "all_failed", metadata


# ─── CLI interface ───────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python doc_to_markdown.py <filepath> [output_path]"}))
        sys.exit(1)
    
    filepath = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    md_text, method, metadata = extract_to_markdown(filepath)
    
    if output_path:
        # Save markdown to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md_text)
        metadata["output_path"] = output_path
    
    result = {
        "success": bool(md_text),
        "method": method,
        "markdown": md_text if not output_path else f"(saved to {output_path})",
        "metadata": metadata,
    }
    
    print(json.dumps(result, ensure_ascii=False))
