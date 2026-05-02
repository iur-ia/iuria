"""
extractor.py — Pipeline de extração de texto → Markdown

Estratégia em camadas (por formato):
  PDF nativo:
    1. PyMuPDF (fitz) — extração vetorial rápida
    2. pdfminer.six — fallback se PyMuPDF retornar pouco texto
    3. Tesseract OCR — renderiza páginas como imagem e faz OCR (PDF escaneado)

  Imagem (PNG, JPG, TIFF, etc.):
    1. Tesseract OCR direto

  DOCX:
    1. python-docx — extração com estrutura de headings

  Texto/Markdown:
    1. Leitura direta

Saída: JSON { status, markdown, chars, pages, method }
"""

import sys
import os
import json
import re


TESSERACT_LANGS = "por+eng"
OCR_MIN_CHARS = 100  # mínimo de chars para considerar extração nativa suficiente


# ─────────────────────────────── Helpers ────────────────────────────────

def texto_para_markdown(texto: str) -> str:
    """Converte texto bruto em Markdown estruturado para documentos jurídicos."""
    if not texto:
        return ""

    linhas = texto.splitlines()
    resultado = []
    for linha in linhas:
        linha_strip = linha.strip()
        if not linha_strip:
            resultado.append("")
            continue
        # Títulos em CAIXA ALTA curtos
        if linha_strip.isupper() and 3 <= len(linha_strip) <= 80 and not linha_strip.endswith("."):
            resultado.append(f"## {linha_strip.title()}")
        # Numeração de artigos / incisos
        elif re.match(r'^(Art\.?\s*\d+|[IVX]+\s*[-–]|\d+[\.\)]\s+\w)', linha_strip):
            resultado.append(f"\n**{linha_strip}**")
        else:
            resultado.append(linha_strip)

    md = "\n".join(resultado)
    md = re.sub(r'\n{3,}', '\n\n', md)
    return md.strip()


# ──────────────────────────── Extratores ────────────────────────────────

def extrair_pdf_pymupdf(caminho: str) -> tuple[str, int]:
    import fitz
    doc = fitz.open(caminho)
    n = len(doc)
    partes = []
    for i, page in enumerate(doc, 1):
        t = page.get_text("text")
        if t.strip():
            partes.append(f"<!-- Página {i} -->\n{t.strip()}")
    doc.close()
    return "\n\n".join(partes), n


def extrair_pdf_pdfminer(caminho: str) -> str:
    from pdfminer.high_level import extract_text
    return extract_text(caminho) or ""


def extrair_pdf_ocr(caminho: str) -> tuple[str, int]:
    """Renderiza páginas do PDF como imagem e aplica Tesseract OCR."""
    import fitz
    import pytesseract
    from PIL import Image
    import io

    doc = fitz.open(caminho)
    n = len(doc)
    partes = []
    for i, page in enumerate(doc, 1):
        # Renderiza em 300 DPI (matrix 3x = ~300 DPI)
        mat = fitz.Matrix(3, 3)
        pix = page.get_pixmap(matrix=mat)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        texto = pytesseract.image_to_string(img, lang=TESSERACT_LANGS, config="--psm 6")
        if texto.strip():
            partes.append(f"<!-- Página {i} (OCR) -->\n{texto.strip()}")
    doc.close()
    return "\n\n".join(partes), n


def extrair_imagem_ocr(caminho: str) -> str:
    """Aplica Tesseract OCR diretamente em arquivo de imagem."""
    import pytesseract
    from PIL import Image
    img = Image.open(caminho)
    return pytesseract.image_to_string(img, lang=TESSERACT_LANGS, config="--psm 6")


def extrair_docx(caminho: str) -> str:
    from docx import Document
    doc = Document(caminho)
    partes = []
    for para in doc.paragraphs:
        texto = para.text.strip()
        if not texto:
            continue
        style = para.style.name.lower() if para.style else ""
        if "heading 1" in style:
            partes.append(f"# {texto}")
        elif "heading 2" in style:
            partes.append(f"## {texto}")
        elif "heading 3" in style:
            partes.append(f"### {texto}")
        else:
            partes.append(texto)
    return "\n\n".join(partes)


