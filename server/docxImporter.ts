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

function boolToggleVal(el: Element): boolean {
  const v = attrW(el, "val");
  return !(v === "0" || v === "false");
}

type RunProps = {
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  highlight?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  vertAlign?: "superscript" | "subscript";
};

type ParaProps = {
  align?: string;
  firstLine?: string;
  left?: string;
  rPr?: RunProps;
};

function parseRPr(rPr: Element | null): RunProps {
  const out: RunProps = {};
  if (!rPr) return out;

  const b = firstChild(rPr, "b");
  if (b) out.bold = boolToggleVal(b);
  const i = firstChild(rPr, "i");
  if (i) out.italic = boolToggleVal(i);
  const u = firstChild(rPr, "u");
  if (u) {
    const v = attrW(u, "val");
    out.underline = !(v === "none" || v === "0" || v === "false");
  }
  const strike = firstChild(rPr, "strike") || firstChild(rPr, "dstrike");
  if (strike) out.strike = boolToggleVal(strike);
  const vert = firstChild(rPr, "vertAlign");
  if (vert) {
    const v = attrW(vert, "val");
    if (v === "superscript" || v === "subscript") out.vertAlign = v;
  }

  const rFonts = firstChild(rPr, "rFonts");
  if (rFonts) {
    const f =
      attrW(rFonts, "ascii") ||
      attrW(rFonts, "hAnsi") ||
      attrW(rFonts, "cs") ||
      attrW(rFonts, "eastAsia");
    if (f) out.fontFamily = f;
  }
  const sz = firstChild(rPr, "sz");
  if (sz) {
    const v = attrW(sz, "val");
    if (v) out.fontSize = `${parseInt(v, 10) / 2}pt`;
  }
  const color = firstChild(rPr, "color");
  if (color) {
    const v = attrW(color, "val");
    if (v && v !== "auto" && /^[0-9a-fA-F]{6}$/.test(v)) out.color = `#${v}`;
  }
  const high = firstChild(rPr, "highlight");
  if (high) {
    const v = attrW(high, "val");
    if (v && v !== "none") out.highlight = v;
  }
  return out;
}

function parsePPr(pPr: Element | null): ParaProps {
  const out: ParaProps = {};
  if (!pPr) return out;
  const jc = firstChild(pPr, "jc");
  if (jc) {
    const v = attrW(jc, "val");
    if (v === "center") out.align = "center";
    else if (v === "right" || v === "end") out.align = "right";
    else if (v === "both" || v === "distribute") out.align = "justify";
    else if (v === "left" || v === "start") out.align = "left";
  }
  const ind = firstChild(pPr, "ind");
  if (ind) {
    const fl = attrW(ind, "firstLine");
    const left = attrW(ind, "left") || attrW(ind, "start");
    if (fl) out.firstLine = fl;
    if (left) out.left = left;
  }
  const innerRPr = firstChild(pPr, "rPr");
  if (innerRPr) out.rPr = parseRPr(innerRPr);
  return out;
}

function mergeRun(base: RunProps, top: RunProps): RunProps {
  return { ...base, ...top };
}

function mergePara(base: ParaProps, top: ParaProps): ParaProps {
  return {
    align: top.align ?? base.align,
    firstLine: top.firstLine ?? base.firstLine,
    left: top.left ?? base.left,
    rPr: mergeRun(base.rPr || {}, top.rPr || {}),
  };
}

type StyleEntry = {
  type: string;
  basedOn?: string;
  pPr: ParaProps;
  rPr: RunProps;
};

interface StylesIndex {
  defaultPara: ParaProps;
  defaultRun: RunProps;
  defaultParaStyleId?: string;
  resolve(id: string): { pPr: ParaProps; rPr: RunProps };
}

const EMPTY_STYLES: StylesIndex = {
  defaultPara: {},
  defaultRun: {},
  resolve: () => ({ pPr: {}, rPr: {} }),
};

