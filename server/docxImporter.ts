import AdmZip from "adm-zip";
import { DOMParser } from "@xmldom/xmldom";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const ELEMENT_NODE = 1;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asElement(node: Node): Element | null {
  return node.nodeType === ELEMENT_NODE ? (node as Element) : null;
}

function getChildren(el: Element, localName: string): Element[] {
  const out: Element[] = [];
  const nodes = el.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = asElement(nodes[i]);
    if (child && child.localName === localName) out.push(child);
  }
  return out;
}

function firstChild(el: Element, localName: string): Element | null {
  const nodes = el.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = asElement(nodes[i]);
    if (child && child.localName === localName) return child;
  }
  return null;
}

function attrW(el: Element, name: string): string | null {
  return (
    el.getAttributeNS(W_NS, name) ||
    el.getAttribute("w:" + name) ||
    el.getAttribute(name) ||
    null
  );
}

function hasChild(el: Element, localName: string): boolean {
  return firstChild(el, localName) !== null;
}

function runStyles(rPr: Element | null): { open: string; close: string; styleAttr: string } {
  if (!rPr) return { open: "", close: "", styleAttr: "" };
  const styles: string[] = [];
  let open = "";
  let close = "";

  if (hasChild(rPr, "b")) { open += "<strong>"; close = "</strong>" + close; }
  if (hasChild(rPr, "i")) { open += "<em>"; close = "</em>" + close; }
  if (hasChild(rPr, "u")) { open += "<u>"; close = "</u>" + close; }
  if (hasChild(rPr, "strike") || hasChild(rPr, "dstrike")) { open += "<s>"; close = "</s>" + close; }
  const vert = firstChild(rPr, "vertAlign");
  if (vert) {
    const v = attrW(vert, "val");
    if (v === "superscript") { open += "<sup>"; close = "</sup>" + close; }
    else if (v === "subscript") { open += "<sub>"; close = "</sub>" + close; }
  }

  const rFonts = firstChild(rPr, "rFonts");
  if (rFonts) {
    const f = attrW(rFonts, "ascii") || attrW(rFonts, "hAnsi") || attrW(rFonts, "cs") || attrW(rFonts, "eastAsia");
    if (f) styles.push(`font-family: '${f.replace(/'/g, "")}'`);
  }
  const sz = firstChild(rPr, "sz");
  if (sz) {
    const v = attrW(sz, "val");
    if (v) styles.push(`font-size: ${parseInt(v, 10) / 2}pt`);
  }
  const color = firstChild(rPr, "color");
  if (color) {
    const v = attrW(color, "val");
    if (v && v !== "auto" && /^[0-9a-fA-F]{6}$/.test(v)) styles.push(`color: #${v}`);
  }
  const high = firstChild(rPr, "highlight");
  if (high) {
    const v = attrW(high, "val");
    if (v && v !== "none") styles.push(`background-color: ${v}`);
  }

  const styleAttr = styles.length ? ` style="${styles.join("; ")}"` : "";
  return { open, close, styleAttr };
}

function paragraphAlignStyle(pPr: Element | null): string {
  if (!pPr) return "";
  const jc = firstChild(pPr, "jc");
  if (!jc) return "";
  const v = attrW(jc, "val");
  if (v === "center") return "text-align: center";
  if (v === "right" || v === "end") return "text-align: right";
  if (v === "both" || v === "distribute") return "text-align: justify";
  if (v === "left" || v === "start") return "text-align: left";
  return "";
}

function paragraphIndentStyle(pPr: Element | null): string {
  if (!pPr) return "";
  const ind = firstChild(pPr, "ind");
  if (!ind) return "";
  const firstLine = attrW(ind, "firstLine");
  const left = attrW(ind, "left") || attrW(ind, "start");
  const styles: string[] = [];
  if (firstLine) styles.push(`text-indent: ${(parseInt(firstLine, 10) / 1440).toFixed(2)}in`);
  if (left) styles.push(`margin-left: ${(parseInt(left, 10) / 1440).toFixed(2)}in`);
  return styles.join("; ");
}

function paragraphHeadingTag(pPr: Element | null): string | null {
  if (!pPr) return null;
  const ps = firstChild(pPr, "pStyle");
  if (!ps) return null;
  const v = (attrW(ps, "val") || "").toLowerCase();
  const m = v.match(/^heading(\d)$/) || v.match(/^t[íi]tulo\s*(\d)$/);
  if (m) return `h${Math.min(6, Math.max(1, parseInt(m[1], 10)))}`;
  if (v === "title") return "h1";
  return null;
}