# ──────────────────────────── Ponto de entrada ──────────────────────────

def extrair_markdown(caminho: str) -> dict:
    """
    Extrai texto de um arquivo e retorna Markdown estruturado.
    Retorna dict com: status, markdown, chars, pages, method
    """
    if not os.path.exists(caminho):
        return {
            "status": "erro",
            "markdown": "",
            "chars": 0,
            "pages": 0,
            "method": "none",
            "erro": f"Arquivo não encontrado: {caminho}"
        }

    ext = os.path.splitext(caminho)[1].lower()
    texto = ""
    paginas = 0
    method = "unknown"

    try:
        # ── PDF ──────────────────────────────────────────────────────────
        if ext == ".pdf":
            # 1) PyMuPDF (texto nativo)
            try:
                texto, paginas = extrair_pdf_pymupdf(caminho)
                method = "pymupdf"
            except Exception:
                texto = ""

            # 2) pdfminer como segundo intento se pouco texto
            if len(texto.replace(" ", "").replace("\n", "")) < OCR_MIN_CHARS:
                try:
                    texto_pm = extrair_pdf_pdfminer(caminho)
                    if len(texto_pm.strip()) > len(texto.strip()):
                        texto = texto_pm
                        method = "pdfminer"
                except Exception:
                    pass

            # 3) Tesseract OCR se ainda insuficiente (PDF escaneado)
            if len(texto.replace(" ", "").replace("\n", "")) < OCR_MIN_CHARS:
                try:
                    texto_ocr, paginas = extrair_pdf_ocr(caminho)
                    if len(texto_ocr.strip()) > len(texto.strip()):
                        texto = texto_ocr
                        method = "tesseract-ocr"
                except Exception as e:
                    # Mesmo sem OCR, continua com o que temos
                    if not texto.strip():
                        return {
                            "status": "erro",
                            "markdown": "",
                            "chars": 0,
                            "pages": paginas,
                            "method": "none",
                            "erro": f"Não foi possível extrair texto (OCR falhou: {e})"
                        }

        # ── Imagem ───────────────────────────────────────────────────────
        elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"):
            try:
                texto = extrair_imagem_ocr(caminho)
                method = "tesseract-ocr"
                paginas = 1
            except Exception as e:
                return {
                    "status": "erro",
                    "markdown": "",
                    "chars": 0,
                    "pages": 1,
                    "method": "tesseract-ocr",
                    "erro": f"Erro no OCR da imagem: {e}"
                }

        # ── DOCX ─────────────────────────────────────────────────────────
        elif ext in (".docx", ".doc"):
            texto = extrair_docx(caminho)
            method = "python-docx"

        # ── Texto plano ──────────────────────────────────────────────────
        elif ext in (".txt", ".md"):
            with open(caminho, "r", encoding="utf-8", errors="replace") as f:
                texto = f.read()
            method = "plaintext"

        # ── Formato não suportado ────────────────────────────────────────
        else:
            return {
                "status": "parcial",
                "markdown": "",
                "chars": 0,
                "pages": 0,
                "method": "none",
                "erro": f"Formato não suportado: {ext}"
            }

        # ── Converte para Markdown ────────────────────────────────────────
        markdown = texto_para_markdown(texto)
        chars = len(markdown)
        status = "ok" if chars >= 50 else "parcial"

        return {
            "status": status,
            "markdown": markdown,
            "chars": chars,
            "pages": paginas,
            "method": method
        }

    except Exception as e:
        return {
            "status": "erro",
            "markdown": "",
            "chars": 0,
            "pages": 0,
            "method": "none",
            "erro": str(e)
        }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Extrai texto de documento para Markdown")
    parser.add_argument("caminho", help="Caminho do arquivo a extrair")
    args = parser.parse_args()
    resultado = extrair_markdown(args.caminho)
    print(json.dumps(resultado, ensure_ascii=False))