function parseStylesXml(xml: string): StylesIndex {
  const parser = new DOMParser({
    errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
  });
  const doc = parser.parseFromString(xml, "text/xml");
  const root = doc.documentElement;
  if (!root) return EMPTY_STYLES;

  let defaultPara: ParaProps = {};
  let defaultRun: RunProps = {};
  let defaultParaStyleId: string | undefined;
  const styles = new Map<string, StyleEntry>();

  const docDefaults = firstChild(root, "docDefaults");
  if (docDefaults) {
    const rPrDefault = firstChild(docDefaults, "rPrDefault");
    if (rPrDefault) defaultRun = parseRPr(firstChild(rPrDefault, "rPr"));
    const pPrDefault = firstChild(docDefaults, "pPrDefault");
    if (pPrDefault) defaultPara = parsePPr(firstChild(pPrDefault, "pPr"));
  }

  for (const s of getChildren(root, "style")) {
    const id = attrW(s, "styleId");
    if (!id) continue;
    const type = attrW(s, "type") || "";
    const isDefault = attrW(s, "default") === "1";
    const basedOnEl = firstChild(s, "basedOn");
    const basedOn = basedOnEl ? attrW(basedOnEl, "val") || undefined : undefined;
    const pPr = parsePPr(firstChild(s, "pPr"));
    const rPr = parseRPr(firstChild(s, "rPr"));
    styles.set(id, { type, basedOn, pPr, rPr });
    if (type === "paragraph" && isDefault) defaultParaStyleId = id;
  }

  const cache = new Map<string, { pPr: ParaProps; rPr: RunProps }>();
  const inFlight = new Set<string>();
  function resolve(id: string): { pPr: ParaProps; rPr: RunProps } {
    if (cache.has(id)) return cache.get(id)!;
    if (inFlight.has(id)) return { pPr: {}, rPr: {} };
    const entry = styles.get(id);
    if (!entry) return { pPr: {}, rPr: {} };
    inFlight.add(id);
    let basePPr: ParaProps = {};
    let baseRPr: RunProps = {};
    if (entry.basedOn) {
      const parent = resolve(entry.basedOn);
      basePPr = parent.pPr;
      baseRPr = parent.rPr;
    }
    const merged = {
      pPr: mergePara(basePPr, entry.pPr),
      rPr: mergeRun(baseRPr, entry.rPr),
    };
    inFlight.delete(id);
    cache.set(id, merged);
    return merged;
  }

  return { defaultPara, defaultRun, defaultParaStyleId, resolve };
}

function runPropsToCss(rp: RunProps): { open: string; close: string; styleAttr: string } {
  const styles: string[] = [];
  let open = "";
  let close = "";

  if (rp.bold) { open += "<strong>"; close = "</strong>" + close; }
  if (rp.italic) { open += "<em>"; close = "</em>" + close; }
  if (rp.underline) { open += "<u>"; close = "</u>" + close; }
  if (rp.strike) { open += "<s>"; close = "</s>" + close; }
  if (rp.vertAlign === "superscript") { open += "<sup>"; close = "</sup>" + close; }
  else if (rp.vertAlign === "subscript") { open += "<sub>"; close = "</sub>" + close; }

  if (rp.fontFamily) styles.push(`font-family: '${rp.fontFamily.replace(/'/g, "")}'`);
  if (rp.fontSize) styles.push(`font-size: ${rp.fontSize}`);
  if (rp.color) styles.push(`color: ${rp.color}`);
  if (rp.highlight) styles.push(`background-color: ${rp.highlight}`);

  const styleAttr = styles.length ? ` style="${styles.join("; ")}"` : "";
  return { open, close, styleAttr };
}

function paraPropsToStyleAttr(p: ParaProps): string {
  const styles: string[] = [];
  if (p.align) styles.push(`text-align: ${p.align}`);
  if (p.firstLine) styles.push(`text-indent: ${(parseInt(p.firstLine, 10) / 1440).toFixed(2)}in`);
  if (p.left) styles.push(`margin-left: ${(parseInt(p.left, 10) / 1440).toFixed(2)}in`);
  return styles.length ? ` style="${styles.join("; ")}"` : "";
}

function paragraphHeadingTagFromStyleId(styleId: string | null | undefined): string | null {
  if (!styleId) return null;
  const v = styleId.toLowerCase();
  const m = v.match(/^heading(\d)$/) || v.match(/^t[íi]tulo\s*(\d)$/);
  if (m) return `h${Math.min(6, Math.max(1, parseInt(m[1], 10)))}`;
  if (v === "title") return "h1";
  return null;
}