function runToHtml(r: Element): string {
  const rPr = firstChild(r, "rPr");
  const { open, close, styleAttr } = runStyles(rPr);
  let inner = "";
  const nodes = r.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = asElement(nodes[i]);
    if (!child) continue;
    const ln = child.localName;
    if (ln === "t") inner += escapeHtml(child.textContent || "");
    else if (ln === "tab") inner += "&emsp;";
    else if (ln === "br") inner += "<br/>";
    else if (ln === "noBreakHyphen") inner += "-";
    else if (ln === "sym") {
      const ch = attrW(child, "char");
      if (ch && /^[0-9a-fA-F]+$/.test(ch)) inner += `&#x${ch};`;
    }
  }
  if (!inner) return "";
  if (styleAttr) return `<span${styleAttr}>${open}${inner}${close}</span>`;
  return `${open}${inner}${close}`;
}

function paragraphToHtml(p: Element): string {
  const pPr = firstChild(p, "pPr");
  const headingTag = paragraphHeadingTag(pPr);
  const tag = headingTag || "p";

  const styles: string[] = [];
  const align = paragraphAlignStyle(pPr);
  if (align) styles.push(align);
  const ind = paragraphIndentStyle(pPr);
  if (ind) styles.push(ind);
  const styleAttr = styles.length ? ` style="${styles.join("; ")}"` : "";

  let inner = "";
  const nodes = p.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = asElement(nodes[i]);
    if (!child) continue;
    if (child.localName === "r") inner += runToHtml(child);
    else if (child.localName === "hyperlink") {
      const runs = getChildren(child, "r");
      for (const r of runs) inner += runToHtml(r);
    }
  }

  if (!inner.trim()) return `<${tag}${styleAttr}><br/></${tag}>`;
  return `<${tag}${styleAttr}>${inner}</${tag}>`;
}

function tableToHtml(tbl: Element): string {
  let html = `<table style="border-collapse: collapse; width: 100%">`;
  const rows = getChildren(tbl, "tr");
  for (const tr of rows) {
    html += "<tr>";
    const cells = getChildren(tr, "tc");
    for (const tc of cells) {
      let cellHtml = "";
      const nodes = tc.childNodes;
      for (let i = 0; i < nodes.length; i++) {
        const child = asElement(nodes[i]);
        if (!child) continue;
        if (child.localName === "p") cellHtml += paragraphToHtml(child);
        else if (child.localName === "tbl") cellHtml += tableToHtml(child);
      }
      html += `<td style="border: 1px solid #ccc; padding: 4px; vertical-align: top">${cellHtml}</td>`;
    }
    html += "</tr>";
  }
  html += "</table>";
  return html;
}

function bodyOrRootToHtml(root: Element): string {
  let html = "";
  const nodes = root.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = asElement(nodes[i]);
    if (!child) continue;
    if (child.localName === "p") html += paragraphToHtml(child);
    else if (child.localName === "tbl") html += tableToHtml(child);
  }
  return html;
}

function xmlToHtml(xml: string): string {
  const parser = new DOMParser({
    errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
  });
  const doc = parser.parseFromString(xml, "text/xml");
  const docEl = doc.documentElement;
  if (!docEl) return "";
  // For document.xml the meaningful content is inside <w:body>; for header/footer it's the root <w:hdr>/<w:ftr>.
  const body = firstChild(docEl, "body");
  return bodyOrRootToHtml(body || docEl);
}

export interface DocxImportResult {
  bodyHtml: string;
  headerHtml: string;
  footerHtml: string;
}

export function importDocxFile(filePath: string): DocxImportResult {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();

  let bodyHtml = "";
  let headerHtml = "";
  let footerHtml = "";

  const headerXmls: string[] = [];
  const footerXmls: string[] = [];

  for (const e of entries) {
    const name = e.entryName;
    if (name === "word/document.xml") {
      bodyHtml = xmlToHtml(e.getData().toString("utf-8"));
    } else if (/^word\/header\d*\.xml$/.test(name)) {
      headerXmls.push(e.getData().toString("utf-8"));
    } else if (/^word\/footer\d*\.xml$/.test(name)) {
      footerXmls.push(e.getData().toString("utf-8"));
    }
  }

  // Use the first non-empty header/footer (geralmente o "default").
  for (const xml of headerXmls) {
    const h = xmlToHtml(xml).trim();
    if (h && h.replace(/<[^>]+>/g, "").trim()) { headerHtml = h; break; }
  }
  for (const xml of footerXmls) {
    const f = xmlToHtml(xml).trim();
    if (f && f.replace(/<[^>]+>/g, "").trim()) { footerHtml = f; break; }
  }

  return { bodyHtml, headerHtml, footerHtml };
}
