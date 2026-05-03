declare module "html-to-docx" {
  interface HtmlToDocxOptions {
    orientation?: "portrait" | "landscape";
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    title?: string;
    pageNumber?: boolean;
    font?: string;
  }
  const htmlToDocx: (
    html: string,
    headerHtml?: string,
    options?: HtmlToDocxOptions,
    footerHtml?: string,
  ) => Promise<Buffer>;
  export default htmlToDocx;
}
declare module "html-pdf-node" {
  interface PdfFile { content?: string; url?: string }
  interface PdfOptions {
    format?: "A4" | "Letter" | "Legal";
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
    printBackground?: boolean;
  }
  const htmlPdf: {
    generatePdf: (file: PdfFile, options?: PdfOptions) => Promise<Buffer>;
    generatePdfs: (files: PdfFile[], options?: PdfOptions) => Promise<Buffer[]>;
  };
  export default htmlPdf;
}