/**
 * Detecta o tipo do campo Word a partir da instrução textual.
 * Suporta PAGE e NUMPAGES (com ou sem switches `\* MERGEFORMAT`).
 * Outros campos retornam null e caem no resultado em cache do .docx.
 */
function fieldFromInstr(instr: string): "PAGE" | "NUMPAGES" | null {
  const trimmed = instr.trim().toUpperCase();
  if (/^NUMPAGES(\s|$)/.test(trimmed)) return "NUMPAGES";
  if (/^PAGE(\s|$)/.test(trimmed) && !trimmed.startsWith("PAGEREF")) return "PAGE";
  return null;
}

/**
 * HTML emitido para um campo dinâmico. Conteúdo "1" serve como fallback
 * legível no preview do editor e no export DOCX. O export PDF reescreve
 * para vazio e usa CSS `counter(page)` / `counter(pages)`.
 */
function fieldMarkerHtml(field: "PAGE" | "NUMPAGES"): string {
  return `<span class="iuria-field" data-field="${field}">1</span>`;
}

function runFldCharType(r: Element): string | null {
  const c = firstChild(r, "fldChar");
  return c ? attrW(c, "fldCharType") : null;
}

function runInstrText(r: Element): string {
  let out = "";
  const nodes = r.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = asElement(nodes[i]);
    if (child && child.localName === "instrText") out += child.textContent || "";
  }
  return out;
}

function runToHtml(r: Element, inheritedRun: RunProps): string {
  const explicit = parseRPr(firstChild(r, "rPr"));
  const merged = mergeRun(inheritedRun, explicit);
  const { open, close, styleAttr } = runPropsToCss(merged);
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

function paragraphToHtml(p: Element, st: StylesIndex): string {
  const pPr = firstChild(p, "pPr");
  const explicitPara = parsePPr(pPr);

  const psEl = pPr ? firstChild(pPr, "pStyle") : null;
  const pStyleId = psEl ? attrW(psEl, "val") : null;
  const effectiveStyleId = pStyleId || st.defaultParaStyleId || null;

  let inheritedPara: ParaProps = {
    align: st.defaultPara.align,
    firstLine: st.defaultPara.firstLine,
    left: st.defaultPara.left,
    rPr: mergeRun(st.defaultRun, st.defaultPara.rPr || {}),
  };

  if (effectiveStyleId) {
    const resolved = st.resolve(effectiveStyleId);
    inheritedPara = mergePara(inheritedPara, resolved.pPr);
    inheritedPara.rPr = mergeRun(inheritedPara.rPr || {}, resolved.rPr);
  }

  const finalPara = mergePara(inheritedPara, explicitPara);
  const inheritedRunForChildren: RunProps = finalPara.rPr || {};

  const headingTag = paragraphHeadingTagFromStyleId(pStyleId);
  const tag = headingTag || "p";
  const styleAttr = paraPropsToStyleAttr(finalPara);

  // Estado de campo Word (begin/instrText/separate/result/end).
  // Quando estamos no meio de um campo conhecido (PAGE/NUMPAGES) o resultado
  // em cache é descartado e substituído por um marcador <span class="iuria-field">.
  let inner = "";
  let fieldState: "idle" | "instr" | "result" = "idle";
  let instrBuf = "";
  let pendingResult = "";

  const nodes = p.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = asElement(nodes[i]);
    if (!child) continue;

    if (child.localName === "fldSimple") {
      const instr = attrW(child, "instr") || "";
      const field = fieldFromInstr(instr);
      if (field) {
        inner += fieldMarkerHtml(field);
      } else {
        const runs = getChildren(child, "r");
        for (const r of runs) inner += runToHtml(r, inheritedRunForChildren);
      }
      continue;
    }

    if (child.localName === "r") {
      const fc = runFldCharType(child);
      if (fc === "begin") {
        fieldState = "instr";
        instrBuf = "";
        pendingResult = "";
        continue;
      }
      if (fc === "separate") {
        fieldState = "result";
        continue;
      }
      if (fc === "end") {
        const field = fieldFromInstr(instrBuf);
        inner += field ? fieldMarkerHtml(field) : pendingResult;
        fieldState = "idle";
        instrBuf = "";
        pendingResult = "";
        continue;
      }
      if (fieldState === "instr") {
        instrBuf += runInstrText(child);
        continue;
      }
      if (fieldState === "result") {
        pendingResult += runToHtml(child, inheritedRunForChildren);
        continue;
      }
      inner += runToHtml(child, inheritedRunForChildren);
      continue;
    }

    if (child.localName === "hyperlink") {
      const runs = getChildren(child, "r");
      for (const r of runs) inner += runToHtml(r, inheritedRunForChildren);
    }
  }

  if (!inner.trim()) return `<${tag}${styleAttr}><br/></${tag}>`;
  return `<${tag}${styleAttr}>${inner}</${tag}>`;
}

