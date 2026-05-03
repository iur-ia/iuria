declare module "adm-zip" {
  interface IZipEntry {
    entryName: string;
    getData(): Buffer;
  }
  class AdmZip {
    constructor(filePath?: string);
    getEntries(): IZipEntry[];
  }
  export = AdmZip;
}
