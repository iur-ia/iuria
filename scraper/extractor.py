"""
extractor.py — Pipeline de extração de texto → Markdown

Estratégia em camadas:
  1. PDF nativo: pymupdf (fitz) extrai texto vetorial
  2. PDF escaneado: se texto < 100 chars, tenta pdfminer como fallback
  3. DOCX: python-docx
  4. Imagem: placeholder para futura integração OCR (Z.AI)

Saída: JSON { status, markdown, chars, pages, method }
"""

import sys
import os
import json
import re
import argparse


def extrair_pdf_pymupdf(caminho: str) -> tuple[str, int]:
    """Extrai texto de PDF nativo via PyMuPDF. Retorna (texto, num_paginas)."""
    import fitz  # pymupdf

    doc = fitz.open(caminho)
    paginas = []
    for i, page in enumerate(doc, 1):
        texto = page.get_text("text")
        if texto.strip():
            paginas.append(f"<!-- Página {i} -->\n{texto.strip()}")
    doc.close()
    return "\n\n".join(paginas), len(doc)


def extrair_pdf_pdfminer(caminho: str) -> str:
    """Fallback: extrai texto via pdfminer.six."""
    from pdfminer.high_level import extract_text
    return extract_text(caminho) or ""


def extrair_docx(caminho: str) -> str:
    """Extrai texto de .docx via python-docx."""
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


def texto_para_markdown(texto: str) -> str:
    """
    Converte texto bruto para Markdown estruturado.
    Detecta padrões comuns de documentos jurídicos brasileiros.
    """
    if not texto:
        return ""

    linhas = texto.splitlines()
    resultado = []
    i = 0
    while i < len(linhas):
        linha = linhas[i].strip()

        if not linha:
            resultado.append("")
            i += 1
            continue

        # Detecta títulos em CAIXA ALTA curtos (≤ 80 chars, sem ponto final)
        if linha.isupper() and 3 <= len(linha) <= 80 and not linha.endswith("."):
            resultado.append(f"## {linha.title()}")
            i += 1
            continue

        # Detecta numeração de artigos (Art. 1º, Art. 2°, I -, II -)
        if re.match(r'^(Art\.\s*\d+|[IVX]+\s*[-–]|\d+[\.\)]\s+\w)', linha):
            resultado.append(f"\n**{linha}**")
            i += 1
            continue

        # Linhas normais
        resultado.append(linha)
        i += 1

    # Remove linhas em branco excessivas (máx 2 consecutivas)
    md = "\n".join(resultado)
    md = re.sub(r'\n{3,}', '\n\n', md)
    return md.strip()


def extrair_markdown(caminho: str) -> dict:
    """
    Ponto de entrada principal.
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
        if ext == ".pdf":
            try:
                texto, paginas = extrair_pdf_pymupdf(caminho)
                method = "pymupdf"
                # Se texto muito curto → PDF escaneado, tenta pdfminer
                if len(texto.replace(" ", "").replace("\n", "")) < 100:
                    texto_pm = extrair_pdf_pdfminer(caminho)
                    if len(texto_pm) > len(texto):
                        texto = texto_pm
                        method = "pdfminer"
            except Exception as e:
                # Fallback direto para pdfminer
                try:
                    texto = extrair_pdf_pdfminer(caminho)
                    method = "pdfminer"
                except Exception as e2:
                    return {
                        "status": "erro",
                        "markdown": "",
                        "chars": 0,
                        "pages": 0,
                        "method": "none",
                        "erro": str(e2)
                    }

        elif ext in (".docx", ".doc"):
            texto = extrair_docx(caminho)
            method = "python-docx"

        elif ext in (".txt", ".md"):
            with open(caminho, "r", encoding="utf-8", errors="replace") as f:
                texto = f.read()
            method = "plaintext"

        elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp"):
            # Placeholder para OCR futuro (Z.AI)
            return {
                "status": "parcial",
                "markdown": "",
                "chars": 0,
                "pages": 1,
                "method": "ocr-pendente",
                "erro": "Extração de imagem requer integração OCR (configure Z.AI)"
            }

        else:
            return {
                "status": "parcial",
                "markdown": "",
                "chars": 0,
                "pages": 0,
                "method": "none",
                "erro": f"Formato não suportado: {ext}"
            }

        # Converte para Markdown
        markdown = texto_para_markdown(texto)
        chars = len(markdown)

        if chars < 50:
            status = "parcial"
        else:
            status = "ok"

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
    parser = argparse.ArgumentParser()
    parser.add_argument("caminho", help="Caminho do arquivo a extrair")
    args = parser.parse_args()

    resultado = extrair_markdown(args.caminho)
    print(json.dumps(resultado, ensure_ascii=False))