function tableToHtml(tbl: Element, st: StylesIndex): string {
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
        if (child.localName === "p") cellHtml += paragraphToHtml(child, st);
        else if (child.localName === "tbl") cellHtml += tableToHtml(child, st);
      }
      html += `<td style="border: 1px solid #ccc; padding: 4px; vertical-align: top">${cellHtml}</td>`;
    }
    html += "</tr>";
  }
  html += "</table>";
  return html;
}

function bodyOrRootToHtml(root: Element, st: StylesIndex): string {
  let html = "";
  const nodes = root.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const child = asElement(nodes[i]);
    if (!child) continue;
    if (child.localName === "p") html += paragraphToHtml(child, st);
    else if (child.localName === "tbl") html += tableToHtml(child, st);
  }
  return html;
}

function xmlToHtml(xml: string, st: StylesIndex): string {
  const parser = new DOMParser({
    errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
  });
  const doc = parser.parseFromString(xml, "text/xml");
  const docEl = doc.documentElement;
  if (!docEl) return "";
  // For document.xml the meaningful content is inside <w:body>; for header/footer it's the root <w:hdr>/<w:ftr>.
  const body = firstChild(docEl, "body");
  return bodyOrRootToHtml(body || docEl, st);
}

export interface DocxImportResult {
  bodyHtml: string;
  headerHtml: string;
  footerHtml: string;
  // 'xml' = veio dos arquivos word/header*.xml/footer*.xml
  // 'heuristic' = inferido a partir de parágrafos do corpo
  // 'none' = não há cabeçalho/rodapé
  headerSource: "xml" | "heuristic" | "none";
}

// ---------- Heurística de detecção de cabeçalho/rodapé no corpo ----------
// Quando o .docx não tem word/header*.xml/footer*.xml mas o usuário diagramou
// o "cabeçalho" como parágrafos centralizados no topo (e timbre/contato como
// últimos parágrafos), tentamos isolar essas faixas movendo-as do corpo.
const TOPLEVEL_BLOCK_RE =
  /<(p|h[1-6]|table|blockquote|ul|ol|pre)\b[^>]*>[\s\S]*?<\/\1>/gi;

function extractTopLevelBlocks(html: string): string[] {
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  TOPLEVEL_BLOCK_RE.lastIndex = 0;
  while ((m = TOPLEVEL_BLOCK_RE.exec(html))) blocks.push(m[0]);
  return blocks;
}

function blockText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isCenteredShortBlock(html: string): boolean {
  // Aceitamos somente <p>; headings e tables nunca viram header/footer heurístico.
  if (!/^<p\b/i.test(html)) return false;
  if (!/text-align:\s*center/i.test(html)) return false;
  const t = blockText(html);
  return t.length > 0 && t.length <= 200;
}

function isImageOnlyBlock(html: string): boolean {
  if (!/^<p\b/i.test(html)) return false;
  if (!/<img\b/i.test(html)) return false;
  return blockText(html).length === 0;
}

function looksLikeFooterContact(html: string): boolean {
  const t = blockText(html).toLowerCase();
  if (!t) return false;
  // Padrões frequentes em rodapés de petições brasileiras.
  if (/oab[\s\/-]*[a-z]{2}/i.test(t)) return true;
  if (/cep\s*\d{5}-?\d{3}/.test(t)) return true;
  if (/\(\d{2}\)\s*\d{4,5}-?\d{4}/.test(t)) return true; // telefone
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(t)) return true; // email
  if (/www\.|https?:\/\//.test(t)) return true;
  return false;
}

function detectHeuristicHeaderFooter(
  bodyHtml: string,
): { bodyHtml: string; headerHtml: string; footerHtml: string; matched: boolean } {
  const blocks = extractTopLevelBlocks(bodyHtml);
  if (blocks.length < 3) return { bodyHtml, headerHtml: "", footerHtml: "", matched: false };

  // Header: parágrafos iniciais centralizados/curtos ou só com imagem,
  // até no máximo 4 (parar antes do primeiro bloco "de corpo").
  let headerEnd = 0;
  for (let i = 0; i < Math.min(blocks.length, 4); i++) {
    if (isImageOnlyBlock(blocks[i]) || isCenteredShortBlock(blocks[i])) {
      headerEnd = i + 1;
    } else {
      break;
    }
  }
  // Conservador: só assume header se o bloco seguinte parece corpo (texto longo
  // ou heading), evitando capturar a peça inteira.
  if (headerEnd > 0) {
    const next = blocks[headerEnd];
    const nextText = next ? blockText(next) : "";
    const nextIsBody =
      next &&
      (/^<h[1-6]\b/i.test(next) || nextText.length > 200 || /text-align:\s*justify/i.test(next));
    if (!nextIsBody) headerEnd = 0;
  }

  // Footer: últimos parágrafos centralizados/curtos. Para evitar cortar a
  // assinatura final, exigimos que pelo menos um deles tenha "cara de rodapé"
  // (OAB, CEP, telefone, email, site).
  let footerStart = blocks.length;
  for (let i = blocks.length - 1; i >= Math.max(headerEnd, blocks.length - 6); i--) {
    if (isCenteredShortBlock(blocks[i]) || isImageOnlyBlock(blocks[i])) {
      footerStart = i;
    } else {
      break;
    }
  }
  if (footerStart < blocks.length) {
    const footerBlocks = blocks.slice(footerStart);
    const hasContact = footerBlocks.some(looksLikeFooterContact);
    if (!hasContact) footerStart = blocks.length;
  }

  if (headerEnd === 0 && footerStart === blocks.length) {
    return { bodyHtml, headerHtml: "", footerHtml: "", matched: false };
  }

  const headerHtml = blocks.slice(0, headerEnd).join("");
  const footerHtml = blocks.slice(footerStart).join("");
  const newBodyHtml = blocks.slice(headerEnd, footerStart).join("");
  return { bodyHtml: newBodyHtml, headerHtml, footerHtml, matched: true };
}

export function importDocxFile(filePath: string): DocxImportResult {
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();

  let stylesXml = "";
  let documentXml = "";
  const headerXmls: string[] = [];
  const footerXmls: string[] = [];

  for (const e of entries) {
    const name = e.entryName;
    if (name === "word/document.xml") {
      documentXml = e.getData().toString("utf-8");
    } else if (name === "word/styles.xml") {
      stylesXml = e.getData().toString("utf-8");
    } else if (/^word\/header\d*\.xml$/.test(name)) {
      headerXmls.push(e.getData().toString("utf-8"));
    } else if (/^word\/footer\d*\.xml$/.test(name)) {
      footerXmls.push(e.getData().toString("utf-8"));
    }
  }

  const stylesIndex = stylesXml ? parseStylesXml(stylesXml) : EMPTY_STYLES;

  let bodyHtml = documentXml ? xmlToHtml(documentXml, stylesIndex) : "";

  let headerHtml = "";
  let footerHtml = "";
  for (const xml of headerXmls) {
    const h = xmlToHtml(xml, stylesIndex).trim();
    if (h && h.replace(/<[^>]+>/g, "").trim()) { headerHtml = h; break; }
  }
  for (const xml of footerXmls) {
    const f = xmlToHtml(xml, stylesIndex).trim();
    if (f && f.replace(/<[^>]+>/g, "").trim()) { footerHtml = f; break; }
  }

  let headerSource: "xml" | "heuristic" | "none" = "none";
  if (headerHtml || footerHtml) {
    headerSource = "xml";
  } else {
    const inferred = detectHeuristicHeaderFooter(bodyHtml);
    if (inferred.matched) {
      bodyHtml = inferred.bodyHtml;
      headerHtml = inferred.headerHtml;
      footerHtml = inferred.footerHtml;
      headerSource = "heuristic";
    }
  }

  return { bodyHtml, headerHtml, footerHtml, headerSource };
}
